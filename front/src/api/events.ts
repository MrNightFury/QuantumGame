/**
 * Контракт WebSocket-событий: ../controller/EVENTS.md.
 * Конверт: {"event": "<название>", "data": <структура>}.
 * Файл контракта меняется параллельно — держать в sync.
 */

export interface OnlineUser {
  id: number
  name: string
}

export interface GameStartedData {
  players: number[]
  cubitCount: number
}

export interface FieldCardData {
  /** Индекс игрока в списке players. */
  player: number
  /** Индекс кубита в ряду игрока. */
  cubit: number
  /** Имя типа карты (совпадает с CardId). */
  card: string
}

export interface GameStateData {
  players: number[]
  registers: string[][]
  targetRegister: string[]
  currentPlayer: number
  playedCards: number
  cardsOnField: FieldCardData[]
}

export interface CardPlayedTarget {
  register: number
  cubit: number
}

export interface CardPlayedData {
  target: CardPlayedTarget
  card: string
}

export interface GameEndedData {
  winnerId: number
  winnerName: string
}

export interface CardScannedData {
  registered: boolean
  /** Тип карты. Присутствует только если registered === true. */
  type?: string
}

export type ServerEvent =
  | { event: 'setId'; data: number }
  | { event: 'setOnlineUsers'; data: OnlineUser[] }
  | { event: 'addOnlineUser'; data: OnlineUser }
  | { event: 'removeOnlineUser'; data: number }
  | { event: 'gameStarted'; data: GameStartedData }
  | { event: 'setGameState'; data: GameStateData }
  | { event: 'cardPlayed'; data: CardPlayedData }
  | { event: 'gameEnded'; data: GameEndedData }
  | { event: 'cardScanned'; data: CardScannedData }
  | { event: 'cardWritten'; data: null }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

function isStringMatrix(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))
  )
}

function isOnlineUser(value: unknown): value is OnlineUser {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string'
}

function isOnlineUserList(value: unknown): value is OnlineUser[] {
  return Array.isArray(value) && value.every(isOnlineUser)
}

function isGameStartedData(value: unknown): value is GameStartedData {
  return (
    isRecord(value) &&
    isNumberArray(value.players) &&
    typeof value.cubitCount === 'number'
  )
}

function isFieldCardData(value: unknown): value is FieldCardData {
  return (
    isRecord(value) &&
    typeof value.player === 'number' &&
    typeof value.cubit === 'number' &&
    typeof value.card === 'string'
  )
}

function isFieldCardList(value: unknown): value is FieldCardData[] {
  return Array.isArray(value) && value.every(isFieldCardData)
}

function isGameStateData(value: unknown): value is GameStateData {
  return (
    isRecord(value) &&
    isNumberArray(value.players) &&
    isStringMatrix(value.registers) &&
    Array.isArray(value.targetRegister) &&
    value.targetRegister.every((cell) => typeof cell === 'string') &&
    typeof value.currentPlayer === 'number' &&
    typeof value.playedCards === 'number' &&
    isFieldCardList(value.cardsOnField)
  )
}

function isCardPlayedTarget(value: unknown): value is CardPlayedTarget {
  return isRecord(value) && typeof value.register === 'number' && typeof value.cubit === 'number'
}

function isCardPlayedData(value: unknown): value is CardPlayedData {
  return isRecord(value) && isCardPlayedTarget(value.target) && typeof value.card === 'string'
}

function isGameEndedData(value: unknown): value is GameEndedData {
  return isRecord(value) && typeof value.winnerId === 'number' && typeof value.winnerName === 'string'
}

function isCardScannedData(value: unknown): value is CardScannedData {
  return (
    isRecord(value) &&
    typeof value.registered === 'boolean' &&
    (value.type === undefined || typeof value.type === 'string')
  )
}

/**
 * Разбирает входящее сообщение сокета в типизированное событие.
 * null — если JSON не является конвертом или data не совпадает с контрактом.
 */
export function parseServerEvent(raw: unknown): ServerEvent | null {
  if (!isRecord(raw)) return null

  const { event, data } = raw
  if (typeof event !== 'string') return null

  switch (event) {
    case 'setId':
      return typeof data === 'number' ? { event, data } : null
    case 'setOnlineUsers':
      return isOnlineUserList(data) ? { event, data } : null
    case 'addOnlineUser':
      return isOnlineUser(data) ? { event, data } : null
    case 'removeOnlineUser':
      return typeof data === 'number' ? { event, data } : null
    case 'gameStarted':
      return isGameStartedData(data) ? { event, data } : null
    case 'setGameState':
      return isGameStateData(data) ? { event, data } : null
    case 'cardPlayed':
      return isCardPlayedData(data) ? { event, data } : null
    case 'gameEnded':
      return isGameEndedData(data) ? { event, data } : null
    case 'cardScanned':
      return isCardScannedData(data) ? { event, data } : null
    case 'cardWritten':
      // Контроллер шлёт data: null (пустой JsonDocument). Пустой объект
      // тоже принимаем и нормализуем в null.
      return data === null || (isRecord(data) && Object.keys(data).length === 0)
        ? { event, data: null }
        : null
    default:
      return null
  }
}
