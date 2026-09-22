import type { CardId } from '../types/card'
import type { CardMeta } from './types'

export const CARD_META: Record<CardId, CardMeta> = {
  pauli_x: { placement: 'field', radius: 1 },
  pauli_x3: { placement: 'field', radius: 3, needsCenterSlot: true },
  pauli_y: { placement: 'field', radius: 1 },
  pauli_y3: { placement: 'field', radius: 3, needsCenterSlot: true },
  pauli_z: { placement: 'field', radius: 1 },
  pauli_z3: { placement: 'field', radius: 3, needsCenterSlot: true },
  rotate_x: { placement: 'field', radius: 1 },
  rotate_y: { placement: 'field', radius: 1 },
  rotate_z: { placement: 'field', radius: 1 },
  phase_forward: { placement: 'field', radius: 1 },
  phase_backward: { placement: 'field', radius: 1 },
  hadamard: { placement: 'field', radius: 1 },
  hadamard_3: { placement: 'field', radius: 3, needsCenterSlot: true },
  swap: { placement: 'discard', radius: 1 },
  kronecker_multiplication: { placement: 'discard', radius: 1 },
  measurement: { placement: 'field', radius: 1 },
  identity: { placement: 'discard', radius: 1 },
  reshuffle: { placement: 'discard', radius: 1 },
  quantum_noise: { placement: 'field', radius: 1 },
  barrier: { placement: 'field', radius: 1 },
  quantum_lucky: { placement: 'field', radius: 1 }
}
