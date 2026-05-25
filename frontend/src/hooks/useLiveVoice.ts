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

export interface PreferenceChanges {
  correction_mode?: string
  response_length?: string
  warmth_level?: number
}

export interface UseLiveVoiceOptions {
  onTranscript?: (line: TranscriptLine) => void
  onError?: (err: Error) => void
  onAudioLevel?: (level: number) => void
  /** Array de frecuencias 0..1 del audio del tutor (real-time FFT). Para waveform en vivo. */
  onAudioFrequencies?: (bins: Float32Array) => void
  /** Llamado cuando el detector detecta y persiste una preferencia del alumno. */
  onPreferenceApplied?: (changes: PreferenceChanges, confirmation: string) => void
  /** La sesión Gemini está cerca del límite de duración (~90s). */
  onSessionEndingSoon?: (info: { secondsLeft: number; message: string }) => void
  /** El backend está renovando la sesión Gemini transparentemente. */
  onSessionRenewing?: () => void
  /** La sesión se renovó exitosamente, podés seguir hablando. */
  onSessionRenewed?: (message: string) => void
  /** El coach se quedo mudo y el watchdog server esta intentando rescatarlo.
   * level=1: trigger sintetico suave. level=2: force-renew + saludo de rescate. */
  onCoachRecovering?: (level: number) => void
  /** Voice room: alguien se unio a la charla grupal. */
  onParticipantJoined?: (info: { pid: string; name: string; isHost: boolean }) => void
  /** Voice room: alguien dejo la charla grupal. */
  onParticipantLeft?: (info: { pid: string; name: string }) => void
  /** Voice room: la sala se cerro (host termino la sesion). */
  onRoomClosed?: (reason: string) => void
}

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended'

export interface LiveParticipant {
  pid: string
  name: string
  isHost: boolean
}

