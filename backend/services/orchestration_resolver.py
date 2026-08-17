"""Resolver genérico de la orquestación-como-DATO (reingeniería placeholders, F3).

Parsea el template activo (orchestration_templates) → resuelve cada placeholder {PREFIJO:campo}
según su PREFIJO (el prefijo declara el dueño del dato = la ley de asignación hecha sintaxis) →
interpola {name}/{topic}/{word}/{tutor} → fail-fast si falta un dato. Cero pedagogía en el código;
CERO hardcode de idioma (sale de {NIVEL:idioma_instruccion}).

Drop-in de compose_proto_prompt: MISMA firma. Reemplaza el f-string hardcodeado del composer viejo.

| Prefijo       | Fuente                                            |
|---------------|---------------------------------------------------|
| STATIC        | runtime (fecha, device)                           |
| ALUMNO        | users                                             |
| EDAD          | student_types (slug del alumno)                   |
| NIVEL         | levels (code del alumno)                          |
| TOPICO        | topics (título, semillas, anclas narrativas)      |
| EDAD_X_NIVEL  | age_level_matrix (cruce) + reglas computadas      |
"""
from __future__ import annotations

import datetime
import re
from typing import Optional

from services.composer_proto import (
    _session_seed, _derive, _pick, _rotate, _get_vocabulary, _interp,
    _get_learner_state, _get_output_rules, _etiquetas_segmento, MotorDataMissing, _req,
)
from services.motor_engine import _connect, _json_list

_PH = re.compile(r"\{([A-Z_]+):([a-z_]+)\}")

def _lang_names() -> dict:
    """code -> nombre del idioma EN SU PROPIO IDIOMA (endónimo), desde la tabla `languages`.

    Es DATO, no una lista en el código: sumar portugués es un INSERT, no un deploy. El endónimo
    mantiene idénticos los textos que ya estaban en inglés ("Speak 100% in English") y suena
    natural en los que están en castellano. Resuelve {idioma} / {idioma_base}."""
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        return {r["code"]: r["name_native"] for r in (db.q("SELECT code, name_native FROM languages") or [])}
    except Exception:
        return {}
    finally:
        try:
            db.conn.close()
        except Exception:
            pass


def _load_orchestration(age_slug: str, level_code: str, template_id: int | None = None):
    """template_id: compone con OTRO template sin publicarlo (banco de pruebas del /motor).
    Sirve para comparar variantes de densidad escritas en la MISMA sintaxis del motor —
    mismos placeholders, mismo resolver — en vez de prompts a mano. Sin id: el activo."""
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        tpl = (db.q1("SELECT body FROM orchestration_templates WHERE id=%s", (template_id,))
               if template_id else
               db.q1("SELECT body FROM orchestration_templates WHERE active=1 ORDER BY id DESC LIMIT 1"))
        row = db.q1("SELECT * FROM age_level_matrix WHERE age_slug=%s AND level_code=%s AND active=1",
                    (age_slug, level_code))
        rules = db.q("SELECT slug, rule_text, age_groups, families, min_level, max_level, sort_order "
                     "FROM conversation_rules WHERE active=1 ORDER BY sort_order")
        # La ESCALA de niveles es dato (levels.sort_order), no una lista en el código: así un track
        # nuevo (castellano ES1-ES3, fonética FONR) gatea las reglas por su lugar en la escala sin
        # tocar el resolver. Antes era un literal A0..C2 y todo lo demás caía en 0 (= gateaba como A0).
        order = {r["code"]: (r["sort_order"] or 0)
                 for r in (db.q("SELECT code, sort_order FROM levels") or [])}
        return tpl, row, rules, order
    finally:
        db.conn.close()


