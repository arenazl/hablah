"""
Cura de tópicos adultos — desactiva sub-temas, nichos y duplicados.
Criterio (SLA): un buen tópico genera 10-15 min de conversación natural,
tiene amplitud y está anclado a la vida del alumno.

Backup: guarda el estado anterior en _backup_curar_topicos.json.
Reversión: python curar_topicos.py --revert _backup_curar_topicos.json
"""
import json
import os
import sys
import argparse
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

# ── IDs a desactivar (adultos: sub-temas, nichos, duplicados) ────────────────
DESACTIVAR = [
    # Demasiado técnico/nicho profesional
    2,   # Arquitectura de software
    3,   # Producción musical — Ableton
    5,   # Entrenamiento de fuerza — powerlifting
    6,   # Metodologías ágiles — retrospectivas
    7,   # Cine de los 90 — Tarantino (muy específico, hay tópicos mejores de cine)
    8,   # Anécdotas de aeropuertos (bajo valor conversacional)
    16,  # Café de especialidad — v60, espresso
    28,  # Entrevistas técnicas — system design
    29,  # Emprender — early-stage startup

    # Deportes específicos (queda el general: 9=Fútbol, 49=Mi deporte, 50=Mi equipo, 52=Ídolos)
    10,  # Básquet — NBA y leyendas
    11,  # Running — entrenamiento y maratones
    12,  # Tenis — Grand Slam y rivalidades
    13,  # Fórmula 1 y automovilismo
    53,  # Hacer deporte vs mirarlo
    54,  # Reglas raras o injustas
    55,  # Doping y ética
    56,  # El negocio del deporte

    # Comida específica (queda: 15=Asado, 65=Mi comida, 66=Cocinar en casa, 69=Comida típica, 71=Cocinar para otros)
    14,  # Cocina italiana — pasta y vinos
    67,  # Una receta que aprendí
    68,  # Restaurantes memorables
    70,  # Dietas y modas (queda 25 = Nutrición — dietas y mitos)
    72,  # Sostenibilidad y comida (queda 125 = Fast fashion + medio ambiente)

    # Música sub-temas (queda: 33=Mi banda, 34=Conciertos, 36=Aprender instrumento, 39=Música y emociones)
    22,  # Rock clásico — 70s a 90s
    35,  # Música para entrenar
    37,  # Géneros que descubrí
    38,  # Un álbum entero, no playlists
    40,  # Streaming vs comprar música

    # Cine/series sub-temas (queda: 20=Series streaming, 41=Una peli, 44=Libro vs película, 46=Cine vs streaming, 47=Géneros que evito)
    42,  # Una serie que no pude parar (overlap con 20)
    43,  # Personajes inolvidables
    45,  # Spoilers y cómo manejarlos
    48,  # Premios y críticos: ¿importan?

    # Gaming sub-temas (queda: 21=Videojuegos indie/AAA, 57=El juego del momento, 59=Jugar con amigos)
    58,  # Console wars
    60,  # Speedruns y secretos
    61,  # Indies vs AAA (duplicado de 21)
    62,  # Historias en videojuegos
    63,  # Esports: ¿deporte real?
    64,  # Videojuegos como arte

    # Animales sub-temas (queda: 73=Mi mascota, 74=Animales raros, 76=Animales en peligro)
    75,  # Tener mascota: ¿sí o no?
    77,  # Inteligencia animal
    78,  # Mascotas exóticas: ¿está bien?
    79,  # Bienestar animal
    80,  # Animales en la ciencia

    # Ciencia — duplicados y overlap (queda: 17=Espacio astronomía, 18=Cambio climático, 96=Una curiosidad científica)
    19,  # Biología — evolución y genética (overlap con 96)
    97,  # El espacio (duplicado de 17)
    98,  # El cuerpo humano (overlap salud)
    99,  # Cambio climático (duplicado de 18)
    100, # Inventos que cambiaron todo (demasiado vago)
    101, # Vida en otros planetas (sub-tema de 17)
    102, # Genética y ética (overlap 19 + 4)
    103, # Pseudociencia vs ciencia

    # Arte sub-temas (queda: 104=Un artista que admiro, 108=Crear arte propio)
    105, # Visitar museos
    106, # Arte digital vs tradicional
    107, # Arte callejero
    109, # Arte y dinero
    110, # NFTs y arte digital
    111, # Censura en el arte

    # Salud sub-temas (queda: 112=Mi rutina, 113=Empezar a entrenar, 116=Salud mental, 24=Meditación)
    114, # Yoga y meditación (overlap con 24)
    115, # Nutrición básica (duplicado de 25)
    117, # Running para principiantes (overlap 11+113)
    118, # Suplementos: ¿sí o no?
    119, # Cuerpo ideal y presión social

    # Moda sub-temas (queda: 120=Mi estilo personal, 125=Fast fashion)
    26,  # Moda — streetwear y sneakers (overlap 120-127)
    121, # Marcas favoritas
    122, # Sneakers
    123, # Comprar moda online
    124, # Vintage vs moderno
    126, # Moda sostenible
    127, # Moda y género

    # Duplicados / mal clasificados como adult
    95,  # Ética en tecnología (duplicado de 4 IA generativa — ética)
    136, # Cómo me siento (adult — duplicado del kid 150)
]

