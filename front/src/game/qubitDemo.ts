import { randomBoardRow, randomDiceRow } from '../lib/dice'
import type { DiceState } from '../types/dice'
import type { GateId, QubitDemoSession } from '../types/qubitDemo'
import { createBoardSlot, type BoardOwner, type PlayTarget } from './types'
import { applyHadamard, applyPauli, applyPhase } from './transforms'

function applyGateToState(state: DiceState, gate: GateId): DiceState {
  switch (gate) {
    case 'X':
      return applyPauli(state, 'X')
    case 'Y':
      return applyPauli(state, 'Y')
    case 'Z':
      return applyPauli(state, 'Z')
    case 'H':
      return applyHadamard(state)
    case 'P+':
      return applyPhase(state, true)
    case 'P-':
      return applyPhase(state, false)
    case 'SWAP':
      return state
  }
}

export function isTargetReached(session: QubitDemoSession): boolean {
  return session.mySlots.every((slot, index) => slot.dice === session.targetSlots[index])
}

export function createQubitDemoSession(qubitCount: number): QubitDemoSession {
  let session: QubitDemoSession = {
    qubitCount,
    myNickname: 'Алексей',
    opponentNickname: 'NeoQubit',
    targetSlots: randomDiceRow(qubitCount),
    mySlots: randomBoardRow(qubitCount),
    opponentSlots: randomBoardRow(qubitCount),
  }

  for (let i = 0; i < 20 && isTargetReached(session); i++) {
    session = { ...session, mySlots: randomBoardRow(qubitCount) }
  }

  return session
}

export function applyGateToQubit(
  session: QubitDemoSession,
  gate: GateId,
  owner: BoardOwner,
  index: number,
): QubitDemoSession {
  if (gate === 'SWAP') {
    return session
  }

  const key = owner === 'my' ? 'mySlots' : 'opponentSlots'
  const slots = [...session[key]]
  const slot = slots[index]

  if (!slot || slot.frozen) {
    return session
  }

  slots[index] = createBoardSlot(applyGateToState(slot.dice, gate))

  return { ...session, [key]: slots }
}

export function applySwapQubits(
  session: QubitDemoSession,
  first: PlayTarget,
  second: PlayTarget,
): QubitDemoSession {
  if (first.owner === second.owner && first.index === second.index) {
    return session
  }

  const mySlots = [...session.mySlots]
  const opponentSlots = [...session.opponentSlots]
  const rowA = first.owner === 'my' ? mySlots : opponentSlots
  const rowB = second.owner === 'my' ? mySlots : opponentSlots
  const slotA = rowA[first.index]
  const slotB = rowB[second.index]

  if (!slotA || !slotB || slotA.frozen || slotB.frozen) {
    return session
  }

  rowA[first.index] = { ...slotA, dice: slotB.dice }
  rowB[second.index] = { ...slotB, dice: slotA.dice }

  return { ...session, mySlots, opponentSlots }
}
