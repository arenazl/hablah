import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export const API_BASE_URL = API_URL
export default api

/* ────────────── AUTH ────────────── */
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

/* ────────────── ME (perfil enriquecido) ────────────── */
export interface MeProfile {
  user: {
    id: number; email: string; nombre: string; apellido: string; role: string
    cefr_level: string; cefr_manual?: boolean; target_language: string; base_language: string
    accent_preference: string; streak_days: number; streak_best: number
    target_minutes_per_session: number; insistent_mode_enabled: boolean
    daily_reminder_enabled: boolean; audio_retention_days: number; plan: string
  }
  active_template: { id: number; slug: string; name: string; description: string; voice_id: string; voice_label: string } | null
  interests: { id: number; slug: string; title: string; category: string }[]
  progress: { topic_id: number; topic_title: string; stages_done: number; stages_total: number; pct: number; minutes_spoken: number; sessions_count: number }[]
  last_session: { id: number; topic_id: number | null; started_at: string; score: number | null } | null
  total_sessions: number
}

export interface HeatmapCell { date: string; sessions: number; minutes: number; level: number }
export interface LevelProgress {
  current: string
  next: string
  pct: number
  sessions_total: number
  hours_spoken: number
  fluency_delta_30d: number | null
}

export const meAPI = {
  profile: () => api.get<MeProfile>('/me/profile').then((r) => r.data),
  updateSettings: (data: Partial<{
    accent_preference: 'uk' | 'us_f' | 'us_m' | string
    target_minutes_per_session: number
    insistent_mode_enabled: boolean
    daily_reminder_enabled: boolean
    audio_retention_days: number
    active_template_id: number
    cefr_level: string
    cefr_manual: boolean
    target_language: string
  }>) => api.patch('/me/settings', data).then((r) => r.data),
  streakHeatmap: (days = 28) => api.get<HeatmapCell[]>(`/me/streak-heatmap?days=${days}`).then((r) => r.data),
  levelProgress: () => api.get<LevelProgress>('/me/level-progress').then((r) => r.data),
  today: () => api.get<TodayPayload>('/me/today').then((r) => r.data),
}

export interface TodayPayload {
  mission: {
    topic: { id: number; slug: string; title: string; category: string } | null
    template: { id: number; name: string; slug: string; rigor: number } | null
    suggested_minutes: number
    level: string
    language: string
  }
  in_context_prompts: { kind: 'vocab' | 'gram' | 'restr'; label: string; text: string }[]
  rescue: {
    active: boolean
    error_key: string
    label: string
    sessions_count: number
    examples: { wrong: string | null; correct: string | null; ctx_date: string | null }[]
  } | null
}

/* ────────────── TEMPLATES ────────────── */
export interface Template {
  id: number; slug: string; name: string; description: string
  rigor: number; challenges_per_min: number
  allow_interruptions: boolean; block_on_repeat: boolean; json_output: boolean
  tones: string[]; voice_id: string; voice_label: string
  icon_bg: string; is_preset: boolean; version: string; status: string
  assigned_count: number

  // v3 pedagogía configurable
  response_length: 'terse' | 'short' | 'medium' | 'long'
  tutor_talk_ratio: number
  proactive_questions: boolean
  tutor_shares_opinions: boolean
  warmth_level: number
  correction_mode: 'none' | 'recast' | 'explicit_soft' | 'explicit_strict'
  correction_focus: string[]
  error_threshold: 'only_major' | 'repeated' | 'all'
  max_feedback_items: number
  praise_count: number
  report_include_summary: boolean
  report_include_connectors: boolean
  report_include_vocab_suggestions: boolean
  report_include_pronunciation: boolean
  report_include_next_session_tip: boolean
  opening_style: 'direct' | 'warm' | 'playful'
  opening_includes_topic_intro: boolean
  silence_tolerance_ms: number
  interruption_allowed: boolean
  scaffold_when_stuck: boolean
  // v6 pedagogia + voz
  pedagogy_preset?: 'entrevistador' | 'balanced' | 'charlatan' | 'mentor' | 'provocador' | 'ludico'
  avoid_superlative_questions?: boolean
  one_question_per_turn?: boolean
  voice_speed?: number
  voice_stability?: number
  voice_style?: number
  voice_id_en?: string
  voice_id_es?: string
  voice_id_pt?: string
}

