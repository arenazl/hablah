"""Verificación de ESQUEMA de una orquestación — el botón Verificar del probador.

Qué NO hace
-----------
No lee el contenido buscando palabras sospechosas. "Se filtró un verbo inglés" es adivinar:
depende de una lista de patrones, da falsos positivos y no prueba nada. Acá no hay análisis
de texto.

Qué hace
--------
Comprueba REFERENCIAS: que cada dato que entró al prompt haya salido de la fila que le
correspondía al flujo elegido (disciplina · edad · nivel · tópico · idioma · alumno). Cada
alarma es una comparación de claves, así que es verificable mirando dos filas de la base.

Las preguntas que contesta:

  familia_cruzada     el tópico es de una familia y el nivel de otra (un tópico de idiomas
                      compuesto con un nivel CON, o al revés). El motor compone igual porque
                      nada valida el cruce entre las dos tablas.
  nivel_no_declarado  `topics.levels` no incluye el nivel que estás componiendo.
  segmento_cruzado    `topics.segmento` no es la edad que elegiste.
  gateo_invalido      una ley entró pese a que su gateo (age_groups / min / max) no da para
                      este cruce, o al revés. Se recalcula el gateo y se compara.
  nivel_del_alumno    el alumno tiene otro nivel cargado en `user_level` para esta materia.
  historia_de_otra    el learner_state que entró es de otra materia que la de esta clase.
  fila_inexistente    un dato que el prompt usa no tiene fila propia para este cruce.
"""
from __future__ import annotations

import json
from typing import Optional

# Nota de diseño: NO hay chequeo de "este campo no varía con el idioma". Que `levels` sea una
# sola fila A1 para los seis idiomas es una decisión de arquitectura —el catálogo es agnóstico
# y el coach instancia— no un error del flujo. Marcarlo disparaba 16 alarmas en cada corrida y
# tapaba las de verdad. Acá sólo entran comparaciones de CLAVES: qué fila se usó vs cuál correspondía.


def _lista(v):
    if not v:
        return []
    if isinstance(v, list):
        return v
    try:
        d = json.loads(v)
        return d if isinstance(d, list) else []
    except Exception:
        return []


def _alarma(sev, tipo, campo, detalle, esperado="", encontrado="", arreglo=""):
    return {"severidad": sev, "tipo": tipo, "campo": campo, "detalle": detalle,
            "esperado": str(esperado)[:200], "encontrado": str(encontrado)[:200],
            "arreglo": arreglo}


