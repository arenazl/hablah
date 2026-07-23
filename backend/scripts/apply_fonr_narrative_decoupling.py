import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Actualizar el Tópico 187 (El reino del rey Ramón) para que su narrativa sea 100% coherente (Castillo/Reino medieval sin motores)
            cur.execute("""
                UPDATE topics
                SET narrative_setting = %s,
                    narrative_role = %s,
                    narrative_conflict = %s
                WHERE id = 187 OR slug = %s
            """, (
                'El castillo mágico del rey Ramón donde el gran portón de piedra solo se abre al hacer vibrar la R con el rugido del perro Roco.',
                'somos los guardianes mágicos del reino del rey Ramón',
                'hacer sonar la gran R mágica (r-r-r-o) para abrir el portón de piedra del castillo',
                'el-reino-del-rey-ramon'
            ))

            # 2. Actualizar age_level_matrix (mini x FONR) para que las directivas pedagógicas sean 100% agnósticas al tópico
            expected_prod = (
                "El alumno participa en un juego narrativo de imitación del sonido mágico del escenario (ej: el rugido del perro Roco 'r-r-r-o', el viento del castillo o el motor en carreras según el tópico). "
                "REGLA DE ORO DE TOLERANCIA DE AUDIO (STT FONÉTICO): El reconocedor de voz (STT) suele transcribir los sonidos fonéticos a transcripciones aproximadas como 'br br', 'rro', 'burro' o 'perro'. "
                "ESTÁ ESTRICTAMENTE PROHIBIDO corregir al alumno o detener la clase por transcripciones imperfectas del STT. "
                "Cualquier intento o emisión de voz del niño en su turno SE CONSIDERA UN ÉXITO TOTAL. "
                "Asumí siempre que el nene hizo el sonido correctamente, celebralo con gran entusiasmo e hiper-energía en la historia y avanzá de inmediato al siguiente beat/ejercicio sin romper la coherencia del cuento."
            )
            cmd_start = "Saludá a {name} con energía en ESPAÑOL. Sumalo a la historia e invitá a hacer el sonido mágico del escenario ({first_vocab}) para empezar la aventura."
            act_cont = "Reaccioná festejando con entusiasmo la emisión del niño. Avanzá en la historia hacia la palabra clave manteniendo el cuento 100% coherente con la escena del tópico."
            fmt_cierre = "Invitalo a hacer el sonido mágico usando el modelado doble lúdico en el contexto exacto del cuento (ej: '¡Hagamos sonar la R del castillo! Decí conmigo: r-r-r-o... ¡ahora vos, {name}!'). NUNCA introduzcas elementos ajenos al cuento (como motores en un castillo)."
            tono_entrega = "Voice & Pacing: Habla LENTO y con extrema claridad lúdica. Mantené coherencia 100% con la historia elegida. Ignorá imprecisiones del reconocedor de voz, asumí éxito en cada turno del niño, festejá y avanzá."
            pasos_sesion = "Beat 1: Entrada a la historia + sonido mágico del escenario. Beat 2: Intensificación sonora. Beat 3: Misión cumplida con palabra ({first_vocab}). Beat 4: Festejo final."

            cur.execute("""
                UPDATE age_level_matrix
                SET produccion_esperada = %s,
                    formato_de_cierre_de_turno = %s,
                    comando_de_arranque = %s,
                    accion_de_continuacion = %s,
                    reglas_de_tono_y_entrega = %s,
                    pasos_de_la_sesion = %s
                WHERE age_slug = 'mini' AND level_code = 'FONR'
            """, (expected_prod, fmt_cierre, cmd_start, act_cont, tono_entrega, pasos_sesion))

            db.conn.commit()
            print("Desacoplamiento narrativo FONR ejecutado con éxito en MySQL.")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
