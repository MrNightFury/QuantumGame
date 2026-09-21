import type { DiceState } from '../types/dice'

export type BoardOwner = 'my' | 'opponent'

export type CardPlacement = 'field' | 'discard'

export interface BoardSlotState {
  dice: DiceState
  frozen: boolean
}

export interface CardMeta {
  placement: CardPlacement
  radius: 1 | 3
  needsCenterSlot?: boolean
}

export interface PlayTarget {
  owner: BoardOwner
  index: number
}

export function slotKey(owner: BoardOwner, index: number): string {
  return `${owner}-${index}`
}

export function parseSlotKey(key: string): PlayTarget | null {
  const match = key.match(/^(my|opponent)-(\d+)$/)
  if (!match) return null
  return {
    owner: match[1] as BoardOwner,
    index: Number(match[2]),
  }
}

export function createBoardSlot(dice: DiceState): BoardSlotState {
  return { dice, frozen: false }
}
