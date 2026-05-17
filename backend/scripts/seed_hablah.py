"""Seeds canónicos de Habláh: 3 templates + 8 topics + perfil completo del admin demo."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.template import Template, Topic, UserInterest, TopicProgress
from models.user import User


TEMPLATES = [
    {
        "slug": "coach",
        "name": "The Coach",
        "description": "Ultra-empático, paciente y motivador. Prioriza fluidez sobre precisión. No penaliza.",
        "rigor": 2,
        "challenges_per_min": 1,
        "allow_interruptions": False,
        "block_on_repeat": False,
        "json_output": True,
        "tones": ["empático", "paciente", "motivador", "friendly"],
        "voice_id": "yA5jrK1S9cpCAojBYyMu",
        "voice_label": "Lucia — Warm, Expressive",
        "icon_bg": "#00B37E",
        "is_preset": True,
        "version": "v2.4",
        "status": "active",
        "assigned_count": 24812,
    },
    {
        "slug": "sincerist",
        "name": "The Sincerist / Bootcamp",
        "description": "Profesional, directo y demandante. Evalúa cada palabra. Bloqueos por error repetido.",
        "rigor": 5,
        "challenges_per_min": 4,
        "allow_interruptions": False,
        "block_on_repeat": True,
        "json_output": True,
        "tones": ["profesional", "directo", "demandante"],
        "voice_id": "bN1bDXgDIGX5lw0rtY2B",
        "voice_label": "Melanie — Clear, Professional",
        "icon_bg": "#0E1614",
        "is_preset": True,
        "version": "v2.5",
        "status": "active",
        "assigned_count": 13422,
    },
    {
        "slug": "arcade",
        "name": "The Arcade",
        "description": "Enérgico, lúdico y veloz. Sesiones cortas con recompensas visuales y velocidad alta.",
        "rigor": 3,
        "challenges_per_min": 6,
        "allow_interruptions": True,
        "block_on_repeat": False,
        "json_output": True,
        "tones": ["lúdico", "veloz", "enérgico"],
        "voice_id": "93IsRN8Mhs3FMPjO05OH",
        "voice_label": "Arcade voice — energetic",
        "icon_bg": "#FFB800",
        "is_preset": True,
        "version": "v2.2",
        "status": "active",
        "assigned_count": 6688,
    },
]

TOPICS = [
    {
        "slug": "uk-garage",
        "title": "Música electrónica · UK Garage",
        "category": "arte",
        "levels": ["A2", "B1", "B2", "C1"],
        "is_hot": True,
        "seed_prompts": {
            "A2": "Pregúntale al alumno si conoce este género. Pídele que describa con sus palabras cómo suena. Foco: descripción y comparación.",
            "B1": "Hablen del origen del género en los 90. Forzá el uso de pasado simple.",
            "B2": "Iniciá la conversación preguntando por los pros y contras del UK Garage versus House. Forzá uso de pasado narrativo cuando hable de la historia del género.",
            "C1": "Pedile análisis técnico de producción: percusión, swing rítmico, sub-bass. Profundizá en diferencias regionales (South London vs Birmingham).",
            "C2": "Debate sobre el legado del género en la música electrónica contemporánea. Forzá uso de subjuntivo, condicionales 3 y modalidades epistémicas.",
        },
        "keywords": ["two-step", "sub-bass", "swing", "South London", "pirate radio", "BPM", "breakbeat", "vocal chop", "sampled", "underground", "nevertheless", "however"],
        "usage_count": 3482,
    },
    {
        "slug": "arquitectura-software",
        "title": "Arquitectura de software",
        "category": "tech",
        "levels": ["B1", "B2", "C1", "C2"],
        "seed_prompts": {
            "B2": "Hablen sobre microservicios vs monolito. Pedile que justifique decisiones con casos concretos. Foco: vocabulario técnico + conectores adversativos.",
            "C1": "Profundizá en DDD, event sourcing, y trade-offs operacionales. Pedile que defienda una postura.",
        },
        "keywords": ["microservices", "monolith", "DDD", "bounded context", "event sourcing", "trade-off", "scalability", "however", "whereas"],
        "usage_count": 2104,
    },
    {
        "slug": "ableton-produccion",
        "title": "Producción musical · Ableton",
        "category": "arte",
        "levels": ["B2", "C1"],
        "seed_prompts": {
            "B2": "Hablen de un workflow típico: armar un beat de cero hasta mezcla. Pedile que use verbos de proceso en pasado simple cuando describa su última sesión.",
        },
        "keywords": ["sidechain", "compressor", "warp", "MIDI", "envelope", "sample", "rendered", "bounced"],
        "usage_count": 1880,
    },
    {
        "slug": "ia-etica",
        "title": "IA generativa · ética",
        "category": "tech",
        "levels": ["B2", "C1", "C2"],
        "is_hot": True,
        "seed_prompts": {
            "B2": "Hablen de los riesgos de bias en modelos de lenguaje. Pedile ejemplos concretos. Foco: condicionales tipo 2 y voz pasiva.",
            "C1": "Discutan el rol de RLHF y la regulación europea (AI Act). Pedile postura argumentada.",
        },
        "keywords": ["bias", "RLHF", "alignment", "hallucination", "regulation", "AI Act", "trade-off", "arguably"],
        "usage_count": 2941,
    },
    {
        "slug": "fuerza-powerlifting",
        "title": "Entrenamiento de fuerza · powerlifting",
        "category": "lifestyle",
        "levels": ["A2", "B1", "B2"],
        "seed_prompts": {
            "B2": "Hablen sobre técnica de squat. Pedile que describa cómo progresó. Foco: pasado simple + comparativos.",
        },
        "keywords": ["squat", "deadlift", "bench press", "PR", "plateau", "recovery", "macros", "deload"],
        "usage_count": 1622,
    },
    {
        "slug": "agiles-retros",
        "title": "Metodologías ágiles · retrospectivas",
        "category": "tech",
        "levels": ["B1", "B2"],
        "seed_prompts": {
            "B2": "Hablen de una retro complicada que hayan vivido. Forzá narración en pasado y vocabulario de procesos.",
        },
        "keywords": ["retrospective", "OKR", "sprint", "scrum master", "blocker", "action item", "facilitator"],
        "usage_count": 941,
    },
    {
        "slug": "tarantino-90s",
        "title": "Cine de los 90 · Tarantino",
        "category": "arte",
        "levels": ["B1", "B2", "C1"],
        "seed_prompts": {
            "B2": "Hablen de Pulp Fiction. Pedile que cuente una escena con sus palabras. Foco: pasado narrativo + adjetivos.",
        },
        "keywords": ["narrative", "non-linear", "dialogue", "soundtrack", "homage", "indie", "noir"],
        "usage_count": 1108,
    },
    {
        "slug": "viajes-aeropuertos",
        "title": "Viajes · aeropuertos en horarios pico",
        "category": "lifestyle",
        "levels": ["A2", "B1", "B2"],
        "seed_prompts": {
            "B1": "Pedile que cuente su último viaje. Foco: vocabulario de transporte y pasado simple.",
        },
        "keywords": ["layover", "check-in", "boarding", "delayed", "gate", "rebook", "carry-on"],
        "usage_count": 1311,
    },
]


async def seed_templates(db) -> dict[str, int]:
    """Upsert por slug. Devuelve {slug: id}."""
    result = {}
    for t in TEMPLATES:
        existing = await db.execute(select(Template).where(Template.slug == t["slug"]))
        row = existing.scalar_one_or_none()
        if row:
            print(f"  template '{t['slug']}' ya existe (id={row.id})")
            result[t["slug"]] = row.id
            continue
        obj = Template(**t)
        db.add(obj)
        await db.flush()
        print(f"  template '{t['slug']}' creado (id={obj.id})")
        result[t["slug"]] = obj.id
    await db.commit()
    return result


async def seed_topics(db) -> dict[str, int]:
    result = {}
    for t in TOPICS:
        existing = await db.execute(select(Topic).where(Topic.slug == t["slug"]))
        row = existing.scalar_one_or_none()
        if row:
            print(f"  topic '{t['slug']}' ya existe (id={row.id})")
            result[t["slug"]] = row.id
            continue
        obj = Topic(**t)
        db.add(obj)
        await db.flush()
        print(f"  topic '{t['slug']}' creado (id={obj.id})")
        result[t["slug"]] = obj.id
    await db.commit()
    return result


async def seed_admin_profile(db, template_ids: dict, topic_ids: dict) -> None:
    """Completa el perfil del admin/student demo + interests."""
    admin = (await db.execute(select(User).where(User.email == "admin@hablah.app"))).scalar_one_or_none()
    if not admin:
        print("  admin@hablah.app no existe — corré init_db primero")
        return

    admin.cefr_level = "B2"
    admin.target_language = "en"
    admin.base_language = "es"
    admin.accent_preference = "uk"
    admin.active_template_id = template_ids.get("sincerist")
    admin.streak_days = 12
    admin.streak_best = 12
    admin.target_minutes_per_session = 7
    admin.insistent_mode_enabled = True
    admin.plan = "pro"

    # Limpiar intereses previos y reseedear
    await db.execute(UserInterest.__table__.delete().where(UserInterest.user_id == admin.id))
    desired_interests = ["uk-garage", "arquitectura-software", "ableton-produccion", "viajes-aeropuertos"]
    for slug in desired_interests:
        if slug in topic_ids:
            db.add(UserInterest(user_id=admin.id, topic_id=topic_ids[slug]))

    # Progreso seed: UK Garage 38%
    if "uk-garage" in topic_ids:
        existing = await db.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == admin.id, TopicProgress.topic_id == topic_ids["uk-garage"]
            )
        )
        prog = existing.scalar_one_or_none()
        if not prog:
            db.add(TopicProgress(
                user_id=admin.id, topic_id=topic_ids["uk-garage"],
                stages_done=2, stages_total=6, pct=38, minutes_spoken=47, sessions_count=6,
            ))

    await db.commit()
    print(f"  perfil admin completo: B2, Sincerist activo, 4 intereses, racha 12d")


async def main() -> None:
    print("=== Seed Habláh ===")
    async with AsyncSessionLocal() as db:
        print("Templates...")
        tids = await seed_templates(db)
        print("Topics...")
        topids = await seed_topics(db)
        print("Perfil admin...")
        await seed_admin_profile(db, tids, topids)
    print("=== Seed completado ===")


if __name__ == "__main__":
    asyncio.run(main())
