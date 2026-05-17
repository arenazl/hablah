export interface User {
  id: number
  email: string
  nombre: string
  apellido: string
  telefono?: string | null
  telefono_personal?: string | null
  foto_url?: string | null
  role: 'admin' | 'gerente' | 'vendedor'
  meta_conversaciones_diaria: number
  is_active: boolean
  is_available?: boolean
  created_at: string
}

export interface Cliente {
  id: number
  vendedor_id: number
  vendedor_nombre?: string | null
  nombre: string
  apellido: string
  email?: string | null
  telefono?: string | null
  origen: string
  estado: string
  temperatura?: string | null
  pref_zona?: string | null
  pref_m2_min?: number | null
  pref_m2_max?: number | null
  pref_ambientes?: number | null
  pref_presupuesto_min?: number | null
  pref_presupuesto_max?: number | null
  pref_moneda: string
  notas?: string | null
  created_at: string
  last_contact_at?: string | null
}

export interface FotoPropiedad {
  id: number
  url: string
  orden: number
}

export interface Propiedad {
  id: number
  captador_id: number
  captador_nombre?: string | null
  titulo: string
  descripcion?: string | null
  tipo: string
  direccion: string
  barrio: string
  ciudad: string
  lat?: number | null
  lng?: number | null
  m2_totales: number
  m2_cubiertos?: number | null
  ambientes: number
  banos: number
  cocheras: number
  antiguedad?: number | null
  precio_publicacion: number
  moneda: string
  estado: string
  exclusividad: boolean
  fotos: FotoPropiedad[]
  created_at: string
}

export interface Visita {
  id: number
  cliente_id: number
  cliente_nombre?: string | null
  propiedad_id: number
  propiedad_titulo?: string | null
  vendedor_id: number
  vendedor_nombre?: string | null
  fecha_hora: string
  estado: string
  resultado: string
  notas_voz?: string | null
  created_at: string
}

export interface Autorizacion {
  id: number
  propiedad_id: number
  propiedad_titulo?: string | null
  captador_id: number
  captador_nombre?: string | null
  fecha_firma: string
  fecha_vencimiento: string
  precio_minimo: number
  moneda: string
  comision_pct: number
  exclusividad: boolean
  pdf_url?: string | null
  observaciones?: string | null
  estado: string
  created_at: string
}

export interface PipelineDeal {
  id: number
  cliente_id: number
  cliente_nombre?: string | null
  propiedad_id: number
  propiedad_titulo?: string | null
  vendedor_id: number
  vendedor_nombre?: string | null
  etapa: string
  precio_negociado?: number | null
  moneda: string
  comision_estimada?: number | null
  probabilidad_pct: number
  fecha_estimada_cierre?: string | null
  notas?: string | null
  created_at: string
  updated_at: string
}

export type MetricaTipo = 'checkbox' | 'cantidad'

export interface Coach {
  id: number
  nombre: string
  descripcion?: string | null
  foto_url?: string | null
  fuente_url?: string | null
  es_oficial: boolean
  templates_count?: number
  created_at: string
}

export interface DmoBloque {
  id: number
  template_id?: number
  nombre: string
  descripcion?: string | null
  hora_inicio: string
  hora_fin: string
  color: string
  orden: number
  es_money_block: boolean
  metrica_tipo: MetricaTipo
  metrica_label?: string | null
  metrica_meta: number
}

export interface DmoTemplate {
  id: number
  coach_id: number
  coach_nombre?: string | null
  nombre: string
  descripcion?: string | null
  mercado?: string | null
  activo: boolean
  es_default_inmobiliaria: boolean
  bloques: DmoBloque[]
  asignaciones_count?: number
  created_at: string
}

export interface VendedorAssignment {
  id: number
  vendedor_id: number
  vendedor_nombre?: string | null
  template_id: number
  template_nombre?: string | null
  coach_nombre?: string | null
  assigned_at: string
}

export interface DmoLog {
  id: number
  vendedor_id: number
  bloque_id: number
  fecha: string
  completado: boolean
  valor_metrica: number
  notas?: string | null
  created_at: string
}

export interface DmoDia {
  fecha: string
  template: DmoTemplate | null
  bloques: DmoBloque[]
  logs: DmoLog[]
  conversaciones_meta: number
  conversaciones_realizadas: number
  pct_completitud: number
}

export interface DashboardResumen {
  total_clientes: number
  total_propiedades: number
  visitas_semana: number
  deals_abiertos: number
  conversaciones_hoy: number
  meta_conversaciones: number
  pipeline_etapas: Record<string, number>
}

export interface BotConfig {
  id: number
  telefono_oficial?: string | null
  email_oficial?: string | null
  direccion?: string | null
  web?: string | null
  instagram?: string | null
  horario_semana?: string | null
  horario_sabado?: string | null
  horario_domingo?: string | null
  comision_compra_vendedor?: string | null
  comision_compra_comprador?: string | null
  comision_alquiler_propietario?: string | null
  comision_alquiler_inquilino?: string | null
  reserva_pct_estandar?: string | null
  reserva_plazo_aceptacion?: string | null
  baileys_service_url?: string | null
  baileys_api_key?: string | null
  numero_oficial_wa?: string | null
  mensaje_bienvenida?: string | null
  mensaje_off_hours?: string | null
  tono_extra?: string | null
  palabras_derivacion_extra?: string | null
  identidad_extra?: string | null
  diferencial_extra?: string | null
  joda_telefono?: string | null
  joda_prompt?: string | null
  joda_saludo?: string | null
  updated_at?: string | null
}

export interface BaileysStatus {
  configurado: boolean
  ok: boolean
  baileys_ready?: boolean
  has_pending_qr?: boolean
  numero?: string | null
  last_checked: string
  error?: string | null
}

export interface BotFaq {
  id: number
  pregunta: string
  respuesta: string
  orden: number
  activo: boolean
  created_at: string
  updated_at?: string | null
}

export type WaConvEstado = 'nueva' | 'abierta' | 'cerrada' | 'bloqueada'
export type WaMsgDireccion = 'in' | 'out'

export interface WhatsappMessage {
  id: number
  conversation_id: number
  direccion: WaMsgDireccion
  sender_id?: number | null
  sender_nombre?: string | null
  contenido: string
  enviado_at: string
  leido: boolean
  meta_message_id?: string | null
}

export interface WhatsappConversation {
  id: number
  telefono: string
  nombre_contacto?: string | null
  cliente_id?: number | null
  cliente_nombre?: string | null
  assignee_id?: number | null
  assignee_nombre?: string | null
  estado: WaConvEstado
  ultima_actividad?: string | null
  unread_count: number
  ultimo_mensaje?: string | null
  ultimo_mensaje_direccion?: WaMsgDireccion | null
  prompt_override?: string | null
  voice_mode?: 'off' | 'auto' | 'mirror' | string | null
  voice_id?: string | null
  created_at: string
}

export interface Personalidad {
  slug: string
  nombre: string
  categoria: string
  voice_mode_sugerido?: 'off' | 'auto' | 'mirror'
  tags?: string[]
  saludo: string
  prompt: string
}

export interface WhatsappConversationDetail extends WhatsappConversation {
  mensajes: WhatsappMessage[]
}
