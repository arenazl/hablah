"""Evaluación de CALIDAD de las clases kids CON vocab (el nuevo estándar). Lee
vocab_transcript_result, y por cada perfil un especialista pedagógico (IA) puntúa la
clase con-vocab: ¿integró el vocab con naturalidad o quedó forzado/rígido?, calidad 1-10,
fortalezas, problemas. Re-persiste con el campo 'eval' por perfil.
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402


def _load():
    db = motor_engine._connect()
    try:
        row = db.q1("SELECT id, data FROM vocab_transcript_result ORDER BY id DESC LIMIT 1")
        return (row["id"], json.loads(row["data"])) if row else (None, None)
    finally:
        db.conn.close()


def _save(row_id, data):
    db = motor_engine._connect()
    with db.conn.cursor() as cur:
        cur.execute("UPDATE vocab_transcript_result SET data=%s WHERE id=%s",
                    (json.dumps(data, ensure_ascii=False), row_id))
    db.conn.commit(); db.conn.close()


_RUBRIC = """SOS UN ESPECIALISTA EN PEDAGOGÍA DE IDIOMAS (SLA, 20 años de aula). Evaluá con
evidencia, no impresión. Marco (aplicalo, no lo nombres):
- Reciclado: una palabra se retiene con ~10-12 exposiciones; el coach debe re-usar las palabras objetivo, no decirlas una vez.
- Input comprensible i+1: debe ser 90-98% familiar para el chico; si se le va, sube el filtro afectivo.
- Filtro afectivo: cálido, celebra intentos, baja ansiedad, no corta fluidez por un error menor.
- Forma+significado: cada palabra anclada a su significado (realia/visual) y forma hablada.
- Corrección: para chicos, recast suave (no sobre-corregir); explícito solo si un error DISCRETO persiste.
"""


async def evaluate(pr):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in pr["con"])
    prompt = (
        _RUBRIC +
        f"\nEvaluá esta clase de un nene ({pr['band']} {pr['level']}) sobre '{pr['title']}', donde el "
        f"coach DEBÍA usar este vocabulario: {', '.join(pr['vocab'])}.\n\nTRANSCRIPCIÓN:\n{convo}\n\n"
        "Revisá 7 puntos: (1) integración del vocab (natural vs lista mecánica/forzada), (2) reciclado/repetición, "
        "(3) comprensibilidad 90-98%/i+1, (4) forma+significado, (5) filtro afectivo, (6) corrección balanceada, "
        "(7) ¿el vocab obligatorio AYUDÓ o ENTORPECIÓ?\n"
        "Devolvé SOLO JSON: {\"score\":1-10,\"integration\":\"natural|forzado|mixto\","
        "\"recycling\":\"bueno|pobre\",\"strengths\":[\"...\"],\"issues\":[\"...\"],"
        "\"vocab_helped\":true/false,\"verdict\":\"1-2 frases\"}"
    )
    raw = await mp._claude_headless(prompt, timeout=90)
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no se pudo evaluar)"}


async def main():
    row_id, data = _load()
    if not data or not data.get("profiles"):
        print("no hay vocab_transcript_result todavía"); return
    for pr in data["profiles"]:
        print(f"evaluando {pr['band']} {pr['level']} · {pr['title']} ...")
        pr["eval"] = await evaluate(pr)
        e = pr["eval"]
        print(f"  score={e.get('score')} integración={e.get('integration')} · {e.get('verdict','')[:80]}")
    _save(row_id, data)
    print("\neval persistida en vocab_transcript_result")


if __name__ == "__main__":
    asyncio.run(main())
