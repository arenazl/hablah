"""Carga las disciplinas nuevas (multi-curso) con sus categorías y tópicos.

Contexto: la app arrancó siendo de inglés, pero el motor de capas es agnóstico
al dominio — arma la clase con edad × nivel × historia, no con "inglés". La
disciplina es la constraint que decide qué catálogo entra
(categories.discipline, ver commit 134225a).

Decisiones tomadas acá:

  - NIVELES TRANSVERSALES. Se reusan los 7 de siempre (Despegue…Maestro). Sus
    nombres ya son agnósticos: "Despegue" en carpintería es el principiante, lo
    mismo que en inglés. No se inventan escalas nuevas por disciplina.

  - AGRUPACIÓN. Los oficios y los creativos van juntos en una disciplina cada
    uno, para no terminar con diez disciplinas de dos tópicos.

  - SLUGS DE CATEGORÍA PREFIJADOS por disciplina. La categoría "musica" ya
    existe en idiomas (charlar SOBRE música) y no es lo mismo que aprender
    música. Sin prefijo chocarían.

  - KEYWORDS EN INGLÉS, que es la lengua pivote del catálogo: una sola fuente
    sirve para alumnos de cualquier idioma. Los términos que en castellano se
    dicen en inglés (endpoint, middleware) se dejan como están.

Los tópicos de ORATORIA los propuse yo; el resto viene del listado del dueño,
respetando sus IDs (200-282, que estaban libres).

Uso:
    python scripts/cargar_disciplinas.py --dry-run
    python scripts/cargar_disciplinas.py
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

L_BASICO = ["A0", "A1", "A2", "B1"]
L_MEDIO = ["A1", "A2", "B1", "B2"]
L_ALTO = ["B1", "B2", "C1"]
L_TODOS = ["A0", "A1", "A2", "B1", "B2", "C1"]

# disciplina -> [(slug_categoria, nombre_categoria)]
DISCIPLINAS: dict[str, list[tuple[str, str]]] = {
    "oratoria": [
        ("orat-presentaciones", "Presentaciones"),
        ("orat-entrevistas", "Entrevistas"),
        ("orat-expresion", "Expresión y vocabulario"),
    ],
    "musica": [
        ("mus-instrumentos", "Instrumentos"),
        ("mus-teoria", "Teoría musical"),
        ("mus-produccion", "Producción"),
    ],
    "informatica": [("inf-general", "Informática")],
    "oficios": [
        ("of-electricidad", "Electricidad"),
        ("of-carpinteria", "Carpintería"),
        ("of-mecanica", "Mecánica"),
        ("of-plomeria", "Plomería"),
        ("of-mantenimiento", "Mantenimiento"),
    ],
    "creativo": [
        ("cre-fotografia", "Fotografía"),
        ("cre-costura", "Costura"),
        ("cre-jardineria", "Jardinería"),
    ],
}

# (id, titulo, slug_categoria, niveles, keywords[en])
TOPICOS: list[tuple[int, str, str, list[str], list[str]]] = [
    # ─────────── ORATORIA (propuesta propia) ───────────
    (300, "Hablar en público sin morir en el intento", "orat-presentaciones", L_BASICO,
     ["stage fright", "take a breath", "eye contact", "pace yourself", "own the room"]),
    (301, "Estructurar una presentación", "orat-presentaciones", L_MEDIO,
     ["opening hook", "key message", "signpost", "wrap up", "call to action"]),
    (302, "Manejo de la voz y los nervios", "orat-presentaciones", L_BASICO,
     ["projection", "pause", "slow down", "breathe", "steady"]),
    (303, "Presentar datos sin aburrir", "orat-presentaciones", L_ALTO,
     ["the headline is", "what this means", "zoom in on", "the takeaway", "in short"]),
    (310, "Entrevista de trabajo: contame de vos", "orat-entrevistas", L_MEDIO,
     ["walk you through", "my background", "what drew me to", "I'd say my strength", "in a nutshell"]),
    (311, "Responder por errores y fracasos", "orat-entrevistas", L_ALTO,
     ["in hindsight", "what I learned", "I owned it", "I'd handle it differently", "turned it around"]),
    (312, "Negociar sueldo y condiciones", "orat-entrevistas", L_ALTO,
     ["market rate", "I was hoping for", "is there flexibility", "the whole package", "meet in the middle"]),
    (313, "Contar tu experiencia técnica", "orat-entrevistas", L_MEDIO,
     ["I was responsible for", "we shipped", "the tricky part was", "I led", "end to end"]),
    (320, "Decir exactamente lo que querés decir", "orat-expresion", L_ALTO,
     ["to put it another way", "more precisely", "what I mean is", "the nuance here", "rather than"]),
    (321, "Muletillas, pausas y silencios", "orat-expresion", L_BASICO,
     ["filler words", "hold the pause", "let it land", "think out loud", "take your time"]),
    (322, "Contar una anécdota que enganche", "orat-expresion", L_MEDIO,
     ["so there I was", "long story short", "out of nowhere", "and then it hit me", "you won't believe"]),
    (323, "Discutir sin pelear", "orat-expresion", L_ALTO,
     ["I see your point but", "fair enough", "where I'd push back", "let's agree that", "hear me out"]),

    # ─────────── MÚSICA (del dueño) ───────────
    (200, "Teoría musical desde cero", "mus-teoria", L_BASICO,
     ["note", "scale", "rhythm", "beat", "key"]),
    (201, "Aprender piano", "mus-instrumentos", L_TODOS,
     ["keys", "chord", "both hands", "posture", "practice slowly"]),
    (202, "Aprender guitarra", "mus-instrumentos", L_TODOS,
     ["fret", "strum", "chord change", "tuning", "calluses"]),
    (203, "Aprender a cantar", "mus-instrumentos", L_TODOS,
     ["breath support", "pitch", "range", "warm up", "head voice"]),
    (204, "Lectura musical y partituras", "mus-teoria", L_MEDIO,
     ["staff", "clef", "time signature", "sight-read", "rest"]),
    (205, "Armonía y composición", "mus-teoria", ["B1", "B2", "C1", "C2"],
     ["chord progression", "voicing", "resolve", "modulation", "hook"]),
    (206, "Producción musical", "mus-produccion", ["A2", "B1", "B2", "C1", "C2"],
     ["mix", "track", "EQ", "compression", "master"]),

    # ─────────── INFORMÁTICA (del dueño) ───────────
    (210, "Informática desde cero", "inf-general", ["A0", "A1", "A2"],
     ["file", "folder", "desktop", "click", "save"]),
    (211, "Uso de Windows y herramientas básicas", "inf-general", ["A0", "A1", "A2"],
     ["window", "shortcut", "settings", "install", "backup"]),
    (212, "Internet, archivos y seguridad digital", "inf-general", L_BASICO,
     ["password", "phishing", "download", "two-factor", "browser"]),
    (213, "Programación desde cero", "inf-general", ["A0", "A1", "A2", "B1", "B2"],
     ["variable", "loop", "function", "bug", "run the code"]),
    (214, "Desarrollo web", "inf-general", ["A1", "A2", "B1", "B2", "C1"],
     ["frontend", "backend", "deploy", "responsive", "API"]),
    (215, "Bases de datos", "inf-general", L_ALTO,
     ["query", "table", "index", "join", "schema"]),
    (216, "Inteligencia artificial aplicada", "inf-general", ["A1", "A2", "B1", "B2", "C1"],
     ["prompt", "model", "training data", "fine-tune", "hallucination"]),

    # ─────────── OFICIOS (del dueño) ───────────
    (220, "Electricidad domiciliaria desde cero", "of-electricidad", L_BASICO,
     ["circuit", "voltage", "breaker", "ground", "safety first"]),
    (221, "Instalaciones eléctricas del hogar", "of-electricidad", L_MEDIO,
     ["wiring", "outlet", "junction box", "load", "conduit"]),
    (222, "Diagnóstico de fallas eléctricas", "of-electricidad", L_ALTO,
     ["short circuit", "multimeter", "trace the fault", "overload", "loose connection"]),
    (230, "Carpintería desde cero", "of-carpinteria", L_BASICO,
     ["wood grain", "measure twice", "sand", "clamp", "chisel"]),
    (231, "Herramientas y técnicas de carpintería", "of-carpinteria", L_MEDIO,
     ["router", "jig", "miter", "dovetail", "square"]),
    (232, "Construcción de muebles", "of-carpinteria", L_ALTO,
     ["joinery", "assembly", "finish", "load-bearing", "dry fit"]),
    (240, "Mecánica automotriz desde cero", "of-mecanica", L_BASICO,
     ["engine", "oil change", "tire pressure", "battery", "under the hood"]),
    (241, "Mantenimiento básico del auto", "of-mecanica", ["A1", "A2", "B1"],
     ["service interval", "coolant", "brake pads", "filter", "top up"]),
    (242, "Mecánica y diagnóstico de fallas", "of-mecanica", L_ALTO,
     ["error code", "misfire", "diagnostics", "wear and tear", "rule it out"]),
    (250, "Plomería desde cero", "of-plomeria", L_BASICO,
     ["pipe", "leak", "shut-off valve", "drain", "seal"]),
    (251, "Reparaciones del hogar", "of-mantenimiento", L_BASICO,
     ["fix", "patch", "replace", "tighten", "quick job"]),
    (252, "Herramientas y bricolaje", "of-mantenimiento", ["A0", "A1", "A2", "B1", "B2"],
     ["toolbox", "drill", "screw", "level", "DIY"]),

    # ─────────── CREATIVO (del dueño) ───────────
    (260, "Fotografía desde cero", "cre-fotografia", L_BASICO,
     ["frame", "light", "focus", "shutter", "shot"]),
    (261, "Composición y técnicas fotográficas", "cre-fotografia", L_MEDIO,
     ["rule of thirds", "depth of field", "golden hour", "leading lines", "exposure"]),
    (262, "Edición de fotografía", "cre-fotografia", ["A1", "A2", "B1", "B2", "C1"],
     ["crop", "contrast", "white balance", "retouch", "export"]),
    (270, "Costura desde cero", "cre-costura", L_BASICO,
     ["stitch", "needle", "hem", "fabric", "thread"]),
    (271, "Corte y confección", "cre-costura", L_MEDIO,
     ["pattern", "seam", "fitting", "cut on the fold", "alter"]),
    (280, "Jardinería desde cero", "cre-jardineria", L_BASICO,
     ["soil", "water", "sunlight", "pot", "prune"]),
    (281, "Huerta en casa", "cre-jardineria", L_BASICO,
     ["seedling", "harvest", "compost", "raised bed", "in season"]),
    (282, "Cuidado y reproducción de plantas", "cre-jardineria", L_MEDIO,
     ["cutting", "repot", "root", "propagate", "overwatering"]),
]


def slugify(t: str) -> str:
    import re
    import unicodedata
    s = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:110]


async def main(dry_run: bool = False):
    async with AsyncSessionLocal() as db:
        # ── 1. categorías (con su disciplina) ──
        cat_ids: dict[str, int] = {}
        for disc, cats in DISCIPLINAS.items():
            for orden, (slug, nombre) in enumerate(cats):
                row = (await db.execute(
                    text("SELECT id FROM categories WHERE slug = :s"), {"s": slug})).first()
                if row:
                    cat_ids[slug] = row[0]
                    print(f"[cat=] {disc}/{slug} (ya existía)")
                    continue
                print(f"[cat+] {disc}/{slug} — {nombre}")
                if dry_run:
                    cat_ids[slug] = -1
                    continue
                await db.execute(
                    text("INSERT INTO categories (slug, name, sort_order, active, discipline) "
                         "VALUES (:s, :n, :o, 1, :d)"),
                    {"s": slug, "n": nombre, "o": 100 + orden, "d": disc})
                await db.commit()
                cat_ids[slug] = (await db.execute(
                    text("SELECT id FROM categories WHERE slug = :s"), {"s": slug})).scalar()

        # ── 2. subcategoría espejo (el 2do nivel hoy es 1:1) ──
        sub_ids: dict[str, int] = {}
        for slug, cid in cat_ids.items():
            if dry_run:
                sub_ids[slug] = -1
                continue
            row = (await db.execute(
                text("SELECT id FROM subcategories WHERE category_id = :c"), {"c": cid})).first()
            if row:
                sub_ids[slug] = row[0]
                continue
            await db.execute(
                text("INSERT INTO subcategories (category_id, slug, name, sort_order, active) "
                     "VALUES (:c, 'general', 'General', 0, 1)"), {"c": cid})
            await db.commit()
            sub_ids[slug] = (await db.execute(
                text("SELECT id FROM subcategories WHERE category_id = :c"), {"c": cid})).scalar()

        # ── 3. tópicos ──
        nuevos, existentes = 0, 0
        for tid, titulo, cat_slug, niveles, kws in TOPICOS:
            row = (await db.execute(
                text("SELECT id FROM topics WHERE id = :i OR title = :t"),
                {"i": tid, "t": titulo})).first()
            if row:
                existentes += 1
                print(f"[top=] {tid} {titulo} (ya existía como id={row[0]})")
                continue
            print(f"[top+] {tid} {titulo} -> {cat_slug} {niveles}")
            nuevos += 1
            if dry_run:
                continue
            await db.execute(
                text("""INSERT INTO topics
                        (id, slug, title, category, seed_prompts, keywords, levels,
                         is_hot, is_active, usage_count, audience, segmento,
                         category_id, subcategory_id, is_curriculum)
                        VALUES (:id, :slug, :title, :cat, '{}', :kw, :lv,
                                0, 1, 0, 'adult', 'adultos', :cid, :sid, 0)"""),
                {"id": tid, "slug": slugify(titulo), "title": titulo,
                 "cat": cat_slug, "kw": json.dumps(kws), "lv": json.dumps(niveles),
                 "cid": cat_ids[cat_slug], "sid": sub_ids[cat_slug]})
            await db.commit()

        print(f"\n{nuevos} tópicos nuevos · {existentes} ya existían"
              f"{' (DRY RUN)' if dry_run else ''}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    asyncio.run(main(args.dry_run))
