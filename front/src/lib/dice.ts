import { DICE_STATES, type DiceState } from '../types/dice'
import type { BoardSlotState } from '../game/types'
import { createBoardSlot } from '../game/types'

export function randomDiceState(): DiceState {
  return DICE_STATES[Math.floor(Math.random() * DICE_STATES.length)]
}

/** Грань кубика из протокола сервера ("+", "-", "i", "-i", "0", "1"). null — неизвестная строка. */
export function parseDiceFace(face: string): DiceState | null {
  switch (face) {
    case '0':
      return 'ZERO'
    case '1':
      return 'ONE'
    case '+':
      return 'PLUS'
    case '-':
      return 'MINUS'
    case 'i':
      return 'I'
    case '-i':
      return 'I_MINUS'
    default:
      return null
  }
}

/** Обратное преобразование DiceState в строку грани протокола сервера. */
export function diceFaceOf(state: DiceState): string {
  switch (state) {
    case 'ZERO':
      return '0'
    case 'ONE':
      return '1'
    case 'PLUS':
      return '+'
    case 'MINUS':
      return '-'
    case 'I':
      return 'i'
    case 'I_MINUS':
      return '-i'
  }
}

export function randomDiceRow(length = 4): DiceState[] {
  return Array.from({ length }, () => randomDiceState())
}

export function randomBoardRow(length = 4): BoardSlotState[] {
  return randomDiceRow(length).map((dice) => createBoardSlot(dice))
}
