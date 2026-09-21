export type CardType =
  | 'PAULI'
  | 'ROTATE'
  | 'PHASE'
  | 'HADAMARD'
  | 'SWAP'
  | 'KRONECKER_MULTIPLICATION'
  | 'MEASUREMENT'
  | 'IDENTITY'
  | 'RESHUFFLE'

export type CardId =
  | 'pauli_x'
  | 'pauli_x3'
  | 'pauli_y'
  | 'pauli_y3'
  | 'pauli_z'
  | 'pauli_z3'
  | 'rotate_x'
  | 'rotate_y'
  | 'rotate_z'
  | 'phase_forward'
  | 'phase_backward'
  | 'hadamard'
  | 'hadamard_3'
  | 'swap'
  | 'kronecker_multiplication'
  | 'measurement'
  | 'identity'
  | 'reshuffle'


export interface Card {
  id: string
  type: string
}



export interface HandCard {
  instanceId: string
  cardId: CardId
}

