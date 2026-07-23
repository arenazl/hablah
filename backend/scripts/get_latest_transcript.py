#!/usr/bin/env python3
"""Script determinístico para obtener la última transcripción de clase realizada en Habláh.

Muestra de forma limpia el ID de sesión, fecha, tópico, alumno y el diálogo turno a turno.
No consume tokens del LLM.
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # Buscar la sesión más reciente que tenga transcript no nulo
            cur.execute("""
                SELECT s.id, s.user_id, u.nombre AS student_name, s.topic_id, t.title AS topic_title,
                       s.cefr_at_start, s.started_at, s.transcript
                FROM sessions s
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN topics t ON t.id = s.topic_id
                WHERE s.transcript IS NOT NULL AND JSON_LENGTH(s.transcript) > 0
                ORDER BY s.id DESC LIMIT 1
            """)
            row = cur.fetchone()
            if not row:
                print("No se encontraron sesiones guardadas con transcript.")
                return

            print("=" * 80)
            print(f"ÚLTIMA TRANCRIPCIÓN DE CLASE (Sesión #{row['id']})")
            print(f"Fecha/Hora  : {row['started_at']}")
            print(f"Alumno      : {row['student_name']} (ID {row['user_id']})")
            print(f"Objetivo/Niv: {row['cefr_at_start']}")
            print(f"Tópico      : {row['topic_title']} (ID {row['topic_id']})")
            print("=" * 80)

            raw_tr = row['transcript']
            tr = json.loads(raw_tr) if isinstance(raw_tr, str) else raw_tr
            if isinstance(tr, list):
                for idx, turn in enumerate(tr, 1):
                    who = turn.get('who', 'unknown').upper()
                    text = turn.get('text', '')
                    speaker = "Profe (AI)" if who == "AI" else "Alumno (Vos)"
                    print(f"\n[{idx}] {speaker}:")
                    print(f"    {text}")
            else:
                print(tr)

            print("\n" + "=" * 80)
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
