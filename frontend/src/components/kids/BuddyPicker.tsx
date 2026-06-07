/**
 * BuddyPicker — pantalla "Elegí tu amiguito" para la sesión kids.
 * Muestra todos los personajes animados en loop; el chico tapea el que quiere
 * (touch targets grandes, no necesita leer). El elegido lo acompaña la clase.
 */
import Lottie from 'lottie-react'
import { KIDS_BUDDIES, useLottieJson, type BuddyDef } from './kidsBuddies'

interface BuddyPickerProps {
  selectedId?: string | null
  onPick: (buddy: BuddyDef) => void
}

function BuddyTile({
  buddy,
  selected,
  onPick,
}: {
  buddy: BuddyDef
  selected: boolean
  onPick: () => void
}) {
  const { data, error } = useLottieJson(buddy.file)
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Elegir ${buddy.label}`}
      aria-pressed={selected}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '14px 10px',
        borderRadius: 24,
        cursor: 'pointer',
        background: selected ? 'rgba(156,252,210,.16)' : 'rgba(255,255,255,.05)',
        border: selected ? '2px solid #9CFCD2' : '2px solid rgba(255,255,255,.10)',
        boxShadow: selected ? '0 0 28px rgba(156,252,210,.30)' : 'none',
        transition: 'transform 140ms ease, border-color 140ms ease, background 140ms ease',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <div style={{ width: 96, height: 96, display: 'grid', placeItems: 'center' }}>
        {data && !error ? (
          <Lottie animationData={data} loop autoplay style={{ width: '100%', height: '100%' }} />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,.12), transparent 70%)',
            }}
          />
        )}
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: selected ? '#9CFCD2' : '#E7ECEA' }}>
        {buddy.label}
      </span>
    </button>
  )
}

export function BuddyPicker({ selectedId, onPick }: BuddyPickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>
        ¡Elegí tu amiguito!
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          width: '100%',
          maxWidth: 560,
        }}
      >
        {KIDS_BUDDIES.map((b) => (
          <BuddyTile key={b.id} buddy={b} selected={b.id === selectedId} onPick={() => onPick(b)} />
        ))}
      </div>
    </div>
  )
}
