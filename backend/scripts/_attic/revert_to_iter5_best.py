"""Revierte iter6 (regresión) al pico iter5, conservando SOLO el bug-fix bueno de iter6:
sacar el 'repetir {vocab0}' residual de los openings kid (drilling) -> chunk con sentido.

iter6 regresó todo (early_child A1 7.6->4.8: el 'Say: I have a brother' anti-silencio se
volvió drilling). iter5 fue el pico medido (child A1 8.0, child A2 8.1 pasan). Restaura desde
el backup de iter6 y re-aplica solo los 2 openings kid limpios.

Uso: python scripts/revert_to_iter5_best.py
"""
from __future__ import annotations
import glob
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services import motor_engine  # noqa: E402

# Bug-fix bueno de iter6 que SÍ conservamos (sacar drilling de openings kid)
KEEP_OPENING_FIX = [
    ("band_group='kid' AND kind='opening' AND level_code IS NULL",
     "Saludá con energía como {tutor} (variá el saludo cada clase), presentá el mundo '{topic}' y enganchá. Modelá UNA "
     "frase EN corta y con SENTIDO (patrón 'This is my…/I have a…') y que el nene la diga entera o cuente algo suyo. "
     "NUNCA pidas repetir una palabra suelta."),
    ("band_group='kid' AND kind='opening' AND level_code='A2'",
     "Saludá con energía como {tutor} (variá el saludo), presentá '{topic}' con frases cortas (algo de español). Modelá "
     "UNA frase EN con sentido y que el nene la use o aporte algo suyo. NUNCA pidas repetir una palabra suelta."),
]


def main():
    db = motor_engine._connect()
    path = sorted(glob.glob(os.path.join(os.path.dirname(__file__), "_backup_pedagogy_iter6_*.json")))[-1]
    backup = json.load(open(path, encoding="utf-8"))
    print(f"[restaurando desde] {path}\n")
    for u in backup["updates"]:
        old_vals = u["old"]
        if not old_vals:
            continue
        # restaurar el valor pre-iter6 (= iter5). WHEREs son de 1 fila -> old[0]
        old = old_vals[0]
        where = u["where"]
        params = ("%recast%",) if "%s" in where else ()  # B2 LIKE -> param-safe (fila de recast, no pragmatic)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {u['table']} SET body=%s WHERE {where}", (old, *params))
        db.conn.commit()
        print(f"  revert {u['table']} [{where[:50]}] -> {old[:70]}")

    print("\n  -- re-aplico el bug-fix bueno (openings kid sin drilling) --")
    for where, body in KEEP_OPENING_FIX:
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE trigger_template SET body=%s WHERE {where}", (body,))
        db.conn.commit()
        print(f"  fix opening [{where[:45]}] -> {body[:60]}")

    print("\nLISTO: estado = iter5 (pico) + openings kid limpios. early_child A1 deberia volver a ~7.6.")
    db.conn.close()


if __name__ == "__main__":
    main()
