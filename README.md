# Habláh

Plataforma de aprendizaje de idiomas conversacional con tutores de IA. App principal: https://hablah.com.ar

Stack: **FastAPI** (Python 3.12) + **aiomysql** (Aiven) en backend · **React 18 + Vite + Tailwind** en frontend · **Cloud Run us-east4** (back) + **Netlify** (front).

---

## ⚠️ DEPLOY — leer antes de tocar nada

- **Backend:** **Cloud Run `us-east4`** (proyecto `hablah-prod`) — migrado desde Heroku el 2026-07-08 (RTT desde AR 271→12 ms). URL: `https://hablah-api-685973917497.us-east4.run.app`. Contexto y decisiones: [docs/02-infra/01-contexto-infra-y-migracion.md](docs/02-infra/01-contexto-infra-y-migracion.md).
- **Frontend:** **Netlify** (`hablah-app`) — **auto-deploy en push a `main`** (build-on-push).

**TL;DR — un solo push deploya TODO:**

```powershell
git add -A; git commit -m "feat(...): ..."; git push origin main
```

`git push origin main` dispara **front (Netlify build-on-push) Y back (Cloud Build trigger `deploy-hablah-api` → Cloud Run us-east4)**. No hay pasos manuales.

> El CD del back usa `structure/cloudbuild/cb-hablah-api.yaml`, que lleva escritos los flags **OBLIGATORIOS** `--min-instances=1 --max-instances=1 --no-cpu-throttling` (+ secrets): el estado de las salas de voz vive en memoria del proceso (`gunicorn -w1`) y sin CPU-always los watchdogs/mixer se congelan. **No quitar esos flags del yaml** o el push rompería el coach. Detalle en el doc de infra.

### Estado por plataforma

| Plataforma | Deploy | Notas |
|------------|--------|-------|
| **Netlify** (`hablah-app`, front) | ✅ auto en push a `main` | Site ID `f7daf480-dced-4ad5-89ab-bbb00024fd59` |
| **Cloud Run** (`hablah-api`, back) | ✅ auto en push a `main` | trigger Cloud Build `deploy-hablah-api` (connection `gh-conn`, sa-east1) → deploya a `us-east4` / `hablah-prod` con los flags del yaml |
| ~~Heroku~~ | ❌ **apagado 2026-07-08** | migrado a Cloud Run; la app quedó en Heroku con 0 dynos (no cobra) |

### Detalle por plataforma

#### Frontend — Netlify (auto en push a `main`)

- Site ID: `f7daf480-dced-4ad5-89ab-bbb00024fd59` (proyecto `hablah-app`)
- Config en [netlify.toml](netlify.toml) de la raíz: `base=frontend`, `publish=dist`, redirect `/api/*` → backend Cloud Run.
- `VITE_API_URL` (en `frontend/.env.production`) → `https://hablah-api-685973917497.us-east4.run.app/api`.
- Ver deploy: `netlify api listSiteDeploys --data "{\"site_id\":\"f7daf480-dced-4ad5-89ab-bbb00024fd59\",\"per_page\":3}"`

#### Backend — Cloud Run us-east4 (auto en push a `main`)

- CD: trigger Cloud Build **`deploy-hablah-api`** (connection `gh-conn` en `southamerica-east1`) → en cada push a `main` corre `structure/cloudbuild/cb-hablah-api.yaml` que hace `gcloud run deploy --source backend` a `us-east4` con los flags obligatorios + secrets.
- Servicio: `hablah-api` / proyecto `hablah-prod` / región `us-east4`. URL `https://hablah-api-685973917497.us-east4.run.app`.
- Secrets: en **Secret Manager** de `hablah-prod` (los monta el yaml con `--set-secrets`).
- Logs: `gcloud run services logs read hablah-api --region us-east4 --project hablah-prod`.
- Deploy manual de emergencia (mismo comando que el yaml): `gcloud run deploy hablah-api --source backend/ --region us-east4 --project hablah-prod --min-instances=1 --max-instances=1 --no-cpu-throttling --timeout=3600 --memory=512Mi`.

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
| Hosting back | Cloud Run `us-east4` (`hablah-api` / `hablah-prod`) | `https://hablah-api-685973917497.us-east4.run.app` · redirect `/api/*` en `netlify.toml` |

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

netlify.toml         # build config + redirects → Cloud Run us-east4
```

---

## Conventions

- **NO emojis** en código/UI/commits — todo con iconos SVG (Lucide/Heroicons).
- Tailwind con escala oficial (`w-64`, `p-4`, etc.). Cero valores arbitrarios (`w-[250px]`, `h-[400px]`).
- App shell con `h-screen flex flex-col overflow-hidden`; scroll interno con `flex-1 min-h-0 overflow-auto`.
- CSS variables para colores (`var(--color-primary)`), nunca hex literales en componentes.
- Default template = **Estándar** (`Layout.tsx`). Classic (`LayoutClassic.tsx`) solo si se pide explícito.

Ver `d:\Code\APP_GUIDE\APP_GUIDE_MASTER.md` para detalle completo.
