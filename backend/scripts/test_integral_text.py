"""Test integral por TEXTO (obviando la voz) del motor de clases kids A0.

Para cada caso (mini A0 × un tópico real):
  1. Construye el prompt REAL con el compositor (build_super_prompt).
  2. Simula la clase en texto: Gemini juega al COACH (con nuestro prompt) y al
     NENE (persona de 5 años), N turnos.
  3. Corre 10 ITERACIONES.
  4. Un JUEZ Gemini puntúa cada iteración (narrativa vs drill, mezcla ES+EN,
     no cierra la clase, vocab del tema, coherencia).
  5. Reporta pass/fail por criterio + la peor transcripción de cada caso.

Uso (donde está la GEMINI_API_KEY): heroku run python scripts/test_integral_text.py
"""
import sys, os, asyncio, json, time
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["COMPOSER_MODES"] = "staged_vocab"

import httpx
from types import SimpleNamespace
from sqlalchemy import select
from core.config import settings
from core.database import AsyncSessionLocal
from models.template import Template, Topic
from models.methodology import MethodologyModule
from services.super_prompt import build_super_prompt

MODEL = settings.GEMINI_MODEL or "gemini-2.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
TURNS = 12         # pares coach<->nene por clase (clase LARGA, ~5 min)
ITERS = 1          # 1 clase larga por tópico (lo que importa ahora: que se sostenga)
CONC = 5           # concurrencia de iteraciones

ENFOQUE_NINOS_PLACEHOLDER = (
    "ENFOQUE para un nene chiquito (3-7), paso a paso:\n"
    "ARCO: arrancá SIEMPRE con una intro corta y clara: saludá al chico por su nombre y presentá la "
    "aventura de hoy y QUÉ van a hacer ('Hoy somos cocineros y vamos a aprender los nombres de las "
    "comidas en inglés'). Recién ahí entrás en la historia.\n"
    "ENSEÑAR = HACERLO DECIR, no solo escuchar. Con cada palabra clave: (1) presentala en contexto con "
    "un ejemplo simple ('los brazos son lo que usamos para aplaudir; en inglés es ARMS'); (2) pedile CLARO "
    "que la repita: 'A ver, decí después de mí: ARMS' y esperá; (3) si la dijo, festejá de verdad; si no, "
    "modelá de nuevo despacio (NUNCA mientas con un 'muy bien'); (4) después 'ahora vos solo, ¿cómo era?' "
    "para que la PRODUZCA él. El chico SIEMPRE tiene que saber qué le estás pidiendo.\n"
    "PEDIDOS CON RESPUESTA: tus pedidos tienen respuesta concreta (repetí esta palabra; elegí entre estas "
    "dos). PROHIBIDO preguntas abiertas que el chico no puede responder ('¿dónde estará?', '¿qué le "
    "ponemos?') — no enseñan, lo dejan adivinando.\n"
    "NO pidas cosas que no podés ver ni oír: nada de mover el cuerpo, saltar o gestos (no lo ves por "
    "cámara), y NUNCA festejes una acción física que no comprobaste. Lo único que comprobás es lo que DICE.\n"
    "REGLA DURA — CERO SONIDOS: NUNCA imites ni preguntes por el sonido de un animal (oink, muu, guau) "
    "ni hagas ninguna onomatopeya (yum, splash). Con un animal, enseñá su NOMBRE en inglés y pedí que lo "
    "repita: 'esto es un cerdo; en inglés es PIG; ¿podés decir PIG?'. El sonido NO enseña inglés."
)

# Coach kids con el enfoque niños (igual que el friend de prod).
COACH = SimpleNamespace(
    name="Habi", tones=["cálida", "juguetona"], response_length="short", warmth_level=5,
    correction_mode="recast", opening_style="playful", tutor_talk_ratio=40,
    proactive_questions=True, tutor_shares_opinions=True, interruption_allowed=False,
    scaffold_when_stuck=True, pedagogy_preset="ludico", avoid_superlative_questions=True,
    one_question_per_turn=True, opening_includes_topic_intro=True, curriculum_mode=None,
    identity_description=None, segmento="mini",
    enfoque=ENFOQUE_NINOS_PLACEHOLDER,
)
MODULE = {
    "focus_name": "Aislamiento fonético", "target_grammar": "Vocabulario visual del tema",
    "ai_restraints": ("Sos HABI, profe cálida y paciente con un nene de 3-7 que arranca de cero. "
                      "REGLA #0 NUNCA MIENTAS: si no dijo la palabra, no digas '¡muy bien!'. CONVERSÁS, no drilleás. "
                      "Hablás DESPACIO, una idea por turno, esperás respuesta. CADA turno mezcla español + la palabra en inglés. "
                      "PROHIBIDO onomatopeyas de relleno. La clase dura varios minutos y la cierra el adulto: vos NUNCA te despedís."),
}
CASES = [
    {"topic": "Comidas ricas"},
    {"topic": "Animales de la granja y la selva"},
    {"topic": "Dibujitos y superhéroes"},
    {"topic": "Jugar en la pantalla"},
]


