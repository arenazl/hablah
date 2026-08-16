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

    // NOTA: removimos el flag coachSpeaking + threshold 0.04 que metimos en
    // la iteracion anterior. La cola rezagada post-turnComplete (spec oficial
    // Vertex Live) re-encendia el flag sin un nuevo turn_complete que lo
    // apagara -> flag pegado en true -> chicos con voz baja (rms<0.04) eran
    // filtrados -> Gemini nunca cerraba turno -> WS muere por idle (S499 Timi).
    // Echo cancellation del browser ya esta activo, alcanza.

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

        // SIEMPRE se manda el PCM. El VAD de acá decidía qué bloques valían la pena
        // y tiraba el resto — el 2026-08-16 medimos que descartaba el 40% (234
        // bloques generados, 140 enviados). El audio le llegaba a Gemini PICADO, con
        // huecos de 128ms en medio de las frases, y lo transcribía como "<noise>" o
        // como fonemas sueltos de otro idioma. La energía estaba bien (RMS 16021 de
        // 32767); lo que faltaba era continuidad.
        //
        // Un VAD que corta el medio de una frase no ahorra: rompe. El recorte de
        // silencio lo hace Gemini con automaticActivityDetection, que para eso está
        // configurado en el setup y ve el stream completo. El hook ya asumía esto
        // ("SIEMPRE mandar el PCM", useLiveVoice.ts) — el worklet no cumplía.
        //
        // `isVoice` sobrevive sólo como flag para el visualizador, y `lastWasVoice`
        // para no romper la config existente de tail.
        if (isVoice) {
          this.silentTail = 0
          this.lastWasVoice = true
        } else if (this.lastWasVoice && this.silentTail < this.tailFrames) {
          this.silentTail++
          if (this.silentTail >= this.tailFrames) {
            this.lastWasVoice = false
          }
        }
        const out = new ArrayBuffer(this.target * 2)
        new Int16Array(out).set(this.acc)
        this.port.postMessage({ pcm: out, rms: rms, silent: !isVoice }, [out])
        this.pos = 0
        this.rmsAcc = 0
        this.rmsCount = 0
      }
    }
    return true
  }
}

registerProcessor('mic-processor', MicProcessor)
