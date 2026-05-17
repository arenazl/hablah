import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceInputOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
}

export function useVoiceInput({
  lang = 'es-AR',
  continuous = false,
  interimResults = false,
  onTranscript,
  onError,
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setIsSupported(false); return }
    setIsSupported(true)

    const rec = new SR()
    rec.lang = lang
    rec.continuous = continuous
    rec.interimResults = interimResults
    rec.maxAlternatives = 1

    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      if (transcript) onTranscript(transcript)
    }
    rec.onerror = (event: any) => {
      setIsListening(false)
      const map: Record<string, string> = {
        'no-speech': 'No se detecto voz.',
        'audio-capture': 'No se pudo acceder al microfono.',
        'not-allowed': 'Permiso de microfono denegado.',
        'network': 'Error de red.',
      }
      onError?.(map[event.error] || 'Error de reconocimiento de voz')
    }

    recognitionRef.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [lang, continuous, interimResults, onTranscript, onError])

  const toggle = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return
    if (isListening) recognitionRef.current.stop()
    else {
      try { recognitionRef.current.start() }
      catch { onError?.('No se pudo iniciar el microfono') }
    }
  }, [isListening, isSupported, onError])

  return { isListening, isSupported, toggle }
}
