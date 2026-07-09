"""F1-01 parte B — inserta la directiva UNIVERSAL anti-robot en app_config. ESCRIBE con --apply.

La capa universal (el CÓMO se conversa, transversal a TODA clase) vive como DATO en
app_config bajo la clave 'universal_conversation_rules'. El composer (composer_proto.py,
bloque <universal_conversation_rules>) la apila SIEMPRE y hace fail-fast si falta.

SEGURO / INERTE para producción: el código VIEJO deployado no lee esta clave, así que
insertarla no cambia nada en prod hasta que se deploye el composer nuevo. Por eso esta
inserción SÍ se deja aplicada (a diferencia del barrido de presets, que se revierte).

OJO — schema: la tabla real es config_key/config_value (NO el ORM key/value), y config_value
es varchar(255). La directiva pasa de 255 chars → hay que AMPLIAR la columna a TEXT (widening
NO destructivo: las 5 filas existentes entran igual y el SELECT de prod no cambia). El ALTER
solo corre con --apply y solo si hace falta.

Patrón: dry-run por defecto → diff visible → backup JSON → --apply para escribir.
"""
import sys
import os
import json
import asyncio
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import AsyncSessionLocal, engine

APPLY = "--apply" in sys.argv
KEY = "universal_conversation_rules"

# ── Texto EXACTO de la directiva (Fable, 2026-07-09). NO editar sin OK del dueño. ──
UNIVERSAL_RULES = (
    "You are a real conversation partner, not a script reader. In every class, at every age and level:\n"
    "1. Keep the lesson structure invisible: never announce objectives, steps, or that this is a lesson. "
    "The plan guides YOU; the student only experiences a conversation.\n"
    "2. Never repeat your own phrasing. Vary every greeting, reaction, praise and prompt — if you already "
    "said it this session, say it differently.\n"
    "3. Build each turn on what the student just said: reuse their words, follow their interests, and if "
    "they bring up something of their own, pull that thread before moving on.\n"
    "4. Make ONE conversational move per turn, then stop — never stack questions or instructions.\n"
    "5. Correct language by recasting only: reply naturally using the correct form, without naming the "
    "mistake or stopping the flow.\n"
    "6. Correct only language — never the student's facts, stories, or opinions.\n"
    "7. You have no real-world experiences: never claim you watched, read, visited, or lived anything.\n"
    "8. Never confirm a real-world fact or event you don't actually know — even a plausible one. Turn it "
    "into curiosity and hand the turn back: \"I missed that one — tell me about it!\"\n"
    "9. Praise only what really happened: if the attempt didn't come out, model it again and invite a "
    "retry instead of pretending it did.\n"
    "10. End every turn with the student having a clear reason to speak."
)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # ── backup de TODO app_config ──
        rows = (await db.execute(text("SELECT config_key, config_value FROM app_config"))).all()
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bkp = os.path.join(os.path.dirname(__file__), f"_backup_app_config_{stamp}.json")
        with open(bkp, "w", encoding="utf-8") as fh:
            json.dump([{"config_key": k, "config_value": v} for k, v in rows], fh,
                      ensure_ascii=False, indent=1)

        # ── tipo actual de config_value ──
        col = (await db.execute(text(
            "SHOW COLUMNS FROM app_config WHERE Field='config_value'"))).mappings().first()
        col_type = (col["Type"] if col else "?")
        needs_alter = "text" not in str(col_type).lower()

        existing = {k: v for k, v in rows}
        prev = existing.get(KEY)

        print("== app_config: estado actual ==")
        print(f"  filas: {len(rows)}  claves: {sorted(existing)}")
        print(f"  config_value tipo actual: {col_type}")
        print(f"  directiva a insertar: {len(UNIVERSAL_RULES)} chars")
        print(f"  clave {KEY!r} existente: {'SÍ (se PISA)' if prev is not None else 'no (INSERT nuevo)'}")
        if prev is not None:
            print(f"    valor previo ({len(prev)} chars): {prev[:120]!r}...")
        if needs_alter:
            print(f"  >> ALTER necesario: config_value {col_type} -> TEXT (widening no destructivo, "
                  f"la directiva no entra en 255)")
        else:
            print("  >> ALTER no necesario (ya es TEXT)")

        print("\n== directiva (valor a guardar) ==")
        print(UNIVERSAL_RULES)

        if APPLY:
            if needs_alter:
                # DDL: MySQL hace commit implícito. Widening varchar->TEXT, no trunca.
                await db.execute(text("ALTER TABLE app_config MODIFY config_value TEXT NOT NULL"))
                print("\n[ALTER] config_value -> TEXT aplicado.")
            # IDEMPOTENTE: config_key es la PRIMARY KEY de app_config (verificado con
            # SHOW CREATE TABLE: `PRIMARY KEY ("config_key")`), así que ON DUPLICATE KEY UPDATE
            # matchea la fila existente y la PISA — re-correr --apply nunca crea filas duplicadas.
            await db.execute(
                text("INSERT INTO app_config (config_key, config_value) VALUES (:k, :v) "
                     "ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)"),
                {"k": KEY, "v": UNIVERSAL_RULES})
            await db.commit()
            # verificación de lectura
            got = (await db.execute(
                text("SELECT config_value FROM app_config WHERE config_key=:k"), {"k": KEY})).scalar_one()
            ok = got == UNIVERSAL_RULES
            print(f"\nAPLICADO. Backup: {os.path.basename(bkp)}")
            print(f"  verificación de lectura: {'OK (byte a byte)' if ok else 'MISMATCH!'} "
                  f"({len(got)} chars guardados)")
        else:
            await db.rollback()
            print(f"\nDRY-RUN (nada escrito). Backup igual escrito: {os.path.basename(bkp)}. "
                  f"Corré con --apply para escribir.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
