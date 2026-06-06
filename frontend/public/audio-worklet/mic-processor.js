/**
 * AudioWorkletProcessor que captura audio del mic en thread separado.
 * Reemplaza el ScriptProcessorNode deprecado que corria en main thread y
 * causaba glitches cuando el thread principal estaba ocupado.
 *
 * Recibe cuantums de 128 samples (float32) cada ~8ms a 16kHz. Acumula
 * en buffer interno hasta tener 2048 samples (128ms a 16kHz). Cuando
 * llega ese tamaño, convierte a int16 LE y lo postMessage al main thread.
 *
 * Tradeoff de tamaño:
 * - Mas chico (ej 1024 = 64ms): mas reactivo, mas sends, mas overhead WS.
 * - Mas grande (ej 4096 = 256ms): menos sends, mas latencia perceptible.
 * 2048 = 128ms es buen balance.
 *
 * Configurable via processorOptions al instanciar el AudioWorkletNode:
 *   new AudioWorkletNode(ctx, 'mic-processor', {processorOptions: {samples: 2048}})
 */
/**
 * Configurable via processorOptions al instanciar el AudioWorkletNode:
 *   new AudioWorkletNode(ctx, 'mic-processor', {
 *     processorOptions: {
 *       samples: 2048,        // buffer size en samples
 *       vadEnabled: true,     // VAD on/off
 *       vadThreshold: 0.005,  // umbral RMS para silencio
 *       vadTailFrames: 2,     // frames "tail" tras voz
 *     }
 *   })
 *
 * Tambien soporta cambios runtime via port.postMessage({type:'config', ...}).
 */
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const opts = (options && options.processorOptions) || {}
    this.target = opts.samples || 2048
    this.vadEnabled = opts.vadEnabled !== false
    this.vadThreshold = opts.vadThreshold ?? 0.005
    this.vadTailFrames = opts.vadTailFrames ?? 2
    // tail dinamico: 1.5s reales segun sampleRate del AudioContext.
    // En mobile Safari sampleRate=48000, no 16000 - hardcodear 12 frames daba
    // 0.5s, insuficiente para silenceDurationMs del Live API.
    // sampleRate es global en AudioWorkletGlobalScope.
    this.tailFrames = Math.max(4, Math.ceil(1.5 * sampleRate / this.target))
    this.acc = new Int16Array(this.target)
    this.pos = 0
    this.rmsAcc = 0
    this.rmsCount = 0
    this.silentTail = 0
    this.lastWasVoice = false

    // Permitir reconfigurar en runtime
    this.port.onmessage = (ev) => {
      const d = ev.data
      if (!d || d.type !== 'config') return
      if (typeof d.vadEnabled === 'boolean') this.vadEnabled = d.vadEnabled
      if (typeof d.vadThreshold === 'number') this.vadThreshold = d.vadThreshold
      if (typeof d.vadTailFrames === 'number') this.vadTailFrames = d.vadTailFrames
    }
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (!input) return true

    for (let i = 0; i < input.length; i++) {
      let s = input[i]
      if (s > 1) s = 1
      else if (s < -1) s = -1
      this.acc[this.pos++] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767)
      this.rmsAcc += s * s
      this.rmsCount++

      if (this.pos >= this.target) {
        const rms = Math.sqrt(this.rmsAcc / Math.max(1, this.rmsCount))
        const isVoice = rms >= this.vadThreshold
        // Mandar PCM si: hay voz, O estamos en la cola post-voz (suficiente
        // silencio para que el VAD de Gemini Live cierre el turno, ~1.5s).
        // Despues parar de mandar - silencio continuo confunde al modelo.
        // this.tailFrames se calcula dinamico en el constructor segun sampleRate.
        let shouldSend = isVoice
        if (isVoice) {
          this.silentTail = 0
          this.lastWasVoice = true
        } else if (this.lastWasVoice && this.silentTail < this.tailFrames) {
          shouldSend = true
          this.silentTail++
          if (this.silentTail >= this.tailFrames) {
            this.lastWasVoice = false
          }
        }
        if (shouldSend) {
          const out = new ArrayBuffer(this.target * 2)
          new Int16Array(out).set(this.acc)
          this.port.postMessage({ pcm: out, rms: rms, silent: !isVoice }, [out])
        } else {
          this.port.postMessage({ rms: rms, silent: true })
        }
        this.pos = 0
        this.rmsAcc = 0
        this.rmsCount = 0
      }
    }
    return true
  }
}

registerProcessor('mic-processor', MicProcessor)
