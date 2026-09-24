import { onSocketStatus, sendSocketMessage } from './socket'
import { onServerEvent } from './serverEvents'
import type { OnlineUser } from './events'

export interface ConnectionState {
  /** id текущего пользователя (приходит в setId). null — пока неизвестен. */
  userId: number | null
  /** Онлайн-пользователи. Пуст до setOnlineUsers или при обрыве соединения. */
  onlineUsers: OnlineUser[]
}

const INITIAL_STATE: ConnectionState = {
  userId: null,
  onlineUsers: [],
}

let state: ConnectionState = INITIAL_STATE

const listeners = new Set<() => void>()

function setState(next: ConnectionState): void {
  state = next
  listeners.forEach((listener) => listener())
}

onServerEvent((event) => {
  switch (event.event) {
    case 'setId':
      if (state.userId !== event.data) {
        setState({ ...state, userId: event.data })
      }
      break

    case 'setOnlineUsers':
      setState({ ...state, onlineUsers: event.data })
      break

    case 'addOnlineUser': {
      if (state.onlineUsers.some((user) => user.id === event.data.id)) return
      setState({ ...state, onlineUsers: [...state.onlineUsers, event.data] })
      break
    }

    case 'removeOnlineUser': {
      const onlineUsers = state.onlineUsers.filter((user) => user.id !== event.data)
      if (onlineUsers.length === state.onlineUsers.length) return
      setState({ ...state, onlineUsers })
      break
    }
  }
})

// При обрыве соединения список неактуален — сервер пришлёт свежие setId и
// setOnlineUsers после переподключения.
onSocketStatus((status) => {
  if (status === 'open') {
    // Сразу применяем сохранённое имя, чтобы не оставаться player<id>.
    const savedName = getSavedPlayerName()
    if (savedName !== null) {
      sendSocketMessage({ event: 'setPlayerName', data: savedName })
    }
    return
  }
  if (status === 'closed') {
    setState(INITIAL_STATE)
  }
})

export function getConnectionState(): ConnectionState {
  return state
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const PLAYER_NAME_STORAGE_KEY = 'playerName'

/** Сохранённое игроком имя или null, если его ещё не задавали. */
function getSavedPlayerName(): string | null {
  const saved = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)
  return saved !== null && saved.trim() !== '' ? saved.trim() : null
}

/**
 * Отправить setPlayerName — смену отображаемого имени (см. EVENTS.md:
 * пустая строка игнорируется, имя обрезается до 32 символов, занятое другим
 * игроком получает числовой суффикс). Итоговое имя клиент узнаёт из
 * последующего addOnlineUser (перед ним придёт removeOnlineUser с нашим id).
 * Отправленное имя запоминается в localStorage и применяется автоматически
 * при каждом новом подключении.
 */
export function setPlayerName(name: string): boolean {
  const sent = sendSocketMessage({ event: 'setPlayerName', data: name })
  // Запоминаем только реально ушедшее серверу имя (при неудачной отправке
  // имя не считается установленным).
  if (sent) {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name)
  }
  return sent
}