export function useLiveVoice(opts: UseLiveVoiceOptions = {}) {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  /** Lista de humanos conectados a la voice room. Vacia si la sesion es 1:1
   * con el coach (modo single /ws). Se popula al hacer upgradeToRoom() y se
   * actualiza con eventos participant_joined / participant_left del backend. */
  const [participants, setParticipants] = useState<LiveParticipant[]>([])

  // Estabilizamos opts en un ref: el caller pasa literales nuevos cada render
  // pero los callbacks adentro del hook usan optsRef.current para no
  // invalidar dependencias y causar re-renders en loop (React error #310).
  const optsRef = useRef(opts)
  useEffect(() => { optsRef.current = opts })

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // AudioWorkletNode preferido (corre en thread separado, no traba la UI).
  // Si el browser no soporta o falla addModule, caemos a procRef (ScriptProcessor).
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const procRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Cola de reproducción del audio (coach o otros participantes).
  // Cada item lleva el sampleRate del chunk para reproducirlo correcto:
  // - Coach Gemini Live: 24000 Hz
  // - Otro participante humano (voice room mixer): 16000 Hz
  // Sin esto, audio del humano a 16k se reproducia a 24k -> efecto Chipmunk.
  const playCtxRef = useRef<AudioContext | null>(null)
  const playQueueRef = useRef<Array<{ floats: Float32Array; sampleRate: number }>>([])
  const playingRef = useRef(false)
  const nextStartTimeRef = useRef<number>(0)
  // Trackeamos las BufferSource agendadas para poder cancelarlas si el usuario
  // interrumpe al coach (barge-in).
  const playSourcesRef = useRef<AudioBufferSourceNode[]>([])
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
    if (workletNodeRef.current) {
      try { workletNodeRef.current.port.close() } catch {}
      try { workletNodeRef.current.disconnect() } catch {}
      workletNodeRef.current = null
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
    // Catch-up CONSERVADOR: solo si el delay acumulado supera 1.5s (problema
    // real, no fluctuacion normal), cancelamos los buffers futuros y reseteamos
    // el cursor. Sin esto, el delay puede crecer indefinidamente si el browser
    // suspende el AudioContext o si llegan bursts. Con threshold 1.5s evitamos
    // cortar audio bueno en uso normal pero recuperamos sincronia en colgues.
    const HARD_RESET_AHEAD_S = 1.5
    if (nextStartTimeRef.current > ctx.currentTime + HARD_RESET_AHEAD_S) {
      for (const src of playSourcesRef.current) {
        try { src.stop() } catch {}
        try { src.disconnect() } catch {}
      }
      playSourcesRef.current = []
      nextStartTimeRef.current = ctx.currentTime
    }
    // Schedule TODOS los chunks pendientes ahora con tiempos exactos para evitar gaps
    while (playQueueRef.current.length > 0) {
      const item = playQueueRef.current.shift()!
      const buf = ctx.createBuffer(1, item.floats.length, item.sampleRate)
      buf.getChannelData(0).set(item.floats)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      const analyser = analyserRef.current
      if (analyser) src.connect(analyser)
      // Si el proximo start es pasado o muy cercano, agendamos en currentTime + 20ms safety
      const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.02)
      src.start(startAt)
      nextStartTimeRef.current = startAt + buf.duration
      playSourcesRef.current.push(src)
      src.onended = () => {
        const arr = playSourcesRef.current
        const idx = arr.indexOf(src)
        if (idx >= 0) arr.splice(idx, 1)
      }
    }
  }, [])

  // Barge-in: el usuario empezo a hablar mientras el coach todavia soltaba audio.
  // Gemini ya cancelo el output server-side; aca cancelamos los chunks que ya
  // estaban scheduled en AudioContext (sino seguirian sonando hasta agotarse).
  const cancelTutorPlayback = useCallback(() => {
    // Vaciar cola de chunks no agendados
    playQueueRef.current = []
    // Stoppear todas las BufferSources agendadas
    for (const src of playSourcesRef.current) {
      try { src.stop() } catch {}
      try { src.disconnect() } catch {}
    }
    playSourcesRef.current = []
    // Resetear el cursor de scheduling
    const ctx = playCtxRef.current
    nextStartTimeRef.current = ctx ? ctx.currentTime : 0
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
    (b64: string, sampleRate: number = 24000) => {
      try {
        const bin = atob(b64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2))
        const float = new Float32Array(samples.length)
        for (let i = 0; i < samples.length; i++) float[i] = samples[i] / 32768
        playQueueRef.current.push({ floats: float, sampleRate })
        if (!playCtxRef.current) {
          // AudioContext a 24kHz (el mayor de los SR que recibimos). Los chunks
          // a 16kHz se resamplean automaticamente por el browser al asignar
          // sampleRate del AudioBuffer correctamente.
          playCtxRef.current = new AudioContext({ sampleRate: 24000 })
        }
        // Recovery: si el AudioContext quedo suspended (por autoplay policy,
        // o porque el browser lo suspendio al cambiar de WS en upgradeToRoom)
        // forzamos resume. Sin esto el audio se quedaba mudo despues del
        // upgrade aunque siguieran llegando chunks - bug reportado: el host
        // dejaba de escuchar al coach y al guest tras invitar a alguien.
        if (playCtxRef.current.state === 'suspended') {
          playCtxRef.current.resume().catch(() => {})
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
    async (sessionId: number, explicitToken?: string) => {
      setStatus('connecting')
      setTranscript([])

      let stream: MediaStream
      try {
        // 16kHz: probamos bajar a 8kHz pero rompio la captura (el usuario
        // hablaba y Gemini no transcribia nada). Sesion 195 evidencia:
        // 39s, coach repitio la misma pregunta 2 veces, 0 turnos del user.
        // Volvemos a 16kHz que andaba estable.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
        })
      } catch (e: any) {
        optsRef.current.onError?.(new Error('Permiso de micrófono denegado'))
        setStatus('error')
        return
      }
      streamRef.current = stream

      const url = buildVoiceWsUrl(sessionId, explicitToken)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = async () => {
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

        // Handler comun: convierte ArrayBuffer PCM int16 a base64 y lo manda
        // por WS. Se reusa entre AudioWorklet (preferido) y ScriptProcessor.
        const sendPcm = (pcmBuf: ArrayBuffer, rms: number): void => {
          const liveWs = wsRef.current
          if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return
          // Boost x4 del RMS para matchear escala del audio del tutor (que viene * 3)
          optsRef.current.onAudioLevel?.(Math.min(1, rms * 4))
          const bytes = new Uint8Array(pcmBuf)
          let bin = ''
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
          const b64 = btoa(bin)
          liveWs.send(JSON.stringify({ type: 'audio', data: b64 }))
        }

        // Preferido: AudioWorkletNode. Corre en thread de audio (no main),
        // libera la UI y reduce glitches. Buffer interno 2048 samples = 128ms.
        let useWorklet = false
        if (ctx.audioWorklet && typeof ctx.audioWorklet.addModule === 'function') {
          try {
            await ctx.audioWorklet.addModule('/audio-worklet/mic-processor.js')
            const node = new AudioWorkletNode(ctx, 'mic-processor', {
              processorOptions: { samples: 2048 },
            })
            workletNodeRef.current = node
            node.port.onmessage = (ev: MessageEvent) => {
              const { pcm, rms } = ev.data as { pcm: ArrayBuffer; rms: number }
              if (pcm) sendPcm(pcm, rms || 0)
            }
            source.connect(node)
            // Conectar a destination silencioso para que el browser corra el worklet.
            // Algunos browsers no procesan worklets sin downstream conectado.
            node.connect(ctx.destination)
            useWorklet = true
          } catch (e) {
            // Fallthrough a ScriptProcessor (Safari viejo, fallo de fetch, etc.)
            console.warn('[useLiveVoice] AudioWorklet no disponible, fallback a ScriptProcessor:', e)
          }
        }

        if (!useWorklet) {
          // Fallback: ScriptProcessor (deprecado pero universal). Buffer 2048
          // (era 4096 antes) = 128ms por callback, mas reactivo.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proc = (ctx as any).createScriptProcessor(2048, 1, 1) as ScriptProcessorNode
          procRef.current = proc
          proc.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0)
            const pcm = new Int16Array(input.length)
            let rms = 0
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]))
              pcm[i] = s < 0 ? s * 32768 : s * 32767
              rms += s * s
            }
            rms = Math.sqrt(rms / input.length)
            sendPcm(pcm.buffer, rms)
          }
          source.connect(proc)
          proc.connect(ctx.destination)
        }
      }

      attachWsHandlers(ws)
    },
    [pushAudioFromTutor, cancelTutorPlayback],
  )

  // Handler de mensajes compartido entre /ws (sesion single) y /ws_room (grupal).
  // Se mantiene en un ref para que upgradeToRoom() pueda re-attachearlo al
  // nuevo WS sin redefinir start().
  const handleWsMessage = useCallback((ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'audio') {
        // Coach Gemini Live: PCM 24kHz
        setStatus('speaking')
        pushAudioFromTutor(msg.data, 24000)
      } else if (msg.type === 'participant_audio') {
        // Otro participante humano en la voice room: PCM 16kHz (captura mic).
        setStatus('speaking')
        pushAudioFromTutor(msg.data, 16000)
      } else if (msg.type === 'transcript_chunk') {
        // Chunks en vivo tanto del AI como del USER. Acumulamos en el ultimo
        // mensaje del mismo 'who'; si el ultimo es de otro hablante o no hay
        // ninguno, creamos uno nuevo.
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
        const line: TranscriptLine = { who: msg.who, text: msg.text }
        setTranscript((prev) => [...prev, line])
        optsRef.current.onTranscript?.(line)
      } else if (msg.type === 'turn_complete') {
        setStatus('listening')
        setTranscript((prev) => {
          const lastUser = [...prev].reverse().find((l) => l.who === 'user')
          if (lastUser) optsRef.current.onTranscript?.(lastUser)
          return prev
        })
      } else if (msg.type === 'preference_applied') {
        optsRef.current.onPreferenceApplied?.(msg.changes, msg.confirmation)
      } else if (msg.type === 'session_ending_soon') {
        optsRef.current.onSessionEndingSoon?.({
          secondsLeft: msg.seconds_left ?? 60,
          message: msg.message ?? 'La sesión se va a renovar pronto',
        })
      } else if (msg.type === 'session_renewing') {
        setStatus('connecting')
        optsRef.current.onSessionRenewing?.()
      } else if (msg.type === 'session_renewed') {
        setStatus('listening')
        optsRef.current.onSessionRenewed?.(msg.message ?? 'Sesión renovada')
      } else if (msg.type === 'interrupted') {
        cancelTutorPlayback()
        setStatus('listening')
      } else if (msg.type === 'coach_recovering') {
        optsRef.current.onCoachRecovering?.(msg.level ?? 1)
      } else if (msg.type === 'participant_joined') {
        if (Array.isArray(msg.participants)) {
          setParticipants(msg.participants.map((p: { pid: string; name: string; is_host?: boolean }) => ({
            pid: p.pid, name: p.name, isHost: !!p.is_host,
          })))
        }
        optsRef.current.onParticipantJoined?.({
          pid: msg.pid,
          name: msg.name,
          isHost: !!msg.is_host,
        })
      } else if (msg.type === 'participant_left') {
        setParticipants((prev) => prev.filter((p) => p.pid !== msg.pid))
        optsRef.current.onParticipantLeft?.({ pid: msg.pid, name: msg.name })
      } else if (msg.type === 'room_joined') {
        // Ack del backend cuando entramos a la room: trae la lista completa.
        if (Array.isArray(msg.participants)) {
          setParticipants(msg.participants.map((p: { pid: string; name: string; is_host?: boolean }) => ({
            pid: p.pid, name: p.name, isHost: !!p.is_host,
          })))
        }
        setStatus('listening')
      } else if (msg.type === 'room_closed') {
        setParticipants([])
        optsRef.current.onRoomClosed?.(msg.reason || 'closed')
        setStatus('ended')
      } else if (msg.type === 'error') {
        optsRef.current.onError?.(new Error(msg.error || 'live error'))
        setStatus('error')
      }
    } catch {}
  }, [pushAudioFromTutor, cancelTutorPlayback])

  const attachWsHandlers = useCallback((ws: WebSocket) => {
    ws.onmessage = handleWsMessage
    ws.onerror = () => {
      optsRef.current.onError?.(new Error('WebSocket error'))
      setStatus('error')
    }
    ws.onclose = () => {
      setStatus((prev) => (prev !== 'ended' ? 'ended' : prev))
    }
  }, [handleWsMessage])

  /**
   * Upgrade de sesion single (/ws) a voice room (/ws_room).
   *
   * Cuando el host hace tap en "invitar amigo", el backend crea una room y
   * devuelve { token, host_pid }. Esta funcion cierra el WS actual y abre
   * uno nuevo a la room manteniendo el AudioContext, el mic y todo el state
   * de la UI. Cuando el guest entre a la room, el host lo escucha en tiempo
   * real porque ambos comparten la misma sesion Gemini compartida.
   *
   * Idempotente: si ya estamos en una room, no hace nada.
   */
  const upgradeToRoom = useCallback((roomToken: string, hostPid: string) => {
    // Guard: si no hay sesion Live activa, no podemos hacer el upgrade. El
    // caller (InviteFriendButton) deberia haber esperado a tener sesion antes
    // de crear la room. Si llegamos aca el flow esta roto - reportar al user
    // claramente en vez de quedar en silencio (bug real reportado: el guest
    // entraba a una room sin host conectado y se quedaba esperando).
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      optsRef.current.onError?.(new Error(
        'Tenés que empezar la charla con el coach antes de invitar a un amigo.'
      ))
      return
    }
    if (wsRef.current.url.includes('/ws_room')) return  // ya en room
    const oldWs = wsRef.current
    const base = oldWs.url.replace(/\/ws(\?|$).*/, '')
    const url = `${base}/ws_room?room_token=${encodeURIComponent(roomToken)}&pid=${encodeURIComponent(hostPid)}`
    const newWs = new WebSocket(url)
    wsRef.current = newWs
    setStatus('connecting')
    newWs.onopen = () => {
      setStatus('listening')
      // Reiniciamos el keepalive
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = window.setInterval(() => {
        if (newWs.readyState === WebSocket.OPEN) {
          try { newWs.send(JSON.stringify({ type: 'ping' })) } catch {}
        }
      }, 25000)
      // Cerrar el WS viejo SOLO cuando el nuevo este abierto, asi no perdemos
      // audio en el switch.
      try { oldWs.close() } catch {}
    }
    attachWsHandlers(newWs)
  }, [attachWsHandlers])

  const sendSystemUpdate = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'system_update', text }))
        return true
      } catch { return false }
    }
    return false
  }, [])

  return { start, stop, status, transcript, sendSystemUpdate, say, upgradeToRoom, participants }
}
