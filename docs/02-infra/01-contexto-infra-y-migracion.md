# Infraestructura de Habláh — contexto y migración Heroku → Cloud Run

> Para **Fable** (y para la app): esto separa **infra** de **motor**. La infra **NO** causó el
> robotismo del coach — eso es motor v3 / "muro del Flash" (ver el
> [handoff](../handoffs/2026-06-28_handoff-fable.md) §7-§8). Lo que la infra **sí** metía era
> **latencia en el loop de voz**. Se está migrando para bajarla. No toca ni una línea del motor ni
> del prompt: es puro transporte.
>
> Autor: Infra (`structure`). Fecha: 2026-07-08 (UTC-3).

---

## TL;DR

- El backend vive HOY en **Heroku US** → **271 ms** de RTT desde una IP argentina (medido, no estimado).
- Se migra a **Cloud Run `us-east4`** → **37 ms** desde la **misma** IP (medido). ~**230 ms menos por cada ida**.
- Mejora la **fluidez** de la charla (cuánto tarda el coach en arrancar, cortes), **no el contenido**
  pedagógico. Si el coach sigue robótico después de migrar, es motor, no infra.
- Decisión **forzada por el código**: el server corre a **1 instancia fija** (`min=max=1`) porque las
  "rooms" de voz viven en **memoria del proceso** (`gunicorn -w 1` + `rooms_registry`). Con autoscaling
  multi-instancia, dos participantes de una misma sala caen en instancias distintas y la sala se rompe.

---

## El hot-path real del audio (por qué la latencia pega acá)

Una sesión de voz NO es un request HTTP común: es audio en streaming, ida y vuelta, muchas veces por segundo.

```
[Micrófono del usuario — celular en Argentina]
      │  WebSocket de audio en vivo  (NO pasa por Netlify)
      ▼
[Backend / API]  ──WS──►  [Gemini Live de Google]  ──►  vuelve por el mismo camino
```

- **Netlify** (el front) solo entrega la **cáscara estática** (HTML/JS/CSS) una vez, al abrir. No
  interviene en el audio. Por eso su ubicación no afecta la fluidez de la charla.
- El tramo que define fluida-vs-laggy es **`usuario(IP argentina) ↔ backend`**, recorrido por CADA
  chunk de audio. Como los usuarios de hablah.com.ar son argentinos, ese tramo manda.
- La latencia **no es del server, es de la ruta** entre la IP del usuario y el server. Un usuario en
  EE.UU. no notaría los 271 ms de Heroku; uno argentino sí.

---

## Los números (medidos desde una IP argentina — TCP connect ≈ 1 RTT)

| Destino del audio | RTT real | Dónde / cómo |
|---|---:|---|
| **Heroku US** (backend HOY) | **271 ms** | Virginia, por **internet pública** |
| **Cloud Run us-east4** (destino) | **37 ms** | Virginia, por la **red de Google** |
| Gemini AI Studio | 42 ms | POP de Google local (AR/Brasil) |
| Vertex us-east4 | 41 ms | por red de Google |
| Vertex São Paulo | 38 ms | por red de Google |

**El hallazgo:** Heroku US y Cloud Run us-east4 están en la **misma** Virginia — misma distancia
geográfica — y aun así 271 ms vs 37 ms. La diferencia **no es distancia, es red**: desde Argentina, el
tráfico a Google entra a su backbone privada casi en Buenos Aires/São Paulo y vuela; el tráfico a
Heroku se arrastra por internet pública. Poner el backend detrás de la red de Google lo mete en la
misma banda de ~40 ms que todo lo demás de Google.

**Por qué us-east4 y no São Paulo** (la copia GCP vieja estaba en São Paulo): desde una IP argentina
ambos rinden casi igual hasta el backend (~37-38 ms, los dos por red de Google), pero el **segundo
salto backend → Gemini** (que procesa en US) le queda cerquísima a us-east4 y a ~110 ms a São Paulo.
us-east4 gana el hot-path completo.

---

## Qué es infra y qué NO (para no volver a confundirlas)

