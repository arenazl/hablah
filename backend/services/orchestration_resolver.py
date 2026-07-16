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
    _get_learner_state, _get_output_rules, _SEGMENT_LABEL, MotorDataMissing, _req,
)
from services.motor_engine import _connect, _json_list

_PH = re.compile(r"\{([A-Z_]+):([a-z_]+)\}")
_LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]


def _load_orchestration(age_slug: str, level_code: str):
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        tpl = db.q1("SELECT body FROM orchestration_templates WHERE active=1 ORDER BY id DESC LIMIT 1")
        row = db.q1("SELECT * FROM age_level_matrix WHERE age_slug=%s AND level_code=%s AND active=1",
                    (age_slug, level_code))
        rules = db.q("SELECT slug, rule_text, age_groups, min_level, max_level, sort_order "
                     "FROM conversation_rules WHERE active=1 ORDER BY sort_order")
        return tpl, row, rules
    finally:
        db.conn.close()


def _filter_rules(rules, age_slug: str, level_code: str) -> str:
    """Gating por dato (age_groups + min/max_level) + reenumeración. Reemplaza los target_ids
    hardcodeados y los 2 bloques: la selección es puro dato."""
    li = _LEVEL_ORDER.index(level_code) if level_code in _LEVEL_ORDER else 0
    picked = []
    for r in rules:
        ags = _json_list(r.get("age_groups"))
        if ags and age_slug not in [str(a).lower() for a in ags]:
            continue
        mn, mx = r.get("min_level"), r.get("max_level")
        if mn and mn in _LEVEL_ORDER and _LEVEL_ORDER.index(mn) > li:
            continue
        if mx and mx in _LEVEL_ORDER and _LEVEL_ORDER.index(mx) < li:
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
    _trace: Optional[list] = None,
) -> str:
    std = dict(_req(student_type_data, "student_type_data (eje EDAD)"))
    lv = dict(_req(level_data, "level_data (eje NIVEL)"))
    age_slug = (std.get("slug") or getattr(user, "age_group", None) or "?")
    level_code = getattr(user, "cefr_level", None) or "?"
    ctx = f"segmento={age_slug}, nivel={level_code}"

    tpl, row, rules = _load_orchestration(age_slug, level_code)
    _req(tpl and tpl.get("body"), "orchestration_templates.active (no hay template activo)", ctx)
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

    # Anclas del TÓPICO (Role/Setting/Mission), interpoladas
    def _topic_anchors() -> str:
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
        "edad": _SEGMENT_LABEL.get(age_slug, age_slug),
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
                val = _filter_rules(rules, age_slug, level_code)
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

    # Interpolación de placeholders sueltos dentro de los textos resueltos
    body = (body.replace("{name}", user_name).replace("{topic}", topic_title)
                .replace("{first_vocab}", first_word).replace("{word}", first_word)
                .replace("{tutor}", tutor))

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
