"""
Motor de prompts · genera el <system_instruction_stack> desde el modelo v3.

Flujo: student -> banda(edad) + nivel + tópico (última sesión) -> orquestación
que matchea -> resuelve las 9 capas + contenido dinámico (currículum del nivel
menos lo dominado) + overrides -> renderiza las plantillas del trigger -> XML.

Driver: pymysql (cualquier conexión DB-API con %s params sirve).
"""
from __future__ import annotations
import pymysql
from pymysql.cursors import DictCursor

OBJECTIVES_PER_CLASS = 4   # cuántos objetivos del currículum entran por clase


class MotorDB:
    def __init__(self, **conn_kwargs):
        self.conn = pymysql.connect(cursorclass=DictCursor, charset="utf8mb4", **conn_kwargs)

    def q(self, sql, params=()):
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())

    def q1(self, sql, params=()):
        rows = self.q(sql, params)
        return rows[0] if rows else None


# --------------------------------------------------------------------------- #
#  Resolución
# --------------------------------------------------------------------------- #
def _band_group_for_trigger(code: str) -> str:
    return "kid" if code in ("early_child", "child") else code  # teen | adult


def _norm_override(o: dict) -> dict:
    """Normaliza un override pasado en memoria al shape de orchestration_override."""
    return {"slot": o.get("slot", "behavioral_guard"), "action": o["action"],
            "target_id": o.get("target_id"), "body": o.get("body")}


def resolve_context(db: MotorDB, student_id: int, test_overrides: list | None = None) -> dict:
    """Resuelve banda, nivel, tópico y la orquestación que aplica.
    Si test_overrides != None, usa esos overrides en memoria (sin tocar la DB)."""
    st = db.q1("SELECT * FROM student WHERE student_id=%s", (student_id,))
    if not st:
        raise ValueError(f"student {student_id} inexistente")
    band = db.q1("SELECT * FROM age_band WHERE %s BETWEEN min_age AND max_age", (st["age"],))
    level = db.q1("SELECT * FROM `level` WHERE level_code=%s", (st["level_code"],))
    ses = db.q1("SELECT * FROM session WHERE student_id=%s ORDER BY started_at DESC LIMIT 1",
                (student_id,))
    topic = db.q1("SELECT * FROM topic WHERE topic_id=%s", (ses["topic_id"],)) if ses else None

    # orquestación activa más específica (NULL = comodín)
    cands = db.q(
        """SELECT * FROM orchestration
           WHERE status='active'
             AND (band_id IS NULL OR band_id=%s)
             AND (level_code IS NULL OR level_code=%s)
             AND (topic_id IS NULL OR topic_id=%s)""",
        (band["band_id"], level["level_code"], topic["topic_id"] if topic else None),
    )
    cands.sort(key=lambda o: (o["band_id"] is not None) + (o["level_code"] is not None)
               + (o["topic_id"] is not None), reverse=True)
    orch = cands[0] if cands else None
    overrides = db.q("SELECT * FROM orchestration_override WHERE orchestration_id=%s",
                     (orch["orchestration_id"],)) if orch else []

    if test_overrides is not None:                       # camino de prueba: sin persistir
        overrides = [_norm_override(o) for o in test_overrides]
        orch = {"name": "(orquestación en memoria · sin persistir)"}

    return {"student": st, "band": band, "level": level, "session": ses,
            "topic": topic, "orchestration": orch, "overrides": overrides}


