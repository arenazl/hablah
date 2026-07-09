"""Diagnóstico de tópicos para el motor — qué falta para CERO excepciones.

El composer _req() vocab (pinned_vocabulary o keywords): un tópico SIN vocab hace
explotar el bloque 7. Frases y appropriate_bands son mejora (no excepción), pero
los contamos para 'llenar todo'.
Uso: python scripts/diag_topics_motor.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Topic


def _has_vocab(t) -> bool:
    # EXACTO como el composer (_get_vocabulary): solo pinned_vocabulary y keywords.
    # NO cuenta generated_vocab (el composer no lo lee → un tópico con solo eso EXPLOTA).
    return bool((t.pinned_vocabulary or []) or (t.keywords or []))


async def main() -> None:
    async with AsyncSessionLocal() as db:
        topics = (await db.execute(select(Topic).where(Topic.is_active.is_(True)))).scalars().all()
        total = len(topics)
        sin_vocab = [t for t in topics if not _has_vocab(t)]
        sin_bands = [t for t in topics if not (t.appropriate_bands or [])]
        by_aud = {}
        for t in topics:
            by_aud[t.audience or "?"] = by_aud.get(t.audience or "?", 0) + 1

        print(f"TOTAL tópicos activos: {total}")
        print(f"  por audience: {by_aud}")
        print(f"\nSIN VOCAB (EXPLOTAN el bloque 7): {len(sin_vocab)}")
        for t in sin_vocab[:25]:
            print(f"  - id={t.id} aud={t.audience} '{t.title}' (slug={t.slug})")
            print(f"      pinned={t.pinned_vocabulary} | keywords={t.keywords} | generated={t.generated_vocab}")
            print(f"      seed_prompts={t.seed_prompts}")
        if len(sin_vocab) > 25:
            print(f"  ... y {len(sin_vocab) - 25} más")
        print(f"\nSIN appropriate_bands (S1, no explota): {len(sin_bands)} / {total}")


if __name__ == "__main__":
    asyncio.run(main())
