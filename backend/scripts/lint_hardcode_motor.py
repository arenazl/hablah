"""Detector de hardcode en el motor: qué debería ser DATO y todavía está en código.

Doctrina: para cambiar el comportamiento del motor hay que tocar placeholders y
tablas, nunca los compilados. Este script recorre los archivos del motor y marca
lo que rompe esa regla, ordenado por gravedad.

Qué busca:
  ALTA    · reglas de negocio en `if` por slug/nivel/idioma
          · textos que van al prompt escritos en el código
          · idiomas y códigos de nivel nombrados a mano
  MEDIA   · diccionarios y listas de catálogo
          · números mágicos (umbrales, topes, cantidades)
  BAJA    · defaults y etiquetas

No marca: docstrings, comentarios, nombres de campos, ni el andamiaje (f-strings
de estructura XML).

Uso:  python scripts/lint_hardcode_motor.py [--todo]
"""
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ARCHIVOS = [
    "services/composer_proto.py",
    "services/orchestration_resolver.py",
    "api/motor.py",
    "api/orchestrator.py",
    "services/super_prompt.py",
]

# (regex, gravedad, por qué está mal, dónde debería vivir)
PATRONES = [
    (r'\b(?:age_slug|slug|level_slug|level_code|band)\s*(?:==|!=)\s*["\'](\w+)["\']',
     "ALTA", "regla de negocio decidida por un slug en el código",
     "columna en student_types / levels"),
    (r'\bin\s*\[\s*["\'](?:a0|a1|a2|b1|b2|c1|c2|mini|junior|teen|adult)["\']',
     "ALTA", "lista de niveles o bandas escrita a mano",
     "consulta a levels / student_types"),
    (r'["\'][A-Z][a-z]+(?: [a-z\'()]+){6,}',
     "ALTA", "texto largo que va al prompt, escrito en el código",
     "app_config / age_level_matrix / conversation_rules"),
    (r'\b(?:target_language|base_language|idioma)\s*(?:==|!=)\s*["\']\w+["\']',
     "ALTA", "comportamiento atado a un idioma concreto",
     "placeholder {idioma} + tabla languages"),
    (r'^_?[A-Z][A-Z_]{2,}\s*(?::\s*[\w\[\], ]+)?\s*=\s*[\{\[]',
     "MEDIA", "diccionario o lista de catálogo en el código",
     "tabla propia o app_config"),
    (r'(?<![\w.])(?:[3-9]|[1-9]\d+)\s*(?:if|else)\b|\[\s*:\s*([2-9]|[1-9]\d)\s*\]',
     "MEDIA", "número mágico (tope, corte o cantidad)",
     "columna configurable"),
]

# Lo que NO se marca aunque matchee
IGNORAR = re.compile(
    r'^\s*#|^\s*"""|^\s*\'\'\'|'          # comentarios y docstrings
    r'FALLBACK|_fallback|'                 # las redes declaradas a propósito
    r'raise |Exception|logger|print\(|'    # errores y logs
    r'import |from |def |class ',
    re.I)


def revisar(path: str) -> list[tuple]:
    full = os.path.join(BASE, path)
    if not os.path.exists(full):
        return []
    hallazgos = []
    dentro_docstring = False
    for n, linea in enumerate(open(full, encoding="utf-8"), 1):
        # saltear bloques de docstring
        if linea.count('"""') % 2 == 1:
            dentro_docstring = not dentro_docstring
            continue
        if dentro_docstring or IGNORAR.search(linea):
            continue
        for rx, grav, por_que, donde in PATRONES:
            if re.search(rx, linea, re.M):
                hallazgos.append((grav, path, n, linea.strip()[:100], por_que, donde))
                break
    return hallazgos


def main(mostrar_todo: bool):
    todos = []
    for f in ARCHIVOS:
        todos += revisar(f)

    orden = {"ALTA": 0, "MEDIA": 1, "BAJA": 2}
    todos.sort(key=lambda h: (orden[h[0]], h[1], h[2]))

    if not todos:
        print("sin hardcode detectado")
        return

    from collections import Counter
    c = Counter(h[0] for h in todos)
    print(f"{len(todos)} hallazgos — " + " · ".join(f"{k}: {v}" for k, v in c.most_common()))
    print()

    grav_actual = None
    for grav, path, n, linea, por_que, donde in todos:
        if grav != grav_actual:
            grav_actual = grav
            print(f"\n═══ {grav} ═══")
        print(f"\n{path}:{n}")
        print(f"  {linea}")
        print(f"  → {por_que}")
        print(f"  → debería vivir en: {donde}")
        if not mostrar_todo and grav == "MEDIA" and todos.index((grav, path, n, linea, por_que, donde)) > 25:
            break


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--todo", action="store_true", help="sin recortar")
    args = p.parse_args()
    main(args.todo)
