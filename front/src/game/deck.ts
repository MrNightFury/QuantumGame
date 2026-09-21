import type { CardId } from '../types/card'
import { ALL_CARD_IDS } from '../data/cards'

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function createShuffledDeck(): CardId[] {
  return shuffle([...ALL_CARD_IDS, ...ALL_CARD_IDS])
}

export function drawFromDeck(
  deck: CardId[],
  count: number,
): { deck: CardId[]; drawn: CardId[] } {
  const drawn = deck.slice(0, count)
  return { deck: deck.slice(count), drawn }
}

export function nextInstanceId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
