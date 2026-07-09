"""Aplica Motor-Learning/motor_v3.sql TAL CUAL contra la base real, y verifica.

Crea las 26 tablas (config + runtime + orquestación) + seed + el procedure
sp_build_stack. Después CALL sp_build_stack(2) (Caro · B2 · Fútbol) y dumpea las 9
capas con DATOS REALES — no simulación. No hay producción: reemplaza app_config (la
única colisión) con el esquema v3.

Uso: python scripts/run_motor_v3.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import aiomysql
from core.config import settings
from core.database import _ssl_ctx

SQL_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", "motor_v3.sql")


def _strip_comment_lines(block: str) -> str:
    return "\n".join(ln for ln in block.splitlines() if not ln.strip().startswith("--"))


def _split_statements(block: str) -> list[str]:
    """Split por ';' RESPETANDO strings de comilla simple (el seed tiene ';' dentro de
    un string y '' como comilla escapada)."""
    cleaned = _strip_comment_lines(block)
    stmts: list[str] = []
    buf: list[str] = []
    in_str = False
    i, n = 0, len(cleaned)
    while i < n:
        c = cleaned[i]
        if in_str:
            if c == "\\" and i + 1 < n:
                buf.append(c + cleaned[i + 1]); i += 2; continue
            if c == "'":
                if i + 1 < n and cleaned[i + 1] == "'":  # '' = comilla escapada
                    buf.append("''"); i += 2; continue
                in_str = False
            buf.append(c); i += 1
        else:
            if c == "'":
                in_str = True; buf.append(c); i += 1
            elif c == ";":
                s = "".join(buf).strip()
                if s:
                    stmts.append(s)
                buf = []; i += 1
            else:
                buf.append(c); i += 1
    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return stmts


def _parse_sql(raw: str) -> tuple[list[str], str]:
    before, rest = raw.split("DELIMITER $$", 1)
    proc_block, _after = rest.split("DELIMITER ;", 1)
    proc_sql = proc_block.strip()
    if proc_sql.endswith("$$"):
        proc_sql = proc_sql[:-2].strip()
    return _split_statements(before), proc_sql


async def _dump_call(cur) -> None:
    await cur.execute("CALL sp_build_stack(2)")
    while True:
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = await cur.fetchall()
            label = rows[0][0] if rows else (cols[0] if cols else "?")
            print(f"\n--- {label} ---  (cols: {', '.join(cols)})")
            for r in rows:
                print("   " + " | ".join("" if v is None else str(v) for v in r))
        if not await cur.nextset():
            break


async def main() -> None:
    with open(SQL_FILE, encoding="utf-8") as f:
        raw = f.read()
    # La base ya corre en utf8mb4_unicode_ci; forzamos la misma colación en las 26 tablas
    # nuevas para que el procedure (literales/variables unicode_ci) no choque (error 1267).
    raw = raw.replace("DEFAULT CHARSET=utf8mb4",
                      "DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci")
    statements, proc_sql = _parse_sql(raw)

    conn = await aiomysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, db=settings.DB_NAME, ssl=_ssl_ctx, autocommit=True,
    )
    try:
        async with conn.cursor() as cur:
            await cur.execute("SET sql_notes=0")  # silenciar 'Unknown table' de DROP IF EXISTS
            print(f"=== Aplicando motor_v3.sql ({len(statements)} sentencias + procedure) ===")
            for i, stmt in enumerate(statements):
                try:
                    await cur.execute(stmt)
                except Exception as e:
                    head = stmt[:70].replace("\n", " ")
                    print(f"  [ERROR] sentencia {i}: {head}...\n          {e}")
                    raise
            await cur.execute("DROP PROCEDURE IF EXISTS sp_build_stack")
            await cur.execute(proc_sql)
            print("  OK — 26 tablas + seed + sp_build_stack creados.")

            print("\n=== VERIFICACIÓN: CALL sp_build_stack(2)  [Caro · 28 · B2 + Fútbol] ===")
            await _dump_call(cur)
    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(main())
