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


# Categorias amplias para que sirvan a chicos y adultos por igual
CATEGORIES = [
    {"slug": "musica",       "title": "Música",            "color": "#5B21B6"},
    {"slug": "peliculas",    "title": "Películas y series", "color": "#7C3AED"},
    {"slug": "deportes",     "title": "Deportes",          "color": "#C2410C"},
    {"slug": "videojuegos",  "title": "Videojuegos",       "color": "#DB2777"},
    {"slug": "comida",       "title": "Comida",            "color": "#B91C1C"},
    {"slug": "animales",     "title": "Animales",          "color": "#65A30D"},
    {"slug": "naturaleza",   "title": "Naturaleza",        "color": "#16A34A"},
    {"slug": "viajes",       "title": "Viajes",            "color": "#3B82F6"},
    {"slug": "tech",         "title": "Tecnología",        "color": "#1E4FB0"},
    {"slug": "ciencia",      "title": "Ciencia",           "color": "#0891B2"},
    {"slug": "arte",         "title": "Arte y cultura",    "color": "#8B5CF6"},
    {"slug": "historia",     "title": "Historia",          "color": "#8A5A00"},
    {"slug": "libros",       "title": "Libros",            "color": "#92400E"},
    {"slug": "fitness",      "title": "Fitness y bienestar","color": "#10B981"},
    {"slug": "familia",      "title": "Familia y vida",    "color": "#F472B6"},
    {"slug": "trabajo",      "title": "Trabajo y carrera", "color": "#0E1614"},
    {"slug": "emprender",    "title": "Emprender",         "color": "#475569"},
    {"slug": "fotografia",   "title": "Fotografía",        "color": "#0EA5E9"},
    {"slug": "autos",        "title": "Autos y motos",     "color": "#374151"},
    {"slug": "moda",         "title": "Moda y estilo",     "color": "#EC4899"},
]


@router.get("/categories")
async def get_categories(
    current: User = Depends(get_current_user),
):
    """Devuelve solo el nivel 1: las 8 categorías con icono+color."""
    return {"categories": CATEGORIES}


# Mapping de categorias amplias -> categorias internas del modelo Topic.
# Si la categoria amplia no matchea ninguna interna, devolvemos topics dummy
# generados a partir del titulo de la categoria (para que siempre haya algo).
CATEGORY_ALIASES: dict[str, list[str]] = {
    "musica":      ["arte"],
    "peliculas":   ["arte"],
    "videojuegos": ["arte"],
    "deportes":    ["deportes"],
    "comida":      ["gastronomia"],
    "animales":    ["lifestyle", "ciencia"],
    "naturaleza":  ["viajes", "ciencia"],
    "viajes":      ["viajes"],
    "tech":        ["tech"],
    "ciencia":     ["ciencia"],
    "arte":        ["arte"],
    "historia":    ["arte"],
    "libros":      ["arte"],
    "fitness":     ["lifestyle"],
    "familia":     ["lifestyle"],
    "trabajo":     ["negocios", "tech"],
    "emprender":   ["negocios"],
    "fotografia":  ["arte"],
    "autos":       ["lifestyle"],
    "moda":        ["lifestyle"],
}

