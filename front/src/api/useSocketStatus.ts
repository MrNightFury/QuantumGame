import { useContext } from 'react'
import { SocketStatusContext } from './socketStatusContext'
import type { SocketStatus } from './socket'

export function useSocketStatus(): SocketStatus {
  return useContext(SocketStatusContext)
}
