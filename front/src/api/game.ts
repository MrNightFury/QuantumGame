import type { GameEndedData, GameStartedData, GameStateData } from './events'
import { onServerEvent } from './serverEvents'
import { onSocketStatus, sendSocketMessage } from './socket'

export interface GameData {
  /** Параметры активной игры (из gameStarted). null — игры нет. */
  started: GameStartedData | null
  /** Последнее состояние поля (из setGameState). null — ещё не пришло. */
  state: GameStateData | null
  /** Итог игры (из gameEnded). null — игра ещё не завершена. */
  ended: GameEndedData | null
}

const INITIAL_DATA: GameData = {
  started: null,
  state: null,
  ended: null,
}

let data: GameData = INITIAL_DATA

const listeners = new Set<() => void>()

function setData(next: GameData): void {
  data = next
  listeners.forEach((listener) => listener())
}

onServerEvent((event) => {
  switch (event.event) {
    case 'gameStarted':
      if (event.data !== data.started) {
        setData({ started: event.data, state: null, ended: null })
      }
      break

    case 'setGameState':
      setData({ ...data, state: event.data })
      break

    case 'gameEnded':
      setData({ ...data, ended: event.data })
      break
  }
})

// Игра живёт на сервере в рамках соединения: при обрыве считаем её
// завершённой, новое gameStarted придёт после нового startGame.
onSocketStatus((status) => {
  if (status === 'closed') {
    setData(INITIAL_DATA)
  }
})

/** Отправить startGame: players — id участников, cubitCount — кубитов в регистрах. */
export function startGame(players: number[], cubitCount: number): boolean {
  return sendSocketMessage({ event: 'startGame', data: { players, cubitCount } })
}

/** Отправить selectTarget: player — индекс в players, cubit — индекс кубита в регистре. */
export function selectTarget(player: number, cubit: number): boolean {
  return sendSocketMessage({ event: 'selectTarget', data: { player, cubit } })
}

/** Отправить giveUp — сдаться (data-часть контрактом не используется). */
export function giveUp(): boolean {
  return sendSocketMessage({ event: 'giveUp' })
}

/** Отправить writeCard: typeName — тип карты для записи; пустая строка отменяет ожидание. */
export function writeCard(typeName: string): boolean {
  return sendSocketMessage({ event: 'writeCard', data: typeName })
}

export function getGameData(): GameData {
  return data
}

export function subscribeGame(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