def resolve_context_params(db: MotorDB, band_code: str, level_code: str, topic_id: int | None = None,
                           student_id: int | None = None, test_overrides: list | None = None) -> dict:
    """Resuelve el contexto desde parámetros explícitos (playground).
    banda + nivel mandan; el alumno (opcional) solo aporta su progreso."""
    band = db.q1("SELECT * FROM age_band WHERE code=%s", (band_code,))
    level = db.q1("SELECT * FROM `level` WHERE level_code=%s", (level_code,))
    topic = db.q1("SELECT * FROM topic WHERE topic_id=%s", (topic_id,)) if topic_id else None
    if student_id is not None:
        st = db.q1("SELECT * FROM student WHERE student_id=%s", (student_id,))
    else:
        st = {"student_id": None, "name": "(demo)", "age": band["min_age"], "level_code": level_code}

    cands = db.q(
        """SELECT * FROM orchestration WHERE status='active'
             AND (band_id IS NULL OR band_id=%s)
             AND (level_code IS NULL OR level_code=%s)
             AND (topic_id IS NULL OR topic_id=%s)""",
        (band["band_id"], level["level_code"], topic_id))
    cands.sort(key=lambda o: (o["band_id"] is not None) + (o["level_code"] is not None)
               + (o["topic_id"] is not None), reverse=True)
    orch = cands[0] if cands else None
    overrides = db.q("SELECT * FROM orchestration_override WHERE orchestration_id=%s",
                     (orch["orchestration_id"],)) if orch else []
    if test_overrides is not None:
        overrides = [_norm_override(o) for o in test_overrides]
        orch = {"name": "(orquestación en memoria · sin persistir)"}

    return {"student": st, "band": band, "level": level, "session": None,
            "topic": topic, "orchestration": orch, "overrides": overrides}


def _ov_disabled(overrides: list, slot: str) -> set:
    return {o["target_id"] for o in overrides
            if o["slot"] == slot and o["action"] == "disable" and o.get("target_id")}


def _ov_added(overrides: list, slot: str) -> list[str]:
    return [o["body"] for o in overrides
            if o["slot"] == slot and o["action"] == "add" and o.get("body")]


def resolve_guards(db: MotorDB, ctx: dict) -> list[str]:
    """Capa 6: guardas de banda (− disabled + added) + modificador de nivel +
    políticas de nivel + universales, cada sub-grupo editable por su slot."""
    band, level, ov = ctx["band"], ctx["level"], ctx["overrides"]
    out = []
    dis_g = _ov_disabled(ov, "behavioral_guard")
    for g in db.q("SELECT guard_id, body FROM behavioral_guard WHERE band_id=%s ORDER BY ord", (band["band_id"],)):
        if g["guard_id"] not in dis_g:
            out.append(g["body"])
    out += _ov_added(ov, "behavioral_guard")
    out.append(level["modifier"])
    dis_lp = _ov_disabled(ov, "level_policy")
    for p in db.q("SELECT policy_id, body FROM level_policy WHERE level_code=%s ORDER BY kind",
                  (level["level_code"],)):
        if p["policy_id"] not in dis_lp:
            out.append(p["body"])
    out += _ov_added(ov, "level_policy")
    dis_u = _ov_disabled(ov, "universal_policy")
    for u in db.q("SELECT policy_id, body FROM universal_policy ORDER BY kind, ord"):
        if u["policy_id"] not in dis_u:
            out.append(u["body"])
    out += _ov_added(ov, "universal_policy")
    return out


def resolve_lexis(db: MotorDB, ctx: dict) -> tuple[list[str], list[str]]:
    """Capa 7: léxico del tópico hasta el nivel del alumno (graduado por CEFR)."""
    if not ctx["topic"]:
        return [], []
    rows = db.q(
        """SELECT lx.lexis_type, lx.text FROM topic_lexis lx
           JOIN `level` l ON l.level_code = lx.cefr_level
           WHERE lx.topic_id=%s AND l.sort_order <= %s
           ORDER BY l.sort_order, lx.ord""",
        (ctx["topic"]["topic_id"], ctx["level"]["sort_order"]),
    )
    words = [r["text"] for r in rows if r["lexis_type"] == "word"]
    phrases = [r["text"] for r in rows if r["lexis_type"] == "phrase"]
    return words, phrases


