"""Aplica el catálogo v3 a la tabla topics. ESCRIBE. Hace backup antes.

Regla de oro: la ESTRUCTURA (title/levels/category/is_active) viene de v3; el CONTENIDO
(keywords/generated_vocab) de los tópicos existentes se CONSERVA intacto. Los 5 tópicos nuevos
entran con contenido generado a mano (mismo estilo que el catálogo actual).

Acciones:
  - UPDATE     : match exacto por título -> setea levels/category (conserva contenido)
  - REACTIVATE : match a un inactivo -> is_active=True + update estructura
  - RENAME     : 2 inactivos con contenido rico -> nuevo título + reactivar (por id, hardcode)
  - INSERT     : 5 nuevos con contenido embebido
  - DEACTIVATE : activos que v3 ya no incluye (se espera 0)
Duplicado "Cómo me siento": se prefiere el ACTIVO; el inactivo deprecated no se toca.
"""
import sys
import os
import re
import json
import asyncio
import unicodedata
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal, engine
from models.template import Topic

DOCS = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "motor-catalogo")
V3 = os.path.join(DOCS, "03-topicos-completos-v3.md")
APPLY = "--apply" in sys.argv

# Renames confirmados por id (inactivos con contenido rico que v3 reetiqueta).
RENAMES_BY_ID = {
    5: {"title": "Entrenamiento de fuerza y suplementación"},
    3: {"title": "Producción musical y cultura DJ"},
}

# Contenido para los 5 tópicos nuevos (estilo idéntico al catálogo actual).
NEW_CONTENT = {
    "Desarrollo de software y herramientas IA": {
        "keywords": ["framework", "prompt", "backend", "syntax", "deploy", "repository"],
        "generated_vocab": [
            "ship it and see what breaks", "the AI writes half my code now",
            "spent all day chasing one bug", "it works on my machine",
            "refactoring the whole thing again", "copilot basically pair-programs with me",
            "the deploy failed at 2am", "reading someone else's spaghetti code",
            "the docs are useless as always", "prompting is a skill in itself",
            "merge conflicts everywhere", "finally got the tests passing",
        ],
    },
    "Diseño y construcción del hogar": {
        "keywords": ["layout", "blueprint", "space", "renovation", "contractor", "budget"],
        "generated_vocab": [
            "knocking down a wall for open plan", "the renovation went way over budget",
            "natural light changes everything", "picking tiles took us weeks",
            "the contractor ghosted us", "measure twice cut once",
            "making the most of a small space", "it's a total gut job",
            "finally happy with the kitchen", "living in a construction site",
            "worth every penny in the end", "the layout just flows better now",
        ],
    },
    "Juegos de pelea y torneos": {
        "keywords": ["combo", "arena", "block", "health bar", "tournament", "character"],
        "generated_vocab": [
            "hit a big combo", "block the attack", "my health is low",
            "pick your character", "win the round", "special move",
            "so close to winning", "one more match", "he's too strong", "final boss fight",
        ],
    },
    "Construcción con bloques mágicos": {
        "keywords": ["block", "build", "tall", "house", "castle", "break"],
        "generated_vocab": [
            "build it up", "make it tall", "so big", "my castle", "it fell down",
            "break it", "one more block", "look at mine", "put it here", "all done",
        ],
    },
    "Suscripciones gaming y juego en la nube": {
        "keywords": ["cloud gaming", "library", "subscription", "latency", "cross-play", "catalog"],
        "generated_vocab": [
            "hundreds of games for one price", "no download just stream it",
            "the lag ruins it sometimes", "play on any device", "worth the monthly fee",
            "my whole library in the cloud", "cross-play with everyone",
            "they add new games every month", "cancel anytime", "no need for a console",
        ],
    },
}

SEG_META = {  # segmento md -> (audience, kid_age_group)
    "adultos": ("adult", None),
    "junior": ("kid", "junior"),
    "mini": ("kid", "mini"),
    "teen": ("kid", "tween"),
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:120]


