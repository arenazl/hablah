/**
 * /admin/kits — Pools de tópicos curados (doc 11 §1.2).
 *
 * El kit es el pool del que el sequencer elige UN tópico por sesión. No entra al
 * prompt: es la fuente. Curado acá (CRUD + asignar tópicos con buscador).
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface Kit { id: number; name: string; description: string; active: boolean; topic_ids: number[] }
interface Topic { id: number; title: string }

const tok = () => localStorage.getItem('token')

const btnPrimary: React.CSSProperties = { padding: '8px 14px', borderRadius: 9, border: 0, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border-1)', background: 'var(--bg-2)', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(229,72,77,.3)', background: 'rgba(229,72,77,.12)', color: '#E5484D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const chip: React.CSSProperties = { fontSize: 11.5, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-2)', color: 'var(--fg-2)', border: '1px solid var(--border-1)' }
const field: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 14 }

export default function AdminKitsPanel() {
  const [kits, setKits] = useState<Kit[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kit | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rk, rt] = await Promise.all([
        fetch(`${API_BASE_URL}/kits`, { headers: { Authorization: `Bearer ${tok()}` } }),
        fetch(`${API_BASE_URL}/topics`, { headers: { Authorization: `Bearer ${tok()}` } }),
      ])
      if (!rk.ok || !rt.ok) throw new Error()
      setKits(await rk.json())
      const td = await rt.json()
      setTopics(Array.isArray(td) ? td : (td.items || []))
    } catch { toast.error('Error cargando kits') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const createKit = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch(`${API_BASE_URL}/kits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ name: newName.trim(), description: '', active: true }),
      })
      if (!res.ok) throw new Error()
      setNewName(''); setCreating(false); toast.success('Kit creado'); load()
    } catch { toast.error('No se pudo crear') }
  }

  const delKit = async (k: Kit) => {
    if (!window.confirm(`¿Borrar el kit "${k.name}"?`)) return
    try {
      const res = await fetch(`${API_BASE_URL}/kits/${k.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } })
      if (!res.ok) throw new Error()
      toast.success('Kit borrado'); load()
    } catch { toast.error('No se pudo borrar') }
  }

  const toggleTopic = (tid: number) => {
    if (!editing) return
    const has = editing.topic_ids.includes(tid)
    setEditing({ ...editing, topic_ids: has ? editing.topic_ids.filter((x) => x !== tid) : [...editing.topic_ids, tid] })
  }

  const saveTopics = async () => {
    if (!editing) return
    try {
      const res = await fetch(`${API_BASE_URL}/kits/${editing.id}/topics`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ topic_ids: editing.topic_ids }),
      })
      if (!res.ok) throw new Error()
      toast.success('Tópicos del kit guardados'); setEditing(null); load()
    } catch { toast.error('No se pudo guardar') }
  }

  const titleOf = (id: number) => topics.find((t) => t.id === id)?.title || `#${id}`
  const ql = q.trim().toLowerCase()
  const filtered = ql ? topics.filter((t) => t.title.toLowerCase().includes(ql)) : topics

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px 80px', maxWidth: 960, margin: '0 auto', color: 'var(--fg-1)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Kits de tópicos</h1>
      <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', padding: '3px 9px', borderRadius: 999, background: 'rgba(91,61,245,.14)', color: '#7C5CFF', marginBottom: 12 }}>
        UPSTREAM · pool del que el sequencer elige (no entra al prompt)
      </div>
      <p style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 20, maxWidth: 640 }}>
        Un kit es un conjunto curado de tópicos que un alumno puede recibir. El sequencer elige uno del kit por sesión.
      </p>

      {!editing && (
        <>
          <div style={{ marginBottom: 16 }}>
            {creating ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del kit"
                  onKeyDown={(e) => e.key === 'Enter' && createKit()} style={{ ...field, minWidth: 240 }} />
                <button onClick={createKit} style={btnPrimary}>Crear</button>
                <button onClick={() => { setCreating(false); setNewName('') }} style={btnGhost}>Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} style={btnPrimary}>+ Nuevo kit</button>
            )}
          </div>
          {loading ? <p style={{ color: 'var(--fg-3)' }}>Cargando…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kits.map((k) => (
                <div key={k.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{k.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{k.topic_ids.length} tópicos</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditing(k)} style={btnGhost}>Tópicos</button>
                      <button onClick={() => delKit(k)} style={btnDanger}>Borrar</button>
                    </div>
                  </div>
                  {k.topic_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {k.topic_ids.slice(0, 12).map((id) => <span key={id} style={chip}>{titleOf(id)}</span>)}
                      {k.topic_ids.length > 12 && <span style={chip}>+{k.topic_ids.length - 12}</span>}
                    </div>
                  )}
                </div>
              ))}
              {kits.length === 0 && <p style={{ color: 'var(--fg-3)' }}>Sin kits todavía. Creá el primero.</p>}
            </div>
          )}
        </>
      )}

      {editing && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
              Tópicos de "{editing.name}" <span style={{ color: 'var(--fg-3)', fontWeight: 400, fontSize: 13 }}>({editing.topic_ids.length} elegidos)</span>
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(null)} style={btnGhost}>Cancelar</button>
              <button onClick={saveTopics} style={btnPrimary}>Guardar</button>
            </div>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tópico…" style={{ ...field, width: '100%', maxWidth: 360, marginBottom: 12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 460, overflowY: 'auto', border: '1px solid var(--border-1)', borderRadius: 10, padding: 8 }}>
            {filtered.map((t) => {
              const on = editing.topic_ids.includes(t.id)
              return (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(91,61,245,.10)' : 'transparent' }}>
                  <input type="checkbox" checked={on} onChange={() => toggleTopic(t.id)} />
                  <span style={{ fontSize: 13.5 }}>{t.title}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
