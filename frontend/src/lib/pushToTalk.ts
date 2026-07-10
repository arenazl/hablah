/**
 * Preferencia de push-to-talk (F3-02), persistida en localStorage.
 *
 * El modo VAD (mantener la sesión mandando audio siempre, Gemini decide
 * cuándo empieza/termina de hablar el alumno) sigue siendo el DEFAULT en
 * todos lados. Push-to-talk es un toggle opt-in que solo tiene sentido -y
 * solo se muestra- en A0-A2: ahí es donde el VAD basado en amplitud falla
 * más seguido (respuestas de una palabra, "yes"/"no"/monosílabos <1s).
 */

const PUSH_TO_TALK_KEY = 'hablah_push_to_talk_v1'

export function loadPushToTalkPref(): boolean {
  try {
    return localStorage.getItem(PUSH_TO_TALK_KEY) === '1'
  } catch {
    return false
  }
}

export function savePushToTalkPref(enabled: boolean): void {
  try {
    localStorage.setItem(PUSH_TO_TALK_KEY, enabled ? '1' : '0')
  } catch {
    // ignore (quota exceeded, private mode, etc.)
  }
}

/** Niveles CEFR donde el fallback de push-to-talk tiene sentido mostrar. */
const LOW_LEVELS = new Set(['A0', 'A1', 'A2'])

export function isLowLevelForPushToTalk(level?: string | null): boolean {
  return !!level && LOW_LEVELS.has(level)
}
