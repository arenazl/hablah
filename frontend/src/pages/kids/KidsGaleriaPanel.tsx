/* /kids/galeria — QA visual de la biblioteca core de vocab kids (126 palabras).
 * Muestra cada palabra con su asset real: Lottie animado (.json), SVG estático (.svg)
 * o emoji (fallback). Agrupado por categoría. Para revisar que todo "transmita".
 */
import { useEffect, useMemo, useState } from 'react'
import Lottie from 'lottie-react'
import { useLottieJson } from '../../components/kids/kidsBuddies'
import { motorAPI, type KidsVocabItem } from '../../services/api'

function LottieCell({ file }: { file: string }) {
  const { data, error } = useLottieJson(file)
  if (error || !data) return <div style={{ width: 76, height: 76 }} />
  return <Lottie animationData={data} loop autoplay style={{ width: 76, height: 76 }} />
}

function Visual({ item }: { item: KidsVocabItem }) {
  const a = item.asset_file
  if (a?.endsWith('.json')) return <LottieCell file={a} />
  if (a?.endsWith('.svg')) return <img src={a} alt={item.word_en} width={70} height={70} loading="lazy" />
  return <span style={{ fontSize: 52 }}>{item.emoji}</span>
}

function kind(a: string | null): { label: string; color: string } {
  if (a?.startsWith('/animals/')) return { label: 'Lottie custom', color: '#a855f7' }
  if (a?.endsWith('.json')) return { label: 'Lottie Noto', color: '#22c55e' }
  if (a?.endsWith('.svg')) return { label: 'SVG Noto', color: '#38bdf8' }
  return { label: 'emoji', color: '#f59e0b' }
}

export default function KidsGaleriaPanel() {
  const [items, setItems] = useState<KidsVocabItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    motorAPI.kidsVocab().then(setItems).catch(() => setItems([])).finally(() => setLoading(false))
  }, [])

  const byCat = useMemo(() => {
    const m = new Map<string, KidsVocabItem[]>()
    for (const it of items) { const l = m.get(it.category) || []; l.push(it); m.set(it.category, l) }
    return [...m.entries()]
  }, [items])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const it of items) { const k = kind(it.asset_file).label; c[k] = (c[k] || 0) + 1 }
    return c
  }, [items])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e2e', color: '#fff', fontFamily: 'Nunito, system-ui, sans-serif', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>Biblioteca visual kids</h1>
        <p style={{ color: '#9aa6e0', margin: '0 0 16px' }}>
          {items.length} palabras · {Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}
        </p>
        {loading && <p style={{ color: '#9aa6e0' }}>Cargando…</p>}
        {byCat.map(([cat, list]) => (
          <section key={cat} style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: 1, color: '#c7d2fe', margin: '0 0 10px', borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: 6 }}>{cat} · {list.length}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 12 }}>
              {list.map((it) => {
                const k = kind(it.asset_file)
                return (
                  <div key={it.word_en} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ height: 78, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Visual item={it} /></div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{it.word_en}</div>
                    <div style={{ fontSize: 12, color: '#9aa6e0' }}>{it.word_es}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: k.color, border: `1px solid ${k.color}`, borderRadius: 99, padding: '1px 6px', marginTop: 2 }}>{k.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
