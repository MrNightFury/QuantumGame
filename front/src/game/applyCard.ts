import type { CardId } from '../types/card'
import type { HandCard } from '../types/card'
import type { DiceState } from '../types/dice'
import type { GameAction, GameSession, ReduceResult } from '../types/game'
import { CARD_META } from './cards'
import { SLOTS_PER_ROW } from './constants'
import { drawFromDeck, nextInstanceId } from './deck'
import { afterMove, endTurn, isMyTurn } from './turn'
import { applyAutoCardEffect, applyRotate } from './transforms'
import type { BoardSlotState, PlayTarget } from './types'
import { slotKey } from './types'

export function canPlayFieldCard(session: GameSession, cardId: CardId, target: PlayTarget): boolean {
  const meta = CARD_META[cardId]

  if (meta.placement === 'discard') return false
  if (session.activeRow && target.owner !== session.activeRow) return false
  if (meta.needsCenterSlot && (target.index === 0 || target.index === SLOTS_PER_ROW - 1)) {
    return false
  }

  return true
}

function canAct(session: GameSession): boolean {
  return isMyTurn(session) && session.remainingMoves > 0
}

function patchSlot(
  slot: BoardSlotState,
  cardId: CardId,
  isTarget: boolean,
  rotateTarget?: DiceState,
): BoardSlotState {
  if (slot.frozen && cardId !== 'measurement') return slot

  if (cardId === 'measurement') {
    return isTarget ? { ...slot, frozen: true } : slot
  }

  if (rotateTarget && (cardId === 'rotate_x' || cardId === 'rotate_y' || cardId === 'rotate_z')) {
    return { ...slot, dice: applyRotate(slot.dice, cardId, rotateTarget) }
  }

  return { ...slot, dice: applyAutoCardEffect(slot.dice, cardId) }
}

function applyFieldCard(
  session: GameSession,
  cardId: CardId,
  target: PlayTarget,
  rotateTarget?: DiceState,
): ReduceResult & { needsRotate?: boolean } {
  if (!canPlayFieldCard(session, cardId, target)) {
    return { ok: false }
  }

  if ((cardId === 'rotate_x' || cardId === 'rotate_y' || cardId === 'rotate_z') && !rotateTarget) {
    return { ok: true, state: session, needsRotate: true }
  }

  const meta = CARD_META[cardId]
  const indexes = meta.radius === 3
    ? [target.index - 1, target.index, target.index + 1].filter((i) => i >= 0 && i < SLOTS_PER_ROW)
    : [target.index]

  const rowKey = target.owner === 'my' ? 'mySlots' : 'opponentSlots'
  const row = session[rowKey] as BoardSlotState[]

  const nextRow = row.map((slot, index) => {
    if (!indexes.includes(index)) return slot
    const isTarget = index === target.index
    return meta.radius === 3
      ? patchSlot(slot, cardId, false, rotateTarget)
      : patchSlot(slot, cardId, isTarget, rotateTarget)
  })

  return {
    ok: true,
    state: { ...session, [rowKey]: nextRow },
  }
}

function applySwap(session: GameSession, first: PlayTarget, second: PlayTarget): ReduceResult {
  if (first.owner === second.owner && first.index === second.index) {
    return { ok: false }
  }

  const mySlots = [...session.mySlots]
  const opponentSlots = [...session.opponentSlots]

  const rowA = first.owner === 'my' ? mySlots : opponentSlots
  const rowB = second.owner === 'my' ? mySlots : opponentSlots

  const diceA = rowA[first.index].dice
  const diceB = rowB[second.index].dice

  rowA[first.index] = { ...rowA[first.index], dice: diceB }
  rowB[second.index] = { ...rowB[second.index], dice: diceA }

  return {
    ok: true,
    state: { ...session, mySlots, opponentSlots },
  }
}

