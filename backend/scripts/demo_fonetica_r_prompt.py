import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect, resolve_v2
from services.composer_proto import compose_proto_prompt
from types import SimpleNamespace
import asyncio

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # 1. Crear o verificar el tópico de prueba de Fonética R en MySQL
            cur.execute("SELECT id FROM topics WHERE title LIKE '%Fonética R%' OR title LIKE '%Rey Ramón%'")
            row = cur.fetchone()
            if not row:
                cur.execute("""
                    INSERT INTO topics (slug, title, segmento, category, is_active, is_hot, usage_count, keywords, generated_vocab, seed_prompts, levels, narrative_setting, narrative_role, narrative_conflict)
                    VALUES (%s, %s, %s, %s, 1, 0, 0, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    "el-reino-del-rey-ramon",
                    "El reino del rey Ramón y el perro Roco",
                    "mini",
                    "entretenimiento",
                    json.dumps(["perro", "rueda", "rey", "rojo", "rama", "rio", "torre", "bruno"]),
                    json.dumps(["r-r-r-r-o", "r-r-e-y"]),
                    "{}",
                    json.dumps(["A0", "A1", "FON_R"]),
                    "El castillo mágico del rey Ramón donde todas las puertas se abren haciendo vibrar la R.",
                    "somos guardianes del reino del rey Ramón",
                    "hacer sonar los motores y campanarios del reino pronunciando la R fuerte para destrabar el mapa"
                ))
                db.conn.commit()
                topic_id = cur.lastrowid
                print(f"Creado tópico de Fonética R con ID #{topic_id}")
            else:
                topic_id = row['id']
                print(f"Encontrado tópico de Fonética R con ID #{topic_id}")

            # 2. Crear o verificar el nivel especial de Fonética R ('FONR')
            cur.execute("SELECT code FROM levels WHERE code = 'FONR'")
            lrow = cur.fetchone()
            if not lrow:
                cur.execute("""
                    INSERT INTO levels (code, friendly_name, language_rule, curriculum_grammar, expected_production, vocab_depth, sort_order, active)
                    VALUES (%s, %s, %s, %s, %s, %s, 99, 1)
                """, (
                    "FONR",
                    "Fonética: Fonema R (Español)",
                    "Hablás 100% en español rioplatense lúdico, lento y extremadamente amigable. Sin inglés.",
                    "Articulación del fonema R en español (rr intervocálica, R inicial y sinfones BR/PR/TR).",
                    "El alumno debe repetir la palabra o sonido jugando a la vibración del motor (ej: '¡Puerto Rico! ¡Pue-RRR-to RRR-ico!'). Si el nene dice 'Puelto Lico' o 'Biuno', NUNCA corregir frontalmente: aplicar Recast Fonético Lúdico exaggerando el rugido del motor.",
                    "basic"
                ))
                db.conn.commit()
                print("Creado nivel 'FONR' en la tabla levels.")
            else:
                print("Encontrado nivel 'FONR' en la tabla levels.")

            # 3. Crear o verificar el cruce en age_level_matrix
            cur.execute("SELECT age_slug FROM age_level_matrix WHERE age_slug = 'mini' AND level_code = 'FONR'")
            mrow = cur.fetchone()
            if not mrow:
                cur.execute("""
                    INSERT INTO age_level_matrix (age_slug, level_code, produccion_esperada, formato_de_cierre_de_turno, reglas_de_tono_y_entrega, pasos_de_la_sesion, comando_de_arranque, accion_de_continuacion, accion_de_cierre, arquetipo, active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                """, (
                    "mini", "FONR",
                    "El alumno debe repetir la palabra con R jugando a la vibración del motor (ej: ¡Puerto Rico!). Si dice 'Puelto Lico' o 'Biuno', aplicar Recast Fonético Lúdico exagerando el rugido del motor sin corregir frontalmente.",
                    "Invitalo a repetir la palabra haciendo rugir la R con el motor.",
                    "Voice & Pacing: Habla LENTO y con extrema claridad. Haz PAUSAS LARGAS.",
                    "Beat 1: Apertura + palabra 1. Beat 2: Acción + palabra 2. Beat 3: Giro + palabra 3. Beat 4: Cierre.",
                    "Saludá a {name} con energía en ESPAÑOL. Presentá el reino del rey Ramón y pedile hacer rugir el motor del cohete con {first_vocab}.",
                    "Reaccioná con festejo. Avanzá la historia 1 paso introduciendo la siguiente palabra. Pedí repetición directa.",
                    "Festejá cálido. Recordá las palabras como trofeos.",
                    "mini_fonr"
                ))
                db.conn.commit()
                print("Creado cruce age_level_matrix para mini x FONR.")
            else:
                print("Encontrado cruce age_level_matrix para mini x FONR.")

            # 4. Probar la resolución del prompt con resolve_v2
            res = await resolve_v2("mini", "FONR", topic_id)
            print("\n=================== PROMPT RESOLVIDO PARA FONÉTICA R (mini x FON_R) ===================")
            print(res.get("prompt"))

    finally:
        db.conn.close()

if __name__ == '__main__':
    asyncio.run(main())