export const templatesAPI = {
  list: () => api.get<Template[]>('/templates/').then((r) => r.data),
  get: (id: number) => api.get<Template>(`/templates/${id}`).then((r) => r.data),
  create: (data: Partial<Template>) => api.post<Template>('/templates/', data).then((r) => r.data),
  update: (id: number, data: Partial<Template>) =>
    api.patch<Template>(`/templates/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/templates/${id}`).then((r) => r.data),
}

/* ────────────── ADMIN DIRECTIVES (modo evolutivo) ────────────── */
export interface AdminDirective {
  id: number
  template_id: number
  session_id: number | null
  user_id: number
  raw_feedback: string
  directive_text: string
  prompt_before: string
  prompt_after: string
  active: boolean
  created_at: string | null
}

export const adminDirectivesAPI = {
  list: (templateId: number) =>
    api.get<{ template: { id: number; name: string; slug: string }; directives: AdminDirective[] }>(
      `/admin/templates/${templateId}/directives`,
    ).then((r) => r.data),
  toggle: (id: number, active: boolean) =>
    api.patch<AdminDirective>(`/admin/directives/${id}`, { active }).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/directives/${id}`).then((r) => r.data),
}

/* ────────────── TOPICS ────────────── */
export interface Topic {
  id: number; slug: string; title: string; category: string
  seed_prompts: Record<string, string>; keywords: string[]
  levels: string[]; is_hot: boolean; is_active: boolean; usage_count: number
}

export const topicsAPI = {
  list: (params?: { category?: string; q?: string }) =>
    api.get<Topic[]>('/topics/', { params }).then((r) => r.data),
  get: (id: number) => api.get<Topic>(`/topics/${id}`).then((r) => r.data),
  myInterests: () => api.get<Topic[]>('/topics/my-interests').then((r) => r.data),
  addInterest: (topicId: number) => api.post(`/topics/my-interests/${topicId}`).then((r) => r.data),
  removeInterest: (topicId: number) => api.delete(`/topics/my-interests/${topicId}`).then((r) => r.data),
  reorder: (topicIds: number[]) =>
    api.post('/topics/my-interests/reorder', { topic_ids: topicIds }).then((r) => r.data),
  create: (data: Partial<Topic>) => api.post<Topic>('/topics/', data).then((r) => r.data),
  update: (id: number, data: Partial<Topic>) =>
    api.patch<Topic>(`/topics/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/topics/${id}`).then((r) => r.data),
  generateSeedsAI: (id: number, lang: 'es' | 'pt' | 'en' | 'it' = 'es') =>
    api.post<{
      topic_id: number; lang: string; seed_prompts: Record<string, string>;
      keywords: string[]; note: string
    }>(`/topics/${id}/generate-seeds?lang=${lang}`).then((r) => r.data),
}

/* ────────────── ONBOARDING ────────────── */
export interface OnboardingCategory { slug: string; title: string; color: string }
export interface OnboardingTopic {
  id: number; slug: string; title: string; category: string; is_hot: boolean; is_fallback: boolean
}

export const onboardingAPI = {
  categories: () =>
    api.get<{ categories: OnboardingCategory[] }>('/onboarding/categories').then((r) => r.data.categories),
  topics: (catSlug: string) =>
    api.get<{ topics: OnboardingTopic[] }>(`/onboarding/topics/${catSlug}`).then((r) => r.data.topics),
  addFallbackTopic: (title: string, category: string) =>
    api.post<{ topic_id: number; slug: string; title: string }>('/onboarding/add-fallback-topic', { title, category }).then((r) => r.data),
  finish: (pickedCategorySlugs: string[]) =>
    api.post<{ added: number; total_categories: number }>('/onboarding/finish', { picked_category_slugs: pickedCategorySlugs }).then((r) => r.data),
  reset: () =>
    api.post<{ reset: boolean }>('/onboarding/reset').then((r) => r.data),
}

/* ────────────── SESSIONS ────────────── */
export interface SessionStart {
  session_id: number
  super_prompt: string
  voice_id: string
  template: { id: number; name: string; slug: string; rigor: number; challenges_per_min: number } | null
  topic: { id: number; title: string; slug: string; keywords: string[] } | null
}

export interface SessionData {
  id: number; user_id: number; template_id: number | null; topic_id: number | null
  cefr_at_start: string; status: string
  started_at: string; ended_at: string | null; duration_seconds: number | null
  transcript: { who: string; text: string }[]
  metrics: Record<string, any>
  report: Record<string, any>
  score: number | null; is_rescue: boolean
}

export const sessionsAPI = {
  start: (topic_id?: number, template_id?: number, free_topic?: string) =>
    api.post<SessionStart>('/sessions/start', { topic_id, template_id, free_topic }).then((r) => r.data),
  end: (sessionId: number, transcript: { who: string; text: string }[]) =>
    api.post<SessionData>(`/sessions/${sessionId}/end`, { transcript }).then((r) => r.data),
  list: () => api.get<SessionData[]>('/sessions/').then((r) => r.data),
  get: (id: number) => api.get<SessionData>(`/sessions/${id}`).then((r) => r.data),
}

/* ────────────── ALUMNOS (admin) ────────────── */
export interface Alumno {
  id: number; email: string; nombre: string; apellido: string
  cefr_level: string; tutor: string | null; tutor_slug: string | null
  progress_pct: number; streak_days: number; plan: string
  total_sessions: number; last_session_at: string | null
}

export const alumnosAPI = {
  list: (params?: { q?: string; level?: string }) =>
    api.get<Alumno[]>('/alumnos/', { params }).then((r) => r.data),
  errors: (userId: number) =>
    api.get(`/alumnos/${userId}/errors`).then((r) => r.data),
}

/* ────────────── PUSH ────────────── */
export const pushAPI = {
  vapidPublicKey: () => api.get('/push/vapid-public-key').then((r) => r.data),
  vapidKey: () => api.get('/push/vapid-public-key').then((r) => r.data),
  subscribe: (subscription: any) => api.post('/push/subscribe', subscription).then((r) => r.data),
  unsubscribe: (endpoint: string) =>
    api.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data),
  test: () => api.post('/push/test').then((r) => r.data),
}

/* ────────────── DASHBOARD (admin) ────────────── */
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary').then((r) => r.data),
}

/* ────────────── AUDITORÍA (admin) ────────────── */
export interface AuditSessionRow {
  id: number
  user_id: number
  user_name: string
  user_email: string | null
  status: string
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  template_name: string | null
  topic_title: string | null
  cefr_at_start: string
  score: number | null
  is_rescue: boolean
  has_audio: boolean
  has_report: boolean
  has_metrics: boolean
  turns: number
  user_turns: number
  ai_turns: number
}

export interface AuditSessionsResponse {
  total: number
  limit: number
  offset: number
  sessions: AuditSessionRow[]
}

export interface AuditTurn { who: string; text?: string; ts?: string | number; [k: string]: any }

export interface AuditSessionDetail {
  id: number
  user: { id: number; name: string; email: string | null; cefr_level: string | null; target_language: string | null }
  status: string
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  cefr_at_start: string
  score: number | null
  is_rescue: boolean
  audio_url: string | null
  template: { id: number; name: string; slug: string } | null
  topic: { id: number; title: string; slug: string } | null
  transcript: AuditTurn[]
  metrics: Record<string, any>
  report: Record<string, any>
  errors: AuditErrorRow[]
  turns: number
  user_turns: number
  ai_turns: number
}

export interface AuditErrorRow {
  id: number
  user_id?: number
  user_name?: string
  session_id: number
  kind: string
  error_key: string
  label: string
  snippet_wrong: string | null
  snippet_correct: string | null
  resolved: boolean
  detected_at: string | null
}

export interface AuditStats {
  sessions_today: number
  sessions_week: number
  active_now: number
  open_errors: number
}

export interface AuditSessionFilters {
  q?: string
  user_id?: number
  status?: string
  template_id?: number
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

/** Evento crudo del structured-log (Cloud Logging) para una sesión. */
export interface AuditLogEvent {
  ts: string
  severity: string
  event: string
  data: Record<string, any>
}
export interface AuditTimelineResponse {
  session_id: number
  window_minutes: number
  n_events: number
  timeline: AuditLogEvent[]
}

export const auditAPI = {
  stats: () => api.get<AuditStats>('/audit/stats').then((r) => r.data),
  sessions: (filters: AuditSessionFilters = {}) =>
    api.get<AuditSessionsResponse>('/audit/sessions', { params: filters }).then((r) => r.data),
  session: (id: number) =>
    api.get<AuditSessionDetail>(`/audit/sessions/${id}`).then((r) => r.data),
  errors: (filters: { q?: string; user_id?: number; kind?: string; resolved?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<{ total: number; errors: AuditErrorRow[] }>('/audit/errors', { params: filters }).then((r) => r.data),
  /** Timeline en vivo desde Cloud Logging (turnos con texto + interrupciones + timing).
   * `minutes` = ventana hacia atrás que cubre el inicio de la charla. */
  timeline: (id: number, minutes: number) =>
    api.get<AuditTimelineResponse>(`/diag/session-trace/${id}`, { params: { minutes } }).then((r) => r.data),
}

/* ────────────── TTS ────────────── */
export const ttsAPI = {
  voices: () => api.get('/tts/voices').then((r) => r.data),
  /** Reproduce un sample TTS en el browser. Devuelve el Audio para controlar. */
  async play(text: string, tutorOrOpts?: string | { tutor?: string; voice_id?: string }): Promise<HTMLAudioElement> {
    const params = new URLSearchParams({ text })
    if (typeof tutorOrOpts === 'string') {
      params.set('tutor', tutorOrOpts)
    } else if (tutorOrOpts) {
      if (tutorOrOpts.tutor) params.set('tutor', tutorOrOpts.tutor)
      if (tutorOrOpts.voice_id) params.set('voice_id', tutorOrOpts.voice_id)
    }
    const r = await api.post(`/tts/sample?${params.toString()}`, null, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data as Blob)
    const audio = new Audio(url)
    audio.play().catch(() => {})
    audio.onended = () => URL.revokeObjectURL(url)
    return audio
  },
}

/* ────────────── VOICE WS ────────────── */
/** Base de WS apuntando al backend real (no via proxy de Netlify, que rompe
 * el WebSocket upgrade y devuelve 404). Ej: wss://hablah-api-XXX.herokuapp.com/api */
export function buildWsBase(): string {
  const httpBase = API_URL.replace(/\/$/, '')
  const fullBase = httpBase.startsWith('/') ? `${window.location.origin}${httpBase}` : httpBase
  return fullBase.replace(/^http/, 'ws')
}

export function buildVoiceWsUrl(sessionId: number, explicitToken?: string): string {
  const wsBase = buildWsBase()
  const token = explicitToken ?? localStorage.getItem('token') ?? ''
  return `${wsBase}/voice/ws?session_id=${sessionId}&token=${encodeURIComponent(token)}`
}

/** URL del WebSocket de voice room. Va DIRECTO al backend (no via Netlify) para
 * que el WS upgrade funcione. lang opcional para override del target_language
 * (usado por /tune para forzar idioma sin tocar el user). */
export function buildRoomWsUrl(roomToken: string, pid: string, lang?: string): string {
  const wsBase = buildWsBase()
  const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
  return `${wsBase}/voice/ws_room?room_token=${encodeURIComponent(roomToken)}&pid=${encodeURIComponent(pid)}${langParam}`
}
