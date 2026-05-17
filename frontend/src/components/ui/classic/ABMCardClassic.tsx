/* ABMCardClassic — Card moderna del Template Classic CB.
   Look 2026: soft shadows con dramatic hover, top accent line dorado/navy,
   avatar con halo, stats con tabular-nums, micro-interacciones. */
import { CSSProperties, ReactNode, useState } from 'react'
import { ABMAvatarClassic, AvatarTone, AvatarDot } from './ABMAvatarClassic'
import { ABMKebabMenu, KebabItem } from './ABMKebabMenu'

export interface CardStat {
  value: string | number
  label: string
}

export interface CardFooterAvatar {
  initials: string
  tone?: AvatarTone
}

interface Props {
  avatar: {
    initials: string
    tone?: AvatarTone
    dot?: AvatarDot
  }
  title: string
  subtitle?: string
  stats?: CardStat[]
  footerAvatars?: CardFooterAvatar[]
  footerText?: ReactNode
  kebabItems?: KebabItem[]
  onClick?: () => void
  className?: string
  style?: CSSProperties
}

/** color del top accent line según el tono del avatar */
function topAccentColor(tone?: AvatarTone): string {
  switch (tone) {
    case 'gold': return 'var(--color-accent)'
    case 'navy': return 'var(--navy-800)'
    case 'soft': return 'var(--ink-5)'
    default:     return 'var(--color-accent)'
  }
}

export function ABMCardClassic({
  avatar, title, subtitle, stats, footerAvatars, footerText, kebabItems, onClick, className = '', style: extraStyle,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const accentColor = topAccentColor(avatar.tone)
  const clickable = !!onClick

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ease-out ${clickable ? 'cursor-pointer' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        boxShadow: hovered && clickable
          ? '0 1px 0 rgba(14,43,79,0.04), 0 12px 32px rgba(14,43,79,0.10), 0 4px 8px rgba(14,43,79,0.04)'
          : '0 1px 0 rgba(14,43,79,0.04), 0 1px 3px rgba(14,43,79,0.05)',
        transform: hovered && clickable ? 'translateY(-4px)' : 'translateY(0)',
        ...(extraStyle || {}),
      }}
    >
      {/* Top accent line — color del tone del avatar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
        style={{
          background: hovered
            ? `linear-gradient(90deg, ${accentColor}, ${accentColor}cc, ${accentColor})`
            : accentColor,
          opacity: hovered ? 1 : 0.85,
        }}
      />

      <div className="p-6 flex flex-col gap-5">
        {/* Head: avatar + título + kebab */}
        <header className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {/* Halo glow alrededor del avatar en hover */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-500 -z-10"
              style={{
                background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
                transform: hovered ? 'scale(1.4)' : 'scale(1)',
                opacity: hovered ? 1 : 0,
              }}
            />
            <ABMAvatarClassic
              initials={avatar.initials}
              tone={avatar.tone}
              dot={avatar.dot}
              size="lg"
            />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              className="font-serif-display leading-tight m-0 truncate transition-colors duration-200"
              style={{
                fontSize: '22px',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs m-0 mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'var(--ink-4)' }}>
                {subtitle}
              </p>
            )}
          </div>

          {kebabItems && kebabItems.length > 0 && (
            <div className="-mr-2 -mt-2">
              <ABMKebabMenu items={kebabItems} />
            </div>
          )}
        </header>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div
            className="grid gap-5 pt-5"
            style={{
              gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
              borderTop: '1px solid var(--divider)',
            }}
          >
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col min-w-0">
                <div
                  className="font-serif-display tnum leading-none truncate"
                  style={{
                    fontSize: '30px',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-1.5 text-[10px] uppercase tracking-wider font-semibold truncate"
                  style={{ color: 'var(--ink-5)', letterSpacing: '0.08em' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: stack avatares + texto */}
        {(footerAvatars || footerText) && (
          <footer
            className="flex items-center gap-3 pt-4"
            style={{ borderTop: '1px solid var(--divider)' }}
          >
            {footerAvatars && footerAvatars.length > 0 && (
              <div className="flex items-center">
                {footerAvatars.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      marginLeft: i === 0 ? 0 : -8,
                      transition: 'transform 200ms',
                      transform: hovered ? `translateY(-${i * 1}px)` : 'translateY(0)',
                    }}
                  >
                    <ABMAvatarClassic
                      initials={a.initials}
                      tone={a.tone ?? 'soft'}
                      size="sm"
                      style={{ boxShadow: '0 0 0 2px var(--surface)' }}
                    />
                  </div>
                ))}
              </div>
            )}
            {footerText && (
              <div className="text-xs flex-1 min-w-0" style={{ color: 'var(--ink-3)' }}>
                {footerText}
              </div>
            )}
          </footer>
        )}
      </div>
    </article>
  )
}
