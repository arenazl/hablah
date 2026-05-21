/* useLiveVoice — captura del mic + WebSocket bidireccional al backend Habláh.

   Flujo:
   1) start(sessionId) → abre WS, pide permiso de mic.
   2) Captura PCM 16kHz mono via AudioContext + ScriptProcessor (compat amplia).
   3) Manda chunks PCM en base64 → backend → Gemini Live.
   4) Recibe audio del tutor (base64 PCM 24kHz) → lo reproduce en orden.
   5) Recibe transcripción incremental (who: 'ai' | 'user') → callback.
   6) stop() cierra todo y devuelve la transcripción consolidada.
*/
import { useCallback, useEffect, useRef, useState } from 'react'

import { buildVoiceWsUrl } from '../services/api'

export interface TranscriptLine {
  who: 'ai' | 'user'
  text: string
}

export interface UseLiveVoiceOptions {
  onTranscript?: (line: TranscriptLine) => void
  onError?: (err: Error) => void
  onAudioLevel?: (level: number) => void
  /** Array de frecuencias 0..1 del audio del tutor (real-time FFT). Para waveform en vivo. */
  onAudioFrequencies?: (bins: Float32Array) => void
}

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended'

export function useLiveVoice(opts: UseLiveVoiceOptions = {}) {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])

  // Estabilizamos opts en un ref: el caller pasa literales nuevos cada render
  // pero los callbacks adentro del hook usan optsRef.current para no
  // invalidar dependencias y causar re-renders en loop (React error #310).
  const optsRef = useRef(opts)
  useEffect(() => { optsRef.current = opts })

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const procRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Cola de reproducción del audio del tutor (scheduling continuo sin gaps)
  const playCtxRef = useRef<AudioContext | null>(null)
  const playQueueRef = useRef<Float32Array[]>([])
  const playingRef = useRef(false)
  const nextStartTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const analyserRafRef = useRef<number | null>(null)

  const say = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'say', text }))
    }
  }, [])

  const stop = useCallback(() => {
    if (pingIntervalRef.current) {
      window.clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end' }))
        wsRef.current.close()
      }
    } catch {}
    wsRef.current = null

    if (procRef.current) {
      try { procRef.current.disconnect() } catch {}
      procRef.current = null
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch {}
      sourceRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (analyserRafRef.current) {
      cancelAnimationFrame(analyserRafRef.current)
      analyserRafRef.current = null
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect() } catch {}
      analyserRef.current = null
    }
    if (playCtxRef.current) {
      try { playCtxRef.current.close() } catch {}
      playCtxRef.current = null
    }
    playQueueRef.current = []
    playingRef.current = false
    setStatus('ended')
  }, [])

  useEffect(() => () => stop(), [stop])

  const playNextChunk = useCallback(() => {
    const ctx = playCtxRef.current
    if (!ctx) return
    // Schedule TODOS los chunks pendientes ahora con tiempos exactos para evitar gaps
    while (playQueueRef.current.length > 0) {
      const chunk = playQueueRef.current.shift()!
      const buf = ctx.createBuffer(1, chunk.length, 24000)
      buf.getChannelData(0).set(chunk)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      const analyser = analyserRef.current
      if (analyser) src.connect(analyser)
      // Si el proximo start es pasado o muy cercano, agendamos en currentTime + 50ms safety
      const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.02)
      src.start(startAt)
      nextStartTimeRef.current = startAt + buf.duration
    }
  }, [])

  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) return
    const ctx = playCtxRef.current
    if (!ctx) return
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.3
    // NO conectar a destination - es solo un tap, no debe duplicar el audio
    analyserRef.current = analyser

    // Loop a ~30fps (no RAF a 60 que glitchea audio en mobile)
    const timeBuf = new Uint8Array(analyser.frequencyBinCount)
    const freqBuf = new Uint8Array(analyser.frequencyBinCount)
    const freqNorm = new Float32Array(analyser.frequencyBinCount)
    let lastTick = 0
    const FRAME_MS = 33  // ~30fps
    const tick = (now: number) => {
      if (!analyserRef.current) return
      analyserRafRef.current = requestAnimationFrame(tick)
      if (now - lastTick < FRAME_MS) return  // throttle
      lastTick = now

      // RMS para el aura
      analyserRef.current.getByteTimeDomainData(timeBuf)
      let sumSq = 0
      for (let i = 0; i < timeBuf.length; i++) {
        const v = (timeBuf[i] - 128) / 128
        sumSq += v * v
      }
      const rms = Math.sqrt(sumSq / timeBuf.length)
      optsRef.current.onAudioLevel?.(Math.min(1, rms * 3))

      // Espectro solo si hay listener Y si hay sonido (skip silencio para no quemar CPU)
      if (optsRef.current.onAudioFrequencies && rms > 0.005) {
        analyserRef.current.getByteFrequencyData(freqBuf)
        for (let i = 0; i < freqBuf.length; i++) freqNorm[i] = freqBuf[i] / 255
        optsRef.current.onAudioFrequencies(freqNorm)
      }
    }
    analyserRafRef.current = requestAnimationFrame(tick)
  }, [])

  const pushAudioFromTutor = useCallback(
    (b64: string) => {
      try {
        const bin = atob(b64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2))
        const float = new Float32Array(samples.length)
        for (let i = 0; i < samples.length; i++) float[i] = samples[i] / 32768
        playQueueRef.current.push(float)
        if (!playCtxRef.current) {
          playCtxRef.current = new AudioContext({ sampleRate: 24000 })
        }
        ensureAnalyser()
        playNextChunk()
      } catch (e) {
        // ignore
      }
    },
    [playNextChunk, ensureAnalyser],
  )

  const start = useCallback(
    async (sessionId: number) => {
      setStatus('connecting')
      setTranscript([])

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
        })
      } catch (e: any) {
        optsRef.current.onError?.(new Error('Permiso de micrófono denegado'))
        setStatus('error')
        return
      }
      streamRef.current = stream

      const url = buildVoiceWsUrl(sessionId)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('listening')
        // Keepalive ping cada 25s para evitar que Heroku/proxies maten el WS por idle
        if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: 'ping' })) } catch {}
          }
        }, 25000)
        const ctx = new AudioContext({ sampleRate: 16000 })
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        sourceRef.current = source
        // ScriptProcessor (compat amplia; AudioWorklet sería ideal en v2)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proc = (ctx as any).createScriptProcessor(4096, 1, 1) as ScriptProcessorNode
        procRef.current = proc
        proc.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const input = e.inputBuffer.getChannelData(0)
          // Float32 [-1,1] → PCM 16 LE
          const pcm = new Int16Array(input.length)
          let rms = 0
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]))
            pcm[i] = s < 0 ? s * 32768 : s * 32767
            rms += s * s
          }
          rms = Math.sqrt(rms / input.length)
          // Boost x4 para que matchee la escala del audio del tutor (que viene * 3)
          optsRef.current.onAudioLevel?.(Math.min(1, rms * 4))
          const bytes = new Uint8Array(pcm.buffer)
          let bin = ''
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
          const b64 = btoa(bin)
          ws.send(JSON.stringify({ type: 'audio', data: b64 }))
        }
        source.connect(proc)
        proc.connect(ctx.destination)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'audio') {
            setStatus('speaking')
            pushAudioFromTutor(msg.data)
          } else if (msg.type === 'transcript_chunk') {
            // El backend manda chunks (palabra-por-palabra). Acumulamos en el
            // ÚLTIMO mensaje del mismo 'who'; si el último es de otro hablante
            // o no hay ninguno, creamos uno nuevo.
            setTranscript((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.who === msg.who) {
                const updated = [...prev]
                updated[updated.length - 1] = { who: last.who, text: last.text + msg.text }
                return updated
              }
              return [...prev, { who: msg.who, text: msg.text }]
            })
          } else if (msg.type === 'transcript') {
            // Compatibilidad legacy: mensaje completo de una sola vez
            const line: TranscriptLine = { who: msg.who, text: msg.text }
            setTranscript((prev) => [...prev, line])
            optsRef.current.onTranscript?.(line)
          } else if (msg.type === 'turn_complete') {
            setStatus('listening')
            // Notificar al consumidor con el último mensaje consolidado del USER (si hay)
            setTranscript((prev) => {
              const lastUser = [...prev].reverse().find((l) => l.who === 'user')
              if (lastUser) optsRef.current.onTranscript?.(lastUser)
              return prev
            })
          } else if (msg.type === 'error') {
            optsRef.current.onError?.(new Error(msg.error || 'live error'))
            setStatus('error')
          }
        } catch {}
      }

      ws.onerror = () => {
        optsRef.current.onError?.(new Error('WebSocket error'))
        setStatus('error')
      }
      ws.onclose = () => {
        setStatus((prev) => (prev !== 'ended' ? 'ended' : prev))
      }
    },
    [pushAudioFromTutor],
  )

  const sendSystemUpdate = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'system_update', text }))
        return true
      } catch { return false }
    }
    return false
  }, [])

  return { start, stop, status, transcript, sendSystemUpdate, say }
}
