import { Mic, Loader2 } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoiceInput'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
  lang?: string
  className?: string
}

export function VoiceInputButton({ onTranscript, onError, lang = 'es-AR', className = '' }: VoiceInputButtonProps) {
  const { isListening, isSupported, toggle } = useVoiceInput({
    lang, continuous: false, interimResults: false, onTranscript, onError,
  })

  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? 'Escuchando...' : 'Hablar'}
      className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
        isListening
          ? 'bg-[var(--color-danger)] text-white animate-pulse'
          : 'bg-[var(--bg-card)] text-[var(--color-primary)] border border-[var(--border-color)] hover:bg-[var(--color-accent)]/20'
      } ${className}`}
    >
      {isListening ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
    </button>
  )
}
