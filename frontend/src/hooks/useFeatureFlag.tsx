/**
 * Hook + Gate component para progressive disclosure.
 *
 * El backend devuelve `feature_flags` en /api/me/profile con el estado de
 * cada feature gateable (unlocked / sessions_left / needs_intro). El hook
 * lee ese estado del profile global pasado por contexto/prop.
 *
 * Uso:
 *   const flag = useFeatureFlag('pedagogy_picker', profile)
 *   if (flag.unlocked) <PedagogyPicker />
 *
 * O via componente declarativo:
 *   <Gate flag="pedagogy_picker" profile={profile}>
 *     <PedagogyPicker />
 *   </Gate>
 */
import { type ReactNode } from 'react'
import type { MeProfile } from '../services/api'

export interface FeatureFlag {
  unlocked: boolean
  threshold: number
  sessions_left: number
  needs_intro: boolean
}

export type FeatureKey =
  | 'streak'
  | 'pedagogy_picker'
  | 'free_topic'
  | 'mapa_basico'
  | 'disparadores'
  | 'tune_audio'
  | 'voice_room'
  | 'detailed_report'

const DEFAULT_LOCKED: FeatureFlag = {
  unlocked: false, threshold: 999, sessions_left: 999, needs_intro: false,
}

export function useFeatureFlag(key: FeatureKey, profile: MeProfile | null): FeatureFlag {
  if (!profile) return DEFAULT_LOCKED
  const flags = (profile as MeProfile & { feature_flags?: Record<string, FeatureFlag> }).feature_flags
  return flags?.[key] || DEFAULT_LOCKED
}

interface GateProps {
  flag: FeatureKey
  profile: MeProfile | null
  children: ReactNode
  /** Render alternativo cuando esta locked. Default: null (no renderiza nada) */
  locked?: ReactNode
}

export function Gate({ flag, profile, children, locked = null }: GateProps) {
  const f = useFeatureFlag(flag, profile)
  return <>{f.unlocked ? children : locked}</>
}
