"""Re-cura topic_suggested_band con gradiente de EDAD por tópico (sentido común).

Los tópicos son simples disparadores de discusión. Lo que cambia es a qué EDAD
le sirve cada uno (NO el nivel A1/B2 — eso es otro eje). Modelo:

  cada tópico tiene una BANDA MÍNIMA = la edad más chica a la que le sirve.
  se sugiere desde esa banda hacia arriba (min_band .. 4).

  1 = early_child (primera infancia)   2 = child   3 = teen   4 = adult

Criterio: concreto/observable/lúdico = chico; abstracto/laboral/financiero/
relacional-adulto = grande. Curado por Claude; el profe ajusta a mano lo que
quiera (es un dato, no lógica).

Red de seguridad: corre en transacción, aborta si algún tópico de la BD quedó
sin asignar (o sobra un id), verifica que las bandas sean monótonas y que la
banda adulto cubra todo; commit sólo si cierra.
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

MAX_BAND = 4

# topic_id -> banda mínima (1 early_child / 2 child / 3 teen / 4 adult)
TOPIC_MIN: dict[int, int] = {
    # ═══ CAT 1 Espacio y ciencia ═══
    # Astronomía
    2: 1, 3: 2, 16: 1, 17: 1, 18: 1, 19: 3, 20: 1, 21: 1, 22: 2, 23: 2, 24: 2, 25: 2,
    # Prehistoria (dinos = oro para los chicos)
    1: 1, 26: 1, 27: 2, 28: 2, 29: 1, 30: 1, 31: 2, 32: 3, 33: 2, 34: 2, 35: 2,
    # Física y química
    36: 2, 37: 2, 38: 2, 39: 2, 40: 2, 41: 1, 42: 2, 43: 3, 44: 3, 45: 3,
    # Genética y evolución (abstracto -> grande)
    46: 2, 47: 3, 48: 3, 49: 2, 50: 2, 51: 3, 52: 3, 53: 3, 54: 3, 55: 4,
    # Inventos
    56: 2, 57: 3, 58: 2, 59: 3, 60: 3, 61: 3, 62: 2, 63: 2, 64: 3, 65: 3,
    # Exploración espacial
    66: 2, 67: 2, 68: 2, 69: 1, 70: 1, 71: 2, 72: 3, 73: 3, 74: 3, 75: 3,

    # ═══ CAT 2 Naturaleza ═══
    # Océanos
    4: 1, 76: 1, 77: 1, 78: 1, 79: 2, 80: 2, 81: 2, 82: 1, 83: 2, 84: 1, 85: 1,
    # Botánica
    6: 1, 96: 1, 97: 2, 98: 2, 99: 1, 100: 1, 101: 1, 102: 1, 103: 3, 104: 3, 105: 2,
    # Volcanes y geología
    5: 1, 86: 1, 87: 2, 88: 1, 89: 1, 90: 2, 91: 3, 92: 2, 93: 2, 94: 3, 95: 2,
    # Animales salvajes
    106: 1, 107: 1, 108: 1, 109: 1, 110: 1, 111: 2, 112: 1, 113: 1, 114: 2, 115: 1,
    # Bosques y selvas
    116: 1, 117: 1, 118: 2, 119: 2, 120: 2, 121: 2, 122: 2, 123: 3, 124: 2, 125: 3,
    # Clima y fenómenos
    126: 1, 127: 1, 128: 2, 129: 1, 130: 1, 131: 1, 132: 3, 133: 3, 134: 2, 135: 1,

    # ═══ CAT 3 Deportes ═══
    # Aire libre
    8: 2, 9: 2, 166: 2, 167: 2, 168: 1, 169: 2, 170: 2, 171: 2, 172: 3, 173: 2, 174: 3, 175: 2,
    # Fútbol
    7: 1, 136: 2, 137: 1, 138: 1, 139: 1, 140: 2, 141: 3, 142: 2, 143: 3, 144: 2, 145: 1,
    # Básquet
    146: 2, 147: 1, 148: 2, 149: 2, 150: 2, 151: 3, 152: 2, 153: 2, 154: 3, 155: 3,
    # Tenis
    156: 3, 157: 2, 158: 2, 159: 2, 160: 3, 161: 3, 162: 3, 163: 3, 164: 3, 165: 2,
    # Automovilismo
    176: 2, 177: 2, 178: 3, 179: 2, 180: 2, 181: 3, 182: 3, 183: 2, 184: 3, 185: 2,
    # Running y fitness (entrenamiento/dieta -> grande)
    186: 3, 187: 3, 188: 3, 189: 3, 190: 3, 191: 3, 192: 3, 193: 2, 194: 3, 195: 3,

    # ═══ CAT 5 Tecnología ═══
    # Robótica (robots = atractivo para chicos)
    13: 1, 256: 2, 257: 1, 258: 3, 259: 2, 260: 2, 261: 3, 262: 2, 263: 2, 264: 3,
    # Inteligencia artificial (abstracto/ético -> grande)
    265: 3, 266: 3, 267: 3, 268: 4, 269: 4, 270: 4, 271: 3, 272: 3, 273: 4, 274: 3,
    # Programación
    275: 3, 276: 3, 277: 3, 278: 3, 279: 2, 280: 3, 281: 4, 282: 4, 283: 3, 284: 3,
    # Gadgets (decisiones de consumo -> grande)
    285: 3, 286: 3, 287: 3, 288: 3, 289: 3, 290: 3, 291: 3, 292: 3, 293: 2, 294: 4,
    # Redes sociales
    295: 3, 296: 2, 297: 2, 298: 4, 299: 3, 300: 2, 301: 3, 302: 3, 303: 4, 304: 4,
    # Ciberseguridad
    305: 3, 306: 2, 307: 3, 308: 3, 309: 4, 310: 3, 311: 4, 312: 4, 313: 4, 314: 2,

    # ═══ CAT 7 Cultura y entretenimiento ═══
    # Música
    10: 2, 196: 2, 197: 3, 198: 1, 199: 3, 200: 3, 201: 3, 202: 2, 203: 4, 204: 2, 205: 3,
    # Cine (superhéroes/peli favorita = chico)
    206: 1, 207: 1, 208: 4, 209: 2, 210: 3, 211: 4, 212: 3, 213: 2, 214: 3, 215: 3,
    # Series y TV
    11: 1, 12: 2, 216: 3, 217: 3, 218: 2, 219: 3, 220: 3, 221: 2, 222: 3, 223: 3, 224: 4, 225: 2,
    # Videojuegos (oro para chicos)
    14: 1, 226: 1, 227: 3, 228: 2, 229: 2, 230: 2, 231: 2, 232: 1, 233: 1, 234: 2, 235: 4,
    # Stand-up (humor analizado -> grande)
    236: 2, 237: 3, 238: 3, 239: 3, 240: 3, 241: 3, 242: 3, 243: 4, 244: 3, 245: 1,
    # Arte y museos
    246: 2, 247: 2, 248: 3, 249: 2, 250: 2, 251: 4, 252: 3, 253: 3, 254: 3, 255: 3,

    # ═══ CAT 8 Comida y bebida ═══
    # Recetas del mundo
    15: 2, 315: 2, 316: 2, 317: 2, 318: 3, 319: 2, 320: 3, 321: 3, 322: 3, 323: 2, 324: 1,
    # Repostería (tortas/chocolate/helado = chico)
    325: 1, 326: 1, 327: 1, 328: 2, 329: 2, 330: 2, 331: 1, 332: 4, 333: 2, 334: 3,
    # Café y bebidas (café = adulto; jugos = chico)
    335: 4, 336: 4, 337: 3, 338: 1, 339: 2, 340: 1, 341: 4, 342: 3, 343: 4, 344: 2,
    # Cocina saludable (dietas/calorías -> grande)
    345: 3, 346: 2, 347: 2, 348: 3, 349: 4, 350: 2, 351: 4, 352: 4, 353: 4, 354: 4,
    # Asado y parrilla
    355: 2, 356: 2, 357: 3, 358: 3, 359: 4, 360: 3, 361: 2, 362: 3, 363: 3, 364: 3,
    # Comida callejera (hamburguesa/pizza/empanada = chico)
    365: 2, 366: 1, 367: 1, 368: 1, 369: 3, 370: 2, 371: 2, 372: 3, 373: 2, 374: 4,

    # ═══ CAT 9 Viajes y lugares ═══
    # Ciudades
    375: 2, 376: 2, 377: 3, 378: 2, 379: 3, 380: 4, 381: 2, 382: 4, 383: 3, 384: 3,
    # Aeropuertos y vuelos (logística -> grande)
    385: 2, 386: 4, 387: 3, 388: 2, 389: 2, 390: 4, 391: 3, 392: 4, 393: 3, 394: 4,
    # Mochileros (presupuesto/solo -> grande)
    395: 3, 396: 4, 397: 4, 398: 4, 399: 3, 400: 4, 401: 4, 402: 4, 403: 3, 404: 2,
    # Playas y montañas (naturaleza = chico)
    405: 1, 406: 2, 407: 2, 408: 1, 409: 2, 410: 3, 411: 3, 412: 1, 413: 1, 414: 3,
    # Cultura local
    415: 2, 416: 3, 417: 2, 418: 3, 419: 3, 420: 2, 421: 4, 422: 2, 423: 4, 424: 3,
    # Hoteles (reservas/quejas -> grande)
    425: 3, 426: 4, 427: 3, 428: 4, 429: 3, 430: 2, 431: 2, 432: 2, 433: 4, 434: 4,

    # ═══ CAT 10 Vida cotidiana ═══
    # Rutinas
    435: 1, 436: 1, 437: 3, 438: 2, 439: 3, 440: 3, 441: 4, 442: 3, 443: 2, 444: 4,
    # La casa (vivir solo/reparaciones -> grande)
    445: 1, 446: 2, 447: 3, 448: 2, 449: 3, 450: 2, 451: 4, 452: 4, 453: 2, 454: 4,
    # Compras
    455: 1, 456: 2, 457: 3, 458: 4, 459: 4, 460: 2, 461: 2, 462: 3, 463: 3, 464: 3,
    # Transporte y ciudad (manejar/registro -> grande)
    465: 2, 466: 2, 467: 3, 468: 4, 469: 2, 470: 3, 471: 3, 472: 2, 473: 4, 474: 4,
    # Estaciones (clima = chico)
    475: 1, 476: 1, 477: 1, 478: 1, 479: 1, 480: 1, 481: 1, 482: 1, 483: 3, 484: 2,
    # Familia y amigos
    485: 1, 486: 2, 487: 3, 488: 2, 489: 3, 490: 1, 491: 4, 492: 4, 493: 2, 494: 1,

    # ═══ CAT 11 Trabajo y negocios (casi todo adulto) ═══
    # Entrevistas
    495: 4, 496: 4, 497: 4, 498: 4, 499: 3, 500: 3, 501: 4, 502: 4, 503: 4, 504: 4,
    # Reuniones
    505: 4, 506: 3, 507: 3, 508: 4, 509: 4, 510: 3, 511: 4, 512: 3, 513: 4, 514: 4,
    # Emprender
    515: 3, 516: 4, 517: 4, 518: 4, 519: 4, 520: 3, 521: 4, 522: 3, 523: 4, 524: 4,
    # Finanzas personales
    525: 3, 526: 4, 527: 4, 528: 3, 529: 4, 530: 4, 531: 3, 532: 4, 533: 4, 534: 4,
    # Oficina
    535: 4, 536: 3, 537: 4, 538: 4, 539: 4, 540: 4, 541: 4, 542: 3, 543: 4, 544: 4,
    # Trabajo remoto
    545: 4, 546: 4, 547: 4, 548: 4, 549: 3, 550: 4, 551: 4, 552: 4, 553: 4, 554: 4,

    # ═══ CAT 12 Salud y bienestar ═══
    # Ejercicio
    555: 3, 556: 3, 557: 2, 558: 3, 559: 3, 560: 3, 561: 3, 562: 2, 563: 3, 564: 3,
    # Nutrición (dietas/suplementos -> grande)
    565: 3, 566: 4, 567: 4, 568: 3, 569: 4, 570: 4, 571: 4, 572: 2, 573: 4, 574: 4,
    # Salud mental (teen/adulto)
    575: 3, 576: 3, 577: 3, 578: 3, 579: 4, 580: 3, 581: 3, 582: 3, 583: 4, 584: 3,
    # En el médico (dentista/síntoma = práctico chico)
    585: 2, 586: 3, 587: 3, 588: 1, 589: 2, 590: 2, 591: 4, 592: 3, 593: 4, 594: 3,
    # Sueño (sueños/dormir = chico)
    595: 2, 596: 4, 597: 3, 598: 1, 599: 3, 600: 2, 601: 3, 602: 4, 603: 4, 604: 2,
    # Mindfulness (abstracto -> grande)
    605: 3, 606: 3, 607: 4, 608: 4, 609: 4, 610: 4, 611: 3, 612: 4, 613: 4, 614: 3,
}


def _connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME,
        ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def main() -> None:
    conn = _connect()
    cur = conn.cursor()

    cur.execute("SELECT topic_id FROM topic")
    db_ids = {r["topic_id"] for r in cur.fetchall()}
    miss = db_ids - set(TOPIC_MIN)
    extra = set(TOPIC_MIN) - db_ids
    if miss or extra:
        print(f"ABORTADO: cobertura incompleta. faltan={sorted(miss)} sobran={sorted(extra)}")
        conn.rollback()
        conn.close()
        return

    cur.execute("DELETE FROM topic_suggested_band")
    rows = [(tid, b) for tid, mn in TOPIC_MIN.items() for b in range(mn, MAX_BAND + 1)]
    cur.executemany(
        "INSERT INTO topic_suggested_band (topic_id, band_id, overridable) VALUES (%s, %s, 1)", rows)

    cur.execute("SELECT band_id, COUNT(*) n FROM topic_suggested_band GROUP BY band_id ORDER BY band_id")
    counts = {r["band_id"]: r["n"] for r in cur.fetchall()}
    monotonic = all(counts.get(b, 0) <= counts.get(b + 1, 0) for b in range(1, MAX_BAND))
    covers_all = counts.get(MAX_BAND, 0) == len(db_ids)
    band1_ok = counts.get(1, 0) > 0

    print("Topicos sugeridos por banda (tras re-cura):")
    names = {1: "early_child", 2: "child", 3: "teen", 4: "adult"}
    for b in range(1, MAX_BAND + 1):
        print(f"  banda {b} ({names[b]:12}) -> {counts.get(b, 0)} topicos")

    if monotonic and covers_all and band1_ok:
        conn.commit()
        print(f"\nOK -> {len(rows)} filas, monotono, adulto cubre los {len(db_ids)}. COMMIT.")
    else:
        conn.rollback()
        print(f"\nABORTADO (monotono={monotonic} cubre_all={covers_all} band1={band1_ok}). ROLLBACK.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
