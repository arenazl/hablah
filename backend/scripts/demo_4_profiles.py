"""DEMO: 4 perfiles muy distintos, cada uno DESDE 0, 7 clases sobre un tópico.
Captura cómo la orquestación se va personalizando clase a clase (ruteo a etapas
3/4/5 + objetivos) y arma un HTML para ver el progreso de los 4 escenarios.

Las observaciones las redacto yo (Claude) simulando un alumno que progresa:
errores que se repiten (convergen/SRS), fortalezas que emergen, conducta y motivación.
"""
from __future__ import annotations
import asyncio
import html
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "motor_demo.html"))

PROFILES = [
    {"band": "early_child", "level": "A1", "label": "Primera infancia · A1", "topic": "Los animales",
     "classes": [
        ["dijo 'I have 5 years'", "se rie y se prende cuando aparece el perro"],
        ["dijo 'the cat are small'", "le cuesta repetir 'elephant'"],
        ["otra vez 'I have 5 years'", "le encantan los animales, pide mas"],
        ["dijo 'I no like spiders'", "esta vez repitio bien 'dog'"],
        ["dijo 'the dogs is big'", "se distrae si la actividad es larga"],
        ["pidio hablar del leon, super enganchado", "de nuevo 'I have 5 years'"],
        ["uso 'big' y 'small' bien", "muy motivado con los animales"],
     ]},
    {"band": "child", "level": "A2", "label": "Niños · A2", "topic": "Mi videojuego favorito",
     "classes": [
        ["dijo 'I play Minecraft yesterday' (presente por pasado)", "super entusiasmado con los videojuegos"],
        ["dijo 'I no can build'", "le cuesta el pasado: dijo 'goed'"],
        ["otra vez presente por pasado: 'I win yesterday'", "explico bien con 'because'"],
        ["de nuevo 'goed'", "le da verguenza cuando se equivoca"],
        ["uso 'because' de nuevo, muy bien", "dijo 'I have 10 years'"],
        ["a veces ya dice 'I played'", "muy motivado con juegos"],
        ["uso 'I played' correcto", "otra vez 'I have 10 years'"],
     ]},
    {"band": "teen", "level": "B1", "label": "Teen · B1", "topic": "Las redes sociales",
     "classes": [
        ["confunde since/for: 'I use Instagram since 3 years'", "le interesa mucho el tema de redes"],
        ["dijo 'people is addicted'", "buena opinion con 'in my opinion'"],
        ["since/for otra vez mal", "se traba al dar argumentos largos"],
        ["uso 'in my opinion' de nuevo, fluido", "confunde make/do: 'make a post'"],
        ["since/for por tercera vez", "le cuesta el present perfect"],
        ["present perfect mal otra vez", "muy motivado debatiendo"],
        ["mejoro since/for una vez", "argumenta mejor"],
     ]},
    {"band": "adult", "level": "C1", "label": "Adulto · C1", "topic": "El trabajo remoto",
     "classes": [
        ["registro muy bueno pero abusa de 'actually' (falso amigo por 'currently')", "le interesa la productividad"],
        ["'actually' otra vez por 'currently'", "usa idioms muy bien"],
        ["confunde 'efficient' y 'effective'", "argumenta con matices"],
        ["'actually' por tercera vez", "muy fluido, busca naturalidad"],
        ["mejoro: uso 'currently' bien", "usa phrasal verbs avanzados"],
        ["idioms impecables", "le interesa el equilibrio vida-trabajo"],
        ["'actually' ya correcto", "registro natural y preciso"],
     ]},
]


def _block(prompt: str, tag: str) -> list[str]:
    inner = re.sub(r"</?system_instruction_stack>", "", prompt or "")
    m = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", inner)
    return [l.strip() for l in m.group(1).strip().splitlines()] if m else []


async def run_profile(p: dict) -> dict:
    prof = await mp.get_or_create_profile(p["band"], p["level"])
    sid = prof["student_id"]
    await mp.wipe_learned_state(sid)
    snaps = []
    for i, obs in enumerate(p["classes"], 1):
        rep = await mp.process(sid, obs, p["level"], provider="claude")
        prompt = (await motor_engine.resolve(p["band"], p["level"], None, sid, None)).get("prompt", "")
        adapt = [l for l in _block(prompt, "pedagogical_framework") if l.startswith("Student adaptation:")]
        motiv = [l for l in _block(prompt, "lesson_focus_engagement") if l.startswith("Student motivation:")]
        mem = _block(prompt, "learner_state")
        snaps.append({
            "n": i, "obs": obs,
            "new": [x["canonical_key"] for x in (rep.get("new_presets") or [])],
            "reinforced": rep.get("reinforced") or [],
            "objs": len(rep.get("objectives_applied") or {}),
            "adapt": [a.replace("Student adaptation:", "").strip() for a in adapt],
            "motiv": [m.replace("Student motivation:", "").strip() for m in motiv],
            "mem": [m for m in mem if m != "(vacío)"],
        })
    return {**p, "snaps": snaps}


