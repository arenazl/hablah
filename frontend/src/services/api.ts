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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const clientesAPI = {
  list: () => api.get('/clientes/'),
  create: (data: any) => api.post('/clientes/', data),
  update: (id: number, data: any) => api.patch(`/clientes/${id}`, data),
  remove: (id: number) => api.delete(`/clientes/${id}`),
}

export const propiedadesAPI = {
  list: () => api.get('/propiedades/'),
  get: (id: number) => api.get(`/propiedades/${id}`),
  create: (data: any) => api.post('/propiedades/', data),
  update: (id: number, data: any) => api.patch(`/propiedades/${id}`, data),
  remove: (id: number) => api.delete(`/propiedades/${id}`),
}

export const visitasAPI = {
  list: () => api.get('/visitas/'),
  create: (data: any) => api.post('/visitas/', data),
  update: (id: number, data: any) => api.patch(`/visitas/${id}`, data),
  remove: (id: number) => api.delete(`/visitas/${id}`),
}

export const autorizacionesAPI = {
  list: () => api.get('/autorizaciones/'),
  create: (data: any) => api.post('/autorizaciones/', data),
  update: (id: number, data: any) => api.patch(`/autorizaciones/${id}`, data),
}

export const pipelineAPI = {
  list: () => api.get('/pipeline/'),
  create: (data: any) => api.post('/pipeline/', data),
  update: (id: number, data: any) => api.patch(`/pipeline/${id}`, data),
  remove: (id: number) => api.delete(`/pipeline/${id}`),
}

export const dmoAPI = {
  dia: (fecha?: string) => api.get('/dmo/dia', { params: fecha ? { fecha } : {} }),
  log: (data: any) => api.post('/dmo/log', data),
}

export const coachesAPI = {
  list: () => api.get('/coaches/'),
  create: (data: any) => api.post('/coaches/', data),
  update: (id: number, data: any) => api.patch(`/coaches/${id}`, data),
  remove: (id: number) => api.delete(`/coaches/${id}`),
}

export const dmoTemplatesAPI = {
  list: () => api.get('/dmo-templates/'),
  get: (id: number) => api.get(`/dmo-templates/${id}`),
  create: (data: any) => api.post('/dmo-templates/', data),
  update: (id: number, data: any) => api.patch(`/dmo-templates/${id}`, data),
  remove: (id: number) => api.delete(`/dmo-templates/${id}`),
  clone: (id: number) => api.post(`/dmo-templates/${id}/clone`),
}

export const dmoAssignmentsAPI = {
  list: () => api.get('/dmo-assignments/'),
  upsert: (data: { vendedor_id: number; template_id: number }) => api.post('/dmo-assignments/', data),
  remove: (vendedor_id: number) => api.delete(`/dmo-assignments/${vendedor_id}`),
}

export const usersAPI = {
  list: () => api.get('/users/'),
  me: () => api.get('/users/me'),
  updateMe: (data: any) => api.patch('/users/me', data),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data),
  setAvailability: (is_available: boolean) => api.patch('/users/me/availability', { is_available }),
}

export const pushAPI = {
  vapidKey: () => api.get('/push/vapid-public-key'),
  subscribe: (data: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    api.post('/push/subscribe', data),
  unsubscribe: (endpoint: string) =>
    api.delete('/push/subscribe', { params: { endpoint } }),
  test: () => api.post('/push/test'),
}

export const botConfigAPI = {
  get: () => api.get('/bot-config/'),
  update: (data: any) => api.patch('/bot-config/', data),
  baileysStatus: () => api.get('/bot-config/baileys-status'),
  faqs: {
    list: () => api.get('/bot-config/faqs'),
    create: (data: any) => api.post('/bot-config/faqs', data),
    update: (id: number, data: any) => api.patch(`/bot-config/faqs/${id}`, data),
    remove: (id: number) => api.delete(`/bot-config/faqs/${id}`),
  },
}

export const dashboardAPI = {
  resumen: () => api.get('/dashboard/resumen'),
  ranking: () => api.get('/dashboard/ranking-vendedores'),
}

export const whatsappAPI = {
  list: (params?: { estado?: string; only_mine?: boolean; only_unassigned?: boolean }) =>
    api.get('/whatsapp/conversations/', { params }),
  get: (id: number) => api.get(`/whatsapp/conversations/${id}`),
  update: (id: number, data: { assignee_id?: number | null; estado?: string; cliente_id?: number | null; nombre_contacto?: string | null; prompt_override?: string | null; voice_mode?: string | null; voice_id?: string | null }) =>
    api.patch(`/whatsapp/conversations/${id}`, data),
  send: (id: number, contenido: string, opts?: { as_audio?: boolean; voice_id?: string }) =>
    api.post(`/whatsapp/conversations/${id}/send`, { contenido, ...(opts || {}) }),
  sendVoiceClone: (id: number, audioBlob: Blob, voiceId?: string) => {
    const fd = new FormData()
    fd.append('audio', audioBlob, 'voice.webm')
    if (voiceId) fd.append('voice_id', voiceId)
    return api.post(`/whatsapp/conversations/${id}/send-voice-clone`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    })
  },
  personalidades: () => api.get('/whatsapp/personalidades'),
  markRead: (id: number) => api.post(`/whatsapp/conversations/${id}/mark-read`),
  mockIncoming: (data: { telefono: string; nombre_contacto?: string; contenido: string }) =>
    api.post('/whatsapp/mock/incoming', data),
  iniciarConversacion: (data: { telefono: string; prompt: string; primer_mensaje: string; nombre?: string }) =>
    api.post('/whatsapp/iniciar-conversacion', data),
}

export default api
