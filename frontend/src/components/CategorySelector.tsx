/* CategorySelector — elegí intereses con DOS LISTADOS: categoría → subcategoría.
 *
 * Reemplaza las "orbes que se van de pantalla". Flujo: tocás una categoría → ves sus
 * subcategorías → marcás las que te interesan (1 a N) → volvés al menú → repetís →
 * "Arrancar la clase". Guarda las subcategorías elegidas (PUT /me/subcategory-interests)
 * y el sequencer propone el tópico de la clase desde ahí. El alumno NO elige el tópico.
 *
 * Desacoplado del arranque: el padre pasa onStart() (kids y adultos arrancan distinto).
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, Check, X } from 'lucide-react'
import api from '../services/api'

interface Cat { id: number; slug: string; name: string }
interface Sub { id: number; category_id: number; slug: string; name: string }

export default function CategorySelector({ onStart, onSkip, title = '¿De qué te gusta hablar?', startLabel = 'Arrancar la clase', token }: {
  onStart: () => void | Promise<void>
  onSkip?: () => void
  title?: string
  startLabel?: string
  /** Si viene (kids), se usa este token (perfil del chico) con fetch relativo /api,
   *  para NO guardar los intereses en el perfil del adulto. Sin token = axios adulto. */
  token?: string
}) {
  const [cats, setCats] = useState<Cat[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [openCat, setOpenCat] = useState<Cat | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [starting, setStarting] = useState(false)

  // Llamada que respeta el perfil: con token → fetch+kid token; sin token → axios adulto.
  const call = async (method: 'get' | 'put', path: string, body?: unknown) => {
    if (token) {
      const res = await fetch('/api' + path, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) throw new Error('http ' + res.status)
      return { data: await res.json() }
    }
    return method === 'put' ? api.put(path, body) : api.get(path)
  }

  useEffect(() => {
    call('get', '/catalog/public/categories').then((r) => setCats(r.data)).catch(() => toast.error('No pude cargar las categorías'))
    call('get', '/catalog/public/subcategories').then((r) => setSubs(r.data)).catch(() => {})
    call('get', '/me/subcategory-interests').then((r) => setPicked(new Set((r.data?.subcategory_ids || []).map(Number)))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subsOf = useMemo(() => {
    const m: Record<number, Sub[]> = {}
    for (const s of subs) (m[s.category_id] ||= []).push(s)
    return m
  }, [subs])

  const pickedList = useMemo(() => subs.filter((s) => picked.has(s.id)), [subs, picked])

  const toggle = (id: number) => setPicked((p) => {
    const n = new Set(p)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const start = async () => {
    if (picked.size === 0) { toast.error('Elegí al menos una subcategoría'); return }
    setStarting(true)
    try {
      await call('put', '/me/subcategory-interests', { subcategory_ids: Array.from(picked) })
      await onStart()
    } catch {
      toast.error('No se pudo arrancar la clase')
      setStarting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'radial-gradient(circle at 30% 15%, #0E1614 0%, #050A09 100%)', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      {/* header */}
      <div style={{ padding: '18px 22px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9CFCD2', fontWeight: 800 }}>Elegí tus intereses</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: '3px 0 0' }}>{openCat ? openCat.name : title}</h2>
        </div>
        {onSkip && !openCat && (
          <button onClick={onSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600 }}>Saltar →</button>
        )}
      </div>

      {/* chips de seleccionadas */}
      {pickedList.length > 0 && (
        <div style={{ padding: '0 22px 10px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {pickedList.map((s) => (
            <button key={s.id} onClick={() => toggle(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(0,179,126,.5)', background: 'rgba(0,179,126,.16)', color: '#9CFCD2', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {s.name} <X size={12} />
            </button>
          ))}
        </div>
      )}

      {/* listado: categorías o subcategorías de la categoría abierta */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 120px' }}>
        {!openCat ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, maxWidth: 920, margin: '0 auto' }}>
            {cats.map((c) => {
              const count = (subsOf[c.id] || []).filter((s) => picked.has(s.id)).length
              return (
                <button key={c.id} onClick={() => setOpenCat(c)}
                  style={{ position: 'relative', padding: '20px 14px', minHeight: 84, borderRadius: 16, cursor: 'pointer', background: 'linear-gradient(140deg, rgba(0,179,126,.14), rgba(0,179,126,.05))', border: `1px solid ${count > 0 ? 'rgba(0,179,126,.6)' : 'rgba(255,255,255,.1)'}`, color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                  {c.name}
                  {count > 0 && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 800, color: '#06120a', background: '#00B37E', borderRadius: 999, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{count}</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <button onClick={() => setOpenCat(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 14, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={15} /> Volver al menú
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {(subsOf[openCat.id] || []).map((s) => {
                const on = picked.has(s.id)
                return (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderRadius: 999, border: `1.5px solid ${on ? 'rgba(0,179,126,.7)' : 'rgba(255,255,255,.16)'}`, background: on ? 'rgba(0,179,126,.2)' : 'rgba(255,255,255,.04)', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
                    {on && <Check size={15} color="#9CFCD2" />} {s.name}
                  </button>
                )
              })}
              {(subsOf[openCat.id] || []).length === 0 && <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Esta categoría todavía no tiene subcategorías cargadas.</div>}
            </div>
          </div>
        )}
      </div>

      {/* footer: arrancar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 22px calc(16px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(180deg, transparent, rgba(5,10,9,.92) 45%)', display: 'flex', justifyContent: 'center' }}>
        <button onClick={start} disabled={picked.size === 0 || starting}
          style={{ padding: '15px 44px', borderRadius: 999, background: picked.size > 0 ? '#00B37E' : 'rgba(255,255,255,.08)', color: '#fff', border: 'none', fontSize: 16, fontWeight: 800, cursor: picked.size > 0 ? 'pointer' : 'not-allowed', opacity: picked.size > 0 ? 1 : 0.55, boxShadow: picked.size > 0 ? '0 12px 34px rgba(0,179,126,.5)' : 'none' }}>
          {starting ? 'Arrancando…' : `${startLabel}${picked.size > 0 ? ` (${picked.size})` : ''}`}
        </button>
      </div>
    </div>
  )
}
