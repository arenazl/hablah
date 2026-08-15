"""Saca el idioma HORNEADO del catálogo y lo deja como placeholder {idioma} / {idioma_base}.

El problema: la orquestación tenía el idioma escrito adentro del texto ("Greet {name} in ENGLISH",
"100% Inglés", "una pregunta sencilla en inglés"). Eso ata el catálogo a UN idioma: sumar
castellano o portugués obliga a reescribir los 11 arquetipos, o a duplicarlos.

Es el mismo pecado que la narrativa fija de kids ("Setting: una nave espacial" en la capa de EDAD,
que chocaba con el tópico comida). Aquello se resolvió haciendo que la EDAD declare el MODO y el
TÓPICO ponga el escenario. Acá igual: el arquetipo declara la ACCIÓN y el alumno pone el idioma.

Después de esto, sumar un idioma = un `language_rule` nuevo + users.target_language. Cero catálogo.

    cd backend && python scripts/parametrizar_idioma_catalogo.py           # dry-run (no escribe)
    cd backend && python scripts/parametrizar_idioma_catalogo.py --apply
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

# Orden IMPORTA: las frases largas primero, para no romperlas con un reemplazo corto.
# El idioma META (lo que se aprende) -> {idioma}; la lengua del alumno -> {idioma_base}.
REGLAS = [
    (r"\bSTART IN ENGLISH\b", "START IN {idioma}"),
    (r"\bin ENGLISH\b", "in {idioma}"),
    (r"\bin English\b", "in {idioma}"),
    (r"\bEnglish\b", "{idioma}"),
    (r"\bENGLISH\b", "{idioma}"),
    (r"\bIngl[eé]s\b", "{idioma}"),
    (r"\bingl[eé]s\b", "{idioma}"),
    (r"\bESPA[NÑ]OL\b", "{idioma_base}"),
    (r"\bEspa[nñ]ol\b", "{idioma_base}"),
    (r"\bespa[nñ]ol\b", "{idioma_base}"),
    (r"\bSpanish\b", "{idioma_base}"),
]

# Qué campos se tocan. NO se toca `levels.language_rule` con las mismas reglas ciegas: es el campo
# que DEFINE la mezcla de idiomas y se trata igual, pero se revisa aparte en el reporte.
# SOLO filas ACTIVAS: el dato muerto no se parametriza. Sin este filtro, los niveles ES1-ES3
# desactivados ("Hablás 100% en castellano... Nada de inglés") se convertían en "Nada de español",
# una contradicción absurda — el falso positivo que justifica revisar el listado antes de escribir.
OBJETIVOS = [
    ("age_level_matrix", ["age_slug", "level_code"],
     ["produccion_esperada", "formato_de_cierre_de_turno", "reglas_de_tono_y_entrega",
      "pasos_de_la_sesion", "comando_de_arranque", "accion_de_continuacion", "accion_de_cierre"]),
    ("levels", ["code"],
     ["language_rule", "curriculum_grammar", "expected_production"]),
    ("student_types", ["slug"],
     ["tutor_identity", "session_focus", "estilo_de_sesion", "anclas_narrativas", "pedagogy",
      "form_rules", "tutor_tonal_rules", "opening_seed", "continuation_seed", "closing_seed"]),
    # El ejemplo queda idéntico en inglés ("English 'elephant'... real English"); en otro idioma
    # el 'elephant' es residuo a curar, y la regla está gateada a A2 máx.
    ("conversation_rules", ["slug"], ["rule_text"]),
]


def convertir(texto):
    if not texto:
        return texto, 0
    nuevo, n = texto, 0
    for patron, reemplazo in REGLAS:
        nuevo, k = re.subn(patron, reemplazo, nuevo)
        n += k
    return nuevo, n


# Tablas/campos que NO se tocan pero se REPORTAN si mencionan un idioma — para ver a ojo si algo
# quedó afuera por error (o si conviene sumarlo).
NO_TOCADOS = [
    ("orchestration_templates", ["name"], ["body"]),
    ("topics", ["slug"], ["narrative_role", "narrative_setting", "narrative_conflict"]),
]
_MENCION = re.compile(r"(ENGLISH|English|Ingl[eé]s|ingl[eé]s|ESPA[NÑ]OL|Espa[nñ]ol|espa[nñ]ol|Spanish)")

_REPORTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_reporte_idioma.txt")


def main(apply_changes):
    db = _connect()
    total = 0
    out = []

    def w(s=""):
        out.append(s)
        print(s)

    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            w("=" * 90)
            w("A REEMPLAZAR  (texto COMPLETO, revisar antes de aplicar)")
            w("=" * 90)
            for tabla, pk, campos in OBJETIVOS:
                cur.execute(f"SELECT {', '.join(pk + campos)} FROM {tabla} WHERE active=1")
                for row in cur.fetchall():
                    clave = " x ".join(str(row[k]) for k in pk)
                    cambios = {}
                    for c in campos:
                        nuevo, n = convertir(row.get(c))
                        if n:
                            cambios[c] = nuevo
                            total += n
                            w(f"\n--- [{tabla}] {clave} . {c}   ({n} reemplazos)")
                            w(f"  ANTES:   {row[c]}")
                            w(f"  DESPUES: {nuevo}")
                    if cambios and apply_changes:
                        sets = ", ".join(f"{c}=%s" for c in cambios)
                        where = " AND ".join(f"{k}=%s" for k in pk)
                        cur.execute(f"UPDATE {tabla} SET {sets} WHERE {where}",
                                    list(cambios.values()) + [row[k] for k in pk])

            w("\n\n" + "=" * 90)
            w("NO SE TOCA pero MENCIONA un idioma  (revisar: ¿falta, o está bien que quede?)")
            w("=" * 90)
            for tabla, pk, campos in NO_TOCADOS:
                cur.execute(f"SELECT {', '.join(pk + campos)} FROM {tabla}")
                for row in cur.fetchall():
                    for c in campos:
                        v = row.get(c) or ""
                        ms = _MENCION.findall(v)
                        if ms:
                            clave = " x ".join(str(row[k]) for k in pk)
                            w(f"\n--- [{tabla}] {clave} . {c}   ({len(ms)} menciones: {set(ms)})")
                            w(f"  {v[:400]}")

            w("\n\n" + "=" * 90)
            w("RESIDUOS: ejemplos literales en un idioma DENTRO de los campos ya parametrizados")
            w("=" * 90)
            ejemplo = re.compile(r"'([^']*[A-Za-z]{3}[^']*)'")
            for tabla, pk, campos in OBJETIVOS:
                cur.execute(f"SELECT {', '.join(pk + campos)} FROM {tabla}")
                for row in cur.fetchall():
                    for c in campos:
                        v = row.get(c) or ""
                        if not convertir(v)[1]:
                            continue
                        for e in ejemplo.findall(v):
                            if re.search(r"\b(What|Do you|Did you|How|Why|Where|Challenge|ready)\b", e):
                                clave = " x ".join(str(row[k]) for k in pk)
                                w(f"  [{tabla}] {clave}.{c}: ejemplo fijo -> '{e}'")

        if apply_changes:
            db.conn.commit()
            w(f"\n\nAPLICADO — {total} reemplazos escritos en el catálogo.")
        else:
            w(f"\n\nDRY-RUN — {total} reemplazos detectados. Nada escrito.")
        with open(_REPORTE, "w", encoding="utf-8") as f:
            f.write("\n".join(out))
        print(f"\nreporte completo -> {_REPORTE}")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main("--apply" in sys.argv)
