export type CardType =
  | 'PAULI'
  | 'PHASE'
  | 'ROTATE'
  | 'HADAMARD'
  | 'SWAP'
  | 'KRONECKER_MULTIPLICATION'
  | 'MEASUREMENT'
  | 'IDENTITY'
  | 'RESHUFFLE'

export type CardId =
  | 'pauli_x'
  | 'pauli_y'
  | 'pauli_z'
  | 'pauli_x3'
  | 'pauli_y3'
  | 'pauli_z3'
  | 'phase_forward'
  | 'phase_backward'
  | 'rotate_x'
  | 'rotate_y'
  | 'rotate_z'
  | 'hadamard'
  | 'hadamard_3'
  | 'swap'
  | 'quantum_noise'
  | 'kronecker_multiplication'
  | 'measurement'
  | 'identity'
  | 'barrier'
  | 'reshuffle'
  | 'quantum_lucky'


export interface Card {
  id: string
  type: string
}



export interface HandCard {
  instanceId: string
  cardId: CardId
}

