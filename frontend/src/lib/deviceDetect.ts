/**
 * Deteccion de iOS para la capa de audio (deuda tecnica #1, ver
 * docs/01-recuperacion-motor/02-deudas-tecnicas.md §1).
 *
 * En iOS (Safari/Chrome/PWA -- todos corren sobre WebKit) la web NO puede
 * elegir el microfono: lo rutea el sistema operativo (si hay AirPods
 * conectados, iOS los usa el solo). Un selector de `deviceId` ahi no tiene
 * ningun efecto, asi que lo ocultamos por completo en vez de mostrar un
 * control muerto que confunde.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ manda un userAgent de Mac de escritorio (decision de Apple
  // para que las webs no lo traten como "mobile"). Lo distinguimos de un Mac
  // real por soporte tactil: un Mac de verdad tiene maxTouchPoints = 0.
  const isIPadOS13Plus = /Macintosh/.test(ua)
    && typeof navigator.maxTouchPoints === 'number'
    && navigator.maxTouchPoints > 1
  return isClassicIOS || isIPadOS13Plus
}
