# Deudas técnicas — Habláh

Registro de deudas/pendientes técnicos. Cada una: qué es, por qué importa, y la dirección de fix.
No bloquean el motor, pero hay que resolverlas para que la app sea sólida en producción.

---

## 1. Entrada de audio (micrófono) en la PWA — iOS / Android / tablet · [voz] · ALTA

**Síntoma esperado:** con AirPods/Bluetooth, el navegador puede no tomar el mic correcto; en tablet sin
auriculares puede haber eco (parlante ↔ mic).

**La verdad técnica:**
- **iOS (Safari/Chrome/PWA = WebKit):** la web **NO puede elegir** el micrófono. Usa el ruteo que decide
  el sistema operativo. Si hay AirPods conectados, iOS los usa (en modo llamada/HFP → mono, ~16k). Un
  selector de dispositivo `deviceId` se ignora en iOS.
- **Android / desktop:** sí se puede selector real (`navigator.mediaDevices.enumerateDevices()` +
  `getUserMedia({audio:{deviceId}})`).
- El problema de fondo NO es "cuál mic" sino: **eco**, **sample rate** (Gemini Live quiere 16 kHz; iOS
  captura a 48 kHz) y **cambios de ruta** mid-sesión (AirPods conecta/desconecta).

**Dirección de fix (robustez, no pelear con iOS):**
1. `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 16000 } })` — en iOS `sampleRate` es sólo una pista; igual aplicar.
2. **Resamplear a 16 kHz en el backend** (ya anotado: iOS llega a 48k → el coach queda mudo si no se resamplea).
3. **Android/desktop:** mostrar un **selector de mic** (enumerateDevices). En iOS, ocultarlo (no tiene efecto).
4. Mostrar en la UI **qué entrada está activa** + reintentar si cambia la ruta.
5. PWA standalone iOS: validar que `getUserMedia` funcione agregada a pantalla de inicio (históricamente
   tuvo bugs en modo standalone; si falla, fallback a abrir en Safari).

**Workaround para probar hoy:** conectar AirPods ANTES de abrir la página (iOS los toma solo), o probar
sin Bluetooth (mic del teléfono) / desde la compu, para descartar el ruteo.

---

## 2. `app_config` se carga vacío en el WS de voz de producción · [voz] · MEDIA

El voice real (`gemini_live`) carga `app_config` por ORM (`key/value`) pero la tabla es
`config_key/config_value` → queda `None` → se ignoran reglas de voz/seguridad (kid_safety, closing,
ASR tolerance, emojis a pantalla). El fix de SHA `ddfad78` se aplicó sólo a `ws_llm_test`, no a producción.
El motor único del test (`resolve_v2`) ya lee `config_key/config_value` bien.

**Fix:** unificar la lectura de `app_config` (raw `config_key/config_value`) en el path de producción.

---

## 3. Captura VAD/ASR: el coach corta al alumno · [voz] · ALTA (independiente del motor)

El VAD no capta monosílabos (<1s) → la frase-puente lo mitiga, pero el coach a veces corta al alumno y el
ASR transcribe a medias. **Hasta arreglar la captura, los scores de voz no son 100% confiables** (validar
por micrófono real, no sólo juez de texto). Banco `/llm` tiene controles para tunear.

---

## 4. ESLint no configurado en el frontend · [calidad] · BAJA

El repo no tiene `eslint.config.js` (ESLint 9). Hoy sólo corre `tsc --noEmit`. Falta instalar
`eslint-plugin-react-hooks` + config para atrapar errores de hooks que `tsc` no ve (regla dura del dueño).

---

## 5. v3 (motor_engine) sigue vivo en algunos paths · [arquitectura] · MEDIA

Decisión: motor único = v2 (compose_proto). `/finaltest` y el editor `/motor` todavía resuelven por v3
(`motor_engine.resolve`). Falta jubilar v3 de los paths vivos (o marcarlo "laboratorio dormido") para
quedarnos con un solo motor. La tabla `orchestration` (v3) se deja morir (no se persiste).
