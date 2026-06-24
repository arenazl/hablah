"""Knowledge Share Protocol (KSP) — endpoint del KB comercial de Habláh.

Expone GET /api/knowledge-base (+ /health) para que los consumidores del ecosistema
(SalesBot = material de venta, Media Studio = campañas de video) lean el material comercial
de Habláh en tiempo real. Contrato v1.1 (base-compartida/KNOWLEDGE_SHARE_PROTOCOL.md).

KB = artefacto CURADO (constante de abajo), NO se arma por request. Al cambiar el negocio,
actualizar _KB + last_updated. Protegido con X-KB-Key (env KB_SHARED_SECRET_*; nunca hardcodear).
"""
from __future__ import annotations

import hmac
import os

from fastapi import APIRouter, Header, HTTPException

router = APIRouter()
CONTRACT_VERSION = "1.1"

_KB = {
    "contract_version": CONTRACT_VERSION,
    "last_updated": "2026-06-23T00:00:00Z",
    "business": {
        "name": "Habláh",
        "tagline": "Aprendé inglés hablando: un profe con IA que te escucha y te corrige por voz, en tiempo real.",
        "description": (
            "Habláh es una app para aprender inglés conversando por voz con un coach de inteligencia "
            "artificial. En lugar de ejercicios de texto, hablás y el profe te responde hablando, te "
            "corrige con naturalidad sin cortarte la charla, y adapta cada clase a tu nivel, tu edad y "
            "lo que ya practicaste. Tiene un modo para chicos, con un personaje guía, y un modo para "
            "adultos con temas reales."
        ),
        "industry": "Edtech / aprendizaje de idiomas por voz",
        "target_audience": (
            "Hispanohablantes que quieren hablar inglés de verdad: chicos (modo kids con personaje) y "
            "adultos (conversación por nivel, A0 a C2)."
        ),
        "website": "https://hablah.com.ar",
    },
    "offerings": [
        {
            "id": "clases-voz",
            "name": "Clases de conversación por voz",
            "description": (
                "El corazón de Habláh: una clase hablada con un coach de IA. Voz bidireccional en tiempo "
                "real (hablás y te responde hablando), no un chatbot de texto."
            ),
            "key_features": [
                "Conversación por voz en vivo, con micrófono",
                "El coach reacciona a lo que decís, no a un guion fijo",
                "Corrección por recast: te reformula bien sin señalar el error ni frenar la charla",
            ],
            "status": "available",
        },
        {
            "id": "motor-adaptativo",
            "name": "Motor pedagógico adaptativo",
            "description": (
                "Cada clase se arma según tu nivel (A0-C2), tu edad (chico, adolescente, adulto) y tu "
                "historia. Sube la dificultad de a poco (input comprensible) y baja la ansiedad."
            ),
            "key_features": [
                "Personalización por nivel y edad",
                "Dificultad calibrada un paso por encima de lo que ya sabés",
                "Filtro afectivo: celebra el intento, no te expone",
            ],
            "status": "available",
        },
        {
            "id": "modo-kids",
            "name": "Modo kids",
            "description": (
                "Clases lúdicas para chicos con un personaje guía, vocabulario adaptado a la edad y apoyo "
                "en español cuando hace falta, para que el chico hable sin frustrarse."
            ),
            "key_features": [
                "Personaje guía y dinámica de juego",
                "Vocabulario controlado por edad",
                "Andamiaje en español para arrancar desde cero",
            ],
            "status": "available",
        },
        {
            "id": "memoria-progreso",
            "name": "Memoria del alumno y progreso",
            "description": (
                "La clase retoma lo de las clases anteriores: el alumno vuelve y avanza sobre lo que ya "
                "practicó, en vez de empezar siempre de cero."
            ),
            "key_features": [
                "Retoma vocabulario y temas de clases previas",
                "Repaso espaciado de lo que cuesta",
                "El progreso se acumula clase a clase",
            ],
            "status": "available",
        },
    ],
    "pricing": {
        "model": "quote_only",
        "summary": "Consultá los planes con el equipo. El precio y la modalidad los cierra una persona, no se publican en automático.",
        "pricing_disclosed": False,
        "human_closes_price": True,
    },
    "differentiators": [
        "Voz real bidireccional: hablás y te responden hablando, no es un chatbot de texto.",
        "El profe te corrige sin cortarte (recast natural), para que no te frustres y sigas hablando.",
        "Cada clase se adapta a tu nivel, tu edad y lo que ya practicaste.",
        "Modo kids con personaje y juego; modo adultos con temas reales.",
        "La clase retoma lo de la vez pasada: el alumno vuelve y avanza.",
    ],
    "objections": [
        {
            "objection": "¿No es como Duolingo?",
            "response": "Duolingo es ejercicios de texto y tap. En Habláh HABLÁS y el coach te responde por voz, como una clase de conversación de verdad.",
        },
        {
            "objection": "Me da vergüenza hablar en inglés.",
            "response": "Por eso el coach baja la presión: celebra el intento, no te corta y arranca en tu idioma si hace falta. Hablás sin sentirte expuesto.",
        },
        {
            "objection": "¿Sirve para chicos?",
            "response": "Sí, hay un modo kids con un personaje guía y vocabulario adaptado a la edad, pensado para que el chico hable jugando.",
        },
        {
            "objection": "Arranco de cero, no sé nada de inglés.",
            "response": "Se puede empezar desde A0 con apoyo en español; el coach modela frases cortas y te invita a repetirlas a tu ritmo.",
        },
    ],
    "faq": [
        {"question": "¿En qué dispositivos funciona?", "answer": "En la web (hablah.com.ar), usando el micrófono del navegador."},
        {"question": "¿Qué niveles cubre?", "answer": "Desde A0 (cero) hasta C2."},
        {"question": "¿Necesito saber inglés para empezar?", "answer": "No. Arranca desde cero con apoyo en español y va subiendo de a poco."},
        {"question": "¿Hay clases para chicos y para adultos?", "answer": "Sí, hay un modo kids (con personaje) y un modo adultos (conversación por temas)."},
    ],
    "contact": {"website": "https://hablah.com.ar", "notes": "Contacto y planes a través del sitio."},
    "do_not_say": [
        "No prometer fluidez ni bilingüismo en un plazo determinado.",
        "No inventar precios, planes ni promociones.",
        "No afirmar certificaciones oficiales (TOEFL, Cambridge, etc.) salvo que el negocio lo confirme.",
        "No prometer que reemplaza a un profesor humano certificado.",
        "No inventar integraciones, dispositivos o funcionalidades que no existan.",
    ],
    "brand": {
        "colors": {"primary": "#002554", "accent": "#c9a45a"},
        "tone": "Cercano y motivador, de profe que te banca. Criollo rioplatense, cero jerga técnica.",
        "avoid": ["emojis", "promesas exageradas", "jerga técnica de programación"],
    },
    "screens": [
        {"label": "Inicio (landing)", "url": "https://hablah.com.ar", "route": "/"},
        {"label": "Modo kids", "url": "https://hablah.com.ar/kids", "route": "/kids"},
    ],
    "extra": {
        "platform": "FastAPI + React (Vite + Tailwind)",
        "deploy": "Heroku (backend) + Netlify (frontend)",
        "api_url": "https://hablah-api-abcaf6c43a5d.herokuapp.com",
        "voice_engine": "Gemini Live (coach de voz en tiempo real)",
    },
}


def _secrets() -> list[str]:
    """Lazy: NO leer a import-time (un KeyError tumbaría toda la app en el deploy)."""
    names = ("KB_SHARED_SECRET_SALESBOT", "KB_SHARED_SECRET_MEDIASTUDIO")
    return [v for v in (os.environ.get(n) for n in names) if v]


def _check_key(x_kb_key: str | None) -> None:
    secrets = _secrets()
    if not secrets:                          # falla SOLO este endpoint, no el proceso
        raise HTTPException(status_code=503, detail="KB secrets not configured")
    if not x_kb_key:                         # falta o vacío -> 401 (sin comparar)
        raise HTTPException(status_code=401, detail="missing X-KB-Key")
    ok = False                               # time-safe: comparar contra TODOS, sin cortar
    for s in secrets:
        ok = hmac.compare_digest(x_kb_key, s) or ok
    if not ok:
        raise HTTPException(status_code=403, detail="invalid X-KB-Key")


@router.get("/health")
def kb_health():
    return {"status": "ok", "contract_version": CONTRACT_VERSION, "kb_last_updated": _KB["last_updated"]}


@router.get("")
def kb(x_kb_key: str | None = Header(default=None, alias="X-KB-Key")):
    _check_key(x_kb_key)
    return _KB
