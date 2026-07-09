"""Suma 20+ tópicos variados al catálogo de Habláh."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.template import Topic


TOPICS = [
    # ─── DEPORTES (5) ───
    {
        "slug": "futbol-mundial", "title": "Fútbol · Mundiales y selecciones", "category": "deportes",
        "levels": ["A2", "B1", "B2", "C1"], "is_hot": True,
        "seed_prompts": {
            "B1": "Hablen de un partido inolvidable. Forzá pasado simple cuando cuenta lo que pasó.",
            "B2": "Discutan tácticas y por qué un equipo ganó. Forzá conectores causales y voz pasiva.",
        },
        "keywords": ["striker", "midfielder", "offside", "penalty", "extra time", "underdog", "lineup", "however", "nevertheless"],
    },
    {
        "slug": "nba-basket", "title": "Básquet · NBA y leyendas", "category": "deportes",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Comparen jugadores históricos (MJ vs LeBron). Forzá comparativos relativos.",
        },
        "keywords": ["rebound", "assist", "MVP", "draft", "trade", "rookie", "playoffs", "arguably"],
    },
    {
        "slug": "running-maraton", "title": "Running · entrenamiento y maratones", "category": "deportes",
        "levels": ["A2", "B1", "B2"],
        "seed_prompts": {
            "B1": "Hablen de la rutina de entrenamiento del alumno. Forzá adverbios de frecuencia.",
        },
        "keywords": ["pace", "split", "PR", "tapering", "long run", "interval", "carb loading"],
    },
    {
        "slug": "tenis-grand-slam", "title": "Tenis · Grand Slam y rivalidades", "category": "deportes",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Hablen del Big Three (Federer/Nadal/Djokovic). Forzá pasado y comparativos.",
        },
        "keywords": ["ace", "break point", "deuce", "backhand", "tiebreak", "Grand Slam", "ranking"],
    },
    {
        "slug": "f1-motor", "title": "Fórmula 1 y automovilismo", "category": "deportes",
        "levels": ["B1", "B2", "C1"], "is_hot": True,
        "seed_prompts": {
            "B2": "Hablen de una carrera reciente. Forzá pasado narrativo y vocabulario técnico.",
        },
        "keywords": ["pit stop", "pole position", "lap", "DRS", "qualifying", "podium", "downforce"],
    },

    # ─── GASTRONOMÍA (3) ───
    {
        "slug": "cocina-italiana", "title": "Cocina italiana · pasta y vinos", "category": "gastronomia",
        "levels": ["A2", "B1", "B2"],
        "seed_prompts": {
            "B1": "Pedile que cuente cómo hace su pasta favorita. Imperativos + secuenciadores (first, then, finally).",
        },
        "keywords": ["al dente", "simmer", "drizzle", "garnish", "rustic", "homemade", "vintage"],
    },
    {
        "slug": "asado-argentino", "title": "Asado argentino · técnica y rituales", "category": "gastronomia",
        "levels": ["B1", "B2"], "is_hot": True,
        "seed_prompts": {
            "B2": "Defendé el asado como ritual social, no solo comida. Forzá conectores adversativos.",
        },
        "keywords": ["grill", "embers", "marinade", "rare", "medium-rare", "side dish", "gathering"],
    },
    {
        "slug": "cafe-specialty", "title": "Café de especialidad · v60, espresso", "category": "gastronomia",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "B2": "Compará métodos de preparación. Forzá vocabulario sensorial y comparativos.",
        },
        "keywords": ["roast", "bean origin", "extraction", "crema", "acidic", "body", "aftertaste"],
    },

    # ─── CIENCIA Y NATURALEZA (3) ───
    {
        "slug": "espacio-astronomia", "title": "Espacio · astronomía y misiones", "category": "ciencia",
        "levels": ["B1", "B2", "C1", "C2"],
        "seed_prompts": {
            "B2": "Hablen de la misión Artemis o Mars Rover. Forzá voz pasiva en explicaciones científicas.",
        },
        "keywords": ["orbit", "launch", "payload", "telescope", "exoplanet", "light-year", "deployed"],
    },
    {
        "slug": "clima-cambio", "title": "Cambio climático · ciencia y políticas", "category": "ciencia",
        "levels": ["B2", "C1", "C2"], "is_hot": True,
        "seed_prompts": {
            "B2": "Discutan causas vs consecuencias. Forzá condicionales tipo 1 y 2.",
        },
        "keywords": ["greenhouse", "emissions", "renewable", "carbon footprint", "Paris Agreement", "tipping point"],
    },
    {
        "slug": "biologia-evolucion", "title": "Biología · evolución y genética", "category": "ciencia",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "B2": "Pedile que explique selección natural con sus palabras. Forzá presente simple para hechos científicos.",
        },
        "keywords": ["natural selection", "mutation", "adaptation", "DNA", "species", "gene", "trait"],
    },

    # ─── ENTRETENIMIENTO (4) ───
    {
        "slug": "series-streaming", "title": "Series de streaming · drama prestigio", "category": "arte",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Resumí una serie sin spoilear final. Forzá presente histórico y conectores.",
        },
        "keywords": ["plot twist", "binge-watch", "showrunner", "season finale", "cliffhanger", "ensemble cast"],
    },
    {
        "slug": "videojuegos-aaa", "title": "Videojuegos · indie y AAA", "category": "arte",
        "levels": ["B1", "B2"], "is_hot": True,
        "seed_prompts": {
            "B2": "Compará un AAA y un indie. Forzá comparativos relativos y opinión justificada.",
        },
        "keywords": ["open world", "mechanic", "lore", "DLC", "early access", "speedrun", "co-op"],
    },
    {
        "slug": "musica-rock", "title": "Rock clásico · 70s a 90s", "category": "arte",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Hablen de una banda emblemática. Forzá pasado narrativo y conectores de causa.",
        },
        "keywords": ["riff", "lyrics", "album", "tour", "legacy", "frontman", "lineup change"],
    },
    {
        "slug": "stand-up-comedia", "title": "Stand-up · comediantes y especiales", "category": "arte",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "C1": "Discutí qué hace funny a un chiste. Forzá ironía y vocabulario abstracto.",
        },
        "keywords": ["punchline", "set", "crowd work", "deadpan", "deliver", "self-deprecating"],
    },

    # ─── LIFESTYLE Y BIENESTAR (3) ───
    {
        "slug": "meditacion-mindfulness", "title": "Meditación y mindfulness", "category": "lifestyle",
        "levels": ["A2", "B1", "B2"],
        "seed_prompts": {
            "B1": "Contá tu rutina de mañana. Forzá adverbios de frecuencia y presente simple.",
        },
        "keywords": ["breathe", "awareness", "anxiety", "routine", "mindset", "grounding"],
    },
    {
        "slug": "nutricion-dietas", "title": "Nutrición · dietas y mitos", "category": "lifestyle",
        "levels": ["B1", "B2"],
        "seed_prompts": {
            "B2": "Defendé o atacá una dieta específica. Forzá condicionales y voz pasiva.",
        },
        "keywords": ["calories", "macros", "intermittent fasting", "deficit", "surplus", "whole foods", "processed"],
    },
    {
        "slug": "moda-streetwear", "title": "Moda · streetwear y sneakers", "category": "lifestyle",
        "levels": ["B1", "B2"],
        "seed_prompts": {
            "B2": "Hablen de una marca y por qué creció. Forzá pasado simple y conectores.",
        },
        "keywords": ["drop", "hype", "collab", "resell", "vintage", "silhouette", "colorway"],
    },

    # ─── TRABAJO Y NEGOCIOS (3) ───
    {
        "slug": "remoto-nomada", "title": "Trabajo remoto · nómade digital", "category": "negocios",
        "levels": ["B1", "B2", "C1"], "is_hot": True,
        "seed_prompts": {
            "B2": "Pros y contras de vivir nómade. Forzá conectores adversativos y condicionales.",
        },
        "keywords": ["coworking", "timezone", "burnout", "flexibility", "async", "stipend"],
    },
    {
        "slug": "entrevistas-tech", "title": "Entrevistas técnicas · system design", "category": "negocios",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "B2": "Simulá una pregunta de system design. Forzá vocabulario técnico y opinión justificada.",
        },
        "keywords": ["scalability", "trade-off", "consistency", "load balancer", "cache", "bottleneck"],
    },
    {
        "slug": "emprender-startup", "title": "Emprender · early-stage startup", "category": "negocios",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "B2": "Contá una idea de startup. Forzá futuros (will, going to) y condicionales.",
        },
        "keywords": ["pivot", "MVP", "product-market fit", "runway", "fundraise", "traction", "burn rate"],
    },

    # ─── VIAJES Y CULTURA (2) ───
    {
        "slug": "japon-cultura", "title": "Japón · cultura y tradiciones", "category": "viajes",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Hablá de un aspecto cultural que te impacte. Forzá presente simple y conectores de contraste.",
        },
        "keywords": ["temple", "shrine", "etiquette", "matcha", "onsen", "rush hour", "harmony"],
    },
    {
        "slug": "patagonia-trekking", "title": "Patagonia · trekking y montañas", "category": "viajes",
        "levels": ["B1", "B2"],
        "seed_prompts": {
            "B2": "Contá un trek. Forzá pasado narrativo y descriptivos.",
        },
        "keywords": ["trail", "summit", "shelter", "glacier", "windy", "breathtaking", "ridge"],
    },
]


async def main() -> None:
    print(f"=== Seed +{len(TOPICS)} tópicos ===")
    created = 0
    skipped = 0
    async with AsyncSessionLocal() as db:
        for t in TOPICS:
            existing = (await db.execute(select(Topic).where(Topic.slug == t["slug"]))).scalar_one_or_none()
            if existing:
                skipped += 1
                continue
            obj = Topic(**t)
            db.add(obj)
            created += 1
        await db.commit()
    print(f"Creados: {created}  ·  Ya existían: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
