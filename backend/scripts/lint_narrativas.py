"""Linter de narrativas: puntúa setting/conflict/role/generated_vocab de cada tópico.

No juzga si la escena es LINDA — eso es juicio del dueño. Detecta lo que sí se
puede medir: el vocabulario que quedó como lista de términos en vez de frases
habladas, el conflicto que no genera tensión, el rol que no pone a los dos en la
escena, y las escenas repetidas entre tópicos.

Salida: ranking de peor a mejor, con el motivo de cada descuento.

Uso:
    python scripts/lint_narrativas.py            # las 25 peores
    python scripts/lint_narrativas.py --top 100
    python scripts/lint_narrativas.py --json docs/narrativas_flojas.json
"""
import asyncio
import json
import os
import re
import sys
from collections import Counter

from dotenv import load_dotenv

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

# Palabras que delatan castellano dentro de generated_vocab (va en inglés)
ES_HINT = re.compile(r"\b(que|para|con|una|los|las|del|por|como|más|está|muy|pero)\b", re.I)
# Un conflicto de verdad plantea una tensión: elegir, decidir, convencer, evitar…
CONF_VERBO = re.compile(
    r"\b(decidir|elegir|convencer|discutir|defender|evitar|resolver|entender|lograr|"
    r"conseguir|negociar|encontrar|salvar|arreglar|justificar|explicar|acordar|"
    r"decidirse|zafar|bancar|sostener|pelear|definir)\w*\b", re.I)
# El coach nunca debe tratar al adulto como nene
INFANTIL = re.compile(r"\b(imaginate que sos|magia|mágic|hadas|dinosaurio|superhéroe)\w*\b", re.I)


def evaluar(t: dict, settings_repetidos: set) -> tuple[int, list[str]]:
    """Devuelve (score 0-100, motivos de descuento)."""
    score, motivos = 100, []
    setting = (t["narrative_setting"] or "").strip()
    conflict = (t["narrative_conflict"] or "").strip()
    role = (t["narrative_role"] or "").strip()
    vocab = t["generated_vocab"] or []

    # ── setting ──
    if not setting:
        score -= 40; motivos.append("sin setting")
    else:
        if len(setting) < 25:
            score -= 15; motivos.append(f"setting muy corto ({len(setting)} chars)")
        if setting.lower() in settings_repetidos:
            score -= 20; motivos.append("setting repetido en otro tópico")
        if setting[0].isupper():
            score -= 3; motivos.append("setting arranca en mayúscula")

    # ── conflict ──
    if not conflict:
        score -= 40; motivos.append("sin conflicto")
    else:
        if len(conflict) < 30:
            score -= 15; motivos.append(f"conflicto muy corto ({len(conflict)} chars)")
        if not CONF_VERBO.search(conflict):
            score -= 20; motivos.append("el conflicto no plantea tensión (sin verbo de decisión)")

    # ── role ──
    if not role:
        score -= 40; motivos.append("sin rol")
    else:
        if not role.lower().startswith("somos"):
            score -= 20; motivos.append("el rol no empieza con 'somos'")
        if len(role) < 25:
            score -= 10; motivos.append("rol muy corto")

    # ── generated_vocab ──
    if not vocab:
        score -= 40; motivos.append("sin generated_vocab")
    else:
        if len(vocab) < 6:
            score -= 15; motivos.append(f"sólo {len(vocab)} frases (mínimo 6)")
        sueltos = [v for v in vocab if len(str(v).split()) <= 2]
        if sueltos:
            score -= min(25, 6 * len(sueltos))
            motivos.append(f"{len(sueltos)} son términos sueltos, no frases: {sueltos[:3]}")
        en_es = [v for v in vocab if ES_HINT.search(str(v))]
        if en_es:
            score -= min(20, 8 * len(en_es))
            motivos.append(f"{len(en_es)} en castellano (van en inglés): {en_es[:2]}")
        largos = [v for v in vocab if len(str(v).split()) > 9]
        if largos:
            score -= 8; motivos.append(f"{len(largos)} demasiado largas para hablarlas")

    # ── tono ──
    for campo, val in (("setting", setting), ("conflicto", conflict), ("rol", role)):
        if val and INFANTIL.search(val) and t["audience"] != "kid":
            score -= 15; motivos.append(f"tono infantil en {campo} (el alumno es adulto)")

    return max(0, score), motivos


async def main(top: int, salida: str | None):
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT t.id, t.title, t.audience, COALESCE(c.discipline,'idiomas') AS discipline, "
            "t.narrative_setting, t.narrative_conflict, t.narrative_role, t.generated_vocab "
            "FROM topics t LEFT JOIN categories c ON c.id = t.category_id "
            "WHERE t.is_active = 1"))
        rows = [dict(m) for m in r.mappings().all()]

    for x in rows:
        v = x["generated_vocab"]
        if isinstance(v, str):
            try:
                x["generated_vocab"] = json.loads(v or "[]")
            except Exception:
                x["generated_vocab"] = []

    # settings que aparecen en más de un tópico
    cnt = Counter((x["narrative_setting"] or "").strip().lower() for x in rows)
    repetidos = {s for s, n in cnt.items() if s and n > 1}

    evaluados = []
    for x in rows:
        score, motivos = evaluar(x, repetidos)
        evaluados.append({"id": x["id"], "titulo": x["title"], "disciplina": x["discipline"],
                          "score": score, "motivos": motivos})
    evaluados.sort(key=lambda e: (e["score"], e["id"]))

    print(f"{len(rows)} tópicos evaluados\n")
    dist = Counter("100" if e["score"] == 100 else
                   "90-99" if e["score"] >= 90 else
                   "70-89" if e["score"] >= 70 else
                   "50-69" if e["score"] >= 50 else "<50" for e in evaluados)
    for k in ("100", "90-99", "70-89", "50-69", "<50"):
        if dist.get(k):
            print(f"  {k:>6}: {dist[k]}")

    print(f"\n─── LAS {top} PEORES ───")
    for e in evaluados[:top]:
        print(f"\n[{e['score']:>3}] #{e['id']} {e['titulo']}  ({e['disciplina']})")
        for m in e["motivos"]:
            print(f"      · {m}")

    if salida:
        flojas = [e for e in evaluados if e["score"] < 100]
        with open(salida, "w", encoding="utf-8") as f:
            json.dump(flojas, f, ensure_ascii=False, indent=2)
        print(f"\n{len(flojas)} con descuentos -> {salida}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--top", type=int, default=25)
    p.add_argument("--json", dest="salida", default=None)
    args = p.parse_args()
    asyncio.run(main(args.top, args.salida))
