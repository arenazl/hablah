/**
 * /app/kids -- Pantalla del adulto para administrar perfiles hijos.
 *
 * - Lista los kids profiles del adulto logueado (via /api/kids/profiles)
 * - Permite crear un perfil nuevo (form simple: nombre + edad + color)
 * - Click en kid -> POST /api/kids/profiles/{id}/login -> guarda token kid
 *   en localStorage 'kids_token' y abre /kids en una nueva pestania/ruta
 *
 * Requiere que el adulto este logueado. El token de auth viene del context
 * de AuthContext (Authorization header lo seteamos manualmente).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, ArrowRight } from 'lucide-react'
import { Habi } from './_shared'
import { KIDS_TOKEN_KEY } from './KidsContext'
import { KIDS_AGE_KEY } from './KidsAgeSelect'

interface KidProfile {
  id: number
  name: string
  age_group: 'mini' | 'junior' | 'tween'
  avatar_color: string
  coins: number
  rank_slug: string
  charlas_count: number
}

const AGE_LABEL: Record<string, string> = {
  mini: 'Mini · 4-7 años',
  junior: 'Junior · 7-10 años',
  tween: 'Tween · 10-14 años',
}

const AVATAR_COLORS = ['#FF6AA9', '#A855F7', '#3B82F6', '#06B6D4', '#00B37E', '#FACC15', '#FB7C39']

const PAGE_CSS = `
.parent-kids-wrap { padding:24px 32px 48px; max-width:980px; margin:0 auto; }
.parent-kids-head { display:flex; align-items:center; gap:14px; margin-bottom:24px; }
.parent-kids-head .ic { width:48px; height:48px; border-radius:14px; background:#FFF7DD; color:#7A5800; display:grid; place-items:center; flex-shrink:0; }
.parent-kids-head h1 { font-family:'Sora',sans-serif; font-weight:800; font-size:28px; margin:0; letter-spacing:-0.02em; }
.parent-kids-head p { margin:4px 0 0; color:#5A625F; font-size:14px; }

.parent-kids-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
.parent-kid-card { background:#fff; border:1px solid rgba(13,20,18,.08); border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:14px; cursor:pointer; transition:all .18s; text-align:left; }
.parent-kid-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px rgba(13,20,18,.12); border-color:rgba(0,179,126,.4); }
.parent-kid-card .av { width:60px; height:60px; border-radius:18px; display:grid; place-items:center; color:#fff; font-family:'Sora',sans-serif; font-weight:800; font-size:24px; }
.parent-kid-card h3 { font-family:'Sora',sans-serif; font-weight:800; font-size:18px; margin:0; letter-spacing:-0.015em; }
.parent-kid-card .age { font-size:12px; color:#5A625F; margin-top:2px; }
.parent-kid-card .stats { display:flex; gap:14px; font-size:12px; color:#3A4441; padding-top:10px; border-top:1px dashed rgba(13,20,18,.08); }
.parent-kid-card .stats b { font-family:'Sora',sans-serif; font-weight:800; color:#0D1412; }
.parent-kid-card .enter { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#008F63; margin-top:auto; }
.parent-kid-card-new { background:repeating-linear-gradient(135deg,#FFF7DD,#FFF7DD 6px,#FFE9A6 6px 12px); border:2px dashed rgba(255,184,0,.5); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; min-height:200px; cursor:pointer; transition:all .18s; color:#7A5800; border-radius:20px; padding:20px; }
.parent-kid-card-new:hover { background:#FFE9A6; }
.parent-kid-card-new .ic { width:56px; height:56px; border-radius:18px; background:#FFB800; color:#3A2A00; display:grid; place-items:center; }
.parent-kid-card-new h3 { font-family:'Sora',sans-serif; font-weight:800; font-size:16px; margin:0; }
.parent-kid-card-new p { margin:0; font-size:12px; }

.parent-kid-form { background:#fff; border:1px solid rgba(13,20,18,.08); border-radius:20px; padding:24px; margin-top:24px; max-width:520px; }
.parent-kid-form h2 { font-family:'Sora',sans-serif; font-weight:800; font-size:20px; margin:0 0 16px; }
.parent-kid-form label { display:block; font-size:12px; color:#5A625F; margin-bottom:6px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
.parent-kid-form input { width:100%; padding:12px 14px; border-radius:12px; border:1px solid rgba(13,20,18,.14); font-size:15px; font-family:inherit; outline:none; transition:border .15s; }
.parent-kid-form input:focus { border-color:#00B37E; box-shadow:0 0 0 3px rgba(0,179,126,.16); }
.parent-kid-form .field { margin-bottom:14px; }
.parent-kid-form .colors { display:flex; gap:8px; flex-wrap:wrap; }
.parent-kid-form .color-dot { width:36px; height:36px; border-radius:50%; cursor:pointer; border:3px solid transparent; transition:all .15s; }
.parent-kid-form .color-dot.active { border-color:#0D1412; transform:scale(1.1); }
.parent-kid-form .form-actions { display:flex; gap:10px; margin-top:14px; }
.parent-kid-form .btn-primary { background:#00B37E; color:#fff; border:0; padding:12px 22px; border-radius:12px; font-weight:700; cursor:pointer; flex:1; transition:all .15s; }
.parent-kid-form .btn-primary:hover { background:#008F63; transform:translateY(-1px); }
.parent-kid-form .btn-ghost { background:transparent; color:#5A625F; border:1px solid rgba(13,20,18,.14); padding:12px 22px; border-radius:12px; font-weight:600; cursor:pointer; }

.parent-empty { text-align:center; padding:48px 24px; color:#5A625F; }
.parent-empty .habi-wrap { display:flex; justify-content:center; margin-bottom:16px; }
.parent-empty h3 { font-family:'Sora',sans-serif; font-weight:800; font-size:22px; color:#0D1412; margin:0 0 8px; }
.parent-empty p { margin:0 0 20px; font-size:14px; max-width:420px; margin-left:auto; margin-right:auto; }
`

export function KidsParentSwitch() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const [kids, setKids] = useState<KidProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAge, setFormAge] = useState<number>(6)
  const [formColor, setFormColor] = useState(AVATAR_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const loadKids = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/kids/profiles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setKids(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadKids() }, [token])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !formName.trim()) return
    setError(null)
    try {
      const res = await fetch('/api/kids/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formName.trim(), age: formAge, avatar_color: formColor }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail ?? 'No se pudo crear el perfil')
        return
      }
      setFormName('')
      setCreating(false)
      await loadKids()
    } catch {
      setError('Error de red')
    }
  }

  const enterAsKid = async (kid: KidProfile) => {
    if (!token) return
    try {
      const res = await fetch(`/api/kids/profiles/${kid.id}/login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        alert('No se pudo entrar como ese perfil')
        return
      }
      const data = await res.json()
      localStorage.setItem(KIDS_TOKEN_KEY, data.access_token)
      localStorage.setItem(KIDS_AGE_KEY, data.profile.age_group)
      navigate('/kids')
    } catch {
      alert('Error de red')
    }
  }

  if (loading) {
    return (
      <div className="parent-kids-wrap">
        <style>{PAGE_CSS}</style>
        <p>Cargando perfiles...</p>
      </div>
    )
  }

  return (
    <div className="parent-kids-wrap">
      <style>{PAGE_CSS}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap" />

      <div className="parent-kids-head">
        <div className="ic">
          <Users size={26} strokeWidth={2.2} />
        </div>
        <div>
          <h1>Modo Kids · Perfiles</h1>
          <p>Acá administrás los perfiles de tus chicos. Hacé click en uno para entrar en su modo Habi.</p>
        </div>
      </div>

      {kids.length === 0 && !creating && (
        <div className="parent-empty">
          <div className="habi-wrap"><Habi size={120} bounce /></div>
          <h3>Todavía no creaste ningún perfil</h3>
          <p>Creá un perfil hijo con su nombre y edad. Va a tener su propio espacio amigable, su mascota Habi y sus aventuras.</p>
          <button className="parent-kid-card-new" onClick={() => setCreating(true)} style={{ display: 'inline-flex', flexDirection: 'row', gap: 12, minHeight: 'auto', padding: '14px 20px' }}>
            <UserPlus size={20} />
            <span>Crear primer perfil</span>
          </button>
        </div>
      )}

      {kids.length > 0 && (
        <div className="parent-kids-grid">
          {kids.map((k) => (
            <button key={k.id} className="parent-kid-card" onClick={() => enterAsKid(k)}>
              <div className="av" style={{ background: k.avatar_color }}>{k.name.charAt(0)}</div>
              <div>
                <h3>{k.name}</h3>
                <div className="age">{AGE_LABEL[k.age_group] ?? k.age_group}</div>
              </div>
              <div className="stats">
                <span><b>{k.coins}</b> monedas</span>
                <span><b>{k.charlas_count}</b> charlas</span>
              </div>
              <span className="enter">
                Entrar como {k.name.split(' ')[0]} <ArrowRight size={14} />
              </span>
            </button>
          ))}
          {!creating && (
            <button className="parent-kid-card-new" onClick={() => setCreating(true)}>
              <div className="ic"><UserPlus size={24} strokeWidth={2.2} /></div>
              <h3>Nuevo perfil</h3>
              <p>Otro chico de la familia</p>
            </button>
          )}
        </div>
      )}

      {creating && (
        <form className="parent-kid-form" onSubmit={onCreate}>
          <h2>Crear perfil hijo</h2>
          <div className="field">
            <label>Nombre</label>
            <input autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="ej. Mateo" maxLength={40} />
          </div>
          <div className="field">
            <label>Edad ({formAge} años — {formAge <= 7 ? 'Mini' : formAge <= 10 ? 'Junior' : 'Tween'})</label>
            <input type="range" min={4} max={14} value={formAge} onChange={(e) => setFormAge(Number(e.target.value))} style={{ accentColor: '#00B37E' }} />
          </div>
          <div className="field">
            <label>Color de avatar</label>
            <div className="colors">
              {AVATAR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-dot${formColor === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setFormColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#B42127', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!formName.trim()}>Crear perfil</button>
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
