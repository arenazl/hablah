"""Biblioteca CORE de vocab visual para kids: sustantivos concretos compartidos entre
tópicos (animales, colores, comida, cuerpo, familia, números, casa, ropa, naturaleza,
transporte, juguetes). Es finita y reutilizable: el coach de kids juega dentro de este set.

Workaround de imágenes: cada palabra trae un EMOJI como visual v0 (cobertura ~total ya).
Las que tienen Lottie (perro, gato, león, oso, conejo, dino, superhéroe) lo usan como
visual 'premium'. Ilustraciones reales = batch posterior (asset_file).
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

L = "/animals/{}.json".format
# (word_en, word_es, category, emoji, asset_file|None)
VOCAB = [
    # animales
    ("dog", "perro", "animales", "🐶", L("perro")), ("cat", "gato", "animales", "🐱", L("gato")),
    ("lion", "león", "animales", "🦁", L("leon")), ("bear", "oso", "animales", "🐻", L("oso")),
    ("rabbit", "conejo", "animales", "🐰", L("conejo")), ("dinosaur", "dinosaurio", "animales", "🦕", L("dino")),
    ("elephant", "elefante", "animales", "🐘", None), ("monkey", "mono", "animales", "🐵", None),
    ("fish", "pez", "animales", "🐟", None), ("bird", "pájaro", "animales", "🐦", None),
    ("cow", "vaca", "animales", "🐮", None), ("horse", "caballo", "animales", "🐴", None),
    ("pig", "cerdo", "animales", "🐷", None), ("frog", "rana", "animales", "🐸", None),
    ("duck", "pato", "animales", "🦆", None), ("chicken", "gallina", "animales", "🐔", None),
    ("sheep", "oveja", "animales", "🐑", None), ("tiger", "tigre", "animales", "🐯", None),
    ("giraffe", "jirafa", "animales", "🦒", None), ("snake", "serpiente", "animales", "🐍", None),
    ("turtle", "tortuga", "animales", "🐢", None), ("whale", "ballena", "animales", "🐳", None),
    ("shark", "tiburón", "animales", "🦈", None), ("dolphin", "delfín", "animales", "🐬", None),
    ("octopus", "pulpo", "animales", "🐙", None), ("bee", "abeja", "animales", "🐝", None),
    ("butterfly", "mariposa", "animales", "🦋", None), ("penguin", "pingüino", "animales", "🐧", None),
    ("owl", "búho", "animales", "🦉", None), ("mouse", "ratón", "animales", "🐭", None),
    # colores
    ("red", "rojo", "colores", "🔴", None), ("blue", "azul", "colores", "🔵", None),
    ("green", "verde", "colores", "🟢", None), ("yellow", "amarillo", "colores", "🟡", None),
    ("orange", "naranja", "colores", "🟠", None), ("purple", "violeta", "colores", "🟣", None),
    ("pink", "rosa", "colores", "🌸", None), ("black", "negro", "colores", "⚫", None),
    ("white", "blanco", "colores", "⚪", None), ("brown", "marrón", "colores", "🟤", None),
    # comida
    ("apple", "manzana", "comida", "🍎", None), ("banana", "banana", "comida", "🍌", None),
    ("grapes", "uvas", "comida", "🍇", None), ("strawberry", "frutilla", "comida", "🍓", None),
    ("bread", "pan", "comida", "🍞", None), ("milk", "leche", "comida", "🥛", None),
    ("water", "agua", "comida", "💧", None), ("egg", "huevo", "comida", "🥚", None),
    ("cheese", "queso", "comida", "🧀", None), ("pizza", "pizza", "comida", "🍕", None),
    ("cake", "torta", "comida", "🍰", None), ("cookie", "galleta", "comida", "🍪", None),
    ("ice cream", "helado", "comida", "🍦", None), ("candy", "caramelo", "comida", "🍬", None),
    ("carrot", "zanahoria", "comida", "🥕", None), ("tomato", "tomate", "comida", "🍅", None),
    ("rice", "arroz", "comida", "🍚", None), ("juice", "jugo", "comida", "🧃", None),
    # cuerpo
    ("eye", "ojo", "cuerpo", "👁️", None), ("nose", "nariz", "cuerpo", "👃", None),
    ("mouth", "boca", "cuerpo", "👄", None), ("ear", "oreja", "cuerpo", "👂", None),
    ("hand", "mano", "cuerpo", "✋", None), ("foot", "pie", "cuerpo", "🦶", None),
    ("tooth", "diente", "cuerpo", "🦷", None), ("hair", "pelo", "cuerpo", "💇", None),
    # familia
    ("mom", "mamá", "familia", "👩", None), ("dad", "papá", "familia", "👨", None),
    ("baby", "bebé", "familia", "👶", None), ("sister", "hermana", "familia", "👧", None),
    ("brother", "hermano", "familia", "👦", None), ("grandma", "abuela", "familia", "👵", None),
    ("grandpa", "abuelo", "familia", "👴", None),
    # numeros
    ("one", "uno", "números", "1️⃣", None), ("two", "dos", "números", "2️⃣", None),
    ("three", "tres", "números", "3️⃣", None), ("four", "cuatro", "números", "4️⃣", None),
    ("five", "cinco", "números", "5️⃣", None), ("six", "seis", "números", "6️⃣", None),
    ("seven", "siete", "números", "7️⃣", None), ("eight", "ocho", "números", "8️⃣", None),
    ("nine", "nueve", "números", "9️⃣", None), ("ten", "diez", "números", "🔟", None),
    # casa
    ("house", "casa", "casa", "🏠", None), ("door", "puerta", "casa", "🚪", None),
    ("bed", "cama", "casa", "🛏️", None), ("chair", "silla", "casa", "🪑", None),
    ("window", "ventana", "casa", "🪟", None), ("key", "llave", "casa", "🔑", None),
    ("clock", "reloj", "casa", "🕐", None), ("lamp", "lámpara", "casa", "💡", None),
    # ropa
    ("shirt", "remera", "ropa", "👕", None), ("pants", "pantalón", "ropa", "👖", None),
    ("shoes", "zapatos", "ropa", "👟", None), ("hat", "sombrero", "ropa", "🎩", None),
    ("socks", "medias", "ropa", "🧦", None), ("dress", "vestido", "ropa", "👗", None),
    ("jacket", "campera", "ropa", "🧥", None),
    # naturaleza / clima
    ("sun", "sol", "naturaleza", "☀️", None), ("moon", "luna", "naturaleza", "🌙", None),
    ("star", "estrella", "naturaleza", "⭐", None), ("cloud", "nube", "naturaleza", "☁️", None),
    ("rain", "lluvia", "naturaleza", "🌧️", None), ("tree", "árbol", "naturaleza", "🌳", None),
    ("flower", "flor", "naturaleza", "🌸", None), ("snow", "nieve", "naturaleza", "❄️", None),
    ("rainbow", "arcoíris", "naturaleza", "🌈", None), ("fire", "fuego", "naturaleza", "🔥", None),
    ("leaf", "hoja", "naturaleza", "🍃", None), ("mountain", "montaña", "naturaleza", "⛰️", None),
    # transporte
    ("car", "auto", "transporte", "🚗", None), ("bus", "colectivo", "transporte", "🚌", None),
    ("train", "tren", "transporte", "🚆", None), ("plane", "avión", "transporte", "✈️", None),
    ("boat", "barco", "transporte", "⛵", None), ("bike", "bici", "transporte", "🚲", None),
    ("truck", "camión", "transporte", "🚚", None), ("rocket", "cohete", "transporte", "🚀", None),
    # juguetes / objetos
    ("ball", "pelota", "juguetes", "⚽", None), ("teddy bear", "osito", "juguetes", "🧸", None),
    ("book", "libro", "juguetes", "📖", None), ("balloon", "globo", "juguetes", "🎈", None),
    ("gift", "regalo", "juguetes", "🎁", None), ("drum", "tambor", "juguetes", "🥁", None),
    ("guitar", "guitarra", "juguetes", "🎸", None), ("superhero", "superhéroe", "juguetes", "🦸", L("superheroe")),
]


def main() -> None:
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    conn = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx, cursorclass=DictCursor, charset="utf8mb4")
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS kids_visual_vocab (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        word_en VARCHAR(40) NOT NULL UNIQUE, word_es VARCHAR(40) NOT NULL,
        category VARCHAR(30) NOT NULL, emoji VARCHAR(16) NOT NULL,
        asset_file VARCHAR(80) NULL, active BOOLEAN NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    for en, es, cat, emoji, asset in VOCAB:
        cur.execute("""INSERT INTO kids_visual_vocab (word_en, word_es, category, emoji, asset_file)
                       VALUES (%s,%s,%s,%s,%s)
                       ON DUPLICATE KEY UPDATE word_es=VALUES(word_es), category=VALUES(category),
                       emoji=VALUES(emoji), asset_file=VALUES(asset_file)""", (en, es, cat, emoji, asset))
    conn.commit()
    cur.execute("SELECT category, COUNT(*) n FROM kids_visual_vocab GROUP BY category ORDER BY n DESC")
    by = cur.fetchall()
    cur.execute("SELECT COUNT(*) n FROM kids_visual_vocab")
    tot = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) n FROM kids_visual_vocab WHERE asset_file IS NOT NULL")
    prem = cur.fetchone()["n"]
    print(f"biblioteca kids_visual_vocab: {tot} palabras · {prem} con Lottie premium · resto con emoji (cobertura visual 100%)")
    for r in by:
        print(f"  {r['category']}: {r['n']}")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()
