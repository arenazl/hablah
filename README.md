# Habláh

Plataforma de aprendizaje de idiomas conversacional con tutores de IA. App principal: https://hablah.com.ar

Stack: **FastAPI** (Python 3.12) + **aiomysql** (Aiven) en backend · **React 18 + Vite + Tailwind** en frontend · **Heroku** (back) + **Netlify** (front).

---

## ⚠️ DEPLOY — leer antes de tocar nada

**Netlify NO auto-deploya desde GitHub.** El repo no está linkeado al hosting. Push a `main` **no** dispara build. Cada cambio frontend hay que deployarlo manualmente con la CLI:

```powershell
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

Tarda ~2 min total (build ~10s, upload ~60s, propagación ~30s). El comando usa el `netlify.toml` de la raíz (que ya define `base=frontend`, `publish=dist`, etc.).

**Backend (Heroku)** sí auto-deploya desde `main` — solo `git push origin main` y Heroku rebuildea.

### Atajo: deploy completo (front + push)

Si tocaste front y back en el mismo cambio:

```powershell
git add -A; git commit -m "feat(...): ..."; git push origin main
cd frontend; npm run build; netlify deploy --prod --dir=dist
```

### Si querés que Netlify auto-deployee desde GitHub (recomendado)

1. https://app.netlify.com/projects/hablah-app/configuration/deploys
2. "Link site to Git" → conectar el repo `arenazl/hablah`
3. Branch: `main`, Build command y publish dir ya están en `netlify.toml`

Después de eso, `git push origin main` deploya solo y se puede borrar el paso manual de arriba.

---

## Stack & arquitectura

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 18 + Vite + Tailwind + axios + sonner + lucide | SPA con prerender en build |
| Backend | FastAPI + aiomysql + Pydantic | Async end-to-end |
| DB | MySQL en Aiven | Conexión en `backend/core/database.py` |
| Auth | JWT (HS256) | `backend/core/security.py` |
| IA | Gemini (Live + REST) | `backend/services/gemini*.py` |
| TTS | ElevenLabs | `backend/services/elevenlabs.py` |
| Email | Brevo SMTP | `backend/services/email.py` |
| Storage | Cloudinary | `backend/services/cloudinary_service.py` |
| Push | Web Push (VAPID) | `backend/services/push_notif.py` |
| Hosting front | Netlify (`hablah-app`) | Site ID: `f7daf480-dced-4ad5-89ab-bbb00024fd59` |
| Hosting back | Heroku (`hablah-api-abcaf6c43a5d`) | Redirect `/api/*` configurado en `netlify.toml` |

Credenciales: `d:\Code\APP_GUIDE\.env.master` (NO commitear). Guía maestra del stack: `d:\Code\APP_GUIDE\APP_GUIDE_MASTER.md`.

---

## Comandos comunes

### Backend local

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py            # arranca en http://localhost:8000
```

### Frontend local

```powershell
cd frontend
npm install
npm run dev              # http://localhost:5173 con proxy a back
```

### Seeds de DB

```powershell
cd backend
python scripts/seed_quick_users.py
python scripts/seed_kids.py
python scripts/seed_joel.py
```

### Crear usuario rápido (one-shot inline)

Patrón usado en sesiones cuando se necesita un user ad-hoc — ver `backend/scripts/seed_joel.py` como template.

---

## Estructura

```
backend/
  api/              # FastAPI routers (auth, kids, sessions, voice, ...)
  core/             # config, database, security
  models/           # SQLAlchemy ORM (user, template, kids)
  schemas/          # Pydantic
  scripts/          # seeds, migrations, smoke tests
  services/         # gemini, elevenlabs, email, cloudinary, super_prompt, ...
  main.py           # entry FastAPI
  run.py            # bootstrap local

frontend/
  src/
    components/     # Layout, Layout shells, BottomNav, PracticarGalaxy, ...
    pages/          # WebApp, kids/, login/, onboarding/, ...
    contexts/       # AuthContext, ...
  public/           # static assets
  netlify.toml      # (la fuente de verdad está en /netlify.toml de la raíz)

netlify.toml         # build config + redirects → Heroku
```

---

## Conventions

- **NO emojis** en código/UI/commits — todo con iconos SVG (Lucide/Heroicons).
- Tailwind con escala oficial (`w-64`, `p-4`, etc.). Cero valores arbitrarios (`w-[250px]`, `h-[400px]`).
- App shell con `h-screen flex flex-col overflow-hidden`; scroll interno con `flex-1 min-h-0 overflow-auto`.
- CSS variables para colores (`var(--color-primary)`), nunca hex literales en componentes.
- Default template = **Estándar** (`Layout.tsx`). Classic (`LayoutClassic.tsx`) solo si se pide explícito.

Ver `d:\Code\APP_GUIDE\APP_GUIDE_MASTER.md` para detalle completo.
