# Deuda técnica — Push-to-talk (kids) ajustable por configuración

**Estado:** el push-to-talk (PTT / "tocá para hablar") está **implementado pero desactivado** en kids. Las clases kids corren en **VAD conversacional** (igual que la app adulta).

## Qué hay hecho (NO borrar — es una alternativa válida)
- Hook: `frontend/src/hooks/useLiveVoice.ts` → `setPushToTalk()`, `pttPress()`, `pttRelease()`, `shouldForwardAudio()` (este último gatea si el audio del alumno se envía al WS).
- UI: `frontend/src/components/PushToTalkControl.tsx` (botón "mantené apretado para hablar") + `frontend/src/lib/pushToTalk.ts` (preferencia en localStorage).

## Por qué se desactivó (2026-07-13)
En kids el PTT quedaba **encendido** (`setPushToTalk(isActive)` en `KidsSession.tsx`) pero a medio conectar:
1. `pttPress()` — el toque que abre el gate — **no estaba conectado a ningún botón**.
2. El único mecanismo que abría el gate (`pttRelease` → ventana de flush de 2200 ms) se disparaba cuando el coach **empezaba** a hablar, no cuando terminaba. El coach habla bastante más de 2200 ms, así que para cuando le tocaba al nene el gate ya estaba **cerrado** → `shouldForwardAudio()` = `false` → la voz del alumno **no se enviaba a Gemini** → el coach no respondía.

Diagnóstico confirmado con la Auditoría de clases: en las sesiones kids (Timi) el transcript no tenía **ningún** turno del alumno; en adulto (Lucas, VAD) sí.

**Fix aplicado:** kids corre en VAD conversacional (como la app adulta). Ver el efecto de push-to-talk en `KidsSession.tsx`.

## La deuda (prioridad BAJA)
Hacer el PTT **ajustable por configuración** en vez de hardcodeado, para poder reactivarlo si aparecen choques por infraestructura (ej. mics bluetooth que se comen las primeras palabras):
- Flag en `app_config` / settings (global o por segmento), ej. `kids_push_to_talk_enabled`.
- **ON:** `setPushToTalk(isActive)` + conectar `pttPress`/`pttRelease` a un botón grande (reusar `PushToTalkControl`).
- **OFF (default):** VAD, como ahora.

Solo abordar si el VAD da problemas reales de turn-taking en producción.
