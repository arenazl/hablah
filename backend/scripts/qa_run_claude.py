"""QA runner ALTERNO: coach = Claude Code CLI (usando la sub del user, no API).

Igual que qa_run.py pero en vez de conectarse al backend Cloud Run y dejar
que Gemini Pro responda, llama localmente `claude -p` para cada turno del
coach. Despues scorea con Gemini Flash (como siempre).

Objetivo: medir si Claude (Sonnet/Opus segun la sub) rompe el techo 6.3
que tenemos con Gemini Pro.

Uso:
  python scripts/qa_run_claude.py --suite quality --report-out qa_claude.json

NO toca el backend ni Cloud Run. NO consume API creditos de Anthropic.
Usa la sub Claude Code del user via CLI local.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, str(Path(__file__).parent.parent))

from qa.personas import PERSONAS, get_persona, Persona
from qa.runner import RunResult, TurnEvent
from qa.scorer import score_run
from qa.scenarios import get_suite, Scenario


def _color(text: str, color: str) -> str:
    codes = {"red": 31, "green": 32, "yellow": 33, "blue": 34, "bold": 1}
    return f"\033[{codes.get(color, 0)}m{text}\033[0m"


# ─── Topic/Seed lookup (lee DB en frio para construir super_prompt) ──────

async def _fetch_topic_and_super_prompt(
    topic_id: Optional[int],
    free_topic: Optional[str],
    cefr: str,
    target_lang: str,
) -> str:
    """Arma el system prompt MINIMO para el coach Claude.
    Replica lo esencial de services/super_prompt.py sin tocar el backend.
    """
    today = time.strftime("%Y-%m-%d")
    rules = f"""You are an expert language tutor for a CEFR {cefr} student
learning {target_lang}. Today is {today}.

CONVERSATION STYLE — non-negotiable:
1. NEVER start a turn with empty acknowledgment ("Interesting", "Great",
   "Nice", "Wow", "That's a fair point", "Oh", "Right"). Lead with content.
2. Each turn must ADD something: a specific opinion, a name/year/number,
   a 1-sentence anecdote, or a counter-position. NEVER just rephrase.
3. Out of every 4 turns, MAX 2 end with a question. The other 2 end with
   an opinion or anecdote that invites response without asking.
4. If the student repeats themselves or gives a vague answer: do NOT ask
   the same question again. PIVOT angle (what->why, abstract->concrete,
   individual->social).
5. If the student asks YOU something, answer it BEFORE asking your own.
6. NEVER invent names, shows, dates or facts you're not sure of. If unsure
   say "I don't know that one". If corrected, say "you're right, my mistake".
7. Plain text only — NO markdown, no asterisks, no bullets. Just sentences.
8. Keep turns short: 1-3 sentences.

LANGUAGE: respond in {target_lang} only.
"""

    if free_topic:
        topic_block = f"""
TOPIC: '{free_topic}'. The student chose this. Engage with it directly. Don't
substitute it for a generic topic.
"""
    elif topic_id == 166:
        topic_block = """
TOPIC: open chat — the student picks. Ask them what's on their mind, then
engage with whatever they bring.
"""
    elif topic_id == 1:
        topic_block = """
TOPIC: UK Garage (London electronic music genre, late 90s / early 2000s).
Key references you can use: MJ Cole, Artful Dodger, Craig David, Shola Ama,
Ms. Dynamite. 'Re-Rewind' by Craig David / Artful Dodger was the crossover
moment. The 2-step beat (syncopated drums) is the genre signature. Pirate
radio stations in London drove the underground scene. Grime emerged from
this scene around 2003.
"""
    else:
        topic_block = "\nTOPIC: pick something specific and engage.\n"

    opening = f"""
