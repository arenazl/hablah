"""Chequeo de sanidad de los campos que el MOTOR realmente usa de cada tópico activo.

El motor v2 (composer_proto) usa:
  - keywords[:6]      -> <current_lesson_vocabulary> Words
  - generated_vocab   -> Target_Phrases (todas en 'full', solo la 1ª en A0-A2)
El resto de keywords (7..N) es peso muerto (no se lee). Acá NO re-curamos: solo detectamos
(a) corrupción real de encoding, (b) tópicos que dejarían al motor sin contenido, (c) volcamos
los 6 keywords + frases-ancla de cada tópico a un .md UTF-8 para revisar coherencia a ojo.
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

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "motor-catalogo", "_sanity_topics.md")

# Señales de mojibake por doble-encoding (utf8 leído como latin1) y replacement char.
MOJIBAKE = ("�", "Ã©", "Ã±", "Ã³", "Ã­", "Ã¡", "Ã‰", "Ã‘", "â€", "Â¿", "Â¡")


def _flags(text: str) -> list[str]:
    return [m for m in MOJIBAKE if m in text]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Topic).where(Topic.is_active == True))).scalars().all()  # noqa: E712

    corrupt: list[str] = []
    empty: list[str] = []
    lines: list[str] = ["# Sanity — contenido REAL que el motor usa (solo activos)\n"]
    lines.append(f"> {len(rows)} tópicos activos. Se muestran los 6 keywords que el motor lee + las frases-ancla.\n")

    by_seg: dict[str, list[Topic]] = {}
    for r in rows:
        by_seg.setdefault(r.segmento or "?", []).append(r)

    for seg in ("adultos", "junior", "teen", "mini", "?"):
        group = by_seg.get(seg)
        if not group:
            continue
        lines.append(f"\n## {seg} ({len(group)})\n")
        for r in sorted(group, key=lambda t: t.title):
            kw = list(r.keywords or [])
            gv = list(r.generated_vocab or [])
            used_kw = kw[:6]
            blob = " ".join(str(x) for x in (used_kw + gv + [r.title]))
            f = _flags(blob)
            if f:
                corrupt.append(f"{r.id} {r.title!r} -> {f}")
            if not used_kw and not gv:
                empty.append(f"{r.id} {r.title!r}")
            flag = "  ⚠CORRUPT" if f else ""
            lines.append(f"### {r.title}  ({','.join(r.levels or [])} · {r.category}){flag}")
            lines.append(f"- **Words (keywords[:6]):** {', '.join(str(x) for x in used_kw) or '—'}")
            lines.append(f"- **Target_Phrases (generated_vocab):** {', '.join(str(x) for x in gv) or '—'}")
            lines.append("")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    await engine.dispose()

    # Resumen ASCII a consola (sin caracteres que rompan la terminal Windows)
    print(f"Activos revisados: {len(rows)}")
    print(f"Con corrupcion de encoding: {len(corrupt)}")
    for c in corrupt[:20]:
        print("  CORRUPT id=" + c.split(" ", 1)[0])
    print(f"Sin contenido usable (motor explotaria): {len(empty)}")
    for e in empty:
        print("  EMPTY id=" + e.split(" ", 1)[0])
    print(f"Reporte completo (UTF-8) -> docs/motor-catalogo/_sanity_topics.md")


if __name__ == "__main__":
    asyncio.run(main())
