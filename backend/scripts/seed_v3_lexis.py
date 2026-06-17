"""Seed v3 · LÉXICO graduado por nivel (topic_lexis), autorado por Claude.

NADA de IA externa: el léxico lo genera el modelo (Claude) y se persiste como dato,
igual que los títulos. Determinístico, sin costo de API, revisable en el editor.
Formato por ítem: "texto|CEFR"  (CEFR ∈ A1..C1). Se busca el tópico por título exacto.
Idempotente: salta los tópicos que YA tienen léxico cargado.

Se llena por TANDAS (cada corrida inserta lo que esté en LEXIS y falte en la DB).
Uso:  cd backend && python scripts/seed_v3_lexis.py
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

VALID_CEFR = {"A1", "A2", "B1", "B2", "C1"}

# título exacto del tópico -> (words, phrases). Cada ítem: "texto|CEFR".
LEXIS: dict[str, tuple[list[str], list[str]]] = {
    # ── Espacio y ciencia · Astronomía (chicos → adultos) ──
    "Los planetas del sistema solar": (
        ["Sun|A1", "Planet|A1", "Earth|A1", "Moon|A1", "Star|A2", "Ring|A2", "Orbit|B1", "Gravity|B1", "Atmosphere|B2", "Habitable|C1"],
        ["The sun is a star|A1", "How many planets are there?|A2", "Earth goes around the sun|B1", "Each planet has a different size|B1", "Some planets could support life|B2"]),
    "Las fases de la Luna": (
        ["Moon|A1", "Night|A1", "Full|A2", "Shadow|A2", "Phase|B1", "Crescent|B1", "Reflect|B2", "Cycle|B2"],
        ["Look at the moon|A1", "The moon is full tonight|A2", "The moon changes every night|B1", "The moon reflects the sun's light|B2"]),
    "Estrellas y constelaciones": (
        ["Star|A1", "Sky|A1", "Bright|A2", "Shine|A2", "Constellation|B1", "Pattern|B1", "Distant|B2", "Navigate|B2"],
        ["I can see many stars|A1", "The stars shine at night|A2", "Sailors used the stars to navigate|B1", "Constellations form pictures in the sky|B2"]),
    "Agujeros negros": (
        ["Space|A1", "Dark|A2", "Hole|A2", "Pull|B1", "Gravity|B1", "Collapse|B2", "Infinite|B2", "Singularity|C1"],
        ["Space is very dark|A1", "A black hole pulls everything in|B1", "Not even light can escape|B2", "Black holes bend space and time|C1"]),
    "El Sol y la luz": (
        ["Sun|A1", "Light|A1", "Hot|A1", "Warm|A2", "Ray|A2", "Energy|B1", "Source|B1", "Radiation|B2"],
        ["The sun is hot|A1", "The sun gives us light|A2", "The sun is our main energy source|B1", "Sunlight takes minutes to reach Earth|B2"]),
    "Cometas y meteoritos": (
        ["Rock|A1", "Fall|A2", "Tail|A2", "Comet|B1", "Crash|B1", "Crater|B2", "Debris|C1"],
        ["A rock fell from the sky|A2", "The comet has a long tail|B1", "The meteor crashed into the ground|B1", "Meteorites leave huge craters|B2"]),
    "Galaxias y la Vía Láctea": (
        ["Star|A1", "Big|A1", "Billions|B1", "Galaxy|B1", "Universe|B1", "Spiral|B2", "Vast|C1"],
        ["There are many stars|A1", "Our galaxy is the Milky Way|B1", "A galaxy has billions of stars|B1", "The universe is impossibly vast|C1"]),
    "¿Hay vida en otros planetas?": (
        ["Life|A2", "Alien|A2", "Maybe|A2", "Planet|A1", "Evidence|B2", "Microbe|B2", "Civilization|C1", "Speculate|C1"],
        ["Is there life out there?|A2", "Maybe aliens exist|A2", "Scientists look for evidence of life|B2", "We can only speculate about alien civilizations|C1"]),
    "Eclipses de sol y luna": (
        ["Sun|A1", "Moon|A1", "Dark|A2", "Cover|A2", "Shadow|B1", "Rare|B1", "Align|B2", "Phenomenon|C1"],
        ["The sky went dark|A2", "The moon covers the sun|B1", "An eclipse happens when they align|B2", "A total eclipse is a rare phenomenon|C1"]),
    "Telescopios: cómo miramos el cielo": (
        ["Look|A1", "Glass|A2", "Telescope|B1", "Lens|B1", "Magnify|B2", "Observe|B2", "Resolution|C1"],
        ["I want to look at the stars|A1", "A telescope makes things bigger|B1", "Astronomers observe distant galaxies|B2", "Modern telescopes have amazing resolution|C1"]),

    # ── Trabajo y negocios · Entrevistas (adultos, A2 → C1) ──
    "Una entrevista de trabajo": (
        ["Job|A2", "Interview|B1", "Hire|B1", "Skill|B1", "Candidate|B2", "Qualified|B2", "Impression|B2", "Vacancy|C1"],
        ["I have an interview today|A2", "Tell me about yourself|B1", "Why do you want this job?|B1", "I'm confident I'm the right candidate|B2"]),
    "Hablar de tus fortalezas": (
        ["Good|A1", "Skill|B1", "Strength|B1", "Teamwork|B1", "Reliable|B2", "Asset|B2", "Leverage|C1"],
        ["I'm good at teamwork|B1", "One of my strengths is communication|B1", "I work well under pressure|B2", "I leverage my skills to add value|C1"]),
    "El currículum perfecto": (
        ["List|A2", "CV|B1", "Resume|B1", "Experience|B1", "Achievement|B2", "Tailor|B2", "Concise|C1"],
        ["Here is my resume|B1", "I have five years of experience|B1", "Highlight your main achievements|B2", "Tailor your CV to each job|C1"]),
    "Preguntas difíciles": (
        ["Hard|A1", "Question|A2", "Weakness|B1", "Honest|B1", "Challenge|B2", "Handle|B2", "Articulate|C1"],
        ["That's a hard question|A2", "What is your biggest weakness?|B1", "How do you handle conflict?|B2", "I try to articulate my answer clearly|C1"]),
    "Cómo vestirse": (
        ["Clothes|A1", "Wear|A2", "Suit|B1", "Smart|B1", "Formal|B1", "Appropriate|B2", "Polished|C1"],
        ["What should I wear?|A2", "Wear a suit to the interview|B1", "Dress formally for the meeting|B1", "A polished look makes an impression|C1"]),
    "Los nervios de la entrevista": (
        ["Breathe|A2", "Nervous|B1", "Calm|B1", "Stress|B1", "Confident|B2", "Overcome|B2", "Composure|C1"],
        ["I feel nervous|B1", "Take a deep breath|A2", "Try to stay calm and confident|B2", "She kept her composure under pressure|C1"]),
    "Negociar el sueldo": (
        ["Money|A1", "Pay|A2", "Salary|B1", "Offer|B1", "Raise|B1", "Negotiate|B2", "Compensation|B2", "Counteroffer|C1"],
        ["How much is the salary?|B1", "I'd like to discuss the offer|B1", "Can we negotiate the salary?|B2", "I made a counteroffer|C1"]),
    "Entrevistas en inglés": (
        ["Speak|A1", "Word|A2", "Fluent|B1", "Mistake|B1", "Express|B2", "Hesitate|B2", "Eloquent|C1"],
        ["I speak a little English|A2", "Don't worry about small mistakes|B1", "Express your ideas clearly|B2", "He spoke eloquently in the interview|C1"]),
    "Errores comunes": (
        ["Late|A2", "Wrong|A2", "Mistake|B1", "Avoid|B1", "Prepare|B1", "Pitfall|C1"],
        ["Don't be late|A2", "Avoid common mistakes|B1", "Always prepare your answers|B1", "Arriving late is a classic pitfall|C1"]),
    "El primer día de trabajo": (
        ["New|A1", "Start|A1", "Boss|A2", "Team|B1", "Introduce|B1", "Onboard|B2", "Adapt|B2"],
        ["It's my first day|A2", "Nice to meet the team|B1", "Let me introduce myself|B1", "It takes time to adapt to a new job|B2"]),
}


def _connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME,
        ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def _parse(item: str):
    txt, _, cefr = item.rpartition("|")
    return txt.strip(), cefr.strip().upper()


def main() -> None:
    conn = _connect()
    cur = conn.cursor()
    inserted, skipped_topic, missing = 0, 0, []

    for title, (words, phrases) in LEXIS.items():
        cur.execute("SELECT topic_id FROM topic WHERE title=%s LIMIT 1", (title,))
        row = cur.fetchone()
        if not row:
            missing.append(title)
            continue
        tid = row["topic_id"]
        cur.execute("SELECT COUNT(*) n FROM topic_lexis WHERE topic_id=%s", (tid,))
        if cur.fetchone()["n"] > 0:
            skipped_topic += 1
            continue
        n = 0
        for lexis_type, items in (("word", words), ("phrase", phrases)):
            for i, raw in enumerate(items):
                txt, cefr = _parse(raw)
                if not txt or cefr not in VALID_CEFR:
                    print(f"  ! ítem inválido en '{title}': {raw}")
                    continue
                cur.execute(
                    "INSERT INTO topic_lexis (topic_id, lexis_type, text, cefr_level, ord) VALUES (%s,%s,%s,%s,%s)",
                    (tid, lexis_type, txt[:160], cefr, i))
                n += 1
        inserted += n
        print(f"  OK  {title[:46]:46} +{n}")

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nTópicos cargados con léxico: {len([t for t in LEXIS if t not in missing])}  ·  "
          f"ya tenían léxico: {skipped_topic}  ·  filas insertadas: {inserted}")
    if missing:
        print(f"Títulos no encontrados en la DB ({len(missing)}): {missing}")


if __name__ == "__main__":
    main()
