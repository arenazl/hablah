"""Peldaños de densidad del banco /motor — L1..L5 como TEMPLATES de verdad.

Por qué templates y no prompts a mano: si los seis los escribe una persona, lo que se mide es
esa prosa, no el motor. Acá cada peldaño usa los MISMOS placeholders y el MISMO resolver que
producción — sólo cambia CUÁNTOS entran. Y el ganador no se porta: se publica con active=1.

La escalera va de menos a más y es ACUMULATIVA (cada uno = el anterior + un bloque):

  L1  esqueleto      quién · con quién · de qué · en qué idioma          5 placeholders
  L2  + nivel        qué nivel toca y qué forma tiene la charla          7
  L3  + intención    qué tiene que producir el alumno                    9
  L4  + modo         el modo narrativo y el tono                        11
  L5  + guion        arranque, rieles, continuación, cierre, 10 leyes   17
  L6  = el ACTIVO    + semillas, anclas del tópico, contexto            23   (fila id=1, no se duplica)

El salto de L4 a L5 es donde el motor pasa de DECLARAR a DICTAR. Ahí se espera ver el quiebre.

Idempotente: borra los peldaños previos (name LIKE 'L_ %') y los reinserta. NUNCA toca el
template activo ni pone active=1 en ninguno — son inertes hasta que el probador los elige.
"""
from __future__ import annotations

import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402


L1 = """<context_and_persona>
  <student_profile>
    Name: {ALUMNO:nombre}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Identity: {EDAD:tutor_identity}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
  </topic_data>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
  </language_and_tone>
</rules_of_engagement>"""


L2 = """<context_and_persona>
  <student_profile>
    Name: {ALUMNO:nombre}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Identity: {EDAD:tutor_identity}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
  </topic_data>
  <learning_goals>
    Level_Target: {NIVEL:gramatica_objetivo}
  </learning_goals>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
  </language_and_tone>
</rules_of_engagement>

<execution_flow>
  <structure>
    Style: {EDAD:estilo_de_sesion}
  </structure>
</execution_flow>"""


L3 = """<context_and_persona>
  <student_profile>
    Name: {ALUMNO:nombre}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Identity: {EDAD:tutor_identity}
    Gamification_Focus: {EDAD:gamification_focus}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
  </topic_data>
  <learning_goals>
    Level_Target: {NIVEL:gramatica_objetivo}
    Expected_Production: {EDAD_X_NIVEL:produccion_esperada}
  </learning_goals>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
  </language_and_tone>
</rules_of_engagement>

<execution_flow>
  <structure>
    Style: {EDAD:estilo_de_sesion}
  </structure>
</execution_flow>"""


L4 = """<context_and_persona>
  <student_profile>
    Name: {ALUMNO:nombre}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Identity: {EDAD:tutor_identity}
    Gamification_Focus: {EDAD:gamification_focus}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
  </topic_data>
  <learning_goals>
    Level_Target: {NIVEL:gramatica_objetivo}
    Expected_Production: {EDAD_X_NIVEL:produccion_esperada}
  </learning_goals>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
    Form_Rules: {EDAD_X_NIVEL:reglas_de_tono_y_entrega}
  </language_and_tone>
</rules_of_engagement>

<execution_flow>
  <structure>
    Style: {EDAD:estilo_de_sesion}
  </structure>
  <runtime_commands>
    Narrative_Mode: {EDAD:anclas_narrativas}
  </runtime_commands>
</execution_flow>"""


L5 = """<context_and_persona>
  <student_profile>
    Name: {ALUMNO:nombre}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Identity: {EDAD:tutor_identity}
    Gamification_Focus: {EDAD:gamification_focus}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
  </topic_data>
  <learning_goals>
    Level_Target: {NIVEL:gramatica_objetivo}
    Expected_Production: {EDAD_X_NIVEL:produccion_esperada}
    Call_to_Action_Format: {EDAD_X_NIVEL:formato_de_cierre_de_turno}
  </learning_goals>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
    Language_Note: These system instructions and the topic title may be written in a language other than the one you must speak - they are for YOU to interpret, never to read out. The Language_Rule above is the ONLY thing that decides what language you speak in.
    Form_Rules: {EDAD_X_NIVEL:reglas_de_tono_y_entrega}
  </language_and_tone>
  <conversation_laws>
    {EDAD_X_NIVEL:reglas_universales_filtradas}
  </conversation_laws>
</rules_of_engagement>

<execution_flow>
  <structure>
    Style: {EDAD:estilo_de_sesion}
    Session_Rails: {EDAD_X_NIVEL:pasos_de_la_sesion}
  </structure>
  <runtime_commands>
    Start_Command: {EDAD_X_NIVEL:comando_de_arranque}
    Narrative_Mode: {EDAD:anclas_narrativas}
    Continuation_Action: {EDAD_X_NIVEL:accion_de_continuacion}
    Closing_Action: {EDAD_X_NIVEL:accion_de_cierre}
  </runtime_commands>
</execution_flow>"""


PELDANOS = [
    ("L1 esqueleto", "Quien, con quien, de que y en que idioma. Sin objetivos, sin guion, sin leyes, sin semillas.", L1),
    ("L2 + nivel", "L1 + que nivel toca y que forma tiene la charla.", L2),
    ("L3 + intencion", "L2 + que tiene que producir el alumno y el foco de la sesion.", L3),
    ("L4 + modo y tono", "L3 + el modo narrativo y las reglas de tono. Ultimo peldano que DECLARA sin dictar.", L4),
    ("L5 + guion y leyes", "L4 + arranque, rieles, continuacion, cierre y las 10 leyes. Aca el motor pasa a dictar.", L5),
]


async def main() -> None:
    async with AsyncSessionLocal() as s:
        activo = (await s.execute(text(
            "SELECT id, name FROM orchestration_templates WHERE active=1 ORDER BY id DESC LIMIT 1"
        ))).mappings().first()
        print(f"template ACTIVO (= peldano L6, no se toca): id={activo['id']} name={activo['name']!r}")

        borradas = (await s.execute(text(
            "DELETE FROM orchestration_templates WHERE active=0 AND name LIKE 'L_ %'"
        ))).rowcount
        if borradas:
            print(f"peldanos previos borrados: {borradas}")

        for name, notes, body in PELDANOS:
            await s.execute(text(
                "INSERT INTO orchestration_templates (name, body, active, notes) "
                "VALUES (:n, :b, 0, :o)"
            ), {"n": name, "b": body, "o": notes})
        await s.commit()

        print("\npeldanos cargados:")
        for r in (await s.execute(text(
            "SELECT id, name, active, LENGTH(body) AS chars FROM orchestration_templates ORDER BY id"
        ))).mappings().all():
            marca = "  <- ACTIVO (L6)" if r["active"] else ""
            print(f"  id={r['id']:<3} {r['name']:<22} {r['chars']:>5} chars{marca}")


if __name__ == "__main__":
    asyncio.run(main())
