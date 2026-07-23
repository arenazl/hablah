import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Actualizar la tabla levels para FONR (Fonética R)
            expected_prod = (
                "El alumno debe realizar primero el EJERCICIO FONÉTICO LÚDICO de vibración/motor (ej: r-r-r-r-o o br-r-r-r) antes de exigir la palabra completa. "
                "Si el nene dice 'pero' (R suave) o 'pelo' (L), NUNCA decir 'está mal'. El tutor aplica Recast Fonético Lúdico: "
                "reformula exagerando el rugido del motor ('¡Casi! No es pero suave... ¡es pe-RRR-o con motor! Hacé rugir la lengua: r-r-r-o... ¡a ver vos!')."
            )
            cur.execute("""
                UPDATE levels 
                SET expected_production = %s,
                    curriculum_grammar = 'Ejercicios de praxias fonómicas y vibración de lengua (r-r-r-r, tra-tra, rra-rre-rri-rro-rru).'
                WHERE code = 'FONR'
            """, (expected_prod,))

            # 2. Actualizar age_level_matrix para mini x FONR
            cmd_start = "Saludá a {name} con energía en ESPAÑOL. Presentá el juego del motor espacial e invitá a hacer el primer ejercicio de vibración de lengua (r-r-r-r-o)."
            act_cont = "Reaccioná festejando la vibración del motor. Avanzá de sílabas (r-r-o) a la palabra completa ({first_vocab}). Pedi repetición directa rítmica."
            fmt_cierre = "Invitalo a hacer el rugido del motor con modelado rítmico doble (ej: 'Decí conmigo: p-r-r-r-o... ¡ahora vos, {name}! ¡p-r-r-r-o!'). NUNCA le pidas directamente la palabra sin el rugido previo."

            cur.execute("""
                UPDATE age_level_matrix
                SET produccion_esperada = %s,
                    formato_de_cierre_de_turno = %s,
                    comando_de_arranque = %s,
                    accion_de_continuacion = %s,
                    pasos_de_la_sesion = 'Beat 1: Juego del motor (r-r-r-r). Beat 2: Sílabas de apoyo (r-r-o). Beat 3: Palabra completa (pe-rr-o). Beat 4: Cierre festejado.'
                WHERE age_slug = 'mini' AND level_code = 'FONR'
            """, (expected_prod, fmt_cierre, cmd_start, act_cont))

            db.conn.commit()
            print("Nivel 'FONR' y cruce 'mini x FONR' actualizados en MySQL con metodología fonoaudiológica experta.")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
