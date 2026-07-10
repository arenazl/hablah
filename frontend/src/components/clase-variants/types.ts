// Contrato común de las 3 variantes visuales de la pantalla de Clase (WO F4-05).
//
// Las 3 variantes son puramente presentacionales: reciben el estado de la voz ya
// derivado + los datos de la clase, y renderizan su aura. NO tocan useLiveVoice ni la
// sesión: eso vive en el contenedor (pages/lab/LabClase.tsx). Así se comparan sin
// duplicar la maquinaria de audio y, cuando el dueño elija una, se aplica a
// PracticarView real y las otras dos se borran sin arrastrar lógica.

/** Estado visible del aura. Derivado de LiveStatus en el contenedor. */
export type VariantState = 'escuchando' | 'pensando' | 'hablando'

export interface ClaseVariantProps {
  state: VariantState
  /** Título del tópico de la clase. */
  topicTitle: string
  /** Última frase dicha por el tutor (o el prompt inicial si aún no habló). */
  promptLine: string
  /** Etiqueta de estado en lenguaje humano ("Te estoy escuchando", etc.). */
  stateLabel: string
  /** Nivel de audio del tutor 0..1 en tiempo real — para intensificar el aura al hablar. */
  audioLevel: number
  /** Frecuencias 0..1 del audio del tutor (FFT). La variante waveform las usa por barra. */
  frequencies: Float32Array | null
  /** Salir de la clase. */
  onEnd: () => void
}
