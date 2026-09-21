import type { CardId } from '../types/card'
import type { DiceState } from '../types/dice'
import { getAxisForCard, isCompatibleWithAxis } from './axes'

function swapPair(state: DiceState, a: DiceState, b: DiceState): DiceState {
  if (state === a) return b
  if (state === b) return a
  return state
}

export function applyPauli(state: DiceState, axis: 'X' | 'Y' | 'Z'): DiceState {
  switch (axis) {
    case 'X':
      if (state === 'ZERO') return 'ONE'
      if (state === 'ONE') return 'ZERO'
      if (state === 'I') return 'I_MINUS'
      if (state === 'I_MINUS') return 'I'
      return state
    case 'Y':
      if (state === 'PLUS' || state === 'MINUS') return swapPair(state, 'PLUS', 'MINUS')
      return swapPair(state, 'ZERO', 'ONE')
    case 'Z':
      if (state === 'PLUS' || state === 'MINUS') return swapPair(state, 'PLUS', 'MINUS')
      return swapPair(state, 'I', 'I_MINUS')
  }
}

export function applyPhase(state: DiceState, forward: boolean): DiceState {
  const cycle: DiceState[] = ['PLUS', 'I', 'MINUS', 'I_MINUS']
  const index = cycle.indexOf(state)
  if (index === -1) return state
  const next = forward
    ? cycle[(index + 1) % cycle.length]
    : cycle[(index - 1 + cycle.length) % cycle.length]
  return next
}

export function applyHadamard(state: DiceState): DiceState {
  switch (state) {
    case 'ZERO': return 'PLUS'
    case 'ONE': return 'MINUS'
    case 'PLUS': return 'ZERO'
    case 'MINUS': return 'ONE'
    case 'I': return 'I_MINUS'
    case 'I_MINUS': return 'I'
  }
}

export function applyAutoCardEffect(state: DiceState, cardId: CardId): DiceState {
  if (cardId === 'pauli_x' || cardId === 'pauli_x3') {
    return isCompatibleWithAxis(state, 'X') ? applyPauli(state, 'X') : state
  }
  if (cardId === 'pauli_y' || cardId === 'pauli_y3') {
    return isCompatibleWithAxis(state, 'Y') ? applyPauli(state, 'Y') : state
  }
  if (cardId === 'pauli_z' || cardId === 'pauli_z3') {
    return isCompatibleWithAxis(state, 'Z') ? applyPauli(state, 'Z') : state
  }
  if (cardId === 'phase_forward') return applyPhase(state, true)
  if (cardId === 'phase_backward') return applyPhase(state, false)
  if (cardId === 'hadamard' || cardId === 'hadamard_3') return applyHadamard(state)
  return state
}

export function applyRotate(state: DiceState, cardId: CardId, target: DiceState): DiceState {
  const axis = getAxisForCard(cardId)
  if (!axis || !isCompatibleWithAxis(state, axis) || !isCompatibleWithAxis(target, axis)) {
    return state
  }
  return target
}
