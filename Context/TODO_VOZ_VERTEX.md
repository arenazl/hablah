# TODO — Voz: migrar a Vertex Half-Cascade

> Handoff del 2026-06-15 (madrugada). Para retomar **fresco**.
> Objetivo: que el coach **no se coma frases de audio** sin perder la comprensión del nene.

---

## El problema (ya diagnosticado, NO es bug nuestro)

El modelo actual `gemini-3.1-flash-live-preview` es **native-audio**: genera texto y audio
por separado y, cuando el texto saca ventaja, el servidor de Google mete un "tijerazo"
(flush de buffer) y **se fuma una frase de audio**. La transcripción llega perfecta, el
audio no. Es **limitación de Gemini en versión preview** — se resuelve solo cuando el
modelo salga de preview, o cambiando de enfoque (Vertex).

## Caminos YA descartados (no repetir, perdimos horas acá)

1. **Cascade casero (`VOICE_ENGINE=elevenlabs_pipeline`)**: FALLÓ feo. El STT (Whisper/Groq)
   **alucina** (inventaba palabras que el usuario no dijo) e inestable. Audio limpio sí,
   pero comprensión basura. Descartado.
2. **Gemini Live modo TEXT en ai_studio (`VOICE_ENGINE=gemini_text_eleven`)**: NO funciona.
   **Ningún modelo Live de ai_studio soporta `responseModalities=TEXT`** (cierran con error
   1007). Verificado listando los modelos: todos son native-audio. El único que acepta TEXT
   es `gemini-3.5-live-translate-preview`, pero es de **traducción** (no sirve de coach).

## La decisión: VERTEX half-cascade

En **Vertex AI** (no en ai_studio) está `gemini-live-2.5-flash` (half-cascade): **sí emite
TEXT** y **sigue mejor el prompt**. Combinado con un TTS (ElevenLabs WS o Google Cloud TTS)
da audio impecable + comprensión buena. Es **la única salida real** hoy.

---

## Pasos para retomar

### 1. [USUARIO] Crear Service Account en Google Cloud
- Proyecto GCP: **hablah-prod** (el mismo de la API key actual).
- Habilitar la **API de Vertex AI**.
- Crear un **Service Account** con rol `roles/aiplatform.user`.
- Sacar 3 datos de esa cuenta: `project_id`, `client_email`, `private_key`.

### 2. [CLAUDE] Adaptar el engine
- El engine base **ya está escrito**: `backend/services/voice_engines/gemini_text_eleven_engine.py`
  (toda la orquestación Gemini→TTS→cliente lista; reusa el resampler, NO toca el frontend).
- Cambiar la **conexión a Gemini**: de ai_studio (`?key=`) a **Vertex** (URL `aiplatform.googleapis.com`
  + **Bearer token del Service Account vía `google-auth`**).
  - OJO: el `_get_vertex_token()` viejo en `gemini_live_engine.py` asume el **metadata server
    de Cloud Run**, que en **Heroku NO existe**. Hay que generar el token desde el Service
    Account (las env vars), no del metadata server.
- Apuntar `GEMINI_TEXT_MODEL` al modelo half-cascade de Vertex.

### 3. Env vars en Heroku (`hablah-api`)
```
GOOGLE_PROJECT_ID=...
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...   (reparar saltos de línea: .replace('\\n', '\n'))
VOICE_PROVIDER=vertex
VOICE_ENGINE=gemini_text_eleven   (o el nombre del engine adaptado)
```

---

## Estado actual del sistema (al cerrar)

- **`VOICE_ENGINE` vacío** → corre **native-audio (`gemini_live`)** = "la gloriosa" que andaba.
- El engine `gemini_text_eleven` está **deployado pero apagado** (no rompe nada).
- El proto del doc sigue activo: **`PROTO_KIDS_A0=1`** (kids A0 = composer del doc, "la mejor clase lejos").
- Observabilidad viva: cada clase guarda `sessions.prompt_circuit` + `prompt_final`.

## Costos y riesgos
- **Costo**: facturación de GCP por uso (tarjeta), parecido a AI Studio.
- **Riesgo**: la auth de Vertex desde Heroku puede dar pelea (private key con `\n`, scopes).
  Es el típico lugar donde se pierde una tarde — encarar con tiempo, no apurado.
