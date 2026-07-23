import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            prod = "El alumno debe producir la frase-puente bilingüe completa: '<palabra-ES> se dice {first_vocab}'."
            fmt = "Invitalo a repetir la frase-puente bilingüe completa usando la estructura de modelado doble (ej: '<palabra-ES> se dice {first_vocab}... ¡ahora vos, {name}! ¡<palabra-ES> se dice {first_vocab}!'). NUNCA le pidas que diga solo la palabra suelta en inglés ni le preguntes cómo se dice."
            cur.execute("""
                UPDATE age_level_matrix 
                SET produccion_esperada = %s,
                    formato_de_cierre_de_turno = %s
                WHERE age_slug = 'mini' AND level_code = 'A0'
            """, (prod, fmt))
            db.conn.commit()
            print(f"age_level_matrix actualizado (filas afectadas: {cur.rowcount}).")
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
