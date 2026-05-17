/* Template Classic CB — barrel re-exports.
   Uso: import { ABMPageClassic, ABMTableClassic, ... } from '../components/ui/classic' */

export { ABMPageClassic, TOOLBAR_IMPORT, TOOLBAR_EXPORT } from './ABMPageClassic'
export type {
  ABMPageClassicProps,
  SubtitlePart,
  FilterChipDef,
  ToolbarButtonDef,
  ViewMode,
} from './ABMPageClassic'

export { ABMTableClassic } from './ABMTableClassic'
export type { ABMColumnClassic } from './ABMTableClassic'

export { ABMCardClassic } from './ABMCardClassic'
export type { CardStat, CardFooterAvatar } from './ABMCardClassic'

export { ABMBadgeClassic } from './ABMBadgeClassic'
export type { BadgeTone } from './ABMBadgeClassic'

export { ABMFilterChip } from './ABMFilterChip'
export { ABMAvatarClassic } from './ABMAvatarClassic'
export type { AvatarTone, AvatarDot } from './ABMAvatarClassic'

export { ABMKebabMenu } from './ABMKebabMenu'
export type { KebabItem } from './ABMKebabMenu'

export { ABMRowActions } from './ABMRowActions'
export type { QuickAction } from './ABMRowActions'
