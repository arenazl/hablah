/* AdminAbmsPanel — consola de ABMs del motor (tabs por entidad).
 * Usa el componente genérico AbmTable sobre los endpoints CRUD del backend. */
import { useState } from 'react'
import { AbmTable, AbmCol } from './AbmTable'

interface TabDef { key: string; label: string; endpoint: string; columns: AbmCol[]; newRow: Record<string, unknown> }

const TABS: TabDef[] = [
  {
    key: 'coaches', label: 'Coaches', endpoint: '/coaches',
    columns: [
      { field: 'id', label: 'ID', readOnly: true },
      { field: 'student_type', label: 'Segmento' },
      { field: 'gender', label: 'Género' },
      { field: 'name', label: 'Nombre' },
      { field: 'voice_name', label: 'Voz' },
      { field: 'identity', label: 'Identidad', type: 'textarea' },
      { field: 'personality', label: 'Personalidad', type: 'textarea' },
      { field: 'sort_order', label: 'Orden', type: 'number' },
      { field: 'active', label: 'Activo', type: 'bool' },
    ],
    newRow: { student_type: 'mini', gender: 'female', name: '', voice_name: 'Aoede', identity: '', personality: '', sort_order: 0, active: true },
  },
  {
    key: 'levels', label: 'Niveles', endpoint: '/levels',
    columns: [
      { field: 'id', label: 'ID', readOnly: true },
      { field: 'code', label: 'CEFR' },
      { field: 'friendly_name', label: 'Nombre amigable' },
      { field: 'short_desc', label: 'Descripción' },
      { field: 'language_rule', label: 'Regla de idioma', type: 'textarea' },
      { field: 'sort_order', label: 'Orden', type: 'number' },
      { field: 'active', label: 'Activo', type: 'bool' },
    ],
    newRow: { code: '', friendly_name: '', short_desc: '', language_rule: '', sort_order: 0, active: true },
  },
  {
    key: 'categories', label: 'Categorías', endpoint: '/catalog/categories',
    columns: [
      { field: 'id', label: 'ID', readOnly: true },
      { field: 'slug', label: 'Slug' },
      { field: 'name', label: 'Nombre' },
      { field: 'sort_order', label: 'Orden', type: 'number' },
      { field: 'active', label: 'Activo', type: 'bool' },
    ],
    newRow: { slug: '', name: '', sort_order: 0, active: true },
  },
  {
    key: 'subcategories', label: 'Subcategorías', endpoint: '/catalog/subcategories',
    columns: [
      { field: 'id', label: 'ID', readOnly: true },
      { field: 'category_id', label: 'Categoría (id)', type: 'number' },
      { field: 'slug', label: 'Slug' },
      { field: 'name', label: 'Nombre' },
      { field: 'sort_order', label: 'Orden', type: 'number' },
      { field: 'active', label: 'Activo', type: 'bool' },
    ],
    newRow: { category_id: 1, slug: '', name: '', sort_order: 0, active: true },
  },
]

export default function AdminAbmsPanel() {
  const [tab, setTab] = useState('coaches')
  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>ABMs del motor</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 18px' }}>
          Alta, baja y edición de las entidades dinámicas. Lo que editás acá lo ve el orquestador y lo usa la clase.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '8px 14px', borderRadius: 999, border: `1px solid ${tab === t.key ? '#38bdf8' : '#232936'}`,
                background: tab === t.key ? 'rgba(56,189,248,0.12)' : '#11151d', color: '#e6e8ec',
                fontSize: 13, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 16 }}>
          <AbmTable key={active.key} endpoint={active.endpoint} columns={active.columns} newRow={active.newRow} />
        </div>
      </div>
    </div>
  )
}
