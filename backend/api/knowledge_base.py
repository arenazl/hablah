import hmac, os
from fastapi import APIRouter, Header, HTTPException

router = APIRouter(tags=["knowledge-base"])

CONTRACT_VERSION = "1.2"

KB = {
    "contract_version": CONTRACT_VERSION,
    "last_updated": "2026-06-26T14:00:00Z",

    "business": {
        "name": "Hablah",
        "tagline": "Coach de ingles por voz, en vivo, que se adapta a vos.",
        "description": (
            "Hablah es una plataforma de aprendizaje de ingles basada en conversacion por voz con "
            "inteligencia artificial. El alumno elige un topico, habla con el coach de IA y la clase "
            "se adapta en tiempo real a su nivel CEFR, sus intereses y su historial. "
            "No hay fichas ni gramatica memorizada: se aprende hablando, como en la vida real. "
            "Tiene un modo adultos (A0 a C2) y un modo Kids adaptado para chicos de 4 a 17 anos."
        ),
        "value_story": (
            "El alumno no aprende ingles leyendo fichas — lo aprende hablando. "
            "Hablah le da un coach de IA que lo escucha en tiempo real, corrige sin interrumpir "
            "y recuerda lo que aprendio clase a clase. "
            "El adulto practica 10-15 minutos al dia sobre temas que le interesan; "
            "el chico tiene un coach que se adapta a su edad y le hace divertida la clase. "
            "El resultado: mas practica oral real que con cualquier metodo tradicional, sin agenda y sin excusas."
        ),
        "industry": "EdTech / aprendizaje de idiomas",
        "target_audience": (
            "Adultos hispanohablantes que necesitan hablar ingles para el trabajo, para emigrar "
            "o para desenvolverse en viajes. Y familias con chicos de 4 a 17 anos que quieren "
            "empezar el idioma con una experiencia oral desde el primer dia."
        ),
        "website": "https://hablah.com.ar",
    },

    "key_messages": [
        "Se aprende ingles hablando, no memorizando — Hablah te da el coach en vivo que necesitas.",
        "El coach recuerda lo que ya sabes y donde te trabas: cada clase parte de donde dejaste.",
        "10-15 minutos al dia, a la hora que quieras, sobre temas que te importan.",
        "Modo Kids: un coach disenado para cada edad (Mini 4-7, Junior 8-12, Teen 13-17).",
        "Mas practica oral real en una semana que en un ano de clases tradicionales.",
    ],

    "offerings": [
        {
            "id": "clases-voz-adultos",
            "name": "Clases de ingles por voz (adultos)",
            "description": (
                "El alumno elige un topico de mas de 400 opciones organizadas por nivel CEFR "
                "(A0 a C2) y arranca a hablar con el coach de IA. "
                "El coach abre la clase, corrige de forma implicita, recicla vocabulario "
                "y cierra con un resumen. Cada clase dura 10-20 minutos segun el nivel."
            ),
            "key_features": [
                "Mas de 400 topicos: trabajo, viajes, cultura pop, tecnologia y mas",
                "Niveles A0 a C2 — arranca desde cero absoluto",
                "Coach que recuerda errores recurrentes y vocab ya trabajado",
                "Dashboard con racha diaria, nivel CEFR actual y proximo hito",
                "Historial completo con resumen y feedback por sesion",
            ],
            "status": "available",
        },
        {
            "id": "modo-kids",
            "name": "Modo Kids (4-17 anos)",
            "description": (
                "Clases de ingles disenadas para chicos, con coach que adapta ritmo, vocabulario "
                "y correccion a la edad y nivel del chico. "
                "Mini (4-7 anos), Junior (8-12) y Teen (13-17). "
                "El tutor puede seguir el progreso desde su cuenta."
            ),
            "key_features": [
                "Tres bandas: Mini, Junior y Teen — cada una con su perfil pedagogico",
                "Topicos pensados para cada edad (animales, colores, deportes, redes sociales...)",
                "Coach calido en Mini, conversacional en Teen",
                "Entorno seguro: sin pantallas de riesgo",
                "Panel del tutor para ver el progreso de los chicos",
            ],
            "status": "available",
        },
    ],

    "pricing": {
        "model": "subscription",
        "summary": (
            "Hablah funciona por suscripcion mensual o anual. "
            "Los precios no se publican; un asesor los comparte al consultar."
        ),
        "pricing_disclosed": False,
        "human_closes_price": True,
        "plans": [
            {
                "name": "Individual",
                "description": "Para un adulto que quiere mejorar su ingles conversacional.",
                "target": "adultos",
                "features": [
                    "Clases de voz ilimitadas",
                    "Todos los topicos A0-C2",
                    "Dashboard de progreso y historial",
                    "Coach con memoria de clase a clase",
                ],
                "price": None,
            },
            {
                "name": "Familia",
                "description": "Un adulto mas los perfiles Kids de la familia.",
                "target": "familias con chicos",
                "features": [
                    "Cuenta adulto incluida",
                    "Perfiles Kids (Mini, Junior o Teen) para cada chico",
                    "Panel del tutor para seguir el progreso",
                ],
                "price": None,
            },
        ],
        "promotions": [],
    },

    "differentiators": [
        "El coach de IA habla en tiempo real: no es un chatbot con respuestas enlatadas.",
        "Se aprende hablando desde el primer minuto, no memorizando reglas.",
        "El coach recuerda errores y vocabulario clase a clase — la continuidad que un tutor humano pierde.",
        "Mas de 400 topicos reales: el alumno practica lo que necesita, no un libro.",
        "Modo Kids con pedagogia diferenciada por edad: Mini no aprende igual que un Teen.",
        "Sin nivel minimo: de cero absoluto (A0) a conversacion avanzada (C2).",
        "10-15 minutos al dia: cabe en cualquier rutina, sin agenda con nadie.",
    ],

    "objections": [
        {
            "objection": "Prefiero una app con ejercicios escritos, mas estructurada.",
            "response": (
                "Los metodos con fichas funcionan para leer, no para hablar. "
                "Hablah entrena lo que siempre falta: producir ingles en vivo sin tiempo para pensar. "
                "Es el complemento ideal si ya usas otro metodo."
            ),
        },
        {
            "objection": "Una IA no puede reemplazar a un profesor humano.",
            "response": (
                "No la reemplaza, la escala. Con un humano tenes 1-2 horas de clase por semana; "
                "con Hablah practicas todos los dias a la hora que queres. "
                "El volumen de practica oral es lo que hace la diferencia."
            ),
        },
        {
            "objection": "No se si mi nivel es suficiente para hablar con una IA.",
            "response": (
                "Hay alumnos que arrancan sin saber decir 'hello'. "
                "El coach empieza donde estas vos y sube de a poco. "
                "En A0 mezcla castellano e ingles para que entiendas todo."
            ),
        },
        {
            "objection": "Mi hijo es muy chico para aprender ingles con una IA.",
            "response": (
                "El modo Mini es para chicos de 4 a 7 anos: vocabulario muy basico, "
                "coach muy calido y temas que le gustan (animales, colores, juguetes). "
                "No es una pantalla de riesgo: es una clase guiada con ritmo de nene."
            ),
        },
    ],

    "faq": [
        {
            "question": "Cuanto tiempo lleva ver resultados?",
            "answer": (
                "Con 10-15 minutos diarios, la mayoria de alumnos nota mejora en produccion oral "
                "en 4-6 semanas. No garantizamos plazos fijos: el progreso es individual."
            ),
        },
        {
            "question": "El coach habla solo en ingles o tambien en castellano?",
            "answer": (
                "Depende del nivel. En A0 y A1 mezcla castellano e ingles. "
                "A partir de B1 la clase es en ingles."
            ),
        },
        {
            "question": "Puedo elegir el topico o el coach lo elige por mi?",
            "answer": (
                "Vos elegis. El coach sugiere uno basado en tu historial, "
                "pero siempre podes cambiarlo."
            ),
        },
        {
            "question": "Funciona en el celular?",
            "answer": "Si. Funciona en el navegador; solo necesitas microfono habilitado.",
        },
        {
            "question": "Como funciona el modo Kids? El chico puede usarlo solo?",
            "answer": (
                "Si. El tutor crea el perfil del chico y define la banda de edad. "
                "Despues el chico elige un topico y arranca la clase solo. "
                "El tutor puede ver el historial y el progreso desde su cuenta."
            ),
        },
    ],

    "contact": {
        "website": "https://hablah.com.ar",
        "email": "hola@hablah.com.ar",
        "demo_url": None,
        "phone": None,
        "notes": "Un asesor responde por el chat del sitio o por email.",
    },

    "do_not_say": [
        "No prometer fluency en X semanas ni garantizar un nivel CEFR especifico en un plazo.",
        "No comparar con Duolingo ni con otras apps sin datos reales que lo soporten.",
        "No afirmar que el coach es un humano ni que tiene certificacion oficial.",
        "No inventar precios ni descuentos: el precio lo cierra un asesor.",
        "No decir que sirve para rendir examenes oficiales (IELTS, TOEFL) sin confirmacion.",
        "No usar emojis en ningun mensaje ni material generado.",
    ],

    # capabilities / entities / tools: Hablah no expone datos en vivo para el bot
    # (no hay consulta de estado de tramite, stock ni turno). Omidir por ahora.
    "capabilities": [],
    "entities": [],
    "tools": [],

    "screens": [
        {
            "label": "Dashboard - Hoy",
            "kind": "dashboard",
            "headline": "Buenos dias, Martin",
            "framework": "React + Tailwind CSS",
            "nav": ["Hoy", "Practicar", "Mapa", "Historial"],
            "components": [
                "card hero con topico sugerido del dia, nombre del coach y boton 'Empezar clase'",
                "tres KPIs: dias de racha, nivel CEFR actual, clases completadas",
                "lista de ultimas 3 sesiones con score de cada una",
                "sidebar de navegacion con logo y perfil del usuario al pie",
            ],
            "layout": (
                "Sidebar izquierda fija (240px) con logo + nav + card de usuario. "
                "Main area: titulo con saludo + fecha, card hero destacada, grilla de 3 KPIs, "
                "lista vertical de sesiones recientes."
            ),
            "style": (
                "Fondo crema calido (#F2EEE5). Cards blancas con borde sutil. "
                "Hero con fondo navy (#002554) y texto claro. "
                "KPIs: valor en navy, label en gris. Scores con color segun nota (verde/amarillo/rojo)."
            ),
            "data": [
                {"tipo": "hero", "topico": "Entrevistas de trabajo en ingles", "nivel": "B1", "duracion": "15 min", "coach": "Aria"},
                {"tipo": "kpi", "label": "Dias de racha", "valor": "11"},
                {"tipo": "kpi", "label": "Nivel actual", "valor": "B1"},
                {"tipo": "kpi", "label": "Clases completadas", "valor": "47"},
                {"tipo": "sesion", "topico": "Viajes y aeropuertos", "score": 8.4, "fecha": "ayer"},
                {"tipo": "sesion", "topico": "Tecnologia y redes sociales", "score": 7.1, "fecha": "hace 2 dias"},
            ],
            "flow": "El alumno entra, ve el topico sugerido y arranca la clase del dia.",
            "route": "/app",
        },
        {
            "label": "Practicar - sesion de voz en vivo",
            "kind": "detail",
            "headline": "Clase en vivo",
            "framework": "React + Tailwind CSS",
            "nav": ["Entrevistas de trabajo", "Nivel B1 - Aria"],
            "components": [
                "badge con nombre del topico y nivel",
                "transcript en tiempo real (burbujas: coach a la izquierda, alumno a la derecha)",
                "visualizador de audio (barras animadas que suben y bajan con la voz)",
                "boton central de microfono para hablar",
                "boton 'Terminar clase' y estado 'Escuchando / Coach hablando'",
            ],
            "layout": (
                "Pantalla completa oscura. Transcript ocupa el centro (scroll). "
                "Visualizador de audio debajo. Controles fijos al pie: boton-end a la izquierda, "
                "boton-mic circular al centro, estado a la derecha."
            ),
            "style": (
                "Fondo muy oscuro (casi negro, #0E1614). "
                "Burbujas coach en azul oscuro (#0b1f33); burbujas alumno en verde oscuro (#0b2a1a). "
                "Boton mic en navy con borde dorado (#C9A45A). "
                "Dot verde animado cuando el sistema esta escuchando."
            ),
            "data": [
                {"quien": "coach", "texto": "Hi Martin! Let's practice job interviews. Can you tell me about yourself?"},
                {"quien": "alumno", "texto": "Hi! I'm Martin, I work in software... five years of experience in web development."},
                {"quien": "coach", "texto": "Nice! Web development. What kind of projects have you worked on?"},
                {"quien": "alumno", "texto": "Both frontend and backend. React and Python mainly."},
            ],
            "flow": "El alumno habla, el coach responde en tiempo real. Al terminar, el sistema puntua la clase.",
            "route": "/app/practicar",
        },
        {
            "label": "Historial de clases",
            "kind": "list",
            "headline": "Historial de clases",
            "framework": "React + Tailwind CSS",
            "nav": ["Hoy", "Practicar", "Mapa", "Historial"],
            "components": [
                "subtitulo con total de clases y mes actual",
                "lista de cards por sesion: score badge coloreado, topico, duracion, fecha, nivel, verdict del juez",
                "separadores de mes",
            ],
            "layout": (
                "Sidebar izquierda + main area. "
                "Main: titulo + subtitulo, separador de mes, lista vertical de cards. "
                "Cada card: score a la izquierda (48px, color segun nota), info en el centro "
                "(topico en negrita, meta debajo, chips nivel+duracion), verdict del juez a la derecha."
            ),
            "style": (
                "Fondo crema. Cards blancas con borde sutil. "
                "Score badge: verde (#dcfce7 + #15803d) si >=8, amarillo si >=6.5, rojo si <6.5. "
                "Verdict en italic gris con borde izquierdo sutil."
            ),
            "data": [
                {"topico": "Viajes y aeropuertos", "score": 8.4, "duracion": "14 min", "nivel": "B1", "fecha": "25 jun", "verdict": "Excelente fluidez. Error menor en preposiciones."},
                {"topico": "Tecnologia y redes sociales", "score": 7.1, "duracion": "12 min", "nivel": "B1", "fecha": "24 jun", "verdict": "Vocabulario solido. Trabajar oraciones largas."},
                {"topico": "Mi trabajo y el equipo", "score": 8.9, "duracion": "18 min", "nivel": "B1", "fecha": "23 jun", "verdict": "Clase muy completa. Ritmo de conversacion excelente."},
            ],
            "flow": "El alumno revisa sus clases pasadas y el feedback de cada una para saber en que mejorar.",
            "route": "/app/historial",
        },
        {
            "label": "Mapa de progreso CEFR",
            "kind": "timeline",
            "headline": "Tu camino al nivel C1",
            "framework": "React + Tailwind CSS",
            "nav": ["Hoy", "Practicar", "Mapa", "Historial"],
            "components": [
                "banner nivel actual con etiqueta CEFR grande, descripcion del nivel y barra de avance hacia el siguiente",
                "camino de nodos CEFR (A0 > A1 > A2 > B1 > B2 > C1 > C2) con colores: completados en navy, actual en dorado, proximos en gris",
                "grilla de hitos recientes: completados con check verde, en curso con barra de progreso",
            ],
            "layout": (
                "Sidebar + main. Main: titulo + subtitulo, banner nivel (dos columnas: nivel a la izq, "
                "barra de progreso a la der), camino CEFR horizontal, grilla 2x2 de hitos."
            ),
            "style": (
                "Banner en navy (#002554) con texto claro. Nodo actual en dorado (#C9A45A) con halo. "
                "Nodos completados en navy solido. Nodos futuros en gris claro. "
                "Hitos completados con borde verde; en curso sin borde especial."
            ),
            "data": [
                {"nivel": "B1", "porcentaje_hacia_b2": 65, "clases": 47},
                {"hito": "Primera clase completada", "estado": "completado", "fecha": "hace 3 meses"},
                {"hito": "Racha de 7 dias", "estado": "completado", "fecha": "hace 2 semanas"},
                {"hito": "Supere el nivel A2", "estado": "completado", "fecha": "hace 1 mes"},
                {"hito": "Superar el nivel B1", "estado": "en curso", "porcentaje": 65},
            ],
            "flow": "El alumno ve donde esta en el camino CEFR y cuanto le falta para el proximo nivel.",
            "route": "/app/mapa",
        },
    ],

    "brand": {
        "logo": {
            "primary": "https://hablah.com.ar/logos/hablah-full.svg",
            "isotype": "https://hablah.com.ar/logos/hablah-mark.svg",
            "svg": None,
        },
        "colors": {
            "primary": "#002554",
            "accent": "#C9A45A",
            "ink": "#0D1412",
            "surface": "#F2EEE5",
        },
        "fonts": {
            "display": "Instrument Serif",
            "text": "Geist",
        },
        "style": {
            "radius": "rounded",
            "density": "comoda",
            "vibe": "institucional calido",
        },
        "phonetic": "Ablah",
        "tone": "cercano y motivador",
        "avoid": [
            "No verdes ni azules claros asociados a fitness o bienestar",
            "No tono formal ni academico",
            "No emojis en ningun material",
        ],
    },

    "extra": {},
}


def _check_key(x_kb_key: str | None) -> None:
    secrets = [
        os.environ.get("KB_CLAVE_SALESBOT", "").strip(),
        os.environ.get("KB_CLAVE_MEDIASTUDIO", "").strip(),
    ]
    if not any(secrets):
        raise HTTPException(status_code=503, detail="KB secrets not configured")
    if not x_kb_key:
        raise HTTPException(status_code=401, detail="missing X-KB-Key")
    key = x_kb_key.encode()
    ok = False
    for s in secrets:
        if s and hmac.compare_digest(key, s.encode()):
            ok = True
    if not ok:
        raise HTTPException(status_code=403, detail="invalid X-KB-Key")


@router.get("/health")
def kb_health():
    return {
        "status": "ok",
        "contract_version": CONTRACT_VERSION,
        "kb_last_updated": KB["last_updated"],
    }


@router.get("")
def kb(x_kb_key: str | None = Header(default=None, alias="X-KB-Key")):
    _check_key(x_kb_key)
    return KB
