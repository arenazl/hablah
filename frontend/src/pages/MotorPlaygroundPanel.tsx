/* MotorPlaygroundPanel — /motor · PROBADOR + EDITOR del circuito JIT (Motor V2).
 *
 * Elegís un CONTEXTO de prueba (edad × nivel × tópico [× alumno-perfil]) y el motor arma
 * las 9 capas JIT. Tocás una capa → se despliega su panel (acordeón) con sus reglas.
 * Los placeholders como {expected_production} se pintan como badges editables.
 * Al tocar un placeholder o hacer click en el lápiz, editás la plantilla de origen.
 *
 * Clase en VIVO: botón "Iniciar clase" que abre una charla REAL por voz (solo audio,
 * sin imágenes) contra el motor único (ws_motor → compose_proto) con el MISMO combo que
 * se está previsualizando. Loop: ajustar placeholder → guardar → reiniciar clase.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import { BACKOFFICE_CSS } from './backoffice.css'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { motorAPI, buildMotorWsUrl, MotorResolve, MotorOverride, MotorPreset, MotorStageNote, MotorVerificacion } from '../services/api'
import { useLiveVoice, useAudioLevel } from '../hooks/useLiveVoice'
import { useIsMobile } from '../hooks/useIsMobile'
import { createPortal } from 'react-dom'
import { ClaseOrbe } from '../components/ClaseOrbe'
import { WEBAPP_CSS } from './webapp.css'
import { CONVO_BG_CSS } from './convo-bg.css'

interface Band { band_id: number; code: string; label: string; phase_group?: string; max_level_order?: number }
interface Level {
  level_code: string; label: string; sort_order: number; discipline?: string; family?: string
  // ESCALON: la escalera unica que comparten todas las disciplinas (tabla `escalones`). El
  // combo muestra esto —"3 · Intermedio"— en vez del codigo interno, que decia "B2" en
  // idiomas y "CON1" en plomeria sin que el alumno pudiera compararlos.
  escalon?: number | null; escalon_nombre?: string | null; escalon_desc?: string | null
}

/**
 * LA CADENA: disciplina → edad → nivel → categoría → tópico.
 *
 * Un tópico "pasa" si sobrevive a todos los eslabones seleccionados. Está en una
 * sola función para que el filtrado de la grilla y el conteo que deshabilita las
 * opciones no puedan divergir — si divergen, la UI habilita combos que después
 * no traen nada.
 *
 * El idioma NO entra en la cadena: es agnóstico, cualquier tópico se puede dar
 * en cualquier idioma (el motor lo resuelve con el placeholder {idioma}).
 */
function pasaCadena(
  t: Topic,
  sel: { discipline?: string; band?: string; level?: string; cat?: string },
): boolean {
  if (sel.discipline && sel.discipline !== 'todos'
      && (t.discipline || 'idiomas') !== sel.discipline) return false
  // topics.segmento dice 'adultos' donde student_types dice 'adult'
  if (sel.band && t.segmento) {
    const seg = t.segmento === 'adultos' ? 'adult' : t.segmento
    if (seg !== sel.band) return false
  }
  // Tópico sin niveles declarados = sirve para todos
  if (sel.level && t.levels && t.levels.length > 0 && !t.levels.includes(sel.level)) return false
  if (sel.cat && (t.category || '') !== sel.cat) return false
  return true
}

/** Nombre lindo por disciplina. Si entra una nueva y no está acá, se muestra su
 *  código tal cual — no rompe nada. */
const DISCIPLINE_LABELS: Record<string, string> = {
  idiomas: 'Idiomas',
  fonetica: 'Fonética / Pronunciación',
  musica: 'Música',
  informatica: 'Informática',
  oficios: 'Oficios',
  creativo: 'Creativos',
  oratoria: 'Oratoria',
}
interface Topic { topic_id: number; title: string; segmento?: string; levels?: string[]; category?: string; categoryLabel?: string; discipline?: string }
interface Student {
  student_id: number; name: string; age?: number; level_code: string; age_group?: string
  base_language?: string; target_language?: string
  // materia -> nivel. Override del level_code del perfil: B2 en 'en', A1 en 'fr',
  // CON1 en 'historia'. Vacío = usar level_code.
  levels_by_materia?: Record<string, string>
}

const C = {
  bg: 'var(--bg-1)',
  panel: 'var(--surface)',
  border: 'var(--border-2)',
  soft: 'var(--bg-2)',
  fg: 'var(--fg-1)',
  dim: 'var(--fg-2)',
  faint: 'var(--fg-3)',
  accent: 'var(--primary)',
  green: 'var(--primary)',
  red: 'var(--danger)',
}

const NAT = {
  fijo: 'var(--fg-3)',
  edad: 'var(--accent)',
  nivel: 'var(--info)',
  dinamico: 'var(--violet)'
}

// Los placeholders se resuelven dinámicamente inspeccionando las propiedades del catálogo cargado.

const Ico = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d={d} />
  </svg>
)

const Ctx = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>{label}</span>
    {children}
  </div>
)

const Chip = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', background: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '3px 8px', fontSize: 11, gap: 5 }}>
    <span style={{ color: C.dim }}>{label}:</span>
    <b style={{ color: C.fg }}>{value}</b>
  </div>
)

/* Wrapper para la ruta pública /motor (sin AuthGate): el panel usa las CSS vars del
 * backoffice (--bg-1, --surface, ...) que viven scopeadas bajo .bo-root — acá se
 * inyectan standalone. Bajo /admin/motor el Backoffice ya las provee. */
export function MotorPlaygroundStandalone() {
  return (
    <div className="bo-root">
      <style>{BACKOFFICE_CSS}</style>
      <MotorPlaygroundPanel />
    </div>
  )
}

/* ── Prompt Final PRO: XML coloreado por ORIGEN del dato + mapa de nodos (ReactFlow)
 * + pantalla completa. Cada color = de qué tabla/placeholder salió esa línea. ── */
type PromptStep = { step: string; entries: { label: string; source?: string; body?: string }[] }

const OWNERS: Record<string, { label: string; color: string }> = {
  runtime: { label: 'Runtime (sesión)', color: '#3b82f6' },
  edad: { label: 'student_types (EDAD)', color: '#fbbf24' },
  nivel: { label: 'levels (NIVEL)', color: '#7dd3fc' },
  cruce: { label: 'age_level_matrix (E×N)', color: '#00b37e' },
  topico: { label: 'topics (TÓPICO)', color: '#818cf8' },
  reglas: { label: 'conversation_rules', color: '#a855f7' },
  template: { label: 'template (literal)', color: '#8e938f' },
  codigo: { label: 'resolver (código)', color: '#f87171' },
}
/* El dueño de cada campo NO se declara acá: se deriva del `source` que manda el resolver
 * (tabla.columna) usando el rótulo con el que ese campo sale en el prompt. Antes había un
 * mapa `seccion.Campo -> dueño` escrito a mano: quedaba viejo con cada cambio de template y
 * pintaba de gris —"texto fijo de la plantilla"— todo lo que no estuviera en la lista, que
 * es justamente lo que hacía imposible revisar de dónde venía un dato. */
function ownersFromSteps(steps: PromptStep[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const st of steps || []) {
    for (const e of st.entries || []) {
      const rotulo = (e as { campo_en_prompt?: string }).campo_en_prompt
      if (rotulo) map[rotulo] = ownerOfSource(e.source || '')
    }
  }
  return map
}

function ownerOfSource(src: string): string {
  if (!src) return 'runtime'
  if (src.startsWith('topics')) return 'topico'
  if (src.startsWith('student_types')) return 'edad'
  if (src.startsWith('levels')) return 'nivel'
  if (src.startsWith('age_level_matrix')) return 'cruce'
  if (src.includes('conversation_rules') || src.includes('universal')) return 'reglas'
  if (src.includes('resolver') || src.includes('composer')) return 'codigo'
  if (src.includes('template')) return 'template'
  return 'runtime'
}

/* Parser del prompt XML → árbol de secciones/campos/leyes para la vista Formateada. */
type PField = { kind: 'field'; key: string; value: string; section: string }
type PLaw = { kind: 'law'; n: string; text: string }
type PSection = { kind: 'section'; tag: string; children: (PSection | PField | PLaw)[] }

function parsePrompt(prompt: string): PSection {
  const root: PSection = { kind: 'section', tag: 'root', children: [] }
  const stack: PSection[] = [root]
  let last: PField | PLaw | null = null
  for (const raw of prompt.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const top = stack[stack.length - 1]
    const open = line.match(/^<([a-zA-Z_]+)>$/)
    const close = line.match(/^<\/([a-zA-Z_]+)>$/)
    if (open) { const n: PSection = { kind: 'section', tag: open[1], children: [] }; top.children.push(n); stack.push(n); last = null; continue }
    if (close) { if (stack.length > 1) stack.pop(); last = null; continue }
    const law = line.match(/^(\d+)\.\s+(.*)$/)
    if (top.tag === 'conversation_laws' && law) { const l: PLaw = { kind: 'law', n: law[1], text: law[2] }; top.children.push(l); last = l; continue }
    const field = line.match(/^([A-Za-z_]+):\s?(.*)$/)
    if (field && top.tag !== 'conversation_laws') { const f: PField = { kind: 'field', key: field[1], value: field[2], section: top.tag }; top.children.push(f); last = f; continue }
    if (last) { if (last.kind === 'law') last.text += ' ' + line; else last.value += ' ' + line } // continuación de línea larga
  }
  return root
}

/* Vista FORMATEADA (curada para leer): cards por sección, campos con badge del dueño,
 * leyes como lista numerada. El contenido es idéntico al crudo — cambia la presentación. */
