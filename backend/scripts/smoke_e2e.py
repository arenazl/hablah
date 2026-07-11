"""Smoke test E2E contra produccion: hablah.com.ar + hablah-api Heroku.

Verifica:
1. Frontend sirve y tiene el bundle correcto
2. Backend health
3. Login con los 3 quick-users (Lucas/Nico/Coach)
4. /me/profile devuelve campos nuevos (cefr_manual, base_language)
5. /me/today funciona
6. /me/streak-heatmap, /me/level-progress
7. /me/settings acepta cefr_level, target_language, base_language
8. /topics/{id}/generate-seeds (admin only) — skip si no hay key Gemini
9. CORS desde hablah.com.ar OK
"""
import sys
import json
import urllib.request
import urllib.error

API = "https://hablah-api-685973917497.us-east4.run.app/api"
FRONT = "https://hablah.com.ar"
USERS = [
    ("lucas@hablah.app", "123", "student"),
    ("nico@hablah.app", "123", "student"),
    ("coach@hablah.app", "123", "admin"),
]

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RST = "\033[0m"

passed = 0
failed = 0
warnings = 0


def ok(msg: str) -> None:
    global passed
    passed += 1
    print(f"  {GREEN}OK{RST} {msg}")


def fail(msg: str) -> None:
    global failed
    failed += 1
    print(f"  {RED}FAIL{RST} {msg}")


def warn(msg: str) -> None:
    global warnings
    warnings += 1
    print(f"  {YELLOW}WARN{RST} {msg}")


def section(title: str) -> None:
    print(f"\n{BOLD}== {title} =={RST}")


def http(method: str, url: str, *, token: str | None = None, body: dict | None = None, origin: str | None = None) -> tuple[int, dict | str, dict]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if origin:
        headers["Origin"] = origin
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
            resp_headers = dict(r.headers)
            try:
                return r.status, json.loads(raw), resp_headers
            except Exception:
                return r.status, raw, resp_headers
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read()), dict(e.headers)
        except Exception:
            return e.code, "", dict(e.headers) if hasattr(e, "headers") else {}
    except Exception as e:
        return 0, str(e), {}


# ============================================================

section("1. Frontend prod (hablah.com.ar)")
status, body, _ = http("GET", FRONT + "/")
if status == 200 and "<!doctype html" in str(body).lower():
    ok(f"GET {FRONT}/ -> 200 HTML")
else:
    fail(f"GET {FRONT}/ -> {status}")

# Bundle hash
import re
m = re.search(r"index-([a-zA-Z0-9_]+)\.js", str(body))
if m:
    ok(f"bundle: index-{m.group(1)}.js")
else:
    warn("no encontre bundle index-*.js en el HTML")

# Favicon
status, _, _ = http("GET", FRONT + "/favicon.svg")
if status == 200:
    ok("favicon.svg sirve")
else:
    fail(f"favicon.svg -> {status}")

# Logo SVG
status, _, _ = http("GET", FRONT + "/logos/hablah-mark.svg")
if status == 200:
    ok("logos/hablah-mark.svg sirve")
else:
    fail(f"logos/hablah-mark.svg -> {status}")

# Apple touch icon (rebrand)
status, _, _ = http("GET", FRONT + "/icons/apple-touch-icon.png")
if status == 200:
    ok("apple-touch-icon.png sirve")
else:
    fail(f"apple-touch-icon.png -> {status}")


