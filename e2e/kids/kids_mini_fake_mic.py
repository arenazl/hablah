"""E2E kids Mini A0 con un NENE SIMULADO: Playwright + mic falso (WebAudio) que "habla" con los WAV de frases/.

Qué verifica: que no haya panel dev tapando el mic, que el FAB se pueda tocar, que la sesión arranque,
los turnos del coach (lo que dice, leído del subtítulo) y el cierre con Terminar. La pedagogía se lee
después en /admin/auditoria (prompt_final + transcript de la sesión que imprime al final).

Cómo correr (stack local; el motor lee el catálogo de la MISMA base y usa el MISMO modelo que prod):
  1. backend:  cd backend && .venv/Scripts/python.exe -c "import asyncio; asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy()); import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8201, loop='asyncio')"
  2. front:    cd frontend && VITE_API_URL=http://localhost:8201/api npx vite --port 5174 --strictPort
  3. test:     python e2e/kids/kids_mini_fake_mic.py 135          (135 = tópico "Mi familia"; KID_ID=66 timo)
Requiere Chrome instalado y `pip install playwright`. Los tokens se firman con el SECRET_KEY de backend/.env
(por eso corre contra el backend local y no contra Cloud Run). Las frases se generaron con ElevenLabs (es).
Salida: e2e/kids/out/ (capturas + log.txt). Nacido el 2026-10-09 para validar el fix "sin drill" de Mini A0.
"""
import base64, json, os, sys, time, re
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
BASE = os.environ.get("E2E_BASE", "http://localhost:5174")
TOPIC = int(sys.argv[1]) if len(sys.argv) > 1 else 135
KID_ID = os.environ.get("KID_ID", "66")

def _mint(sub: str) -> str:
    """Token firmado con el SECRET_KEY local (backend/.env), válido sólo contra el backend local."""
    sys.path.insert(0, os.path.join(ROOT, "backend"))
    for line in open(os.path.join(ROOT, "backend", ".env"), encoding="utf-8"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1); os.environ.setdefault(k, v)
    from datetime import timedelta
    from core.security import create_access_token
    return create_access_token({"sub": sub}, expires_delta=timedelta(hours=2))
tok_kid = _mint(KID_ID)
tok_adult = tok_kid
frases = []
for f in sorted(os.listdir(os.path.join(HERE, "frases"))):
    if f.endswith(".wav"):
        frases.append((f, base64.b64encode(open(os.path.join(HERE, "frases", f), "rb").read()).decode()))
