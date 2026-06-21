/* /kids/curar — review/curación del vocab por tópico kids: cada tópico con su vocab,
 * el visual de cada palabra y la cobertura. Para que el profe (la vara) lo recorra.
 * (Acciones de curación — sacar tópico/palabra — se agregan después.)
 */
import { useEffect, useMemo, useState } from 'react'
import { motorAPI, type KidsTopicVocab } from '../../services/api'
import { VisualAsset, assetKind } from '../../components/kids/KidsVisual'

function coverage(t: KidsTopicVocab): { withImg: number; total: number; pct: number } {
  const total = t.vocab.length
  const withImg = t.vocab.filter((v) => !!v.asset_file).length
  return { withImg, total, pct: total ? Math.round((withImg / total) * 100) : 0 }
}

export default function KidsCurarPanel() {
  const [topics, setTopics] = useState<KidsTopicVocab[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    motorAPI.kidsTopicVocab().then(setTopics).catch(() => setTopics([])).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => topics.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())),
    [topics, q],
  )
  const stats = useMemo(() => {
    let w = 0, n = 0
    for (const t of topics) for (const v of t.vocab) { n++; if (v.asset_file) w++ }
    return { topics: topics.length, words: n, withImg: w, pct: n ? Math.round((w / n) * 100) : 0 }
  }, [topics])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e2e', color: '#fff', fontFamily: 'Nunito, system-ui, sans-serif', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>Vocab por tópico — kids</h1>
        <p style={{ color: '#9aa6e0', margin: '0 0 14px' }}>
          {stats.topics} tópicos · {stats.words} palabras · {stats.withImg} con imagen ({stats.pct}% cobertura)
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tópico…"
          style={{ width: '100%', maxWidth: 360, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.06)', color: '#fff', marginBottom: 20, fontSize: 15 }} />

        {loading && <p style={{ color: '#9aa6e0' }}>Cargando… (el batch puede seguir generando)</p>}
        {!loading && !topics.length && <p style={{ color: '#9aa6e0' }}>Todavía no hay vocab generado. Esperá a que termine el batch.</p>}

        {filtered.map((t) => {
          const c = coverage(t)
          const col = c.pct >= 80 ? '#22c55e' : c.pct >= 50 ? '#f59e0b' : '#ef4444'
          return (
            <section key={t.topic_id} style={{ marginBottom: 22, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{t.title}</h2>
                <span style={{ fontSize: 12, fontWeight: 800, color: col, border: `1px solid ${col}`, borderRadius: 99, padding: '2px 10px' }}>
                  {c.withImg}/{c.total} con imagen · {c.pct}%
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 10 }}>
                {t.vocab.map((v) => {
                  const k = assetKind(v.asset_file)
                  return (
                    <div key={v.word_en} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <VisualAsset asset={v.asset_file} emoji={v.emoji} alt={v.word_en} size={60} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{v.word_en}</div>
                      <div style={{ fontSize: 11, color: '#9aa6e0' }}>{v.word_es}</div>
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: k.color }}>{k.label}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
