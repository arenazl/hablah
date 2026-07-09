"""
Clasificador LLM de topicos por banda+nivel.

Para cada topico activo, pregunta a Gemini si ese topico es apropiado
para cada combo (banda, nivel) permitido por band_allowed_levels.

Criterio pedagogico:
- El topico debe ser comprensible y motivador para esa edad
- El nivel debe ser manejable con el vocabulario de ese CEFR
- Sentido comun de profe: "empanadas" no es A0-Mini, "dinosaurios" no es Adulto C2

Resultado: inserta filas en topic_band_level.
Reversion: python clasificar_topicos_banda_nivel.py --revert

Uso: python clasificar_topicos_banda_nivel.py [--dry-run]
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor
import requests

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
SCHEMA = {
    "type": "object",
    "properties": {
        "apropiado": {"type": "boolean"},
        "razon": {"type": "string"},
    },
    "required": ["apropiado", "razon"],
}

BANDAS = {
    1: "Mini (4-7 años)",
    2: "Junior (8-12 años)",
    3: "Tween (13+ años)",
    4: "Adulto (18+ años)",
}

CEFR = {
    "A0": "cero ingles, solo palabras sueltas y frases muy simples",
    "A1": "ingles basico, saludos, colores, numeros, familia",
    "A2": "ingles elemental, puede hablar de rutinas y experiencias simples",
    "B1": "ingles intermedio, puede conversar sobre temas cotidianos con fluidez relativa",
    "B2": "ingles upper-intermediate, puede defender opiniones y discutir temas abstractos",
    "C1": "ingles avanzado, fluido en casi cualquier tema",
    "C2": "ingles casi nativo, maneja matices y humor",
}

SYSTEM_PROMPT = """Sos un especialista en adquisicion de segundas lenguas (SLA) con 20 años de aula.
Evaluas si un topico de conversacion es APROPIADO para una combinacion especifica de edad y nivel de ingles.

Un topico es APROPIADO si:
1. El tema es relevante y motivador para esa edad
2. El topico tiene suficiente vocabulario basico para manejarse con ese nivel CEFR
3. La conversacion puede fluir naturalmente 10-15 minutos sin salirse del nivel

Un topico es INAPROPIADO si:
- El tema es demasiado adulto/complejo para la edad (formula 1 para nenes de 5 años)
- El tema es demasiado infantil para la edad (abrir juguetes para adultos)
- El nivel hace imposible la conversacion (genetica en A0)

Responde SOLO con JSON valido: {"apropiado": true, "razon": "una frase corta"}
O: {"apropiado": false, "razon": "una frase corta"}"""


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


def clasificar_combo(api_key: str, topic_title: str, band_id: int, level_code: str) -> bool:
    banda_desc = BANDAS[band_id]
    nivel_desc = CEFR[level_code]
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Topico: '{topic_title}'\n"
        f"Edad: {banda_desc}\n"
        f"Nivel CEFR: {level_code} ({nivel_desc})\n\n"
        f"Es este topico apropiado para esta combinacion?"
    )
    url = GEMINI_URL.format(model=GEMINI_MODEL, key=api_key)
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 120,
            "responseMimeType": "application/json",
            "responseSchema": SCHEMA,
        },
    }
    try:
        r = requests.post(url, json=body, timeout=30)
        r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return bool(data.get("apropiado", False))
    except Exception as e:
        print(f"  [WARN] {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe en BD, solo muestra")
    parser.add_argument("--revert", action="store_true", help="Borra topic_band_level y empieza de cero")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY no configurada")
        sys.exit(1)

    # api_key ya cargado via dotenv

    conn = get_conn()

    with conn.cursor() as cur:
        if args.revert:
            cur.execute("DELETE FROM topic_band_level")
            conn.commit()
            print("topic_band_level vaciada.")
            conn.close()
            return

        cur.execute("SELECT id, title, audience, segmento FROM topics WHERE is_active=1 ORDER BY audience, id")
        topics = cur.fetchall()

        cur.execute("SELECT band_id, level_code FROM band_allowed_levels ORDER BY band_id, level_code")
        allowed = [(r["band_id"], r["level_code"]) for r in cur.fetchall()]

        cur.execute("SELECT topic_id, band_id, level_code FROM topic_band_level")
        ya_clasificados = set((r["topic_id"], r["band_id"], r["level_code"]) for r in cur.fetchall())

    print(f"Topicos: {len(topics)} | Combos posibles por topico: hasta {len(allowed)} | Ya clasificados: {len(ya_clasificados)}")
    print()

    insertar = []

    for topic in topics:
        tid = topic["id"]
        title = topic["title"]
        seg = topic["segmento"] or ""

        # Filtrar bandas relevantes por audiencia
        if topic["audience"] == "kid":
            if "mini" in seg:
                band_filter = {1}
            elif "junior" in seg:
                band_filter = {1, 2}
            elif "tween" in seg:
                band_filter = {2, 3}
            else:
                band_filter = {1, 2, 3}
        else:
            # adultos van en tween y adulto
            band_filter = {3, 4}

        combos_topico = [(b, l) for b, l in allowed if b in band_filter]
        resultados = []

        for band_id, level_code in combos_topico:
            if (tid, band_id, level_code) in ya_clasificados:
                resultados.append((band_id, level_code, "YA"))
                continue

            apropiado = clasificar_combo(api_key, title, band_id, level_code)
            resultados.append((band_id, level_code, "SI" if apropiado else "NO"))
            if apropiado and not args.dry_run:
                insertar.append((tid, band_id, level_code))

            time.sleep(0.1)

        resumen = " | ".join(f"B{b}-{l}={a}" for b, l, a in resultados)
        print(f"[{tid:3d}] {title[:42]:<42} {resumen}")

        # Flush cada 5 topicos
        if not args.dry_run and len(insertar) >= 5:
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT IGNORE INTO topic_band_level (topic_id, band_id, level_code) VALUES (%s,%s,%s)",
                    insertar,
                )
            conn.commit()
            insertar.clear()

    if not args.dry_run and insertar:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT IGNORE INTO topic_band_level (topic_id, band_id, level_code) VALUES (%s,%s,%s)",
                insertar,
            )
        conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as n FROM topic_band_level")
        total = cur.fetchone()["n"]

    print()
    print(f"Combos validos en topic_band_level: {total}")
    print("Esos son las orquestaciones a generar en FASE 2.")
    conn.close()


if __name__ == "__main__":
    main()