def load_rhythm(age_slug: str, level_code: str, wave_override: str | None = None):
    """Onda de intensidad del cruce — DATO para el director de orquesta de la capa viva.

    age_level_matrix.ritmo = secuencia "1,0,2,1,0,1,2,3,2,1" (0=icebreaker, 1=normal,
    2=profunda, 3=la más filosa; se cicla). El SIGNIFICADO de cada nivel vive en
    app_config (rhythm_level_0..3) redactado RELATIVO al nivel del alumno (agnóstico).
    wave_override: cadencia ad-hoc del probador /motor ("1,0,2,...") — pisa la del cruce
    SOLO para esa sesión de prueba, sin tocar el catálogo.
    Devuelve JSON autocontenido {"wave": [...], "levels": {...}} o None (sin director)."""
    import json as _json

    def _parse(raw: str):
        try:
            return [int(x) for x in (raw or "").replace(" ", "").split(",") if x != ""]
        except ValueError:
            return []

    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        wave = _parse(wave_override) if wave_override else []
        if not wave:
            row = db.q1("SELECT ritmo FROM age_level_matrix WHERE age_slug=%s AND level_code=%s AND active=1",
                        (age_slug, level_code))
            wave = _parse((row or {}).get("ritmo") or "")
        if not wave:
            return None
        rows = db.q("SELECT config_key, config_value FROM app_config WHERE config_key LIKE 'rhythm_level_%%'")
        levels = {r["config_key"].rsplit("_", 1)[-1]: r["config_value"] for r in (rows or [])}
        if not levels:
            return None
        return _json.dumps({"wave": wave, "levels": levels}, ensure_ascii=False)
    finally:
        db.conn.close()


def _filter_rules(rules, age_slug: str, level_code: str, level_order: dict, picked_out=None,
                  familia: str | None = None) -> str:
    """Gating por dato (age_groups + min/max_level) + reenumeración. Reemplaza los target_ids
    hardcodeados y los 2 bloques: la selección es puro dato. El ORDEN de los niveles también
    es dato (levels.sort_order) — ver _load_orchestration."""
    li = level_order.get(level_code, 0)
    picked = []
    for r in rules:
        ags = _json_list(r.get("age_groups"))
        if ags and age_slug not in [str(a).lower() for a in ags]:
            continue
        # FAMILIA: el acoplamiento que faltaba. Sin esto, "corregí los errores de idioma
        # recasteando" y "pronunciá como nativo" entraban en una clase de jardinería, donde
        # el alumno no aprende ningún idioma. NULL = todas, así que la columna es aditiva.
        fams = _json_list(r.get("families"))
        if fams and familia and familia.lower() not in [str(f).lower() for f in fams]:
            continue
        mn, mx = r.get("min_level"), r.get("max_level")
        if mn and mn in level_order and level_order[mn] > li:
            continue
        if mx and mx in level_order and level_order[mx] < li:
            continue
        picked.append(r["rule_text"])
        # Cada ley es una FILA con su slug y su propio gateo. El visor las mostraba pegadas en
        # un solo bloque de texto, sin decir cuál era cuál ni de dónde salía: para revisar por
        # qué una regla entró o se cayó había que ir a la base. Ahora viajan como items.
        if picked_out is not None:
            picked_out.append({
                "n": len(picked), "slug": r.get("slug"), "texto": r["rule_text"],
                "fuente": f"conversation_rules.rule_text (slug={r.get('slug')})",
                "gateo": {"age_groups": ags or "todas",
                          "min_level": r.get("min_level"), "max_level": r.get("max_level")},
            })
    return "\n".join(f"{i}. {t}" for i, t in enumerate(picked, 1))


# Tabla de origen por prefijo — para el visor del /motor (dueño = prefijo). Antes había un
# mapa (prefijo, campo) -> "tabla.columna" fila por fila; ahora que el campo ES la columna,
# la fuente se deriva: agregar un campo al template no toca este archivo.
_TABLA = {"EDAD": "student_types", "NIVEL": "levels", "TOPICO": "topics",
          "ALUMNO": "users", "STATIC": "runtime", "EDAD_X_NIVEL": "age_level_matrix"}
_GROUP = {"STATIC": "Contexto (runtime)", "ALUMNO": "Alumno", "EDAD": "El profe (EDAD)",
          "NIVEL": "El nivel (NIVEL)", "TOPICO": "El tópico (TÓPICO)",
          "EDAD_X_NIVEL": "El cruce (EDAD × NIVEL)", "HISTORIA": "La historia (ALUMNO)",
          "SALIDA": "Reglas de salida (runtime)"}
_FUENTE_OPCIONAL = {("HISTORIA", "memoria_del_alumno"): "learner_state (por materia)",
                    ("SALIDA", "reglas_de_formato"): "app_config"}