def parse_v3() -> list[dict]:
    out = []
    with open(V3, encoding="utf-8") as fh:
        for ln in fh:
            if not ln.startswith("|"):
                continue
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if len(cells) < 5 or cells[0] in ("edad",) or cells[0].startswith("-"):
                continue
            seg, title, levels, cat, _seed = cells[:5]
            out.append({"seg": seg, "title": title,
                        "levels": [x.strip() for x in levels.split(",")], "cat": cat})
    return out


async def main() -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Topic))).scalars().all()

        # backup de TODO (por las dudas), aunque no borremos nada
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bkp = os.path.join(os.path.dirname(__file__), f"_backup_topics_{stamp}.json")
        with open(bkp, "w", encoding="utf-8") as fh:
            json.dump([{"id": r.id, "slug": r.slug, "title": r.title, "levels": r.levels,
                        "category": r.category, "is_active": r.is_active, "segmento": r.segmento,
                        "kid_age_group": r.kid_age_group, "audience": r.audience,
                        "keywords": r.keywords, "generated_vocab": r.generated_vocab}
                       for r in rows], fh, ensure_ascii=False, indent=1)

        by_id = {r.id: r for r in rows}
        # activos primero -> setdefault se queda con el activo cuando hay duplicado de título
        by_norm: dict[str, Topic] = {}
        for r in sorted(rows, key=lambda t: (not t.is_active, t.id)):
            by_norm.setdefault(norm(r.title), r)
        slugs = {r.slug for r in rows}

        v3 = parse_v3()
        rename_norms = {norm(v["title"]): tid for tid, v in RENAMES_BY_ID.items()}
        touched_ids: set[int] = set()
        log = {"UPDATE": [], "REACTIVATE": [], "RENAME": [], "INSERT": [], "DEACTIVATE": []}

        for t in v3:
            n = norm(t["title"])
            aud, kag = SEG_META[t["seg"]]

            if n in rename_norms:  # rename por id
                r = by_id[rename_norms[n]]
                touched_ids.add(r.id)
                r.title, r.levels, r.category = t["title"], t["levels"], t["cat"]
                r.is_active, r.segmento, r.audience, r.kid_age_group = True, t["seg"], aud, kag
                log["RENAME"].append(f"id={r.id} -> {t['title']!r}")
                continue

            r = by_norm.get(n)
            if r:
                touched_ids.add(r.id)
                was_inactive = not r.is_active
                r.levels, r.category, r.segmento, r.audience, r.kid_age_group = \
                    t["levels"], t["cat"], t["seg"], aud, kag
                r.is_active = True
                log["REACTIVATE" if was_inactive else "UPDATE"].append(f"id={r.id} {t['title']}")
                continue

            # INSERT nuevo
            content = NEW_CONTENT.get(t["title"])
            if not content:
                raise SystemExit(f"NUEVO sin contenido definido: {t['title']!r} — abortando.")
            slug = slugify(t["title"])
            while slug in slugs:
                slug += "-x"
            slugs.add(slug)
            nt = Topic(slug=slug, title=t["title"], category=t["cat"], levels=t["levels"],
                       keywords=content["keywords"], generated_vocab=content["generated_vocab"],
                       seed_prompts={}, is_active=True, audience=aud, segmento=t["seg"],
                       kid_age_group=kag)
            db.add(nt)
            log["INSERT"].append(f"{t['title']} (slug={slug})")

        for r in rows:
            if r.is_active and r.id not in touched_ids and norm(r.title) not in rename_norms:
                r.is_active = False
                log["DEACTIVATE"].append(f"id={r.id} {r.title}")

        for k, v in log.items():
            print(f"\n== {k} ({len(v)}) ==")
            for line in v:
                print("  " + line)

        if APPLY:
            await db.commit()
            print(f"\nAPLICADO. Backup: {os.path.basename(bkp)}")
        else:
            await db.rollback()
            print(f"\nDRY-RUN (rollback). Backup igual escrito: {os.path.basename(bkp)}. Corré con --apply para escribir.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
