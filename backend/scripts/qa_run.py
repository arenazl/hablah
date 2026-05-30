"""CLI para correr la QA suite contra el backend (prod o local).

Uso:

  # Smoke test rapido contra prod
  python scripts/qa_run.py --suite smoke

  # Una sola persona contra un topic
  python scripts/qa_run.py --persona intermediate_b1 --topic 5

  # Free topic
  python scripts/qa_run.py --persona advanced_c1 --free-topic "being single at 40"

  # Stress test sobre topic 5
  python scripts/qa_run.py --suite stress:5

  # Local
  python scripts/qa_run.py --base http://localhost:8080 --suite smoke

Necesitas:
- QA_USER_EMAIL / QA_USER_PASSWORD en env (user existente con role student)
- GEMINI_API_KEY (para el scorer)
- Internet
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, str(Path(__file__).parent.parent))

from qa.personas import PERSONAS, get_persona
from qa.runner import login, start_session, end_session, run_conversation, RunResult
from qa.scorer import score_run, Score
from qa.scenarios import get_suite, Scenario


def _color(text: str, color: str) -> str:
    codes = {"red": 31, "green": 32, "yellow": 33, "blue": 34, "gray": 90, "bold": 1}
    return f"\033[{codes.get(color, 0)}m{text}\033[0m"


def _print_run_summary(result: RunResult, score: Score) -> None:
    head = f"━━━ {result.persona_name} · {result.topic_label} ━━━"
    print(_color(head, "blue"))
    print(f"  Session: {result.session_id}  ·  Duration: {result.duration_seconds:.1f}s")
    print(f"  Turns: {result.n_coach_turns} coach / {result.n_student_turns} student")
    print(f"  First coach audio: {result.coach_first_audio_latency_ms or '—'}ms")
    if result.errors:
        for e in result.errors:
            print(_color(f"  ERROR: {e}", "red"))
    overall_color = "green" if score.overall >= 7 else "yellow" if score.overall >= 5 else "red"
    print(f"  Score: {_color(f'{score.overall:.1f}/10', overall_color)}")
    for cat, info in score.rubric.items():
        s = info.get("score", 0)
        c = "green" if info.get("pass") else "red"
        note = info.get("note", "")
        print(f"    · {cat}: {_color(str(s), c)}  {note[:80]}")
    if score.issues:
        print(_color("  Issues:", "yellow"))
        for i in score.issues:
            print(f"    - {i}")
    if score.strengths:
        print(_color("  Strengths:", "green"))
        for s in score.strengths:
            print(f"    + {s}")
    print()


async def run_one(args, scenario: Scenario) -> dict:
    """Ejecuta UN escenario y devuelve dict con result + score."""
    base = args.base
    email = args.user_email
    password = args.user_password

    persona = get_persona(scenario.persona)
    topic_label = scenario.free_topic or f"topic_{scenario.topic_id}"
    print(_color(f"▶ {scenario.name}  ({persona.name} · {topic_label})", "blue"))

    try:
        token = await login(base, email, password)
    except Exception as e:
        print(_color(f"  login failed: {e}", "red"))
        return {"scenario": scenario.name, "error": f"login_failed: {e}"}

    try:
        session_id = await start_session(
            base, token,
            topic_id=scenario.topic_id,
            free_topic=scenario.free_topic,
        )
    except Exception as e:
        print(_color(f"  session_start failed: {e}", "red"))
        return {"scenario": scenario.name, "error": f"session_start_failed: {e}"}

    result = await run_conversation(
        base_url=base, token=token, session_id=session_id,
        persona=persona, topic_label=topic_label,
    )

    transcript = [{"who": t.speaker.replace("coach", "ai"), "text": t.text} for t in result.turns]
    await end_session(base, token, session_id, transcript)

    score = await score_run(
        result,
        target_language=persona.target_language,
        base_language=persona.base_language,
        cefr_level=persona.cefr_level,
    )

    _print_run_summary(result, score)

    return {
        "scenario": scenario.name,
        "persona": persona.name,
        "session_id": session_id,
        "topic_label": topic_label,
        "duration_seconds": result.duration_seconds,
        "coach_first_audio_ms": result.coach_first_audio_latency_ms,
        "n_coach_turns": result.n_coach_turns,
        "n_student_turns": result.n_student_turns,
        "errors": result.errors,
        "score_overall": score.overall,
        "score_rubric": score.rubric,
        "score_issues": score.issues,
        "score_strengths": score.strengths,
        "conversation": result.conversation_str(),
    }


async def main(args) -> int:
    # Build scenario list
    scenarios: list[Scenario] = []
    if args.suite:
        scenarios = get_suite(args.suite)
    else:
        scenarios = [Scenario(
            name=f"single_{args.persona}",
            persona=args.persona,
            topic_id=args.topic,
            free_topic=args.free_topic,
            description="Single ad-hoc run",
        )]

    all_results = []
    t0 = time.time()
    for sc in scenarios:
        try:
            r = await run_one(args, sc)
        except Exception as e:
            print(_color(f"  uncaught error in {sc.name}: {e}", "red"))
            r = {"scenario": sc.name, "error": f"uncaught: {e}"}
        all_results.append(r)

    total_time = time.time() - t0
    # Summary
    print(_color("━" * 60, "bold"))
    print(_color(f"SUMMARY  ({len(all_results)} scenarios in {total_time:.1f}s)", "bold"))
    passed = sum(1 for r in all_results if isinstance(r.get("score_overall"), (int, float)) and r["score_overall"] >= 6.5)
    failed = len(all_results) - passed
    print(f"  Passed (≥6.5): {_color(str(passed), 'green')}   Failed: {_color(str(failed), 'red')}")
    avg = sum(r.get("score_overall", 0) for r in all_results) / max(1, len(all_results))
    print(f"  Avg score: {avg:.1f}/10")

    if args.report_out:
        out = Path(args.report_out)
        out.write_text(json.dumps({
            "ts": time.time(),
            "base": args.base,
            "total_time_seconds": total_time,
            "scenarios": all_results,
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        print(_color(f"  Report written to {out}", "blue"))

    return 0 if failed == 0 else 1


def build_parser():
    p = argparse.ArgumentParser(description="QA runner para Hablah")
    p.add_argument("--base", default=os.getenv("QA_BASE", "https://hablah-api-685973917497.southamerica-east1.run.app"),
                   help="Base URL del backend (sin /api)")
    p.add_argument("--user-email", default=os.getenv("QA_USER_EMAIL"),
                   help="Email del user de QA")
    p.add_argument("--user-password", default=os.getenv("QA_USER_PASSWORD"),
                   help="Password del user de QA")
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--suite", help="Suite: smoke|quality|stress:<topic_id>")
    grp.add_argument("--persona", choices=list(PERSONAS.keys()), help="Una sola persona")
    p.add_argument("--topic", type=int, help="Topic id (con --persona)")
    p.add_argument("--free-topic", help="Free topic text (con --persona)")
    p.add_argument("--report-out", help="Guardar reporte JSON a este archivo")
    return p


if __name__ == "__main__":
    args = build_parser().parse_args()
    if not args.user_email or not args.user_password:
        print(_color("ERROR: Necesitas QA_USER_EMAIL y QA_USER_PASSWORD (env o flags)", "red"))
        sys.exit(2)
    if not args.suite and not args.persona:
        print(_color("ERROR: --suite o --persona", "red"))
        sys.exit(2)
    sys.exit(asyncio.run(main(args)))
