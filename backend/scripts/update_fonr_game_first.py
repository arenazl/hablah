import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Actualizar la tabla levels para FONR (100% Juego Inmersivo + Tolerancia Total de STT)
            expected_prod = (
                "El alumno participa de un JUEGO NARRATIVO de imitación de sonidos y fonemas (ej: el rugido del motor 'br-r-r-r', la sirena del barco o el rugido del león). "
                "REGLA DE ORO DE TOLERANCIA DE AUDIO (STT FONÉTICO): El reconocedor de voz (STT) de la IA suele transcribir los ruidos de motor o vibraciones fonéticas a palabras reales del diccionario como 'burro', 'barro', 'perro' u 'hola'. "
                "ESTÁ ESTRICTAMENTE PROHIBIDO corregir al alumno basándote en la palabra inferida por el STT (NUNCA digas 'no dijiste brrr, dijiste burro' ni lo hagas repetir por eso). "
                "Cualquier emisión de voz o intento del niño en su turno durante el juego de fonética SE CONSIDERA UN ÉXITO TOTAL. "
                "Asumí siempre que el nene hizo el sonido del motor correctamente, celebralo con gran entusiasmo e hiper-energía en la historia y avanzá de inmediato al siguiente beat/ejercicio sin trabar la sesión."
            )
            cur.execute("""
                UPDATE levels 
                SET expected_production = %s,
                    curriculum_grammar = 'Juegos narrativos con sonidos de alta vibración (motores, sirenas, dragones, sinfones de carreras) con tolerancia total de STT.'
                WHERE code = 'FONR'
            """, (expected_prod,))

            # 2. Actualizar age_level_matrix para mini x FONR
            cmd_start = "Saludá a {name} con energía en ESPAÑOL. Sumalo a la historia del motor de carreras/cohete e invitá a hacer sonar el motor (br-r-r-r-o)."
            act_cont = "Reaccioná festejando con entusiasmo en la historia. Asumí éxito absoluto en la emisión del niño (ignorando transcripciones tipo 'burro' o 'barro'). Avanzá del sonido del motor a la palabra clave ({first_vocab}) manteniendo el juego 100% inmersivo."
            fmt_cierre = "Invitalo a hacer sonar el motor en el juego usando el modelado doble lúdico (ej: '¡Hagamos acelerar el auto! Decí conmigo: p-r-r-r-o... ¡ahora vos, {name}! ¡p-r-r-r-o!'). NUNCA uses jerga escolar, NUNCA corrijas por transcripciones de STT y NUNCA te detengas en palabras inferidas como 'burro'."

            cur.execute("""
                UPDATE age_level_matrix
                SET produccion_esperada = %s,
                    formato_de_cierre_de_turno = %s,
                    comando_de_arranque = %s,
                    accion_de_continuacion = %s,
                    reglas_de_tono_y_entrega = 'Voice & Pacing: Habla LENTO y con extrema claridad lúdica. REGLA DE FONÉTICA: Ignorá transcripciones erróneas del reconocedor (ej: burro/barro). Asumí éxito en cada turno del niño, festejá la acelerada y avanzá.',
                    pasos_de_la_sesion = 'Beat 1: Entrada a la historia + sonido del motor (br-r-r-r). Beat 2: Acelerada (br-r-o). Beat 3: Misión cumplida con palabra ({first_vocab}). Beat 4: Festejo final.'
                WHERE age_slug = 'mini' AND level_code = 'FONR'
            """, (expected_prod, fmt_cierre, cmd_start, act_cont))

            db.conn.commit()
            print("Nivel 'FONR' actualizado con éxito: Juego inmersivo + Tolerancia Total de STT (Cero inferencias como 'burro').")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
