"""Seed completo del modulo Kids.

- Tutor 'friend' (Habi) en templates
- 10 topicos curados para chicos en topics
- Catalogo de achievements/stickers para coleccion
- Niveles narrativos en codigo (Curioso, Explorador, Aventurero, Capitan, Embajador)

Idempotente: chequea slug antes de insertar.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Template, Topic
from models.kids import AchievementCatalog


# ─── TUTOR "FRIEND" (Habi) ──────────────────────────────────────────
FRIEND_TUTOR = {
    "slug": "friend",
    "name": "Habi",
    "description": "Amigo paciente para chicos. Habla simple, alaba mucho, corrige reformulando.",
    "rigor": 1,
    "challenges_per_min": 1,
    "allow_interruptions": False,
    "block_on_repeat": False,
    "json_output": True,
    "tones": ["dulce", "paciente", "juguetón", "alentador"],
    "voice_id": "EXAVITQu4vr4xnSDxMaL",  # Sarah - US female warm
    "voice_label": "Sarah (Habi voice)",
    "pedagogy_preset": "ludico",
    "avoid_superlative_questions": True,
    "one_question_per_turn": True,
    "voice_speed": 92,        # un poco más lento que normal (más claro)
    "voice_stability": 65,
    "voice_style": 55,        # bastante expresividad
    "icon_bg": "#00B37E",
    "is_preset": True,
    "version": "v1.0",
    "status": "active",
    # Pedagogia v2
    "response_length": "terse",         # frases cortísimas (5-8 palabras)
    "tutor_talk_ratio": 35,             # habla un poco más que con adultos
    "proactive_questions": True,
    "tutor_shares_opinions": True,
    "warmth_level": 5,                  # MAX
    "correction_mode": "recast",        # NUNCA explícito - solo recast
    "correction_focus": ["vocab", "fluency"],
    "error_threshold": "only_major",
    "max_feedback_items": 1,            # solo 1 cosa al final (no abruma)
    "praise_count": 3,                  # 3 elogios mínimo
    "report_include_summary": True,
    "report_include_connectors": False,
    "report_include_vocab_suggestions": True,
    "report_include_pronunciation": False,
    "report_include_next_session_tip": False,
    "opening_style": "playful",
    "opening_includes_topic_intro": True,
    "silence_tolerance_ms": 2500,       # mucha paciencia
    "interruption_allowed": False,
    "scaffold_when_stuck": True,
}


# ─── 10 TOPICOS PARA CHICOS ─────────────────────────────────────────
# Cada uno con seed_prompts mini (4-7) y junior (8-12) en ingles base + español wrap.
KIDS_TOPICS = [
    {
        "slug": "kids-dinos",
        "title": "Dinosaurios",
        "category": "kids",
        "seed_prompts": {
            "mini": "Hi! I love dinosaurs! Do you have a favorite one? T-Rex was huge! What sound do you think he made?",
            "junior": "Welcome explorer! Dinosaurs lived millions of years ago. Tell me your favorite one and what made it special.",
        },
        "keywords": ["dinosaur", "T-Rex", "huge", "ancient", "egg", "roar"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": True,
    },
    {
        "slug": "kids-space",
        "title": "Espacio",
        "category": "kids",
        "seed_prompts": {
            "mini": "Look up! The sky has the moon and stars. Have you seen a rocket? What's your favorite planet?",
            "junior": "Space is huge! Eight planets, billions of stars. If you traveled to space, where would you go first and why?",
        },
        "keywords": ["planet", "rocket", "moon", "star", "astronaut", "Earth"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-sea",
        "title": "Mar y animales",
        "category": "kids",
        "seed_prompts": {
            "mini": "The sea is huge! Fish swim. Dolphins jump! Have you seen the ocean? What's your favorite sea animal?",
            "junior": "Oceans cover most of Earth! Whales, sharks, octopus, jellyfish. Tell me which sea animal you find coolest.",
        },
        "keywords": ["fish", "whale", "shark", "dolphin", "ocean", "swim"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-sport",
        "title": "Mi deporte",
        "category": "kids",
        "seed_prompts": {
            "mini": "Do you play any sport? I like running! Soccer is fun. Do you kick a ball? Tell me about it!",
            "junior": "Sports are awesome! Soccer, basketball, swimming, tennis. Which one do you play or watch? What's your team?",
        },
        "keywords": ["soccer", "basketball", "ball", "team", "score", "win"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-art",
        "title": "Dibujar y crear",
        "category": "kids",
        "seed_prompts": {
            "mini": "Do you like drawing? I love colors! Red, blue, yellow. What's your favorite color? What do you draw?",
            "junior": "Art is magic! Painting, drawing, sculpture, crafts. Tell me what you create and what colors you choose.",
        },
        "keywords": ["draw", "color", "paint", "red", "blue", "yellow", "green"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-music",
        "title": "Música y canciones",
        "category": "kids",
        "seed_prompts": {
            "mini": "Music! Do you sing? La la la! What song do you know? Can you clap with me?",
            "junior": "Music is everywhere. Songs, instruments, dancing. What's your favorite song or band? Do you play any instrument?",
        },
        "keywords": ["song", "sing", "dance", "music", "guitar", "drums"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-pets",
        "title": "Mascotas",
        "category": "kids",
        "seed_prompts": {
            "mini": "Do you have a pet? Dogs go woof! Cats go meow! What animal do you love? What's its name?",
            "junior": "Pets are family! Dogs, cats, hamsters, fish. Tell me about your pet — or the one you wish you had.",
        },
        "keywords": ["dog", "cat", "pet", "soft", "fluffy", "loyal", "play"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": True,
    },
    {
        "slug": "kids-family",
        "title": "Mi familia",
        "category": "kids",
        "seed_prompts": {
            "mini": "Who lives with you? Mom? Dad? Brother? Sister? Tell me one person you love a lot!",
            "junior": "Family is special. Parents, siblings, grandparents, cousins. Tell me about someone in your family — what they do, what's funny about them.",
        },
        "keywords": ["mom", "dad", "brother", "sister", "grandma", "grandpa", "family"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
    {
        "slug": "kids-feels",
        "title": "Cómo me siento",
        "category": "kids",
        "seed_prompts": {
            "mini": "How are you today? Happy? Sad? Tired? Tell me one feeling from today!",
            "junior": "Feelings are important. Happy, sad, angry, scared, excited. Tell me one moment today when you felt strong about something.",
        },
        "keywords": ["happy", "sad", "angry", "scared", "excited", "calm", "tired"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": True,
    },
    {
        "slug": "kids-school",
        "title": "Mi cole",
        "category": "kids",
        "seed_prompts": {
            "mini": "Do you go to school? Who's your teacher? Do you have a friend there? What's their name?",
            "junior": "School day! Classes, friends, lunch, recess. Tell me the best thing that happened at school today — or the funniest.",
        },
        "keywords": ["school", "teacher", "friend", "class", "lunch", "recess", "learn"],
        "levels": ["A0", "A1", "A2"],
        "is_hot": False,
    },
]


# ─── ACHIEVEMENTS / COLECCION ────────────────────────────────────────
# Iconos = nombres de Lucide React (NO emojis Unicode). Colores hex.
ACHIEVEMENTS = [
    # Por completar tópicos
    {"slug": "first-dino", "name": "T-Rex", "description": "Tuviste tu primera charla sobre dinosaurios", "icon_name": "Sparkles", "icon_color": "#00B37E", "threshold": 1, "order": 1},
    {"slug": "first-space", "name": "Cohete", "description": "Hablaste sobre el espacio por primera vez", "icon_name": "Rocket", "icon_color": "#A855F7", "threshold": 1, "order": 2},
    {"slug": "first-sea", "name": "Ballena", "description": "Conociste a los animales del mar", "icon_name": "Fish", "icon_color": "#06B6D4", "threshold": 1, "order": 3},
    {"slug": "first-art", "name": "Paleta", "description": "Hablaste de colores y arte", "icon_name": "Palette", "icon_color": "#FF6AA9", "threshold": 1, "order": 4},
    {"slug": "first-sport", "name": "Pelota", "description": "Charlaste sobre tu deporte favorito", "icon_name": "Trophy", "icon_color": "#FB7C39", "threshold": 1, "order": 5},
    {"slug": "first-music", "name": "Nota musical", "description": "Cantaste y hablaste de música", "icon_name": "Music", "icon_color": "#3B82F6", "threshold": 1, "order": 6},
    {"slug": "first-pets", "name": "Perro fiel", "description": "Hablaste de mascotas", "icon_name": "Dog", "icon_color": "#FACC15", "threshold": 1, "order": 7},
    {"slug": "first-family", "name": "Corazón familia", "description": "Contaste sobre tu familia", "icon_name": "Heart", "icon_color": "#EC4899", "threshold": 1, "order": 8},
    {"slug": "first-feels", "name": "Carita feliz", "description": "Expresaste cómo te sentías", "icon_name": "Smile", "icon_color": "#22D3EE", "threshold": 1, "order": 9},
    {"slug": "first-school", "name": "Mochila", "description": "Contaste sobre el cole", "icon_name": "Backpack", "icon_color": "#7C3AED", "threshold": 1, "order": 10},

    # Por racha
    {"slug": "streak-3", "name": "3 días seguidos", "description": "Tres días en fila hablando con Habi", "icon_name": "Flame", "icon_color": "#FB7C39", "threshold": 3, "order": 20},
    {"slug": "streak-7", "name": "Una semana entera", "description": "Siete días seguidos sin parar", "icon_name": "Flame", "icon_color": "#EF4444", "threshold": 7, "order": 21},
    {"slug": "streak-30", "name": "Un mes completo", "description": "Treinta días seguidos. ¡Increíble!", "icon_name": "Award", "icon_color": "#FACC15", "threshold": 30, "order": 22},

    # Por charlas totales
    {"slug": "talks-10", "name": "10 charlas", "description": "Diez charlas completadas", "icon_name": "Star", "icon_color": "#00B37E", "threshold": 10, "order": 30},
    {"slug": "talks-50", "name": "50 charlas", "description": "Cincuenta charlas. ¡Crack!", "icon_name": "Medal", "icon_color": "#A855F7", "threshold": 50, "order": 31},
    {"slug": "talks-100", "name": "Cien charlas", "description": "Una centena. Sos imparable", "icon_name": "Crown", "icon_color": "#FACC15", "threshold": 100, "order": 32},

    # Por niveles
    {"slug": "rank-explorador", "name": "Explorador", "description": "Subiste a Explorador", "icon_name": "Compass", "icon_color": "#00B37E", "threshold": None, "order": 40},
    {"slug": "rank-aventurero", "name": "Aventurero", "description": "Llegaste a Aventurero", "icon_name": "Mountain", "icon_color": "#06B6D4", "threshold": None, "order": 41},
    {"slug": "rank-capitan", "name": "Capitán", "description": "Sos Capitán de tu idioma", "icon_name": "Anchor", "icon_color": "#3B82F6", "threshold": None, "order": 42},
    {"slug": "rank-embajador", "name": "Embajador", "description": "El nivel más alto. Embajador del idioma.", "icon_name": "Crown", "icon_color": "#FFB800", "threshold": None, "order": 43},

    # Especiales / monstruo del idioma
    {"slug": "monster-catch", "name": "Atrapa-monstruo", "description": "Atrapaste tu primer monstruo del idioma", "icon_name": "Zap", "icon_color": "#EF4444", "threshold": 1, "order": 50},
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # ─── 1. Tutor Friend ──────────────────────────────────────────
        existing = (await db.execute(select(Template).where(Template.slug == FRIEND_TUTOR["slug"]))).scalar_one_or_none()
        if existing:
            for k, v in FRIEND_TUTOR.items():
                if k == "slug":
                    continue
                setattr(existing, k, v)
            print(f"[update] template friend (id={existing.id})")
        else:
            t = Template(**FRIEND_TUTOR)
            db.add(t)
            print(f"[create] template friend")

        # ─── 2. 10 Topicos kids ──────────────────────────────────────
        for cfg in KIDS_TOPICS:
            existing_t = (await db.execute(select(Topic).where(Topic.slug == cfg["slug"]))).scalar_one_or_none()
            if existing_t:
                for k, v in cfg.items():
                    if k == "slug":
                        continue
                    setattr(existing_t, k, v)
                print(f"[update] topic {cfg['slug']} (id={existing_t.id})")
            else:
                t = Topic(**cfg, is_active=True)
                db.add(t)
                print(f"[create] topic {cfg['slug']}")

        # ─── 3. Catalogo Achievements ────────────────────────────────
        for cfg in ACHIEVEMENTS:
            existing_a = (await db.execute(select(AchievementCatalog).where(AchievementCatalog.slug == cfg["slug"]))).scalar_one_or_none()
            if existing_a:
                for k, v in cfg.items():
                    if k == "slug":
                        continue
                    setattr(existing_a, k, v)
                print(f"[update] achievement {cfg['slug']}")
            else:
                a = AchievementCatalog(**cfg, category="kids")
                db.add(a)
                print(f"[create] achievement {cfg['slug']}")

        await db.commit()

        print("\nOK - Seed Kids completo:")
        print(f"  - 1 tutor (friend / Habi)")
        print(f"  - {len(KIDS_TOPICS)} topicos kids")
        print(f"  - {len(ACHIEVEMENTS)} achievements en catalogo")


if __name__ == "__main__":
    asyncio.run(main())
