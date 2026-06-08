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
import sys, os, asyncio, json
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["COMPOSER_MODES"] = "staged_vocab"

import httpx
from types import SimpleNamespace
from core.config import settings
from services.super_prompt import build_super_prompt

MODEL = settings.GEMINI_MODEL or "gemini-2.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
TURNS = 4          # pares coach<->nene por clase
ITERS = 10         # iteraciones por caso
CONC = 5           # concurrencia de iteraciones

# Coach kids con el enfoque niños (igual que el friend de prod).
COACH = SimpleNamespace(
    name="Habi", tones=["cálida", "juguetona"], response_length="short", warmth_level=5,
    correction_mode="recast", opening_style="playful", tutor_talk_ratio=40,
    proactive_questions=True, tutor_shares_opinions=True, interruption_allowed=False,
    scaffold_when_stuck=True, pedagogy_preset="ludico", avoid_superlative_questions=True,
    one_question_per_turn=True, opening_includes_topic_intro=True, curriculum_mode=None,
    identity_description=None, segmento="mini",
    enfoque=("Enfoque para un nene chiquito: explicale el mundo con palabras simples, dale ejemplos "
             "concretos, metele alguna broma, y SOBRE TODO andá UNIENDO las palabras que aprende en una "
             "frasecita. La clase es un CUENTO/AVENTURA donde él es el protagonista y la historia avanza."),
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
             "años. Devolvé SOLO JSON con estas claves booleanas y un score:\n"
             '{"narrativa": true si es un cuento/aventura que avanza (NO una lista de palabras sueltas tipo "pizza ok, dog ok"),'
             ' "mezcla_es_en": true si el coach mezcla español+inglés (ningún turno entero en inglés),'
             ' "no_cierra": true si el coach NUNCA se despide ni cierra la clase,'
             ' "vocab_del_tema": true si las palabras en inglés son del tema de la clase,'
             ' "coherente": true si todo tiene sentido (NADA tipo "la pizza tiene un name"),'
             ' "score": entero 1-10, "problema": "breve, o vacío si está ok"}')


async def run_iter(client, prompt, topic_title):
    contents = []  # historia compartida (rol user = lo que recibe cada lado)
    transcript = []
    # Coach abre
    coach_hist = [{"role": "user", "parts": [{"text": "(empezá la clase)"}]}]
    student_hist = []
    for _ in range(TURNS):
        coach_txt = await _gemini(client, prompt, coach_hist, temp=0.8, max_tokens=500)
        transcript.append(("HABI", coach_txt))
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
    return convo, verdict


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


async def run_case(client, case):
    prompt = build_super_prompt(user=_user(), template=COACH, topic=_topic(case["topic"]),
                                methodology_stage=None, methodology_module=MODULE, topic_content=None)
    sem = asyncio.Semaphore(CONC)
    async def one():
        async with sem:
            return await run_iter(client, prompt, case["topic"])
    results = await asyncio.gather(*[one() for _ in range(ITERS)])
    return prompt, results


async def main():
    if not settings.GEMINI_API_KEY:
        print("SIN GEMINI_API_KEY")
        return
    crit = ["narrativa", "mezcla_es_en", "no_cierra", "vocab_del_tema", "coherente"]
    async with httpx.AsyncClient(timeout=60.0) as client:
        for case in CASES:
            prompt, results = await run_case(client, case)
            counts = {c: sum(1 for _, v in results if v.get(c)) for c in crit}
            scores = [v.get("score", 0) for _, v in results]
            avg = sum(scores) / max(len(scores), 1)
            print(f"\n{'='*70}\nCASO: {case['topic']}  (mini A0, 10 iters)")
            print(f"  score promedio: {avg:.1f}/10")
            for c in crit:
                print(f"  {c:16s}: {counts[c]}/{ITERS} ok")
            # peor iteración
            worst = min(results, key=lambda r: r[1].get("score", 0))
            print(f"  --- PEOR (score {worst[1].get('score')}): {worst[1].get('problema','')}")
            for line in worst[0].split("\n"):
                print(f"      {line}")
    print(f"\n{'='*70}\nFIN test integral.")


if __name__ == "__main__":
    asyncio.run(main())
