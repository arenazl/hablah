"""DRY-RUN: diff entre el catálogo curado v3 (markdown) y la tabla topics.

NO escribe nada. Cruza las filas de docs/motor-catalogo/03-topicos-completos-v3.md contra
la DB (activos + inactivos) y clasifica cada una en:
  - UPDATE     : ya existe activo; cambian levels/category (contenido keywords/generated_vocab se CONSERVA)
  - REACTIVATE : existe pero inactivo; hay que reactivar (+ update de estructura)
  - INSERT     : no existe ni match cercano; tópico nuevo (habrá que generarle contenido aparte)
  - RENAME?    : no hay match exacto pero SÍ uno cercano -> candidato a renombre (decide humano)
Y al final: DEACTIVATE = activos en DB que v3 ya no incluye.
"""
import sys
import os
import re
import asyncio
import unicodedata
from difflib import get_close_matches

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal, engine
from models.template import Topic

V3 = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "motor-catalogo", "03-topicos-completos-v3.md")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def parse_v3() -> list[dict]:
    out = []
    with open(V3, encoding="utf-8") as fh:
        for ln in fh:
            if not ln.startswith("|"):
                continue
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if len(cells) < 5 or cells[0] in ("edad", "---") or cells[0].startswith("-"):
                continue
            seg, title, levels, cat, seed = cells[:5]
            out.append({"seg": seg, "title": title, "levels": [x.strip() for x in levels.split(",")],
                        "cat": cat, "seed": seed})
    return out


async def main() -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Topic))).scalars().all()
    await engine.dispose()

    by_norm = {}
    for r in rows:
        by_norm.setdefault(norm(r.title), r)
    norm_titles = list(by_norm.keys())

    v3 = parse_v3()
    matched_ids = set()
    upd, react, ins, rename = [], [], [], []

    for t in v3:
        n = norm(t["title"])
        r = by_norm.get(n)
        if r:
            matched_ids.add(r.id)
            cur_lv = r.levels or []
            chg = []
            if cur_lv != t["levels"]:
                chg.append(f"levels {cur_lv} -> {t['levels']}")
            if (r.category or "") != t["cat"]:
                chg.append(f"cat {r.category!r} -> {t['cat']!r}")
            tag = " | ".join(chg) if chg else "sin cambios de estructura"
            (react if not r.is_active else upd).append(f"[{t['seg']}] {t['title']}  (id={r.id})  {tag}")
        else:
            close = get_close_matches(n, norm_titles, n=1, cutoff=0.6)
            if close:
                cr = by_norm[close[0]]
                rename.append(f"[{t['seg']}] {t['title']}  ~?  id={cr.id} {cr.title!r} (active={cr.is_active})")
            else:
                ins.append(f"[{t['seg']}] {t['title']}  ({','.join(t['levels'])} · {t['cat']})")

    deact = [f"id={r.id} {r.title!r} [{r.segmento}]" for r in rows if r.is_active and r.id not in matched_ids]

    def block(title, items):
        print(f"\n===== {title} ({len(items)}) =====")
        for i in items:
            print("  " + i)

    print(f"v3 filas: {len(v3)}  |  DB topics: {len(rows)} (activos {sum(1 for r in rows if r.is_active)})")
    block("UPDATE (activo, ajustar estructura)", upd)
    block("REACTIVATE (estaba inactivo)", react)
    block("RENAME? (match cercano - decide humano)", rename)
    block("INSERT (nuevo, falta generar contenido)", ins)
    block("DEACTIVATE (activo en DB, no esta en v3)", deact)


if __name__ == "__main__":
    asyncio.run(main())
