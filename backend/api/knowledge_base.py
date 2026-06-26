import hmac, os
from fastapi import APIRouter, Header, HTTPException

router = APIRouter(tags=["knowledge-base"])

CONTRACT_VERSION = "1.1"

# KB curado — actualizar last_updated cuando cambie el contenido
KB = {
    "contract_version": CONTRACT_VERSION,
    "last_updated": "2026-06-26T12:00:00Z",
    "business": {
        "name": "Hablah",
        "tagline": "Coach de ingles por voz, en vivo, que se adapta a vos.",
        "description": (
            "Hablah es una plataforma de aprendizaje de ingles basada en conversacion por voz con inteligencia artificial. "
            "El alumno habla, el coach responde en tiempo real y adapta cada clase a su nivel CEFR, sus intereses y su historial. "
            "No hay fichas, no hay gramatica memorizada: se aprende hablando, como se aprende un idioma en la vida real. "
            "Tiene un modo adultos (A0 a C2) y un modo Kids adaptado para chicos de 4 a 17 anos."
        ),
        "industry": "EdTech / aprendizaje de idiomas",
        "target_audience": (
            "Adultos hispanohablantes que necesitan hablar ingles para el trabajo o para emigrar, "
            "y familias con chicos que quieren una experiencia de aprendizaje oral desde chicos."
        ),
        "website": "https://hablah.com.ar",
    },
    "offerings": [
        {
            "id": "clases-voz-adultos",
            "name": "Clases de ingles por voz para adultos",
            "description": (
                "El alumno elige un topico (trabajo, viajes, tecnologia, vida cotidiana y mas de 400 opciones) "
                "y arranca a hablar con el coach de IA. El coach abre la clase, corrige sin interrumpir, "
                "recicla vocabulario y cierra con un resumen. Cada clase dura 10-20 minutos segun el nivel."
            ),
            "key_features": [
                "Mas de 400 topicos organizados por nivel CEFR (A0 a C2)",
                "Correccion implicita en tiempo real sin cortar el hilo",
                "El coach recuerda lo que el alumno ya sabe clase a clase",
                "Dashboard con racha diaria, nivel actual y proximo hito CEFR",
                "Historial completo de clases con resumen por sesion",
            ],
            "status": "available",
        },
        {
            "id": "modo-kids",
            "name": "Modo Kids (4-17 anos)",
            "description": (
                "Clases de ingles disenadas para chicos, con un coach que adapta el ritmo, el vocabulario "
                "y la corrreccion a la edad y el nivel del chico. Mini (4-7 anos), Junior (8-12) y Teen (13-17). "
                "El tutor puede ver el progreso desde su cuenta."
            ),
            "key_features": [
                "Tres bandas de edad: Mini, Junior y Teen",
                "Topicos disenados para cada edad (animales, colores, deportes, redes sociales...)",
                "Coach con estilo pedagogico adaptado (mas calido en Mini, mas conversacional en Teen)",
                "Sin pantallas de riesgo: entorno seguro para chicos",
            ],
            "status": "available",
        },
    ],
    "pricing": {
        "model": "subscription",
        "summary": (
            "Hablah funciona por suscripcion mensual o anual. "
            "Los precios no se publican en el sitio; un asesor los comparte al consultar."
        ),
        "pricing_disclosed": False,
        "human_closes_price": True,
        "plans": [
            {
                "name": "Individual",
                "description": "Para una persona adulta que quiere mejorar su ingles conversacional.",
                "target": "adultos",
                "features": [
                    "Clases de voz ilimitadas",
                    "Acceso a todos los topicos A0-C2",
                    "Historial y dashboard de progreso",
                    "Coach que recuerda tu historial",
                ],
                "price": None,
            },
            {
                "name": "Familia",
                "description": "Un adulto mas los perfiles Kids de la familia.",
                "target": "familias con chicos",
                "features": [
                    "Cuenta adulto individual incluida",
                    "Perfiles Kids (Mini, Junior o Teen) para cada chico",
                    "Panel del tutor para ver el progreso de los chicos",
                ],
                "price": None,
            },
        ],
        "promotions": [],
    },
    "differentiators": [
        "El coach de IA habla en tiempo real: no es un chatbot con respuestas enlatadas.",
        "Se aprende hablando desde el primer minuto, no memorizando reglas.",
        "El coach recuerda el vocabulario y los errores recurrentes clase a clase.",
        "Mas de 400 topicos reales (trabajo, entrevistas, viajes, cultura pop, tecnologia...).",
        "Modo Kids con pedagogia adaptada por edad: Mini no aprende igual que un Teen.",
        "Sin nivel minimo: arranca desde cero absoluto (A0) hasta conversacion avanzada (C2).",
    ],
    "objections": [
        {
            "objection": "Prefiero una app con ejercicios escritos, mas estructurada.",
            "response": (
                "Los metodos con fichas funcionan para leer, no para hablar. "
                "Hablah entrena justo lo que falla: producir ingles en vivo, sin tiempo para pensar. "
                "Es el complemento ideal si ya tenias otro metodo."
            ),
        },
        {
            "objection": "Una IA no puede reemplazar a un profesor humano.",
            "response": (
                "No la reemplaza, la escala. Con un humano tenes clase 1-2 horas por semana; "
                "con Hablah podes practicar todos los dias, a la hora que quieras, sin agenda. "
                "El volumen de practica oral es lo que hace la diferencia."
            ),
        },
        {
            "objection": "No se si mi nivel es suficiente para hablar con una IA.",
            "response": (
                "Hay alumnos que arrancan sin saber decir 'hello'. "
                "El coach empieza en tu nivel y sube de a poco. Si vas a A0, habla en castellano "
                "y introduce palabras en ingles de a una."
            ),
        },
        {
            "objection": "Mi hijo es muy chico para aprender ingles con una IA.",
            "response": (
                "El modo Mini esta disenado para chicos de 4 a 7 anos: vocabulario super basico, "
                "coach muy calido, clases de 10 minutos con temas que le gustan (animales, colores, juguetes). "
                "No es una pantalla de riesgo: es una clase guiada."
            ),
        },
    ],
    "faq": [
        {
            "question": "Cuanto tiempo lleva ver resultados?",
            "answer": (
                "Depende del punto de partida y la frecuencia. Con 10-15 minutos diarios, "
                "la mayoria de alumnos nota mejora en produccion oral en 4-6 semanas. "
                "No garantizamos plazos fijos: el progreso es individual."
            ),
        },
        {
            "question": "El coach habla solo en ingles o tambien en castellano?",
            "answer": (
                "Depende del nivel. En A0 y A1 el coach mezcla castellano e ingles para que se entienda todo. "
                "A partir de B1 la clase es en ingles."
            ),
        },
        {
            "question": "Puedo elegir el topico o el coach lo elige por mi?",
            "answer": (
                "Vos elegis el topico de cada clase. El coach sugiere uno basado en tu historial, "
                "pero siempre podes cambiarlo."
            ),
        },
        {
            "question": "Funciona en el celular?",
            "answer": "Si. Funciona en el navegador del celular; solo necesitas microfono habilitado.",
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
        "No comparar con Duolingo ni con otras apps sin datos reales.",
        "No afirmar que el coach es un humano ni que tiene certificacion oficial.",
        "No inventar precios ni descuentos: el precio lo cierra un asesor.",
        "No decir que sirve para rendir examenes oficiales (IELTS, TOEFL) sin confirmacion.",
        "No usar emojis en ningun mensaje ni material generado.",
    ],
    "screens": [
        {
            "label": "Dashboard - Hoy",
            "url": "https://look-guides.netlify.app/apps/hablah/dashboard.html",
            "route": "/app",
        },
        {
            "label": "Practicar - sesion de voz",
            "url": "https://look-guides.netlify.app/apps/hablah/practicar.html",
            "route": "/app/practicar",
        },
        {
            "label": "Mapa de progreso",
            "url": "https://look-guides.netlify.app/apps/hablah/mapa.html",
            "route": "/app/mapa",
        },
        {
            "label": "Historial de clases",
            "url": "https://look-guides.netlify.app/apps/hablah/historial.html",
            "route": "/app/historial",
        },
        {
            "label": "Perfil del alumno",
            "url": "https://look-guides.netlify.app/apps/hablah/perfil.html",
            "route": "/app/perfil",
        },
    ],
    "brand": {
        "logo": {
            "primary": "https://look-guides.netlify.app/apps/hablah/logo.svg",
            "isotype": "https://look-guides.netlify.app/apps/hablah/iso.svg",
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
        "phonetic": "Ablah",
        "tone": "cercano y motivador",
        "avoid": [
            "No usar verdes ni azules claros asociados a apps de fitness o bienestar",
            "No tono formal ni academico: cercano pero serio",
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