OPENING (first turn only): hook with a SPECIFIC reference (name, year, or
sharp opinion). Do NOT say "Let's talk about X". Do NOT say "Hey [name]!"
formula. Examples of good openings:
- "MJ Cole did more for UK Garage crossing into pop than anyone else, 1998-2001."
- "Most people think Sapiens falls apart past chapter 4. What got you in?"
- "Honestly, the cognitive revolution is where Harari peaks."
"""
    return rules + topic_block + opening


async def _claude_call(system: str, history: list[dict], user_text: str) -> str:
    """Llama a claude CLI con system + history + user turn. Devuelve el texto."""
    # Construimos el prompt como conversation history
    conversation = ""
    for h in history:
        who = "Student" if h["role"] == "user" else "You (tutor)"
        conversation += f"\n\n{who}: {h['text']}"
    conversation += f"\n\nStudent: {user_text}\n\nYou (tutor):"

    full_prompt = system + "\n\n--- CONVERSATION SO FAR ---" + conversation

    # claude -p modo headless. Sin tools, sin filesystem, sin nada extra.
    # Limitamos turnos para no gastar al pedo.
    # Path explicito a claude.cmd (en Windows el subprocess no resuelve sin .cmd).
    # Limpiamos CLAUDECODE para evitar el bloqueo de nested-session.
    import shutil
    clean_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    claude_exe = (
        shutil.which("claude.cmd", path=clean_env.get("PATH", ""))
        or shutil.which("claude", path=clean_env.get("PATH", ""))
        or r"C:\Users\look\AppData\Local\Volta\bin\claude.cmd"
    )
    try:
        proc = await asyncio.create_subprocess_exec(
            claude_exe, "-p", "--model", "claude-sonnet-4-6", full_prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=clean_env,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=120.0)
        text = out.decode("utf-8", errors="replace").strip()
        if not text:
            err_text = err.decode("utf-8", errors="replace")[:300] if err else ""
            print(f"  EMPTY claude response. stderr: {err_text}", file=sys.stderr)
        return text
    except asyncio.TimeoutError:
        print("  claude TIMEOUT 120s", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"  claude call error: {e}", file=sys.stderr)
        return ""


async def run_one(scenario: Scenario) -> dict:
    persona = get_persona(scenario.persona)
    topic_label = scenario.free_topic or f"topic_{scenario.topic_id}"

    print(_color(f"\n▶ {scenario.name}  ({persona.name} · {topic_label})", "blue"))

    started = time.time()
    system_prompt = await _fetch_topic_and_super_prompt(
        scenario.topic_id, scenario.free_topic,
        persona.cefr_level, persona.target_language,
    )

    history: list[dict] = []
    turns: list[TurnEvent] = []
    errors: list[str] = []

    # Trigger inicial del coach
    coach_text = await _claude_call(system_prompt, history, "(Start the session)")
    if not coach_text:
        errors.append("coach_initial_empty")
    else:
        turns.append(TurnEvent(n=1, speaker="coach", text=coach_text,
                               ts_received=time.time()))
        history.append({"role": "model", "text": coach_text})
        print(f"  [coach] {coach_text[:100]}{'...' if len(coach_text)>100 else ''}")

    student_turn_n = 0
    while student_turn_n < persona.max_turns:
        transcript_so_far = [{"who": "ai" if t.speaker == "coach" else "user",
                              "text": t.text} for t in turns]
        student_text = persona.strategy(transcript_so_far, student_turn_n)
        if not student_text:
            break
        turns.append(TurnEvent(n=len(turns)+1, speaker="student", text=student_text,
                               ts_received=time.time()))
        print(f"  [stud ] {student_text[:80]}")
        history.append({"role": "user", "text": student_text})

        coach_text = await _claude_call(system_prompt, history, student_text)
        if not coach_text:
            errors.append(f"coach_empty_turn_{student_turn_n}")
            break
        turns.append(TurnEvent(n=len(turns)+1, speaker="coach", text=coach_text,
                               ts_received=time.time()))
        history.append({"role": "model", "text": coach_text})
        print(f"  [coach] {coach_text[:100]}{'...' if len(coach_text)>100 else ''}")
        student_turn_n += 1

    ended = time.time()
    result = RunResult(
        persona_name=persona.name,
        topic_label=topic_label,
        session_id=0,
        started_at=started,
        ended_at=ended,
        turns=turns,
        errors=errors,
    )

    score = await score_run(
        result,
        target_language=persona.target_language,
        base_language=persona.base_language,
        cefr_level=persona.cefr_level,
    )

    color = "green" if score.overall >= 7 else "yellow" if score.overall >= 5 else "red"
    print(_color(f"  Score: {score.overall:.1f}/10", color))
    for cat, info in score.rubric.items():
        print(f"    · {cat}: {info.get('score')}")

    return {
        "scenario": scenario.name,
        "persona": persona.name,
        "topic_label": topic_label,
        "duration_seconds": result.duration_seconds,
        "n_coach_turns": result.n_coach_turns,
        "n_student_turns": result.n_student_turns,
        "errors": errors,
        "score_overall": score.overall,
        "score_rubric": score.rubric,
        "score_issues": score.issues,
        "score_strengths": score.strengths,
        "conversation": result.conversation_str(),
    }


async def main(args) -> int:
    scenarios = get_suite(args.suite) if args.suite else [
        Scenario(name=f"single_{args.persona}", persona=args.persona,
                 topic_id=args.topic, free_topic=args.free_topic,
                 description="Single ad-hoc run")
    ]

    all_results = []
    t0 = time.time()
    for sc in scenarios:
        try:
            r = await run_one(sc)
        except Exception as e:
            print(_color(f"  uncaught: {e}", "red"))
            r = {"scenario": sc.name, "error": f"uncaught: {e}"}
        all_results.append(r)

    total = time.time() - t0
    passed = sum(1 for r in all_results
                 if isinstance(r.get("score_overall"), (int, float))
                 and r["score_overall"] >= 6.5)
    avg = sum(r.get("score_overall", 0) or 0 for r in all_results) / max(1, len(all_results))

    print()
    print(_color("━" * 60, "bold"))
    print(_color(f"SUMMARY  ({len(all_results)} scenarios in {total:.1f}s)", "bold"))
    print(f"  Passed (≥6.5): {_color(str(passed), 'green')}   "
          f"Failed: {_color(str(len(all_results)-passed), 'red')}")
    print(f"  Avg score: {avg:.2f}/10")

    if args.report_out:
        Path(args.report_out).write_text(json.dumps({
            "model": "claude-sonnet-4-6 via claude CLI headless",
            "ts": time.time(),
            "total_time_seconds": total,
            "scenarios": all_results,
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  Report: {args.report_out}")

    return 0 if passed == len(all_results) else 1


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--suite")
    grp.add_argument("--persona", choices=list(PERSONAS.keys()))
    p.add_argument("--topic", type=int)
    p.add_argument("--free-topic")
    p.add_argument("--report-out")
    a = p.parse_args()
    if not a.suite and not a.persona:
        print("ERROR: --suite or --persona", file=sys.stderr)
        sys.exit(2)
    sys.exit(asyncio.run(main(a)))
