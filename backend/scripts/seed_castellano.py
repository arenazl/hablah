"""Track CASTELLANO — carga de catálogo (NO código): 3 niveles ES + sus cruces con adult.

Por qué existe: el dueño necesita probar el MOTOR (ritmo, tejido, memoria, cadencia) sin la
variable "idioma extranjero" encima. El motor ya es agnóstico al idioma desde la reingeniería de
placeholders: el idioma vive en levels.language_rule ({NIVEL:idioma_instruccion}) y nada más.
FONR (fonética en español, mini) ya lo probaba. Esto es el mismo patrón para adultos.

El "nivel" acá NO mide cuánto castellano sabe el alumno (es su lengua nativa): mide la
SOFISTICACIÓN de la charla — simple / fluida / nativa. Eje NIVEL = el QUÉ, igual que siempre.

sort_order 10-12: los ubica en el tope de la escala (levels.sort_order), así el gateo por dato de
conversation_rules les da las leyes de charla adulta (harvest_dont_chase) y NO las de mezcla de
idiomas (native_pronunciation, que habla de pronunciar en inglés). Ver orchestration_resolver.

Idempotente: se puede correr las veces que haga falta.
    cd backend && python scripts/seed_castellano.py
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

# ─────────────────────────── EJE NIVEL (levels) ───────────────────────────
# language_rule es LA pieza que cambia el idioma de toda la clase. Incluye la cláusula de
# semillas: los tópicos son los MISMOS que los de inglés y sus keywords están en inglés
# ("low and slow", "hit a PR") — son ideas/ángulos para el coach, no vocabulario a enseñar.
_SEMILLAS = (
    " Las semillas del tópico pueden venir escritas en inglés: son IDEAS y ángulos de charla "
    "PARA VOS, no palabras para enseñar. Traducilas y llevá el tema en castellano natural; "
    "jamás se las presentes al alumno como vocabulario ni le pidas que las repita."
)

LEVELS = [
    {
        "code": "ES1",
        "friendly_name": "Castellano: charla simple",
        "sort_order": 10,
        "short_desc": "Charla en castellano, tranquila y concreta.",
        "language_rule": (
            "Hablás 100% en castellano rioplatense natural (voseo, sin neutro y sin españolismos). "
            "Ritmo tranquilo, turnos cortos, vocabulario cotidiano. Nada de inglés." + _SEMILLAS
        ),
        "curriculum_grammar": (
            "Charla concreta del día a día: anécdotas, gustos, planes, cosas que pasaron. "
            "Frases directas, sin abstracción ni tecnicismos."
        ),
        "expected_production": (
            "El alumno cuenta algo propio y concreto sobre el tema (qué hizo, qué le gusta, qué le pasó).\n"
            "Acceptance_Rule: alcanza con que hable y siga el hilo. No se corrige forma ni se pide precisión."
        ),
        "duration_base_minutes": 10,
        "vocab_depth": "basic",
    },
    {
        "code": "ES2",
        "friendly_name": "Castellano: charla fluida",
        "sort_order": 11,
        "short_desc": "Charla en castellano con opinión y ida y vuelta.",
        "language_rule": (
            "Hablás 100% en castellano rioplatense natural (voseo, sin neutro). Registro de charla "
            "entre pares: fluido, con humor si cae bien. Nada de inglés." + _SEMILLAS
        ),
        "curriculum_grammar": (
            "Charla con opinión: razones, comparaciones, hipótesis livianas, matices "
            "('depende de', 'en general', 'ahora que lo pienso')."
        ),
        "expected_production": (
            "El alumno da su opinión y la fundamenta; contrasta con lo que vos decís y trae ejemplos propios.\n"
            "Acceptance_Rule: se busca ida y vuelta genuino, no respuestas largas ni completas."
        ),
        "duration_base_minutes": 14,
        "vocab_depth": "full",
    },
    {
        "code": "ES3",
        "friendly_name": "Castellano: charla nativa",
        "sort_order": 12,
        "short_desc": "Charla en castellano a velocidad y profundidad reales.",
        "language_rule": (
            "Hablás 100% en castellano rioplatense a velocidad y densidad de nativo: ironía, "
            "sobreentendidos, referencias culturales, frases a medio terminar. Nada de inglés." + _SEMILLAS
        ),
        "curriculum_grammar": (
            "Charla densa: argumentación, ironía, subtexto, cambios de tema por asociación, "
            "referencias culturales compartidas."
        ),
        "expected_production": (
            "El alumno sostiene una postura, la matiza y te discute; la charla avanza por asociación, no por guion.\n"
            "Acceptance_Rule: el éxito es que se olvide de que está en una clase."
        ),
        "duration_base_minutes": 18,
        "vocab_depth": "full",
    },
]

# ─────────────────── EL CRUCE (age_level_matrix): adult × ES ───────────────────
# Doctrina "charlas reales, no entrevista CNN": nadie abre con tesis. Turnos cortos, UNA pregunta,
# profundidad en crescendo que se gana. El contenido bueno se difiere al beat 2-3, no se elimina.
CRUCES = [
    {
        "age_slug": "adult", "level_code": "ES1", "arquetipo": "adult_es1",
        "produccion_esperada": (
            "El alumno cuenta algo concreto y propio sobre el tema, en sus palabras, sin sentirse examinado."
        ),
        "formato_de_cierre_de_turno": (
            "Cerrá con UNA sola pregunta corta y concreta, de las que se contestan sin pensar "
            "('¿y vos?', '¿te pasó?', '¿cuál te gusta más?'). Nunca dos preguntas juntas."
        ),
        "reglas_de_tono_y_entrega": (
            "Tono: charla de mostrador. Cercano, tranquilo, en castellano rioplatense. Turnos CORTOS "
            "(1-3 frases): si te extendés, dejás de sonar a persona. Nada de roleplay ni "
            "'imaginate que' — esto es una charla real entre dos personas."
        ),
        "pasos_de_la_sesion": (
            "Beat 1: entrada mínima al tema, casi al pasar. Beat 2-3: seguís lo que el alumno trajo y "
            "recién ahí aparece lo interesante del tema. Beat 4: cierre natural, sin resumen de clase."
        ),
        "comando_de_arranque": (
            "ARRANCÁ EN CASTELLANO. Saludá a {name} corto y natural. Tirá UNA observación breve sobre "
            "{topic} desde tu lado (algo que te pasó o notaste), y preguntale UNA cosa concreta. "
            "No anuncies el tema ni expliques qué van a hacer."
        ),
        "accion_de_continuacion": (
            "Agarrá UNA cosa de lo que dijo y tirá de ese hilo. Sumá algo tuyo breve que enganche con eso "
            "y volvé a preguntar UNA sola cosa. Si se abre, seguilo a él antes que al tema."
        ),
        "accion_de_cierre": (
            "Cerrá quedándote con algo que él contó, sin balance ni resumen. "
            "Preguntá: 'Me tengo que ir, pero ¿seguimos un rato más?'"
        ),
        "ritmo": "1,0,2,1,0,2,3,1",
    },
    {
        "age_slug": "adult", "level_code": "ES2", "arquetipo": "adult_es2",
        "produccion_esperada": (
            "El alumno opina y fundamenta; te contradice o te matiza y trae ejemplos propios."
        ),
        # Compatible con la ley universal "terminá con un motivo claro para hablar": la
        # afirmación filosa ES ese motivo, no un turno abierto al vacío (lo marcó el linter).
        "formato_de_cierre_de_turno": (
            "Cerrá con UNA pregunta que pida el porqué o una postura ('¿por qué te parece?', "
            "'¿vos lo harías?'). También vale rematar con una afirmación filosa en lugar de la "
            "pregunta, siempre que le quede clarísimo que le toca contestar a él."
        ),
        "reglas_de_tono_y_entrega": (
            "Tono: charla de café entre pares, en castellano rioplatense. Fluido, con humor si cae bien. "
            "Turnos cortos con alguno más largo cuando el tema lo pide. Tenés opinión propia y la decís; "
            "no sos un entrevistador neutral. Sin roleplay."
        ),
        "pasos_de_la_sesion": (
            "Beat 1: entrada liviana, casi social. Beat 2-3: aparece la fricción — postura, contraste, "
            "el ángulo que vale la pena. Beat 4: quedan en algo, no en una conclusión cerrada."
        ),
        "comando_de_arranque": (
            "ARRANCÁ EN CASTELLANO. Saludá a {name} en una línea. Entrá a {topic} por lo concreto "
            "(algo puntual, no una tesis) y preguntale UNA cosa. Guardate el ángulo interesante "
            "para el segundo o tercer turno: primero enganchen."
        ),
        "accion_de_continuacion": (
            "Levantá UNA cosa que dijo, nombrala y usala para subir la apuesta: tu opinión, un contraejemplo "
            "o un 'sí, pero'. Una sola movida por turno. Si trajo algo suyo, eso gana sobre tu plan."
        ),
        "accion_de_cierre": (
            "Cerrá con lo que te quedó picando de lo que dijo. "
            "Preguntá: 'Me tengo que ir, pero ¿seguimos un rato más?'"
        ),
        "ritmo": "1,0,2,1,0,2,3,1",
    },
    {
        "age_slug": "adult", "level_code": "ES3", "arquetipo": "adult_es3",
        "produccion_esperada": (
            "El alumno sostiene una postura, la matiza y discute; la charla avanza por asociación y él "
            "propone tanto como vos."
        ),
        # Idem ES2: la variante sin pregunta sigue dejando un motivo directo para hablar.
        "formato_de_cierre_de_turno": (
            "Alterná la pregunta con afirmaciones filosas o remates irónicos que pidan respuesta por "
            "sí solos. Sea cual sea la forma, el alumno queda con algo concreto para contestar — "
            "nunca cierres un turno sin darle ese pie. Cuando preguntes, UNA sola y que duela un poco."
        ),
        "reglas_de_tono_y_entrega": (
            "Tono: dos personas que se conocen, en castellano rioplatense a velocidad real. Ironía, "
            "sobreentendidos, frases a medio terminar, referencias culturales. Podés disentir de una y "
            "bancártela. Nunca suenes a docente. Sin roleplay."
        ),
        "pasos_de_la_sesion": (
            "Beat 1: entrás en el medio de la conversación, como si ya venían hablando. Beat 2-3: el tema "
            "muta por asociación hacia donde esté vivo. Beat 4: se corta donde estaba bueno, sin cierre prolijo."
        ),
        "comando_de_arranque": (
            "ARRANCÁ EN CASTELLANO, en el medio de la charla: nada de preámbulo ni saludo largo. Tirale a "
            "{name} algo puntual y con filo sobre {topic} — una opinión, una queja, algo que viste — y dejá "
            "que responda. No expliques de qué van a hablar."
        ),
        "accion_de_continuacion": (
            "Seguí el hilo más vivo de lo que dijo, aunque te corra del tópico. Contestale como persona: "
            "acordá, discutí o reíte. Una movida por turno, y que el tema derive natural."
        ),
        "accion_de_cierre": (
            "Cortá donde estaba bueno, sin moraleja. "
            "Preguntá: 'Me tengo que ir, pero ¿seguimos un rato más?'"
        ),
        "ritmo": "1,0,2,1,0,2,3,1",
    },
]

_LEVEL_COLS = ["code", "friendly_name", "sort_order", "short_desc", "language_rule",
               "curriculum_grammar", "expected_production", "duration_base_minutes",
               "vocab_depth"]
_CRUCE_COLS = ["age_slug", "level_code", "produccion_esperada", "formato_de_cierre_de_turno",
               "reglas_de_tono_y_entrega", "pasos_de_la_sesion", "comando_de_arranque",
               "accion_de_continuacion", "accion_de_cierre", "arquetipo", "ritmo"]

# Escala de inglés, para decidir desde qué nivel ES entra cada tópico (los abstractos arrancan
# en B1 y no bajan a ES1: el criterio de madurez del tópico se respeta).
_EN_ORDER = {"A0": 0, "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}


def main():
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            # ── 1. levels ──
            for lv in LEVELS:
                cur.execute("SELECT id FROM levels WHERE code=%s", (lv["code"],))
                sets = ", ".join(f"{c}=%s" for c in _LEVEL_COLS if c != "code")
                vals = [lv[c] for c in _LEVEL_COLS if c != "code"]
                if cur.fetchone():
                    cur.execute(f"UPDATE levels SET {sets}, active=1 WHERE code=%s", vals + [lv["code"]])
                    print(f"  levels: {lv['code']} actualizado")
                else:
                    cols = ", ".join(_LEVEL_COLS)
                    ph = ", ".join(["%s"] * len(_LEVEL_COLS))
                    cur.execute(f"INSERT INTO levels ({cols}, active) VALUES ({ph}, 1)",
                                [lv[c] for c in _LEVEL_COLS])
                    print(f"  levels: {lv['code']} CREADO")

            # ── 2. age_level_matrix (el cruce) ──
            for cr in CRUCES:
                cur.execute("SELECT age_slug FROM age_level_matrix WHERE age_slug=%s AND level_code=%s",
                            (cr["age_slug"], cr["level_code"]))
                key = ["age_slug", "level_code"]
                sets = ", ".join(f"{c}=%s" for c in _CRUCE_COLS if c not in key)
                vals = [cr[c] for c in _CRUCE_COLS if c not in key]
                if cur.fetchone():
                    cur.execute(f"UPDATE age_level_matrix SET {sets}, active=1 "
                                f"WHERE age_slug=%s AND level_code=%s",
                                vals + [cr["age_slug"], cr["level_code"]])
                    print(f"  cruce: {cr['age_slug']}x{cr['level_code']} actualizado")
                else:
                    cols = ", ".join(_CRUCE_COLS)
                    ph = ", ".join(["%s"] * len(_CRUCE_COLS))
                    cur.execute(f"INSERT INTO age_level_matrix ({cols}, active) VALUES ({ph}, 1)",
                                [cr[c] for c in _CRUCE_COLS])
                    print(f"  cruce: {cr['age_slug']}x{cr['level_code']} CREADO")

            # ── 3. topics.levels — los MISMOS tópicos, taggeados para el track ES ──
            cur.execute("SELECT id, slug, levels FROM topics WHERE is_active=1 AND audience='adult'")
            rows = cur.fetchall()
            tocados = 0
            for r in rows:
                raw = r["levels"]
                cur_levels = json.loads(raw) if isinstance(raw, str) else (raw or [])
                en = [l for l in cur_levels if l in _EN_ORDER]
                minimo = min((_EN_ORDER[l] for l in en), default=3)
                # Tópico que hoy arranca en A1/A2 -> entra desde ES1. Abstracto (B1+) -> desde ES2.
                nuevos = ["ES1", "ES2", "ES3"] if minimo <= 2 else ["ES2", "ES3"]
                final = list(cur_levels) + [l for l in nuevos if l not in cur_levels]
                if final != cur_levels:
                    cur.execute("UPDATE topics SET levels=%s WHERE id=%s",
                                (json.dumps(final, ensure_ascii=False), r["id"]))
                    tocados += 1
            print(f"  topics: {tocados}/{len(rows)} tópicos adultos taggeados con niveles ES")

        db.conn.commit()
        print("\nOK — track castellano cargado.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main()