function PromptPretty({ prompt, owners }: { prompt: string; owners: Record<string, string> }) {
  const tree = useMemo(() => parsePrompt(prompt), [prompt])
  const renderSection = (node: PSection, depth: number): React.ReactNode => {
    if (node.tag === 'root') return node.children.map((ch, i) => ch.kind === 'section' ? <div key={i}>{renderSection(ch, 0)}</div> : null)
    const laws = node.children.filter((c): c is PLaw => c.kind === 'law')
    return (
      <div style={{ background: depth === 0 ? C.bg : 'transparent', border: depth === 0 ? `1px solid ${C.border}` : 'none', borderRadius: 10, padding: depth === 0 ? '10px 12px' : '2px 0 2px 10px', marginBottom: depth === 0 ? 10 : 4, borderLeft: depth > 0 ? `2px solid ${C.border}` : undefined }}>
        <div style={{ fontSize: depth === 0 ? 11.5 : 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: C.dim, marginBottom: 6, fontFamily: 'ui-monospace, monospace' }}>{node.tag}</div>
        {laws.length > 0 && (
          <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {laws.map((l) => (
              <li key={l.n} value={Number(l.n)} style={{ fontSize: 12.5, lineHeight: 1.5, color: C.fg }}>
                <span style={{ borderLeft: `3px solid ${OWNERS.reglas.color}`, paddingLeft: 8, display: 'block' }}>{l.text}</span>
              </li>
            ))}
          </ol>
        )}
        {node.children.map((ch, i) => {
          if (ch.kind === 'section') return <div key={i}>{renderSection(ch, depth + 1)}</div>
          if (ch.kind === 'field') {
            const owner = owners[ch.key] || 'template'
            const ow = OWNERS[owner]
            return (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                <span title={ow.label} style={{ flexShrink: 0, minWidth: 150, fontSize: 10.5, fontWeight: 800, color: ow.color, fontFamily: 'ui-monospace, monospace', paddingTop: 1, borderLeft: `3px solid ${ow.color}`, paddingLeft: 7 }}>{ch.key}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, color: C.fg, whiteSpace: 'pre-wrap' }}>{ch.value}</span>
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }
  return <div>{renderSection(tree, 0)}</div>
}

/* Vista CRUDA: el texto LITERAL que recibe Gemini, byte a byte — con la MISMA paleta
 * de colores por dueño que usan la leyenda, el Formateado y el mapa de nodos (el
 * resaltado no altera el contenido; es para identificar la sección de un vistazo). */
function PromptRaw({ prompt, owners }: { prompt: string; owners: Record<string, string> }) {
  let section = ''
  let lastOwner = ''
  return (
    <pre style={{ margin: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.55, fontFamily: 'ui-monospace, monospace', color: C.fg }}>
      {prompt.split('\n').map((line, i) => {
        const tag = line.match(/^\s*<\/?([a-zA-Z_]+)>\s*$/)
        if (tag) {
          if (!line.includes('</')) section = tag[1]
          lastOwner = ''
          return <div key={i} style={{ color: '#38bdf8', fontWeight: 700 }}>{line}</div>
        }
        const field = line.match(/^(\s*)([A-Za-z_]+):/)
        let owner = ''
        if (section === 'conversation_laws') owner = 'reglas'
        else if (field) owner = owners[field[2]] || ''
        if (!owner && !field) owner = lastOwner
        if (owner) lastOwner = owner
        const col = owner ? OWNERS[owner]?.color : undefined
        return (
          <div key={i} style={{ borderLeft: `3px solid ${col || 'transparent'}`, paddingLeft: 8, marginLeft: 2 }}>
            {field && col ? (<><span style={{ color: col, fontWeight: 700 }}>{line.slice(0, field[0].length)}</span>{line.slice(field[0].length)}</>) : line}
          </div>
        )
      })}
    </pre>
  )
}

/* Ficha de contexto por dueño: cómo se llena ese campo (mecánica del resolver). */
const OWNER_EXPLAIN: Record<string, string> = {
  runtime: 'Se calcula al abrir la sesión (fecha, dispositivo, alumno). No vive en ninguna tabla: es contexto del momento.',
  edad: 'El resolver toma {EDAD:campo} y lo busca en student_types por el segmento del alumno. Cambia por EDAD; igual para todos sus niveles. Editable en ABM/lápiz.',
  nivel: 'El resolver toma {NIVEL:campo} y lo busca en levels por el código CEFR. Define el QUÉ lingüístico del alumno.',
  cruce: 'El resolver toma {EDAD_X_NIVEL:campo} de la fila age_level_matrix[edad, nivel] — la celda exacta de ESTE combo. El dato más específico del catálogo.',
  topico: 'El resolver toma {TOPICO:campo} del tópico elegido (topics): léxico y anclas. El tópico aporta contenido, nunca forma.',
  reglas: 'conversation_rules filtradas por gates (age_groups + min/max nivel): de las 12 de la tabla entran solo las que aplican a este combo.',
  template: 'Texto literal del template activo (orchestration_templates.body): no es placeholder, es el esqueleto del prompt.',
  codigo: 'Única pieza que vive en Python (orchestration_resolver): con NO ROLEPLAY declarado por la EDAD, el resolver suprime la escena del tópico y pone este texto fijo.',
}
/* Relaciones entre campos: qué toca a qué (para la ficha del nodo de detalle). */
const FIELD_RELATIONS: Record<string, string> = {
  comando_de_arranque: 'Interpola {name} (ALUMNO), {topic} y {first_vocab} (TÓPICO) en runtime. Gobierna SOLO el turno 1; convive con la ley universal 4 (una movida por turno).',
  formato_de_cierre_de_turno: 'Aplica a CADA turno. Trabaja en dúo con la CADENCIA (ritmo del cruce): el director inyecta la intensidad, este campo fija forma y largo.',
  accion_de_continuacion: 'Cada vuelta tras hablar el alumno. El director de orquesta (ritmo) le marca la intensidad de la próxima pregunta.',
  pasos_de_la_sesion: 'El mapa macro de la sesión (beats). El compás fino turno a turno lo lleva el director (age_level_matrix.ritmo).',
  reglas_universales_filtradas: 'Gateadas por EDAD y NIVEL: mini/A0-A1 reciben un bloque, B2+ otro. Editables regla por regla en el probador.',
  estilo_de_sesion: 'Marco de TODO el segmento (todas sus edades×niveles). El estilo declara la ida y vuelta; la cadencia la ejecuta.',
  anclas_narrativas: 'En teen/adult declara NO ROLEPLAY → el resolver suprime la escena del tópico (por eso Narrative_Anchors sale de código).',
  semillas: 'Vocabulario del tópico: {first_vocab} sale de acá. El coach las teje en la charla; forzarlas degrada la clase (medido).',
  gramatica_objetivo: 'El QUÉ del nivel. El coach lo PROVOCA en el alumno con sus preguntas — no lo actúa en su propia habla.',
  titulo: 'Puede quedar en español al hablarle al alumno (Language_Note lo permite): es el nombre del tema, no producción.',
}

function PromptFlow({ steps, height }: { steps: PromptStep[]; height: number | string }) {
  const [openStep, setOpenStep] = useState<number | null>(null)

  const { nodes, edges } = useMemo(() => {
    const nodes: import('reactflow').Node[] = []
    const edges: import('reactflow').Edge[] = []
    let y = 0
    const stepY: number[] = []
    ;(steps || []).forEach((st, i) => {
      const entries = st.entries || []
      const isOpen = openStep === i
      stepY.push(y)
      nodes.push({
        id: `s${i}`,
        position: { x: 0, y },
        data: {
          label: (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>{i + 1}. {st.step}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: isOpen ? 'var(--primary)' : '#8e938f' }}>
                  {isOpen ? 'cerrar detalle' : 'tocar para abrir'}
                </span>
              </div>
              {entries.map((ent, j) => {
                const ow = OWNERS[ownerOfSource(ent.source || '')]
                const preview = (ent.body || '').replace(/\s+/g, ' ').slice(0, 92)
                return (
                  <div key={j} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: ow.color, flexShrink: 0 }} />
                      <b>{ent.label}</b>
                      <span style={{ color: '#8e938f', fontFamily: 'ui-monospace, monospace', fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ent.source || 'runtime'}</span>
                    </div>
                    {preview && (
                      <div style={{ fontSize: 10, color: 'var(--fg-2)', paddingLeft: 13, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {preview}{(ent.body || '').length > 92 ? '…' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ),
        },
        style: {
          width: 480, borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-2)'}`,
          borderLeft: `4px solid ${OWNERS[ownerOfSource(entries[0]?.source || '')].color}`,
          background: 'var(--surface)', color: 'var(--fg-1)', padding: 10, fontSize: 11,
        },
      })
      if (i > 0) edges.push({ id: `e${i}`, source: `s${i - 1}`, target: `s${i}`, animated: true })
      y += 66 + entries.length * 34
    })

    // Nodos de DETALLE: se abren al costado del paso tocado — contenido completo + ficha.
    if (openStep != null && steps[openStep]) {
      let dy = stepY[openStep]
      ;(steps[openStep].entries || []).forEach((ent, j) => {
        const owner = ownerOfSource(ent.source || '')
        const ow = OWNERS[owner]
        const field = (ent.source || '').split('.').pop() || ent.label
        const relation = FIELD_RELATIONS[field] || FIELD_RELATIONS[ent.label] || null
        const body = ent.body || '(vacío)'
        nodes.push({
          id: `d${openStep}-${j}`,
          position: { x: 560, y: dy },
          data: {
            label: (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{ent.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ow.color, border: `1px solid ${ow.color}55`, background: `${ow.color}18`, borderRadius: 999, padding: '1px 7px' }}>{ow.label}</span>
                  <span style={{ fontSize: 9.5, color: '#8e938f', fontFamily: 'ui-monospace, monospace' }}>{ent.source || 'runtime'}</span>
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--fg-1)', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '8px 10px', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                  {body}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--fg-2)', lineHeight: 1.45 }}>
                  <b style={{ color: ow.color }}>Cómo se llena:</b> {OWNER_EXPLAIN[owner]}
                </div>
                {relation && (
                  <div style={{ fontSize: 9.5, color: 'var(--fg-2)', lineHeight: 1.45, marginTop: 4 }}>
                    <b>Relaciones:</b> {relation}
                  </div>
                )}
              </div>
            ),
          },
          style: {
            width: 470, borderRadius: 10, border: `1px solid ${ow.color}66`,
            borderLeft: `4px solid ${ow.color}`, background: 'var(--surface)',
            color: 'var(--fg-1)', padding: 10, fontSize: 11,
          },
        })
        edges.push({ id: `ed${openStep}-${j}`, source: `s${openStep}`, target: `d${openStep}-${j}`, animated: false, style: { stroke: ow.color } })
        dy += 250
      })
    }
    return { nodes, edges }
  }, [steps, openStep])

  return (
    <div style={{ height, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.bg }}>
      <ReactFlow
        nodes={nodes} edges={edges} fitView nodesConnectable={false}
        onNodeClick={(_, node) => {
          if (node.id.startsWith('s')) {
            const idx = Number(node.id.slice(1))
            setOpenStep((v) => (v === idx ? null : idx))
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

const btnT = (on: boolean): React.CSSProperties => ({
  background: on ? 'rgba(0,179,126,0.16)' : 'transparent',
  border: `1px solid ${on ? 'var(--primary)' : 'var(--border-2)'}`,
  color: on ? 'var(--primary)' : 'var(--fg-2)', borderRadius: 7, fontSize: 11, fontWeight: 700,
  padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
})

function PromptProSection({ prompt, steps }: { prompt: string; steps: PromptStep[] }) {
  // Dueño por rótulo, derivado de lo que manda el resolver — no hay lista a mano.
  const owners = useMemo(() => ownersFromSteps(steps), [steps])
  const [view, setView] = useState<'pretty' | 'raw' | 'flow'>('pretty')
  const [full, setFull] = useState(false)
  const content = (
    <div style={full
      ? { background: C.panel, padding: '10px 12px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' as const }
      : { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prompt Final Compilado (Gemini Live)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setView('pretty')} style={btnT(view === 'pretty')}>Formateado</button>
          <button onClick={() => setView('raw')} style={btnT(view === 'raw')} title="El texto LITERAL que recibe Gemini, byte a byte">Crudo (Gemini)</button>
          <button onClick={() => setView('flow')} style={btnT(view === 'flow')}>Mapa de nodos</button>
          <button onClick={() => { navigator.clipboard.writeText(prompt); toast.success('Prompt copiado al portapapeles') }} style={btnT(false)}>Copiar</button>
          <button onClick={() => setFull((v) => !v)} style={btnT(full)} title={full ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <Ico d={full ? 'M8 3v3a2 2 0 0 1-2 2H3 M21 8h-3a2 2 0 0 1-2-2V3 M3 16h3a2 2 0 0 1 2 2v3 M16 21v-3a2 2 0 0 1 2-2h3' : 'M8 3H5a2 2 0 0 0-2 2v3 M21 8V5a2 2 0 0 0-2-2h-3 M3 16v3a2 2 0 0 0 2 2h3 M16 21h3a2 2 0 0 0 2-2v-3'} size={13} />
            {full ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {Object.entries(OWNERS).map(([k, o]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.dim }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: o.color }} /> {o.label}
          </span>
        ))}
      </div>
      {view === 'flow'
        ? (<div style={full ? { flex: 1, minHeight: 0 } : {}}><PromptFlow steps={steps} height={full ? '100%' : 460} /></div>)
        : (
          <div style={full ? { flex: 1, minHeight: 0, overflowY: 'auto' } : { maxHeight: 460, overflowY: 'auto' }}>
            {view === 'pretty' ? <PromptPretty prompt={prompt} owners={owners} /> : <PromptRaw prompt={prompt} owners={owners} />}
          </div>
        )}
    </div>
  )
  if (!full) return <div style={{ marginTop: 20 }}>{content}</div>
  // Pantalla completa: layout flex sin chrome — el canvas cubre el 100% del viewport
  // menos la barrita de header/leyenda, sin números mágicos (su alto puede variar).
  return <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: C.bg, display: 'flex', flexDirection: 'column' }}>{content}</div>
}

export default function MotorPlaygroundPanel() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<Band[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // Datos crudos del catálogo para la edición JIT en línea
  const [studentTypesRows, setStudentTypesRows] = useState<any[]>([])
  const [levelsRows, setLevelsRows] = useState<any[]>([])
  const [topicsRows, setTopicsRows] = useState<any[]>([])
  const [appConfigRows, setAppConfigRows] = useState<any[]>([])

  const [band, setBand] = useState('mini')
  const [level, setLevel] = useState('A0')
  // Idioma que se aprende. El catálogo NUNCA lo escribe (dice {idioma}), así que el MISMO cruce
  // se compone y se habla en cualquier idioma: sirve para probar el motor sin esa variable encima.
  // La LISTA sale de la tabla `languages` — sumar uno es un INSERT, no un build.
  const [targetLang, setTargetLang] = useState('en')
  const [languages, setLanguages] = useState<{ code: string; label: string; name_native?: string }[]>([])
  const [topicId, setTopicId] = useState<number | undefined>()
  // Categoría del tópico: el eje que antes venía disfrazado dentro de "Objetivo".
  // '' = todas.
  const [topicCat, setTopicCat] = useState<string>('')
  // Disciplina: 'todos' o el valor de categories.discipline / levels.discipline.
  // Es string libre a propósito — van a entrar cursos de otras disciplinas y no
  // hay que volver a tocar este tipo cada vez.
  const [discipline, setDiscipline] = useState<string>('idiomas')
  // Lista de disciplinas que manda el backend (categories ∪ levels)
  const [apiDisciplines, setApiDisciplines] = useState<string[]>([])
  // discipline -> family ('lenguaje' | 'conocimiento'). Decide de qué escalera cuelga el nivel.
  const [disciplineFamilies, setDisciplineFamilies] = useState<Record<string, string>>({})
  // Cruces edad×nivel que existen en age_level_matrix ("adult:B2"). Sin la fila
  // el motor no tiene instrucciones y el combo no compone.
  const [matrixCruces, setMatrixCruces] = useState<string[]>([])
  const [studentId, setStudentId] = useState<number | undefined>(undefined)
  const [profile, setProfile] = useState<{ student_id: number; name: string } | null>(null)

  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('Contexto')
  // Mesa de pruebas dockeada abajo: abierta por defecto, colapsable a una barra.
  // Adentro, 3 filas colapsables por separado; por defecto solo Clase en VIVO abierta.
  const [dockOpen, setDockOpen] = useState(true)
  const [openRows, setOpenRows] = useState({ srs: false, sim: false, vivo: true })
  
  // Estado del JIT inline editor
  const [editTable, setEditTable] = useState<string | null>(null)
  const [editPk, setEditPk] = useState<any>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState<string>('')
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [editIsArray, setEditIsArray] = useState(false)
  const [editRuleId, setEditRuleId] = useState<number | null>(null)

  // loop de aprendizaje
  const [presets, setPresets] = useState<MotorPreset[]>([])
  const [obsText, setObsText] = useState('')
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MotorStageNote[]>([])

  // Simulación Gemini Real
  const [simulatingGemini, setSimulatingGemini] = useState(false)
  const [geminiStartResponse, setGeminiStartResponse] = useState<string | null>(null)
  const [geminiClosingResponse, setGeminiClosingResponse] = useState<string | null>(null)

  // Carga de dimensiones iniciales
  const loadDimensions = useCallback(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
      setLanguages(d.languages || [])
      setApiDisciplines(d.disciplines || [])
      setDisciplineFamilies(d.discipline_families || {})
      setMatrixCruces(d.matrix_cruces || [])
    }).catch(() => {})
  }, [])

  // Carga de datos crudos del catálogo para la edición en el lugar
  const loadCatalogData = useCallback(() => {
    motorAPI.rows('student_types').then(setStudentTypesRows).catch(() => {})
    motorAPI.rows('levels').then(setLevelsRows).catch(() => {})
    motorAPI.rows('topics').then(setTopicsRows).catch(() => {})
    motorAPI.rows('app_config').then(setAppConfigRows).catch(() => {})
  }, [])

  useEffect(() => {
    loadDimensions()
    loadCatalogData()
  }, [loadDimensions, loadCatalogData])

  // Al cambiar edad/nivel, cargo el perfil del nivel
  useEffect(() => {
    motorAPI.profile(band, level).then((p) => setProfile({ student_id: p.student_id, name: p.name })).catch(() => setProfile(null))
  }, [band, level])

  const effStudent = useMemo(() => studentId ?? profile?.student_id, [studentId, profile])

  // El ALUMNO manda: al elegirlo, el cruce (edad + nivel) se alinea a SU perfil —
  // sin esto podías elegir "Lucas (B2)" y componer A2 (bug reportado por el dueño).
  //
  // Y el nivel se busca POR MATERIA: el mismo alumno puede ser B2 en inglés, A1 en
  // francés y principiante en historia. `levels_by_materia` es el override; si esa
  // materia no tiene nivel propio, cae al del perfil. La materia es el idioma cuando
  // la familia es `lenguaje`, y la disciplina cuando es `conocimiento`.
  useEffect(() => {
    if (studentId == null) return
    const s = students.find((x) => x.student_id === studentId)
    if (!s) return
    if (s.age_group && bands.some((b) => b.code === s.age_group)) setBand(s.age_group)
    const materia = (disciplineFamilies[discipline] || 'lenguaje') === 'lenguaje'
      ? (targetLang || s.target_language || 'en')
      : discipline
    // EL NIVEL LO MANDA EL COMBO. Punto.
    //
    // El perfil del alumno NO lo pisa, y esa es la regla: si elegiste Inicial, es Inicial. Antes
    // este efecto tomaba el nivel del alumno y lo aplicaba, con un fallback al `cefr_level`
    // global cuando no tenía uno para la materia. Y como TODOS los idiomas comparten la escalera
    // A0..C2, el B2 de inglés de Lucas se aplicaba a una clase de portugués sin decir nada:
    // ponías Inicial y la clase arrancaba en B2.
    //
    // El combo ya viene con un valor cargado (arranca en el primer escalón), así que nunca queda
    // vacío y no hace falta que nadie lo complete por atrás. Lo único que sí sale del alumno es
    // su EDAD, que no depende de la materia.
  }, [studentId, students, bands])

  // Clase en VIVO — charla REAL por voz (solo audio, sin imágenes) contra el motor
  // único (ws_motor → compose_proto), con el MISMO combo que se está previsualizando.
  const live = useLiveVoice({ onError: (e) => toast.error(`Voz: ${e.message}`) })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'
  const liveTranscriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { liveTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [live.transcript])
  // Cortar la sesión de voz si el usuario navega fuera del panel con la clase abierta.
  const liveStopRef = useRef(live.stop)
  liveStopRef.current = live.stop
  useEffect(() => () => { liveStopRef.current() }, [])

  // Cadencia de la charla: onda de intensidad ad-hoc para la próxima clase de prueba
  // (0=icebreaker, 1=normal, 2=profunda, 3=filosa; se cicla). Vacío = la del cruce.
  const [cadencia, setCadencia] = useState('')

  // Modelo Live. Es un selector y no una constante porque los `preview` de Google
  // cambian sin aviso: el 2026-08-16 el 3.1 dejó de devolver la transcripción del
  // ALUMNO (el coach seguía hablando, pero el alumno no aparecía) sin que cambiara
  // una línea de acá. Poder alternar en el momento evita un deploy por prueba.
  const [liveModel, setLiveModel] = useState('models/gemini-3.1-flash-live-preview')
  // Prompt mínimo hardcodeado en vez del compuesto: aísla la cadena de voz del motor.
  const [infraTest, setInfraTest] = useState(false)
  // Densidad del prompt: 0 entera · 1 light · 2 mega light · 3 mega mega light.
  // Misma estructura en todas — sólo cambia cuánto contenido lleva cada bloque.
  const [promptLevel, setPromptLevel] = useState(0)
  // Peldaño de densidad: cada uno es un TEMPLATE de verdad (orchestration_templates), con los
  // mismos placeholders y el mismo resolver — no un prompt escrito a mano. Van de menos a más y
  // son acumulativos: L1 esqueleto … L5 guion y leyes … L6 = el activo (semillas incluidas).
  // Así lo que se mide es el motor, y el peldaño que gane se publica con active=1, no se porta.
  const [templateId, setTemplateId] = useState(0)
  // Modo CLASE: el mismo `live` de siempre, pero visto como lo ve el alumno — orbe y
  // subtitulos, sin combos ni paneles. El probador sirve para diagnosticar; esto sirve para
  // SENTIR si la charla esta viva, que es lo unico que el visor no puede decir.
  const [modoClase, setModoClase] = useState(false)
  // Lo que los destiladores sacaron de la clase que acaba de terminar. Corren en BACKGROUND al
  // cerrar el WebSocket, asi que no estan listos en el instante: se consulta unos segundos
  // despues y cada bloque avisa si todavia no llego.
  const [postClase, setPostClase] = useState<any>(null)
  const [buscandoPost, setBuscandoPost] = useState(false)
  // La transcripcion se sigue sola: sin esto hay que scrollear a mano en cada turno.
  const finTranscriptRef = useRef<HTMLDivElement>(null)
  // Verificación de ESQUEMA: compara qué fila usó el motor contra cuál le correspondía al
  // flujo elegido. No lee el contenido — analizar texto ("dice 'dog' en una clase de
  // ferretería") es infinito; comparar claves es finito y se prueba mirando la base.
  const [verif, setVerif] = useState<MotorVerificacion | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [templates, setTemplates] = useState<Array<{ id: number; name: string; notes: string; active: number; chars: number }>>([])
  useEffect(() => {
    let vivo = true
    motorAPI.templates()
      .then((r) => { if (vivo) setTemplates(r.templates ?? []) })
      .catch(() => { if (vivo) setTemplates([]) })
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    if (modoClase) finTranscriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [live.transcript.length, modoClase])

  const startLiveClass = useCallback(async () => {
    setModoClase(true)  // la clase se prueba en la pantalla del alumno, no en el panel
    const params: Record<string, string | number> = {
      age_group: band, level_code: level, topic_id: topicId ?? 0, student_id: effStudent ?? 0,
      engine: 'gemini_live', model: liveModel, voice: 'Aoede',
      target_language: targetLang,
    }
    const cad = cadencia.replace(/[^\d,]/g, '')
    if (cad) params.cadencia = cad
    if (infraTest) params.infra_test = 1
    if (promptLevel) params.prompt_level = promptLevel
    if (templateId) params.template_id = templateId
    const url = buildMotorWsUrl(params)
    setModoClase(true)
    await live.start(0, undefined, 'Aoede', url)
  }, [live, band, level, topicId, effStudent, cadencia, targetLang, liveModel, infraTest, promptLevel, templateId])

  // Terminar clase: además de cortar, la charla alimenta la MEMORIA del alumno elegido
  // (post-clase del probador → observaciones → protocolo SRS → pilar HISTORIA).
  const endLiveClass = useCallback(async () => {
    const transcript = live.transcript.map((l) => ({ who: l.who, text: l.text }))
    live.stop()
    if (!effStudent || transcript.length === 0) return
    try {
      const r = await motorAPI.liveClassEnd({ student_id: effStudent, level_code: level, transcript })
      if (r.observations?.length) {
        const name = students.find((s) => s.student_id === effStudent)?.name || 'el alumno'
        toast.success(`Memoria de ${name} actualizada`, {
          description: r.observations.join(' · ').slice(0, 180),
        })
        motorAPI.studentPresets(effStudent).then((pr) => setPresets(pr.presets || [])).catch(() => {})
      }
    } catch {
      toast.error('La clase terminó pero no se pudo actualizar la memoria del alumno')
    }
    // El analisis y la destilacion corren en background del lado del server. Se espera un
    // toque y se pide: si todavia no esta, el panel lo dice y hay un boton para reintentar.
    setBuscandoPost(true)
    setTimeout(() => {
      motorAPI.postclaseUltima(effStudent)
        .then(setPostClase)
        .catch(() => setPostClase({ hay: false, motivo: 'no se pudo leer el post-clase' }))
        .finally(() => setBuscandoPost(false))
    }, 6000)
  }, [live, effStudent, level, students])

  const refrescarPostClase = useCallback(() => {
    if (!effStudent) return
    setBuscandoPost(true)
    motorAPI.postclaseUltima(effStudent)
      .then(setPostClase)
      .catch(() => setPostClase({ hay: false, motivo: 'no se pudo leer el post-clase' }))
      .finally(() => setBuscandoPost(false))
  }, [effStudent])

  // Resolve JIT de orquestación (Motor V2)
  const resolve = useCallback(() => {
    setLoading(true); setErr(null)
    motorAPI.previewV2({
      age_group: band, level: level, topic_id: topicId ?? null, student_id: effStudent ?? null,
      target_language: targetLang,
    }).then((d) => {
      setRes(d)
    }).catch((e) => { setErr(e?.response?.data?.detail || 'Error'); setRes(null) })
      .finally(() => setLoading(false))
  }, [band, level, topicId, effStudent, targetLang])

  useEffect(() => { resolve() }, [resolve])

  // Catálogo aplanado, sin filtrar. Sirve para contar cuántos tópicos sobreviven
  // a cada combinación y poder deshabilitar los combos muertos.
  const allTopicsFlat = useMemo<Topic[]>(() => {
    const out: Topic[] = []
    catalog.forEach((cat: any) => {
      cat.subcategories?.forEach((sub: any) => {
        sub.topics?.forEach((t: any) => {
          // levels llega como JSON string desde MySQL o como array — normalizamos
          let lv: string[] | undefined
          if (Array.isArray(t.levels)) lv = t.levels
          else if (typeof t.levels === 'string') { try { lv = JSON.parse(t.levels) } catch { lv = undefined } }
          out.push({
            topic_id: t.id || t.topic_id,
            title: t.title,
            segmento: t.segmento,
            levels: lv,
            category: t.category || cat.name || cat.slug,
            // El combo muestra el NOMBRE de la categoría; el slug queda para filtrar
            categoryLabel: t.category_label || t.category || cat.name || cat.slug,
            discipline: t.discipline,
          })
        })
      })
    })
    return out
  }, [catalog])

  /** Cuántos tópicos sobreviven a esa combinación. 0 = combo muerto. */
  const contar = useCallback(
    (sel: { discipline?: string; band?: string; level?: string; cat?: string }) =>
      allTopicsFlat.filter((t) => pasaCadena(t, sel)).length,
    [allTopicsFlat])

  /** ¿El motor tiene instrucciones para ese cruce edad × nivel? */
  const cruceExiste = useCallback(
    (b: string, l: string) => matrixCruces.length === 0 || matrixCruces.includes(`${b}:${l}`),
    [matrixCruces])

  // Lista filtrada de tópicos sugeridos para el segmento actual
  const topics = useMemo<Topic[]>(() => {
    return allTopicsFlat
      .filter((t) => pasaCadena(t, { discipline, band, level }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [allTopicsFlat, band, level, discipline])

  // Categorías presentes en los tópicos ya filtrados por edad+nivel, con su
  // conteo. Es el eje que antes estaba escondido dentro de "Objetivo".
  const topicCategories = useMemo(() => {
    const m = new Map<string, { n: number; label: string }>()
    topics.forEach((t) => {
      const k = t.category || ''
      if (!k) return
      const prev = m.get(k)
      m.set(k, { n: (prev?.n || 0) + 1, label: t.categoryLabel || k })
    })
    return [...m.entries()].map(([k, v]) => [k, v.n, v.label] as [string, number, string])
      .sort((a, b) => a[2].localeCompare(b[2]))
  }, [topics])

  // Tópicos que entran en el select, ya acotados por la categoría elegida
  const topicsInCategory = useMemo(
    () => (topicCat ? topics.filter((t) => (t.category || '') === topicCat) : topics),
    [topics, topicCat],
  )

  // ── Reacomodo en cascada ──────────────────────────────────────────────
  // Al mover un eslabón, los de abajo pueden quedar en un valor que ya no
  // existe (elegís Música y la edad seguía en "junior", que no tiene tópicos).
  // En vez de dejar el combo muerto, se salta al primer valor que sí sirve.

  // 1. Edad: si la disciplina elegida no tiene tópicos para esta banda
  useEffect(() => {
    if (!bands.length || !allTopicsFlat.length) return
    if (contar({ discipline, band }) > 0) return
    const alt = bands.find((b) => contar({ discipline, band: b.code }) > 0)
    if (alt && alt.code !== band) setBand(alt.code)
  }, [discipline, band, bands, allTopicsFlat, contar])

  // 3. Categoría: si la elegida ya no existe en el nuevo recorte
  useEffect(() => {
    if (topicCat && !topicCategories.some(([c]) => c === topicCat)) setTopicCat('')
  }, [topicCategories, topicCat])

  // 4. Tópico: si el elegido se cayó del recorte, queda SIN tópico — nunca otro.
  //
  // Antes agarraba `topicsInCategory[0]`, el primero de la lista nueva. En silencio. Elegías
  // "Backpacking vs hotel", movías cualquier otro combo, y la clase arrancaba con "Cine vs
  // streaming en casa" sin que nada te lo dijera. Pasó dos veces hoy: la otra fue una clase de
  // mecánica que terminó siendo de "Causas que me importan".
  //
  // Vaciar es peor UX que autocompletar, y es la única opción honesta: un combo vacío se ve,
  // un tópico cambiado por atrás no. Es la misma regla que el motor aplica con los datos que le
  // faltan — antes que inventar uno, no hay.
  useEffect(() => {
    if (topicId && !topicsInCategory.some((t) => t.topic_id === topicId)) setTopicId(undefined)
  }, [topicsInCategory, topicId])


  // La disciplina de cada nivel llega como DATO (levels.discipline). Antes se
  // adivinaba con level_code.startsWith('FON'), que se rompía con cualquier
  // disciplina nueva. El tope por edad sólo aplica a los niveles de idiomas:
  // una disciplina como fonética tiene su propia progresión.
  // Disciplinas: las manda el backend (categorías ∪ niveles). No se derivan de
  // los niveles solos porque las disciplinas nuevas reusan los 7 de idiomas.
  const disciplines = useMemo(
    () => (apiDisciplines.length
      ? apiDisciplines
      : [...new Set(levels.map((l) => l.discipline || 'idiomas'))].sort()),
    [apiDisciplines, levels],
  )

  // Niveles de la disciplina elegida, en cascada:
  //   1. escala PROPIA de la disciplina  (fonética → FONR, y nada más)
  //   2. escala de su FAMILIA            (informática/carpintería → CON1-CON4;
  //                                       inglés/francés → A0-C2)
  // La familia es lo que decide qué significa "nivel": en `lenguaje` el idioma ES el
  // objeto de estudio, en `conocimiento` es el vehículo. Antes esto caía SIEMPRE a
  // idiomas, y por eso una clase de informática pedía Present Perfect.
  const levelsForBand = useMemo(() => {
    const mx = bands.find((b) => b.code === band)?.max_level_order ?? 99
    if (discipline === 'todos') return levels
    const propios = levels.filter((l) => (l.discipline || 'idiomas') === discipline)
    const fam = disciplineFamilies[discipline] || 'lenguaje'
    const base = propios.length > 0
      ? propios
      : levels.filter((l) => (l.family || 'lenguaje') === fam)
    // El tope por edad (mini→A2, junior→B1) es de la escalera de idiomas: mide
    // competencia lingüística, no cuánto sabe de carpintería.
    return base.filter((l) => (l.discipline || 'idiomas') !== 'idiomas' || l.sort_order <= mx)
  }, [levels, bands, band, discipline, disciplineFamilies])

  // 2. Nivel: si el cruce no existe en la matriz o quedó sin tópicos
  useEffect(() => {
    if (!levelsForBand.length) return
    const actualOk = levelsForBand.some((l) => l.level_code === level)
      && cruceExiste(band, level) && contar({ discipline, band, level }) > 0
    if (actualOk) return
    const alt = levelsForBand.find((l) =>
      cruceExiste(band, l.level_code) && contar({ discipline, band, level: l.level_code }) > 0)
    if (alt && alt.level_code !== level) setLevel(alt.level_code)
  }, [discipline, band, level, levelsForBand, cruceExiste, contar])


  const handleDisciplineChange = (newDisc: string) => {
    setDiscipline(newDisc)
    if (newDisc === 'todos') return
    // Si el nivel actual no pertenece a la ESCALERA de la disciplina elegida, saltar
    // al primero que sí. Se compara por familia (no por disciplina) porque las
    // materias de conocimiento comparten una sola escalera.
    const fam = disciplineFamilies[newDisc] || 'lenguaje'
    const propios = levels.filter((l) => (l.discipline || 'idiomas') === newDisc)
    const escalera = propios.length > 0 ? propios : levels.filter((l) => (l.family || 'lenguaje') === fam)
    if (escalera.length && !escalera.some((l) => l.level_code === level)) setLevel(escalera[0].level_code)
    // Y lo mismo con el tópico: se elige por disciplina, no por su título.
    const t = topics.find((x) => (x.discipline || 'idiomas') === newDisc)
    if (t) setTopicId(t.topic_id)
  }

  // ── "Qué aprende": UN combo en vez de dos ────────────────────────────────────
  // Antes había que elegir "Disciplina: Idiomas" y después "Idioma de la clase:
  // Inglés" — dos pasos para una sola decisión, y el combo de idioma significaba
  // cosas distintas según la disciplina (en Idiomas era QUÉ aprendés, en
  // Informática era CON QUÉ). Ahora la materia es una sola lista: los idiomas
  // aparecen como materias, agrupados por familia con <optgroup>.
  //   valor "lang:en"       -> familia lenguaje, se aprende inglés
  //   valor "disc:oficios"  -> familia conocimiento, se aprende el oficio
  const materia = (disciplineFamilies[discipline] || 'lenguaje') === 'lenguaje' && discipline === 'idiomas'
    ? `lang:${targetLang}`
    : `disc:${discipline}`

  const handleMateriaChange = (v: string) => {
    if (v.startsWith('lang:')) {
      const code = v.slice(5)
      setTargetLang(code)
      if (discipline !== 'idiomas') handleDisciplineChange('idiomas')
    } else {
      handleDisciplineChange(v.slice(5))
    }
  }

  // En `conocimiento` el idioma es una perilla (carpintería en francés); en `lenguaje`
  // es lo que se aprende, así que elegirlo aparte sería elegir dos veces lo mismo.
  const esConocimiento = (disciplineFamilies[discipline] || 'lenguaje') === 'conocimiento'

  // Materias de conocimiento: todo lo que no es la disciplina "idiomas" (que se
  // despliega idioma por idioma). Sale del dato, así una materia nueva aparece sola.
  const materiasPorFamilia = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const d of disciplines) {
      if (d === 'idiomas') continue
      const fam = disciplineFamilies[d] || 'conocimiento'
      ;(out[fam] ||= []).push(d)
    }
    return out
  }, [disciplines, disciplineFamilies])

  useEffect(() => {
    if (levelsForBand.length && !levelsForBand.some((l) => l.level_code === level)) {
      setLevel(levelsForBand[0].level_code)
    }
  }, [levelsForBand, level])

  // Carga de presets de memoria del alumno
  useEffect(() => {
    if (effStudent) {
      motorAPI.studentPresets(effStudent).then((r) => setPresets(r.presets || [])).catch(() => setPresets([]))
    }
  }, [effStudent])

  const wipeProfile = async () => {
    if (!effStudent) return
    if (!window.confirm('¿Seguro querés borrar el historial y memoria SRS simulados para este perfil?')) return
    try {
      await motorAPI.wipeProfile(effStudent)
      toast.success('Memoria del alumno reseteada')
      // Los chips salen de `presets`: sin recargarlos, la UI sigue mostrando la memoria
      // borrada y parece que el botón no hizo nada (igual que runClass/endLiveClass).
      setPresets((await motorAPI.studentPresets(effStudent)).presets || [])
      resolve()
    } catch { toast.error('No se pudo borrar') }
  }

  // Loop de aprendizaje: correr turno simulado
  const runClass = async () => {
    if (effStudent == null) { toast.error('Elegí edad y nivel'); return }
    const observations = obsText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!observations.length) { toast.error('Escribí al menos una observación de la clase'); return }
    setRunning(true)
    try {
      const r = await motorAPI.protocolRun({ student_id: effStudent, level_code: level, observations })
      if (r.error) { toast.error(`Protocolo: ${r.error}`); return }
      const nuevos = r.new_presets?.length || 0, ref = r.reinforced?.length || 0, mrg = r.merged?.length || 0
      setLastRun(`${r.applied || 0} aplicados · ${nuevos} nuevos · ${ref} reforzados${mrg ? ` · ${mrg} fusionados` : ''}`)
      setAnalysis(r.stage_analysis || [])
      setObsText('')
      resolve()
      if (effStudent) motorAPI.studentPresets(effStudent).then((pr) => setPresets(pr.presets || []))
      toast.success('Clase procesada · la memoria cambió')
    } catch { toast.error('No se pudo procesar la clase') } finally { setRunning(false) }
  }

  const handleSimulateGemini = async (mode: 'start' | 'closing') => {
    if (!res?.prompt) {
      toast.error('No hay prompt compilado para simular')
      return
    }
    setSimulatingGemini(true)
    if (mode === 'start') setGeminiStartResponse(null)
    else setGeminiClosingResponse(null)
    
    try {
      const data = await motorAPI.simulatePreview(res.prompt, mode)
      if (mode === 'start') {
        setGeminiStartResponse(data.response)
      } else {
        setGeminiClosingResponse(data.response)
      }
      toast.success('Respuesta de Gemini recibida')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `No se pudo simular con Gemini (${mode})`)
    } finally {
      setSimulatingGemini(false)
    }
  }

  const parseAllUniversalRules = (rawText: string): Record<number, string> => {
    if (!rawText) return {}
    const cleanText = rawText.replace(/<\/?(conversation_rules)>/g, '').trim()
    const parsed: Record<number, string> = {}
    let currentNum: number | null = null
    let currentText: string[] = []
    
    const lines = cleanText.split('\n')
    for (let line of lines) {
      const lineStripped = line.trim()
      if (!lineStripped) continue
      
      const m = lineStripped.match(/^(\d+)\.\s*(.*)$/)
      if (m) {
        if (currentNum !== null) {
          parsed[currentNum] = currentText.join('\n').trim()
        }
        currentNum = parseInt(m[1])
        currentText = [m[2]]
      } else {
        if (currentNum !== null) {
          currentText.push(lineStripped)
        }
      }
    }
    if (currentNum !== null) {
      parsed[currentNum] = currentText.join('\n').trim()
    }
    return parsed
  }

  const reconstructUniversalRules = (rawText: string, ruleId: number, newBody: string): string => {
    const parsed = parseAllUniversalRules(rawText)
    parsed[ruleId] = newBody.trim()
    
    const keys = Object.keys(parsed).map(Number).sort((a, b) => a - b)
    const maxKey = keys.length > 0 ? Math.max(...keys) : 16
    
    const lines: string[] = []
    lines.push('<conversation_rules>')
    for (let i = 1; i <= maxKey; i++) {
      const body = parsed[i]
      if (body) {
        const bodyLines = body.split('\n')
        const firstLine = bodyLines[0]
        const restLines = bodyLines.slice(1)
        lines.push(`  ${i}. ${firstLine}`)
        for (let rl of restLines) {
          lines.push(`     ${rl}`)
        }
      }
    }
    lines.push('</conversation_rules>')
    return lines.join('\n')
  }

  const startEditUniversalRule = (ruleId: number) => {
    const row = appConfigRows.find(r => r.config_key === 'universal_conversation_rules')
    const rawRules = row ? row.config_value : ''
    
    const parsed = parseAllUniversalRules(rawRules)
    const ruleBody = parsed[ruleId] || ''
    
    setEditTable('app_config')
    setEditPk({ config_key: 'universal_conversation_rules' })
    setEditField('universal_conversation_rules')
    setEditRuleId(ruleId)
    setEditLabel(`Regla Universal DB #${ruleId}`)
    setEditVal(ruleBody)
    setEditIsArray(false)
  }

  // JIT Editor: arrancar edición de una celda
  const startEditField = (table: string, field: string) => {
    let pk: any = null
    let val: any = ''
    let label = `${table}.${field}`

    if (table === 'student_types') {
      pk = { slug: band }
      val = studentTypesRows.find(r => r.slug === band)?.[field] || ''
    } else if (table === 'levels') {
      pk = { code: level }
      val = levelsRows.find(r => r.code === level)?.[field] || ''
    } else if (table === 'topics') {
      pk = { id: topicId }
      val = topicsRows.find(r => r.id === topicId)?.[field] || ''
    } else if (table === 'app_config') {
      pk = { config_key: field }
      val = appConfigRows.find(r => r.config_key === field)?.config_value || ''
    }

    // Si el valor original es un array de Strings o números, lo mostramos uno por línea para facilidad de edición
    const isArr = Array.isArray(val)
    setEditIsArray(isArr)
    if (isArr) {
      val = val.map((item: any) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('\n')
    } else if (typeof val === 'object' && val !== null) {
      val = JSON.stringify(val, null, 2)
    }

    setEditTable(table)
    setEditPk(pk)
    setEditField(field)
    setEditLabel(label)
    setEditVal(val)
  }

  const handleEditEntry = (source: string) => {
    const parts = source.split('.')
    if (parts.length === 2) {
      startEditField(parts[0], parts[1])
    }
  }

  const handlePlaceholderClick = (ph: string) => {
    // 1. Mapear alias comunes a nombres reales de columnas/campos de BD
    let field = ph
    if (ph === 'tutor') field = 'tutor_mascot'
    if (ph === 'pedagogical_rules') field = 'pedagogy'

    // 2. Inspeccionar dinámicamente si el campo pertenece a alguna tabla del catálogo
    const hasInStudentTypes = studentTypesRows.length > 0 && field in studentTypesRows[0]
    if (hasInStudentTypes) {
      startEditField('student_types', field)
      return
    }

    const hasInLevels = levelsRows.length > 0 && field in levelsRows[0]
    if (hasInLevels) {
      startEditField('levels', field)
      return
    }

    const hasInTopics = topicsRows.length > 0 && field in topicsRows[0]
    if (hasInTopics) {
      startEditField('topics', field)
      return
    }

    const hasInConfig = appConfigRows.some(r => r.config_key === ph || r.config_key === field)
    if (hasInConfig) {
      startEditField('app_config', field)
      return
    }

    // 3. Fallback para variables de contexto dinámico (no editables en BD)
    if (['name', 'topic', 'first_vocab', 'word'].includes(ph)) {
      toast.info(`El placeholder {${ph}} se calcula dinámicamente en tiempo de ejecución para cada sesión.`)
    } else {
      toast.error(`El placeholder {${ph}} no coincide con ningún campo editable en la base de datos.`)
    }
  }

  const saveEdit = async () => {
    if (!editTable || !editPk || !editField) return
    setSaving(true)
    try {
      let finalVal: any = editVal
      if (editIsArray) {
        // Si el valor era originalmente un Array, convertimos cada línea en un elemento del Array
        finalVal = editVal.split('\n').map(s => s.trim()).filter(Boolean)
        finalVal = finalVal.map((item: string) => {
          if (item.startsWith('{') || item.startsWith('[')) {
            try { return JSON.parse(item) } catch { return item }
          }
          return item
        })
      } else {
        // Fallbacks heredados
        if (editTable === 'topics' && editField === 'keywords') {
          try { finalVal = JSON.parse(editVal) } catch { finalVal = editVal.split(',').map(s => s.trim()).filter(Boolean) }
        }
      }
      
      // Si editamos una regla universal individual, la reconstruimos en la cadena completa de la BD
      if (editTable === 'app_config' && editField === 'universal_conversation_rules' && editRuleId !== null) {
        const row = appConfigRows.find(r => r.config_key === 'universal_conversation_rules')
        const currentRaw = row ? row.config_value : ''
        finalVal = reconstructUniversalRules(currentRaw, editRuleId, editVal)
      }

      // Si editamos app_config, el campo destino es 'config_value'
      const updatePayload = editTable === 'app_config' ? { config_value: finalVal } : { [editField]: finalVal }
      
      await motorAPI.update(editTable, editPk, updatePayload)
      toast.success('Plantilla del catálogo guardada con éxito')
      setEditTable(null)
      setEditRuleId(null)
      loadCatalogData()
      resolve()
    } catch {
      toast.error('No se pudo guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const cleanXmlTags = (text: string) => {
    if (!text) return ''
    return text.replace(/<\/?(conversation_rules|start_execution_command|behavioral_guards|session_actions|output_rules|learner_state|interaction_state|lesson_approach|session_rails)>/g, '').trim()
  }

  // Renderizador JIT de texto con resaltado e interacción de placeholders
  const renderBodyWithPlaceholders = (rawText: string) => {
    if (!rawText) return null
    const text = cleanXmlTags(rawText)
    const regex = /(\{[a-zA-Z0-9_-]+\})/g
    const parts = text.split(regex)
    return parts.map((part, i) => {
      const isPh = part.startsWith('{') && part.endsWith('}')
      if (isPh) {
        const cleanPh = part.replace(/[{}]/g, '')
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); handlePlaceholderClick(cleanPh) }}
            title="Tocar para editar esta plantilla"
            style={{
              background: 'rgba(56,189,248,0.14)',
              color: '#38bdf8',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700,
              cursor: 'pointer',
              margin: '0 2px',
              border: '1.2px solid rgba(56,189,248,0.4)',
              fontSize: '11.5px',
              userSelect: 'none',
              display: 'inline-block',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  // Cada ley de conversación es una FILA de `conversation_rules`, con su slug y su propio
  // gateo (edades / min / max nivel). El visor las pegaba en un solo bloque de texto: no se
  // podía saber cuál era cuál, ni por qué una entró y otra se cayó, sin ir a la base.
  const renderRuleItems = (items: Array<{ n: number; slug?: string; texto: string; gateo?: { age_groups?: unknown; min_level?: string | null; max_level?: string | null } }>) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((it) => {
        const g = it.gateo || {}
        const ages = Array.isArray(g.age_groups) ? (g.age_groups as string[]).join('/') : String(g.age_groups ?? 'todas')
        const rango = g.min_level || g.max_level ? `${g.min_level ?? '·'}→${g.max_level ?? '·'}` : 'todos los niveles'
        return (
          <div key={it.n} style={{ borderLeft: `3px solid ${OWNERS.reglas.color}`, paddingLeft: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: OWNERS.reglas.color, fontFamily: 'ui-monospace, monospace' }}>{it.n}. {it.slug}</span>
              <span style={{ fontSize: 9.5, color: C.faint }}>conversation_rules.rule_text · edades: {ages} · {rango}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{renderBodyWithPlaceholders(it.texto)}</div>
          </div>
        )
      })}
    </div>
  )

  const renderUniversalRules = (bodyText: string) => {
    if (!bodyText) return null
    const cleanText = bodyText.replace(/<\/?(conversation_rules)>/g, '').trim()
    const isBloqueA = cleanText.includes("Never repeat your own phrasing") || cleanText.includes("Build each turn")
    const targetIds = isBloqueA ? [1, 2, 3, 12, 16] : [1, 4, 13, 15, 16]
    
    const normalized = cleanText.replace(/(?:^|\n)\s*\d+\.\s*/g, "||RULE_SEP||")
    const rules = normalized.split("||RULE_SEP||").map(r => r.trim()).filter(Boolean)
    
    const blockTitle = isBloqueA 
      ? `Bloque A (Activo porque Edad es "Mini" o Nivel es "A0"/"A1")` 
      : `Bloque B (Activo porque Edad es "${band.toUpperCase()}" y Nivel es "${level}" >= A2)`
      
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
        <div style={{ 
          background: isBloqueA ? 'rgba(124,58,237,0.1)' : 'rgba(59,130,246,0.1)', 
          border: `1px solid ${isBloqueA ? 'var(--violet)' : 'var(--info)'}33`,
          borderRadius: 8, 
          padding: '8px 12px', 
          fontSize: 12, 
          fontWeight: 700,
          color: isBloqueA ? 'var(--violet)' : 'var(--info)'
        }}>
          {blockTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((ruleText, idx) => {
            const originalId = targetIds[idx] || '?'
            return (
              <div key={idx} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderLeft: `3px solid ${isBloqueA ? 'var(--violet)' : 'var(--info)'}`,
                borderRight: '1px solid var(--border-2)',
                borderTop: '1px solid var(--border-2)',
                borderBottom: '1px solid var(--border-2)',
                borderRadius: '0 8px 8px 0',
                padding: '10px 12px',
                fontSize: 12.5,
                lineHeight: 1.5
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--fg-1)', fontSize: 11.5 }}>Regla #{idx + 1} del prompt</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ 
                      fontSize: 9.5, 
                      fontWeight: 700, 
                      background: 'rgba(255,255,255,0.04)', 
                      border: '1px solid var(--border-2)', 
                      padding: '1px 5px', 
                      borderRadius: 4,
                      color: 'var(--fg-2)',
                      fontFamily: 'monospace'
                    }}>
                      Regla DB original: #{originalId}
                    </span>
                    {typeof originalId === 'number' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditUniversalRule(originalId) }}
                        title="Editar esta regla individual en el catálogo"
                        style={{ background: 'none', border: 0, color: C.accent, cursor: 'pointer', opacity: 0.8, padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                      >
                        <Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--fg-2)' }}>
                  {renderBodyWithPlaceholders(ruleText)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 8, background: C.panel, color: C.fg,
    border: `1px solid ${C.border}`, fontSize: 13, height: 34, outline: 'none'
  }

  const meta = res?.meta
  const steps = res?.steps || []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px', paddingBottom: dockOpen ? 360 : 120 }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Probador de clases</h1>
            <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 760 }}>
              Armá la clase de izquierda a derecha: <b>qué</b> aprende → <b>quién</b> → <b>cuánto sabe</b> → <b>de qué se habla</b>. Cada combo acota al siguiente y se deshabilita cuando no hay dato. Tocá una capa para desplegarla; clickeá en los <b>placeholders destacados</b> o en el lápiz para el <b>ajuste fino JIT</b> del catálogo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            <ThemeSwitcher />
            <button onClick={resolve} title="Recalcular orquestación desde los inputs actuales"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', border: `1px solid ${C.accent}`, background: 'rgba(0,179,126,0.14)', color: C.accent, marginRight: 6 }}>
              <Ico d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" size={13} /> Actualizar
            </button>
          </div>
        </div>

        {/* Dropdowns unificados */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : `repeat(${topicCategories.length > 1 ? 7 : 6}, 1fr)`, gap: 8, alignItems: 'start' }}>
          {/* 1. QUÉ APRENDE — una sola decisión. Los idiomas son materias como
              cualquier otra; el <optgroup> muestra la familia sin pedirla como combo,
              porque "familia" es vocabulario del motor, no del que elige la clase. */}
          <Ctx label="Qué aprende">
            <select style={sel} value={materia} onChange={(e) => handleMateriaChange(e.target.value)} disabled={isLive}>
              <optgroup label="Idiomas — aprende el idioma">
                {languages.map((l) => {
                  const n = contar({ discipline: 'idiomas' })
                  return <option key={l.code} value={`lang:${l.code}`} disabled={n === 0}>{l.label} {n === 0 ? '— vacía' : `(${n})`}</option>
                })}
              </optgroup>
              {Object.entries(materiasPorFamilia).map(([fam, ds]) => (
                <optgroup key={fam} label={fam === 'conocimiento' ? 'Conocimiento — aprende el tema' : 'Otros'}>
                  {ds.map((d) => {
                    const n = contar({ discipline: d })
                    return <option key={d} value={`disc:${d}`} disabled={n === 0}>{DISCIPLINE_LABELS[d] || d} {n === 0 ? '— vacía' : `(${n})`}</option>
                  })}
                </optgroup>
              ))}
              <option value="disc:todos">— Todo el catálogo</option>
            </select>
          </Ctx>
          {/* 2. EN QUÉ IDIOMA — sólo cuando el idioma NO es lo que se aprende. En una
              clase de idioma sería redundante (ya lo dijo el combo de arriba); en una
              de conocimiento es una perilla real: carpintería en francés. */}
          {esConocimiento ? (
            <Ctx label="En qué idioma">
              <select style={sel} value={targetLang} onChange={(e) => setTargetLang(e.target.value)} disabled={isLive}
                title="El idioma es el VEHÍCULO: la orquestación es exactamente la misma. Por defecto, el del alumno.">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </Ctx>
          ) : (
            <Ctx label="Se habla en">
              {/* NO se elige (por eso gris): en una clase de idioma el idioma en que se HABLA
                  se DERIVA del escalón y de la lengua del alumno. Y no es el que se aprende:
                  en Inicial la regla manda hablar casi todo en la lengua materna, así que este
                  campo mostrando el objetivo decía "Castellano" mientras el coach hablaba
                  francés — un cartel afirmando lo contrario de lo que pasaba. Ahora dice lo
                  que va a pasar, y de dónde sale. */}
              {(() => {
                const esc = levels.find((l) => l.level_code === level)?.escalon ?? 3
                const alumno = students.find((s) => s.student_id === effStudent)
                const objetivo = languages.find((l) => l.code === targetLang)?.label || targetLang
                const baseCode = alumno?.base_language
                const base = languages.find((l) => l.code === baseCode)?.label || baseCode
                let texto = objetivo
                let detalle = `Escalón ${esc}: la clase se habla íntegramente en ${objetivo}.`
                if (base && esc <= 1) {
                  texto = `${base} + palabras en ${objetivo}`
                  detalle = `Escalón ${esc} (Inicial): la regla del nivel manda hablar casi 100% en la lengua del alumno (${base}, de la ficha de ${alumno?.name}). En ${objetivo} van sólo las palabras objetivo.`
                } else if (base && esc === 2) {
                  texto = `mitad ${base} / mitad ${objetivo}`
                  detalle = `Escalón ${esc} (Básico): mitad y mitad. La lengua del alumno (${base}) sale de la ficha de ${alumno?.name}.`
                } else if (!base && esc <= 2) {
                  texto = `${objetivo} + su lengua`
                  detalle = `Escalón ${esc}: en los niveles bajos se apoya en la lengua materna del alumno. Sin alumno elegido, el motor cae en castellano.`
                }
                return (
                  <div style={{ ...sel, display: 'flex', alignItems: 'center', color: C.dim, cursor: 'help', fontSize: 12 }}
                    title={detalle + ' No se elige acá: sale del escalón y de la ficha del alumno.'}>
                    {texto}
                  </div>
                )
              })()}
            </Ctx>
          )}
          {/* Cada eslabón muestra cuántos tópicos deja vivos y se deshabilita en 0.
              "sin cruce" = falta la fila en age_level_matrix: el motor no tiene
              instrucciones para esa edad × nivel y no puede componer. */}
          <Ctx label="Quién aprende">
            <select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>
              {bands.map((b) => {
                const n = contar({ discipline, band: b.code })
                return <option key={b.code} value={b.code} disabled={n === 0}>{b.label} {n === 0 ? '— sin tópicos' : `(${n})`}</option>
              })}
            </select>
          </Ctx>
          {/* "Cuánto sabe" y no "Nivel": lo que mide cambia con la familia — en un
              idioma es cuánto lo habla, en carpintería cuánto sabe de carpintería. */}
          <Ctx label="Cuánto sabe">
            <select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>
              {levelsForBand.map((l) => {
                const hayCruce = cruceExiste(band, l.level_code)
                const n = contar({ discipline, band, level: l.level_code })
                const off = !hayCruce || n === 0
                const nota = !hayCruce ? '— sin cruce' : n === 0 ? '— sin tópicos' : `(${n})`
                // El codigo interno (CON1, B2) NO va en la interfaz: el sentido de unificar la
                // escalera era que el alumno vea lo mismo en plomeria que en ingles. Queda en el
                // tooltip para cuando haga falta identificar la fila.
                const nombre = l.escalon_nombre ? `${l.escalon} · ${l.escalon_nombre}` : (l.label || l.level_code)
                const detalle = [l.escalon_desc, `código interno: ${l.level_code}`].filter(Boolean).join(' — ')
                return <option key={l.level_code} value={l.level_code} disabled={off} title={detalle}>{nombre} {nota}</option>
              })}
            </select>
          </Ctx>
          {/* La categoría es un AGRUPADOR, no un eslabón que el motor necesite: con
              pocos tópicos no filtra nada y es un click de más. Aparece sola cuando
              la materia tiene suficientes como para que agrupar sirva. */}
          {topicCategories.length > 1 && (
            <Ctx label="Tema">
              <select style={sel} value={topicCat} onChange={(e) => setTopicCat(e.target.value)}>
                <option value="">— Todos ({topics.length})</option>
                {topicCategories.map(([c, n, label]) => <option key={c} value={c} disabled={n === 0}>{label} ({n})</option>)}
              </select>
            </Ctx>
          )}
          <Ctx label="De qué se habla hoy"><select style={sel} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— (sin tópico)</option>{topicsInCategory.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.title}</option>)}</select></Ctx>
          {/* El alumno se identifica por lo que es SUYO y no cambia con la clase: su
              nombre y su idioma nativo. El nivel NO va acá — es de la relación
              alumno↔materia, ya lo dice "Cuánto sabe", y mostrarlo llevaba a que el
              combo dijera "Lucas · B2" al lado de "Inicial": dos niveles distintos en
              la misma barra, porque B2 es su nivel de inglés y no significa nada en
              informática. Sin alumno elegido se compone con el perfil-molde del nivel. */}
          <Ctx label="Alumno (opc.)"><select style={sel} value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— Perfil del nivel</option>{students.map((s) => {
            const nativo = languages.find((l) => l.code === s.base_language)?.label
            return <option key={s.student_id} value={s.student_id}>{s.name}{nativo ? ` · habla ${nativo.toLowerCase()}` : ''}</option>
          })}</select></Ctx>
        </div>

        {meta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Chip label="Motor" value={meta.engine || '—'} />
            <Chip label="Semilla" value={String(meta.session_seed)} />
            <Chip label="Tópico" value={meta.topic_title || '—'} />
            {meta.has_history && <Chip label="Memoria" value="Activa" />}
            <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, color: C.faint }}>
              {Object.entries({ fijo: 'fijo', edad: 'edad', nivel: 'nivel', dinamico: 'dinámico' }).map(([k, l]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: NAT[k as keyof typeof NAT] }} /> {l}</span>
              ))}
            </div>
          </div>
        )}
        {err && <div style={{ color: C.red, fontSize: 13, padding: 10 }}>{err}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          
          {/* Columna Izquierda: Los 9 Pasos Accordion */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700 }}>Las 9 capas reales del Composer JIT {loading && '· armando…'}</div>
              <button onClick={() => setShowXml((v) => !v)} style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 9px', cursor: 'pointer' }}>{showXml ? 'ver capas' : 'ver XML final'}</button>
            </div>
            {showXml ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <pre style={{ margin: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: C.dim, maxHeight: '55vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                  {(() => {
                    const prompt = res?.prompt || ''
                    if (!prompt) return '(vacío)'
                    const regex = /(<\/?[a-zA-Z0-9_]+>|[a-zA-Z0-9_-]+:)/g
                    const parts = prompt.split(regex)
                    return parts.map((part: string, idx: number) => {
                      if (part.startsWith('<') && part.endsWith('>')) {
                        return <span key={idx} style={{ color: '#38bdf8', fontWeight: 700 }}>{part}</span>
                      }
                      if (part.endsWith(':') && part.length > 2 && !part.startsWith('http') && !part.startsWith('file')) {
                        return <span key={idx} style={{ color: '#fbbf24', fontWeight: 600 }}>{part}</span>
                      }
                      return part
                    })
                  })()}
                </pre>
                
                {/* Nodo final en la vista XML */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, borderLeft: `3px solid ${C.accent}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.fg, marginBottom: 4 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;final_prompt&gt;</span>
                    <span>Resultado de la Orquestación</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;/final_prompt&gt;</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.dim, maxHeight: 120, overflowY: 'auto', background: C.soft, padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>
                    {res?.prompt || '(vacío)'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((st: any, i: number) => {
                  const stepNat = st.step === 'Contexto' ? 'fijo' : ['El profe', 'Método', 'Juego', 'Turno'].includes(st.step) ? 'edad' : ['Rieles', 'Arranque'].includes(st.step) ? 'nivel' : 'dinamico'
                  const col = NAT[stepNat]
                  const on = st.step === activeLayer
                  return (
                    <div key={i}>
                      <button onClick={() => setActiveLayer(on ? '' : st.step)} style={{ width: '100%', textAlign: 'left', background: on ? 'rgba(56,189,248,0.06)' : C.panel, border: `1px solid ${on ? C.accent : C.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: C.fg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: col, minWidth: 16 }}>{i + 1}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{st.step}</span>
                          {on && <span style={{ marginLeft: 'auto', fontSize: 16, color: C.accent, lineHeight: 1 }}>−</span>}
                          {!on && <span style={{ marginLeft: 'auto', fontSize: 9.5, color: col, fontWeight: 700 }}>{stepNat}</span>}
                        </div>
                        
                        {on && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.soft}` }}>
                            {st.entries.map((ent: any, j: number) => (
                              <div key={j} style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>
                                    {ent.campo_en_prompt ? <span style={{ color: C.faint, fontWeight: 700 }}>{ent.campo_en_prompt} · </span> : null}
                                    {ent.label}
                                    {/* Gateo: por que ESTA fila entro en esta clase. Sin esto habia que ir a la base
                                        para saber por que una ley aparecia y otra no. */}
                                    {/* Sólo se muestran las condiciones QUE EXISTEN. Antes decía
                                        "familias: todas · edades: todas · ·→·" en las diez leyes
                                        universales: tres veces "todas" no informa nada y tapaba
                                        justo las que sí están acopladas. Sin condiciones, va un
                                        tag corto y el ojo se va a las otras. */}
                                    {ent.gateo && (() => {
                                      const g = ent.gateo
                                      const lista = (v: unknown) => Array.isArray(v) ? v.join('/') : null
                                      const cond: string[] = []
                                      const fam = lista(g.familias); if (fam) cond.push(`sólo ${fam}`)
                                      const ed = lista(g.age_groups); if (ed) cond.push(ed)
                                      if (g.min_level || g.max_level) cond.push(`${g.min_level || '·'}→${g.max_level || '·'}`)
                                      return (
                                        <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: cond.length ? 'var(--color-warning)' : C.faint, fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
                                          {cond.length ? cond.join(' · ') : 'universal'}
                                        </span>
                                      )
                                    })()}
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                    {ent.source && (() => {
                                      const parts = ent.source.split('.')
                                      if (parts.length === 2) {
                                        return (
                                          <div style={{ fontSize: 9.5, color: C.dim }}>
                                            Tabla: <b style={{ fontFamily: 'monospace', color: C.fg }}>{parts[0]}</b> · Campo: <b style={{ fontFamily: 'monospace', color: C.fg }}>{parts[1]}</b>
                                          </div>
                                        )
                                      }
                                      return <span style={{ fontSize: 9.5, color: C.faint }}>{ent.source}</span>
                                    })()}
                                    {(() => {
                                      const src = ent.source || ''
                                      let coupling = ''
                                      let color = C.faint
                                      if (src.startsWith('topics.')) {
                                        coupling = `Acoplamiento: TÓPICO ("${res?.meta?.topic_title || 'este tópico'}")`
                                        color = 'var(--color-blue)'
                                      } else if (src.startsWith('student_types.')) {
                                        coupling = `Acoplamiento: EDAD ("${band.toUpperCase()}")`
                                        color = 'var(--color-warning)'
                                      } else if (src.startsWith('levels.')) {
                                        coupling = `Acoplamiento: NIVEL ("${level}")`
                                        color = 'var(--color-accent)'
                                      } else if (src === 'app_config.universal_conversation_rules') {
                                        coupling = 'Acoplamiento: EDAD / NIVEL (Filtro JIT)'
                                        color = 'var(--violet)'
                                      } else if (src === 'composer_proto._get_behavioral_guards') {
                                        coupling = 'Bloque Estructurado (No editable)'
                                        color = 'var(--violet)'
                                      } else if (src.startsWith('app_config.')) {
                                        coupling = 'Acoplamiento: GLOBAL (Toda la app)'
                                        color = 'var(--danger)'
                                      }
                                      if (!coupling) return null
                                      return (
                                        <span style={{ fontSize: 8.5, fontWeight: 800, color: color, background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase' }}>
                                          {coupling}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingRight: 16 }}>
                                  {ent.items
                                    ? renderRuleItems(ent.items)
                                    : ent.source === 'app_config.universal_conversation_rules'
                                      ? renderUniversalRules(ent.body)
                                      : renderBodyWithPlaceholders(ent.body)}
                                </div>
                                {ent.source && ent.source.split('.').length === 2 && ent.source !== 'app_config.universal_conversation_rules' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditEntry(ent.source) }}
                                    title="Editar esta regla en el catálogo"
                                    style={{ position: 'absolute', right: 8, bottom: 6, background: 'none', border: 0, color: C.accent, cursor: 'pointer', opacity: 0.8 }}
                                  >
                                    <Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Prompt final compilado — vista PRO: XML coloreado por origen + mapa de nodos */}
            {res?.prompt && <PromptProSection prompt={res.prompt} steps={steps} />}
          </div>

          {/* Columna Derecha / JIT Inline Editor */}
          {(!isMobile || editTable !== null) && (
            <div style={{ position: isMobile ? 'static' : 'sticky', top: 14, marginTop: isMobile ? 12 : 0 }}>
              {editTable ? (
                <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
                    <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ajuste fino JIT</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.fg, marginBottom: 4 }}>{editLabel}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginBottom: 12 }}>Origen: <code style={{ background: C.soft, padding: '2px 4px', borderRadius: 4 }}>{editTable}.{editField}</code></div>
                  
                  {/* Indicador de acoplamiento dinámico */}
                  {(() => {
                    let typeLabel = ''
                    let desc = ''
                    let badgeBg = ''
                    let badgeFg = ''
                    
                    if (editTable === 'topics') {
                      typeLabel = 'Tópico'
                      desc = `Afecta únicamente al tópico seleccionado: "${res?.meta?.topic_title || 'este tópico'}"`
                      badgeBg = 'rgba(129,140,248,0.15)'
                      badgeFg = '#818cf8'
                    } else if (editTable === 'student_types') {
                      typeLabel = 'Segmento de Edad'
                      desc = `Afecta a todos los alumnos del segmento de edad: "${band.toUpperCase()}"`
                      badgeBg = 'rgba(251,191,36,0.15)'
                      badgeFg = '#fbbf24'
                    } else if (editTable === 'levels') {
                      typeLabel = 'Nivel de Idioma'
                      desc = `Afecta a todas las clases del nivel de idioma: "${level}"`
                      badgeBg = 'rgba(125,211,252,0.15)'
                      badgeFg = '#7dd3fc'
                    } else if (editTable === 'app_config') {
                      if (editField === 'universal_conversation_rules') {
                        typeLabel = 'EDAD / NIVEL (Filtro JIT)'
                        desc = 'Se almacena globalmente pero se filtra y curte al vuelo dinámicamente según la edad y nivel del alumno.'
                        badgeBg = 'rgba(168,85,247,0.15)'
                        badgeFg = '#a855f7'
                      } else {
                        typeLabel = 'Configuración Global'
                        desc = 'Afecta de forma cruzada a toda la aplicación independientemente de la edad o el nivel'
                        badgeBg = 'rgba(248,113,113,0.15)'
                        badgeFg = '#f87171'
                      }
                    }
                    
                    if (!typeLabel) return null
                    
                    return (
                      <div style={{ background: C.soft, borderLeft: `3px solid ${badgeFg}`, padding: '8px 10px', borderRadius: '4px 8px 8px 4px', marginBottom: 12, fontSize: 11.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: badgeFg, background: badgeBg, padding: '1px 5px', borderRadius: 4 }}>
                            Acoplamiento: {typeLabel}
                          </span>
                        </div>
                        <div style={{ color: C.dim, lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    )
                  })()}
                  
                  <textarea 
                    value={editVal} 
                    onChange={(e) => setEditVal(e.target.value)} 
                    rows={8}
                    style={{ width: '100%', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setEditTable(null); setEditRuleId(null); }} 
                      style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.dim, borderRadius: 8, fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={saveEdit} 
                      disabled={saving}
                      style={{ background: C.accent, border: 0, color: C.bg, borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '6px 16px', cursor: 'pointer' }}
                    >
                      {saving ? 'Guardando…' : 'Guardar y Aplicar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: C.faint, fontSize: 12.5, padding: 14, border: `1px dashed ${C.border}`, borderRadius: 12, textAlign: 'center' }}>
                  Clickeá en un placeholder pintado en azul o en el lápiz de cualquier regla para editar el catálogo en el lugar.
                </div>
              )}

              {/* Presets activos del alumno */}
              {effStudent && presets.length > 0 && (
                <div style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memoria del Alumno (SRS)</div>
                    <button 
                      onClick={wipeProfile}
                      style={{ 
                        background: 'none', border: `1px solid ${C.red}`, color: C.red, 
                        borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' 
                      }}
                    >
                      Borrar Memoria
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {presets.map((p, idx) => (
                      <span key={idx} style={{ fontSize: 10.5, background: C.soft, border: `1px solid ${C.border}`, color: C.fg, padding: '2px 6px', borderRadius: 6 }}>
                        {p.kind}: <b>{p.label}</b> ({p.occurrences} obs)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Mesa de pruebas / Clase en VIVO dockeada al borde inferior:
            fija abajo para operar sin scrollear; colapsable a una barra para recuperar pantalla. */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: isMobile ? '100%' : 'calc(100% - 32px)', maxWidth: 1340, zIndex: 60,
          background: C.panel, border: `1px solid ${C.border}`, borderBottom: 'none',
          borderRadius: isMobile ? '12px 12px 0 0' : '14px 14px 0 0', boxShadow: '0 -8px 28px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', maxHeight: dockOpen ? '50vh' : undefined,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <button onClick={() => setDockOpen((v) => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
            background: 'none', border: 0, borderBottom: dockOpen ? `1px solid ${C.border}` : 'none',
            padding: isMobile ? '10px 12px' : '10px 14px', cursor: 'pointer', color: C.fg, flexWrap: 'wrap',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: isLive ? C.red : C.accent }} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Clase en VIVO por Voz</span>
            <span style={{ fontSize: 11, color: C.dim }}>{band.toUpperCase()} · {level} · {meta?.topic_title || 'sin tópico'}{isLive ? ' — clase en curso' : ''}</span>
            <span style={{ marginLeft: 'auto', color: C.dim, display: 'flex' }}>
              <Ico d={dockOpen ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'} size={15} />
            </span>
          </button>
          {dockOpen && (
          <div style={{ overflowY: 'auto', padding: isMobile ? 10 : 14 }}>
            {/* Contenido de la Clase en VIVO por Voz */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.dim }}>Estado:</span>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: isLive ? (live.status === 'speaking' ? C.accent : 'var(--info)') : C.dim, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px', background: C.soft }}>
                    {!isLive ? 'Listo para iniciar' : live.status === 'connecting' ? 'Conectando…' : live.status === 'speaking' ? 'El profe habla' : 'Escuchando tu voz'}
                  </span>
                  {isLive && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10.5, color: C.dim }}>Mic:</span>
                      <span style={{ width: 60, height: 6, background: C.soft, borderRadius: 999, overflow: 'hidden', display: 'inline-block' }}>
                        <MedidorDeNivel subscribeAudioLevel={live.subscribeAudioLevel} color={C.accent} />
                      </span>
                    </div>
                  )}
                </div>

                {/* Con "sólo infra" el combo no participa (el prompt no sale del motor), así
                    que un cruce que no compone NO tiene por qué bloquear la prueba: justamente
                    se prueba la voz CUANDO el motor está en duda. */}
                <div>
                  {!isLive ? (
                    <button onClick={startLiveClass} disabled={loading || (!!err && !infraTest)}
                      title={infraTest ? 'Charla mínima para probar la cadena de voz — no usa el catálogo'
                        : err ? 'Este cruce no compone (dato faltante en el catálogo)' : 'Iniciar clase real por voz'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.accent, border: 0, color: C.bg, borderRadius: 8, fontSize: 12.5, fontWeight: 800, padding: '7px 16px', cursor: 'pointer', opacity: loading || (err && !infraTest) ? 0.5 : 1 }}>
                      <Ico d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3" size={14} /> {infraTest ? 'Probar infra' : 'Iniciar clase'}
                    </button>
                  ) : (
                    <button onClick={endLiveClass}
                      title="Corta la clase y guarda lo aprendido en la memoria del alumno elegido"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, fontSize: 12.5, fontWeight: 800, padding: '7px 16px', cursor: 'pointer' }}>
                      <Ico d="M6 6h12v12H6z" size={13} /> Terminar clase
                    </button>
                  )}
                </div>
              </div>

              {/* Cadencia de la charla: presets con nombre (app_config.rhythm_presets) +
                  onda editable para la PRÓXIMA clase. Cíclica: se repite toda la charla. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>Cadencia de la charla</span>
                {(() => {
                  const row = appConfigRows.find((r) => r.config_key === 'rhythm_presets')
                  if (!row) return null
                  let presets: { key: string; label: string; wave: string; desc: string }[] = []
                  try { presets = JSON.parse(row.config_value) } catch { return null }
                  return presets.map((p) => {
                    const active = cadencia.replace(/\s/g, '') === p.wave
                    return (
                      <button key={p.key} onClick={() => setCadencia(active ? '' : p.wave)} disabled={isLive}
                        title={`${p.desc} · ${p.wave}`}
                        style={{ background: active ? 'rgba(0,179,126,0.16)' : C.soft, border: `1px solid ${active ? C.accent : C.border}`, color: active ? C.accent : C.fg, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 10px', cursor: 'pointer', opacity: isLive ? 0.5 : 1 }}>
                        {p.label}
                      </button>
                    )
                  })
                })()}
                <input
                  value={cadencia}
                  onChange={(e) => setCadencia(e.target.value)}
                  placeholder="1,0,2,1,0,1,2,3,2,1 (default del cruce)"
                  disabled={isLive}
                  title="Onda de intensidad de las preguntas para la PRÓXIMA clase: 0=icebreaker, 1=normal, 2=profunda, 3=filosa. Se cicla. Vacío = usa la cadencia del cruce."
                  style={{ flex: '1 1 200px', minWidth: 160, background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, fontFamily: 'ui-monospace, monospace', opacity: isLive ? 0.5 : 1 }}
                />
                <span style={{ fontSize: 10, color: C.faint }}>0=icebreaker · 1=normal · 2=profunda · 3=filosa · se cicla</span>
              </div>
              {/* Modelo Live. Los `preview` de Google cambian sin aviso: el 2026-08-16 el
                  3.1 dejó de devolver la transcripción del ALUMNO (el coach seguía hablando
                  igual) sin que cambiara una línea nuestra. Tenerlo acá permite comparar en
                  el momento en vez de pushear una vez por prueba. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>Modelo de voz</span>
                <select value={liveModel} onChange={(e) => setLiveModel(e.target.value)} disabled={isLive}
                  style={{ background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, opacity: isLive ? 0.5 : 1 }}>
                  {/* Sólo los que la cuenta tiene habilitados con la voz Aoede: el resto
                      responde "voice unavailable" y cierra la sesión (probado 2026-08-16).
                      Ojo con la etiqueta vieja del banco /llm: decía que Native Audio "no
                      transcribe al alumno" y ese día fue el ÚNICO que devolvió
                      transcripción del input. */}
                  <option value="models/gemini-3.1-flash-live-preview">Flash 3.1 preview — el de siempre</option>
                  <option value="models/gemini-2.5-flash-native-audio-preview-09-2025">2.5 Native Audio — el único que transcribió al alumno</option>
                  <option value="models/gemini-live-2.5-flash-native-audio">Live 2.5 Native Audio — el que sugirió Gemini</option>
                </select>
                <span style={{ fontSize: 10, color: C.faint }}>si el alumno no aparece en la transcripción, probá otro: el preview cambia del lado de Google</span>
                {/* Aísla la INFRA del motor: manda un prompt de 4 líneas en vez del
                    compuesto de ~5000 chars. Si acá el alumno SÍ se transcribe, el
                    problema es el prompt; si tampoco, es la cadena de voz o el modelo. */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: infraTest ? C.accent : C.dim, cursor: isLive ? 'default' : 'pointer', border: `1px solid ${infraTest ? C.accent : C.border}`, background: infraTest ? 'rgba(0,179,126,0.14)' : C.soft, borderRadius: 999, padding: '3px 10px', opacity: isLive ? 0.5 : 1 }}
                  title="Charla mínima sobre música en castellano, sin catálogo ni orquestación. Sirve para saber si el problema es el prompt o la cadena de voz.">
                  <input type="checkbox" checked={infraTest} disabled={isLive}
                    onChange={(e) => setInfraTest(e.target.checked)} style={{ margin: 0 }} />
                  Probar sólo infra (prompt mínimo)
                </label>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>Densidad</span>
                <select value={promptLevel} onChange={(e) => setPromptLevel(Number(e.target.value))} disabled={isLive || infraTest}
                  title="Recorta el prompt MANTENIENDO la estructura: mismos bloques y mismo orden, menos contenido. Sirve para ver si el tamaño afecta la latencia y la transcripción."
                  style={{ background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, opacity: (isLive || infraTest) ? 0.5 : 1 }}>
                  <option value={0}>Entera — 100%</option>
                  <option value={1}>Light — 81%, 5 reglas</option>
                  <option value={2}>Mega light — 60%, 2 reglas</option>
                  <option value={3}>Mega mega light — 24%, sin reglas</option>
                </select>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>Peldaño</span>
                <select value={templateId} onChange={(e) => setTemplateId(Number(e.target.value))} disabled={isLive || infraTest}
                  title="Cada peldaño es un TEMPLATE con los mismos placeholders y el mismo resolver que producción — sólo cambia cuántos entran. Van de menos a más y son acumulativos. El que gane se publica poniéndole active=1."
                  style={{ background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, opacity: (isLive || infraTest) ? 0.5 : 1 }}>
                  <option value={0}>Activo (L6 completo)</option>
                  {templates.filter((t) => !t.active).map((t) => (
                    <option key={t.id} value={t.id} title={t.notes}>{t.name} — {t.chars} chars</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    setVerificando(true)
                    try {
                      setVerif(await motorAPI.verificar({
                        age_group: band, level, topic_id: topicId ?? 0, student_id: effStudent ?? 0,
                        target_language: targetLang, template_id: templateId,
                      }))
                    } catch { setVerif(null) } finally { setVerificando(false) }
                  }}
                  disabled={verificando}
                  title="Repasito determinístico del flujo elegido: compara qué fila usó el motor contra cuál le correspondía. No corre ninguna clase."
                  style={{ background: C.soft, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 8, padding: '5px 12px', fontSize: 12.5, fontWeight: 700, cursor: verificando ? 'wait' : 'pointer' }}>
                  {verificando ? 'Verificando…' : 'Verificar'}
                </button>
              </div>
              {/* MODO CLASE — la clase vista como la ve el alumno, con el MISMO componente
                  que usa producción (components/ClaseOrbe) y el MISMO CSS (.webapp-root).
                  No es una maqueta: si acá se ve mal, en la app se ve mal. El panel sirve
                  para diagnosticar; esto sirve para SENTIR si la charla está viva, que es lo
                  único que ningún visor puede decir. */}
              {modoClase && createPortal(
                /* El fondo oscuro de la clase NO lo da .webapp-root: lo da .convo-view.bg-3
                   (background #000 + el gradiente en su ::before). Pintarlo a mano con un
                   color inline fue el bug: se copiaba el color en vez de usar la clase, y
                   entonces el orbe y los rotulos —gris claro, pensados para negro— caian
                   sobre blanco y no se leia nada. Se envuelve con la MISMA cadena que la
                   clase real y el fondo viene del CSS, no de un literal. */
                <div className="webapp-root" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                  <style>{WEBAPP_CSS}</style>
                  <style>{CONVO_BG_CSS}</style>
                  <div className="convo-view bg-3" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Terminar arriba a la derecha, como en la clase del alumno: es donde se
                        lo busca, y abajo quedaba fuera de la pantalla. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(232,236,234,.95)' }}>
                        {topicId
                          ? (allTopicsFlat.find((x) => x.topic_id === topicId)?.title || `tópico ${topicId}`)
                          : 'sin tópico'}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'rgba(232,236,234,.35)', fontFamily: 'ui-monospace, monospace' }}>
                        id {topicId ?? '—'}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'rgba(232,236,234,.5)' }}>
                        {band} · {level} · {targetLang}
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        {isLive && (
                          <button onClick={endLiveClass}
                            title="Corta la clase y guarda lo aprendido en la memoria del alumno"
                            style={{ background: '#E5484D', color: '#fff', border: 0, borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            Terminar clase
                          </button>
                        )}
                        <button onClick={() => setModoClase(false)}
                          style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(232,236,234,.9)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Volver al panel
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 0 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, overflowY: 'auto', padding: '0 16px 24px' }}>
                      <ClaseOrbe
                        status={live.status}
                        subscribeAudioLevel={live.subscribeAudioLevel}
                        transcript={live.transcript}
                        statusLabel={!isLive ? 'Clase terminada' : live.status === 'connecting' ? 'Conectando…' : live.status === 'speaking' ? 'El profe habla' : 'Escuchando tu voz'}
                        nivel={level}
                        onRepetir={(frase) => live.say(`Por favor repetí lentamente y con buena pronunciación esta frase exacta, una sola vez, sin agregar nada más: "${frase}"`)}
                      />

                      {/* LA TRANSCRIPCION, los DOS lados. El orbe solo muestra el ultimo
                          turno del tutor, asi que la voz del alumno no aparecia en ninguna
                          parte de esta pantalla. Es lectura pura: no manda nada, no toca la
                          charla, solo muestra lo que ya vino. */}
                      <div style={{ width: '100%', maxWidth: 780, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                        {live.transcript.length === 0 && (
                          <div style={{ fontSize: 12.5, color: 'rgba(232,236,234,.35)', textAlign: 'center', fontStyle: 'italic' }}>
                            La transcripción aparece acá a medida que hablan.
                          </div>
                        )}
                        {live.transcript.map((l, i) => {
                          const esAlumno = l.who === 'user'
                          return (
                            <div key={i} style={{
                              alignSelf: esAlumno ? 'flex-end' : 'flex-start',
                              maxWidth: '86%',
                              borderLeft: esAlumno ? 'none' : '3px solid rgba(0,179,126,.55)',
                              borderRight: esAlumno ? '3px solid rgba(120,200,255,.55)' : 'none',
                              background: esAlumno ? 'rgba(120,200,255,.07)' : 'rgba(0,179,126,.07)',
                              borderRadius: 8, padding: '8px 12px',
                            }}>
                              <div style={{
                                fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase',
                                color: esAlumno ? 'rgba(120,200,255,.85)' : 'rgba(0,179,126,.9)', marginBottom: 4,
                                textAlign: esAlumno ? 'right' : 'left',
                              }}>
                                {esAlumno ? 'Vos' : 'El profe'}
                              </div>
                              <div style={{
                                fontSize: 14, lineHeight: 1.45,
                                color: esAlumno ? 'rgba(232,236,234,.95)' : 'rgba(232,236,234,.8)',
                                fontStyle: esAlumno ? 'normal' : 'italic',
                                fontWeight: esAlumno ? 600 : 400,
                                textAlign: esAlumno ? 'right' : 'left',
                              }}>
                                {l.text}
                              </div>
                            </div>
                          )
                        })}
                        <div ref={finTranscriptRef} />
                      </div>
                    </div>

                    {/* PANEL DE LA CLASE — lectura pura sobre lo que ya esta en pantalla: no
                        llama a nada, no le habla al coach. Dice las dos cosas que contestan
                        "sirvio esta clase": cuantas palabras objetivo PRODUJO el alumno, y
                        como se reparte la charla entre los dos. */}
                    <PanelDeLaClase
                      transcript={live.transcript}
                      keywordsCrudas={topicsRows.find((r) => r.id === topicId)?.keywords}
                      idioma={targetLang}
                      nivel={level}
                      idiomaBase={students.find((s) => s.student_id === effStudent)?.base_language || 'es'}
                    />
                  </div>
                  </div>
                </div>,
                document.body,
              )}
              {(postClase || buscandoPost) && (
                <PanelPostClase datos={postClase} buscando={buscandoPost} onRefrescar={refrescarPostClase} C={C} />
              )}
              {verif && (
                <div style={{ background: C.panel, border: `1px solid ${verif.resumen.alta ? 'var(--color-danger)' : C.border}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: verif.alarmas.length ? 8 : 0, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 12 }}>Verificación de esquema</b>
                    <span style={{ fontSize: 11, color: verif.resumen.alta ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }}>
                      {verif.resumen.total === 0 ? 'sin alarmas' : `${verif.resumen.alta ?? 0} altas · ${verif.resumen.media ?? 0} medias · ${verif.resumen.baja ?? 0} bajas`}
                    </span>
                    {verif.contexto && (
                      <span style={{ fontSize: 10, color: C.faint, marginLeft: 'auto' }}>
                        familia tópico: {verif.contexto.familia_topico ?? '—'} · familia nivel: {verif.contexto.familia_nivel ?? '—'} · materia: {verif.contexto.materia ?? '—'}
                      </span>
                    )}
                  </div>
                  {verif.alarmas.map((a, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${a.severidad === 'alta' ? 'var(--color-danger)' : a.severidad === 'media' ? 'var(--color-warning)' : C.faint}`, paddingLeft: 9, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.fg, fontFamily: 'ui-monospace, monospace' }}>
                        {a.tipo} · <span style={{ color: C.dim }}>{a.campo}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.fg, lineHeight: 1.45, margin: '2px 0' }}>{a.detalle}</div>
                      {(a.esperado || a.encontrado) && (
                        <div style={{ fontSize: 10.5, color: C.dim, fontFamily: 'ui-monospace, monospace' }}>
                          esperaba <b style={{ color: 'var(--color-success)' }}>{a.esperado || '—'}</b> · encontró <b style={{ color: 'var(--color-danger)' }}>{a.encontrado || '—'}</b>
                        </div>
                      )}
                      {a.arreglo && <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{a.arreglo}</div>}
                    </div>
                  ))}
                </div>
              )}
              {!isLive && live.status === 'ended' && live.transcript.length > 0 && (
                <div style={{ fontSize: 11.5, color: C.dim }}>Clase terminada — ajustá lo que haga falta arriba y volvé a iniciar.</div>
              )}
              {(isLive || live.transcript.length > 0) ? (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {live.transcript.length === 0 && <div style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Conectando audio en vivo con el Profe…</div>}
                  {live.transcript.map((l, i) => (
                    <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                      <b style={{ color: l.who === 'ai' ? C.accent : 'var(--info)' }}>{l.who === 'ai' ? 'Profe' : 'Vos'}:</b>{' '}
                      <span style={{ color: C.fg }}>{l.text}</span>
                    </div>
                  ))}
                  <div ref={liveTranscriptEndRef} />
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: C.faint, fontStyle: 'italic' }}>Charla real por el motor único. Tocá "Iniciar clase" para hablar por voz con el Profe. El transcript de la charla aparecerá acá en tiempo real.</div>
              )}
            </div>
          </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* El medidor de mic del panel. Existe como componente APARTE por una sola razon: si el panel
 * leyera el nivel, cada latido (20 por segundo) volveria a renderizar el panel completo — que
 * es de donde salia el delay de la charla. Aca el re-render queda contenido en esta barrita. */
function MedidorDeNivel({ subscribeAudioLevel, color }: {
  subscribeAudioLevel?: (cb: (n: number) => void) => () => void
  color: string
}) {
  const nivel = useAudioLevel(subscribeAudioLevel)
  return (
    <span style={{ display: 'block', height: '100%', width: `${Math.round(nivel * 100)}%`,
      background: color, transition: 'width 80ms linear' }} />
  )
}

/* Panel lateral de la clase en vivo. Dos medidas, las dos derivadas del transcript:
 *
 *  PALABRAS OBJETIVO PRODUCIDAS — de las semillas que el motor le paso al coach, cuales dijo
 *  el ALUMNO (no el coach). Es la medicion mas directa de si la clase sirvio, y hasta hoy se
 *  calculaba en la app de produccion, se mostraba, y se perdia al cerrar la pantalla.
 *
 *  REPARTO DE LA CHARLA — turnos y palabras de cada uno. Es el numero que desnuda la
 *  entrevista: si el coach habla mas que el alumno, la clase la esta dando el coach.
 */
function PanelDeLaClase({ transcript, keywordsCrudas, idioma, nivel, idiomaBase }: {
  transcript: { who: string; text: string }[]
  keywordsCrudas?: unknown
  idioma: string
  nivel: string
  idiomaBase: string
}) {
  const semillas: string[] = (() => {
    if (Array.isArray(keywordsCrudas)) return keywordsCrudas.map(String)
    if (typeof keywordsCrudas === 'string') {
      try { const v = JSON.parse(keywordsCrudas); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
    }
    return []
  })()

  const delAlumno = transcript.filter((l) => l.who === 'user')
  const delProfe = transcript.filter((l) => l.who === 'ai')
  const textoAlumno = delAlumno.map((l) => l.text.toLowerCase()).join(' ')
  const palabras = (ls: typeof transcript) =>
    ls.reduce((n, l) => n + l.text.trim().split(/\s+/).filter(Boolean).length, 0)
  const palAlumno = palabras(delAlumno)
  const palProfe = palabras(delProfe)
  const usadas = semillas.filter((k) => textoAlumno.includes(k.toLowerCase()))
  // Cuanto de la charla la lleva el alumno. Debajo del 50% la clase la esta dando el coach.
  const cuotaAlumno = palAlumno + palProfe > 0 ? Math.round((palAlumno * 100) / (palAlumno + palProfe)) : 0

  const T = { fg: 'rgba(232,236,234,.9)', dim: 'rgba(232,236,234,.5)', faint: 'rgba(232,236,234,.3)' }
  const Titulo = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase',
      color: T.faint, marginBottom: 8 }}>{children}</div>
  )

  return (
    <aside style={{ width: 268, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,.07)',
      padding: '4px 16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <ComoSeDiceBien transcript={transcript} idioma={idioma} nivel={nivel} idiomaBase={idiomaBase} />

      <div>
        <Titulo>Palabras objetivo que dijo</Titulo>
        {semillas.length === 0 ? (
          <div style={{ fontSize: 11.5, color: T.faint, fontStyle: 'italic' }}>
            Este tópico no tiene semillas cargadas.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: usadas.length ? '#00B37E' : T.dim, lineHeight: 1 }}>
                {usadas.length}
              </span>
              <span style={{ fontSize: 13, color: T.dim }}>de {semillas.length}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {semillas.map((k) => {
                const ok = usadas.includes(k)
                return (
                  <span key={k} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 999,
                    background: ok ? 'rgba(0,179,126,.18)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${ok ? 'rgba(0,179,126,.45)' : 'rgba(255,255,255,.08)'}`,
                    color: ok ? '#9CFCD2' : T.dim,
                  }}>{ok ? '✓ ' : ''}{k}</span>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div>
        <Titulo>Quién lleva la charla</Titulo>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1,
            color: cuotaAlumno >= 50 ? '#00B37E' : '#E6A23C' }}>{cuotaAlumno}%</span>
          <span style={{ fontSize: 12, color: T.dim }}>lo habla el alumno</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.07)', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${cuotaAlumno}%`, height: '100%',
            background: cuotaAlumno >= 50 ? '#00B37E' : '#E6A23C', transition: 'width 320ms ease' }} />
        </div>
        <div style={{ fontSize: 11.5, color: T.dim, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span>alumno · {delAlumno.length} turnos · {palAlumno} palabras</span>
          <span>profe  · {delProfe.length} turnos · {palProfe} palabras</span>
          {delProfe.length > 0 && (
            <span style={{ color: T.faint }}>
              el profe promedia {Math.round(palProfe / delProfe.length)} palabras por turno
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}

/* CÓMO SE DICE BIEN — la frase del alumno, bien dicha, MIENTRAS habla.
 *
 * Cada vez que llega un turno nuevo del alumno se pide la versión corregida a un modelo de
 * texto (rápido y barato) y se muestra el par. No pasa por el camino de voz: si tarda o falla,
 * la charla ni se entera.
 *
 * No reemplaza al post-clase — son cosas distintas. El post-clase mira la charla entera y saca
 * el PATRÓN ("subject-verb agreement"); esto es el espejo de UNA frase, que es lo único que
 * sirve mientras estás hablando.
 *
 * Sólo se listan las que cambiaron: si lo dijiste bien, no hay nada que mostrar.
 */
function ComoSeDiceBien({ transcript, idioma, nivel, idiomaBase }: {
  transcript: { who: string; text: string }[]
  idioma: string
  nivel: string
  idiomaBase: string
}) {
  const [pares, setPares] = useState<{ dicho: string; bien: string }[]>([])
  const pedidasRef = useRef<Set<string>>(new Set())
  const [pendiente, setPendiente] = useState(false)

  useEffect(() => {
    const mias = transcript.filter((l) => l.who === 'user' && l.text.trim().length > 3)
    const ultima = mias[mias.length - 1]
    if (!ultima) return
    const clave = ultima.text.trim()
    if (pedidasRef.current.has(clave)) return
    pedidasRef.current.add(clave)
    setPendiente(true)
    motorAPI.fraseCorregida({ texto: clave, idioma, nivel, idioma_base: idiomaBase })
      .then((r) => {
        if (r.cambio && r.corregida.trim() !== clave) {
          setPares((prev) => [...prev, { dicho: clave, bien: r.corregida.trim() }].slice(-6))
        }
      })
      .catch(() => { /* la correccion es un extra: si falla, la clase sigue igual */ })
      .finally(() => setPendiente(false))
  }, [transcript, idioma, nivel, idiomaBase])

  const T = { dim: 'rgba(232,236,234,.5)', faint: 'rgba(232,236,234,.3)' }
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase',
        color: T.faint, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        Cómo se dice bien
        {pendiente && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00B37E' }} />}
      </div>
      {pares.length === 0 ? (
        <div style={{ fontSize: 11.5, color: T.faint, fontStyle: 'italic' }}>
          Cuando digas algo que se pueda decir mejor, aparece acá.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pares.slice().reverse().map((p, i) => (
            <div key={i} style={{ borderLeft: '2px solid rgba(230,162,60,.5)', paddingLeft: 9 }}>
              <div style={{ fontSize: 11.5, color: T.dim, textDecoration: 'line-through', marginBottom: 3 }}>
                {p.dicho}
              </div>
              <div style={{ fontSize: 13, color: '#F5D9A8', fontWeight: 600, lineHeight: 1.35 }}>
                {p.bien}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* EL POST-CLASE, en el lugar donde se prueban las clases.
 *
 * Los dos destiladores ya corrian —y desde anoche tambien en el camino de voz— pero su
 * resultado no se veia en ninguna parte: terminabas la clase y no habia forma de saber que
 * habia entendido el sistema. Esto lo muestra.
 *
 * Son DOS cosas distintas y conviene no mezclarlas:
 *   ANALISIS (session_analyzer)      mira la clase como pieza: score interno y devolucion.
 *   MEMORIA  (learner_state_writer)  lo que se GUARDA y va a entrar en la proxima clase.
 * La segunda es la que importa para el motor: es el tercer pilar.
 */
function PanelPostClase({ datos, buscando, onRefrescar, C }: {
  datos: any; buscando: boolean; onRefrescar: () => void; C: any
}) {
  const hay = datos?.hay
  const analisis = datos?.analisis
  const memoria: any[] = datos?.memoria || []
  const Rot = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
      color: C.faint, marginBottom: 6 }}>{children}</div>
  )
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 12 }}>Post-clase</b>
        {buscando && <span style={{ fontSize: 11, color: C.dim }}>destilando…</span>}
        {datos?.session && (
          <span style={{ fontSize: 10.5, color: C.faint, fontFamily: 'ui-monospace, monospace' }}>
            sesión {datos.session.id} · {datos.session.nivel} · {datos.session.duracion_s ?? '—'}s
          </span>
        )}
        <button onClick={onRefrescar} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${C.border}`,
          color: C.dim, borderRadius: 8, fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
          Volver a buscar
        </button>
      </div>

      {!hay && !buscando && (
        <div style={{ fontSize: 11.5, color: C.dim }}>{datos?.motivo || 'todavía no hay nada'}</div>
      )}

      {hay && (
        <>
          <div>
            <Rot>Análisis de la clase</Rot>
            {analisis?.listo ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{analisis.score}</span>
                <span style={{ fontSize: 11.5, color: C.dim }}>
                  {analisis.reporte?.verdict || analisis.reporte?.student_summary || 'sin devolución'}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: C.faint, fontStyle: 'italic' }}>
                todavía no terminó de analizar — probá "volver a buscar"
              </div>
            )}
          </div>

          <div>
            <Rot>Memoria del alumno · lo que entra en la próxima clase</Rot>
            {memoria.length === 0 ? (
              <div style={{ fontSize: 11.5, color: C.faint, fontStyle: 'italic' }}>
                sin memoria guardada. Si la clase tenía tópico con categoría, el destilador no llegó
                a escribir; si el tópico no tiene categoría, no se guarda a propósito.
              </div>
            ) : memoria.map((m, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${C.accent}`, paddingLeft: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: C.faint, fontFamily: 'ui-monospace, monospace', marginBottom: 4 }}>
                  materia {m.materia ?? '(sin materia)'}
                </div>
                {m.top_error && <div style={{ fontSize: 12, color: C.fg, marginBottom: 3 }}>
                  <span style={{ color: C.dim }}>error principal: </span>{m.top_error}</div>}
                {m.review && <div style={{ fontSize: 12, color: C.fg, marginBottom: 3 }}>
                  <span style={{ color: C.dim }}>a repasar: </span>{m.review}</div>}
                {!!m.interests?.length && <div style={{ fontSize: 11.5, color: C.dim }}>
                  le interesa: {m.interests.join(' · ')}</div>}
                {!!m.mastered?.length && <div style={{ fontSize: 11.5, color: C.dim }}>
                  ya domina: {m.mastered.join(' · ')}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
