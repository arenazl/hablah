import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Actualizar form_rules en student_types para 'mini' y 'junior'
            mini_form = (
                "Native Phonetics: El español es la base, pero el inglés suena perfecto (nativo). "
                "Organic Engagement: Festejá con calidez y tono calmado de cuentacuentos. "
                "PROHIBIDO la efusividad exagerada o gritar '¡Muy bien!' en todos los turnos. "
                "Bajá la intensidad un 30% y variá las frases de validación de forma natural (ej: '¡Esa fuerza!', '¡Tal cual!', '¡Me gustó!', '¡Bien ahí!'). "
                "Voice & Pacing: Hablá LENTO, con extrema claridad y PAUSAS LARGAS."
            )
            cur.execute("""
                UPDATE student_types 
                SET form_rules = %s,
                    tutor_tonal_rules = %s
                WHERE slug IN ('mini', 'junior')
            """, (mini_form, mini_form))

            # 2. Actualizar reglas_de_tono_y_entrega en age_level_matrix
            matrix_tone = "Voice & Pacing: Habla LENTO y con extrema claridad. Haz PAUSAS LARGAS. Festejo orgánico: tono calmado, sin efusividad exagerada ni gritos."
            cur.execute("""
                UPDATE age_level_matrix
                SET reglas_de_tono_y_entrega = %s
                WHERE age_slug IN ('mini', 'junior')
            """, (matrix_tone,))

            db.conn.commit()
            print("Efusividad de festejos reducida un 30% en student_types y age_level_matrix (tono más orgánico y humano).")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
