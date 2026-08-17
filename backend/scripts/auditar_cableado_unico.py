"""Es el cableado el MISMO para todas las disciplinas, o cambia segun el flujo?

La pregunta del dueno: ahora que hay clases de idiomas, de oficios, de musica y manana de
historia o quimica, el esqueleto tiene que ser UNO — mismos peldanos, mismos acoples, con
valores distintos. Si el peldano X se acopla a `levels.curriculum_grammar` en una clase de
ingles, tiene que acoplarse a lo mismo en una de plomeria.

Como se mide
------------
El acople de cada peldano es su `source` (tabla.columna) en la traza del resolver. Se compone
el MISMO template contra flujos de familias, edades, niveles y topicos distintos, y se compara
el source campo por campo:

  un solo source por campo   -> cableado unico (lo que se busca)
  dos o mas                  -> el acople DEPENDE del input, y eso es lo que hay que sacar

No mira valores: dos clases pueden decir cosas opuestas y estar bien cableadas. Mira de donde
vino el dato.
"""
from __future__ import annotations

import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.motor_engine import _resolve_v2_breakdown_sync  # noqa: E402

# Un flujo por familia x edad x nivel, con topicos de disciplinas distintas.
FLUJOS = [
    ("lenguaje · adulto · A1 · comida",      "adult",  "A1",   85,  "en"),
    ("lenguaje · adulto · B2 · musica",      "adult",  "B2",   33,  "en"),
    ("lenguaje · teen · A2 · comida",        "teen",   "A2",   85,  "pt"),
    ("lenguaje · mini · A0 · familia",       "mini",   "A0",   135, "en"),
    ("conocimiento · adulto · CON1 · jardin", "adult",  "CON1", 280, "es"),
    ("conocimiento · adulto · CON2 · info",  "adult",  "CON2", 210, "fr"),
    ("conocimiento · adulto · CON1 · musica", "adult",  "CON1", 200, "es"),
    ("conocimiento · teen · CON2 · info",    "teen",   "CON2", 210, "es"),
    ("conocimiento · junior · CON1 · jardin", "junior", "CON1", 280, "pt"),
]


def main() -> None:
    acoples = defaultdict(set)      # campo -> {source, ...}
    presencia = defaultdict(set)    # campo -> {flujo, ...}
    fallos = []

    for nombre, edad, nivel, topico, idioma in FLUJOS:
        bd = _resolve_v2_breakdown_sync(edad, nivel, topico, None, idioma)
        if bd.get("error"):
            fallos.append((nombre, bd["error"]))
            continue
        for st in bd.get("steps", []):
            for e in st.get("entries", []):
                acoples[e["label"]].add(e.get("source") or "?")
                presencia[e["label"]].add(nombre)

    ok = [c for c, s in acoples.items() if len(s) == 1]
    varia = {c: s for c, s in acoples.items() if len(s) > 1}
    parcial = {c: v for c, v in presencia.items()
               if len(v) < len([f for f in FLUJOS if f[0] not in [x[0] for x in fallos]])}

    print(f"flujos compuestos: {len(FLUJOS) - len(fallos)}/{len(FLUJOS)}")
    for n, err in fallos:
        print(f"   NO COMPONE  {n}: {err[:90]}")
    print()
    print(f"=== CAMPOS CON ACOPLE UNICO ({len(ok)}) — mismo source en todos los flujos ===")
    for c in sorted(ok):
        print(f"   {c:<32} <- {list(acoples[c])[0]}")
    print()
    print(f"=== CAMPOS CUYO ACOPLE CAMBIA SEGUN EL FLUJO ({len(varia)}) ===")
    if not varia:
        print("   (ninguno — el cableado es unico)")
    for c, s in sorted(varia.items()):
        print(f"   {c}")
        for src in sorted(s):
            quienes = [n for n, e, l, t, i in FLUJOS
                       if src in {x.get("source") for st in
                                  (_resolve_v2_breakdown_sync(e, l, t, None, i).get("steps") or [])
                                  for x in st.get("entries", []) if x["label"] == c}]
            print(f"      <- {src}")
    print()
    print(f"=== CAMPOS QUE NO APARECEN EN TODOS LOS FLUJOS ({len(parcial)}) ===")
    for c, v in sorted(parcial.items()):
        print(f"   {c:<32} en {len(v)}/{len(FLUJOS) - len(fallos)} flujos")


if __name__ == "__main__":
    main()
