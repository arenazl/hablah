"""Banco de tópicos curados para los 12 orbs del onboarding.

Cada categoría tiene 8 tópicos progresivos: de los más simples y universales
a los más abstractos. Todos los seed_prompts están en castellano (es) — el
super_prompt builder los adapta al target_language del user y al CEFR
correspondiente.

Cuando un user toca un tópico en el onboarding, agregamos como interest
ese tópico Y los hermanos de la misma categoría (auto-assign).

Idempotente: si ya existen por slug, se actualizan; si no, se crean.
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


# Cada tópico:
#   slug:        identificador único url-safe
#   title:       título visible en castellano
#   category:    slug de la categoría del orb (musica, peliculas, etc.)
#   keywords:    8-12 palabras útiles en INGLÉS (idioma objetivo más común)
#   seed_prompt: instrucción específica para el tutor sobre cómo arrancar
#                la charla. Se interpola en super_prompt y el LLM ajusta
#                al CEFR del alumno automáticamente.
CURATED_TOPICS: list[dict] = [
    # ═══════════════ MÚSICA ═══════════════
    {
        "slug": "musica-mi-banda-favorita",
        "title": "Mi banda favorita",
        "category": "musica",
        "keywords": ["band", "favorite", "discover", "lyrics", "album", "concert", "genre", "vibe", "lead singer", "groove"],
        "seed_prompt": "El alumno va a contar sobre su banda o artista favorito. Empezá preguntando '¿Cuál es esa banda que volverías a ver mil veces? ¿Cómo la descubriste?'. Pedile que describa el sonido, qué le hace sentir, y un momento específico que escuchó una de sus canciones.",
    },
    {
        "slug": "musica-conciertos-marcaron",
        "title": "Conciertos que me marcaron",
        "category": "musica",
        "keywords": ["concert", "live", "crowd", "venue", "encore", "energy", "setlist", "goosebumps", "headlining", "mosh pit"],
        "seed_prompt": "Charla sobre el primer concierto del alumno o el más memorable. Preguntá cuándo fue, con quién fue, qué sintió cuando salió la banda al escenario. Buscá que use palabras como 'crowd', 'energy', 'lights'.",
    },
    {
        "slug": "musica-para-entrenar",
        "title": "Música para entrenar",
        "category": "musica",
        "keywords": ["workout", "playlist", "beat", "pump up", "tempo", "motivation", "headphones", "running", "bpm", "energy"],
        "seed_prompt": "Vocabulario práctico: música como herramienta. Preguntá qué playlist usa para entrenar, correr, o concentrarse. Pedile que diga 3 canciones específicas y por qué cada una.",
    },
    {
        "slug": "musica-aprender-instrumento",
        "title": "Aprender un instrumento",
        "category": "musica",
        "keywords": ["instrument", "practice", "chords", "scales", "lesson", "self-taught", "frustrating", "progress", "tuning", "rhythm"],
        "seed_prompt": "¿Alguna vez intentó aprender un instrumento? Si sí, contarlo: cuál, cuánto duró, qué tan lejos llegó. Si no, cuál le gustaría aprender y por qué. Practicá past simple y vocabulario de proceso.",
    },
    {
        "slug": "musica-generos-descubri",
        "title": "Géneros que descubrí",
        "category": "musica",
        "keywords": ["genre", "underground", "mainstream", "scene", "fusion", "subgenre", "introduce", "open up", "click", "hooked"],
        "seed_prompt": "Géneros nuevos en su vida. Preguntá si hay algún género al que llegó tarde o por accidente. Cómo cambió su gusto musical en los últimos 5 años. Buscá conectores: 'although', 'until I heard', 'eventually'.",
    },
    {
        "slug": "musica-album-critica",
        "title": "Un álbum entero, no playlists",
        "category": "musica",
        "keywords": ["album", "track", "intro", "outro", "concept", "filler", "skip", "narrative", "produced", "remastered"],
        "seed_prompt": "Análisis: la diferencia entre escuchar un álbum completo vs. tirar shuffle. Preguntá si tiene un álbum del primer-track-al-último que le parezca obra maestra. Vocabulario de estructura.",
    },
    {
        "slug": "musica-emociones",
        "title": "Música y emociones",
        "category": "musica",
        "keywords": ["mood", "nostalgia", "tear", "soundtrack of my life", "evoke", "associate", "trigger", "comfort", "anthem", "vulnerable"],
        "seed_prompt": "Charla más íntima: qué canción lo hace llorar, cuál lo lleva instantáneo a un recuerdo, qué le pone a las 3am cuando no puede dormir. Empujá vocabulario emocional ('nostalgic', 'overwhelming', 'cathartic').",
    },
    {
        "slug": "musica-industria-streaming",
        "title": "Streaming vs comprar música",
        "category": "musica",
        "keywords": ["streaming", "royalties", "artist payment", "subscription", "vinyl revival", "ownership", "playlist economy", "discovery", "algorithm", "indie"],
        "seed_prompt": "Debate: ¿el streaming arruinó a la música o la democratizó? Cómo cambiaron los hábitos del alumno. Si tiene vinilos o si compra música. Vocabulario de industria.",
    },

    # ═══════════════ PELÍCULAS Y SERIES ═══════════════
    {
        "slug": "peliculas-mi-favorita",
        "title": "Una peli que me marcó",
        "category": "peliculas",
        "keywords": ["movie", "favorite", "plot", "twist", "character", "scene", "ending", "watch again", "director", "feels"],
        "seed_prompt": "El alumno va a contar de UNA película que le dejó algo. No 'qué pasa' — sino cómo se sintió. Preguntá qué escena se le quedó. Practicar past simple narrativo.",
    },
    {
        "slug": "peliculas-serie-maraton",
        "title": "Una serie que no pude parar",
        "category": "peliculas",
        "keywords": ["binge", "episode", "cliffhanger", "marathon", "season finale", "spin-off", "addictive", "hooked", "weekend", "Netflix"],
        "seed_prompt": "Charla sobre 'binge watching'. ¿Cuándo fue la última vez que vio una serie entera en 2-3 días? Cuál y por qué. Vocabulario de streaming.",
    },
    {
        "slug": "peliculas-personajes",
        "title": "Personajes inolvidables",
        "category": "peliculas",
        "keywords": ["character", "antihero", "villain", "develop", "arc", "iconic", "relate", "memorable", "well-written", "complex"],
        "seed_prompt": "Hablar de UN personaje (no la película entera) que sentís que conocés. ¿Quién? ¿Por qué te conectaste con él/ella? Empujá adjetivos descriptivos profundos.",
    },
    {
        "slug": "peliculas-libro-vs-pelicula",
        "title": "Libro vs película",
        "category": "peliculas",
        "keywords": ["adaptation", "loyal", "miss the point", "casting", "purist", "skip", "expand", "abridge", "true to", "imagination"],
        "seed_prompt": "Adaptaciones: alguna vez leíste el libro PRIMERO y después viste la película. Cómo te decepcionó o sorprendió. Practicar comparaciones complejas.",
    },
    {
        "slug": "peliculas-spoilers",
        "title": "Spoilers y cómo manejarlos",
        "category": "peliculas",
        "keywords": ["spoiler", "twist", "trigger warning", "reveal", "social media", "tag", "blocking", "watch on time", "deadline", "petty"],
        "seed_prompt": "Tema cotidiano: cuándo es válido contar un spoiler. ¿El alumno se enojó alguna vez? Tiene reglas con sus amigos. Vocabulario informal y opiniones.",
    },
    {
        "slug": "peliculas-cine-streaming",
        "title": "Cine vs streaming en casa",
        "category": "peliculas",
        "keywords": ["cinema", "theater", "release", "experience", "couch", "popcorn", "pause", "convenience", "premiere", "shared"],
        "seed_prompt": "Ya casi nadie va al cine. ¿El alumno sí? ¿Para qué pelis? Comparar la experiencia. Practicar comparativos y preferencias.",
    },
    {
        "slug": "peliculas-generos",
        "title": "Géneros que evito y por qué",
        "category": "peliculas",
        "keywords": ["genre", "horror", "drama", "romcom", "thriller", "documentary", "skip", "can't stand", "guilty pleasure", "depending on mood"],
        "seed_prompt": "Géneros: cuáles ama, cuáles odia, cuáles considera 'guilty pleasure'. ¿Hay alguno que NUNCA mira? Por qué.",
    },
    {
        "slug": "peliculas-premios-criticos",
        "title": "Premios y críticos: ¿importan?",
        "category": "peliculas",
        "keywords": ["Oscar", "award", "critic", "ratings", "overrated", "underrated", "elitist", "popular vote", "campaign", "snub"],
        "seed_prompt": "Debate: ¿el Oscar significa algo? ¿Hay una peli ganadora que le pareció sobrevalorada? Y una que perdió que merecía. Vocabulario de juicio crítico.",
    },

    # ═══════════════ DEPORTES ═══════════════
    {
        "slug": "deportes-mi-deporte",
        "title": "Mi deporte favorito",
        "category": "deportes",
        "keywords": ["sport", "play", "watch", "team", "league", "rookie", "veteran", "rivalry", "championship", "fan"],
        "seed_prompt": "Cuál es su deporte: para mirar, para practicar, o ambos. Cómo empezó. Frecuencia. Vocabulario de actividad recurrente.",
    },
    {
        "slug": "deportes-equipo",
        "title": "Mi equipo y sus rivales",
        "category": "deportes",
        "keywords": ["team", "rival", "fan base", "derby", "home", "away", "supporter", "trophy", "manager", "transfer"],
        "seed_prompt": "Equipo del corazón. Por qué ese (familia, ciudad, momento). Quién es el clásico rival. Anécdota del último partido visto en vivo.",
    },
    {
        "slug": "deportes-partido-inolvidable",
        "title": "Un partido inolvidable",
        "category": "deportes",
        "keywords": ["match", "comeback", "extra time", "penalty", "underdog", "final whistle", "screaming", "tear", "miracle", "epic"],
        "seed_prompt": "Narrativa: un partido específico. Año, qué pasaba, quién jugaba. Empujá past continuous + past simple ('I was watching when...').",
    },
    {
        "slug": "deportes-idolos",
        "title": "Ídolos del deporte",
        "category": "deportes",
        "keywords": ["idol", "GOAT", "legend", "career", "retire", "comeback", "humble", "scandal", "off-field", "role model"],
        "seed_prompt": "Quién es el GOAT del deporte para el alumno. ¿Por qué? ¿Hay deportistas que admira fuera del juego también? Vocabulario de carrera.",
    },
    {
        "slug": "deportes-practicar-mirar",
        "title": "Hacer deporte vs mirarlo",
        "category": "deportes",
        "keywords": ["practice", "play", "spectator", "couch", "active", "watching", "season ticket", "weekend warrior", "amateur", "casual"],
        "seed_prompt": "¿El alumno es más espectador o practicante? Cómo cambió eso con la edad. Vocabulario de identidad ('I'm more of a...').",
    },
    {
        "slug": "deportes-reglas-raras",
        "title": "Reglas raras o injustas",
        "category": "deportes",
        "keywords": ["rule", "controversial", "VAR", "offside", "penalty", "interpretation", "old-school", "modernize", "fair", "ambiguous"],
        "seed_prompt": "Hay reglas que generan polémica en cada deporte. ¿Hay alguna que el alumno cambiaría? Por qué. Debate liviano.",
    },
    {
        "slug": "deportes-doping",
        "title": "Doping y ética",
        "category": "deportes",
        "keywords": ["doping", "performance enhancer", "ban", "test", "scandal", "level playing field", "cheat", "second chance", "asterisk", "tarnish"],
        "seed_prompt": "Atletas que cayeron por doping. ¿Es siempre trampa? ¿Y los casos médicos? Debate más complejo. Vocabulario ético.",
    },
    {
        "slug": "deportes-negocio",
        "title": "El negocio del deporte",
        "category": "deportes",
        "keywords": ["salary", "contract", "transfer fee", "sponsor", "merchandise", "broadcasting rights", "monopoly", "billionaire", "club owner", "Super League"],
        "seed_prompt": "Sueldos millonarios, equipos de jeques, ligas cerradas. ¿Está rota la economía del deporte? Charla más analítica.",
    },

    # ═══════════════ VIDEOJUEGOS ═══════════════
    {
        "slug": "videojuegos-juego-momento",
        "title": "El juego del momento",
        "category": "videojuegos",
        "keywords": ["game", "playthrough", "addicting", "save", "level up", "grinding", "free time", "weekend", "release", "downloaded"],
        "seed_prompt": "Qué está jugando AHORA o lo último que jugó intenso. Cuántas horas le metió. Si lo terminó o lo dejó.",
    },
    {
        "slug": "videojuegos-consolas",
        "title": "Console wars",
        "category": "videojuegos",
        "keywords": ["console", "PC", "controller", "exclusive", "platform", "loyal", "switch", "specs", "graphics", "load time"],
        "seed_prompt": "¿PlayStation, Xbox, Switch, PC? Por qué. ¿Cambió de equipo alguna vez? Vocabulario comparativo + opinión.",
    },
    {
        "slug": "videojuegos-multiplayer",
        "title": "Jugar con amigos online",
        "category": "videojuegos",
        "keywords": ["multiplayer", "co-op", "voice chat", "lobby", "lag", "toxic", "squad", "match", "queue", "ranked"],
        "seed_prompt": "¿Juega online? ¿Con desconocidos o con amigos del trabajo/colegio? Vocabulario social digital.",
    },
    {
        "slug": "videojuegos-speedruns",
        "title": "Speedruns y secretos",
        "category": "videojuegos",
        "keywords": ["speedrun", "world record", "glitch", "skip", "any%", "100%", "frame-perfect", "RNG", "category", "tutorial"],
        "seed_prompt": "¿Vio alguna vez un speedrun en YouTube? Esa gente que termina Zelda en 25 minutos. Charla sobre obsesión + comunidad.",
    },
    {
        "slug": "videojuegos-indie",
        "title": "Indies vs AAA",
        "category": "videojuegos",
        "keywords": ["indie", "AAA", "studio", "budget", "creative", "polished", "cookie cutter", "passion project", "Steam", "kickstarter"],
        "seed_prompt": "Juegos chicos hechos por 1-2 personas vs juegos de 200M de presupuesto. ¿Le interesa la escena indie? Vocabulario de producción.",
    },
    {
        "slug": "videojuegos-historias",
        "title": "Historias en videojuegos",
        "category": "videojuegos",
        "keywords": ["narrative", "story-driven", "RPG", "choice", "ending", "writing", "cutscene", "voice acting", "Last of Us", "Red Dead"],
        "seed_prompt": "Hay juegos donde la historia te marca. ¿Alguna lo hizo llorar? ¿O que los personajes le importaron más que en una peli?",
    },
    {
        "slug": "videojuegos-esports",
        "title": "Esports: ¿deporte real?",
        "category": "videojuegos",
        "keywords": ["esports", "pro player", "tournament", "League of Legends", "stream", "twitch", "prize pool", "team house", "burnout", "viewer"],
        "seed_prompt": "Carreras pro de jugadores. Mirá tournaments. ¿Esto es deporte o no? Tema controversial. Debate.",
    },
    {
        "slug": "videojuegos-arte",
        "title": "Videojuegos como arte",
        "category": "videojuegos",
        "keywords": ["medium", "expression", "interactive", "agency", "art form", "respected", "Roger Ebert", "validation", "museum", "MoMA"],
        "seed_prompt": "Debate: el cine es arte, los libros son arte, ¿los videojuegos también? Si sí, cuál sería el 'Citizen Kane' de los juegos. Charla intelectual.",
    },

    # ═══════════════ COMIDA ═══════════════
    {
        "slug": "comida-mi-favorita",
        "title": "Mi comida favorita",
        "category": "comida",
        "keywords": ["food", "dish", "favorite", "taste", "smell", "homemade", "craving", "guilty", "ritual", "leftover"],
        "seed_prompt": "Plato favorito (no genérico — uno específico). Quién lo cocina mejor en su familia. Cuándo lo come usualmente.",
    },
    {
        "slug": "comida-cocinar-casa",
        "title": "Cocinar en casa",
        "category": "comida",
        "keywords": ["cook", "kitchen", "ingredient", "recipe", "stove", "oven", "burn", "season", "taste", "garnish"],
        "seed_prompt": "¿Cocina o no? Si sí, qué tan a menudo y qué le sale bien. Si no, por qué (tiempo, miedo, no le interesa). Vocabulario de cocina.",
    },
    {
        "slug": "comida-receta-aprendi",
        "title": "Una receta que aprendí",
        "category": "comida",
        "keywords": ["recipe", "learn", "grandmother", "YouTube", "step", "mistake", "improve", "tweak", "secret ingredient", "from scratch"],
        "seed_prompt": "Receta que dominó: de quién la aprendió, cuántas veces salió mal antes de salir bien. Past simple narrativo + secuencia.",
    },
    {
        "slug": "comida-restaurantes",
        "title": "Restaurantes memorables",
        "category": "comida",
        "keywords": ["restaurant", "reservation", "waiter", "tasting menu", "service", "atmosphere", "splurge", "anniversary", "hidden gem", "Michelin"],
        "seed_prompt": "El mejor restaurante donde comió. Por qué. Lo que pidió. Si fue caro y si valió la pena. Vocabulario de experiencia gastronómica.",
    },
    {
        "slug": "comida-tipica-pais",
        "title": "Comida típica de mi país",
        "category": "comida",
        "keywords": ["traditional", "national dish", "regional", "comfort food", "Sunday lunch", "festival", "explain", "weird", "proud", "missing"],
        "seed_prompt": "Cómo le explica a un extranjero qué comer si visita su país. Plato no obvio + plato turístico. Vocabulario cultural.",
    },
    {
        "slug": "comida-dietas",
        "title": "Dietas y modas",
        "category": "comida",
        "keywords": ["diet", "keto", "vegan", "intermittent fasting", "fad", "stick to", "fall off", "results", "sustainable", "lifestyle"],
        "seed_prompt": "¿Hizo alguna dieta? ¿Le funcionó? ¿Qué piensa de las modas (keto, ayuno, vegano)? Vocabulario de hábito.",
    },
    {
        "slug": "comida-cocinar-otros",
        "title": "Cocinar para otros",
        "category": "comida",
        "keywords": ["host", "guest", "dinner party", "impress", "show off", "stress", "dietary restriction", "potluck", "menu", "presentation"],
        "seed_prompt": "Cocinar para alguien (pareja, familia, amigos). El stress, las restricciones, la presentación. Anécdota de algo que salió mal.",
    },
    {
        "slug": "comida-sostenibilidad",
        "title": "Sostenibilidad y comida",
        "category": "comida",
        "keywords": ["sustainable", "local", "seasonal", "carbon footprint", "waste", "leftovers", "compost", "lab meat", "future", "industrial"],
        "seed_prompt": "Carne de laboratorio, comer local, desperdicio. ¿Cambió hábitos por sostenibilidad? Vocabulario más técnico.",
    },

    # ═══════════════ ANIMALES ═══════════════
    {
        "slug": "animales-mi-mascota",
        "title": "Mi mascota",
        "category": "animales",
        "keywords": ["pet", "dog", "cat", "adopt", "rescue", "habits", "personality", "leash", "vet", "groom"],
        "seed_prompt": "Tiene mascota o tuvo. Nombre, edad, raza. Personalidad. Una manía o cosa rara que hace. Vocabulario afectivo.",
    },
    {
        "slug": "animales-raros",
        "title": "Animales raros que existen",
        "category": "animales",
        "keywords": ["bizarre", "deep sea", "platypus", "axolotl", "blobfish", "documentary", "evolve", "adapt", "creepy", "fascinating"],
        "seed_prompt": "Vió algún animal en un documental que le parezca de otro planeta. Pulpo, axolotl, platypus. ¿Cuál más raro?",
    },
    {
        "slug": "animales-tener-mascota",
        "title": "Tener mascota: ¿sí o no?",
        "category": "animales",
        "keywords": ["responsibility", "commitment", "lifestyle", "lonely", "allergic", "expensive", "cost", "travel", "freedom", "fulfillment"],
        "seed_prompt": "Debate suave: ¿es para todo el mundo? Costo, tiempo, viajes. ¿Por qué decidió tener (o no tener)?",
    },
    {
        "slug": "animales-peligro-extincion",
        "title": "Animales en peligro",
        "category": "animales",
        "keywords": ["endangered", "extinct", "habitat", "conservation", "poaching", "captivity", "WWF", "tiger", "polar bear", "save"],
        "seed_prompt": "Especies en peligro. ¿Qué le importa? ¿Le interesan iniciativas tipo WWF? Vocabulario ecológico.",
    },
    {
        "slug": "animales-inteligencia",
        "title": "Inteligencia animal",
        "category": "animales",
        "keywords": ["smart", "octopus", "crow", "consciousness", "tool use", "language", "mirror test", "emotion", "underestimate", "research"],
        "seed_prompt": "Pulpos resolviendo puzzles, cuervos usando herramientas. ¿Qué animal lo sorprende? Tema más reflexivo.",
    },
    {
        "slug": "animales-exoticos",
        "title": "Mascotas exóticas: ¿está bien?",
        "category": "animales",
        "keywords": ["exotic", "legal", "illegal", "smuggle", "snake", "reptile", "captivity", "natural habitat", "specialized", "regret"],
        "seed_prompt": "Gente que tiene serpientes, monos, hasta tigres. ¿Está bien? ¿Dónde está la línea entre 'rara pero ok' y 'maltrato'?",
    },
    {
        "slug": "animales-bienestar",
        "title": "Bienestar animal",
        "category": "animales",
        "keywords": ["welfare", "factory farm", "free range", "cage", "cruelty-free", "humane", "label", "regulation", "activism", "hypocrisy"],
        "seed_prompt": "Cría industrial, etiquetas 'cage free', vegan por ética. ¿Cambió hábitos? ¿Le importa? Debate ético.",
    },
    {
        "slug": "animales-ciencia",
        "title": "Animales en la ciencia",
        "category": "animales",
        "keywords": ["research", "lab animal", "trial", "ethics", "necessary evil", "alternative", "mice", "primates", "regulation", "cosmetic testing"],
        "seed_prompt": "Investigación con animales: ¿necesario o cruel? ¿Dónde está la línea? Tema controversial. Vocabulario académico.",
    },

    # ═══════════════ VIAJES ═══════════════
    {
        "slug": "viajes-ultimo-viaje",
        "title": "Mi último viaje",
        "category": "viajes",
        "keywords": ["trip", "destination", "highlight", "weather", "local", "flight", "hotel", "Airbnb", "Itinerary", "memorable"],
        "seed_prompt": "Último viaje (cerca o lejos). A dónde, con quién, qué hicieron. Lo mejor y lo peor. Past simple narrativo.",
    },
    {
        "slug": "viajes-sonado",
        "title": "Mi viaje soñado",
        "category": "viajes",
        "keywords": ["dream", "bucket list", "someday", "save up", "plan", "destination", "Japan", "patagonia", "northern lights", "research"],
        "seed_prompt": "El viaje que SUEÑA pero todavía no hizo. Adónde, por qué, qué lo está frenando (plata, tiempo, miedo). Futuro condicional.",
    },
    {
        "slug": "viajes-aeropuertos",
        "title": "Anécdotas de aeropuertos",
        "category": "viajes",
        "keywords": ["airport", "layover", "delay", "lost luggage", "boarding", "gate change", "TSA", "lounge", "miss the flight", "miracle"],
        "seed_prompt": "Cosa rara o caótica en un aeropuerto. Vuelo perdido, equipaje desaparecido, hijo que se escapó. Anécdota.",
    },
    {
        "slug": "viajes-mochilero",
        "title": "Mochilero vs hotel",
        "category": "viajes",
        "keywords": ["backpacker", "hostel", "luxury", "hotel", "off the beaten path", "spend", "save", "comfort", "experience", "depends"],
        "seed_prompt": "Tipo de viajero que es. ¿Hostel o resort? Probó ambos. Pros y contras. Comparativo.",
    },
    {
        "slug": "viajes-choque-cultural",
        "title": "Choque cultural",
        "category": "viajes",
        "keywords": ["culture shock", "weird", "rude", "polite", "unspoken", "adapt", "rude", "norm", "uncomfortable", "eye-opening"],
        "seed_prompt": "Algo que en otro país lo dejó descolocado. Costumbre rara, comida, formas de saludar. Vocabulario cultural.",
    },
    {
        "slug": "viajes-comida-en-viajes",
        "title": "Comer cuando viajás",
        "category": "viajes",
        "keywords": ["street food", "fancy", "Michelin", "scared", "adventurous", "weird", "stomach", "regret", "discover", "amazing"],
        "seed_prompt": "¿Se anima a la comida callejera? ¿Algo extremo que probó? ¿Algo que le hizo mal? Lo más rico que comió en un viaje.",
    },
    {
        "slug": "viajes-solo",
        "title": "Viajar solo",
        "category": "viajes",
        "keywords": ["solo", "alone", "lonely", "freedom", "introvert", "meet people", "boring", "scared", "liberating", "selfie"],
        "seed_prompt": "¿Viajó solo alguna vez? Si sí, cómo fue. Si no, ¿lo haría? Pros y contras. Vocabulario de experiencia personal.",
    },
    {
        "slug": "viajes-turismo-masivo",
        "title": "Turismo masivo y sus efectos",
        "category": "viajes",
        "keywords": ["overtourism", "destination", "ruined", "local", "Airbnb effect", "gentrification", "instagram", "ban", "limit", "responsible"],
        "seed_prompt": "Lugares destruidos por turismo (Venice, Barcelona, Machu Picchu). ¿Tiene que limitarse? Debate complejo.",
    },

    # ═══════════════ TECNOLOGÍA ═══════════════
    {
        "slug": "tech-apps-diarias",
        "title": "Apps que uso a diario",
        "category": "tech",
        "keywords": ["app", "daily", "habit", "addicted", "notification", "swipe", "feed", "useless", "essential", "delete"],
        "seed_prompt": "Las 3 apps más usadas del teléfono del alumno. Por qué. ¿Cuál borraría sin pensarlo? Vocabulario digital.",
    },
    {
        "slug": "tech-inteligencia-artificial",
        "title": "Inteligencia artificial",
        "category": "tech",
        "keywords": ["AI", "ChatGPT", "generate", "replace", "job", "creative", "hallucinate", "bias", "future", "exciting"],
        "seed_prompt": "Usa ChatGPT o similar. Para qué. ¿Le da miedo que reemplace su trabajo? ¿Cambió cómo hace algo concreto?",
    },
    {
        "slug": "tech-privacidad",
        "title": "Privacidad online",
        "category": "tech",
        "keywords": ["privacy", "data", "tracking", "cookie", "VPN", "creepy", "ad", "incognito", "social engineering", "phishing"],
        "seed_prompt": "Te muestran ads de algo que comentaste hablado. ¿Cuán cuidadoso es? ¿Usa VPN, ad-blockers? Vocabulario técnico.",
    },
    {
        "slug": "tech-gadget-cambio-vida",
        "title": "Un gadget que me cambió la vida",
        "category": "tech",
        "keywords": ["gadget", "device", "game-changer", "essential", "luxury", "splurge", "regret", "upgrade", "battery", "convenience"],
        "seed_prompt": "Aparato que compró y no se imagina sin él. Auriculares noise-cancelling, smartwatch, e-reader, lo que sea. Por qué.",
    },
    {
        "slug": "tech-aprender-codear",
        "title": "Aprender a programar",
        "category": "tech",
        "keywords": ["code", "programming", "learn", "tutorial", "bootcamp", "self-taught", "language", "Python", "frustrating", "logical"],
        "seed_prompt": "¿Intentó aprender a programar? Si sí, hasta dónde llegó. Si no, ¿le interesa? ¿Es necesario hoy? Vocabulario de proceso.",
    },
    {
        "slug": "tech-futuro-trabajo",
        "title": "IA y el futuro del trabajo",
        "category": "tech",
        "keywords": ["automation", "job loss", "skill", "reskill", "creative", "manual", "knowledge work", "displaced", "thrive", "adapt"],
        "seed_prompt": "Qué trabajos van a desaparecer. Cuáles van a aparecer. ¿El suyo está en riesgo? Debate del futuro.",
    },
    {
        "slug": "tech-adiccion-celular",
        "title": "Adicción al celular",
        "category": "tech",
        "keywords": ["screen time", "addicted", "doomscroll", "limit", "notification", "dopamine", "break", "detox", "Instagram", "regret"],
        "seed_prompt": "Cuánto tiempo de pantalla por día. ¿Le preocupa? ¿Intentó alguna vez una 'detox' digital? Vocabulario emocional sobre tech.",
    },
    {
        "slug": "tech-etica",
        "title": "Ética en tecnología",
        "category": "tech",
        "keywords": ["ethics", "monopoly", "platform", "moderation", "free speech", "censorship", "accountability", "regulate", "responsibility", "deepfake"],
        "seed_prompt": "Big Tech con poder enorme. Censura, deepfakes, monopolios. ¿Hay que regular más? Tema de debate denso.",
    },

    # ═══════════════ CIENCIA ═══════════════
    {
        "slug": "ciencia-curiosidad",
        "title": "Una curiosidad científica",
        "category": "ciencia",
        "keywords": ["fact", "mind-blown", "phenomenon", "explain", "physics", "biology", "weird", "research", "discovered", "fascinating"],
        "seed_prompt": "Algún dato que el alumno leyó/escuchó y le voló la cabeza. Sobre ciencia, naturaleza, cuerpo, lo que sea. Contarlo.",
    },
    {
        "slug": "ciencia-espacio",
        "title": "El espacio",
        "category": "ciencia",
        "keywords": ["space", "planet", "Mars", "NASA", "rocket", "telescope", "galaxy", "black hole", "alien", "James Webb"],
        "seed_prompt": "¿Le fascina el espacio? Marte, agujeros negros, vida en otros planetas. Qué le impresiona más. Vocabulario astronómico.",
    },
    {
        "slug": "ciencia-cuerpo-humano",
        "title": "El cuerpo humano",
        "category": "ciencia",
        "keywords": ["body", "brain", "gut", "immune", "DNA", "evolve", "biology", "doctor", "miracle", "weird"],
        "seed_prompt": "Algo del cuerpo humano que le parezca increíble. Cerebro, sistema inmune, microbioma. Cómo se sorprende.",
    },
    {
        "slug": "ciencia-cambio-climatico",
        "title": "Cambio climático",
        "category": "ciencia",
        "keywords": ["climate", "warming", "carbon", "tipping point", "denier", "renewable", "fossil", "policy", "individual action", "hope"],
        "seed_prompt": "Qué opina del cambio climático. ¿Es optimista o pesimista? ¿Hace algo en su vida diaria? Debate serio.",
    },
    {
        "slug": "ciencia-inventos",
        "title": "Inventos que cambiaron todo",
        "category": "ciencia",
        "keywords": ["invention", "revolution", "printing press", "electricity", "internet", "antibiotic", "transform", "before and after", "impact", "credit"],
        "seed_prompt": "Top 3 inventos que cambiaron la humanidad para el alumno. ¿Por qué? Pensamiento histórico + comparativo.",
    },
    {
        "slug": "ciencia-vida-extraterrestre",
        "title": "Vida en otros planetas",
        "category": "ciencia",
        "keywords": ["alien", "life", "Mars", "exoplanet", "Drake equation", "Fermi paradox", "evidence", "UFO", "contact", "imagine"],
        "seed_prompt": "¿Cree que hay vida afuera? ¿Por qué no nos contactaron todavía? La 'paradoja de Fermi' simple. Especulación.",
    },
    {
        "slug": "ciencia-genetica",
        "title": "Genética y ética",
        "category": "ciencia",
        "keywords": ["DNA", "edit", "CRISPR", "designer baby", "disease", "cure", "playing god", "consent", "future", "slippery slope"],
        "seed_prompt": "Editar genes, bebés a medida, curar enfermedades hereditarias. ¿Hasta dónde? Bioética accesible.",
    },
    {
        "slug": "ciencia-pseudociencia",
        "title": "Pseudociencia vs ciencia",
        "category": "ciencia",
        "keywords": ["pseudoscience", "homeopathy", "astrology", "flat earth", "skeptic", "evidence", "belief", "harmless", "dangerous", "convince"],
        "seed_prompt": "Astrología, homeopatía, tierra plana. ¿Inofensivo o dañino? ¿Cómo le explicaría a alguien que cree firmemente en eso?",
    },

    # ═══════════════ ARTE Y CULTURA ═══════════════
    {
        "slug": "arte-artista-admiro",
        "title": "Un artista que admiro",
        "category": "arte",
        "keywords": ["artist", "admire", "work", "style", "influence", "discover", "exhibit", "obsessed", "evolve", "underrated"],
        "seed_prompt": "Pintor, escultor, fotógrafo o lo que sea. Quién. Por qué. Una obra específica que le marcó.",
    },
    {
        "slug": "arte-museos",
        "title": "Visitar museos",
        "category": "arte",
        "keywords": ["museum", "exhibition", "wandering", "audio guide", "overwhelmed", "rush", "favorite room", "tourist", "free entry", "boring"],
        "seed_prompt": "¿Va a museos? ¿Por gusto o turista? Estrategia: leer todo o caminar y absorber. Vocabulario de experiencia.",
    },
    {
        "slug": "arte-digital-vs-tradicional",
        "title": "Arte digital vs tradicional",
        "category": "arte",
        "keywords": ["digital", "Procreate", "iPad", "paint", "canvas", "purist", "tool", "skill", "shortcut", "legitimate"],
        "seed_prompt": "Hacer arte con iPad. ¿Es igual de válido que con pintura? Debate generacional.",
    },
    {
        "slug": "arte-callejero",
        "title": "Arte callejero",
        "category": "arte",
        "keywords": ["graffiti", "street art", "Banksy", "vandalism", "mural", "ephemeral", "public", "commission", "activism", "color"],
        "seed_prompt": "Graffiti = vandalismo? Banksy. Murales en el barrio del alumno. Vocabulario urbano.",
    },
    {
        "slug": "arte-crear-propio",
        "title": "Crear arte propio",
        "category": "arte",
        "keywords": ["create", "hobby", "amateur", "draw", "paint", "write", "embarrassed", "share", "Instagram", "imposter"],
        "seed_prompt": "¿Hace alguna forma de arte (escribir, dibujar, fotos, música)? ¿Lo comparte? ¿Por qué sí o por qué no?",
    },
    {
        "slug": "arte-dinero",
        "title": "Arte y dinero",
        "category": "arte",
        "keywords": ["market", "auction", "Sotheby's", "millions", "investment", "starving artist", "sell out", "commission", "patronage", "Banksy shred"],
        "seed_prompt": "Un Basquiat vendido a 100 millones. Artistas pobres. ¿El precio refleja el valor? ¿Banksy cuando trituró su cuadro?",
    },
    {
        "slug": "arte-nft",
        "title": "NFTs y arte digital",
        "category": "arte",
        "keywords": ["NFT", "crypto", "blockchain", "ownership", "scam", "bubble", "early adopter", "right click save", "Beeple", "speculative"],
        "seed_prompt": "El boom y la caída de los NFTs. ¿Fue arte o scam? ¿Hay algo rescatable? Tema reciente.",
    },
    {
        "slug": "arte-censura",
        "title": "Censura en el arte",
        "category": "arte",
        "keywords": ["censorship", "ban", "controversial", "offensive", "free expression", "context", "warning", "remove", "exhibit", "history"],
        "seed_prompt": "Obras canceladas, libros prohibidos, películas re-editadas. ¿Cuándo se justifica? Debate libertad vs respeto.",
    },

    # ═══════════════ FITNESS Y BIENESTAR ═══════════════
    {
        "slug": "fitness-rutina-actual",
        "title": "Mi rutina actual",
        "category": "fitness",
        "keywords": ["routine", "gym", "morning", "evening", "consistent", "skip", "schedule", "weights", "cardio", "rest day"],
        "seed_prompt": "Cómo se mueve hoy. Gym, correr, yoga, nada. Cuántos días por semana. Sincero. Vocabulario de hábito.",
    },
    {
        "slug": "fitness-empezar-entrenar",
        "title": "Empezar a entrenar",
        "category": "fitness",
        "keywords": ["start", "intimidating", "newbie", "personal trainer", "form", "consistency", "results", "motivation", "fail", "stick"],
        "seed_prompt": "Si alguien arranca de cero. Qué consejos le daría. Errores que cometió cuando empezó él. Vocabulario práctico.",
    },
    {
        "slug": "fitness-yoga-meditacion",
        "title": "Yoga y meditación",
        "category": "fitness",
        "keywords": ["yoga", "meditate", "breathwork", "flexibility", "mind-body", "instructor", "headspace", "calm", "spiritual", "wellness"],
        "seed_prompt": "¿Probó yoga, meditación, breathwork? Si sí, lo siguió o lo dejó. Cómo se sintió. Vocabulario de bienestar.",
    },
    {
        "slug": "fitness-nutricion",
        "title": "Nutrición básica",
        "category": "fitness",
        "keywords": ["protein", "carbs", "macros", "balanced", "snack", "processed", "label", "supplement", "vitamins", "moderation"],
        "seed_prompt": "¿Cuida lo que come? ¿Cuenta macros o sigue intuición? Vocabulario nutricional simple.",
    },
    {
        "slug": "fitness-salud-mental",
        "title": "Salud mental",
        "category": "fitness",
        "keywords": ["mental health", "therapy", "anxious", "stress", "burnout", "talk to", "stigma", "self-care", "boundary", "support"],
        "seed_prompt": "Ya es OK hablar de esto. ¿Va a terapia? ¿Cómo lidia con stress? Tema más sensible. Vocabulario emocional.",
    },
    {
        "slug": "fitness-running",
        "title": "Running para principiantes",
        "category": "fitness",
        "keywords": ["running", "couch to 5k", "pace", "shoes", "knee pain", "marathon", "addicted", "playlist", "outdoor", "treadmill"],
        "seed_prompt": "Correr: ¿lo odia o lo ama? ¿Probó alguna vez constante? Vocabulario específico.",
    },
    {
        "slug": "fitness-suplementos",
        "title": "Suplementos: ¿sí o no?",
        "category": "fitness",
        "keywords": ["supplement", "protein powder", "creatine", "vitamin", "scam", "necessary", "label", "doctor", "natural", "performance"],
        "seed_prompt": "¿Toma proteína, creatina, vitaminas? ¿O cree que con buena dieta alcanza? Debate.",
    },
    {
        "slug": "fitness-cuerpo-ideal",
        "title": "Cuerpo ideal y presión social",
        "category": "fitness",
        "keywords": ["body image", "ideal", "social media", "filter", "Photoshop", "compare", "self-esteem", "diet culture", "acceptance", "trend"],
        "seed_prompt": "Instagram y los cuerpos perfectos. ¿Le afecta? ¿Cómo cambió el ideal en 20 años? Tema profundo.",
    },

    # ═══════════════ MODA Y ESTILO ═══════════════
    {
        "slug": "moda-estilo-personal",
        "title": "Mi estilo personal",
        "category": "moda",
        "keywords": ["style", "outfit", "wardrobe", "go-to", "color palette", "uniform", "experiment", "signature", "comfort", "trends"],
        "seed_prompt": "Cómo describiría su estilo. Tres palabras. ¿Tiene 'uniforme'? ¿Cómo lo definiría comparado a sus amigos?",
    },
    {
        "slug": "moda-marcas",
        "title": "Marcas favoritas",
        "category": "moda",
        "keywords": ["brand", "loyal", "splurge", "drop", "limited edition", "investment piece", "logo", "minimalist", "snob", "value"],
        "seed_prompt": "Marcas en las que confía. Algo en lo que gasta más. Algo en lo que ahorra. Vocabulario de consumo.",
    },
    {
        "slug": "moda-sneakers",
        "title": "Sneakers",
        "category": "moda",
        "keywords": ["sneaker", "drop", "collab", "Jordan", "Yeezy", "collector", "rotation", "kicks", "tied", "resell"],
        "seed_prompt": "¿Tiene zapatillas que le importan? ¿Cuántos pares? ¿Es de los que las cuida o las usa hasta destrozar?",
    },
    {
        "slug": "moda-comprar-online",
        "title": "Comprar moda online",
        "category": "moda",
        "keywords": ["online", "return", "fit", "size", "review", "Shein", "Asos", "Zara", "frustrating", "convenient"],
        "seed_prompt": "Comprar ropa online. ¿Le sale bien o todo le queda mal? Devuelve. ¿Qué app/sitio prefiere?",
    },
    {
        "slug": "moda-vintage",
        "title": "Vintage vs moderno",
        "category": "moda",
        "keywords": ["vintage", "thrift", "second hand", "Y2K", "90s", "find", "score", "unique", "story", "sustainability"],
        "seed_prompt": "Ropa de segunda mano, vintage, ferias. ¿Se anima? ¿Encontró algo épico alguna vez?",
    },
    {
        "slug": "moda-fast-fashion",
        "title": "Fast fashion",
        "category": "moda",
        "keywords": ["fast fashion", "Shein", "exploitation", "cheap", "throwaway", "carbon", "wages", "trend cycle", "boycott", "alternative"],
        "seed_prompt": "Shein, Zara, ropa que sale y se descarta rápido. ¿Le importa la ética detrás? Debate.",
    },
    {
        "slug": "moda-sostenible",
        "title": "Moda sostenible",
        "category": "moda",
        "keywords": ["sustainable", "ethical", "transparency", "fabric", "natural", "expensive", "worth", "Patagonia", "secondhand", "repair"],
        "seed_prompt": "Alternativas: comprar menos, comprar mejor, reparar. ¿Le interesa? ¿Es accesible o solo para ricos?",
    },
    {
        "slug": "moda-genero",
        "title": "Moda y género",
        "category": "moda",
        "keywords": ["gender", "fluid", "menswear", "womenswear", "neutral", "label", "Harry Styles", "skirt", "norm", "expression"],
        "seed_prompt": "Hombres con polleras, mujeres con trajes, moda no binaria. ¿Cómo se siente con esto? ¿Cambió en los últimos años?",
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        created = 0
        updated = 0
        for t in CURATED_TOPICS:
            existing = (await db.execute(
                select(Topic).where(Topic.slug == t["slug"])
            )).scalar_one_or_none()

            seed_prompts = {"es": t["seed_prompt"]}

            if existing:
                existing.title = t["title"]
                existing.category = t["category"]
                existing.keywords = t["keywords"]
                existing.seed_prompts = seed_prompts
                existing.levels = ["A0", "A1", "A2", "B1", "B2", "C1"]
                existing.is_active = True
                updated += 1
            else:
                db.add(Topic(
                    slug=t["slug"],
                    title=t["title"],
                    category=t["category"],
                    keywords=t["keywords"],
                    seed_prompts=seed_prompts,
                    levels=["A0", "A1", "A2", "B1", "B2", "C1"],
                    is_active=True,
                    is_hot=False,
                    usage_count=0,
                ))
                created += 1

        await db.commit()
        print(f"\nOK. {created} topics creados, {updated} actualizados.")
        print(f"Total: {len(CURATED_TOPICS)} tópicos curados en 12 categorías.")


if __name__ == "__main__":
    asyncio.run(main())