def verificar_esquema(*, steps: list, prompt: str, flujo: dict, catalogo: dict) -> dict:
    """flujo: lo que el usuario eligió en los combos.
       catalogo: las filas que el motor uso de verdad (topico, nivel, cruce, reglas, alumno)."""
    alarmas: list = []
    entradas = [e for st in (steps or []) for e in st.get("entries", [])]

    edad = flujo.get("age_group")
    nivel = flujo.get("level")
    idioma = flujo.get("target_language")
    topico = catalogo.get("topico") or {}
    fila_nivel = catalogo.get("nivel") or {}
    cruce = catalogo.get("cruce") or {}
    reglas = catalogo.get("reglas") or []
    orden_niveles = catalogo.get("orden_niveles") or {}
    user_level = catalogo.get("user_level") or {}
    historia = catalogo.get("historia") or {}
    materia = catalogo.get("materia")

    # 1. FAMILIA CRUZADA — el tópico y el nivel vienen de familias distintas.
    fam_topico = (topico.get("family") or "").lower() or None
    fam_nivel = (fila_nivel.get("family") or "").lower() or None
    if fam_topico and fam_nivel and fam_topico != fam_nivel:
        alarmas.append(_alarma(
            "alta", "familia_cruzada", f"topics[{topico.get('id')}] × levels[{nivel}]",
            "El tópico y el nivel son de familias distintas. El motor compone igual porque "
            "nadie valida el cruce entre las dos tablas.",
            f"misma familia", f"tópico={fam_topico} · nivel={fam_nivel}",
            "O el tópico está en la categoría equivocada, o este nivel no le corresponde."))

    # 2. NIVEL NO DECLARADO por el tópico.
    declarados = _lista(topico.get("levels"))
    if declarados and nivel and nivel not in declarados:
        alarmas.append(_alarma(
            "alta", "nivel_no_declarado", f"topics[{topico.get('id')}].levels",
            "Estás componiendo un nivel que el tópico no declara.",
            declarados, nivel,
            "Agregar el nivel a topics.levels, o elegir otro tópico para este nivel."))

    # 3. SEGMENTO CRUZADO.
    seg = (topico.get("segmento") or "").lower()
    equiv = {"adultos": "adult", "adulto": "adult", "mini": "mini", "junior": "junior", "teen": "teen"}
    if seg and equiv.get(seg, seg) != edad:
        alarmas.append(_alarma(
            "media", "segmento_cruzado", f"topics[{topico.get('id')}].segmento",
            "El tópico es de otro segmento de edad que el que elegiste.",
            edad, seg, "Revisar topics.segmento o elegir otra edad."))

    # 5. GATEO INVÁLIDO — se recalcula qué leyes deberían entrar y se compara con las que entraron.
    # Que leyes entraron DE VERDAD. Cada una es su propia entrada desde que se partio el
    # choclo; antes venian como `items` adentro de un solo campo. Leer el formato viejo hacia
    # que `entraron` quedara vacio y el chequeo reportara las 13 como caidas.
    entraron = {e.get("label"): e for e in entradas
                if (e.get("source") or "").startswith("conversation_rules")}
    # GUARDARRAIL: si hay leyes cargadas y el chequeo no encontro NINGUNA en el prompt
    # compuesto, lo mas probable no es que se hayan caido las trece — es que este codigo esta
    # leyendo mal. Paso: cuando las leyes se partieron en un panel cada una, esto seguia
    # buscandolas adentro de un campo con `items` y reporto 13 alarmas falsas. Un verificador
    # que se equivoca sobre su propia lectura es peor que no tenerlo, asi que avisa en vez de
    # acusar al motor.
    if reglas and not entraron:
        alarmas.append(_alarma(
            "alta", "chequeo_no_pudo_leer", "(verificador)",
            f"Hay {len(reglas)} leyes cargadas y no reconoci ninguna en el prompt. Antes de "
            f"creerle a este reporte, hay que revisar como las esta leyendo el chequeo.",
            "al menos una ley reconocida", "ninguna",
            "El formato de la traza cambio y este codigo no. No es un problema del motor."))
    elif reglas:
        li = orden_niveles.get(nivel, 0)
        for r in reglas:
            slug = r.get("slug")
            ags = [str(a).lower() for a in _lista(r.get("age_groups"))]
            fams = [str(f).lower() for f in _lista(r.get("families"))]
            mn, mx = r.get("min_level"), r.get("max_level")
            deberia = True
            motivo = ""
            # La FAMILIA es parte del filtro desde hoy. Sin mirarla, las tres leyes de idiomas
            # se reportaban como "caidas" en toda clase de conocimiento, que es justo donde
            # corresponde que no entren.
            if fams and fam_nivel and fam_nivel not in fams:
                deberia, motivo = False, f"families={fams} no incluye {fam_nivel}"
            elif ags and edad not in ags:
                deberia, motivo = False, f"age_groups={ags} no incluye {edad}"
            elif mn and mn in orden_niveles and orden_niveles[mn] > li:
                deberia, motivo = False, f"min_level={mn}"
            elif mx and mx in orden_niveles and orden_niveles[mx] < li:
                deberia, motivo = False, f"max_level={mx}"
            esta = slug in entraron
            if esta != deberia:
                alarmas.append(_alarma(
                    "alta", "gateo_invalido", f"conversation_rules[{slug}]",
                    ("Entró una ley que su propio gateo no habilita." if esta else
                     "Se cayó una ley que su gateo sí habilita."),
                    "entra" if deberia else "no entra", "entró" if esta else "no entró",
                    motivo or "revisar el gateo de la fila"))
            # El orden de niveles es compartido entre familias: CON2 y A1 valen lo mismo.
            elif esta and (mn or mx) and fam_nivel and fam_topico and fam_nivel != "lenguaje":
                alarmas.append(_alarma(
                    "alta", "gateo_por_numero", f"conversation_rules[{slug}]",
                    f"Entró por rango de nivel ({mn or '·'}→{mx or '·'}), pero ese rango es de "
                    f"la escala de `lenguaje` y esta clase es de `{fam_nivel}`. "
                    f"`levels.sort_order` es compartido: {nivel} vale lo mismo que un nivel de idiomas.",
                    f"gateo por familia", f"gateo por sort_order={li}",
                    "conversation_rules necesita una dimensión de FAMILIA."))

    # 6. NIVEL DEL ALUMNO — lo que dice user_level para esta materia.
    if user_level and user_level.get("level_code") and nivel and user_level["level_code"] != nivel:
        alarmas.append(_alarma(
            "baja", "nivel_del_alumno", f"user_level[{user_level.get('user_id')}, {materia}]",
            "El alumno tiene otro nivel cargado para esta materia.",
            user_level["level_code"], nivel,
            "Es sólo un aviso: en el probador podés componer cualquier nivel."))

    # 7. HISTORIA DE OTRA MATERIA.
    if historia and materia and historia.get("materia") not in (None, materia):
        alarmas.append(_alarma(
            "alta", "historia_de_otra", "learner_state.materia",
            "La historia que entró al prompt es de otra materia.",
            materia, historia.get("materia"),
            "El post-clase escribió sin materia, o se está leyendo la fila equivocada."))

    # 8. FILA INEXISTENTE — el cruce que el prompt necesita.
    if not cruce:
        alarmas.append(_alarma(
            "alta", "fila_inexistente", f"age_level_matrix[{edad}, {nivel}]",
            "No hay fila para este cruce.", "una fila", "ninguna",
            "Cargarla, o el combo no debería ofrecer esta combinación."))

    orden = {"alta": 0, "media": 1, "baja": 2}
    alarmas.sort(key=lambda a: orden.get(a["severidad"], 9))
    return {
        "alarmas": alarmas,
        "resumen": {
            "total": len(alarmas),
            "alta": sum(1 for a in alarmas if a["severidad"] == "alta"),
            "media": sum(1 for a in alarmas if a["severidad"] == "media"),
            "baja": sum(1 for a in alarmas if a["severidad"] == "baja"),
            "campos": len(entradas), "leyes": len(entraron), "chars_prompt": len(prompt or ""),
        },
    }
