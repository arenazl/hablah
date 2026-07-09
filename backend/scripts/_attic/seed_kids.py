"""Seed completo del modulo Kids — REEMPLAZA todos los topicos kids existentes.

- Tutor 'friend' (Habi) en templates
- 30 topicos curados (10 por nivel etario):
    mini   (4-7 anios)  = "pantallas y juguetes"
    junior (7-10 anios) = "creadores y coleccionables"
    tween  (10-14 anios) = "preteens, streamers y tendencias"
- Catalogo de achievements/stickers para coleccion
- Niveles narrativos en codigo (Curioso, Explorador, Aventurero, Capitan, Embajador)

IMPORTANTE: zero marcas literales en seed_prompts del LLM (Apple/Google rejection
de apps kids con marcas sin licencia + TTS mispronuncia + LLM inventa). Hablamos
de categorias genericas: "popular streamers" no "MrBeast", "sandbox games" no
"Roblox", "fast food restaurants" no "McDonald's".

Es idempotente: si ya existen, los actualiza por slug. Los topicos kids viejos
se inactivan (is_active=False, category cambia a 'kids-deprecated').
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, update
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
    "voice_id": "EXAVITQu4vr4xnSDxMaL",
    "voice_label": "Sarah (Habi voice)",
    "pedagogy_preset": "ludico",
    "avoid_superlative_questions": True,
    "one_question_per_turn": True,
    "voice_speed": 92,
    "voice_stability": 65,
    "voice_style": 55,
    "icon_bg": "#00B37E",
    "is_preset": True,
    "version": "v1.0",
    "status": "active",
    "response_length": "terse",
    "tutor_talk_ratio": 35,
    "proactive_questions": True,
    "tutor_shares_opinions": True,
    "warmth_level": 5,
    "correction_mode": "recast",
    "correction_focus": ["vocab", "fluency"],
    "error_threshold": "only_major",
    "max_feedback_items": 1,
    "praise_count": 3,
    "report_include_summary": True,
    "report_include_connectors": False,
    "report_include_vocab_suggestions": True,
    "report_include_pronunciation": False,
    "report_include_next_session_tip": False,
    "opening_style": "playful",
    "opening_includes_topic_intro": True,
    "silence_tolerance_ms": 2500,
    "interruption_allowed": False,
    "scaffold_when_stuck": True,
}


# ─── 30 TOPICOS PARA CHICOS ─────────────────────────────────────────
# Mismo schema: keywords y seed_prompts pero sin marcas literales.
# La marca solo aparece en el title (vendible en español) y en el sublabel.
KIDS_TOPICS = [
    # ─── MINI (4-7) ─────────────────────────────────────────────
    {
        "slug": "kids-colors",
        "title": "Mis colores favoritos",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Hi! What's your favorite color? Mine is green! Look around — what's red? What's blue?"},
        "keywords": ["color", "red", "blue", "yellow", "green", "purple", "orange", "pink"],
        "is_hot": False,
    },
    {
        "slug": "kids-animals-farm",
        "title": "Animales de la granja y la selva",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Animals! A cow says moo. A dog says woof. What's your favorite animal? What sound does it make?"},
        "keywords": ["animal", "cow", "dog", "cat", "lion", "elephant", "monkey", "fish"],
        "is_hot": False,
    },
    {
        "slug": "kids-counting",
        "title": "Contar del 1 al 10",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Let's count! One, two, three... how many fingers do you have? Count with me!"},
        "keywords": ["one", "two", "three", "count", "number", "ten"],
        "is_hot": True,
    },
    {
        "slug": "kids-body",
        "title": "Mi cuerpo",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Touch your head! Now your nose. Now your feet. What can you do with your hands?"},
        "keywords": ["head", "nose", "eye", "mouth", "hand", "foot", "leg", "arm"],
        "is_hot": False,
    },
    {
        "slug": "kids-family",
        "title": "Mi familia",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Who lives with you? Mom? Dad? Brother? Sister? Tell me one name!"},
        "keywords": ["mom", "dad", "brother", "sister", "grandma", "grandpa", "family"],
        "is_hot": False,
    },
    {
        "slug": "kids-food-basic",
        "title": "Comidas ricas",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Food time! Do you like apples? Bread? Milk? What did you eat today?"},
        "keywords": ["apple", "bread", "milk", "rice", "egg", "banana", "water", "yummy"],
        "is_hot": False,
    },
    # COMERCIAL — sin marca literal
    {
        "slug": "kids-toy-unboxing",
        "title": "Abrir juguetes",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Imagine you got a big box today. A surprise! What's inside? A toy car? A doll? Tell me what you'd open!"},
        "keywords": ["box", "open", "surprise", "toy", "gift", "new", "wow"],
        "is_hot": True,
    },
    {
        "slug": "kids-cartoons-heroes",
        "title": "Dibujitos y superhéroes",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Do you watch cartoons? Tell me your favorite character! Are they fast? Strong? Funny? Do they fly?"},
        "keywords": ["hero", "fast", "strong", "fly", "save", "funny", "cape", "power"],
        "is_hot": True,
    },
    {
        "slug": "kids-gaming-basic",
        "title": "Jugar en la pantalla",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Do you play games on a tablet or phone? What do you do in the game? Run? Jump? Win?"},
        "keywords": ["play", "jump", "run", "win", "lose", "level", "game", "fun"],
        "is_hot": True,
    },
    {
        "slug": "kids-treats",
        "title": "Comida divertida",
        "kid_age_group": "mini",
        "seed_prompts": {"mini": "Yummy treats! Do you like nuggets? Fries? Burgers? Popcorn? What's your favorite?"},
        "keywords": ["burger", "fries", "nuggets", "popcorn", "candy", "ice cream", "soda"],
        "is_hot": True,
    },

    # ─── JUNIOR (7-10) ──────────────────────────────────────────
    {
        "slug": "kids-school",
        "title": "La escuela",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "School day! Who's your teacher? What's your favorite subject? Tell me one thing that happened today."},
        "keywords": ["school", "teacher", "friend", "class", "lunch", "recess", "homework"],
        "is_hot": False,
    },
    {
        "slug": "kids-routine",
        "title": "Mi día de la mañana a la noche",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Walk me through your day. When do you wake up? Breakfast? School? After school? Bedtime?"},
        "keywords": ["wake up", "breakfast", "lunch", "dinner", "bed", "morning", "night"],
        "is_hot": False,
    },
    {
        "slug": "kids-house",
        "title": "Mi casa y mis habitaciones",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Tell me about your home. How many rooms? Where do you sleep? What's your favorite room and why?"},
        "keywords": ["room", "kitchen", "bathroom", "bedroom", "house", "garden", "stairs"],
        "is_hot": False,
    },
    {
        "slug": "kids-hobbies",
        "title": "Pasatiempos y deportes",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "What do you do after school? Sports? Music? Drawing? Tell me what you love doing the most."},
        "keywords": ["soccer", "basketball", "draw", "music", "play", "swim", "dance", "read"],
        "is_hot": False,
    },
    {
        "slug": "kids-emotions",
        "title": "Cómo me siento",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "How are you feeling today? Tell me one moment when you felt really happy. Or a moment when something bothered you."},
        "keywords": ["happy", "sad", "angry", "scared", "excited", "calm", "tired", "proud"],
        "is_hot": True,
    },
    {
        "slug": "kids-nature",
        "title": "Naturaleza y dinosaurios",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Nature is amazing! Forests, oceans, mountains, dinosaurs, jungles. Tell me what fascinates you most."},
        "keywords": ["forest", "ocean", "mountain", "dinosaur", "jungle", "tree", "river"],
        "is_hot": False,
    },
    # COMERCIAL — genéricos sin marcas
    {
        "slug": "kids-youtube-challenges",
        "title": "Desafíos virales",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "If you had a YouTube channel, what challenge would you create? Eating something weird? A prank? A reaction? Tell me!"},
        "keywords": ["challenge", "subscriber", "viral", "reaction", "prank", "video", "thumbnail"],
        "is_hot": True,
    },
    {
        "slug": "kids-sandbox-worlds",
        "title": "Mundos de bloques",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Imagine you can build any world with blocks. What would you build? A house? A castle? An entire city?"},
        "keywords": ["build", "block", "craft", "mine", "create", "server", "world"],
        "is_hot": True,
    },
    {
        "slug": "kids-collecting",
        "title": "Coleccionar cartas y figuritas",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Do you collect anything? Cards? Stickers? Figures? What's the rarest one you have? Would you trade it?"},
        "keywords": ["collection", "trade", "rare", "common", "card", "figure", "swap"],
        "is_hot": True,
    },
    {
        "slug": "kids-fast-food",
        "title": "Comida rápida y dulces",
        "kid_age_group": "junior",
        "seed_prompts": {"junior": "Imagine you're ordering at a fast food place. What combo do you want? Burger? Fries? Soda? Ice cream after?"},
        "keywords": ["combo", "burger", "fries", "soda", "ice cream", "menu", "order"],
        "is_hot": True,
    },

    # ─── TWEEN (10-14) ──────────────────────────────────────────
    {
        "slug": "kids-entertainment",
        "title": "Música, pelis y series",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "What music do you listen to? What's the last series you binged? Any movie you've watched ten times?"},
        "keywords": ["song", "movie", "series", "binge", "favorite", "playlist", "actor"],
        "is_hot": False,
    },
    {
        "slug": "kids-travel",
        "title": "Viajes y culturas",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "If you could go anywhere tomorrow, where? What's a country you want to visit one day and why?"},
        "keywords": ["travel", "country", "culture", "language", "city", "trip", "passport"],
        "is_hot": False,
    },
    {
        "slug": "kids-future-jobs",
        "title": "Trabajos del futuro",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "What do you want to be when you grow up? It can be anything — even a job that doesn't exist yet."},
        "keywords": ["job", "career", "engineer", "designer", "scientist", "creator", "future"],
        "is_hot": False,
    },
    {
        "slug": "kids-cooking",
        "title": "Cocinar y recetas",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Have you ever cooked something? Walk me through a recipe — even a simple sandwich counts!"},
        "keywords": ["recipe", "cook", "bake", "ingredient", "taste", "sweet", "salty"],
        "is_hot": False,
    },
    {
        "slug": "kids-planet",
        "title": "Cuidar el planeta",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "What worries you about the planet? Pollution? Animals? Climate? What's one small thing you do that helps?"},
        "keywords": ["recycle", "pollution", "climate", "ocean", "plastic", "animal", "future"],
        "is_hot": False,
    },
    {
        "slug": "kids-opinions",
        "title": "Decir lo que pensás",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Give me your honest opinion: is school useful? Do you agree with screen time limits? Why?"},
        "keywords": ["think", "agree", "disagree", "opinion", "because", "however", "feel"],
        "is_hot": False,
    },
    # COMERCIAL — genéricos sin marcas
    {
        "slug": "kids-streaming",
        "title": "Streamers y transmisiones",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Do you watch live streamers? What makes a streamer fun? The game? The chat? The community? Would you stream?"},
        "keywords": ["live", "stream", "chat", "follow", "donate", "clip", "subscriber", "community"],
        "is_hot": True,
    },
    {
        "slug": "kids-sneakers",
        "title": "Zapatillas y moda urbana",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Are you into sneakers or streetwear? What's the best pair you own? What would you save up for?"},
        "keywords": ["sneakers", "drop", "limited", "outfit", "style", "fit", "brand"],
        "is_hot": True,
    },
    {
        "slug": "kids-esports",
        "title": "Gaming pro y esports",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Do you follow any pro gaming teams? What game do you play competitively? What rank are you?"},
        "keywords": ["team", "tournament", "rank", "pro", "competitive", "strategy", "win"],
        "is_hot": True,
    },
    {
        "slug": "kids-slang",
        "title": "Slang y tendencias online",
        "kid_age_group": "tween",
        "seed_prompts": {"tween": "Teach me a slang word you and your friends use. What does it mean? Use it in a sentence!"},
        "keywords": ["slang", "trend", "vibe", "hype", "flex", "cringe", "cap", "lit"],
        "is_hot": True,
    },
]


# ─── ACHIEVEMENTS / COLECCION ────────────────────────────────────────
ACHIEVEMENTS = [
    # Por edad/nivel
    {"slug": "first-mini", "name": "Primer paso Mini", "description": "Tu primera charla siendo Mini", "icon_name": "Sparkles", "icon_color": "#00B37E", "threshold": 1, "order": 1},
    {"slug": "first-junior", "name": "Primer paso Junior", "description": "Tu primera charla siendo Junior", "icon_name": "Sparkles", "icon_color": "#3B82F6", "threshold": 1, "order": 2},
    {"slug": "first-tween", "name": "Primer paso Tween", "description": "Tu primera charla siendo Tween", "icon_name": "Sparkles", "icon_color": "#A855F7", "threshold": 1, "order": 3},

    # Por categoría temática
    {"slug": "ach-colors", "name": "Maestro del color", "description": "Hablaste de colores", "icon_name": "Palette", "icon_color": "#EC4899", "threshold": 1, "order": 10},
    {"slug": "ach-animals", "name": "Amigo de los animales", "description": "Hablaste de animales", "icon_name": "Bird", "icon_color": "#22C55E", "threshold": 1, "order": 11},
    {"slug": "ach-counting", "name": "Buen matemático", "description": "Aprendiste a contar", "icon_name": "Hash", "icon_color": "#FACC15", "threshold": 1, "order": 12},
    {"slug": "ach-cartoons", "name": "Fan de los dibujitos", "description": "Charlaste sobre tus personajes", "icon_name": "Smile", "icon_color": "#FF6AA9", "threshold": 1, "order": 13},
    {"slug": "ach-toys", "name": "Abrir-cajas", "description": "Te metiste con el mundo de los juguetes", "icon_name": "Package", "icon_color": "#FB7C39", "threshold": 1, "order": 14},
    {"slug": "ach-gaming", "name": "Gamer junior", "description": "Hablaste de tu juego favorito", "icon_name": "Gamepad2", "icon_color": "#7C3AED", "threshold": 1, "order": 15},
    {"slug": "ach-treats", "name": "Goloso", "description": "Pediste comida rica en inglés", "icon_name": "IceCream", "icon_color": "#F472B6", "threshold": 1, "order": 16},
    {"slug": "ach-school", "name": "Buen alumno", "description": "Contaste sobre el cole", "icon_name": "Backpack", "icon_color": "#7C3AED", "threshold": 1, "order": 17},
    {"slug": "ach-collector", "name": "Coleccionista", "description": "Hablaste sobre tu colección", "icon_name": "Trophy", "icon_color": "#FACC15", "threshold": 1, "order": 18},
    {"slug": "ach-creator", "name": "Creador de contenido", "description": "Imaginaste tu canal/desafío", "icon_name": "Video", "icon_color": "#EF4444", "threshold": 1, "order": 19},
    {"slug": "ach-sandbox", "name": "Constructor", "description": "Diseñaste mundos en bloques", "icon_name": "Box", "icon_color": "#10B981", "threshold": 1, "order": 20},
    {"slug": "ach-streamer", "name": "Conectado en vivo", "description": "Charlaste sobre streaming", "icon_name": "Radio", "icon_color": "#A855F7", "threshold": 1, "order": 21},
    {"slug": "ach-sneakers", "name": "Sneakerhead", "description": "Hablaste de zapatillas", "icon_name": "Footprints", "icon_color": "#06B6D4", "threshold": 1, "order": 22},
    {"slug": "ach-esports", "name": "Esports pro", "description": "Contaste sobre gaming competitivo", "icon_name": "Crosshair", "icon_color": "#FF4D6D", "threshold": 1, "order": 23},
    {"slug": "ach-slang", "name": "Vibe-master", "description": "Enseñaste slang nuevo", "icon_name": "MessageCircle", "icon_color": "#22D3EE", "threshold": 1, "order": 24},

    # Por racha
    {"slug": "streak-3", "name": "3 días seguidos", "description": "Tres días en fila hablando con Habi", "icon_name": "Flame", "icon_color": "#FB7C39", "threshold": 3, "order": 30},
    {"slug": "streak-7", "name": "Una semana entera", "description": "Siete días seguidos sin parar", "icon_name": "Flame", "icon_color": "#EF4444", "threshold": 7, "order": 31},
    {"slug": "streak-30", "name": "Un mes completo", "description": "Treinta días seguidos", "icon_name": "Award", "icon_color": "#FACC15", "threshold": 30, "order": 32},

    # Por charlas totales
    {"slug": "talks-10", "name": "10 charlas", "description": "Diez charlas completadas", "icon_name": "Star", "icon_color": "#00B37E", "threshold": 10, "order": 40},
    {"slug": "talks-50", "name": "50 charlas", "description": "Cincuenta charlas. ¡Crack!", "icon_name": "Medal", "icon_color": "#A855F7", "threshold": 50, "order": 41},
    {"slug": "talks-100", "name": "Cien charlas", "description": "Una centena", "icon_name": "Crown", "icon_color": "#FACC15", "threshold": 100, "order": 42},

    # Por niveles narrativos
    {"slug": "rank-explorador", "name": "Explorador", "description": "Subiste a Explorador", "icon_name": "Compass", "icon_color": "#00B37E", "threshold": None, "order": 50},
    {"slug": "rank-aventurero", "name": "Aventurero", "description": "Llegaste a Aventurero", "icon_name": "Mountain", "icon_color": "#06B6D4", "threshold": None, "order": 51},
    {"slug": "rank-capitan", "name": "Capitán", "description": "Sos Capitán de tu idioma", "icon_name": "Anchor", "icon_color": "#3B82F6", "threshold": None, "order": 52},
    {"slug": "rank-embajador", "name": "Embajador", "description": "El nivel más alto", "icon_name": "Crown", "icon_color": "#FFB800", "threshold": None, "order": 53},

    # Especiales
    {"slug": "monster-catch", "name": "Atrapa-monstruo", "description": "Atrapaste tu primer monstruo del idioma", "icon_name": "Zap", "icon_color": "#EF4444", "threshold": 1, "order": 60},
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # ─── 0. Inactivar topicos kids viejos (con slug antiguo) ────
        old_slugs = ["kids-dinos", "kids-space", "kids-sea", "kids-sport", "kids-art",
                     "kids-music", "kids-pets", "kids-family", "kids-feels", "kids-school"]
        # ojo: kids-family y kids-school siguen vigentes en lista nueva pero con otra edad
        new_slugs = {t["slug"] for t in KIDS_TOPICS}
        to_deprecate = [s for s in old_slugs if s not in new_slugs]
        if to_deprecate:
            await db.execute(
                update(Topic)
                .where(Topic.slug.in_(to_deprecate))
                .values(category="kids-deprecated", is_active=False, kid_age_group=None)
            )
            print(f"[deprecate] {len(to_deprecate)} topicos kids viejos inactivados: {', '.join(to_deprecate)}")

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

        # ─── 2. 30 Topicos kids ──────────────────────────────────────
        for cfg in KIDS_TOPICS:
            existing_t = (await db.execute(select(Topic).where(Topic.slug == cfg["slug"]))).scalar_one_or_none()
            full_cfg = {
                **cfg,
                "category": "kids",
                "is_active": True,
                "levels": ["A0", "A1", "A2"],
            }
            if existing_t:
                for k, v in full_cfg.items():
                    if k == "slug":
                        continue
                    setattr(existing_t, k, v)
                print(f"[update] topic {cfg['slug']} ({cfg['kid_age_group']})")
            else:
                t = Topic(**full_cfg)
                db.add(t)
                print(f"[create] topic {cfg['slug']} ({cfg['kid_age_group']})")

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

        # contar topicos por nivel
        mini_count = sum(1 for t in KIDS_TOPICS if t["kid_age_group"] == "mini")
        junior_count = sum(1 for t in KIDS_TOPICS if t["kid_age_group"] == "junior")
        tween_count = sum(1 for t in KIDS_TOPICS if t["kid_age_group"] == "tween")

        print("\nOK - Seed Kids completo:")
        print(f"  - 1 tutor (friend / Habi)")
        print(f"  - {len(KIDS_TOPICS)} topicos kids: {mini_count} mini + {junior_count} junior + {tween_count} tween")
        print(f"  - {len(ACHIEVEMENTS)} achievements en catalogo")


if __name__ == "__main__":
    asyncio.run(main())