# ── Tópicos kids mal marcados como adult (fix de audience/segmento) ──────────
FIX_KIDS = {
    128: {"audience": "kid", "segmento": "junior"},   # Dinosaurios
    129: {"audience": "kid", "segmento": "junior"},   # Espacio
    130: {"audience": "kid", "segmento": "junior"},   # Mar y animales
    131: {"audience": "kid", "segmento": "junior"},   # Mi deporte
    132: {"audience": "kid", "segmento": "junior"},   # Dibujar y crear
    133: {"audience": "kid", "segmento": "mini"},     # Música y canciones
    134: {"audience": "kid", "segmento": "mini"},     # Mascotas
}


def get_conn():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"],
        ssl={"ca": None},
        cursorclass=DictCursor,
        charset="utf8mb4",
    )


def backup(conn, path):
    with conn.cursor() as cur:
        ids = list(DESACTIVAR) + list(FIX_KIDS.keys())
        fmt = ",".join(["%s"] * len(ids))
        cur.execute(f"SELECT id, title, is_active, audience, segmento FROM topics WHERE id IN ({fmt})", ids)
        rows = cur.fetchall()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2, default=str)
    print(f"Backup guardado en {path}")


def aplicar(conn):
    with conn.cursor() as cur:
        # Desactivar
        fmt = ",".join(["%s"] * len(DESACTIVAR))
        cur.execute(f"UPDATE topics SET is_active=0 WHERE id IN ({fmt})", DESACTIVAR)
        desact = cur.rowcount

        # Fix audiencia kids
        for tid, vals in FIX_KIDS.items():
            cur.execute(
                "UPDATE topics SET audience=%s, segmento=%s WHERE id=%s",
                (vals["audience"], vals["segmento"], tid),
            )

        # Stats finales
        cur.execute("SELECT COUNT(*) as n FROM topics WHERE is_active=1 AND audience='adult'")
        adultos = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) as n FROM topics WHERE is_active=1 AND audience='kid'")
        kids = cur.fetchone()["n"]

    conn.commit()
    print(f"Desactivados: {desact} tópicos adultos")
    print(f"Audiencia corregida: {len(FIX_KIDS)} topicos (adult->kid)")
    print(f"Activos ahora: {adultos} adultos + {kids} kids = {adultos+kids} total")


def revertir(conn, path):
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    with conn.cursor() as cur:
        for r in rows:
            cur.execute(
                "UPDATE topics SET is_active=%s, audience=%s, segmento=%s WHERE id=%s",
                (r["is_active"], r["audience"], r["segmento"], r["id"]),
            )
    conn.commit()
    print(f"Revertidos {len(rows)} tópicos desde {path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", help="JSON de backup para revertir")
    args = parser.parse_args()

    conn = get_conn()
    backup_path = os.path.join(
        os.path.dirname(__file__),
        f"_backup_curar_topicos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )

    if args.revert:
        revertir(conn, args.revert)
    else:
        backup(conn, backup_path)
        aplicar(conn)

    conn.close()