def _user():
    return SimpleNamespace(nombre="Timi", cefr_level="A0", target_language="en", base_language="es",
                           age_group="mini", parent_user_id=10, user_preferences=None,
                           kid_methodology_order=1, curriculum_position=1)


def _topic(title):
    return SimpleNamespace(title=title, slug="t", keywords=[], pinned_vocabulary=None, seed_prompts={},
                           category="kids", kid_age_group="mini", is_active=True, levels=["A0"], id=1,
                           audience="kid", is_curriculum=False, segmento="mini")


async def _gemini(client, system, contents, temp=0.7, json_mode=False, max_tokens=400):
    # thinkingBudget=0: 2.5-flash sin thinking, si no se come el presupuesto chico.
    cfg = {"temperature": temp, "maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingBudget": 0}}
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    payload = {"contents": contents, "generationConfig": cfg}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    for _ in range(3):
        try:
            r = await client.post(URL, json=payload)
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            await asyncio.sleep(1.5)
    return ""


STUDENT_SYS = ("Sos un nene de 5 años en una clase de inglés con Habi. Respondé NATURAL y MUY CORTO "
               "en español (a veces intentás una palabra en inglés, a veces decís algo off-topic o preguntás "
               "una pibada). NO actúes de profe. Máximo 1 frase corta.")

JUDGE_SYS = ("Sos un evaluador pedagógico. Te paso la transcripción de una clase de inglés para un nene de 5 "
             "años. Para CADA clave, true=bien. Devolvé SOLO JSON:\n"
             '{"intro": true si el coach ARRANCA con una introducción clara (saluda y presenta la aventura y qué van a hacer) antes de pedir nada,'
             ' "narrativa": true si es un cuento/aventura que avanza (NO una lista suelta tipo "pizza ok, dog ok"),'
             ' "elicita": true si GUÍA al chico a DECIR las palabras con pedidos claros (modela y pide "repetí X" / "ahora vos"), en vez de preguntas abiertas que el chico no puede responder,'
             ' "mezcla_es_en": true si el coach mezcla español+inglés (ningún turno entero en inglés),'
             ' "sin_circo": true si NO pide acciones físicas que no puede ver (mover brazos, saltar) NI usa onomatopeyas de relleno (oinc, yum),'
             ' "no_cierra": true si el coach sigue la clase SIN despedirse (es CORRECTO que NO cierre; la corta el adulto). Poné false SOLO si el coach se despide o cierra él la clase,'
             ' "vocab_del_tema": true si las palabras en inglés son del tema,'
             ' "coherente": true si todo tiene sentido (NADA tipo "la pizza tiene un name"),'
             ' "score": entero 1-10, "problema": "breve, o vacío si está ok"}')


async def run_iter(client, prompt, topic_title):
    transcript = []
    times = []  # segundos que tardó cada respuesta del coach (pregunta->respuesta)
    # Coach abre
    coach_hist = [{"role": "user", "parts": [{"text": "(empezá la clase)"}]}]
    student_hist = []
    for _ in range(TURNS):
        t0 = time.monotonic()
        coach_txt = await _gemini(client, prompt, coach_hist, temp=0.8, max_tokens=500)
        dt = time.monotonic() - t0
        times.append(dt)
        transcript.append((f"HABI [{dt:.1f}s]", coach_txt))
        student_hist.append({"role": "user", "parts": [{"text": coach_txt}]})
        stu_txt = await _gemini(client, STUDENT_SYS, student_hist, temp=0.9, max_tokens=80)
        transcript.append(("NENE", stu_txt))
        coach_hist.append({"role": "model", "parts": [{"text": coach_txt}]})
        coach_hist.append({"role": "user", "parts": [{"text": stu_txt}]})
        student_hist.append({"role": "model", "parts": [{"text": stu_txt}]})
    convo = "\n".join(f"{w}: {t}" for w, t in transcript)
    verdict_raw = await _gemini(client, JUDGE_SYS, [{"role": "user", "parts": [{"text": convo}]}],
                                temp=0.0, json_mode=True, max_tokens=300)
    verdict = _parse_json(verdict_raw)
    return convo, verdict, times