def resolve_objectives(db: MotorDB, ctx: dict, limit: int = OBJECTIVES_PER_CLASS) -> list[dict]:
    """Capa 7b (DINÁMICO): currículum del nivel − dominado, priorizando 'due'.
    Cada objetivo trae sus chunks comunicativos (objective_chunk): el material de
    habla colgado de la FUNCIÓN, no del tópico → reutilizable en cualquier tema."""
    rows = db.q(
        """SELECT lo.objective_id, lo.kind, lo.description, COALESCE(luo.status,'nuevo') AS estado
           FROM language_objective lo
           LEFT JOIN learner_objective luo
             ON luo.objective_id=lo.objective_id AND luo.student_id=%s
           WHERE lo.cefr_level=%s AND COALESCE(luo.status,'')<>'mastered'
           ORDER BY (luo.status='due') DESC, lo.sort_order
           LIMIT %s""",
        (ctx["student"]["student_id"], ctx["level"]["level_code"], limit),
    )
    dis = _ov_disabled(ctx["overrides"], "objective")
    rows = [r for r in rows if r["objective_id"] not in dis]
    for r in rows:
        r["chunks"] = [c["chunk"] for c in db.q(
            "SELECT chunk FROM objective_chunk WHERE objective_id=%s ORDER BY ord", (r["objective_id"],))]
    for body in _ov_added(ctx["overrides"], "objective"):
        rows.append({"objective_id": None, "kind": "custom", "description": body, "estado": "nuevo", "chunks": []})
    return rows


def render_triggers(db: MotorDB, ctx: dict, words, phrases) -> dict:
    """Capa 9: rellena las plantillas opening/continuation/closing con los datos."""
    band_group = _band_group_for_trigger(ctx["band"]["code"])
    tutor = db.q1("SELECT * FROM tutor_identity WHERE band_id=%s", (ctx["band"]["band_id"],))
    repl = {
        "{tutor}": tutor["name"] if tutor else "",
        "{name}": ctx["student"]["name"],
        "{topic}": ctx["topic"]["title"] if ctx["topic"] else "",
        "{objective}": ctx["topic"]["objective"] if ctx["topic"] else "",
        "{level}": ctx["level"]["level_code"],
        "{vocab0}": words[0] if words else "",
        "{vocab}": ", ".join(words),
        "{phrase0}": phrases[0] if phrases else "",
        "{phrases}": ", ".join(phrases),
    }
    out = {}
    # arranque/cierre por banda + override por nivel: el de level_code=nivel pisa al genérico (NULL)
    rows = db.q(
        """SELECT kind, body FROM trigger_template
           WHERE band_group=%s AND (level_code IS NULL OR level_code=%s)
           ORDER BY (level_code IS NOT NULL)""",
        (band_group, ctx["level"]["level_code"]),
    )
    for t in rows:
        body = t["body"]
        for k, v in repl.items():
            body = body.replace(k, v)
        out[t["kind"]] = body
    return out


# --------------------------------------------------------------------------- #
#  Ensamblado del stack
# --------------------------------------------------------------------------- #
def build_stack(db: MotorDB, student_id: int, test_overrides: list | None = None) -> dict:
    return _assemble(db, resolve_context(db, student_id, test_overrides))


def build_stack_params(db: MotorDB, band_code: str, level_code: str, topic_id: int | None = None,
                       student_id: int | None = None, test_overrides: list | None = None) -> dict:
    """Playground: resuelve desde banda+nivel(+tópico) explícitos. El alumno es
    OPCIONAL y solo aporta su memoria/progreso (learner_state); si no se pasa,
    se ve la vista neutra (currículum completo del nivel)."""
    return _assemble(db, resolve_context_params(db, band_code, level_code, topic_id,
                                                student_id, test_overrides))


