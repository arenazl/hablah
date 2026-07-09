"""JUEZ del cruce de alumnos. Lee _cruce_<band>_<level>.json, puntúa cada clase con el
especialista SLA (Claude headless, MISMA vara del handoff = score comparable) y arma la matriz
MODELO x PERSONA. Promedios marginales responden: ¿el score bajo es del COACH o del ALUMNO?

- Si TODAS las personas/modelos dan parejo bajo -> es el COACH (señal real).
- Si 'fluido'/'crack' dan alto y solo 'trabado' da bajo -> el coach está bien; el bajo era el ALUMNO.

Descarta celdas con infra_fail (alumno mudo por 429, no por pedagogía).

Uso: python scripts/juez_cruce.py <band> <level>
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
from services import motor_protocol as mp  # noqa: E402

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
_SEM = asyncio.Semaphore(4)   # límite de procesos `claude -p` simultáneos

_RUBRIC = (
    "SOS ESPECIALISTA EN ADQUISICIÓN DE SEGUNDAS LENGUAS (SLA), evaluando una clase de inglés para un "
    "alumno hispanohablante. Evaluá SOLO la actuación del PROFE (coach), no la del alumno.\n"
    "Dimensiones (cada una 1-10):\n"
    "- naturalidad: conversación genuina, NO TPR robótico ni carrusel mecánico repetido.\n"
    "- afecto: filtro afectivo — celebra intentos, baja ansiedad, no corta fluidez.\n"
    "- i1: input comprensible i+1, calibrado al nivel (90-98% familiar).\n"
    "- reciclado: recircula vocab ya visto, no lo dice una vez y sigue.\n"
    "- recast: reformula el error sin señalar (ni sobre-corrige ni lo ignora).\n"
    "NO penalices cobertura de vocabulario. Si el ALUMNO produjo muy poco, evaluá si el profe supo INVITAR a "
    "producir (need-for-output); NO castigues al profe por el silencio del alumno, pero SÍ por no provocarlo.\n"
    'Devolvé SOLO JSON: {"score":1-10,"naturalidad":1-10,"afecto":1-10,"i1":1-10,"reciclado":1-10,"recast":1-10,"verdict":"1-2 frases"}'
)


async def _judge(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    async with _SEM:
        raw = await mp._claude_headless(f"{_RUBRIC}\n\nClase ({level}) sobre '{title}':\n{convo}")
    p = mp._parse_json(raw or "") or {}
    return {k: p.get(k) for k in ("score", "naturalidad", "afecto", "i1", "reciclado", "recast", "verdict")}


def _avg(vals):
    nums = [v for v in vals if isinstance(v, (int, float))]
    return round(sum(nums) / len(nums), 1) if nums else None


async def main():
    band, level = sys.argv[1], sys.argv[2]
    data = json.load(open(os.path.join(OUT, f"_cruce_{band}_{level}.json"), encoding="utf-8"))
    title, models, personas = data["title"], data["models"], data["personas"]
    cells = data["cells"]
    print(f"Juzgando {len(cells)} clases de {band} {level} · {title} (juez SLA)...\n")

    async def _run(cell):
        ev = await _judge(level, title, cell["conv"])
        cell["eval"] = ev
        infra = cell["metrics"]["infra_fail"]
        print(f"  {cell['model']:<20} {cell['persona']:<8} score={ev.get('score')} "
              f"(nat {ev.get('naturalidad')} afe {ev.get('afecto')} i+1 {ev.get('i1')} "
              f"rec {ev.get('reciclado')} recast {ev.get('recast')}){' INFRA_FAIL' if infra else ''}")
        return cell

    cells = await asyncio.gather(*[_run(c) for c in cells])
    valid = [c for c in cells if not c["metrics"]["infra_fail"]]

    # matriz modelo x persona
    grid = {(c["model"], c["persona"]): c["eval"].get("score") for c in valid}
    print("\n===== MATRIZ score (filas=modelo, cols=persona) =====")
    head = "modelo".ljust(20) + "".join(p.ljust(9) for p in personas) + "PROM"
    print(head)
    for m in models:
        row = [grid.get((m, p)) for p in personas]
        cells_s = "".join((str(v) if v is not None else "—").ljust(9) for v in row)
        print(m.ljust(20) + cells_s + str(_avg(row)))
    # promedio por persona (col)
    print("PROM".ljust(20) + "".join(str(_avg([grid.get((m, p)) for m in models])).ljust(9) for p in personas))

    # promedios marginales + dimensiones
    overall = _avg([c["eval"].get("score") for c in valid])
    print(f"\nPROMEDIO GLOBAL del coach (sobre {len(valid)} clases válidas): {overall}")
    print("\nPor PERSONA (promedio sobre modelos):")
    for p in personas:
        sub = [c for c in valid if c["persona"] == p]
        print(f"  {p:<8} score={_avg([c['eval'].get('score') for c in sub])}  "
              f"recast={_avg([c['eval'].get('recast') for c in sub])}  "
              f"afecto={_avg([c['eval'].get('afecto') for c in sub])}  "
              f"(alumno ~{_avg([c['metrics']['alumno_palabras'] for c in sub])} pal)")
    print("\nPor MODELO (promedio sobre personas):")
    for m in models:
        sub = [c for c in valid if c["model"] == m]
        print(f"  {m:<20} score={_avg([c['eval'].get('score') for c in sub])}")

    out = os.path.join(OUT, f"_cruce_{band}_{level}_JUDGED.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"\n-> {out}")


if __name__ == "__main__":
    asyncio.run(main())
