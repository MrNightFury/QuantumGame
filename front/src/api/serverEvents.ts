import { onSocketMessage } from './socket'
import { parseServerEvent, type ServerEvent } from './events'

type ServerEventListener = (event: ServerEvent) => void

const listeners = new Set<ServerEventListener>()

onSocketMessage((raw) => {
  const event = parseServerEvent(raw)
  if (event === null) return
  listeners.forEach((listener) => listener(event))
})

/** Подписка на типизированные события сервера. Возвращает отписку. */
export function onServerEvent(listener: ServerEventListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