def _assemble(db: MotorDB, ctx: dict) -> dict:
    band, level, topic = ctx["band"], ctx["level"], ctx["topic"]
    sid = ctx["student"]["student_id"]
    bg = band["phase_group"]

    cfg = {r["config_key"]: r["config_value"] for r in db.q("SELECT * FROM app_config")}
    tutor = db.q1("SELECT * FROM tutor_identity WHERE band_id=%s", (band["band_id"],))
    pedagogy = db.q1("SELECT methodology FROM pedagogy WHERE band_id=%s", (band["band_id"],))
    _bp = db.q("SELECT policy_id, kind, body FROM band_policy WHERE band_id=%s", (band["band_id"],))
    band_pol = [{"kind": p["kind"], "body": p["body"]} for p in _bp
                if p["policy_id"] not in _ov_disabled(ctx["overrides"], "band_policy")] \
        + [{"kind": "custom", "body": b} for b in _ov_added(ctx["overrides"], "band_policy")]
    activity = db.q1("SELECT description FROM activity_type WHERE band_id=%s", (band["band_id"],))
    reward = db.q1("SELECT description FROM reward WHERE band_id=%s", (band["band_id"],))
    interests = [r["interest"] for r in
                 db.q("SELECT interest FROM student_interest WHERE student_id=%s", (sid,))]
    learner = db.q("SELECT item_type, item_value, status FROM learner_item WHERE student_id=%s",
                   (sid,))
    # presets dinámicos del alumno (estado, no texto libre): errores a vigilar / chunks a reforzar.
    # Es lo que hace que la MISMA clase cambie cuando el alumno deja huella. Tolerante a que la
    # tabla no exista todavía (deploy viejo).
    try:
        _lp = db.q("""SELECT lp.kind, lp.label, lpe.state
                      FROM learner_preset lpe JOIN learned_preset lp ON lp.preset_id=lpe.preset_id
                      WHERE lpe.student_id=%s ORDER BY lpe.occurrences DESC, lpe.last_seen DESC""", (sid,))
        learner = list(learner) + [{"item_type": p["kind"], "item_value": p["label"], "status": p["state"]}
                                   for p in _lp]
    except Exception:
        pass
    guards = resolve_guards(db, ctx)
    words, phrases = resolve_lexis(db, ctx)
    objectives = resolve_objectives(db, ctx)
    phases = [p["name"] for p in
              db.q("SELECT name FROM phase WHERE band_group=%s ORDER BY ord", (bg,))]
    pacing = band["pacing_base_min"] + level["pacing_bonus_min"]
    triggers = render_triggers(db, ctx, words, phrases)
    ses = ctx["session"]

    return {
        "context": ctx,
        "runtime_context": cfg,
        "tutor_identity": tutor,
        "pedagogical_framework": {"methodology": pedagogy["methodology"] if pedagogy else "",
                                  "policies": band_pol},
        "lesson_focus": {"activity": activity["description"] if activity else "",
                         "reward": reward["description"] if reward else "",
                         "objective": topic["objective"] if topic else ""},
        "student_profile": {"name": ctx["student"]["name"], "age": ctx["student"]["age"],
                            "level": level["level_code"], "interests": interests},
        "learner_state": learner,
        "behavioral_guards": guards,
        "topic_vocabulary": {"title": topic["title"] if topic else "",
                             "words": words, "phrases": phrases},
        "lesson_objectives": objectives,            # << capa dinámica
        "narrative_spine": {"phases": phases, "target_min": pacing},
        "execution_trigger": triggers,
        "interaction_state": ses,
    }