def _li(items, cls):
    return "".join(f'<li class="{cls}">{html.escape(x)}</li>' for x in items) or '<li class="empty">—</li>'


def build_html(data: list[dict]) -> str:
    css = """
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0e14;color:#e6e8ec;margin:0;padding:24px}
    h1{font-size:22px;margin:0 0 4px} .sub{color:#9aa3af;font-size:13px;margin:0 0 24px}
    .prof{background:#11151d;border:1px solid #232936;border-radius:14px;padding:18px;margin-bottom:22px}
    .phead{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
    .phead h2{font-size:18px;margin:0} .topic{color:#38bdf8;font-size:13px;font-weight:700}
    .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
    .cl{background:#0b0e14;border:1px solid #232936;border-radius:10px;padding:10px;font-size:11px}
    .cl h3{font-size:11px;margin:0 0 6px;color:#6b7686;text-transform:uppercase;letter-spacing:.5px}
    .sec{margin:7px 0} .sec b{font-size:9px;color:#6b7686;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px}
    ul{margin:0;padding:0;list-style:none} li{padding:2px 0;line-height:1.3}
    li.pos{color:#22c55e} li.neg{color:#f87171} li.mem{color:#cbd5e1} li.empty{color:#3a4250}
    .badge{display:inline-block;font-size:9px;font-weight:800;padding:1px 6px;border-radius:6px;background:rgba(56,189,248,.14);color:#38bdf8;margin-left:6px}
    .leg{color:#9aa3af;font-size:12px;margin:10px 0 0} .leg b{color:#e6e8ec}
    """
    out = [f"<!doctype html><meta charset=utf-8><title>Motor Habláh — orquestación</title><style>{css}</style>"]
    out.append("<h1>Motor Habláh — progreso de la orquestación</h1>")
    out.append('<p class="sub">4 perfiles, cada uno DESDE 0, 7 clases. Mirá cómo la orquestación se personaliza clase a clase: '
               'etapa 3 (cómo enseña) absorbe la conducta, etapa 4 (la dinámica) la motivación, etapa 5 (memoria) errores y fortalezas. '
               '<span style="color:#22c55e">verde = fortaleza (+)</span> · <span style="color:#f87171">rojo = a trabajar (−)</span></p>')
    for p in data:
        out.append('<div class="prof">')
        out.append(f'<div class="phead"><h2>{html.escape(p["label"])}</h2><span class="topic">tópico: {html.escape(p["topic"])}</span></div>')
        out.append('<div class="grid">')
        for s in p["snaps"]:
            nb = f'<span class="badge">+{len(s["new"])}</span>' if s["new"] else ""
            def cls(line):  # colorea por el signo +/-
                return "pos" if line.strip().startswith("+") else "neg" if line.strip().startswith("-") else "mem"
            mem_html = "".join(f'<li class="{cls(x)}">{html.escape(x)}</li>' for x in s["mem"]) or '<li class="empty">vacía</li>'
            adapt_html = "".join(f'<li class="{cls(x)}">{html.escape(x)}</li>' for x in s["adapt"]) or '<li class="empty">—</li>'
            motiv_html = "".join(f'<li class="{cls(x)}">{html.escape(x)}</li>' for x in s["motiv"]) or '<li class="empty">—</li>'
            out.append('<div class="cl">')
            out.append(f'<h3>Clase {s["n"]}{nb}</h3>')
            out.append(f'<div class="sec"><b>Etapa 3 · cómo enseña</b><ul>{adapt_html}</ul></div>')
            out.append(f'<div class="sec"><b>Etapa 4 · la dinámica</b><ul>{motiv_html}</ul></div>')
            out.append(f'<div class="sec"><b>Etapa 5 · memoria</b><ul>{mem_html}</ul></div>')
            out.append(f'<div class="sec"><b>objetivos SRS</b> {s["objs"]}</div>')
            out.append('</div>')
        out.append('</div></div>')
    return "\n".join(out)


async def main():
    data = []
    for p in PROFILES:
        print(f"corriendo {p['label']} ...")
        data.append(await run_profile(p))
    htmls = build_html(data)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(htmls)
    print("HTML:", OUT)


if __name__ == "__main__":
    asyncio.run(main())
