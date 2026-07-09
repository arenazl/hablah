"""WO F0-06 — cobertura teen B1/B2. ESCRIBE solo con --apply. Hace backup antes.

Contexto (docs/03-rework/02-hoja-de-ruta.md): medido 2026-07-09, teen tenía solo 2
tópicos activos con B1/B2 en levels[] ("Suscripciones gaming y juego en la nube",
"Trabajos del futuro"). Este script prepara la propuesta — el dueño la aprueba antes
de correr con --apply (regla global 5: cambio pedagógico = gate del dueño).

Dos caminos (mezclados):
  EXTEND : agrega B1,B2 a levels[] de tópicos teen existentes cuyo generated_vocab
           YA es opinable/idiomático (verificado a mano, no cáscara) — se CONSERVA
           el contenido intacto, solo cambia levels.
  INSERT : tópicos nuevos, contenido embebido acá, pensados para B1/B2 exclusivamente
           (temas ricos/opinables — identidad, redes con mirada crítica, futuro,
           causas, autonomía — nada infantil, nada académico-abstracto-seco).

Patrón idéntico a apply_v3_topics.py: dry-run por defecto, diff visible, backup JSON,
--apply para escribir. Matching por título normalizado (no duplica).
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

APPLY = "--apply" in sys.argv

# ─── EXTEND: título existente -> levels[] completo nuevo (conserva keywords/generated_vocab) ───
EXTEND_LEVELS = {
    "Decir lo que pensás": ["A0", "A1", "A2", "B1", "B2"],
    "Viajes y culturas": ["A0", "A1", "A2", "B1", "B2"],
}

# ─── INSERT: tópicos nuevos, solo B1/B2 (contenido pensado para nivel intermedio-alto) ───
NEW_TOPICS = [
    {
        "title": "Quién soy y quién quiero ser",
        "category": "kids",
        "levels": ["B1", "B2"],
        "keywords": ["identity", "comparison", "pressure", "authentic", "confidence", "insecure"],
        "generated_vocab": [
            "still figuring myself out", "everyone's trying to fit in somehow",
            "comparing myself to people online", "it's okay to be different",
            "pressure to look a certain way", "finding what actually makes me happy",
            "I used to care so much what people thought", "growing into who I am",
            "labels don't really define me", "confidence comes and goes",
            "trying not to just copy everyone else",
        ],
    },
    {
        "title": "Redes sociales: el lado B",
        "category": "tech",
        "levels": ["B1", "B2"],
        "keywords": ["algorithm", "comparison", "screen time", "validation", "burnout", "filter"],
        "generated_vocab": [
            "the algorithm knows me a little too well", "everyone's highlight reel, not real life",
            "chasing likes gets exhausting", "comparing my life to a filtered version",
            "I deleted the app for a week", "it's designed to keep you scrolling",
            "validation from strangers online", "social media anxiety is real",
            "curating the perfect feed takes way too much effort", "sometimes I just need to log off",
            "cancel culture moves so fast", "influencers make it look effortless",
        ],
    },
    {
        "title": "Crecer en un mundo que cambia rápido",
        "category": "kids",
        "levels": ["B1", "B2"],
        "keywords": ["change", "uncertain", "technology", "generation", "adapt", "overwhelming"],
        "generated_vocab": [
            "everything's changing so fast", "hard to plan when the world keeps shifting",
            "my parents had it so different", "AI is going to change everything",
            "sometimes it feels overwhelming", "trying to stay optimistic about it",
            "adults don't always have the answers either", "we'll figure it out as we go",
            "the world our parents grew up in is basically gone", "adapting is basically a life skill now",
            "nobody really knows what's coming", "focusing on what I can actually control",
        ],
    },
    {
        "title": "Causas que me importan",
        "category": "kids",
        "levels": ["B1", "B2"],
        "keywords": ["cause", "awareness", "injustice", "activism", "change", "voice"],
        "generated_vocab": [
            "something I actually care about", "raising awareness helps more than people think",
            "it's not fair and I want to do something", "small actions add up to real change",
            "using my voice for something that matters", "feels like one person can't change much sometimes",
            "signing a petition is a start, not the end", "educating myself before speaking up",
            "standing up for what's right isn't always easy", "my generation actually cares about this stuff",
            "it's bigger than just me", "actions speak louder than a hashtag",
        ],
    },
    {
        "title": "Libertad y límites con mis padres",
        "category": "kids",
        "levels": ["B1", "B2"],
        "keywords": ["curfew", "trust", "independence", "rules", "privacy", "argument"],
        "generated_vocab": [
            "they still treat me like I'm twelve", "earning more freedom takes time",
            "we don't always see eye to eye", "I get why they worry",
            "just want a bit more independence", "the rules feel unfair sometimes",
            "trust goes both ways", "picking my battles with them",
            "they actually had a point", "growing up means more responsibility too",
            "it's not rebellion, I just want some space", "we talked it out eventually",
        ],
    },
]

SEG_META = ("kid", "tween")  # audience, kid_age_group para segmento=teen


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:120]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Topic))).scalars().all()

        # backup de TODO el catálogo (mismo patrón que apply_v3_topics.py)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bkp = os.path.join(os.path.dirname(__file__), f"_backup_topics_teen_b1b2_{stamp}.json")
        with open(bkp, "w", encoding="utf-8") as fh:
            json.dump([{"id": r.id, "slug": r.slug, "title": r.title, "levels": r.levels,
                        "category": r.category, "is_active": r.is_active, "segmento": r.segmento,
                        "kid_age_group": r.kid_age_group, "audience": r.audience,
                        "keywords": r.keywords, "generated_vocab": r.generated_vocab}
                       for r in rows], fh, ensure_ascii=False, indent=1)

        by_norm: dict[str, Topic] = {norm(r.title): r for r in rows}
        slugs = {r.slug for r in rows}

        log = {"EXTEND": [], "INSERT": [], "SKIP (no encontrado)": []}

        # ── EXTEND ──
        for title, new_levels in EXTEND_LEVELS.items():
            r = by_norm.get(norm(title))
            if not r:
                log["SKIP (no encontrado)"].append(f"{title!r} — no está en la DB, revisar título exacto")
                continue
            if r.segmento != "teen":
                log["SKIP (no encontrado)"].append(f"{title!r} — existe pero segmento={r.segmento!r} (esperaba 'teen')")
                continue
            old_levels = list(r.levels or [])
            if set(new_levels) == set(old_levels):
                log["SKIP (no encontrado)"].append(f"{title!r} — ya tiene {old_levels}, nada que extender")
                continue
            log["EXTEND"].append(
                f"id={r.id} {title!r}: {old_levels} -> {new_levels} "
                f"(keywords y generated_vocab SIN TOCAR — {len(r.generated_vocab or [])} frases)"
            )
            r.levels = new_levels

        # ── INSERT ──
        for t in NEW_TOPICS:
            n = norm(t["title"])
            if n in by_norm:
                log["SKIP (no encontrado)"].append(f"{t['title']!r} — YA EXISTE (id={by_norm[n].id}), no se inserta de nuevo")
                continue
            slug = slugify(t["title"])
            while slug in slugs:
                slug += "-x"
            slugs.add(slug)
            nt = Topic(
                slug=slug, title=t["title"], category=t["category"], levels=t["levels"],
                keywords=t["keywords"], generated_vocab=t["generated_vocab"],
                seed_prompts={}, is_active=True, audience=SEG_META[0], segmento="teen",
                kid_age_group=SEG_META[1],
            )
            db.add(nt)
            log["INSERT"].append(
                f"{t['title']!r} (slug={slug}, category={t['category']}, levels={t['levels']}, "
                f"keywords[:6]={t['keywords']}, {len(t['generated_vocab'])} frases-ancla)"
            )

        for k, v in log.items():
            print(f"\n== {k} ({len(v)}) ==")
            for line in v:
                print("  " + line)

        n_extend = len(log["EXTEND"])
        n_insert = len(log["INSERT"])
        print(f"\n--- resumen: {n_insert} inserts, {n_extend} extends, 0 escrito (dry-run) ---" if not APPLY
              else f"\n--- resumen: {n_insert} inserts, {n_extend} extends ---")

        if APPLY:
            await db.commit()
            print(f"\nAPLICADO. Backup: {os.path.basename(bkp)}")
        else:
            await db.rollback()
            print(f"\nDRY-RUN (rollback, NADA escrito en la DB). Backup igual escrito: "
                  f"{os.path.basename(bkp)}. Corré con --apply para escribir (requiere OK del dueño).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
