import type { CardId, HandCard } from './card'
import type { DiceState } from './dice'
import type { BoardOwner, BoardSlotState, PlayTarget } from '../game/types'

export interface GameSession {
  sessionId: string
  myPlayerId: string
  opponentPlayerId: string
  myNickname: string
  opponentNickname: string
  currentPlayerId: string
  targetSlots: DiceState[]
  mySlots: BoardSlotState[]
  opponentSlots: BoardSlotState[]
  myHand: HandCard[]
  deck: CardId[]
  fieldCards: Record<string, HandCard>
  remainingMoves: number
  cardsPlayedThisTurn: number
  activeRow: BoardOwner | null
}

export type GameAction =
  | {
      type: 'PLAY_FIELD_CARD'
      cardInstanceId: string
      target: PlayTarget
      rotateTarget?: DiceState
    }
  | {
      type: 'PLAY_SWAP'
      cardInstanceId: string
      first: PlayTarget
      second: PlayTarget
    }
  | { type: 'PLAY_IDENTITY'; cardInstanceId: string }
  | { type: 'PLAY_KRONECKER'; cardInstanceId: string }
  | { type: 'PLAY_RESHUFFLE'; cardInstanceId: string; discardInstanceIds: string[] }

export type ReduceResult =
  | { ok: true; state: GameSession }
  | { ok: false }