log = []
def L(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"; print(line, flush=True); log.append(line)

INIT_JS = """
(() => {
  try {
    if (location.hostname.endsWith('hablah.com.ar') || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      localStorage.setItem('token', %s);
      localStorage.setItem('kids_token', %s);
    }
  } catch (e) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ sampleRate: 48000 });
  const dest = ctx.createMediaStreamDestination();
  // piso de ruido muy bajo, como un mic real (así el gate local no ve 'silencio digital')
  const nb = ctx.createBuffer(1, 48000 * 2, 48000); const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.0015;
  const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; ns.connect(dest); ns.start();
  window.__fakeMic = { ctx, dest, playing: false };
  const md = navigator.mediaDevices || {};
  if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true });
  md.getUserMedia = async () => { try { await ctx.resume(); } catch (e) {} return dest.stream; };
  md.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', label: 'fake mic', groupId: 'g' }];
  window.__say = async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const audio = await ctx.decodeAudioData(u8.buffer);
    const src = ctx.createBufferSource(); src.buffer = audio; src.connect(dest);
    window.__fakeMic.playing = true;
    return new Promise(res => { src.onended = () => { window.__fakeMic.playing = false; res(audio.duration); }; src.start(); });
  };
})();
""" % (json.dumps(tok_adult), json.dumps(tok_kid))

STATE_JS = """() => {
  const q = s => document.querySelector(s);
  const mic = q('[aria-label^="Tu turno"]') ? 'your-turn' : q('[aria-label="Habi está hablando"]') ? 'coach' : q('[aria-label="Te escucho"]') ? 'listening' : (q('.kids-start-fab') ? 'not-started' : 'unknown');
  return { mic, text: document.body.innerText, playing: !!(window.__fakeMic && window.__fakeMic.playing),
           hasPanel: /calibraci/i.test(document.body.innerText), fab: !!q('.kids-start-fab') };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        permissions=["microphone"], locale="es-AR")
    ctx.add_init_script(INIT_JS)
    page = ctx.new_page()
    errs = []
    page.on("console", lambda m: errs.append(f"{m.type}: {m.text[:200]}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errs.append(f"pageerror: {str(e)[:200]}"))
    page.on("requestfailed", lambda r: errs.append(f"REQFAIL {r.method} {r.url[:120]} {r.failure}"))
    page.on("response", lambda r: errs.append(f"HTTP {r.status} {r.request.method} {r.url[:120]}") if r.status >= 400 and "/api/" in r.url else None)
    page.goto(BASE + "/", wait_until="domcontentloaded"); time.sleep(1.5)  # fija localStorage en el origen
    page.goto(f"{BASE}/kids/sesion/{TOPIC}", wait_until="domcontentloaded")
    page.wait_for_selector(".kids-start-fab", timeout=30000)
    time.sleep(3)
    if page.get_by_text("Elegí tu amiguito").count() > 0:
        try: page.get_by_text("Perrito", exact=True).first.click(timeout=3000); L("eligió Perrito")
        except Exception as e: L(f"no pude elegir amiguito: {e}")
        time.sleep(1)
    st = page.evaluate(STATE_JS)
    L(f"pantalla inicial: fab={st['fab']} panel_calibracion={st['hasPanel']}")
    page.screenshot(path=os.path.join(OUT, "01_inicio.png"))
    page.click(".kids-start-fab", force=True); L("click Empezar (force: el FAB respira en loop)")
    t0 = time.time(); last_text = ""; last_change = time.time(); next_phrase = 0; last_say = 0; coach_turns = 0; shots = 2
    seen_lines = set()
    while time.time() - t0 < 200:
        time.sleep(0.5)
        st = page.evaluate(STATE_JS)
        txt = st["text"]
        if txt != last_text:
            # loguear líneas nuevas del subtítulo (lo que dice el coach o el nene)
            for ln in txt.splitlines():
                ln = ln.strip()
                if len(ln) > 12 and ln not in seen_lines and not ln.startswith(("DEV", "Offset")):
                    seen_lines.add(ln); L(f"UI: {ln[:220]}")
            last_text = txt; last_change = time.time()
        quiet = time.time() - last_change
        # el coach terminó (turno del nene o escuchando) y el texto está quieto -> el nene habla
        if st["mic"] in ("your-turn", "listening") and not st["playing"] and quiet > 2.5 and time.time() - last_say > 9 and next_phrase < len(frases):
            name, b64 = frases[next_phrase]; next_phrase += 1; last_say = time.time(); coach_turns += 1
            page.screenshot(path=os.path.join(OUT, f"{shots:02d}_turno{coach_turns}.png")); shots += 1
            dur = page.evaluate("b => window.__say(b)", b64); L(f"NENE dice {name} ({dur:.1f}s) con mic={st['mic']}")
        if next_phrase >= len(frases) and time.time() - last_say > 25:
            break
        if st["mic"] == "not-started" and time.time() - t0 > 25:
            L("la sesión no arrancó (sigue el FAB)"); break
    page.screenshot(path=os.path.join(OUT, f"{shots:02d}_final.png"))
    # Terminar
    try:
        page.get_by_role("button", name=re.compile("Terminar")).first.click(timeout=5000); L("click Terminar")
        time.sleep(2)
        for name in ("Sí", "Terminar", "Confirmar"):
            try: page.get_by_role("button", name=re.compile(name)).first.click(timeout=1500); L(f"confirmó '{name}'"); break
            except Exception: pass
        time.sleep(4)
        page.screenshot(path=os.path.join(OUT, f"{shots+1:02d}_despues_terminar.png"))
    except Exception as e:
        L(f"no pude Terminar: {e}")
    L(f"errores consola ({len(errs)}): " + " | ".join(errs[:6]))
    b.close()
open(os.path.join(OUT, "log.txt"), "w", encoding="utf-8").write("\n".join(log))
print("OK fin")
