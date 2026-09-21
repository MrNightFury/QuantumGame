import { onSocketStatus } from './socket'
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
