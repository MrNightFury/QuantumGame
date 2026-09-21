import { createContext } from 'react'
import type { SocketStatus } from './socket'

export const SocketStatusContext = createContext<SocketStatus>('closed')
