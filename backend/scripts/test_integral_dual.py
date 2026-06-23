"""TEST INTEGRAL DUAL - motor viejo (composer_proto) vs motor nuevo (motor_v3),
mismo perfil, en LIBRE, puntuado por el especialista pedagogico (SLA).

In-process (cero HTTP/auth). Todo por pymysql SYNC (NO ORM async): en Windows el
ORM aiomysql necesita SelectorEventLoop pero el CLI de Claude (subprocess) necesita
ProactorEventLoop -> incompatibles. Por eso armamos user/topic como objetos simples
desde SQL crudo y dejamos el loop default (Proactor) para que el LLM corra.

- composer_proto: build_super_prompt con student_types + levels + topic (via legacy_topic_id).
- motor_v3: motor_engine.resolve (student_id=None => historia=0).
- >=N corridas por (perfil, motor) -> promedio. Persiste en integral_test_result.

Uso: python scripts/test_integral_dual.py          # muestra (2 perfiles kids)
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services import motor_engine, motor_protocol as mp  # noqa: E402
from services.super_prompt import build_super_prompt  # noqa: E402

BAND_TO_AGEGROUP = {"early_child": "mini", "child": "junior", "teen": "tween"}
EXCHANGES = 3
RUNS = 2

SAMPLE = [
    {"band": "early_child", "level": "A1", "match": "familia",
     "who": "un nene de 5 anios, principiante total (A1), casi todo en espaniol, dice 1-2 palabras en ingles con esfuerzo"},
    {"band": "child", "level": "A2", "match": "escuela",
     "who": "un nene de 8 anios (A2): frases cortas, entusiasta, mezcla algo de espaniol si se traba"},
]

_RUBRIC = """SOS UN ESPECIALISTA EN PEDAGOGIA DE IDIOMAS (SLA, 20 anios). Evalua con evidencia.
Marco (aplicalo, no lo nombres): input i+1 (90-98% familiar); filtro afectivo (calido, celebra
intentos, no corta fluidez); reciclado (re-usa lo aparecido); forma+significado; recast suave."""


def _jload(v):
    if isinstance(v, (list, dict)):
        return v
    if isinstance(v, str) and v.strip():
        try:
            return json.loads(v)
        except Exception:
            return v
    return v


async def _llm(prompt: str, tries: int = 4, wait: int = 8) -> str:
    last = None
    for i in range(tries):
        try:
            out = await mp._claude_headless(prompt, timeout=90)
            if out:
                return out
            last = RuntimeError("LLM devolvio vacio")
        except Exception as e:
            last = e
        print(f"    (reintento LLM {i + 1}/{tries})")
        await asyncio.sleep(wait)
    raise last


async def _turn(system: str, history: list, role_label: str) -> str:
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACION HASTA AHORA ---\n" + (convo or "(vacia, empezas vos)")
              + f"\n\nResponde SOLO tu proximo turno como {role_label} (breve, 1-3 oraciones, sin acotaciones):")
    out = await _llm(prompt)
    return (out or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def _one_class(coach_system: str, who: str, theme: str) -> list:
    student = (f"Sos {who}. Estas en una clase de ingles sobre '{theme}'. Responde como ese alumno REAL: "
               "natural, con los errores de tu nivel, sin hacer de profe. NUNCA te corrijas.")
    history: list = [("Profe", await _turn(coach_system, [], "el PROFE arrancando la clase"))]
    for _ in range(EXCHANGES):
        history.append(("Alumno", await _turn(student, history, "el ALUMNO")))
        history.append(("Profe", await _turn(coach_system, history, "el PROFE")))
    return [{"who": w, "text": t} for w, t in history]


async def _evaluate(band: str, level: str, title: str, conv: list) -> dict:
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (_RUBRIC + f"\nEvalua esta clase LIBRE de un nene ({band} {level}) sobre '{title}'.\n\n"
              f"TRANSCRIPCION:\n{convo}\n\nEvalua naturalidad, filtro afectivo, i+1 y calidad pedagogica. "
              "NO penalices por no seguir una lista de vocab.\n"
              'Devolve SOLO JSON: {"score":1-10,"naturalness":"alta|media|baja","strengths":["..."],'
              '"issues":["..."],"verdict":"1-2 frases"}')
    raw = await _llm(prompt)
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no se pudo evaluar)"}


def _build_user(age_group: str, cefr: str):
    return SimpleNamespace(nombre="Test", cefr_level=cefr, age_group=age_group,
                           base_language="es", target_language="en")


def _composer_prompt(db, age_group: str, cefr: str, legacy_topic_id: int):
    """Motor VIEJO in-process (sync). Devuelve (prompt|None, motivo)."""
    trow = db.q1("SELECT id, title, keywords, pinned_vocabulary, generated_vocab FROM topics WHERE id=%s",
                 (legacy_topic_id,))
    if not trow:
        return None, f"prod topic #{legacy_topic_id} no existe"
    topic = SimpleNamespace(id=trow["id"], title=trow["title"],
                            keywords=_jload(trow["keywords"]), pinned_vocabulary=_jload(trow["pinned_vocabulary"]),
                            generated_vocab=_jload(trow["generated_vocab"]))
    std = db.q1("SELECT * FROM student_types WHERE slug=%s AND active=1", (age_group,))
    lv = db.q1("SELECT * FROM levels WHERE code=%s", (cefr,))
    if not std:
        return None, f"sin student_type slug={age_group}"
    if not lv:
        return None, f"sin level code={cefr}"
    user = _build_user(age_group, cefr)
    try:
        p = build_super_prompt(user=user, topic=topic, student_type_data=std, level_data=lv,
                               app_config=None, learner_state=None)
        return p, "ok"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def _avg(items):
    ss = [x["eval"].get("score") for x in items if x.get("eval") and isinstance(x["eval"].get("score"), (int, float))]
    return round(sum(ss) / len(ss), 1) if ss else None


async def run_profile(db, pr: dict) -> dict:
    age_group = BAND_TO_AGEGROUP.get(pr["band"], "mini")
    trow = db.q1("""SELECT t.topic_id, t.title, t.legacy_topic_id FROM topic t
                    JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                    JOIN age_band ab ON ab.band_id=tsb.band_id
                    WHERE ab.code=%s AND t.origin='kids_personal' AND t.title LIKE %s LIMIT 1""",
                 (pr["band"], f"%{pr['match']}%"))
    if not trow:
        return {"profile": pr, "error": "sin topico kids_personal para el match"}
    v3_tid, title, legacy_id = trow["topic_id"], trow["title"], trow["legacy_topic_id"]

    engines = {"motor_v3": [], "composer_proto": []}
    for _ in range(RUNS):
        res = await motor_engine.resolve(pr["band"], pr["level"], v3_tid, None, None)
        conv = await _one_class(res["prompt"], pr["who"], title)
        engines["motor_v3"].append({"transcript": conv, "eval": await _evaluate(pr["band"], pr["level"], title, conv)})

        cp, why = _composer_prompt(db, age_group, pr["level"], legacy_id)
        if cp:
            conv2 = await _one_class(cp, pr["who"], title)
            engines["composer_proto"].append({"transcript": conv2, "eval": await _evaluate(pr["band"], pr["level"], title, conv2)})
        else:
            engines["composer_proto"].append({"skip": why})

    return {"profile": pr, "title": title, "v3_topic": v3_tid, "legacy_topic": legacy_id,
            "avg": {"motor_v3": _avg(engines["motor_v3"]), "composer_proto": _avg(engines["composer_proto"])},
            "engines": engines}


async def run_sample() -> None:
    db = motor_engine._connect()
    results = []
    for pr in SAMPLE:
        print(f"\n=== {pr['band']} {pr['level']} (match '{pr['match']}') · {RUNS} corridas/motor ===")
        r = await run_profile(db, pr)
        results.append(r)
        if r.get("error"):
            print("  ERROR:", r["error"]); continue
        print(f"  topico: {r['title']} (v3#{r['v3_topic']} <- prod#{r['legacy_topic']})")
        print(f"  motor_v3       promedio = {r['avg']['motor_v3']}")
        cp = r['avg']['composer_proto']
        print(f"  composer_proto promedio = {cp}" if cp is not None else "  composer_proto = N/A")
    _persist("dual muestra", results)
    _resumen(results)


# ─────────── MATRIZ COMPLETA (modo 'full') ───────────
# kids: dual (viejo vs nuevo) en todos los niveles · adultos: solo motor_v3.
# motor_v3 solo tiene niveles A1-C1 (no A0 ni C2). early_child usa A1.
KIDS_MATRIX = [("early_child", "A1"), ("child", "A1"),
               ("child", "A2"), ("teen", "A2"), ("teen", "B1"), ("teen", "B2")]
ADULT_MATRIX = []  # adultos cubiertos por test_adult_evolution.py; aca solo kids dual
WHO = {
    "early_child": "un nene de 5 anios (A1), casi todo en espaniol, 1-2 palabras en ingles con esfuerzo",
    "child": "un nene de 8 anios: frases cortas, entusiasta, mezcla espaniol si se traba",
    "teen": "un chico de 12 anios: quiere sonar canchero, intenta frases mas largas, se frustra si no le sale",
    "adult": "un adulto hispanohablante: quiere fluidez, comete errores de su nivel, no se autocorrige",
}
CONCURRENCY = 4
RUNS_FULL = 3


def _persist(label: str, results: list, row_id: int | None = None) -> int:
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS integral_test_result (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                label VARCHAR(120), data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
            payload = json.dumps({"results": results}, ensure_ascii=False)
            if row_id:
                cur.execute("UPDATE integral_test_result SET data=%s WHERE id=%s", (payload, row_id))
            else:
                cur.execute("INSERT INTO integral_test_result (label, data) VALUES (%s,%s)", (label, payload))
                row_id = cur.lastrowid
        db.conn.commit()
        return row_id
    finally:
        db.conn.close()


def _resumen(results: list) -> None:
    print("\n-------- RESUMEN --------")
    for r in results:
        if r.get("error"):
            continue
        a = r["avg"]
        band = r.get("band") or r.get("profile", {}).get("band", "?")
        level = r.get("level") or r.get("profile", {}).get("level", "?")
        print(f"  {band:>11} {level} · {r['title'][:18]:<18} v3={a['motor_v3']}  viejo={a['composer_proto']}")


def _kids_topics(db, band):
    return db.q("""SELECT t.topic_id, t.title, t.legacy_topic_id FROM topic t
        JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id JOIN age_band ab ON ab.band_id=tsb.band_id
        WHERE ab.code=%s AND t.origin='kids_personal' ORDER BY t.topic_id""", (band,))


def _adult_topics(db, n):
    return db.q("""SELECT t.topic_id, t.title FROM topic t
        JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id JOIN age_band ab ON ab.band_id=tsb.band_id
        WHERE ab.code='adult' AND (t.origin IS NULL OR t.origin<>'kids_personal') ORDER BY t.topic_id LIMIT %s""", (n,))


async def _class_eval(prompt, who, band, level, title):
    conv = await _one_class(prompt, who, title)
    return {"transcript": conv, "eval": await _evaluate(band, level, title, conv)}


async def _profile_run(db, band, level, t, dual, runs, sem):
    title, v3_tid = t["title"], t["topic_id"]
    who = WHO[band]
    v3p = (await motor_engine.resolve(band, level, v3_tid, None, None))["prompt"]
    cpp, why = (None, "adultos: solo motor_v3")
    if dual:
        cpp, why = _composer_prompt(db, BAND_TO_AGEGROUP.get(band, ""), level, t.get("legacy_topic_id"))

    async def guarded(eng, prompt):
        async with sem:
            return eng, await _class_eval(prompt, who, band, level, title)

    jobs = [guarded("motor_v3", v3p) for _ in range(runs)]
    if cpp:
        jobs += [guarded("composer_proto", cpp) for _ in range(runs)]
    eng = {"motor_v3": [], "composer_proto": []}
    for e, ce in await asyncio.gather(*jobs):
        eng[e].append(ce)
    if not cpp:
        eng["composer_proto"] = [{"skip": why}]
    return {"band": band, "level": level, "title": title, "v3_topic": v3_tid, "dual": dual,
            "avg": {"motor_v3": _avg(eng["motor_v3"]), "composer_proto": _avg(eng["composer_proto"])},
            "engines": eng}


async def run_full(runs: int = RUNS_FULL) -> None:
    db = motor_engine._connect()
    sem = asyncio.Semaphore(CONCURRENCY)
    from collections import defaultdict
    idx = defaultdict(int)
    ktopics = {b: _kids_topics(db, b) for b in ("early_child", "child", "teen")}
    profiles = []  # (band, level, topic_row, dual)
    for band, level in KIDS_MATRIX:
        lst = ktopics.get(band) or []
        if not lst:
            continue
        t = lst[idx[band] % len(lst)]; idx[band] += 1
        profiles.append((band, level, t, True))
    ats = _adult_topics(db, len(ADULT_MATRIX))
    for i, level in enumerate(ADULT_MATRIX):
        if not ats:
            break
        t = ats[i % len(ats)]
        profiles.append(("adult", level, {"topic_id": t["topic_id"], "title": t["title"], "legacy_topic_id": None}, False))

    print(f"matriz: {len(profiles)} perfiles · {runs} corridas c/u · concurrencia {CONCURRENCY}")
    row_id = _persist(f"dual+adultos FULL runs={runs}", [])
    results = []
    for band, level, t, dual in profiles:
        print(f"\n== {band} {level} · {t['title'][:24]} {'(dual)' if dual else '(v3)'} ==")
        try:
            r = await _profile_run(db, band, level, t, dual, runs, sem)
        except Exception as e:
            print(f"   ERROR: {type(e).__name__}: {e}")
            results.append({"band": band, "level": level, "title": t["title"], "error": str(e)})
            _persist("", results, row_id); continue
        results.append(r)
        a = r["avg"]
        print(f"   v3={a['motor_v3']}  viejo={a['composer_proto']}")
        _persist("", results, row_id)  # incremental: no perder lo corrido
    db.conn.close()
    _resumen(results)
    print("\npersistido en integral_test_result")


async def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "full":
        await run_full()
    else:
        await run_sample()


if __name__ == "__main__":
    asyncio.run(main())
