"""Auditoria de CABLES del motor por MUESTREO dirigido — un caso por cosa, no cartesiano.

La pregunta no es "falta un dato" (eso lo mide barrido_huecos_motor.py). Es:
"este campo dice depender del IDIOMA / de la EDAD / del NIVEL — de verdad depende?".

Definicion mecanica: un cable esta conectado si el valor CAMBIA cuando se mueve el eje del
que deberia depender. Se compone el MISMO caso variando UN eje y se comparan los campos.
Con un caso por disciplina ya salta la ficha; el cartesiano no agrega senal y castiga la base.

La muestra (una de cada cosa):
    lenguaje   adult  A1    Comer cuando viajas      en vs fr   -> el eje IDIOMA
    lenguaje   mini   A0    Mi familia               en vs pt   -> idem en kids
    conocimiento adult CON1 Jardineria desde cero    es vs fr   -> oficio
    conocimiento adult CON2 Informatica desde cero   es vs fr   -> informatica
    conocimiento adult CON1 Teoria musical desde cero es vs pt  -> musica

No corre ninguna clase: compone y compara. No escribe nada.
"""
from __future__ import annotations

import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.motor_engine import _resolve_v2_sync  # noqa: E402

CAMPOS = ["Level_Target", "Language_Rule", "Words_Available", "Expected_Production",
          "Form_Rules", "Session_Rails", "Start_Command", "Continuation_Action",
          "Narrative_Mode", "Identity"]

# Que se espera de cada campo DESPUES de corregir los cables.
#
# La arquitectura correcta no es "todo varia con el idioma": es que el CATALOGO sea agnostico
# y el idioma entre solo por {idioma}/{idioma_base} + la conversion que hace el coach. Si cada
# campo tuviera que variar, agregar un idioma serian 7 niveles x N idiomas de filas nuevas, y
# eso es justo lo que el track castellano vino a evitar.
#
# Entonces la prueba ya no es "varia?" sino dos cosas distintas:
#   VARIA_CON_IDIOMA  campos donde el idioma se NOMBRA -> tienen que moverse
#   AGNOSTICO         campos que NO deben moverse, pero tampoco pueden tener forma inglesa
VARIA_CON_IDIOMA = {"Language_Rule"}

# Formas atadas a un idioma concreto que no pueden aparecer en un campo agnostico.
FORMA_INGLESA = re.compile(
    r"\bTo Be\b|\bThere is\b|\bThere are\b|I think\b|In my opinion\b|However\b|Although\b"
    r"|\bphrasal\b|'I \w|What color|\bIdioms\b", re.I)

MUESTRA = [
    {"n": "lenguaje · adulto · ingles vs frances",
     "edad": "adult", "nivel": "A1", "topico": 85,  "a": "en", "b": "fr"},
    {"n": "lenguaje · kids · ingles vs portugues",
     "edad": "mini",  "nivel": "A0", "topico": 135, "a": "en", "b": "pt"},
    {"n": "conocimiento · oficio (jardineria)",
     "edad": "adult", "nivel": "CON1", "topico": 280, "a": "es", "b": "fr"},
    {"n": "conocimiento · informatica",
     "edad": "adult", "nivel": "CON2", "topico": 210, "a": "es", "b": "fr"},
    {"n": "conocimiento · musica",
     "edad": "adult", "nivel": "CON1", "topico": 200, "a": "es", "b": "pt"},
]


def campos_de(prompt: str) -> dict:
    out = {}
    for c in CAMPOS:
        m = re.search(rf"^\s*{c}: (.*)$", prompt, re.M)
        if m:
            out[c] = m.group(1).strip()
    return out


def componer(edad, nivel, topico, idioma):
    try:
        return campos_de(_resolve_v2_sync(edad, nivel, topico, None, None, 4242, idioma)["prompt"])
    except Exception as e:
        return {"__error__": str(e)[:140]}


def corto(s, n=88):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def main() -> None:
    cables = {}
    for caso in MUESTRA:
        print("=" * 96)
        print(f"{caso['n']}   —   {caso['edad']} · {caso['nivel']} · topico {caso['topico']}")
        print("=" * 96)
        A = componer(caso["edad"], caso["nivel"], caso["topico"], caso["a"])
        B = componer(caso["edad"], caso["nivel"], caso["topico"], caso["b"])
        if "__error__" in A or "__error__" in B:
            print(f"  NO COMPONE: {A.get('__error__') or B.get('__error__')}\n")
            continue

        for campo in CAMPOS:
            if campo not in A:
                continue
            movio = A[campo] != B[campo]
            forma = FORMA_INGLESA.search(A[campo])
            if campo in VARIA_CON_IDIOMA and not movio:
                estado, motivo = "CABLE SUELTO", "nombra el idioma y no se mueve"
            elif forma:
                estado, motivo = "CABLE SUELTO", f"forma atada al ingles: {forma.group(0)!r}"
            else:
                estado, motivo = ("conectado  " if movio else "agnostico  "), ""
            if estado.strip() == "CABLE SUELTO":
                cables.setdefault(campo, []).append(f"{caso['n']} ({motivo})")
            print(f"  [{estado}] {campo}{'  <- ' + motivo if motivo else ''}")
            print(f"      {caso['a']}: {corto(A[campo])}")
            if movio:
                print(f"      {caso['b']}: {corto(B[campo])}")
        print()

    print("=" * 96)
    print("CABLES SUELTOS — campos que NO se mueven al cambiar el idioma, y deberian")
    print("=" * 96)
    if not cables:
        print("  (ninguno)")
    for campo, casos in sorted(cables.items(), key=lambda x: -len(x[1])):
        print(f"  {campo:<22} en {len(casos)}/{len(MUESTRA)} casos")
        for c in casos:
            print(f"      · {c}")


if __name__ == "__main__":
    main()
