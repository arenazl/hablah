import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Actualizar la tabla levels para FONR (100% Juego Inmersivo, 0% Jerga Clínica)
            expected_prod = (
                "El alumno participa de un JUEGO NARRATIVO de imitación de sonidos (ej: el rugido del motor 'br-r-r-r', la sirena del barco o el rugido del león). "
                "Está PROHIBIDO decir que estamos 'practicando', hacer 'ejercicios', usar la palabra 'fonética' o evaluar al niño. "
                "Si el nene dice 'pero' (R suave) o 'pelo' (L), NUNCA corregirlo frontalmente. Aplicar Recast Lúdico en la historia: "
                "el tutor festeja y re-modela acelerando el motor en el juego ('¡Eso! ¡El auto ruge a pe-RRR-o! ¡Br-r-r-o... a ver vos!')."
            )
            cur.execute("""
                UPDATE levels 
                SET expected_production = %s,
                    curriculum_grammar = 'Juegos narrativos con sonidos de alta vibración (motores, sirenas, dragones, sinfones de carreras).'
                WHERE code = 'FONR'
            """, (expected_prod,))

            # 2. Actualizar age_level_matrix para mini x FONR
            cmd_start = "Saludá a {name} con energía en ESPAÑOL. Sumalo a la historia del motor de carreras/cohete e invitá a hacer sonar el motor (br-r-r-r-o)."
            act_cont = "Reaccioná festejando con entusiasmo en la historia. Avanzá del sonido del motor a la palabra clave ({first_vocab}) manteniendo el juego 100% inmersivo."
            fmt_cierre = "Invitalo a hacer sonar el motor en el juego usando el modelado doble lúdico (ej: '¡Hagamos acelerar el auto! Decí conmigo: p-r-r-r-o... ¡ahora vos, {name}! ¡p-r-r-r-o!'). NUNCA uses jerga escolar ni hagas preguntas."

            cur.execute("""
                UPDATE age_level_matrix
                SET produccion_esperada = %s,
                    formato_de_cierre_de_turno = %s,
                    comando_de_arranque = %s,
                    accion_de_continuacion = %s,
                    pasos_de_la_sesion = 'Beat 1: Entrada a la historia + sonido del motor. Beat 2: Acelerada (br-r-o). Beat 3: Misión cumplida con palabra ({first_vocab}). Beat 4: Festejo final.'
                WHERE age_slug = 'mini' AND level_code = 'FONR'
            """, (expected_prod, fmt_cierre, cmd_start, act_cont))

            db.conn.commit()
            print("Nivel 'FONR' actualizado: 100% Juego Inmersivo, 0% Jerga Clínica.")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