section("2. CORS preflight desde hablah.com.ar")
req = urllib.request.Request(
    f"{API}/auth/login",
    method="OPTIONS",
    headers={
        "Origin": FRONT,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    },
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        aco = r.headers.get("Access-Control-Allow-Origin", "")
        if aco == FRONT:
            ok(f"Access-Control-Allow-Origin == {FRONT}")
        else:
            fail(f"Access-Control-Allow-Origin == '{aco}' (esperaba {FRONT})")
except Exception as e:
    fail(f"preflight error: {e}")


section("3. Login de los 3 quick-users")
tokens = {}
for email, pwd, expected_role in USERS:
    status, body, _ = http("POST", f"{API}/auth/login", body={"email": email, "password": pwd})
    if status == 200 and isinstance(body, dict) and "access_token" in body:
        tokens[email] = body["access_token"]
        actual_role = body.get("user", {}).get("role")
        if actual_role == expected_role:
            ok(f"{email}: login OK, role={actual_role}")
        else:
            fail(f"{email}: role esperado {expected_role}, real {actual_role}")
    else:
        fail(f"{email}: login fallo (status={status})")


section("4. /me/profile (Lucas)")
token = tokens.get("lucas@hablah.app")
if token:
    status, body, _ = http("GET", f"{API}/me/profile", token=token)
    if status == 200 and isinstance(body, dict):
        u = body.get("user", {})
        for field in ("cefr_level", "cefr_manual", "target_language", "base_language"):
            if field in u:
                ok(f"user.{field} presente -> {u[field]}")
            else:
                fail(f"user.{field} AUSENTE")
        if body.get("active_template"):
            tpl = body["active_template"]
            if "rigor" in tpl:
                ok(f"active_template.rigor presente -> {tpl['rigor']}")
            else:
                fail("active_template.rigor AUSENTE")
    else:
        fail(f"/me/profile -> {status}")


section("5. /me/today")
if token:
    status, body, _ = http("GET", f"{API}/me/today", token=token)
    if status == 200 and isinstance(body, dict):
        if "mission" in body and "in_context_prompts" in body:
            ok(f"/me/today devuelve mission + {len(body.get('in_context_prompts', []))} prompts")
        else:
            fail(f"/me/today: schema raro -> {list(body.keys())}")
    else:
        fail(f"/me/today -> {status}")


section("6. /me/streak-heatmap y /me/level-progress")
if token:
    status, body, _ = http("GET", f"{API}/me/streak-heatmap?days=28", token=token)
    if status == 200 and isinstance(body, list) and len(body) == 28:
        ok(f"streak-heatmap -> {len(body)} celdas")
    else:
        fail(f"streak-heatmap -> status={status} type={type(body).__name__} len={len(body) if isinstance(body, list) else 'n/a'}")

    status, body, _ = http("GET", f"{API}/me/level-progress", token=token)
    if status == 200 and isinstance(body, dict) and "pct" in body:
        ok(f"level-progress -> current={body.get('current')}, next={body.get('next')}, pct={body.get('pct')}")
    else:
        fail(f"level-progress -> {status}")


section("7. /me/settings acepta cefr/target/base (Lucas)")
if token:
    # cefr_level + cefr_manual
    status, body, _ = http("PATCH", f"{API}/me/settings", token=token, body={"cefr_level": "B1", "cefr_manual": True})
    if status == 200:
        ok("PATCH cefr_level=B1, cefr_manual=true OK")
    else:
        fail(f"PATCH cefr -> {status}: {body}")

    # target/base language
    status, body, _ = http("PATCH", f"{API}/me/settings", token=token, body={"target_language": "en", "base_language": "es"})
    if status == 200:
        ok("PATCH target_language + base_language OK")
    else:
        fail(f"PATCH languages -> {status}: {body}")


section("8. /topics list y /topics/{id}/generate-seeds (admin)")
admin_token = tokens.get("coach@hablah.app")
if admin_token:
    status, body, _ = http("GET", f"{API}/topics/?q=", token=admin_token)
    if status == 200 and isinstance(body, list) and body:
        topic_id = body[0]["id"]
        ok(f"/topics -> {len(body)} topics, primero id={topic_id}")

        # generate-seeds (real Gemini call — opcional, puede tardar)
        print(f"  {YELLOW}...{RST} generando seeds AI para topic {topic_id} (puede tardar 10-30s)...")
        status, body, _ = http("POST", f"{API}/topics/{topic_id}/generate-seeds?lang=es", token=admin_token)
        if status == 200 and isinstance(body, dict) and "seed_prompts" in body:
            sps = body.get("seed_prompts", {})
            kws = body.get("keywords", [])
            ok(f"generate-seeds devuelve {len(sps)} niveles CEFR + {len(kws)} keywords")
        elif status == 500:
            warn(f"generate-seeds: 500 (probable que falte GEMINI_API_KEY o limite) -> {body}")
        else:
            fail(f"generate-seeds -> {status}: {body}")
    else:
        fail(f"/topics -> {status}")


section("9. Quick-login alumno (Nico) -> /me/profile")
nico = tokens.get("nico@hablah.app")
if nico:
    status, body, _ = http("GET", f"{API}/me/profile", token=nico)
    if status == 200:
        u = body.get("user", {})
        ok(f"Nico cefr={u.get('cefr_level')}, plan={u.get('plan')}, manual={u.get('cefr_manual')}")
    else:
        fail(f"Nico /me/profile -> {status}")


# ============================================================
print(f"\n{BOLD}{'=' * 60}{RST}")
print(f"{BOLD}RESUMEN{RST}: {GREEN}{passed} OK{RST}  {RED}{failed} FAIL{RST}  {YELLOW}{warnings} WARN{RST}")
print(f"{BOLD}{'=' * 60}{RST}\n")

sys.exit(0 if failed == 0 else 1)