| Síntoma | ¿Infra o motor? | ¿Lo arregla migrar? |
|---|---|---|
| Coach robótico / genérico / no sigue al alumno | **Motor** (v3, Flash sub-ejecuta) | No |
| VAD corta al alumno / ASR poco confiable | **Motor** (turn-taking) | No |
| El coach tarda en arrancar a hablar tras el turno del alumno | En parte **infra** (271 ms × cada hop) | **Sí** |
| Cortes / sensación de lag en la charla | En parte **infra** | **Sí** |

En una charla en tiempo real cada turno cruza el tramo usuario↔backend varias veces. Bajar de 271 a
37 ms recorta lag perceptible; **no** cambia qué dice ni cómo lo dice el coach (eso es el prompt/motor).

---

## Cómo queda (plan de cutover — sin clientes productivos, cutover directo)

1. ✅ **git saneado**: se quitó el remote `heroku` legacy del repo local. Canónico = `github.com/arenazl/hablah`.
2. **Deploy a Cloud Run `us-east4`** (proyecto `hablah-prod`) con el código actual, **`min=max=1`**,
   env/secrets levantados del servicio existente.
3. **Front (Netlify)** → `VITE_API_URL` al nuevo backend + redeploy.
4. **Verificar E2E** una charla de voz real (micrófono).
5. **Apagar** Heroku `hablah-api` (–US$7/mes) y la copia vieja de São Paulo (`southamerica-east1`).
6. **CD**: trigger Cloud Build sobre `arenazl/hablah` → us-east4, como el resto del ecosistema.

**Estado (2026-07-08):** pasos 1-3 **hechos**. El backend nuevo corre en us-east4 (rev `00001-vrb`,
`/health` 200, RTT medido **12 ms** desde AR) y el front ya pushea a esa URL (commit `c50fd0c`, build de
Netlify en curso). Heroku **apagado** (scale 0) y **CD armado** (trigger `deploy-hablah-api`, build validación SUCCESS con
`min=max=1` + secrets intactos). **Falta:** (4) validar E2E por voz real, (5) borrar el servicio viejo
de São Paulo (no cobra). La copia GCP vieja
(`southamerica-east1`, deploy 2026-06-23, `VOICE_PROVIDER=vertex`) se descarta, no se actualiza.

> **Nota de honestidad (para Fable):** el servicio viejo de SP corría `VOICE_PROVIDER=vertex` (us-central1),
> pero el nuevo se deployó con `ai_studio` + `gemini-3.1-flash-live-preview` porque es lo que el código
> indica para prod (Heroku). Si al validar por voz el coach suena distinto a lo que esperabas, revisá ese
> toggle primero — es config de motor, no de infra.

---

## Decisiones técnicas del cutover (para que Fable las audite y proponga mejoras)

> Fable: cada decisión va con su **porqué**. Si ves una mejor, proponela. Ninguna toca el motor
> ni el prompt — todo es transporte/runtime.

### Obligatorias (las fuerza el código o el propio Cloud Run)

1. **1 instancia fija — `--min-instances=1 --max-instances=1`.** El estado de las salas de voz vive
   en **memoria del proceso** (`rooms_registry`, `RoomAudioPump._pumps`) sobre `gunicorn -w 1`.
   Multi-instancia parte ese estado: dos participantes de una sala caen en instancias distintas y el
   mixer no los ve. **Session affinity NO alcanza** (el mixer necesita TODOS los WS de la sala en el
   mismo proceso). *Palanca futura:* mover el estado de salas a Redis/pub-sub para poder escalar; hoy,
   sin volumen, no hace falta.
2. **CPU siempre asignada — `--no-cpu-throttling`.** La app corre tasks async **entre** mensajes del
   WS: el mixer (`RoomAudioPump._run`, tick cada 60 ms), y los watchdogs (`session_watchdog`,
   `coach_watchdog`, `renew_watchdog`). Con el default de Cloud Run (CPU solo **durante** un request)
   esos loops se congelan y el coach "se muere" en los silencios. Con CPU always-on el event loop sigue
   vivo. **Obligatorio en esta app** — es distinta a un CRUD normal.
3. **Timeout de request largo — `--timeout=3600`.** Las sesiones WS son largas; Cloud Run corta a 60
   min máx. El código ya **renueva la sesión de Gemini cada ~10 min** (límite de la Live API) sin cortar
   el WS del cliente. Compatible; solo hay que no dejar el timeout en el default corto.
