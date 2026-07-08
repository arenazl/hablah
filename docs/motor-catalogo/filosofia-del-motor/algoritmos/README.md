# Algoritmos (código real del motor, incluido para ser autocontenible)

Copia congelada (snapshot 2026-07-08) del código que la filosofía describe, para que una IA externa
pueda evaluarlo/proponer mejoras SIN necesitar el repo. No se ejecuta desde acá; es referencia.

- **`composer_proto.py`** — el CORAZÓN: `compose_proto_prompt(...)` arma el prompt apilando los bloques
  (los 9 pasos) desde los presets de edad + nivel + tópico + historia. Acá se ve el orden, el fail-fast
  y qué bloque depende de qué pilar.
- **`gemini_live_engine.py`** — la INFRA de la conversación: abre el WebSocket a Gemini Live, arma el
  `setup` (modelo, voz), resamplea el audio a 16 kHz, calcula el RMS y maneja el VAD/turnos. Acá se ven
  las particularidades de §9/§10 (por qué el modelo interpreta y no obedece, monosílabos, corte de turno).

> Fuente en el repo: `backend/services/composer_proto.py` y
> `backend/services/voice_engines/gemini_live_engine.py`.
