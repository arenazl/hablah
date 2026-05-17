"""Entrypoint local: setea SelectorEventLoop ANTES de levantar uvicorn (Windows)."""
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8200, reload=False, loop="asyncio")
