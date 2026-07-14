"""F1-03 — Smoke de invariantes ESTRUCTURALES del prompt. NO mide calidad (texto ≠ voz).

Gate de regresión barato: para CADA cruce edad×nivel (4×7) con un tópico por segmento, genera
el prompt vía el MISMO motor de producción (motor_engine.resolve_v2 → composer_proto) y valida
invariantes duras del ARMADO:

  (a) sin placeholders sin interpolar  : {topic} {first_vocab} {name} {word} no aparecen.
  (b) <universal_conversation_rules>   : aparece EXACTAMENTE una vez (F1-01, capa única).
  (c) <critical_objective>             : presente (F1-02, jerarquía semántica).
  (d) sin MotorDataMissing             : resolve_v2 no explota (dato de catálogo completo).
  (e) cero duplicados                  : ninguna frase-clave barrida (F1-01) reaparece en los
                                         presets — deben venir SOLO de la capa universal.
  (f) learner_state (F2-02)            : CON historia el bloque <learner_state> aparece UNA vez y
                                         ≤5 líneas; SIN historia se OMITE (no se inventa).
  (g) rotación por semilla (F2-03)     : dos session_seed distintos del mismo cruce dan frase-ancla
                                         y/o arranque distintos; el MISMO seed da el mismo prompt
                                         byte a byte (variedad por construcción, determinismo intacto).

Salida: tabla por cruce (PASS/FAIL) + sección de rotación + exit != 0 si hay algún FAIL.

PRE-REQUISITOS de la DB (si no se cumplen, el smoke falla a propósito):
  (a) app_config.universal_conversation_rules INSERTADO (apply_universal_rules.py --apply). Sin
      esa clave el composer hace fail-fast -> los 28 cruces dan MotorDataMissing (columna
      'resuelve' = FAIL). Es DATO inerte para prod; se deja aplicado.
  (b) BARRIDO de presets APLICADO (apply_barrido_f1.py --apply). La invariante (e) 'cero
      duplicados' recorre UNA frase por CADA cláusula que barre ese script; con el barrido SIN
      aplicar, esas cláusulas siguen en los presets y (e) FALLA a propósito — así se prueba que
      el smoke detecta duplicados. El barrido NO se deja aplicado en la DB compartida (se revierte
      con su backup tras auditar); correr este smoke es justo la ventana en que conviven.
  (c) F2-03 rotación: la variedad de ARRANQUE necesita las variantes aplicadas
      (apply_arranque_variants.py --apply). SIN variantes, sólo rota la frase-ancla — que igual
      satisface la invariante (g) en tópicos con ≥2 frases (pick_topics los prefiere). Con
      variantes aplicadas, rota además el arranque. El smoke pasa en ambos estados.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal, engine
from models.template import Topic
from services import motor_engine
from services.composer_proto import MotorDataMissing

# student_types.slug (edad) -> topics.segmento (adultos != adult)
SEG_TO_TOPIC_SEG = {"mini": "mini", "junior": "junior", "teen": "teen", "adult": "adultos"}
LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]
PLACEHOLDERS = [
    "{topic}", "{first_vocab}", "{name}", "{word}",
    "{expected_production}", "{language_rule}", "{curriculum_grammar}",
    "{tutor_mascot}", "{tutor}", "{tutor_identity}", "{tutor_tonal_rules}",
    "{pedagogical_rules}", "{universal_closing_rule}"
]

# F2-02: historia LIVIANA de muestra (contrato learner_state). Sirve para la invariante "si hay
# learner_state, el bloque aparece UNA vez y ≤5 líneas". Frases sin placeholders ni frases barridas.
SAMPLE_HISTORY = {
    "top_error": "drops the verb to be: she happy",
    "interests": ["dinosaurs", "soccer", "space"],
    "mastered": ["greetings", "colors", "numbers 1-10"],
    "review": "plural -s: two dog -> two dogs",
}

# Frases-clave del BARRIDO (F1-01): UNA por CADA cláusula que barre apply_barrido_f1.py (SPEC +
# SPEC_EXTRA). Tras el barrido NINGUNA debe aparecer en el prompt — la conducta ahora vive SOLO en
# la capa universal (que además está en inglés; estas son fragmentos en español de los presets
# viejos). Cubrir cada cláusula (no una muestra de 5) evita el FALSO PASS: si sobrevive una
# cláusula no muestreada, el smoke la ve. Cada fragmento se verificó PRESENTE en el prompt real
# antes del barrido. `description` (SPEC_EXTRA) NO se lista: el composer no lo renderiza -> no
# tiene huella en el prompt, no hay nada que observar acá.
SWEPT_PHRASES = [
    # SPEC 1 — mini continuation_seed (3 cláusulas)
    "nunca la misma frase",
    "ESE hilo un toque",
    "NO marches una lista",
    # SPEC 2 — mini pedagogy
    "cuando la diga parecido",
    # SPEC 3 — mini session_focus
    "nunca como lista",
    # SPEC 4 — teen session_focus
    "no como drill",
    # SPEC 5 — adult opening_seed
    "objetivo gramatical del nivel va INVISIBLE",
    # SPEC 6 — adult form_rules (2 cláusulas)
    "gramatical va INVISIBLE, tejido",
    "una sola pregunta o",
    # SPEC 7 — adult session_focus
    "queda invisible: el tutor lo incorpora",
    # SPEC 8 — adult continuation_seed (3 cláusulas)
    "una pregunta o situación por turno",
    "recast natural de los errores sin cortar",
    "el objetivo del nivel sin explicitarlo",
    # SPEC 9 — adult pedagogy
    "no interrumpir por errores menores",
    # SPEC 10 — B2 language_rule
    "Recast natural de los errores, sin cortar",
    # SPEC 11 — A0 expected_production (2 cláusulas)
    "reciclar algo ya visto",
    "suene a lista ni a robot",
    # SPEC_EXTRA — adult tutor_identity (la copia en `description` no se renderiza -> no listable)
    "de forma invisible, tejido en la charla",
]


async def pick_topics() -> dict:
    """Un tópico activo con vocab por segmento (id + título). PREFIERE tópicos con ≥2 frases-ancla
    (generated_vocab) para que la rotación de F2-03 tenga entre qué elegir; cae a cualquiera con
    vocab si no hay."""
    out = {}
    async with AsyncSessionLocal() as db:
        for seg_slug, topic_seg in SEG_TO_TOPIC_SEG.items():
            ts = (await db.execute(select(Topic).where(
                Topic.segmento == topic_seg, Topic.is_active == True))).scalars().all()  # noqa: E712
            pick = next((t for t in ts if len(t.generated_vocab or []) >= 2), None)
            if pick is None:
                pick = next((t for t in ts if (t.keywords or t.generated_vocab or t.pinned_vocabulary)), None)
            if pick is None:
                raise SystemExit(f"sin tópico con vocab para segmento {topic_seg!r} — no se puede smoke-testear")
            out[seg_slug] = (pick.id, pick.title)
    return out


def validate(prompt: str) -> dict:
    checks = {}
    checks["universal_once"] = prompt.count("<conversation_rules>") == 1
    checks["critical_obj"] = "<critical_objective>" in prompt
    checks["no_placeholders"] = not any(p in prompt for p in PLACEHOLDERS)
    dupes = [ph for ph in SWEPT_PHRASES if ph in prompt]
    checks["no_dupes"] = len(dupes) == 0
    checks["_dupes_found"] = dupes
    checks["_placeholders_found"] = [p for p in PLACEHOLDERS if p in prompt]
    return checks


def _block_inner_lines(prompt: str, tag: str) -> int:
    """Nº de líneas NO vacías entre <tag> y </tag> (para el tope ≤5 del learner_state)."""
    try:
        inner = prompt.split(f"<{tag}>", 1)[1].split(f"</{tag}>", 1)[0]
    except IndexError:
        return -1
    return len([ln for ln in inner.splitlines() if ln.strip()])


def validate_history(prompt_hist: str, prompt_none: str) -> dict:
    """F2-02: con historia el bloque aparece UNA vez y ≤5 líneas; sin historia se OMITE."""
    n = prompt_hist.count("<learner_state>")
    return {
        "hist_once": n == 1,
        "hist_le5": _block_inner_lines(prompt_hist, "learner_state") <= 5,
        "hist_omitted": "<learner_state>" not in prompt_none,
    }


def _rotation_signature(prompt: str) -> tuple[str, str]:
    """(frase-ancla / Target_Phrases, línea de arranque) — lo que F2-03 hace rotar por semilla."""
    tgt = next((ln.strip() for ln in prompt.splitlines() if "Target_Phrases" in ln), "")
    cmd = next((ln.strip() for ln in prompt.splitlines() if ln.strip().startswith("Command:")), "")
    return tgt, cmd


async def check_rotation(topics: dict) -> bool:
    """F2-03: por segmento, dos session_seed distintos del mismo cruce dan frase-ancla y/o arranque
    distintos; el mismo seed da el MISMO prompt byte a byte. Usa un nivel basic (A0) por segmento —
    la frase-ancla rota aunque las variantes de arranque no estén aplicadas; con variantes aplicadas
    (apply_arranque_variants.py) rota además el arranque. Determinismo = auditabilidad intacta."""
    print("\nF2-03 · rotación por semilla (variedad por construcción):")
    ok = True
    for seg_slug in SEG_TO_TOPIC_SEG:
        topic_id, title = topics[seg_slug]
        combos = set()
        for seed in range(1, 8):
            res = await motor_engine.resolve_v2(seg_slug, "A0", topic_id, session_seed=seed)
            combos.add(_rotation_signature(res["prompt"]))
        # determinismo: mismo seed dos veces -> idéntico
        a = await motor_engine.resolve_v2(seg_slug, "A0", topic_id, session_seed=42)
        b = await motor_engine.resolve_v2(seg_slug, "A0", topic_id, session_seed=42)
        variety = len(combos) >= 2
        deterministic = a["prompt"] == b["prompt"]
        seg_ok = variety and deterministic
        ok = ok and seg_ok
        print(f"  {seg_slug:8} A0  variedad={len(combos)}/7 combos {'OK' if variety else 'FAIL'} · "
              f"determinismo {'OK' if deterministic else 'FAIL'}  -> {'PASS' if seg_ok else 'FAIL'}")
        if not variety:
            print(f"         ^ sin variedad: el tópico {title!r} no tiene ≥2 frases-ancla para rotar")
        if not deterministic:
            print("         ^ mismo seed dio prompts distintos (determinismo roto)")
    return ok


async def main() -> None:
    topics = await pick_topics()
    print("Tópicos por segmento:")
    for seg, (tid, title) in topics.items():
        print(f"  {seg:7} -> id={tid} {title!r}")
    print()

    header = (f"{'edad':8}{'nivel':6}{'resuelve':10}{'univ×1':8}{'critical':10}{'no-place':10}"
              f"{'no-dupes':10}{'hist x1':8}{'hist<=5':8}{'RESULT':8}")
    print(header)
    print("-" * len(header))

    any_fail = False
    for seg_slug in SEG_TO_TOPIC_SEG:
        topic_id, _ = topics[seg_slug]
        for level in LEVELS:
            resolved = True
            err = None
            checks = {}
            hist = {}
            try:
                # estructural (sin historia -> el bloque debe OMITIRSE) + con historia (F2-02).
                res = await motor_engine.resolve_v2(seg_slug, level, topic_id)
                prompt = res["prompt"]
                res_h = await motor_engine.resolve_v2(seg_slug, level, topic_id, learner_state=SAMPLE_HISTORY)
                checks = validate(prompt)
                hist = validate_history(res_h["prompt"], prompt)
            except MotorDataMissing as e:
                resolved = False
                err = f"MotorDataMissing: {e}"
            except Exception as e:  # noqa: BLE001 — cualquier fallo de armado = FAIL
                resolved = False
                err = f"{type(e).__name__}: {e}"

            if resolved:
                struct_ok = all(checks[k] for k in ("universal_once", "critical_obj", "no_placeholders", "no_dupes"))
                hist_ok = all(hist[k] for k in ("hist_once", "hist_le5", "hist_omitted"))
                ok = struct_ok and hist_ok
                row = (f"{seg_slug:8}{level:6}"
                       f"{'OK':10}"
                       f"{('OK' if checks['universal_once'] else 'FAIL'):8}"
                       f"{('OK' if checks['critical_obj'] else 'FAIL'):10}"
                       f"{('OK' if checks['no_placeholders'] else 'FAIL'):10}"
                       f"{('OK' if checks['no_dupes'] else 'FAIL'):10}"
                       f"{('OK' if hist['hist_once'] else 'FAIL'):8}"
                       f"{('OK' if hist['hist_le5'] else 'FAIL'):8}"
                       f"{('PASS' if ok else 'FAIL'):8}")
                print(row)
                if not ok:
                    any_fail = True
                    if not checks["no_dupes"]:
                        print(f"         ^ duplicados encontrados: {checks['_dupes_found']}")
                    if not checks["no_placeholders"]:
                        print(f"         ^ placeholders sin interpolar: {checks['_placeholders_found']}")
                    if not hist["hist_omitted"]:
                        print("         ^ el bloque learner_state NO se omitió sin historia")
                    if not hist["hist_le5"]:
                        print("         ^ el bloque learner_state supera las 5 líneas")
            else:
                any_fail = True
                print(f"{seg_slug:8}{level:6}{'FAIL':10}{'-':8}{'-':10}{'-':10}{'-':10}{'-':8}{'-':8}{'FAIL':8}")
                print(f"         ^ {err}")

    print("-" * len(header))

    # F2-03 · rotación por semilla (variedad por construcción + determinismo).
    rotation_ok = await check_rotation(topics)
    any_fail = any_fail or not rotation_ok

    print("\nRESULTADO:", "FAIL (hay invariantes rotas)" if any_fail
          else "PASS (28/28 cruces estructurales + F2-02 historia + F2-03 rotación)")
    await engine.dispose()
    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    asyncio.run(main())