# --------------------------------------------------------------------------- #
#  Render a <system_instruction_stack>
# --------------------------------------------------------------------------- #
def render_prompt(stack: dict) -> str:
    L = ["<system_instruction_stack>", ""]

    def block(tag, lines):
        L.append(f"  <{tag}>")
        for ln in lines:
            L.append(f"    {ln}")
        L.append(f"  </{tag}>")
        L.append("")

    rc = stack["runtime_context"]
    block("runtime_context", [
        f"Target Language: {rc.get('target_language','')}",
        f"Native Language: {rc.get('native_language','')}",
        f"Interface Mode: {rc.get('interface_mode','')}",
        f"Voice Output Rule: {rc.get('voice_output_rule','')}",
    ])
    t = stack["tutor_identity"]
    block("tutor_identity", [f"Character Persona: Sos {t['name']}, {t['persona']}.",
                             f"Tone: {t['tone']}."] if t else [])
    pf = stack["pedagogical_framework"]
    block("pedagogical_framework",
          [f"Methodology: {pf['methodology']}"] + [f"{p['kind']}: {p['body']}" for p in pf["policies"]])
    lf = stack["lesson_focus"]
    block("lesson_focus_engagement",
          [f"Gamification: {lf['activity']}", f"Reward: {lf['reward']}",
           f"Target Objective: {lf['objective']}"])
    sp = stack["student_profile"]
    block("student_profile", [f"Name: {sp['name']}", f"Age: {sp['age']}",
                              f"Language Level: {sp['level']}",
                              f"Interests: {', '.join(sp['interests'])}"])
    block("learner_state", [f"{i['item_type']}: {i['item_value']} [{i['status']}]"
                            for i in stack["learner_state"]] or ["(vacío)"])
    block("behavioral_guards", [f"Rule {n}: {g}" for n, g in enumerate(stack["behavioral_guards"], 1)])
    # capa 7 (léxico) DORMIDA: si el tópico no tiene vocab cargado, no inyectamos un
    # bloque hueco. El coach genera el vocabulario del tema en vivo desde el título.
    tv = stack["topic_vocabulary"]
    if tv["words"] or tv["phrases"]:
        block("current_topic_vocabulary",
              [f"Topic Title: {tv['title']}",
               f"Key Vocabulary: [{', '.join(tv['words'])}]",
               f"Key Phrases: [{', '.join(tv['phrases'])}]"])
    # capa dinámica: qué aprender hoy + los chunks comunicativos de cada función
    obj_lines = []
    for o in stack["lesson_objectives"]:
        obj_lines.append(f"- ({o['kind']}) {o['description']} [{o['estado']}]")
        for ch in o.get("chunks", []):
            obj_lines.append(f"    · {ch}")
    block("lesson_objectives", obj_lines)
    ns = stack["narrative_spine"]
    block("narrative_spine", [f"Pacing: duración objetivo ~{ns['target_min']} min", "Session Structure:"]
          + [f"  - {p}" for p in ns["phases"]])
    et = stack["execution_trigger"]
    block("execution_trigger",
          [f"Opening_Action (Phase 1): {et.get('opening','')}",
           f"Continuation_Action (Phases 2-3): {et.get('continuation','')}",
           f"Closing_Action (Phase 4): {et.get('closing','')}"])
    it = stack["interaction_state"]
    block("interaction_state",
          [f"Turn: {it['turn']}", f"Elapsed_Min: {it['elapsed_min']}",
           f"Signal: {it['signal']}", f"Current_Phase: {it['current_phase']}"] if it else ["(sin sesión)"])

    L.append("</system_instruction_stack>")
    return "\n".join(L)


def preview(db: MotorDB, student_id: int, test_overrides: list | None = None) -> str:
    """Entry-point del módulo de prueba: arma y renderiza el prompt, con
    overrides en memoria si se pasan (no escribe nada en la DB)."""
    return render_prompt(build_stack(db, student_id, test_overrides))


if __name__ == "__main__":
    db = MotorDB(unix_socket="/tmp/mysql.sock", user="root", database="m3")
    for sid in (2, 1):
        st = build_stack(db, sid)
        orch = st["context"]["orchestration"]
        print("=" * 78)
        print(f"ALUMNO {sid}: {st['student_profile']['name']} · "
              f"banda={st['context']['band']['code']} · nivel={st['student_profile']['level']} · "
              f"tópico={st['topic_vocabulary']['title']}")
        print(f"Orquestación: {orch['name'] if orch else '(ninguna)'}")
        print("=" * 78)
        print(render_prompt(st))
        print()
