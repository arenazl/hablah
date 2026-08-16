"""Recorte de densidad del prompt, MANTENIENDO la estructura del template.

Sirve para responder una pregunta que no se puede contestar mirando el código: ¿el
tamaño del prompt afecta cómo responde el coach por voz (latencia, transcripción del
alumno)? Con el prompt mínimo hardcodeado la charla es rápida pero mala; con el
completo es buena pero lenta. Esto permite medir el punto medio SIN cambiar el motor:
mismos bloques, mismos placeholders, mismo orden — sólo menos densidad.

Los 4 niveles quitan de afuera hacia adentro, en el orden en que el coach puede
suplirlo solo:

  0 entera          todo lo que compone el motor
  1 light           el núcleo de reglas (las que definen que sea una charla)
  2 mega light      + sin anclas narrativas ni rieles de sesión
  3 mega mega light + sólo persona, tópico y arranque: el esqueleto

NUNCA se rompe un bloque XML: se sacan enteros o se recorta su lista interna. Un
prompt a medio cerrar sería otra variable y arruinaría la medición.
"""
from __future__ import annotations

import re

# Reglas que sobreviven en `light`: sin estas no es una charla, es un cuestionario.
# Se eligieron por lo que aportan a la CONVERSACIÓN, no por largo.
NUCLEO_LIGHT = (
    "salud",              # always_greet — regla dura del producto
    "invisible",          # invisible_structure — que no parezca una clase
    "build each turn",    # build_on_student — engancharse con lo que dijo
    "one conversational", # one_move_per_turn — turnos cortos
    "end every turn",     # end_with_reason_to_speak — dejarle la pelota
)
# En `mega light` queda lo mínimo indispensable.
NUCLEO_MEGA = ("salud", "one conversational")

NIVELES = {0: "entera", 1: "light", 2: "mega light", 3: "mega mega light"}


def _filtrar_leyes(prompt: str, marcas: tuple[str, ...] | None) -> str:
    """Deja sólo las leyes cuyo texto contiene alguna marca. `None` = sacar el bloque."""
    m = re.search(r"(<conversation_laws>)(.*?)(</conversation_laws>)", prompt, re.S)
    if not m:
        return prompt
    if marcas is None:
        return prompt[:m.start()] + prompt[m.end():]
    lineas = [l for l in m.group(2).splitlines() if l.strip()]
    quedan = [l for l in lineas if any(k in l.lower() for k in marcas)]
    # Renumerar: si quedan "1. 4. 7." el coach ve huecos y puede inferir que falta algo.
    renum = []
    for i, l in enumerate(quedan, 1):
        renum.append(re.sub(r"^\s*\d+\.\s*", f"  {i}. ", l))
    return prompt[:m.start(2)] + "\n" + "\n".join(renum) + "\n  " + prompt[m.end(2):]


def _sacar_tag(prompt: str, tag: str) -> str:
    """Saca un bloque entero por su tag de apertura/cierre."""
    return re.sub(rf"\s*<{tag}>.*?</{tag}>", "", prompt, flags=re.S)


def _sacar_linea(prompt: str, campo: str) -> str:
    """Saca una línea suelta del tipo `Campo: valor` (sin tag propio)."""
    return re.sub(rf"^\s*{campo}:.*$\n?", "", prompt, flags=re.M)


def trim(prompt: str, nivel: int) -> str:
    """Devuelve el prompt recortado al nivel pedido (0-3). Nivel inválido = sin tocar."""
    if not prompt or nivel <= 0:
        return prompt

    if nivel == 1:
        return _filtrar_leyes(prompt, NUCLEO_LIGHT)

    if nivel == 2:
        p = _filtrar_leyes(prompt, NUCLEO_MEGA)
        # Las anclas y los rieles guían la escena y el arco; el coach improvisa sin eso.
        for campo in ("Narrative_Anchors", "Narrative_Mode", "Session_Rails", "Style"):
            p = _sacar_linea(p, campo)
        return p

    # nivel 3: el esqueleto. Quién es, de qué se habla, cómo arranca y cómo sigue.
    p = _filtrar_leyes(prompt, None)
    for campo in ("Narrative_Anchors", "Narrative_Mode", "Session_Rails", "Style",
                  "Level_Target", "Expected_Production", "Call_to_Action_Format",
                  "Language_Note", "Form_Rules", "Closing_Action", "Current_Date",
                  "Device_Type", "Gamification_Focus"):
        p = _sacar_linea(p, campo)
    p = _sacar_tag(p, "system_info")
    # Colapsar las líneas en blanco que dejan los recortes.
    return re.sub(r"\n{3,}", "\n\n", p).strip()
