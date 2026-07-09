"""Reemplaza las keywords técnicas de cada tópico por frases-pivote conversacionales.

Filosofía:
- Las keywords son SUGERENCIAS visuales para el alumno (panel lateral),
  no obligaciones impuestas al tutor.
- Deben ser cosas que un hablante nativo DICE naturalmente al hablar del tema:
  - "rewatchable", "blew my mind", "favorite scene" para cine.
  - "stuck with me", "comeback", "underrated" para deportes.
  - NO jerga técnica ni vocabulario académico aislado.
- 6 a 10 por tópico — suficiente para señal, no abrumador.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Topic


# Slug → keywords nuevas (frases-pivote conversacionales)
KEYWORDS_BY_SLUG: dict[str, list[str]] = {
    # ─── ARTE / CINE ───────────────────────────────────────────────────────
    "tarantino-90s": [
        "favorite scene", "blew my mind", "rewatchable", "stuck with me",
        "stylish", "over the top", "old-school", "love-it-or-hate-it",
    ],
    "uk-garage": [
        "infectious beat", "underground scene", "back in the day",
        "took off", "got me into", "smooth groove", "club banger", "obsessed with",
    ],
    "ableton-produccion": [
        "I usually start with", "the trick is", "play around with",
        "happy accident", "the sound I was after", "tweak", "layer", "vibe",
    ],
    "series-streaming": [
        "binged it", "hooked from episode one", "slow burn",
        "the writing", "the ending broke me", "underrated", "couldn't stop watching", "must-watch",
    ],
    "videojuegos-aaa": [
        "addictive", "playing through", "the story really got me",
        "couldn't put it down", "underrated gem", "the gameplay just feels right", "hours flew by", "stuck on",
    ],
    "musica-rock": [
        "stood the test of time", "killer riff", "the album that changed everything",
        "I keep going back to", "raw energy", "their best era", "underrated", "anthem",
    ],
    "stand-up-comedia": [
        "had me crying laughing", "spot on", "uncomfortable but funny",
        "the way he tells it", "edgy", "relatable", "punchline lands", "the bit about",
    ],

    # ─── DEPORTES ──────────────────────────────────────────────────────────
    "futbol-mundial": [
        "amazing match", "comeback", "couldn't believe it",
        "the best game I've ever seen", "we deserved it", "robbed", "underdog", "all-time great",
    ],
    "nba-basket": [
        "carried the team", "unstoppable that season", "clutch",
        "all-time great", "underrated", "the goat debate", "back when", "championship run",
    ],
    "running-maraton": [
        "hit the wall", "felt amazing", "personal best",
        "tough day", "kept pushing", "first time I", "loved every step", "tougher than I thought",
    ],
    "tenis-grand-slam": [
        "epic five-setter", "raised his level", "match point",
        "the GOAT", "incredible comeback", "lost it mentally", "fired up", "couldn't miss",
    ],
    "f1-motor": [
        "wheel-to-wheel", "from the back of the grid", "made the difference",
        "blew the rest away", "questionable call", "could've gone either way", "lights out", "on form",
    ],

    # ─── GASTRONOMÍA ───────────────────────────────────────────────────────
    "cocina-italiana": [
        "the secret is", "my nonna used to", "fresh ingredients",
        "comfort food", "you can't go wrong with", "from scratch", "simple but perfect", "obsessed with",
    ],
    "asado-argentino": [
        "takes hours", "the smell", "Sunday tradition",
        "low and slow", "perfectly cooked", "everyone gathers around", "no rush", "best with friends",
    ],
    "cafe-specialty": [
        "I'm picky about", "my go-to", "smooth",
        "way too acidic", "right amount of", "morning ritual", "love a good", "you can taste",
    ],

    # ─── CIENCIA ───────────────────────────────────────────────────────────
    "espacio-astronomia": [
        "mind-blowing", "imagine that", "I read recently that",
        "we still don't know", "tiny in comparison", "it took years", "fascinating", "what if",
    ],
    "clima-cambio": [
        "we're running out of", "small changes add up", "I'm worried about",
        "we should be doing more", "the data shows", "it's already affecting", "a wake-up call", "doable",
    ],
    "biologia-evolucion": [
        "fascinating", "it makes sense when you think about it", "tiny changes over time",
        "I'd never thought about", "completely changed how I see", "subtle but powerful", "no coincidence", "shaped by",
    ],

    # ─── LIFESTYLE ─────────────────────────────────────────────────────────
    "meditacion-mindfulness": [
        "helps me", "calms me down", "I try to",
        "every morning", "took a while to", "I noticed that", "small habit", "game changer",
    ],
    "nutricion-dietas": [
        "I try to stick to", "made a huge difference", "not as hard as it sounds",
        "I cut down on", "energy levels", "small changes", "every body's different", "not a quick fix",
    ],
    "moda-streetwear": [
        "instant cop", "been waiting for this drop", "elevates the fit",
        "low-key", "everyday wear", "comfort and style", "obsessed with", "the colorway",
    ],
    "fuerza-powerlifting": [
        "hit a PR", "felt amazing", "back day",
        "form over weight", "took years to", "small wins", "rest days matter", "addicted to",
    ],

    # ─── NEGOCIOS ──────────────────────────────────────────────────────────
    "remoto-nomada": [
        "best of both worlds", "I miss the office sometimes", "flexible",
        "discipline is key", "I work better when", "the freedom", "you save so much time", "draining",
    ],
    "entrevistas-tech": [
        "stressed about", "they asked me", "happy with how it went",
        "wish I had said", "took me by surprise", "good vibe", "tough question", "talked through it",
    ],
    "emprender-startup": [
        "we figured out", "almost gave up", "the turning point",
        "we had to pivot", "no funding yet", "small win", "all-nighter", "betting everything on",
    ],
    "arquitectura-software": [
        "it's not perfect but it works", "we ran into", "made the call",
        "would do it differently", "in hindsight", "wish we had", "trade-offs", "ended up rewriting",
    ],
    "agiles-retros": [
        "we tried", "what worked for us", "it was a mess",
        "lesson learned", "the team grew", "small improvements", "out of our hands", "talked it through",
    ],

    # ─── VIAJES ────────────────────────────────────────────────────────────
    "japon-cultura": [
        "blew me away", "completely different vibe", "I'd go back tomorrow",
        "the food alone", "wish I had more time", "every detail", "polite to a fault", "unforgettable",
    ],
    "patagonia-trekking": [
        "the silence up there", "tougher than I expected", "worth every step",
        "weather changed in minutes", "stunning view", "couldn't believe my eyes", "exhausted but happy", "I'd do it again",
    ],
    "viajes-aeropuertos": [
        "delayed forever", "missed my connection", "smooth flight",
        "ended up sleeping at the gate", "rushed", "always carry-on", "wish I had", "happens every time",
    ],

    # ─── IA / TECH ─────────────────────────────────────────────────────────
    "ia-etica": [
        "double-edged sword", "we should be careful with", "hard to draw the line",
        "happening faster than we think", "I'm not sure how I feel about", "useful but scary", "depends on", "for better or worse",
    ],
}


async def main() -> None:
    print(f"=== Reseed keywords ({len(KEYWORDS_BY_SLUG)} tópicos) ===")
    updated = 0
    not_found = []
    async with AsyncSessionLocal() as db:
        for slug, kws in KEYWORDS_BY_SLUG.items():
            row = (await db.execute(select(Topic).where(Topic.slug == slug))).scalar_one_or_none()
            if not row:
                not_found.append(slug)
                continue
            row.keywords = kws
            updated += 1
            print(f"  OK {slug}: {len(kws)} keywords")
        await db.commit()
    print(f"\nActualizados: {updated}")
    if not_found:
        print(f"NO encontrados (slug no existe): {not_found}")


if __name__ == "__main__":
    asyncio.run(main())
