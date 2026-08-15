/**
 * /app/admin/users — Panel admin para CRUD de usuarios.
 *
 * Lista tabular + edit modal + reset password + delete + create.
 * Backend: /api/admin/users (todos admin-only).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface AdminUser {
  id: number
  email: string
  nombre: string
  apellido: string
  telefono?: string
  role: 'admin' | 'student'
  is_active: boolean
  cefr_level: string
  target_language: string
  base_language: string
  is_kid: boolean
  parent_user_id?: number
  sessions_count: number
  last_session_at?: string
  created_at?: string
}

const CSS = `
.au-root { padding: 24px 32px 80px; max-width: 1280px; margin: 0 auto; color: var(--fg-1); }
.au-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
.au-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 18px; }
.au-actions { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.au-btn { padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; border: 0; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
.au-btn-primary { background: var(--primary); color: white; }
.au-btn-primary:hover { background: var(--primary-dark); }
.au-btn-ghost { background: var(--bg-2); color: var(--fg-2); border: 1px solid var(--border-1); }
.au-btn-ghost:hover { background: var(--bg-3); color: var(--fg-1); }
.au-btn-danger { background: rgba(229,72,77,.12); color: #E5484D; border: 1px solid rgba(229,72,77,.3); }
.au-btn-danger:hover { background: rgba(229,72,77,.22); }
.au-search { flex: 1; max-width: 320px; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-2); background: var(--surface); color: var(--fg-1); font-size: 14px; outline: none; }
.au-table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-1); }
.au-table th, .au-table td { padding: 11px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--border-1); }
.au-table th { background: var(--bg-2); font-weight: 700; color: var(--fg-2); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
.au-table tr:last-child td { border-bottom: 0; }
.au-table tr:hover td { background: rgba(255,255,255,.02); }
.au-pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.au-pill-admin { background: rgba(255,184,0,.15); color: #FFB800; }
.au-pill-student { background: rgba(0,179,126,.12); color: #00B37E; }
.au-pill-kid { background: rgba(124,92,255,.15); color: #A892FF; }
.au-pill-inactive { background: rgba(255,255,255,.06); color: var(--fg-3); }
.au-action-btn { padding: 5px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; border: 0; cursor: pointer; margin-right: 4px; }
.au-action-btn.edit { background: rgba(59,130,246,.15); color: #3B82F6; }
.au-action-btn.edit:hover { background: rgba(59,130,246,.25); }
.au-action-btn.pwd { background: rgba(255,184,0,.15); color: #FFB800; }
.au-action-btn.pwd:hover { background: rgba(255,184,0,.25); }
.au-action-btn.del { background: rgba(229,72,77,.12); color: #E5484D; }
.au-action-btn.del:hover { background: rgba(229,72,77,.22); }

.au-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.au-modal { background: var(--surface); border-radius: 16px; padding: 24px; width: 480px; max-width: 92vw; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-2); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.au-modal h2 { margin: 0 0 14px; font-size: 18px; font-weight: 800; }
.au-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.au-form-grid .full { grid-column: 1 / -1; }
.au-field { display: flex; flex-direction: column; gap: 4px; }
.au-field label { font-size: 11px; color: var(--fg-3); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.au-field input, .au-field select { height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--bg-2); color: var(--fg-1); font-size: 14px; outline: none; }
.au-field input:focus, .au-field select:focus { border-color: var(--primary); }
.au-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
`

interface EditState {
  id?: number  // undefined = creating
  email: string
  password: string  // empty = no change
  nombre: string
  apellido: string
  telefono: string
  role: 'admin' | 'student'
  is_active: boolean
  cefr_level: string
  target_language: string
  base_language: string
}

const EMPTY_EDIT: EditState = {
  email: '', password: '', nombre: '', apellido: '', telefono: '',
  role: 'student', is_active: true, cefr_level: 'B1',
  target_language: 'en', base_language: 'es',
}

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)
  const [pwdReset, setPwdReset] = useState<{ id: number; email: string } | null>(null)
  const [newPwd, setNewPwd] = useState('')
  // Los niveles salen del catálogo (tabla levels), no de una lista fija: así los tracks nuevos
  // (castellano ES1-ES3, fonética) aparecen acá sin tocar el front.
  const [levels, setLevels] = useState<{ code: string; friendly_name: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setUsers(await res.json())
    } catch (e) {
      toast.error('No pude cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE_URL}/levels`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const rows = await res.json()
        setLevels(rows.filter((l: { active: boolean }) => l.active))
      } catch { /* sin catálogo el selector queda vacío; no rompe el panel */ }
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return users
    return users.filter(u =>
      u.email.toLowerCase().includes(s) ||
      u.nombre.toLowerCase().includes(s) ||
      String(u.id).includes(s),
    )
  }, [users, search])

  const startCreate = () => setEdit({ ...EMPTY_EDIT })
  const startEdit = (u: AdminUser) => setEdit({
    id: u.id,
    email: u.email,
    password: '',
    nombre: u.nombre,
    apellido: u.apellido || '',
    telefono: u.telefono || '',
    role: u.role,
    is_active: u.is_active,
    cefr_level: u.cefr_level,
    target_language: u.target_language,
    base_language: u.base_language,
  })

  const submitEdit = async () => {
    if (!edit) return
    const token = localStorage.getItem('token')
    const isNew = !edit.id
    const url = isNew ? `${API_BASE_URL}/admin/users` : `${API_BASE_URL}/admin/users/${edit.id}`
    const body: Record<string, unknown> = { ...edit }
    if (!isNew) delete body.password  // password no se cambia desde edit normal
    delete body.id
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }
      toast.success(isNew ? 'Usuario creado' : 'Usuario actualizado')
      setEdit(null)
      load()
    } catch (e: any) {
      toast.error(`Error: ${e.message || e}`)
    }
  }

  const submitPwd = async () => {
    if (!pwdReset || !newPwd) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${pwdReset.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPwd }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`Password de ${pwdReset.email} cambiado`)
      setPwdReset(null); setNewPwd('')
    } catch (e: any) {
      toast.error(`Error: ${e.message || e}`)
    }
  }

  const doDelete = async (u: AdminUser) => {
    if (!confirm(`¿Borrar ${u.email} (id ${u.id}) y todas sus sesiones?`)) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`${u.email} borrado`)
      load()
    } catch (e: any) {
      toast.error(`Error: ${e.message || e}`)
    }
  }

  return (
    <div className="au-root">
      <style>{CSS}</style>
      <h1 className="au-h1">Gestión de usuarios</h1>
      <div className="au-sub">{users.length} usuarios en total. Solo admin.</div>

      <div className="au-actions">
        <input
          className="au-search"
          placeholder="Buscar por email/nombre/id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="au-btn au-btn-primary" onClick={startCreate}>+ Nuevo usuario</button>
        <button className="au-btn au-btn-ghost" onClick={load}>↻ Refrescar</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--fg-3)' }}>Cargando…</div>
      ) : (
        <table className="au-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Role</th>
              <th>Lang</th>
              <th>CEFR</th>
              <th>Sesiones</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.nombre} {u.apellido}</td>
                <td>
                  <span className={`au-pill au-pill-${u.role}`}>{u.role}</span>
                  {u.is_kid && <span className="au-pill au-pill-kid" style={{ marginLeft: 4 }}>kid</span>}
                  {!u.is_active && <span className="au-pill au-pill-inactive" style={{ marginLeft: 4 }}>inactive</span>}
                </td>
                <td>{u.target_language}/{u.base_language}</td>
                <td>{u.cefr_level}</td>
                <td>{u.sessions_count}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="au-action-btn edit" onClick={() => startEdit(u)}>Editar</button>
                  <button className="au-action-btn pwd" onClick={() => setPwdReset({ id: u.id, email: u.email })}>Pwd</button>
                  <button className="au-action-btn del" onClick={() => doDelete(u)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <div className="au-modal-backdrop" onClick={() => setEdit(null)}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{edit.id ? `Editar #${edit.id}` : 'Nuevo usuario'}</h2>
            <div className="au-form-grid">
              <div className="au-field full">
                <label>Email</label>
                <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </div>
              {!edit.id && (
                <div className="au-field full">
                  <label>Password</label>
                  <input type="text" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
                </div>
              )}
              <div className="au-field">
                <label>Nombre</label>
                <input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
              </div>
              <div className="au-field">
                <label>Apellido</label>
                <input value={edit.apellido} onChange={(e) => setEdit({ ...edit, apellido: e.target.value })} />
              </div>
              <div className="au-field">
                <label>Teléfono</label>
                <input value={edit.telefono} onChange={(e) => setEdit({ ...edit, telefono: e.target.value })} />
              </div>
              <div className="au-field">
                <label>Role</label>
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as 'admin' | 'student' })}>
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="au-field">
                <label>Idioma que aprende</label>
                <select value={edit.target_language} onChange={(e) => setEdit({ ...edit, target_language: e.target.value })}>
                  <option value="en">en — inglés</option>
                  <option value="es">es — castellano</option>
                  <option value="pt">pt — portugués</option>
                  <option value="it">it — italiano</option>
                  <option value="fr">fr — francés</option>
                </select>
              </div>
              <div className="au-field">
                <label>Base lang</label>
                <select value={edit.base_language} onChange={(e) => setEdit({ ...edit, base_language: e.target.value })}>
                  <option value="es">es</option><option value="en">en</option>
                  <option value="pt">pt</option>
                </select>
              </div>
              <div className="au-field">
                <label>Nivel</label>
                <select value={edit.cefr_level} onChange={(e) => setEdit({ ...edit, cefr_level: e.target.value })}>
                  {(levels.length ? levels : [{ code: edit.cefr_level, friendly_name: '' }]).map(l => (
                    <option key={l.code} value={l.code}>
                      {l.friendly_name ? `${l.code} — ${l.friendly_name}` : l.code}
                    </option>
                  ))}
                </select>
              </div>
              {edit.id && (
                <div className="au-field">
                  <label>Activo</label>
                  <select value={String(edit.is_active)} onChange={(e) => setEdit({ ...edit, is_active: e.target.value === 'true' })}>
                    <option value="true">activo</option>
                    <option value="false">inactivo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="au-modal-actions">
              <button className="au-btn au-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="au-btn au-btn-primary" onClick={submitEdit}>
                {edit.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pwdReset && (
        <div className="au-modal-backdrop" onClick={() => { setPwdReset(null); setNewPwd('') }}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()} style={{ width: 380 }}>
            <h2>Reset password</h2>
            <p style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 14 }}>
              Cambiar password de <b>{pwdReset.email}</b>
            </p>
            <div className="au-field">
              <label>Nuevo password</label>
              <input
                type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                placeholder="nuevo password (texto plano)"
              />
            </div>
            <div className="au-modal-actions">
              <button className="au-btn au-btn-ghost" onClick={() => { setPwdReset(null); setNewPwd('') }}>Cancelar</button>
              <button className="au-btn au-btn-primary" onClick={submitPwd} disabled={!newPwd}>Cambiar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
