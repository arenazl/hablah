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
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const opts = (options && options.processorOptions) || {}
    this.target = opts.samples || 2048
    this.acc = new Int16Array(this.target)
    this.pos = 0
    this.rmsAcc = 0
    this.rmsCount = 0
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
        // Buffer lleno: enviar al main thread con transferable
        const out = new ArrayBuffer(this.target * 2)
        new Int16Array(out).set(this.acc)
        const rms = Math.sqrt(this.rmsAcc / Math.max(1, this.rmsCount))
        this.port.postMessage({ pcm: out, rms: rms }, [out])
        this.pos = 0
        this.rmsAcc = 0
        this.rmsCount = 0
      }
    }
    return true
  }
}

registerProcessor('mic-processor', MicProcessor)
