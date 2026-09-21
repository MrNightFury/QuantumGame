import type { GameSession } from '../types/game'
import { createShuffledDeck, drawFromDeck, nextInstanceId } from './deck'
import { randomBoardRow, randomDiceRow } from '../lib/dice'
import { HAND_SIZE } from './constants'
import type { HandCard } from '../types/card'

function toHandCards(cardIds: HandCard['cardId'][]): HandCard[] {
  return cardIds.map((cardId) => ({
    instanceId: nextInstanceId(),
    cardId,
  }))
}

export function createDemoSession(): GameSession {
  let deck = createShuffledDeck()
  const myHandDraw = drawFromDeck(deck, HAND_SIZE)
  deck = myHandDraw.deck

  const myPlayerId = 'player-1'

  return {
    sessionId: `demo-${Date.now()}`,
    myPlayerId,
    opponentPlayerId: 'player-2',
    myNickname: 'Алексей',
    opponentNickname: 'NeoQubit',
    currentPlayerId: myPlayerId,
    remainingMoves: 1,
    cardsPlayedThisTurn: 0,
    activeRow: null,
    targetSlots: randomDiceRow(),
    mySlots: randomBoardRow(),
    opponentSlots: randomBoardRow(),
    myHand: toHandCards(myHandDraw.drawn),
    deck,
    fieldCards: {},
  }
}
