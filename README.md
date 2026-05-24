# Habláh

Plataforma de aprendizaje de idiomas conversacional con tutores de IA. App principal: https://hablah.com.ar

Stack: **FastAPI** (Python 3.12) + **aiomysql** (Aiven) en backend · **React 18 + Vite + Tailwind** en frontend · **Heroku** (back) + **Netlify** (front).

---

## ⚠️ DEPLOY — leer antes de tocar nada

**TL;DR — copy/paste para deploy completo (front + back):**

```powershell
# 1) commit + push a GitHub (solo guarda código, NO deploya nada)
git add -A; git commit -m "feat(...): ..."; git push origin main

# 2) deploy backend → Heroku
git push heroku main

# 3) deploy frontend → Netlify
cd frontend; npm run build; netlify deploy --prod --dir=dist
```

Total ~3-4 min. Después de esto, https://hablah.com.ar y https://hablah-api-abcaf6c43a5d.herokuapp.com tienen la versión nueva.

### Por qué hay que hacerlo a mano (estado actual)

| Plataforma | Auto-deploy desde GitHub | Cómo se deploya hoy |
|------------|--------------------------|---------------------|
| **Netlify** (`hablah-app`, front) | ❌ NO | `netlify deploy --prod --dir=dist` desde `frontend/` |
| **Heroku** (`hablah-api`, back) | ❌ NO | `git push heroku main` (remote ya configurado) |
| **GitHub Actions** | ❌ NO existen | No hay `.github/workflows/` — nada corre en CI |

**El `git push origin main` solo actualiza GitHub. NO dispara deploy en ningún lado.** Si solo pusheás a `origin`, los sitios siguen mostrando la versión vieja.

### Detalle por plataforma

#### Frontend — Netlify (manual via CLI)

```powershell
cd frontend
npm run build                            # vite build + prerender, ~10s
netlify deploy --prod --dir=dist         # upload + activate, ~60-90s
```

- Site ID: `f7daf480-dced-4ad5-89ab-bbb00024fd59` (proyecto `hablah-app`)
- Config en [netlify.toml](netlify.toml) de la raíz: `base=frontend`, `publish=dist`, `command=npm install && npm run build`, redirect `/api/*` → Heroku
- Login CLI: `netlify login` (ya logueado como `arenazl@gmail.com`)
- Status: `netlify status` desde la raíz del repo
- Ver deploy: `netlify api listSiteDeploys --data "{\"site_id\":\"f7daf480-dced-4ad5-89ab-bbb00024fd59\",\"per_page\":3}"`

#### Backend — Heroku (manual via git push)

```powershell
git push heroku main      # build + release, ~60-90s
```

- App: `hablah-api` (URL externa `hablah-api-abcaf6c43a5d.herokuapp.com`)
- Remote `heroku` ya configurado: `https://git.heroku.com/hablah-api.git`
- Login CLI: `heroku login` (ya logueado)
- Ver releases: `heroku releases -a hablah-api --num 5`
- Logs en vivo: `heroku logs --tail -a hablah-api`
- Config vars: `heroku config -a hablah-api`
- Restart manual: `heroku restart -a hablah-api`

### Opciones para automatizar (no implementadas — pendiente decidir)

Si en algún momento se quiere `git push origin main` → deploy automático en ambos:

1. **Netlify**: en https://app.netlify.com/projects/hablah-app/configuration/deploys → "Link site to Git" → repo `arenazl/hablah` → branch `main`. El `netlify.toml` ya está listo, no requiere cambios.
2. **Heroku**: en el dashboard del app → tab "Deploy" → "Deployment method: GitHub" → conectar repo → habilitar "Automatic deploys" en `main`.
3. **GitHub Actions** (alternativa unificada): crear `.github/workflows/deploy.yml` que dispare ambos deploys en cada push a `main`. Requiere guardar `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `HEROKU_API_KEY` y `HEROKU_APP_NAME` como secrets del repo.

Cualquiera de los 3 elimina el paso manual. Mientras no se decida, el flujo actual es el del TL;DR arriba.

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
