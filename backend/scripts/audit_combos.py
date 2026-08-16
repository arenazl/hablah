"""Auditoría de los combos del probador.

La cadena de selección es:

    disciplina → idioma → edad → nivel → categoría → tópico

Cada eslabón tiene que acotar al siguiente. Este script recorre TODOS los cruces
y dice cuáles tienen dato de verdad y cuáles quedan vacíos, para poder
deshabilitar en la UI en vez de dejar elegir combinaciones que no componen.

Reglas de la cadena (las que salen del dato, no de suposiciones):
  - disciplina  → categorías con esa discipline
  - edad        → tópicos cuyo segmento coincide (o sin segmento = cualquiera)
  - nivel       → tópicos que declaran ese nivel en topics.levels
  - edad+nivel  → tiene que existir la fila en age_level_matrix, si no el motor
                  no tiene instrucciones para ese cruce
  - categoría   → tópicos de esa categoría

Uso:  python scripts/audit_combos.py [--disciplina musica]
"""
import asyncio
import json
import os
import sys

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

# Tope de nivel por edad que hoy está hardcodeado en api/motor.py:190
TOPE_EDAD = {"mini": 3, "junior": 5}


def segmento_ok(seg: str | None, banda: str) -> bool:
    """¿El tópico sirve para esa banda etaria?

    topics.segmento usa 'adultos' donde student_types usa 'adult' — hay que
    normalizar, si no un tópico de adultos se cuenta como válido para todas las
    edades. Sin segmento = sirve para cualquiera.
    """
    if not seg:
        return True
    return ("adult" if seg == "adultos" else seg) == banda


def jl(v):
    if isinstance(v, list):
        return v
    try:
        return json.loads(v or "[]")
    except Exception:
        return []


async def main(solo: str | None):
    async with AsyncSessionLocal() as db:
        levels = [dict(m) for m in (await db.execute(text(
            "SELECT code, friendly_name, id AS orden, discipline FROM levels "
            "WHERE active=1 ORDER BY id"))).mappings()]
        bands = [dict(m) for m in (await db.execute(text(
            "SELECT slug, name FROM student_types WHERE active=1 ORDER BY sort_order"))).mappings()]
        cats = [dict(m) for m in (await db.execute(text(
            "SELECT id, slug, name, discipline FROM categories WHERE active=1"))).mappings()]
        topics = [dict(m) for m in (await db.execute(text(
            "SELECT t.id, t.title, t.category_id, t.segmento, t.levels, t.audience, "
            "COALESCE(c.discipline,'idiomas') AS discipline "
            "FROM topics t LEFT JOIN categories c ON c.id=t.category_id "
            "WHERE t.is_active=1"))).mappings()]
        matrix = {(m["age_slug"], m["level_code"]) for m in (await db.execute(text(
            "SELECT age_slug, level_code FROM age_level_matrix WHERE active=1"))).mappings()}
        langs = [dict(m) for m in (await db.execute(text(
            "SELECT code, label FROM languages WHERE active=1"))).mappings()] \
            if (await db.execute(text("SHOW TABLES LIKE 'languages'"))).first() else []

    for t in topics:
        t["levels"] = jl(t["levels"])

    disciplinas = sorted({c["discipline"] for c in cats} | {l["discipline"] for l in levels})
    if solo:
        disciplinas = [d for d in disciplinas if d == solo]

    print(f"niveles activos: {len(levels)} | edades: {len(bands)} | categorías: {len(cats)} "
          f"| tópicos: {len(topics)} | cruces en matriz: {len(matrix)} | idiomas: {len(langs)}\n")

    print("═══ CRUCES edad × nivel EN age_level_matrix ═══")
    print(f"{'edad':<10} " + " ".join(f"{l['code']:>5}" for l in levels))
    for b in bands:
        fila = []
        for l in levels:
            tope = TOPE_EDAD.get(b["slug"])
            capado = tope is not None and l["discipline"] == "idiomas" and l["orden"] > tope
            if (b["slug"], l["code"]) in matrix:
                fila.append("  ok " if not capado else " tope")
            else:
                fila.append("  --  " if not capado else " tope")
        print(f"{b['slug']:<10} " + " ".join(f"{c:>5}" for c in fila))
    print("  ok = el motor tiene instrucciones · -- = falta la fila · tope = capado por edad\n")

    for disc in disciplinas:
        dcats = [c for c in cats if c["discipline"] == disc]
        dtop = [t for t in topics if t["discipline"] == disc]
        print(f"═══ {disc.upper()} — {len(dcats)} categorías, {len(dtop)} tópicos ═══")
        if not dtop:
            print("  (sin tópicos: la disciplina no debería poder elegirse)\n")
            continue

        # niveles disponibles para la disciplina
        propios = [l for l in levels if l["discipline"] == disc]
        usa = propios or [l for l in levels if l["discipline"] == "idiomas"]
        print(f"  niveles: {'propios' if propios else 'transversales (de idiomas)'} → "
              f"{', '.join(l['code'] for l in usa)}")

        # matriz edad × nivel con conteo de tópicos elegibles
        print(f"  {'edad':<9}" + "".join(f"{l['code']:>7}" for l in usa))
        for b in bands:
            fila = []
            for l in usa:
                tope = TOPE_EDAD.get(b["slug"])
                if tope is not None and l["discipline"] == "idiomas" and l["orden"] > tope:
                    fila.append("tope"); continue
                if (b["slug"], l["code"]) not in matrix:
                    fila.append("sinM"); continue
                n = sum(1 for t in dtop
                        if segmento_ok(t["segmento"], b["slug"])
                        and (not t["levels"] or l["code"] in t["levels"]))
                fila.append(str(n) if n else "0")
            print(f"  {b['slug']:<9}" + "".join(f"{c:>7}" for c in fila))
        print("  (número = tópicos elegibles · 0 = combo vacío · sinM = falta el cruce "
              "en age_level_matrix · tope = capado por edad)\n")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--disciplina", default=None)
    args = p.parse_args()
    asyncio.run(main(args.disciplina))
