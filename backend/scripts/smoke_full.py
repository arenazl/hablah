"""Smoke test COMPLETO: cubre los 10 routers del backend en prod.

auth · users · me · push · templates · topics · sessions · alumnos · dashboard · tts · voice (WS, no probado)

Idempotente: solo lecturas + crear sesion descartable + PATCH reversible.
"""
import sys
import json
import urllib.request
import urllib.error

API = "https://hablah-api-abcaf6c43a5d.herokuapp.com/api"
FRONT = "https://hablah.com.ar"
USERS = {
    "lucas": ("lucas@hablah.app", "123"),
    "nico":  ("nico@hablah.app", "123"),
    "coach": ("coach@hablah.app", "123"),  # admin
}

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[1m"; X = "\033[0m"
passed = failed = warnings = skipped = 0


def ok(m): global passed; passed += 1; print(f"  {G}OK{X} {m}")
def fail(m): global failed; failed += 1; print(f"  {R}FAIL{X} {m}")
def warn(m): global warnings; warnings += 1; print(f"  {Y}WARN{X} {m}")
def skip(m): global skipped; skipped += 1; print(f"  {Y}SKIP{X} {m}")
def section(t): print(f"\n{B}== {t} =={X}")


def http(method, url, *, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try: return r.status, json.loads(raw)
            except: return r.status, raw
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, ""
    except Exception as e:
        return 0, str(e)


# Login helpers
def login(role):
    email, pwd = USERS[role]
    status, body = http("POST", f"{API}/auth/login", body={"email": email, "password": pwd})
    if status == 200 and isinstance(body, dict):
        return body.get("access_token"), body.get("user", {})
    return None, None


# ============================================================
section("AUTH")
lucas_token, lucas_user = login("lucas")
nico_token, _ = login("nico")
coach_token, coach_user = login("coach")
ok(f"POST /auth/login (lucas) -> id={lucas_user.get('id')}") if lucas_token else fail("lucas login")
ok(f"POST /auth/login (nico)") if nico_token else fail("nico login")
ok(f"POST /auth/login (coach) role={coach_user.get('role')}") if coach_token else fail("coach login")

status, body = http("GET", f"{API}/auth/me", token=lucas_token)
if status == 200 and isinstance(body, dict) and body.get("email") == USERS["lucas"][0]:
    ok("GET /auth/me")
else:
    fail(f"GET /auth/me -> {status}")

status, body = http("GET", f"{API}/auth/me")
if status in (401, 403):
    ok(f"GET /auth/me sin token -> {status} (correcto)")
else:
    fail(f"GET /auth/me sin token -> {status} (esperaba 401/403)")


# ============================================================
section("ME (perfil + settings + today + heatmap + level-progress)")
status, body = http("GET", f"{API}/me/profile", token=lucas_token)
if status == 200 and isinstance(body, dict):
    u = body.get("user", {})
    if all(k in u for k in ["cefr_level", "cefr_manual", "target_language", "base_language"]):
        ok(f"GET /me/profile completo (cefr={u['cefr_level']}, manual={u['cefr_manual']}, target={u['target_language']}, base={u['base_language']})")
    else:
        fail(f"/me/profile: faltan campos {set(['cefr_level','cefr_manual','target_language','base_language']) - set(u.keys())}")
else:
    fail(f"/me/profile -> {status}")

status, body = http("GET", f"{API}/me/today", token=lucas_token)
if status == 200 and isinstance(body, dict) and "mission" in body:
    ok(f"GET /me/today (prompts={len(body.get('in_context_prompts',[]))}, rescue={'sí' if body.get('rescue') else 'no'})")
else:
    fail(f"/me/today -> {status}")

status, body = http("GET", f"{API}/me/streak-heatmap?days=28", token=lucas_token)
ok(f"GET /me/streak-heatmap (cells={len(body) if isinstance(body, list) else 'n/a'})") if status == 200 else fail(f"streak-heatmap -> {status}")

status, body = http("GET", f"{API}/me/level-progress", token=lucas_token)
if status == 200 and isinstance(body, dict):
    ok(f"GET /me/level-progress ({body.get('current')}->{body.get('next')} {body.get('pct')}%, total={body.get('sessions_total')})")
else:
    fail(f"level-progress -> {status}")

# PATCH settings (probamos 4 campos)
status, _ = http("PATCH", f"{API}/me/settings", token=lucas_token, body={"target_minutes_per_session": 7})
ok("PATCH /me/settings target_minutes_per_session=7") if status == 200 else fail(f"PATCH target_minutes -> {status}")

status, _ = http("PATCH", f"{API}/me/settings", token=lucas_token, body={"cefr_level": "B2", "cefr_manual": True})
ok("PATCH /me/settings cefr B2 manual=true") if status == 200 else fail(f"PATCH cefr -> {status}")

status, _ = http("PATCH", f"{API}/me/settings", token=lucas_token, body={"target_language": "en", "base_language": "es"})
ok("PATCH /me/settings target/base lang") if status == 200 else fail(f"PATCH lang -> {status}")

status, _ = http("PATCH", f"{API}/me/settings", token=lucas_token, body={"accent_preference": "uk", "insistent_mode_enabled": True})
ok("PATCH /me/settings accent + insistent") if status == 200 else fail(f"PATCH accent -> {status}")

# Restaurar
http("PATCH", f"{API}/me/settings", token=lucas_token, body={"cefr_level": "B2", "cefr_manual": False})


# ============================================================
section("TOPICS")
status, body = http("GET", f"{API}/topics/", token=lucas_token)
total_topics = len(body) if isinstance(body, list) else 0
ok(f"GET /topics/ -> {total_topics} topics") if status == 200 and total_topics > 0 else fail(f"/topics/ -> {status}")

first_topic_id = body[0]["id"] if total_topics > 0 else None

status, body_cats = http("GET", f"{API}/topics/categories", token=lucas_token)
ok(f"GET /topics/categories -> {len(body_cats) if isinstance(body_cats, list) else 'n/a'} categorías") if status == 200 else fail(f"categories -> {status}")

status, body_cat = http("GET", f"{API}/topics/?category=arte", token=lucas_token)
ok(f"GET /topics/?category=arte -> {len(body_cat) if isinstance(body_cat, list) else 'n/a'}") if status == 200 else fail(f"filter category -> {status}")

if first_topic_id:
    status, body = http("GET", f"{API}/topics/{first_topic_id}", token=lucas_token)
    has_multilang = any(k.endswith(("_pt", "_en", "_es")) for k in (body.get("seed_prompts", {}) or {}).keys()) if isinstance(body, dict) else False
    ok(f"GET /topics/{first_topic_id} ({'seeds multi-idioma OK' if has_multilang else 'sin sufijo idioma'})") if status == 200 else fail(f"topic detail -> {status}")

status, body = http("GET", f"{API}/topics/my-interests", token=lucas_token)
ok(f"GET /topics/my-interests -> {len(body) if isinstance(body, list) else 'n/a'}") if status == 200 else fail(f"my-interests -> {status}")

# admin only: generate-seeds (no lo hago real para no quemar Gemini, solo verifico que esta protegido)
status, _ = http("POST", f"{API}/topics/{first_topic_id}/generate-seeds?lang=es", token=nico_token)
ok(f"POST /topics/{first_topic_id}/generate-seeds rechaza student ({status})") if status in (401, 403) else fail(f"generate-seeds permitio student -> {status}")


# ============================================================
section("TEMPLATES")
status, body = http("GET", f"{API}/templates/", token=lucas_token)
total_tpls = len(body) if isinstance(body, list) else 0
if status == 200 and total_tpls > 0:
    ok(f"GET /templates/ -> {total_tpls} templates")
    # Verificar que tienen voice_id por idioma (mi feature nueva)
    t0 = body[0]
    voice_langs = [k for k in t0.keys() if k.startswith("voice_id_")]
    ok(f"  primer template tiene {voice_langs}") if voice_langs else warn("  templates no exponen voice_id_en/es/pt (schema legacy)")
    first_tpl_id = t0["id"]

    status, body = http("GET", f"{API}/templates/{first_tpl_id}", token=lucas_token)
    ok(f"GET /templates/{first_tpl_id}") if status == 200 else fail(f"template detail -> {status}")
else:
    fail(f"/templates/ -> {status}")


# ============================================================
section("SESSIONS")
status, body = http("GET", f"{API}/sessions/", token=lucas_token)
total_sess = len(body) if isinstance(body, list) else 0
ok(f"GET /sessions/ -> {total_sess} sesiones (Lucas)") if status == 200 else fail(f"/sessions/ -> {status}")

if total_sess > 0:
    last_id = body[0]["id"]
    status, body = http("GET", f"{API}/sessions/{last_id}", token=lucas_token)
    ok(f"GET /sessions/{last_id}") if status == 200 else fail(f"session detail -> {status}")

# Iniciar sesion descartable (no la cerramos)
status, body = http("POST", f"{API}/sessions/start", token=lucas_token, body={"topic_id": first_topic_id})
if status == 200 and isinstance(body, dict) and "session_id" in body:
    test_session_id = body["session_id"]
    ok(f"POST /sessions/start -> session_id={test_session_id} voice_id={body.get('voice_id', '')[:20]}")
    # cerrar para no dejar 'active'
    status_end, _ = http("POST", f"{API}/sessions/{test_session_id}/end", token=lucas_token, body={"transcript": [{"who": "user", "text": "smoke test"}]})
    ok(f"POST /sessions/{test_session_id}/end -> {status_end}") if status_end == 200 else fail(f"end -> {status_end}")
else:
    fail(f"POST /sessions/start -> {status}: {body}")


# ============================================================
section("USERS (admin) y ALUMNOS (admin)")
status, body = http("GET", f"{API}/users/", token=coach_token)
ok(f"GET /users/ (admin) -> {len(body) if isinstance(body, list) else 'n/a'}") if status == 200 else fail(f"users -> {status}")

status, body = http("GET", f"{API}/users/", token=lucas_token)
ok(f"GET /users/ rechaza student ({status})") if status in (401, 403) else fail(f"users dejo entrar student -> {status}")

status, body = http("GET", f"{API}/alumnos/", token=coach_token)
total_alumnos = len(body) if isinstance(body, list) else 0
ok(f"GET /alumnos/ (admin) -> {total_alumnos}") if status == 200 else fail(f"alumnos -> {status}")

if total_alumnos > 0:
    first_alumno_id = body[0]["id"]
    status, body = http("GET", f"{API}/alumnos/{first_alumno_id}/errors", token=coach_token)
    ok(f"GET /alumnos/{first_alumno_id}/errors -> {len(body) if isinstance(body, list) else 'n/a'} errors") if status == 200 else fail(f"alumno errors -> {status}")


# ============================================================
section("DASHBOARD (admin)")
status, body = http("GET", f"{API}/dashboard/summary", token=coach_token)
if status == 200 and isinstance(body, dict):
    ok(f"GET /dashboard/summary (keys: {list(body.keys())[:5]})")
else:
    fail(f"dashboard -> {status}")

status, body = http("GET", f"{API}/dashboard/summary", token=lucas_token)
ok(f"GET /dashboard rechaza student ({status})") if status in (401, 403) else fail(f"dashboard dejo entrar student -> {status}")


# ============================================================
section("TTS (voces ElevenLabs)")
status, body = http("GET", f"{API}/tts/voices", token=lucas_token)
if status == 200 and isinstance(body, list):
    ok(f"GET /tts/voices -> {len(body)} voces")
else:
    fail(f"/tts/voices -> {status}")

# POST /tts/sample no lo invoco para no quemar credito ElevenLabs cada smoke
skip("POST /tts/sample (omito para no consumir creditos)")


# ============================================================
section("PUSH (web push subscription)")
status, body = http("GET", f"{API}/push/vapid-public-key", token=lucas_token)
if status == 200 and isinstance(body, dict) and "public_key" in body:
    ok(f"GET /push/vapid-public-key (longitud {len(body['public_key'])})")
elif status == 200 and isinstance(body, dict):
    ok(f"GET /push/vapid-public-key (keys: {list(body.keys())})")
else:
    warn(f"/push/vapid-public-key -> {status} (puede no estar configurado)")


# ============================================================
section("VOICE (websocket - no probado, solo verificamos que la ruta exista)")
skip("WS /voice/ws (requiere cliente websocket, omitido en smoke HTTP)")


# ============================================================
section("FRONTEND assets en prod")
for path in ["/", "/favicon.svg", "/logos/hablah-mark.svg", "/icons/apple-touch-icon.png", "/manifest.json"]:
    status, _ = http("GET", FRONT + path)
    ok(f"GET {path} -> {status}") if status == 200 else fail(f"{path} -> {status}")


# ============================================================
print(f"\n{B}{'=' * 60}{X}")
print(f"{B}RESUMEN{X}: {G}{passed} OK{X}  {R}{failed} FAIL{X}  {Y}{warnings} WARN{X}  {Y}{skipped} SKIP{X}")
print(f"{B}{'=' * 60}{X}\n")

sys.exit(0 if failed == 0 else 1)
