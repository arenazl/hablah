"""CARRERA V1 vs V2: 4 perfiles distintos, 7 clases c/u, desde 0.
Por cada clase corre la MISMA observación por dos orquestaciones:
  V1 = la actual (se persiste, acumula el learned_state real).
  V2 = lente de ESPECIALISTA en pedagogía (basado en evidencia SLA), sin persistir.
Genera un HTML comparativo para ver, clase a clase, qué directiva produce cada una.
No pisa V1 (V2 no toca la base).
"""
from __future__ import annotations
import asyncio
import html
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_protocol as mp  # noqa: E402

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


def _nk(k: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (k or "").lower())


async def run_profile(p: dict) -> dict:
    prof = await mp.get_or_create_profile(p["band"], p["level"])
    sid = prof["student_id"]
    await mp.wipe_learned_state(sid)
    snaps = []
    for i, obs in enumerate(p["classes"], 1):
        rep = await mp.process(sid, obs, p["level"], provider="claude")          # V1 (persiste)
        v2 = await mp.categorize(obs, p["level"], provider="claude", version="v2")  # V2 (no persiste)
        v1d = {_nk(x.get("canonical_key")): x for x in (rep.get("presets") or [])}
        v2d = {_nk(x.get("canonical_key")): x for x in (v2.get("presets") or [])}
        pairs = []
        for k in list(dict.fromkeys(list(v1d) + list(v2d))):
            a, b = v1d.get(k, {}), v2d.get(k, {})
            src = a or b
            pairs.append({
                "label": src.get("label", k), "kind": src.get("kind", ""),
                "polarity": src.get("polarity", "neutral"),
                "v1": a.get("directive", "—"), "v2": b.get("directive", "—"),
            })
        snaps.append({"n": i, "obs": obs, "pairs": pairs})
    return {**p, "snaps": snaps}


def build_html(data: list[dict]) -> str:
    css = """
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0e14;color:#e6e8ec;margin:0;padding:24px;line-height:1.4}
    h1{font-size:23px;margin:0 0 4px}.sub{color:#9aa3af;font-size:13px;margin:0 0 8px;max-width:1000px}
    .princ{background:#11151d;border:1px solid #232936;border-radius:12px;padding:12px 16px;margin:14px 0 26px;font-size:12.5px;color:#cbd5e1;max-width:1000px}
    .princ b{color:#38bdf8}
    .prof{background:#11151d;border:1px solid #232936;border-radius:14px;padding:18px;margin-bottom:24px}
    .phead{display:flex;align-items:baseline;gap:12px;margin-bottom:12px;border-bottom:1px solid #232936;padding-bottom:10px}
    .phead h2{font-size:18px;margin:0}.topic{color:#38bdf8;font-size:13px;font-weight:700}
    .cl{margin:14px 0;border-left:3px solid #2a3champ;border-left:3px solid #2a3340;padding-left:12px}
    .cln{font-size:11px;color:#6b7686;text-transform:uppercase;letter-spacing:.5px;font-weight:800;margin-bottom:6px}
    .obs{font-size:11.5px;color:#7b8694;font-style:italic;margin-bottom:8px}
    .pat{margin:8px 0;background:#0b0e14;border:1px solid #232936;border-radius:10px;overflow:hidden}
    .patlbl{padding:7px 10px;font-size:12.5px;font-weight:700;display:flex;gap:8px;align-items:center}
    .tag{font-size:9px;font-weight:800;padding:1px 6px;border-radius:5px}
    .row{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #232936}
    .cell{padding:8px 10px;font-size:12px}.cell:first-child{border-right:1px solid #232936}
    .vh{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .v1 .vh{color:#9aa3af}.v2 .vh{color:#22c55e}
    .v2{background:rgba(34,197,94,.05)}
    .pos{color:#22c55e}.neg{color:#f87171}.neu{color:#9aa3af}
    """
    out = [f"<!doctype html><meta charset=utf-8><title>Motor Habláh — V1 vs V2 especialista</title><style>{css}</style>"]
    out.append("<h1>Motor Habláh — carrera V1 vs V2 (especialista en pedagogía)</h1>")
    out.append('<p class="sub">4 perfiles muy distintos, cada uno desde 0, 7 clases. Misma observación, dos orquestaciones: '
               '<b style="color:#9aa3af">V1 = la actual</b> · <b style="color:#22c55e">V2 = lente de especialista (SLA, basado en evidencia)</b>. '
               'Compará la DIRECTIVA que produce cada una.</p>')
    out.append('<div class="princ"><b>Qué cambia el V2</b> (prácticas basadas en evidencia): '
               'recast→corrección EXPLÍCITA en adultos y errores que se repiten (capta más); '
               'bajar el FILTRO AFECTIVO antes de corregir (frustración); input i+1; '
               'la motivación se vuelve TAREA comunicativa; construir sobre fortalezas.</div>')
    POL = {"positive": ("pos", "+"), "negative": ("neg", "−"), "neutral": ("neu", "·")}
    for p in data:
        out.append('<div class="prof">')
        out.append(f'<div class="phead"><h2>{html.escape(p["label"])}</h2><span class="topic">tópico: {html.escape(p["topic"])}</span></div>')
        for s in p["snaps"]:
            out.append('<div class="cl">')
            out.append(f'<div class="cln">Clase {s["n"]}</div>')
            out.append(f'<div class="obs">obs: {html.escape(" · ".join(s["obs"]))}</div>')
            for pr in s["pairs"]:
                pc, sign = POL.get(pr["polarity"], ("neu", "·"))
                out.append('<div class="pat">')
                out.append(f'<div class="patlbl"><span class="tag {pc}">{sign} {html.escape(pr["kind"])}</span> {html.escape(pr["label"])}</div>')
                out.append('<div class="row">')
                out.append(f'<div class="cell v1"><div class="vh">V1 actual</div>{html.escape(pr["v1"] or "—")}</div>')
                out.append(f'<div class="cell v2"><div class="vh">V2 especialista</div>{html.escape(pr["v2"] or "—")}</div>')
                out.append('</div></div>')
            out.append('</div>')
        out.append('</div>')
    return "\n".join(out)


async def main():
    data = []
    for p in PROFILES:
        print(f"corriendo {p['label']} (V1+V2) ...")
        data.append(await run_profile(p))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(build_html(data))
    print("HTML:", OUT)


if __name__ == "__main__":
    asyncio.run(main())
