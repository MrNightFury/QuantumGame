import type { CardId } from '../types/card'
import type { DiceState } from '../types/dice'

export type Axis = 'X' | 'Y' | 'Z'

const AXIS_STATES: Record<Axis, DiceState[]> = {
  X: ['ZERO', 'ONE', 'I', 'I_MINUS'],
  Y: ['ZERO', 'ONE', 'PLUS', 'MINUS'],
  Z: ['PLUS', 'MINUS', 'I', 'I_MINUS'],
}

export function getAxisForCard(cardId: CardId): Axis | null {
  if (cardId.includes('pauli_x') || cardId === 'rotate_x') return 'X'
  if (cardId.includes('pauli_y') || cardId === 'rotate_y' || cardId.startsWith('hadamard')) return 'Y'
  if (cardId.includes('pauli_z') || cardId === 'rotate_z' || cardId.startsWith('phase')) return 'Z'
  return null
}

export function isCompatibleWithAxis(state: DiceState, axis: Axis): boolean {
  return AXIS_STATES[axis].includes(state)
}

export function getStatesOnAxis(axis: Axis): DiceState[] {
  return AXIS_STATES[axis]
}
