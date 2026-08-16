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
        rules = db.q("SELECT slug, rule_text, age_groups, min_level, max_level, sort_order "
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


def _filter_rules(rules, age_slug: str, level_code: str, level_order: dict) -> str:
    """Gating por dato (age_groups + min/max_level) + reenumeración. Reemplaza los target_ids
    hardcodeados y los 2 bloques: la selección es puro dato. El ORDEN de los niveles también
    es dato (levels.sort_order) — ver _load_orchestration."""
    li = level_order.get(level_code, 0)
    picked = []
    for r in rules:
        ags = _json_list(r.get("age_groups"))
        if ags and age_slug not in [str(a).lower() for a in ags]:
            continue
        mn, mx = r.get("min_level"), r.get("max_level")
        if mn and mn in level_order and level_order[mn] > li:
            continue
        if mx and mx in level_order and level_order[mx] < li:
            continue
        picked.append(r["rule_text"])
    return "\n".join(f"{i}. {t}" for i, t in enumerate(picked, 1))


# fuente (tabla.columna) por placeholder — para el visor del /motor (dueño = prefijo)
_SOURCE = {
    ("EDAD", "tutor_name"): "student_types.tutor_mascot",
    ("EDAD", "tutor_identity"): "student_types.tutor_identity",
    ("EDAD", "gamification_focus"): "student_types.session_focus",
    ("EDAD", "estilo_de_sesion"): "student_types.estilo_de_sesion",
    ("EDAD", "anclas_narrativas"): "student_types.anclas_narrativas",
    ("NIVEL", "gramatica_objetivo"): "levels.curriculum_grammar",
    ("NIVEL", "idioma_instruccion"): "levels.language_rule",
}
_GROUP = {"STATIC": "Contexto (runtime)", "ALUMNO": "Alumno", "EDAD": "El profe (EDAD)",
          "NIVEL": "El nivel (NIVEL)", "TOPICO": "El tópico (TÓPICO)",
          "EDAD_X_NIVEL": "El cruce (EDAD × NIVEL)"}


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
        if "NO ROLEPLAY" in (std.get("anclas_narrativas") or "").upper():
            return ("Real conversation about the topic — NOT a roleplay. Do not invent a shared scene, "
                    "characters, or a physical setting; talk about the topic as two people would.")
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

    _EDAD = {
        "tutor_name": std.get("tutor_mascot"),
        "tutor_identity": std.get("tutor_identity"),
        "gamification_focus": std.get("session_focus"),
        "estilo_de_sesion": std.get("estilo_de_sesion"),
        "anclas_narrativas": std.get("anclas_narrativas"),
    }
    _NIVEL = {
        "gramatica_objetivo": lv.get("curriculum_grammar"),
        "idioma_instruccion": lv.get("language_rule"),
    }
    _STATIC = {
        "current_date": datetime.date.today().isoformat(),
        "device_type": "Mobile (Voice Input)",
    }
    _ALUMNO = {
        "nombre": user_name,
        "edad": _etiquetas_segmento(app_config).get(age_slug, age_slug),
        "nivel": level_code,
    }
    _TOPICO = {
        "titulo": topic_title,
        "semillas": ", ".join(vocab or phrases),
        "anclas_narrativas": _topic_anchors(),
    }

    def resolve(prefix: str, field: str) -> str:
        if prefix == "EDAD_X_NIVEL":
            if field == "reglas_universales_filtradas":
                val = _filter_rules(rules, age_slug, level_code, level_order)
                source = "conversation_rules (gateadas)"
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
            source = _SOURCE.get((prefix, field), f"{prefix.lower()}.{field}")
        if _trace is not None:
            _trace.append({"group": _GROUP.get(prefix, prefix), "prefix": prefix,
                           "label": field, "source": source, "body": val})
        return val

    body = _PH.sub(lambda m: resolve(m.group(1), m.group(2)), tpl["body"])

    # Interpolación de placeholders sueltos dentro de los textos resueltos.
    # {idioma}/{idioma_base}: el idioma NO se escribe dentro de la orquestación (era "in ENGLISH"
    # horneado en cada arquetipo, lo que ataba el catálogo a un solo idioma). El arquetipo declara
    # la ACCIÓN, el alumno pone el idioma — misma jugada que las anclas narrativas, donde la EDAD
    # declara el modo y el TÓPICO pone el escenario.
    body = (body.replace("{name}", user_name).replace("{topic}", topic_title)
                .replace("{first_vocab}", first_word).replace("{word}", first_word)
                .replace("{tutor}", tutor)
                .replace("{idioma}", idioma).replace("{idioma_base}", idioma_base))

    # Bloques computados opcionales apilados al final (memoria + reglas de salida runtime)
    tail = [_get_learner_state(learner_state), _get_output_rules(app_config)]
    return "\n\n".join([body] + [b for b in tail if b])


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
        steps[g].append({"label": e["label"], "source": e["source"], "dueno": e["prefix"], "body": e["body"]})
    return {"steps": [{"step": g, "entries": steps[g]} for g in order], "prompt": prompt}
