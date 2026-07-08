"""RE-JUEZ: re-puntúa las transcripciones YA generadas de un _validar_*.json con la rúbrica
ACTUAL (calibrada), sin re-generar clases (solo Claude, barato). Sirve cuando cambiás el juez
y querés números comparables sin re-correr coach+alumno. Escribe _validar_*_<suf>.json.

Uso: python scripts/rejuzgar.py <band> <level> <tag_origen> [suf=rej]
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from scripts.validar_cambio import _judge, _avg  # rúbrica calibrada actual  # noqa: E402

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))


async def main():
    band, level, tag = sys.argv[1], sys.argv[2], sys.argv[3]
    suf = sys.argv[4] if len(sys.argv) > 4 else "rej"
    data = json.load(open(os.path.join(OUT, f"_validar_{band}_{level}_{tag}.json"), encoding="utf-8"))
    title = data["samples"][0]["title"] if data["samples"] else level
    n_classes = len(data["samples"][0]["classes"])
    print(f"Re-juzgando {band} {level} [{tag}] con rúbrica calibrada -> _{suf}\n")

    async def _rej(cell):
        cell["eval"] = await _judge(level, title, cell["conv"])
        return cell

    tasks = [c for s in data["samples"] for c in s["classes"]]
    await asyncio.gather(*[_rej(c) for c in tasks])

    for s in data["samples"]:
        row = [c["eval"].get("score") for c in s["classes"]]
        print(f"  {s['model']:<20} {row}  prom={_avg(row)}")
    by_hist = [_avg([s["classes"][c]["eval"].get("score") for s in data["samples"]]) for c in range(n_classes)]
    overall = _avg([c["eval"].get("score") for s in data["samples"] for c in s["classes"]])
    data["by_hist"], data["overall"] = by_hist, overall
    print(f"\nGLOBAL [{tag}/{suf}] = {overall}   (historia 0→{n_classes-1}: {by_hist})")
    out = os.path.join(OUT, f"_validar_{band}_{level}_{tag}_{suf}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"-> {out}")


if __name__ == "__main__":
    asyncio.run(main())
