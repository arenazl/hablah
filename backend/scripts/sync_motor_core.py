"""Sincroniza el snapshot deployable de los 2 motores.

Motor-Learning/ tiene los archivos canónicos (los que editás). Heroku solo deploya backend/,
así que copiamos motor_prompt.py + motor_postclass.py a backend/motor_core/ antes de cada push.
Corré esto cuando toques los motores. Uso: python scripts/sync_motor_core.py
"""
import os
import shutil

HERE = os.path.dirname(__file__)
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "Motor-Learning"))
DST = os.path.normpath(os.path.join(HERE, "..", "motor_core"))

if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    for f in ("motor_prompt.py", "motor_postclass.py"):
        src = os.path.join(SRC, f)
        if not os.path.exists(src):
            raise SystemExit(f"no existe {src}")
        shutil.copy2(src, os.path.join(DST, f))
        print(f"  synced {f}")
    print("motor_core actualizado.")
