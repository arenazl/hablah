"""Desactiva el tópico 'Contar del 1 al 10' (mini/A0).

Motivo: como drill numérico induce falsa-cámara (el coach termina festejando
saltos/dedos que NO puede ver) y narrativamente es flojo. El dueño lo va a
reenfocar como profesor más adelante. Idempotente y reversible (is_active=1).

Uso: heroku run "python scripts/deactivate_topic_conteo.py"
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import AsyncSessionLocal

TITLE = "Contar del 1 al 10"


async def main():
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            text("SELECT id, title, is_active, segmento FROM topics WHERE title LIKE :q"),
            {"q": "%ontar%"})).fetchall()
        print("Tópicos que matchean 'ontar':")
        for r in rows:
            print(f"  id={r[0]} | {r[1]!r} | is_active={r[2]} | segmento={r[3]}")
        res = await db.execute(
            text("UPDATE topics SET is_active = 0 WHERE title = :t"),
            {"t": TITLE})
        await db.commit()
        print(f"\nDESACTIVADO {TITLE!r} -> filas afectadas: {res.rowcount}")
        if res.rowcount == 0:
            print("  (ojo: 0 filas — revisá el título exacto en la lista de arriba)")


if __name__ == "__main__":
    asyncio.run(main())
