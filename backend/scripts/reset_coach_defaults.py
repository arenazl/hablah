"""Resetea los 3 templates (coach/sincerist/arcade) a sus valores default conservadores.

Defaults pensados para minimo glitch y voz natural:
- voice_speed: 100 (normal)
- voice_stability: 60 (estable - menos variaciones bruscas)
- voice_style: 25 (poco expresivo - mas claro)
- silence_tolerance_ms: 1500 (espera razonable, no corta al usuario)
- pedagogy_preset: balanced (default seguro)
- one_question_per_turn: True
- avoid_superlative_questions: True
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Template


DEFAULTS = {
    "coach":     {"pedagogy_preset": "balanced", "voice_speed": 100, "voice_stability": 60, "voice_style": 25, "silence_tolerance_ms": 1500, "one_question_per_turn": True, "avoid_superlative_questions": True},
    "sincerist": {"pedagogy_preset": "balanced", "voice_speed": 100, "voice_stability": 60, "voice_style": 25, "silence_tolerance_ms": 1500, "one_question_per_turn": True, "avoid_superlative_questions": True},
    "arcade":    {"pedagogy_preset": "balanced", "voice_speed": 100, "voice_stability": 60, "voice_style": 25, "silence_tolerance_ms": 1500, "one_question_per_turn": True, "avoid_superlative_questions": True},
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for slug, defaults in DEFAULTS.items():
            tpl = (await db.execute(select(Template).where(Template.slug == slug))).scalar_one_or_none()
            if not tpl:
                print(f"[skip] template '{slug}' no existe")
                continue
            for k, v in defaults.items():
                setattr(tpl, k, v)
            print(f"[ok] {slug}: reseteado a defaults")
        await db.commit()
    print("\nOK - defaults aplicados a los 3 templates")


if __name__ == "__main__":
    asyncio.run(main())
