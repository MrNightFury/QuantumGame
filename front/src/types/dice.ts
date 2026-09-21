export const DICE_STATES = [
  'ZERO',
  'ONE',
  'PLUS',
  'MINUS',
  'I',
  'I_MINUS',
] as const

export type DiceState = (typeof DICE_STATES)[number]

export const DICE_TEXTURE: Record<DiceState, string> = {
  ZERO: 'zero',
  ONE: 'one',
  PLUS: 'plus',
  MINUS: 'minus',
  I: 'i_plus',
  I_MINUS: 'i_minus',
}

export interface Dice {
  id: string
  state: DiceState
  requiredState?: DiceState | null
}
