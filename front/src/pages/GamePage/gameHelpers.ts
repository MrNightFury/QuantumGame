import type { CSSProperties } from 'react'
import type { CardId } from '../../types/card'

export const TURN_SEC = 45
export const DOUBLE_TAP_MS = 400
export const LONG_PRESS_MS = 450
export const LONG_PRESS_MOVE_PX = 10

export const DOUBLE_TAP_CARDS = new Set<CardId>([
  'identity',
  'kronecker_multiplication',
  'swap',
  'reshuffle',
])

export function handCardStyle(index: number, count: number): CSSProperties {
  if (count <= 1) return { zIndex: 1 }

  const center = (count - 1) / 2
  const t = (index - center) / center
  const angle = t * Math.min(20, 10 + count)
  const lift = (1 - Math.cos((Math.abs(t) * Math.PI) / 2)) * 14

  return {
    transform: `rotate(${angle}deg) translateY(${lift}px)`,
    transformOrigin: 'bottom center',
    zIndex: index + 1,
    marginLeft: index === 0 ? 0 : 'calc(-1 * clamp(2.25rem, 22%, 3.5rem))',
  }
}

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const RULES_DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTwxsPvUDY9snIV4-XC_fYptWwsZN1GIQXOdIIOyReMrFxL1jr5dwaHTmaidYKSjw/pub'

export const RULES_DOC_WIDTH = 793
export const RULES_FRAME_HEIGHT = 520
