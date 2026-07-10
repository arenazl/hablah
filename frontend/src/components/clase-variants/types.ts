// Contrato común de las 3 variantes visuales de la pantalla de Clase (WO F4-05).
//
// Las 3 variantes montan EL MISMO orbe real (AgentAudioVisualizerAura, el shader que ya
// existe y reacciona al audio) — lo único que cambia entre ellas es el VESTIDO: fondo,
// paleta, tipografía, layout y copy. Así se comparan direcciones visuales de verdad,
// con el orbe vivo reaccionando a la voz, no una maqueta estática.
import type { VisualizerStatus } from '../../hooks/agents-ui/use-agent-audio-visualizer-aura'

export type { VisualizerStatus }

/** Estado en lenguaje humano para el label/copy (derivado del status). */
export type VariantState = 'escuchando' | 'pensando' | 'hablando'

export interface ClaseVariantProps {
  /** Status crudo de la voz → alimenta el shader del orbe (reacciona en vivo). */
  status: VisualizerStatus
  /** Estado legible para el label de estado y el color del texto. */
  state: VariantState
  /** Tema activo → el orbe ajusta su paleta (dark/light). */
  themeMode: 'dark' | 'light'
  /** Título del tópico de la clase. */
  topicTitle: string
  /** Última frase dicha por el tutor (o el prompt inicial si aún no habló). */
  promptLine: string
  /** Etiqueta de estado en lenguaje humano ("Te estoy escuchando", etc.). */
  stateLabel: string
  /** Nivel de audio 0..1 en tiempo real — intensifica el orbe al hablar. */
  audioLevel: number
  /** Salir de la clase. */
  onEnd: () => void
}
