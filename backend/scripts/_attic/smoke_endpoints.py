"""Smoke test de TODOS los endpoints de Habláh contra producción.

Recorre los 43 endpoints, los llama en orden con auth real, y reporta
cuáles devuelven status esperado vs cuáles fallan.

Uso:
    python scripts/smoke_endpoints.py [--base https://hablah-api-685973917497.us-east4.run.app]
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any, Optional

import httpx

DEFAULT_BASE = "https://hablah-api-685973917497.us-east4.run.app"
ADMIN_EMAIL = "admin@hablah.app"
ADMIN_PASSWORD = "admin123"
STUDENT_EMAIL = "demo@hablah.app"
STUDENT_PASSWORD = "demo123"


GREEN = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"; DIM = "\033[2m"; RESET = "\033[0m"

results: list[dict] = []


def log(status: str, method: str, path: str, code: int, detail: str = "") -> None:
    color = GREEN if status == "OK" else (YELLOW if status == "WARN" else RED)
    print(f"{color}[{status:>4}]{RESET} {method:>6} {path:<55} {color}HTTP {code}{RESET} {DIM}{detail[:80]}{RESET}")
    results.append({"status": status, "method": method, "path": path, "code": code, "detail": detail})


async def hit(
    cli: httpx.AsyncClient,
    method: str,
    path: str,
    *,
    headers: Optional[dict] = None,
    json_body: Any = None,
    params: Optional[dict] = None,
    expected: tuple[int, ...] = (200,),
    label_path: Optional[str] = None,
) -> Optional[httpx.Response]:
    try:
        r = await cli.request(method, path, headers=headers or {}, json=json_body, params=params, timeout=30)
    except Exception as e:
        log("FAIL", method, label_path or path, 0, f"{type(e).__name__}: {e}")
        return None
    label = label_path or path
    if r.status_code in expected:
        try:
            data = r.json()
            preview = json.dumps(data)[:80] if data else ""
        except Exception:
            preview = r.text[:80]
        log("OK", method, label, r.status_code, preview)
        return r
    log("FAIL", method, label, r.status_code, r.text[:120])
    return r


async def main() -> None:
    base = DEFAULT_BASE
    if "--base" in sys.argv:
        base = sys.argv[sys.argv.index("--base") + 1]
    print(f"\n=== HABLÁH ENDPOINT SMOKE — {base} ===\n")

    async with httpx.AsyncClient(base_url=base) as cli:
        # ─── PÚBLICOS ─────────────────────────────────────────────────────
        await hit(cli, "GET", "/health")

        # ─── AUTH ─────────────────────────────────────────────────────────
        r = await hit(cli, "POST", "/api/auth/login", json_body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if not r or r.status_code != 200:
            print(f"\n{RED}Admin login falló. Abortando.{RESET}")
            return
        admin_token = r.json()["access_token"]
        admin_h = {"Authorization": f"Bearer {admin_token}"}

        r = await hit(cli, "POST", "/api/auth/login", json_body={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
        student_token = r.json()["access_token"] if r and r.status_code == 200 else admin_token
        student_h = {"Authorization": f"Bearer {student_token}"}

        await hit(cli, "POST", "/api/auth/login", json_body={"email": ADMIN_EMAIL, "password": "wrong"}, expected=(401,))

        await hit(cli, "GET", "/api/auth/me", headers=admin_h)

        # ─── USERS ────────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/users/", headers=admin_h)
        await hit(cli, "GET", "/api/users/me", headers=admin_h)
        await hit(cli, "PATCH", "/api/users/me", headers=admin_h, json_body={"nombre": "Admin"})

        # ─── ME ────────────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/me/profile", headers=admin_h)
        await hit(cli, "PATCH", "/api/me/settings", headers=admin_h, json_body={"target_minutes_per_session": 7})

        # ─── TEMPLATES ─────────────────────────────────────────────────────
        r = await hit(cli, "GET", "/api/templates/", headers=admin_h)
        templates = r.json() if r and r.status_code == 200 else []
        if templates:
            tid = templates[0]["id"]
            await hit(cli, "GET", f"/api/templates/{tid}", headers=admin_h)
            await hit(cli, "PATCH", f"/api/templates/{tid}", headers=admin_h, json_body={"description": templates[0]["description"]})
        # Forbidden si llama student
        await hit(cli, "POST", "/api/templates/", headers=student_h, json_body={"slug": "x", "name": "x"}, expected=(403,))

        # ─── TOPICS ────────────────────────────────────────────────────────
        r = await hit(cli, "GET", "/api/topics/", headers=admin_h)
        topics = r.json() if r and r.status_code == 200 else []
        await hit(cli, "GET", "/api/topics/", headers=admin_h, params={"category": "deportes"}, label_path="/api/topics/?category=deportes")
        await hit(cli, "GET", "/api/topics/", headers=admin_h, params={"q": "garage"}, label_path="/api/topics/?q=garage")
        await hit(cli, "GET", "/api/topics/categories", headers=admin_h)
        if topics:
            await hit(cli, "GET", f"/api/topics/{topics[0]['id']}", headers=admin_h)
        await hit(cli, "GET", "/api/topics/my-interests", headers=admin_h)
        if topics:
            new_topic_id = next((t["id"] for t in topics if t["slug"] == "tarantino-90s"), topics[-1]["id"])
            await hit(cli, "POST", f"/api/topics/my-interests/{new_topic_id}", headers=admin_h)
            await hit(cli, "DELETE", f"/api/topics/my-interests/{new_topic_id}", headers=admin_h)
        # Reorder
        r = await hit(cli, "GET", "/api/topics/my-interests", headers=admin_h, label_path="/api/topics/my-interests (re-get)")
        if r and r.status_code == 200:
            ids = [t["id"] for t in r.json()]
            if ids:
                await hit(cli, "POST", "/api/topics/my-interests/reorder", headers=admin_h, json_body={"topic_ids": ids})

        # ─── SESSIONS ──────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/sessions/", headers=admin_h)
        r = await hit(cli, "POST", "/api/sessions/start", headers=admin_h, json_body={"topic_id": topics[0]["id"] if topics else None})
        if r and r.status_code == 200:
            session_id = r.json()["session_id"]
            await hit(cli, "GET", f"/api/sessions/{session_id}", headers=admin_h)
            await hit(cli, "POST", f"/api/sessions/{session_id}/end", headers=admin_h, json_body={"transcript": [{"who": "user", "text": "test"}]})
            # feedback-audio requiere report — esperamos 400 si todavía no se analizó
            await hit(cli, "GET", f"/api/sessions/{session_id}/feedback-audio", headers=admin_h, params={"which": "praise"}, expected=(400, 404, 200))

        # ─── ALUMNOS (admin) ───────────────────────────────────────────────
        r = await hit(cli, "GET", "/api/alumnos/", headers=admin_h)
        alumnos = r.json() if r and r.status_code == 200 else []
        if alumnos:
            await hit(cli, "GET", f"/api/alumnos/{alumnos[0]['id']}/errors", headers=admin_h)
        # Student no puede
        await hit(cli, "GET", "/api/alumnos/", headers=student_h, expected=(403,))

        # ─── DASHBOARD ─────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/dashboard/summary", headers=admin_h)
        await hit(cli, "GET", "/api/dashboard/summary", headers=student_h, expected=(403,))

        # ─── TTS ───────────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/tts/voices", headers=admin_h)
        # tts/sample devuelve audio/mpeg, no JSON
        r = await cli.post(
            "/api/tts/sample",
            headers=admin_h,
            params={"text": "Hola, test de smoke", "tutor": "coach"},
            timeout=30,
        )
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("audio"):
            log("OK", "POST", "/api/tts/sample?tutor=coach", 200, f"audio/mpeg {len(r.content)} bytes")
        else:
            log("FAIL", "POST", "/api/tts/sample?tutor=coach", r.status_code, r.text[:100])

        # ─── PUSH ──────────────────────────────────────────────────────────
        await hit(cli, "GET", "/api/push/vapid-public-key", headers=admin_h)

        # ─── VOICE WS (sin payload, solo verificamos que el endpoint existe) ──
        # Lo probamos en smoke_test.py por separado con WS real.
        print(f"\n{DIM}/api/voice/ws — testeado en smoke_test.py (requiere WebSocket){RESET}")

    # ─── RESUMEN ───────────────────────────────────────────────────────────
    ok = sum(1 for r in results if r["status"] == "OK")
    fail = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)
    print(f"\n=== RESUMEN: {ok}/{total} OK · {fail} FAIL ===\n")
    if fail:
        print(f"{RED}Endpoints rotos:{RESET}")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  {r['method']:>6} {r['path']:<55} HTTP {r['code']} · {r['detail'][:120]}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
