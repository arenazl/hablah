# Contexto y Directrices del Proyecto Habláh

Este archivo contiene el contexto del proyecto, reglas de arquitectura, convenciones de desarrollo y pautas específicas de IA para guiar al asistente en todas las sesiones de trabajo.

---

## 1. Resumen de la Aplicación
- **Nombre**: Habláh
- **Tipo**: Plataforma de aprendizaje de idiomas conversacional interactiva con tutores de IA.
- **Producción URL**: [hablah.com.ar](https://hablah.com.ar)
- **Stack Principal**:
  - **Backend**: FastAPI (Python 3.12) + `aiomysql` (Base de datos MySQL en Aiven).
  - **Frontend**: React 18 + Vite + Tailwind CSS + Axios.
  - **Servicios de IA**: Gemini Live (para la conversación en tiempo real) y REST.
  - **Servicios Auxiliares**: ElevenLabs (TTS), Brevo (SMTP), Cloudinary (Storage), Web Push (Notificaciones).

---

## 2. Infraestructura y Despliegue (CD)
- **Backend**: Desplegado en **Google Cloud Run (región `us-east4`)** bajo el proyecto `hablah-prod`.
  - **IMPORTANTE**: La configuración de despliegue en `structure/cloudbuild/cb-hablah-api.yaml` **debe** incluir los flags: `--min-instances=1 --max-instances=1 --no-cpu-throttling`. El estado de las salas de voz vive en la memoria del proceso, y desactivar el throttling de CPU evita que los watchdogs y mezcladores se congelen.
- **Frontend**: Alojado en **Netlify** (`hablah-app`). Configurado a través de `netlify.toml` en la raíz (hace redirect de `/api/*` al backend).
- **Flujo de Deploy**: Automatizado al hacer push a la rama `main` de GitHub. Un solo `git push origin main` actualiza tanto frontend como backend.
- **REGLA DE TRABAJO (Mandatoria):** Dado que el proyecto no se ejecuta localmente y depende 100% de despliegues en la nube, **todo trabajo/tarea completada por el agente debe terminar ejecutando un `git push` al branch/ambiente correspondiente en el que esté posicionado el workspace actual** para desplegar los cambios automáticamente.

---

## 3. Convenciones Críticas de Código y Diseño
- **Sin Emojis**: No usar emojis en la UI, en commits ni en código fuente. Usar siempre iconos SVG (`lucide-react` o Heroicons).
- **Tailwind**: Respetar estrictamente la escala oficial de Tailwind (ej. `w-64`, `p-4`, `m-2`). Evitar a toda costa valores arbitrarios como `w-[250px]`.
- **App Shell**:
  - El contenedor principal de la pantalla debe ser: `h-screen flex flex-col overflow-hidden`.
  - El scroll debe ser interno con la clase: `flex-1 min-h-0 overflow-auto`.
- **Estilos y Colores**: Usar variables CSS para colores (ej. `var(--color-primary)`). Nunca usar códigos hexadecimales (`#ffffff`) literales en componentes.
- **Plantillas**: La plantilla predeterminada es `Layout.tsx`. El layout clásico (`LayoutClassic.tsx`) solo se usa bajo petición explícita del usuario.

---

## 4. Filosofía del Motor de Voz e IA (Gemini Live)
- **Modelo de Voz**: Se utiliza `models/gemini-3.1-flash-live-preview` (Gemini Live) para el rol de coach de voz.
- **Separación de Concernimientos**:
  - **CÓMO**: Determinado por la **EDAD** (Mini, Junior, Teen, Adulto).
  - **QUÉ**: Determinado por el **NIVEL** (A0, A1, A2, B1, B2, C1).
  - Evitar el crecimiento combinatorio. Mantener una regla clara por capa en la base de datos.
- **Validación**: Las pruebas de texto puro solo sirven para comprobar la sintaxis/estructura del prompt. La calidad final y comportamiento del motor **siempre se deben validar por voz** (VAD, tiempos de respuesta, cortes de audio, latencias).
- **Learner State e Historia**: Se inyecta un estado liviano del alumno en el prompt para evitar sobrecargar el contexto y mantener la atención del modelo en la conversación actual.

---

## 5. Comandos Locales Comunes
- **Iniciar Backend**:
  ```powershell
  cd backend
  python -m venv .venv; .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  python run.py
  ```
- **Iniciar Frontend**:
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```
- **Seeds de Base de Datos**:
  ```powershell
  cd backend
  python scripts/seed_quick_users.py
  python scripts/seed_kids.py
  python scripts/seed_joel.py
  ```
