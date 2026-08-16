"""Carga el brief de `conocimiento` completado (por Gemini) en el catálogo.

Lee docs/carga-disciplinas/brief_llenado_motor.json y escribe:

  PARTE 1   levels (escalera CON1..CON4)  +  age_level_matrix (16 cruces)
  PARTE 2   age_level_matrix (4 cruces de `lenguaje` que faltaban)
  PARTE 3   topics.levels (en qué niveles vive cada tópico de conocimiento)

Y el PUENTE familia↔materia, sin el cual nada de lo anterior se ve: el front elige
la escalera con `levels.discipline === categories.discipline`, así que una escalera
cargada como 'conocimiento' nunca matchearía una categoría 'informatica'. Se agrega
`family` a las dos tablas (aditivo: el código viejo la ignora) y el front pasa a
filtrar por ahí.

Uso:
    python scripts/cargar_conocimiento.py --dry-run     # muestra qué haría, no toca nada
    python scripts/cargar_conocimiento.py --apply       # escribe
    python scripts/cargar_conocimiento.py --dry-run --json otro.json
"""
import argparse
import asyncio
import json
import os
import re
import sys

from dotenv import load_dotenv

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
load_dotenv(os.path.join(_HERE, "..", ".env"))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

BRIEF = os.path.join(_HERE, "..", "..", "docs", "carga-disciplinas", "brief_llenado_motor.json")

# Familias. `lenguaje` = el idioma es el objeto de estudio; `conocimiento` = es el vehículo.
# Fonética va en lenguaje: no es otra familia, es lenguaje con una capacidad que el ASR
# todavía no permite ejecutar.
FAMILIA_DE_DISCIPLINA = {"idiomas": "lenguaje", "fonetica": "lenguaje"}
FAMILIA_DEFAULT = "conocimiento"

CAMPOS_LEVEL = ["short_desc", "language_rule", "curriculum_grammar",
                "expected_production", "duration_base_minutes", "vocab_depth"]
CAMPOS_CRUCE = ["produccion_esperada", "formato_de_cierre_de_turno",
                "reglas_de_tono_y_entrega", "pasos_de_la_sesion", "comando_de_arranque",
                "accion_de_continuacion", "accion_de_cierre", "ritmo"]

_PLACEHOLDERS_OK = {"name", "topic", "first_vocab", "word", "tutor", "idioma", "idioma_base"}
_PH = re.compile(r"\{([a-z_]+)\}")
_SALUDO = re.compile(r"salud|greet|hola", re.IGNORECASE)

# Basura que dejan los LLM al devolver el JSON. Se limpia AL LEER en vez de exigir que
# el archivo venga limpio: si no, un '[cite: 3]' pegado al final de una directiva termina
# viajando al prompt del coach.
_BASURA = [
    re.compile(r"\s*\[cite[^\]]*\]"),        # Gemini: [cite: 3], [cite_start]
    re.compile(r"\s*\[citation[^\]]*\]"),
    re.compile(r"\s*\[\^\d+\]"),             # notas al pie estilo markdown
    re.compile(r"[​-‏﻿]"),    # zero-width y BOM
]


