"""Endpoint del onboarding interactivo de globos.

Devuelve un arbol de 3 niveles: categorias -> subcategorias -> topics.
Subcategorias son pre-armadas (rapidas, fiables). Topics vienen del catalogo
filtrados por keyword/categoria.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.template import Topic
from models.user import User

router = APIRouter()


# Subcategorias hardcoded por categoria. Cada subcategoria define keywords
# para matchear topics del catalogo.
SUBCATEGORIES: dict[str, list[dict]] = {
    "arte": [
        {"slug": "musica",       "title": "Música",            "match": ["musica", "music", "ableton", "rock", "garage", "electrónica"]},
        {"slug": "cine",         "title": "Cine y series",     "match": ["cine", "pelicula", "movie", "serie", "stream", "drama", "pulp"]},
        {"slug": "gaming",       "title": "Videojuegos",       "match": ["videojuego", "game", "indie", "aaa", "gaming"]},
        {"slug": "comedia",      "title": "Stand-up",          "match": ["comedia", "stand-up", "humor"]},
        {"slug": "literatura",   "title": "Literatura",        "match": ["libro", "literatura", "novela", "poesia"]},
    ],
    "tech": [
        {"slug": "software",     "title": "Arquitectura software", "match": ["arquitectura", "software", "monolith", "microservic"]},
        {"slug": "ia",           "title": "IA y ética",         "match": ["ia", "ai", "ética", "generativa", "alignment"]},
        {"slug": "gadgets",      "title": "Gadgets y hardware", "match": ["gadget", "hardware", "device"]},
        {"slug": "web",          "title": "Desarrollo web",     "match": ["web", "frontend", "backend", "javascript"]},
    ],
    "lifestyle": [
        {"slug": "fitness",      "title": "Entrenamiento",      "match": ["fuerza", "powerlifting", "fitness", "running", "deadlift"]},
        {"slug": "nutricion",    "title": "Nutrición",          "match": ["nutricion", "dieta", "macro", "comida sana"]},
        {"slug": "mindfulness",  "title": "Meditación",         "match": ["meditacion", "mindfulness", "yoga", "respiracion"]},
        {"slug": "moda",         "title": "Moda",                "match": ["moda", "streetwear", "sneaker", "estilo"]},
        {"slug": "trabajo",      "title": "Trabajo remoto",      "match": ["remoto", "nomade", "freelance"]},
    ],
    "negocios": [
        {"slug": "startup",      "title": "Emprender",          "match": ["startup", "emprend", "founder", "early-stage"]},
        {"slug": "agile",        "title": "Métodos ágiles",     "match": ["agile", "scrum", "sprint", "retrospect"]},
        {"slug": "inversion",    "title": "Inversiones",        "match": ["invers", "stock", "crypto", "finan"]},
    ],
    "viajes": [
        {"slug": "aeropuertos",  "title": "Aeropuertos",        "match": ["aeropuerto", "boarding", "gate", "layover"]},
        {"slug": "destinos",     "title": "Destinos",           "match": ["destino", "ciudad", "playa", "mountain"]},
        {"slug": "cultura",      "title": "Cultura local",      "match": ["cultura", "local", "tradicion"]},
    ],
    "deportes": [
        {"slug": "futbol",       "title": "Fútbol",             "match": ["futbol", "football", "mundial", "seleccion"]},
        {"slug": "basket",       "title": "Básquet",            "match": ["basket", "nba"]},
        {"slug": "tenis",        "title": "Tenis",               "match": ["tenis", "tennis", "grand slam"]},
    ],
    "gastronomia": [
        {"slug": "asado",        "title": "Asado y parrilla",   "match": ["asado", "parrilla", "carne", "grill"]},
        {"slug": "cafe",         "title": "Café",                "match": ["cafe", "coffee", "barista"]},
        {"slug": "cocina",       "title": "Cocinar en casa",    "match": ["cocina", "receta", "ingrediente"]},
    ],
    "ciencia": [
        {"slug": "clima",        "title": "Clima",               "match": ["clima", "climatico", "weather"]},
        {"slug": "espacio",      "title": "Espacio",             "match": ["espacio", "space", "nasa", "marte"]},
        {"slug": "biologia",     "title": "Biología",            "match": ["biolog", "celula", "genet"]},
    ],
}


# Categorias visibles en el onboarding (iconos se mapean en el frontend por slug)
CATEGORIES = [
    {"slug": "arte",        "title": "Arte y cultura",  "color": "#5B21B6"},
    {"slug": "tech",        "title": "Tecnología",      "color": "#1E4FB0"},
    {"slug": "lifestyle",   "title": "Lifestyle",       "color": "#008F63"},
    {"slug": "deportes",    "title": "Deportes",        "color": "#C2410C"},
    {"slug": "gastronomia", "title": "Gastronomía",     "color": "#B91C1C"},
    {"slug": "viajes",      "title": "Viajes",          "color": "#3B82F6"},
    {"slug": "negocios",    "title": "Negocios",        "color": "#0E1614"},
    {"slug": "ciencia",     "title": "Ciencia",         "color": "#0891B2"},
]


@router.get("/categories")
async def get_categories(
    current: User = Depends(get_current_user),
):
    """Devuelve solo el nivel 1: las 8 categorías con icono+color."""
    return {"categories": CATEGORIES}


@router.get("/subcategories/{category_slug}")
async def get_subcategories(
    category_slug: str,
    current: User = Depends(get_current_user),
):
    """Devuelve nivel 2: subcategorías de una categoría dada."""
    subs = SUBCATEGORIES.get(category_slug, [])
    return {"category": category_slug, "subcategories": subs}


@router.get("/topics/{category_slug}/{subcategory_slug}")
async def get_topics(
    category_slug: str,
    subcategory_slug: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Devuelve nivel 3: topics del catalogo que matchean la subcategoria."""
    subs = SUBCATEGORIES.get(category_slug, [])
    sub = next((s for s in subs if s["slug"] == subcategory_slug), None)
    if not sub:
        return {"topics": []}

    # Traer topics de esa categoria
    result = await db.execute(
        select(Topic).where(Topic.category == category_slug, Topic.is_active == True)
    )
    all_topics = result.scalars().all()

    # Filtrar por match de keywords con title/keywords del topic
    match_terms = [m.lower() for m in sub.get("match", [])]
    matched = []
    for t in all_topics:
        title_lower = (t.title or "").lower()
        keywords_text = " ".join([str(k).lower() for k in (t.keywords or [])])
        haystack = f"{title_lower} {keywords_text}"
        if any(m in haystack for m in match_terms):
            matched.append({
                "id": t.id,
                "slug": t.slug,
                "title": t.title,
                "category": t.category,
                "is_hot": t.is_hot,
            })

    # Si no matchea ninguno, devolver hasta 6 de la categoria como fallback
    if not matched:
        matched = [{
            "id": t.id, "slug": t.slug, "title": t.title,
            "category": t.category, "is_hot": t.is_hot,
        } for t in all_topics[:6]]

    return {"topics": matched[:8]}
