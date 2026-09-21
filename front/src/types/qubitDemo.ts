import type { DiceState } from './dice'
import type { BoardSlotState } from '../game/types'

export type GateId = 'X' | 'Y' | 'Z' | 'H' | 'P+' | 'P-' | 'SWAP'

export const QUBIT_COUNT_OPTIONS = [2, 3, 4, 6] as const
export type QubitCount = (typeof QUBIT_COUNT_OPTIONS)[number]

export interface QubitDemoSession {
  qubitCount: number
  myNickname: string
  opponentNickname: string
  targetSlots: DiceState[]
  mySlots: BoardSlotState[]
  opponentSlots: BoardSlotState[]
}
