import type { GameSession } from '../types/game'
import type { BoardOwner } from './types'

export function isMyTurn(session: GameSession): boolean {
  return session.currentPlayerId === session.myPlayerId
}

export function endTurn(session: GameSession): GameSession {
  const nextPlayer = session.currentPlayerId === session.myPlayerId
    ? session.opponentPlayerId
    : session.myPlayerId

  return {
    ...session,
    currentPlayerId: nextPlayer,
    remainingMoves: 1,
    cardsPlayedThisTurn: 0,
    activeRow: null,
  }
}

export function afterMove(session: GameSession, activeRow?: BoardOwner | null): GameSession {
  const remainingMoves = session.remainingMoves - 1
  const cardsPlayedThisTurn = session.cardsPlayedThisTurn + 1

  let next: GameSession = {
    ...session,
    remainingMoves,
    cardsPlayedThisTurn,
    activeRow: activeRow !== undefined ? activeRow : session.activeRow,
  }

  if (remainingMoves > 0) {
    return next
  }

  return endTurn(next)
}