function applyReshuffle(session: GameSession, discardIds: string[]): ReduceResult {
  if (discardIds.length < 1 || discardIds.length > 4) {
    return { ok: false }
  }

  const discard = new Set(discardIds)
  const kept = session.myHand.filter((c) => !discard.has(c.instanceId))
  const { deck, drawn } = drawFromDeck(session.deck, discardIds.length)

  const newCards: HandCard[] = drawn.map((cardId) => ({
    instanceId: nextInstanceId(),
    cardId,
  }))

  return {
    ok: true,
    state: {
      ...session,
      deck,
      myHand: [...kept, ...newCards],
    },
  }
}

function removeFromHand(session: GameSession, instanceId: string): GameSession {
  return {
    ...session,
    myHand: session.myHand.filter((c) => c.instanceId !== instanceId),
  }
}

function putCardOnField(session: GameSession, card: HandCard, targetKey: string): GameSession {
  const fieldCards = { ...session.fieldCards }

  for (const key of Object.keys(fieldCards)) {
    if (fieldCards[key].instanceId === card.instanceId) {
      delete fieldCards[key]
    }
  }

  fieldCards[targetKey] = card
  return { ...session, fieldCards }
}

export function applyGameAction(session: GameSession, action: GameAction): ReduceResult {
  switch (action.type) {
    case 'PLAY_FIELD_CARD': {
      if (!canAct(session)) return { ok: false }

      const card = session.myHand.find((c) => c.instanceId === action.cardInstanceId)
      if (!card) return { ok: false }

      const targetKey = slotKey(action.target.owner, action.target.index)
      const onField = session.fieldCards[targetKey] ?? null
      const result = applyFieldCard(session, card.cardId, action.target, action.rotateTarget)

      if (!result.ok) return { ok: false }
      if (result.needsRotate) return { ok: false }

      let hand = result.state.myHand.filter((c) => c.instanceId !== card.instanceId)
      if (onField) hand = [...hand, onField]

      const placed = putCardOnField({ ...result.state, myHand: hand }, card, targetKey)
      const activeRow = placed.activeRow ?? action.target.owner

      return {
        ok: true,
        state: afterMove(placed, activeRow),
      }
    }

    case 'PLAY_SWAP': {
      if (!canAct(session)) return { ok: false }

      const card = session.myHand.find((c) => c.instanceId === action.cardInstanceId)
      if (!card || card.cardId !== 'swap') return { ok: false }

      const swapped = applySwap(session, action.first, action.second)
      if (!swapped.ok) return { ok: false }

      const withoutCard = removeFromHand(swapped.state, card.instanceId)
      return { ok: true, state: afterMove(withoutCard) }
    }

    case 'PLAY_IDENTITY': {
      if (!canAct(session)) return { ok: false }
      if (session.cardsPlayedThisTurn === 0) return { ok: false }

      const card = session.myHand.find((c) => c.instanceId === action.cardInstanceId)
      if (!card || card.cardId !== 'identity') return { ok: false }

      const withoutCard = removeFromHand(session, card.instanceId)
      return {
        ok: true,
        state: endTurn({
          ...withoutCard,
          cardsPlayedThisTurn: withoutCard.cardsPlayedThisTurn + 1,
          remainingMoves: 0,
        }),
      }
    }

    case 'PLAY_KRONECKER': {
      if (!canAct(session)) return { ok: false }

      const card = session.myHand.find((c) => c.instanceId === action.cardInstanceId)
      if (!card || card.cardId !== 'kronecker_multiplication') return { ok: false }

      const withoutCard = removeFromHand(session, card.instanceId)
      const boosted = {
        ...withoutCard,
        remainingMoves: withoutCard.remainingMoves + 2,
      }

      return { ok: true, state: afterMove(boosted) }
    }

    case 'PLAY_RESHUFFLE': {
      if (!canAct(session)) return { ok: false }

      const card = session.myHand.find((c) => c.instanceId === action.cardInstanceId)
      if (!card || card.cardId !== 'reshuffle') return { ok: false }

      const without = removeFromHand(session, card.instanceId)
      const reshuffled = applyReshuffle(without, action.discardInstanceIds)
      if (!reshuffled.ok) return { ok: false }

      return { ok: true, state: afterMove(reshuffled.state) }
    }

    default:
      return { ok: false }
  }
}