def _parse_json(raw: str) -> dict:
    raw = (raw or "").strip()
    if "```" in raw:
        seg = raw.split("```")
        raw = seg[1] if len(seg) > 1 else raw
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    i, j = raw.find("{"), raw.rfind("}")
    if i >= 0 and j > i:
        raw = raw[i:j + 1]
    try:
        return json.loads(raw)
    except Exception:
        return {"score": 0, "problema": f"juez no parseable: {raw[:90]!r}"}


async def run_case(client, coach, module, topic_obj):
    prompt = build_super_prompt(user=_user(), template=coach, topic=topic_obj,
                                methodology_stage=None, methodology_module=module, topic_content=None)
    sem = asyncio.Semaphore(CONC)
    async def one():
        async with sem:
            return await run_iter(client, prompt, topic_obj.title)
    results = await asyncio.gather(*[one() for _ in range(ITERS)])
    return prompt, results


async def main():
    if not settings.GEMINI_API_KEY:
        print("SIN GEMINI_API_KEY")
        return
    crit = ["intro", "narrativa", "elicita", "mezcla_es_en", "sin_circo", "no_cierra", "vocab_del_tema", "coherente"]

    # Cargar las 4 patas REALES de la BD (verifica la integración, no fixtures).
    # PATA ALUMNO: el _user() fixture va SIN errores/correcciones (limpio, como Timmy).
    async with AsyncSessionLocal() as db:
        coach = (await db.execute(select(Template).where(Template.slug == "friend"))).scalar_one_or_none() or COACH
        mod_row = (await db.execute(select(MethodologyModule).where(
            MethodologyModule.student_type == "mini", MethodologyModule.level == "A0",
            MethodologyModule.active.is_(True)).order_by(MethodologyModule.module_order))).scalars().first()
        module = ({"focus_name": mod_row.focus_name, "ai_restraints": mod_row.ai_restraints,
                   "target_grammar": mod_row.target_grammar, "evaluation_criteria": mod_row.evaluation_criteria}
                  if mod_row else MODULE)
        topics = (await db.execute(select(Topic).where(
            Topic.segmento == "mini", Topic.is_active.is_(True)).order_by(Topic.id))).scalars().all()
    if not topics:
        topics = [_topic(t) for t in ["Comidas ricas", "Animales de la granja y la selva",
                                      "Dibujitos y superhéroes", "Jugar en la pantalla"]]

    enf_ok = bool(getattr(coach, "enfoque", None))
    print("[INTEGRACIÓN 4 PATAS — datos REALES de la BD]")
    print(f"  COACH: {getattr(coach,'slug','fixture')}  ·  enfoque: {'OK' if enf_ok else 'FALTA'}")
    print(f"  RIEL mini/A0: {'OK' if mod_row else 'fixture'}  ·  TÓPICOS mini: {len(topics)}  ·  ALUMNO: limpio (sin errores)")

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, topic_obj in enumerate(topics):
            prompt, results = await run_case(client, coach, module, topic_obj)
            if i == 0:
                print(f"\n{'#'*70}\nPROMPT GENERADO (ejemplo — tópico '{topic_obj.title}'):")
                print(f"(idéntico para los demás tópicos salvo EL MUNDO DE HOY y el ARRANQUE)\n{'#'*70}")
                print(prompt)
                print('#' * 70)
            counts = {c: sum(1 for r in results if r[1].get(c)) for c in crit}
            scores = [r[1].get("score", 0) for r in results]
            all_t = [t for r in results for t in r[2]]
            avg = sum(scores) / max(len(scores), 1)
            avg_t = sum(all_t) / max(len(all_t), 1)
            mx_t = max(all_t) if all_t else 0
            ok_crit = sum(1 for c in crit if counts[c] == ITERS)
            print(f"\n{'='*70}\nTÓPICO: {topic_obj.title}  (mini A0, {ITERS} iters)")
            print(f"  score: {avg:.1f}/10  ·  criterios perfectos: {ok_crit}/{len(crit)}  ·  tiempo coach: prom {avg_t:.1f}s máx {mx_t:.1f}s")
            fails = [f"{c} {counts[c]}/{ITERS}" for c in crit if counts[c] < ITERS]
            if fails:
                print(f"  flojos: {', '.join(fails)}")
            print(f"  --- TRANSCRIPCIÓN (muestra):")
            for line in results[0][0].split("\n"):
                print(f"      {line}")
    print(f"\n{'='*70}\nFIN sweep de todos los tópicos mini.")


if __name__ == "__main__":
    asyncio.run(main())