def compose_from_template(
    *,
    user=None,
    topic=None,
    methodology_module: Optional[dict] = None,  # legacy compat (ignorado)
    topic_content: Optional[dict] = None,
    student_type_data: Optional[dict] = None,
    level_data: Optional[dict] = None,
    app_config: Optional[dict] = None,
    learner_state: Optional[dict] = None,
    interaction_state: Optional[dict] = None,
    session_seed: Optional[int] = None,
    template_id: Optional[int] = None,
    _trace: Optional[list] = None,
) -> str:
    std = dict(_req(student_type_data, "student_type_data (eje EDAD)"))
    lv = dict(_req(level_data, "level_data (eje NIVEL)"))
    age_slug = (std.get("slug") or getattr(user, "age_group", None) or "?")
    level_code = getattr(user, "cefr_level", None) or "?"
    ctx = f"segmento={age_slug}, nivel={level_code}"

    tpl, row, rules, level_order = _load_orchestration(age_slug, level_code, template_id)
    # Rótulo que cada placeholder tiene EN EL PROMPT ("Level_Target: {NIVEL:curriculum_grammar}").
    # El visor coloreaba por un mapa rótulo->dueño escrito a mano en el front, que quedaba viejo
    # con cada cambio de template y pintaba de gris —"texto fijo"— todo lo que no estuviera en la
    # lista. Mandando el rótulo, el front deriva el dueño del dato real y no adivina nada.
    _ROTULO = {(p, f): lab for lab, p, f in
               re.findall(r"^[ \t]*([A-Za-z_]+):[ \t]*\{([A-Z_]+):([a-z_]+)\}[ \t]*$",
                          tpl.get("body") or "", re.M)}
    # CAPA = la sección XML que contiene al placeholder. Las capas no se declaran en el código:
    # ya están en el template, con nombre propio. Agrupando por ahí, renombrar una capa o mover
    # un campo de una capa a otra es editar la plantilla — cero deploy — y el visor sigue solo.
    _CAPA: dict = {}
    _seccion = None
    for _linea in (tpl.get("body") or "").split("\n"):
        _abre = re.match(r"^[ \t]*<([a-z_]+)>[ \t]*$", _linea)
        if _abre:
            _seccion = _abre.group(1)
            continue
        if re.match(r"^[ \t]*</[a-z_]+>[ \t]*$", _linea):
            continue
        for _p, _f in _PH.findall(_linea):
            _CAPA[(_p, _f)] = _seccion or "otros"
    _req(tpl and tpl.get("body"),
         f"orchestration_templates[id={template_id}]" if template_id
         else "orchestration_templates.active (no hay template activo)", ctx)
    _req(row, f"age_level_matrix[{age_slug},{level_code}] — cruce inexistente (¿combo válido?)", ctx)

    # Semilla + vocab (misma mecánica que el composer: variedad por construcción)
    if session_seed is None:
        session_seed = _session_seed(getattr(user, "id", None), getattr(topic, "id", None),
                                     datetime.date.today().isoformat())
    user_name = _req(getattr(user, "nombre", None), "user.nombre", ctx)
    title, raw_vocab, raw_phrases = _get_vocabulary(topic, topic_content)
    _req(title, "tópico (sequencer no resolvió tópico)", ctx)
    _req(raw_vocab or raw_phrases, "vocab/frases del tópico", ctx)
    vocab = _rotate(raw_vocab, _derive(session_seed, "words"))[:4] if raw_vocab else []
    seed_phrase = _derive(session_seed, "phrase")
    phrases = _rotate(raw_phrases, seed_phrase) if raw_phrases else []
    first_word = _pick(vocab or phrases, seed_phrase) or ""

    tutor = std.get("tutor_mascot") or "Coach"
    topic_title = title or "today's topic"
    # Idioma que se aprende / lengua del alumno — el catálogo los referencia como {idioma} y
    # {idioma_base}, nunca escribiéndolos. Sumar portugués = target_language='pt', cero catálogo.
    _tl = getattr(user, "target_language", None) or "en"
    _bl = getattr(user, "base_language", None) or "es"
    _names = _lang_names()
    idioma = _names.get(_tl, _tl)
    idioma_base = _names.get(_bl, _bl)

    # Anclas del TÓPICO (Role/Setting/Mission), interpoladas.
    # Si la EDAD declara NO ROLEPLAY (teen/adult), NO se inyecta la escena del tópico: chocaría con
    # el modo (una charla real no arma un role-play). Se pasa el tópico como ÁNGULO, no como escena.
    def _topic_anchors() -> str:
        # Si la EDAD ya declaró NO ROLEPLAY, el tópico no aporta escena: el campo queda VACÍO
        # y su línea se cae. Antes devolvía un literal en inglés escrito acá, y eso rompía dos
        # cosas: el mismo peldaño se acoplaba al tópico en unos flujos y al código en otros
        # (con el `source` diciendo `topics` en ambos, o sea mintiendo), y además repetía la
        # regla que ya daban `Narrative_Mode` y la ley `no_shared_perception` — la misma orden
        # tres veces en el mismo prompt, en dos idiomas.
        if "NO ROLEPLAY" in (std.get("anclas_narrativas") or "").upper():
            return ""
        role = _interp(getattr(topic, "narrative_role", "") or "", user_name, topic_title, first_word)
        setting = _interp(getattr(topic, "narrative_setting", "") or "", user_name, topic_title, first_word)
        mission = _interp(getattr(topic, "narrative_conflict", "") or "", user_name, topic_title, first_word)
        parts = []
        if role:
            parts.append(f"Role: {role}")
        if setting:
            parts.append(f"Setting: {setting}")
        if mission:
            parts.append(f"Mission/Conflict: {mission}")
        return " · ".join(parts)

    # EDAD y NIVEL eran diccionarios CERRADOS acá: exponían 5 de las 14 columnas de
    # student_types y 2 de las 7 de levels. Había dato cargado que el template no podía
    # pedir, y sumar un campo costaba un deploy. Ahora son ABIERTOS igual que EDAD_X_NIVEL:
    # {EDAD:cualquier_columna} resuelve contra la fila. Los 4 nombres viejos del template
    # (tutor_name, gamification_focus, gramatica_objetivo, idioma_instruccion) se renombraron
    # a su columna real en las plantillas, así que acá no queda ninguna tabla de alias.
    _EDAD = dict(std)
    _NIVEL = dict(lv)
    _STATIC = {
        "current_date": datetime.date.today().isoformat(),
        "device_type": "Mobile (Voice Input)",
    }
    _ALUMNO = {
        "nombre": user_name,
        "edad": _etiquetas_segmento(app_config).get(age_slug, age_slug),
        "nivel": level_code,
    }
    # De qué columna salieron REALMENTE las semillas. `_get_vocabulary` las busca en cascada
    # (allowed_vocabulary -> pinned_vocabulary -> keywords, y required_keywords ->
    # generated_vocab), así que el mismo placeholder puede venir de columnas distintas según
    # el tópico. Decir "topics.semillas" —que ni siquiera es una columna— tapaba eso.
    _col_semillas = "topics.keywords"
    if vocab and getattr(topic, "pinned_vocabulary", None):
        _col_semillas = "topics.pinned_vocabulary"
    elif not vocab and phrases:
        _col_semillas = "topics.generated_vocab"

    _TOPICO = {
        "titulo": topic_title,
        "semillas": ", ".join(vocab or phrases),
        "anclas_narrativas": _topic_anchors(),
    }

    # Bloques COMPUTADOS que antes se pegaban al final por código, fuera del template. Eso
    # los hacía invisibles para el visor (no eran pasos), no reordenables y no removibles por
    # plantilla: el motor mostraba una vista PARCIAL de lo que realmente mandaba. Ahora son
    # placeholders como cualquier otro. Son OPCIONALES: si no hay dato, el resolver devuelve
    # "" y la línea entera del template se cae — que es "vacío a propósito", distinto de
    # "falta el dato" (eso sigue reventando).
    _OPCIONAL = {
        ("HISTORIA", "memoria_del_alumno"): lambda: _get_learner_state(learner_state),
        ("SALIDA", "reglas_de_formato"): lambda: _get_output_rules(app_config),
    }

    def resolve(prefix: str, field: str) -> str:
        if (prefix, field) in _OPCIONAL:
            val = (_OPCIONAL[(prefix, field)]() or "").strip()
            if _trace is not None and val:
                _trace.append({"group": _CAPA.get((prefix, field)) or _GROUP.get(prefix, prefix),
                               "prefix": prefix, "label": field,
                               "source": _FUENTE_OPCIONAL[(prefix, field)],
                               "campo_en_prompt": _ROTULO.get((prefix, field)), "body": val})
            return val
        items = None
        if prefix == "EDAD_X_NIVEL":
            if field == "reglas_universales_filtradas":
                items = []
                val = _filter_rules(rules, age_slug, level_code, level_order, items,
                                    familia=(lv.get("family") or None))
                source = "conversation_rules.rule_text (una fila por ley, gateadas)"
            else:
                val = _req(row.get(field), f"age_level_matrix.{field}", ctx)
                source = f"age_level_matrix.{field}"
        else:
            src = {"STATIC": _STATIC, "ALUMNO": _ALUMNO, "EDAD": _EDAD,
                   "NIVEL": _NIVEL, "TOPICO": _TOPICO}.get(prefix)
            if src is None:
                raise MotorDataMissing(f"[resolver] prefijo desconocido en template: {{{prefix}:{field}}}")
            val = src.get(field)
            if val is None:
                raise MotorDataMissing(f"[resolver] campo faltante: {{{prefix}:{field}}} ({ctx})")
            val = str(val)
            source = (_col_semillas if (prefix, field) == ("TOPICO", "semillas")
                      else f"{_TABLA.get(prefix, prefix.lower())}.{field}")
        if _trace is not None:
            capa = _CAPA.get((prefix, field)) or _GROUP.get(prefix, prefix)
            if items:
                # Cada ley es su PROPIA entrada, no un choclo con once adentro. Así cada una
                # tiene su panel, su fila de origen, su gateo y su botón de editar, igual que
                # cualquier otro campo del motor.
                for it in items:
                    _trace.append({"group": capa, "prefix": prefix, "label": it["slug"],
                                   "source": "conversation_rules.rule_text",
                                   "campo_en_prompt": f"ley {it['n']}", "body": it["texto"],
                                   "gateo": it["gateo"], "fila": it["slug"]})
            else:
                _trace.append({"group": capa, "prefix": prefix, "label": field, "source": source,
                               "campo_en_prompt": _ROTULO.get((prefix, field)), "body": val})
        return val

    body = _PH.sub(lambda m: resolve(m.group(1), m.group(2)), tpl["body"])
    # Una línea cuyo único contenido era un placeholder OPCIONAL vacío se cae entera, para no
    # dejar "Student_Memory:" colgado sin nada atrás. Se hace acá y no en el sub porque el
    # rótulo vive en el template, no en el placeholder.
    body = re.sub(r"^[ \t]*[A-Za-z_]+:[ \t]*$\n?", "", body, flags=re.M)

    # Interpolación de placeholders sueltos dentro de los textos resueltos.
    # {idioma}/{idioma_base}: el idioma NO se escribe dentro de la orquestación (era "in ENGLISH"
    # horneado en cada arquetipo, lo que ataba el catálogo a un solo idioma). El arquetipo declara
    # la ACCIÓN, el alumno pone el idioma — misma jugada que las anclas narrativas, donde la EDAD
    # declara el modo y el TÓPICO pone el escenario.
    def _interpolar(t: str) -> str:
        return (t.replace("{name}", user_name).replace("{topic}", topic_title)
                 .replace("{first_vocab}", first_word).replace("{word}", first_word)
                 .replace("{tutor}", tutor)
                 .replace("{idioma}", idioma).replace("{idioma_base}", idioma_base))

    body = _interpolar(body)

    # El visor guardaba el valor CRUDO, así que mostraba "{idioma}" y "{word}" sin resolver
    # mientras el prompt real los llevaba reemplazados: una vista parcial que no servía para
    # revisar nada. Se interpola igual que el body, incluidos los items de cada ley.
    if _trace is not None:
        for e in _trace:
            e["body"] = _interpolar(e["body"])

    # Ya no hay bloques pegados al final: la memoria del alumno y las reglas de salida entran
    # por placeholder ({HISTORIA:memoria_del_alumno} / {SALIDA:reglas_de_formato}), así que
    # el visor ve TODO lo que se manda y la plantilla decide dónde va y si va.
    return body.strip()


def compose_breakdown(**kwargs) -> dict:
    """Visor del /motor FROM-TEMPLATE: resuelve el prompt y arma los 'steps' (fuente + dueño por
    campo) parseando el MISMO template. El dueño = el prefijo del placeholder. Dinámico: si el
    template cambia, el visor cambia — sin duplicar lógica."""
    trace: list = []
    try:
        prompt = compose_from_template(_trace=trace, **kwargs)
    except MotorDataMissing as e:
        return {"steps": [], "prompt": "", "error": str(e)}
    # agrupar entries por grupo (prefijo), en orden de aparición
    steps, order = {}, []
    for e in trace:
        g = e["group"]
        if g not in steps:
            steps[g] = []
            order.append(g)
        entrada = {"label": e["label"], "source": e["source"], "dueno": e["prefix"],
                   "campo_en_prompt": e.get("campo_en_prompt"), "body": e["body"]}
        if e.get("gateo"):
            entrada["gateo"] = e["gateo"]
        if e.get("fila"):
            entrada["fila"] = e["fila"]
        steps[g].append(entrada)
    return {"steps": [{"step": g, "entries": steps[g]} for g in order], "prompt": prompt}