4. **Concurrency I/O-bound — `--concurrency` ~80-250.** Las sesiones esperan a Gemini (I/O), no queman
   CPU; un worker async aguanta varias en paralelo en la misma instancia. El techo real lo pone
   CPU/memoria, no el número de concurrency.

### A decidir con criterio (NO copiar de otras apps a ciegas)

5. **Memoria: arranco en 512Mi, con 1Gi como palanca.** El episodio fuerte de RAM alta fue el **OOM de
   Fenix** (el parser: 43k filas de Payway → materializaba todo en memoria + un `sort()` que duplicaba
   el array → Cloud Run 512Mi reventaba → Infra lo subió a **2Gi**). El driver ahí era **bulk insert a
   la DB**; acá el driver es **audio en memoria** (buffers PCM del mixer + resampler + N conexiones WS),
   muy distinto. Con 1 instancia y poco tráfico, 512Mi debería sobrar. Se monitorea: si aparece OOM con
   salas de varios participantes, se sube (cambio de un flag). **No copio el 2Gi de Fenix por reflejo**
   — driver distinto, lo dejo medido.

   **Por qué las otras subieron RAM (para no copiar mal):**
   - *Fenix → 2Gi:* OOM por **bulk insert** (43k filas materializadas en memoria + `sort()` que duplica).
     Driver = procesamiento de datos.
   - *munify y eventmarker → 1Gi:* OOM de **arranque/baseline**. Corren `gunicorn -w2` (2 workers) y el
     código creció → `Memory limit of 512 MiB exceeded with 535 MiB used`, workers signal 6, 503. Driver
     = footprint del proceso al arrancar.
   - *hablah → 512Mi de base:* corre **`gunicorn -w1`** (un worker → ~mitad del footprint de baseline que
     munify), así que al arranque tiene **menos** presión que ellas. Su riesgo de RAM es **runtime** (audio
     en memoria: buffers del mixer + resampler × N sesiones), no baseline. Por eso 512Mi es razonable de
     base y 1Gi queda como palanca si el audio concurrente lo pide.
6. **Secrets vía Secret Manager (`--set-secrets`), no env plano.** Hoy en Heroku van como config vars.
   En Cloud Run conviene montarlos como secrets para no dejarlos en la definición del servicio. Higiene.
7. **QA separado (como munify): propuesto, no hecho.** Como Fable va a trabajar fuerte mañana, un
   ambiente QA evitaría romper "prod". Pero suma complejidad y hoy **no hay usuarios**. Queda propuesto;
   no lo armo salvo que se pida.

### Riesgo transversal conocido (deuda del ecosistema — vigilar post-migración)

8. **El CD con `--source` resetea la config custom.** Aprendido en el ecosistema: el deploy continuo
   (`gcloud run deploy --source` sin re-pasar flags) **pisa en cada push** la memoria, `min/max-instances`,
   `--no-cpu-throttling` y los `--set-secrets`. Para hablah esto es **grave**: perdería el `min=max=1` y
   el CPU-always → **el coach se muere en el próximo push**. Mitigación: fijar esos parámetros en el
   **trigger de Cloud Build / `service.yaml` declarativo**, no como flags one-off. **Éste es el punto que
   más quiero que Fable e Infra vigilen.**

### Mejoras cross-project que NO aplican (criterio: no aplicar por aplicar)

- **Tuning de pool de DB / bulk insert** (caso Fenix: unique_checks, READ COMMITTED, pool acotado,
  multi-row INSERT): hablah casi no pega a la DB en el hot-path (solo persiste el transcript al final).
  No aplica.
- **Fix viewport PWA / safe-area iPhone:** es **frontend**, no infra; verificar aparte, fuera de esta
  migración.
- **KSP y PWA auto-update:** hablah **ya los tiene**. Nada que hacer.

---

## Punteros

- Handoff del motor (contexto de app): [`../handoffs/2026-06-28_handoff-fable.md`](../handoffs/2026-06-28_handoff-fable.md)
- Motor de voz de producción: `backend/services/gemini_live.py` → `voice_engines/gemini_live_engine.py`
- Canal operativo Infra ↔ app: `d:\Code\base-compartida\hablah\ESTADO-INFRA.md`
- Mapa de infra del ecosistema: `d:\Code\structure\docs\infra\01-infra-map.md`
