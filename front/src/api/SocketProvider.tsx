import { useEffect, useState, type ReactNode } from 'react'
import { connectSocket, disconnectSocket, getSocketStatus, onSocketStatus } from './socket'
import { SocketStatusContext } from './socketStatusContext'

/**
 * Держит WebSocket-соединение с сервером всё время,
 * пока игрок находится на сайте.
 */
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState(getSocketStatus)

  useEffect(() => {
    const unsubscribe = onSocketStatus(setStatus)
    connectSocket()

    return () => {
      unsubscribe()
      disconnectSocket()
    }
  }, [])

  return <SocketStatusContext.Provider value={status}>{children}</SocketStatusContext.Provider>
}