# Topics genericos por categoria amplia (siempre 6, niveles A0-B2 friendly).
# Se devuelven SIEMPRE — el seed_quick_users no garantiza que el catalogo
# tenga topics que matcheen perfecto, asi que aseguramos contenido fresco.
FALLBACK_TOPICS_BY_CATEGORY: dict[str, list[str]] = {
    "musica":      ["Mi banda favorita", "Música para entrenar", "Géneros que descubrí", "Conciertos memorables", "Aprender un instrumento", "Música y emociones"],
    "peliculas":   ["Una peli que me marcó", "Series para maratonear", "Géneros favoritos", "Personajes inolvidables", "Bandas sonoras", "Cine vs. streaming"],
    "deportes":    ["Mi deporte favorito", "Equipos que sigo", "Un partido inolvidable", "Hacer deporte vs mirarlo", "Ídolos del deporte", "Cómo empecé a practicar"],
    "videojuegos": ["Un juego que no pude soltar", "Multiplayer vs single", "Mi consola", "Indie vs AAA", "Speedruns y secretos", "Historias en videojuegos"],
    "comida":      ["Mi comida favorita", "Cocinar en casa", "Restaurantes memorables", "Postres que amo", "Comida típica de mi país", "Dietas y hábitos"],
    "animales":    ["Mi mascota", "Animales salvajes", "Especies en peligro", "Animales del zoológico", "Animales graciosos", "Cuidar mascotas"],
    "naturaleza":  ["Lugares al aire libre", "Montañas y caminatas", "Playas favoritas", "Bosques y selvas", "Plantas y jardines", "Cambio climático"],
    "viajes":      ["Mi viaje favorito", "Ciudades que quiero conocer", "Comida en viajes", "Anécdotas de aeropuertos", "Mochilero vs hotel", "Viajar solo o acompañado"],
    "tech":        ["Apps que uso todos los días", "Inteligencia artificial", "Gadgets favoritos", "Redes sociales", "Programar y aprender a codear", "Privacidad online"],
    "ciencia":     ["Una curiosidad de la ciencia", "El espacio", "El cuerpo humano", "Inventos que cambiaron todo", "Experimentos caseros", "Ciencia en la escuela"],
    "arte":        ["Un artista que admiro", "Visitar museos", "Pintura vs digital", "Arte callejero", "Crear arte propio", "Arte y emociones"],
    "historia":    ["Una época que me fascina", "Personajes históricos", "Historia de mi país", "Civilizaciones antiguas", "La Segunda Guerra", "Aprender historia hoy"],
    "libros":      ["Un libro que me marcó", "Géneros favoritos", "Libros vs películas", "Autores que sigo", "Leer en papel o digital", "Recomendar un libro"],
    "fitness":     ["Mi rutina de ejercicio", "Empezar a entrenar", "Yoga y mindfulness", "Nutrición básica", "Correr para principiantes", "Cuidar la salud mental"],
    "familia":     ["Mi familia", "Recuerdos de infancia", "Tradiciones familiares", "Hermanos y padres", "Tener hijos", "Reuniones familiares"],
    "trabajo":     ["Mi trabajo actual", "Trabajo remoto", "Profesiones que me gustaron", "Equilibrio vida-trabajo", "Cambio de carrera", "Primer día de trabajo"],
    "emprender":   ["Una idea de negocio", "Empezar un proyecto", "Fracasos que enseñan", "Marketing personal", "Trabajo en equipo", "Mi mentor"],
    "fotografia":  ["Mi última foto favorita", "Celular vs cámara", "Paisajes vs retratos", "Edición de fotos", "Fotos de viaje", "Instagram y fotografía"],
    "autos":       ["Mi auto soñado", "Aprender a manejar", "Autos eléctricos", "Motos vs autos", "Viajes en ruta", "Cuidar el auto"],
    "moda":        ["Mi estilo personal", "Marcas favoritas", "Sneakers y accesorios", "Comprar online", "Vintage vs moderno", "Moda y identidad"],
}


@router.get("/topics/{category_slug}")
async def get_topics(
    category_slug: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Devuelve topics directamente para una categoria amplia.

    Estrategia:
    1) Intenta traer topics del catalogo cuya categoria interna matchee.
    2) Si encontró pocos, completa con titulos genericos del fallback.
    3) Devuelve hasta 8 topics. Los del catalogo tienen id real; los fallback
       tienen id negativo y al hacer click se crean on-the-fly.
    """
    aliases = CATEGORY_ALIASES.get(category_slug, [category_slug])
    result = await db.execute(
        select(Topic).where(Topic.category.in_(aliases), Topic.is_active == True).limit(6)
    )
    catalog_topics = result.scalars().all()

    topics_out = [{
        "id": t.id, "slug": t.slug, "title": t.title,
        "category": category_slug, "is_hot": t.is_hot, "is_fallback": False,
    } for t in catalog_topics]

    # Completar con fallback hasta llegar a 6
    fallback_titles = FALLBACK_TOPICS_BY_CATEGORY.get(category_slug, [])
    existing_titles = {t["title"].lower() for t in topics_out}
    for title in fallback_titles:
        if len(topics_out) >= 6:
            break
        if title.lower() not in existing_titles:
            topics_out.append({
                "id": -1, "slug": "", "title": title,
                "category": category_slug, "is_hot": False, "is_fallback": True,
            })

    return {"topics": topics_out[:6]}


@router.post("/add-fallback-topic")
async def add_fallback_topic(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Crea un topic real desde un fallback y lo agrega como interes del user."""
    from sqlalchemy import insert
    from models.template import UserInterest

    title = (body.get("title") or "").strip()
    category = body.get("category") or "general"
    if not title:
        return {"error": "missing title"}

    slug = title.lower().replace(" ", "-").replace("ñ", "n").replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")[:80]

    # Buscar si ya existe (por slug)
    existing = (await db.execute(select(Topic).where(Topic.slug == slug))).scalar_one_or_none()
    if existing:
        topic = existing
    else:
        topic = Topic(
            slug=slug or f"topic-{abs(hash(title))}",
            title=title,
            category=category,
            seed_prompts={},
            keywords=[],
            levels=["A1","A2","B1","B2"],
            is_active=True,
        )
        db.add(topic)
        await db.commit()
        await db.refresh(topic)

    # Agregar como interes (idempotente)
    existing_interest = (await db.execute(
        select(UserInterest).where(UserInterest.user_id == current.id, UserInterest.topic_id == topic.id)
    )).scalar_one_or_none()
    if not existing_interest:
        # position = ultimo + 1
        last_pos = (await db.execute(
            select(UserInterest.position).where(UserInterest.user_id == current.id).order_by(UserInterest.position.desc()).limit(1)
        )).scalar_one_or_none()
        db.add(UserInterest(
            user_id=current.id,
            topic_id=topic.id,
            position=(last_pos or 0) + 1,
        ))
        await db.commit()

    return {"topic_id": topic.id, "slug": topic.slug, "title": topic.title}
