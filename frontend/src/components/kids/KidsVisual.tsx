/* Render del visual de una palabra kids: Lottie animado (.json), SVG estático (.svg)
 * o emoji (fallback). Compartido por la galería y la vista de review de vocab. */
import Lottie from 'lottie-react'
import { useLottieJson } from './kidsBuddies'

function LottieCell({ file, size }: { file: string; size: number }) {
  const { data, error } = useLottieJson(file)
  if (error || !data) return <div style={{ width: size, height: size }} />
  return <Lottie animationData={data} loop autoplay style={{ width: size, height: size }} />
}

export function VisualAsset({ asset, emoji, alt, size = 70 }: { asset: string | null; emoji: string; alt: string; size?: number }) {
  if (asset?.endsWith('.json')) return <LottieCell file={asset} size={size} />
  if (asset?.endsWith('.svg')) return <img src={asset} alt={alt} width={size} height={size} loading="lazy" />
  return <span style={{ fontSize: size * 0.72 }}>{emoji || '∅'}</span>
}

export function assetKind(a: string | null): { label: string; color: string } {
  if (a?.startsWith('/animals/')) return { label: 'Lottie custom', color: '#a855f7' }
  if (a?.endsWith('.json')) return { label: 'Lottie', color: '#22c55e' }
  if (a?.endsWith('.svg')) return { label: 'SVG', color: '#38bdf8' }
  return { label: 'sin visual', color: '#f59e0b' }
}
