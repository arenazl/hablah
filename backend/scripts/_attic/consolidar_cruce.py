"""Consolida los _cruce_<band>_<level>_JUDGED.json en un informe único legible para registro
histórico (docs/multi-llm-v3/_CRUCE_consolidado.md). Matriz modelo×persona, promedios por
dimensión y celdas bajas (<7) con veredicto, por perfil. Sirve de checkpoint reversible.

Uso: python scripts/consolidar_cruce.py <band>:<level> [<band>:<level> ...]
"""
from __future__ import annotations
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
DIMS = ["naturalidad", "afecto", "i1", "reciclado", "recast"]


def _avg(vals):
    nums = [v for v in vals if isinstance(v, (int, float))]
    return round(sum(nums) / len(nums), 1) if nums else None


def main():
    profiles = sys.argv[1:] or ["early_child:A1", "child:B1", "adult:A1"]
    L = ["# Cruce de alumnos — consolidado (registro reversible)", "",
         "coach = Gemini `flash-lite` (prod) · alumno = 5 modelos Ollama × 4 personas · juez = Claude SLA  ",
         "Cada celda = 1 clase (historia 0). Promedio del coach = sobre las 20 celdas válidas (0 infra_fail).", ""]
    for pr in profiles:
        band, level = pr.split(":")
        path = os.path.join(OUT, f"_cruce_{band}_{level}_JUDGED.json")
        if not os.path.exists(path):
            L.append(f"## {band} {level} — (sin datos)\n"); continue
        d = json.load(open(path, encoding="utf-8"))
        cells = [c for c in d["cells"] if not c["metrics"]["infra_fail"]]
        models, personas = d["models"], d["personas"]
        grid = {(c["model"], c["persona"]): c["eval"].get("score") for c in cells}
        overall = _avg([c["eval"].get("score") for c in cells])
        L += [f"## {band} {level} · {d['title']} — **promedio coach {overall}**", "",
              "| modelo | " + " | ".join(personas) + " | PROM |", "|" + "---|" * (len(personas) + 2)]
        for m in models:
            row = [grid.get((m, p)) for p in personas]
            L.append(f"| {m} | " + " | ".join(str(v) if v is not None else "—" for v in row)
                     + f" | {_avg(row)} |")
        L.append("| **PROM** | " + " | ".join(str(_avg([grid.get((m, p)) for m in models])) for p in personas) + " | |")
        L += ["", "Dimensiones (promedio): " + " · ".join(
            f"**{dim}** {_avg([c['eval'].get(dim) for c in cells])}" for dim in DIMS), ""]
        low = sorted([c for c in cells if (c["eval"].get("score") or 9) < 7], key=lambda c: c["eval"].get("score") or 9)
        if low:
            L.append("Celdas bajas (<7):")
            for c in low:
                L.append(f"- `{c['model']}/{c['persona']}` score **{c['eval'].get('score')}** "
                         f"(rec {c['eval'].get('reciclado')} recast {c['eval'].get('recast')} i+1 {c['eval'].get('i1')}): "
                         f"{c['eval'].get('verdict', '')}")
        L.append("")
    out = os.path.join(OUT, "_CRUCE_consolidado.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"-> {out}")


if __name__ == "__main__":
    main()
