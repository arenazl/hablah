"""Trae 1 foto de portada de Pexels para cada tópico sin image_url.

Calcado de FenixParser/backend/scripts/fetch_show_images.py, adaptado al
catálogo de tópicos: alimenta las cards de la pantalla Practicar (design
handoff v2), donde cada tópico entra con su foto.

Estrategia de query:
- Override manual por slug (QUERY_OVERRIDES) para los que la query genérica
  resuelve mal.
- Si no, se arma con las keywords del tópico + un sufijo por categoría, que
  es lo que le da el "clima" visual correcto (ej. tech -> "technology").
- Último recurso: el título del tópico tal cual.

Las fotos son de STOCK y representan el CLIMA del tópico, no una foto literal.
image_credit es obligatorio: la licencia de Pexels pide atribución al autor.

PEXELS_API_KEY se lee del backend/.env (está en .env.master).

Uso:
    python scripts/fetch_topic_images.py            # sólo los que no tienen
    python scripts/fetch_topic_images.py --force    # re-fetch de todos
    python scripts/fetch_topic_images.py --limit 10 # probar con pocos
    python scripts/fetch_topic_images.py --dry-run  # no escribe en la BD
"""
import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

# Windows: aiomysql + SSL rompe sobre el event loop Proactor (WinError 87 en el
# handshake). El selector loop es el que usa el resto de los scripts del repo.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# La consola de Windows es cp1252: un crédito con caracteres fuera de esa tabla
# (nombres vietnamitas, cirílicos, etc.) tiraba UnicodeEncodeError en el print y
# cortaba el batch entero a mitad de camino.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import select, update  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402
from models.template import Topic  # noqa: E402

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PEXELS_URL = "https://api.pexels.com/v1/search"

# Sufijo por categoría: le da el clima visual correcto a la búsqueda.
# Las claves salen de topics.category del catálogo real.
CATEGORY_HINTS = {
    "tech": "technology workspace",
    "tecnologia": "technology workspace",
    "arte": "art creative",
    "musica": "music concert",
    "lifestyle": "lifestyle daily life",
    "deportes": "sports action",
    "ciencia": "science laboratory",
    "viajes": "travel destination",
    "gastronomia": "food gastronomy",
    "negocios": "business office",
    "entretenimiento": "entertainment culture",
    "fitness": "fitness training",
    "diseno": "design architecture",
    "kids": "children colorful illustration",
}

# Override manual por slug, para los tópicos donde la query genérica trae
# cualquier cosa. Se completa a mano a medida que se revisan los resultados.
QUERY_OVERRIDES: dict[str, str] = {}


def build_query(topic: Topic) -> str:
    """Arma la query de Pexels para un tópico.

    OJO: NO se usan topics.keywords. En este catálogo las keywords son
    fragmentos conversacionales que el motor le pasa al coach ("I usually
    start with", "double-edged sword we should be careful with"), no términos
    de búsqueda — daban fotos sin relación. El título sí es descriptivo.
    """
    if topic.slug in QUERY_OVERRIDES:
        return QUERY_OVERRIDES[topic.slug]

    # El título suele venir como "Tema principal · matiz". Para buscar alcanza
    # la parte principal; el matiz agrega ruido.
    titulo = (topic.title or "").split("·")[0].strip()
    hint = CATEGORY_HINTS.get((topic.category or "").lower(), "")
    return f"{titulo} {hint}".strip()


async def fetch_pexels(query: str) -> tuple[str, str] | None:
    if not PEXELS_API_KEY:
        print("PEXELS_API_KEY no está seteada en backend/.env")
        return None
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": query, "per_page": 5, "orientation": "landscape"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(PEXELS_URL, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
            photos = data.get("photos", [])
            if not photos:
                return None
            p = photos[0]
            # "large" alcanza: la card la muestra a 78px de alto.
            src = p["src"].get("large") or p["src"].get("medium") or p["src"].get("original")
            credit = f"{p.get('photographer', 'Pexels')} / Pexels"
            return (src, credit)
    except Exception as e:
        print(f"  pexels error para '{query}': {e}")
        return None


async def main(force: bool = False, limit: int | None = None, dry_run: bool = False):
    if not PEXELS_API_KEY:
        print("Falta PEXELS_API_KEY en backend/.env (está en .env.master)")
        return

    async with AsyncSessionLocal() as db:
        r = await db.execute(
            select(Topic).where(Topic.is_active.is_(True)).order_by(Topic.id)
        )
        topics = list(r.scalars().all())

    pendientes = [t for t in topics if force or not t.image_url]
    if limit:
        pendientes = pendientes[:limit]

    print(f"{len(topics)} tópicos activos · {len(pendientes)} a procesar"
          f"{' (DRY RUN)' if dry_run else ''}")

    ok = 0
    for t in pendientes:
        query = build_query(t)
        print(f"[fetch] id={t.id} {t.title} -> '{query}'")
        result = await fetch_pexels(query)
        if not result:
            print("  sin resultado")
            continue
        url, credit = result
        if not dry_run:
            async with AsyncSessionLocal() as db2:
                await db2.execute(
                    update(Topic).where(Topic.id == t.id)
                    .values(image_url=url, image_credit=credit)
                )
                await db2.commit()
        ok += 1
        print(f"  OK -> {url[:80]}  ({credit})")
        # Pexels: 200 req/hora. 0.3s entre llamadas alcanza de sobra.
        await asyncio.sleep(0.3)

    print(f"\nlisto: {ok}/{len(pendientes)} con imagen")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--force", action="store_true", help="re-fetch incluso si ya hay imagen")
    p.add_argument("--limit", type=int, default=None, help="procesar sólo los primeros N")
    p.add_argument("--dry-run", action="store_true", help="no escribe en la BD")
    args = p.parse_args()
    asyncio.run(main(args.force, args.limit, args.dry_run))
