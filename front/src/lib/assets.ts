import { DICE_TEXTURE, type DiceState } from '../types/dice'
import type { CardId } from '../types/card'

const drawableImages = import.meta.glob<string>('../assets/drawable/*.png', {
  eager: true,
  import: 'default',
})

// SPIFFS paths must stay within 31 chars, so the longest card id uses a
// shortened file name.
const FILE_NAME_OVERRIDES: Record<string, string> = {
  kronecker_multiplication: 'kronecker_mult',
}

function getDrawableUrl(filename: string): string {
  const name = FILE_NAME_OVERRIDES[filename] ?? filename
  const key = `../assets/drawable/${name}.png`
  return drawableImages[key] ?? ''
}

export function getCardImageUrl(cardId: CardId): string {
  return getDrawableUrl(cardId)
}

export function getDiceImageUrl(state: DiceState): string {
  return getDrawableUrl(DICE_TEXTURE[state])
}