def _limpiar(o):
    """Saca los artefactos de LLM de TODOS los strings del JSON, recursivo."""
    if isinstance(o, dict):
        return {k: _limpiar(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_limpiar(v) for v in o]
    if isinstance(o, str):
        for rx in _BASURA:
            o = rx.sub("", o)
        return o.strip()
    return o


def _contar_basura(raw: str) -> int:
    return sum(len(rx.findall(raw)) for rx in _BASURA)


# ────────────────────────── validación ──────────────────────────
def validar(brief: dict) -> tuple[list[str], list[str]]:
    """Devuelve (errores, avisos). Un error frena la carga; un aviso sólo se reporta."""
    err, warn = [], []

    p1 = brief.get("PARTE_1_familia_conocimiento", {})
    p2 = brief.get("PARTE_2_cruces_faltantes_de_lenguaje", {})
    p3 = brief.get("PARTE_3_en_que_niveles_vive_cada_topico", {})

    def _chequear_texto(valor, donde: str, campo: str):
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            err.append(f"{donde}: '{campo}' vacío")
            return
        if not isinstance(valor, str):
            return
        for ph in _PH.findall(valor):
            if ph not in _PLACEHOLDERS_OK:
                err.append(f"{donde}: '{campo}' usa un placeholder inexistente {{{ph}}}")

    codigos = set()
    for lv in p1.get("escalera_a_completar", []):
        code = lv.get("code", "?")
        codigos.add(code)
        for c in CAMPOS_LEVEL:
            _chequear_texto(lv.get(c), f"nivel {code}", c)
        dur = lv.get("duration_base_minutes")
        if isinstance(dur, str) and dur.strip().isdigit():
            lv["duration_base_minutes"] = int(dur)
        elif not isinstance(dur, int):
            err.append(f"nivel {code}: duration_base_minutes debe ser un entero (vino {dur!r})")
        if lv.get("vocab_depth") not in ("basic", "full"):
            err.append(f"nivel {code}: vocab_depth debe ser 'basic' o 'full' (vino {lv.get('vocab_depth')!r})")
        # La gramática de idiomas en conocimiento es EL error que este brief viene a corregir.
        cg = str(lv.get("curriculum_grammar") or "").lower()
        for jerga in ("present perfect", "phrasal verb", "condicional", "verbo to be",
                      "past simple", "gramática", "gramatica"):
            if jerga in cg:
                err.append(f"nivel {code}: curriculum_grammar habla de gramática de idiomas "
                           f"('{jerga}') — en conocimiento va contenido de la materia")

    for cr in list(p1.get("cruces_a_completar", [])) + list(p2.get("cruces_a_completar", [])):
        etq = f"cruce {cr.get('age_slug')}×{cr.get('level_code')}"
        for c in CAMPOS_CRUCE:
            _chequear_texto(cr.get(c), etq, c)
        arr = str(cr.get("comando_de_arranque") or "")
        if arr and not _SALUDO.search(arr):
            err.append(f"{etq}: el comando_de_arranque no saluda — es regla dura del producto")
        ritmo = str(cr.get("ritmo") or "")
        if ritmo:
            partes = [x.strip() for x in ritmo.split(",") if x.strip() != ""]
            if not partes or not all(x.isdigit() and 0 <= int(x) <= 3 for x in partes):
                err.append(f"{etq}: ritmo inválido ({ritmo!r}); van números 0-3 separados por coma")
            elif len(partes) < 6:
                warn.append(f"{etq}: ritmo de sólo {len(partes)} beats (los demás usan 8)")

    for t in p3.get("topicos", []):
        lv = t.get("levels")
        if not lv:
            warn.append(f"tópico '{t.get('titulo')}': sin niveles asignados, queda invisible")
        elif not all(x in codigos for x in lv):
            err.append(f"tópico '{t.get('titulo')}': niveles {lv} no existen en la escalera {sorted(codigos)}")

    return err, warn


# ────────────────────────── carga ──────────────────────────
async def cargar(brief: dict, apply: bool, solo_familia: bool = False):
    p1 = brief.get("PARTE_1_familia_conocimiento", {})
    p2 = brief.get("PARTE_2_cruces_faltantes_de_lenguaje", {})
    p3 = brief.get("PARTE_3_en_que_niveles_vive_cada_topico", {})
    if solo_familia:
        p1, p2, p3 = {}, {}, {}
    plan = []

    async with AsyncSessionLocal() as db:
        # ── 0. El puente familia↔materia ────────────────────────────────
        cols_cat = {r[0] for r in (await db.execute(text("SHOW COLUMNS FROM categories"))).all()}
        cols_lvl = {r[0] for r in (await db.execute(text("SHOW COLUMNS FROM levels"))).all()}
        ddl = []
        if "family" not in cols_cat:
            ddl.append("ALTER TABLE categories ADD COLUMN family VARCHAR(20) NOT NULL DEFAULT 'conocimiento'")
        if "family" not in cols_lvl:
            ddl.append("ALTER TABLE levels ADD COLUMN family VARCHAR(20) NOT NULL DEFAULT 'conocimiento'")
        for s in ddl:
            plan.append(("DDL", s))

        discs = [r[0] for r in (await db.execute(text(
            "SELECT DISTINCT discipline FROM categories WHERE discipline IS NOT NULL"))).all()]
        for d in discs:
            fam = FAMILIA_DE_DISCIPLINA.get(d, FAMILIA_DEFAULT)
            plan.append(("family", f"categories.discipline='{d}' → family='{fam}'"))
        for d, fam in (("idiomas", "lenguaje"), ("fonetica", "lenguaje")):
            plan.append(("family", f"levels.discipline='{d}' → family='{fam}'"))

        # ── 1. La escalera ──────────────────────────────────────────────
        for lv in p1.get("escalera_a_completar", []):
            existe = (await db.execute(text("SELECT code FROM levels WHERE code=:c"),
                                       {"c": lv["code"]})).fetchone()
            plan.append(("level", f"{'UPDATE' if existe else 'INSERT'} levels {lv['code']} "
                                  f"({lv['friendly_name']}) family=conocimiento"))

        # ── 2. Los cruces ───────────────────────────────────────────────
        for cr in list(p1.get("cruces_a_completar", [])) + list(p2.get("cruces_a_completar", [])):
            existe = (await db.execute(text(
                "SELECT 1 FROM age_level_matrix WHERE age_slug=:a AND level_code=:l"),
                {"a": cr["age_slug"], "l": cr["level_code"]})).fetchone()
            plan.append(("cruce", f"{'UPDATE' if existe else 'INSERT'} age_level_matrix "
                                  f"{cr['age_slug']}×{cr['level_code']}"))

        # ── 3. Los tópicos ──────────────────────────────────────────────
        for t in p3.get("topicos", []):
            if not t.get("levels"):
                continue
            row = (await db.execute(text(
                "SELECT t.id, t.levels FROM topics t JOIN categories c ON c.id=t.category_id "
                "WHERE t.title=:ti AND COALESCE(c.discipline,'idiomas')=:d AND t.is_active=1"),
                {"ti": t["titulo"], "d": t["materia"]})).fetchone()
            if not row:
                plan.append(("WARN", f"tópico no encontrado en la base: '{t['titulo']}' ({t['materia']})"))
                continue
            plan.append(("topic", f"topics[{row[0]}] '{t['titulo'][:38]}' {row[1]} → {t['levels']}"))

        # ── Reporte ─────────────────────────────────────────────────────
        print(f"\n{'APLICANDO' if apply else 'DRY-RUN (no toca nada)'}\n" + "─" * 74)
        for tipo in ("DDL", "family", "level", "cruce", "topic", "WARN"):
            filas = [m for t_, m in plan if t_ == tipo]
            if not filas:
                continue
            print(f"\n── {tipo}  ({len(filas)})")
            for m in filas[:60]:
                print(f"   {m}")
            if len(filas) > 60:
                print(f"   … y {len(filas) - 60} más")

        if not apply:
            print(f"\n{len(plan)} operaciones. Corré con --apply para escribir.")
            return

        # ── Escritura ───────────────────────────────────────────────────
        for s in ddl:
            await db.execute(text(s))
        for d in discs:
            await db.execute(text("UPDATE categories SET family=:f WHERE discipline=:d"),
                             {"f": FAMILIA_DE_DISCIPLINA.get(d, FAMILIA_DEFAULT), "d": d})
        await db.execute(text("UPDATE levels SET family='lenguaje' WHERE discipline IN ('idiomas','fonetica')"))

        for i, lv in enumerate(p1.get("escalera_a_completar", [])):
            await db.execute(text(
                "INSERT INTO levels (code, friendly_name, sort_order, short_desc, language_rule, "
                "  curriculum_grammar, expected_production, duration_base_minutes, vocab_depth, "
                "  discipline, family, active) "
                "VALUES (:code,:fn,:so,:sd,:lr,:cg,:ep,:dur,:vd,'conocimiento','conocimiento',1) "
                "ON DUPLICATE KEY UPDATE friendly_name=VALUES(friendly_name), "
                "  short_desc=VALUES(short_desc), language_rule=VALUES(language_rule), "
                "  curriculum_grammar=VALUES(curriculum_grammar), "
                "  expected_production=VALUES(expected_production), "
                "  duration_base_minutes=VALUES(duration_base_minutes), "
                "  vocab_depth=VALUES(vocab_depth), discipline='conocimiento', "
                "  family='conocimiento', active=1"),
                {"code": lv["code"], "fn": lv["friendly_name"], "so": i,
                 "sd": lv["short_desc"], "lr": lv["language_rule"], "cg": lv["curriculum_grammar"],
                 "ep": lv["expected_production"], "dur": lv["duration_base_minutes"],
                 "vd": lv["vocab_depth"]})

        for cr in list(p1.get("cruces_a_completar", [])) + list(p2.get("cruces_a_completar", [])):
            await db.execute(text(
                "INSERT INTO age_level_matrix (age_slug, level_code, produccion_esperada, "
                "  formato_de_cierre_de_turno, reglas_de_tono_y_entrega, pasos_de_la_sesion, "
                "  comando_de_arranque, accion_de_continuacion, accion_de_cierre, arquetipo, "
                "  ritmo, active) "
                "VALUES (:a,:l,:pe,:fc,:rt,:ps,:ca,:ac,:acr,:arq,:ri,1) "
                "ON DUPLICATE KEY UPDATE produccion_esperada=VALUES(produccion_esperada), "
                "  formato_de_cierre_de_turno=VALUES(formato_de_cierre_de_turno), "
                "  reglas_de_tono_y_entrega=VALUES(reglas_de_tono_y_entrega), "
                "  pasos_de_la_sesion=VALUES(pasos_de_la_sesion), "
                "  comando_de_arranque=VALUES(comando_de_arranque), "
                "  accion_de_continuacion=VALUES(accion_de_continuacion), "
                "  accion_de_cierre=VALUES(accion_de_cierre), ritmo=VALUES(ritmo), active=1"),
                {"a": cr["age_slug"], "l": cr["level_code"], "pe": cr["produccion_esperada"],
                 "fc": cr["formato_de_cierre_de_turno"], "rt": cr["reglas_de_tono_y_entrega"],
                 "ps": cr["pasos_de_la_sesion"], "ca": cr["comando_de_arranque"],
                 "ac": cr["accion_de_continuacion"], "acr": cr["accion_de_cierre"],
                 "arq": cr.get("arquetipo"), "ri": cr.get("ritmo")})

        for t in p3.get("topicos", []):
            if not t.get("levels"):
                continue
            await db.execute(text(
                "UPDATE topics t JOIN categories c ON c.id=t.category_id "
                "SET t.levels=:lv WHERE t.title=:ti AND COALESCE(c.discipline,'idiomas')=:d"),
                {"lv": json.dumps(t["levels"]), "ti": t["titulo"], "d": t["materia"]})

        await db.commit()
        print(f"\nOK — {len(plan)} operaciones aplicadas.")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default=BRIEF)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--apply", action="store_true")
    ap.add_argument("--force", action="store_true", help="aplicar aunque haya errores de validación")
    args = ap.parse_args()

    with open(args.json, encoding="utf-8") as f:
        raw = f.read()
    n_basura = _contar_basura(raw)
    brief = _limpiar(json.loads(raw))
    if n_basura:
        print(f"\nSanitizado: {n_basura} artefactos de LLM removidos "
              f"(marcadores tipo '[cite: N]'). No llegan a la base.")

    err, warn = validar(brief)
    if warn:
        print(f"\n── AVISOS ({len(warn)})")
        for w in warn[:30]:
            print(f"   {w}")
    if err:
        print(f"\n── ERRORES ({len(err)})")
        for e in err[:40]:
            print(f"   {e}")
        if len(err) > 40:
            print(f"   … y {len(err) - 40} más")
        if args.apply and not args.force:
            print("\nNo se aplica nada. Corregí el JSON (o usá --force si sabés lo que hacés).")
            return
    else:
        print("\nValidación OK: sin campos vacíos, placeholders válidos, todos los "
              "arranques saludan.")

    await cargar(brief, apply=args.apply)


if __name__ == "__main__":
    asyncio.run(main())
