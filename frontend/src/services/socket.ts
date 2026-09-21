import { io, type Socket } from 'socket.io-client'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const socketServerUrl = new URL(apiBaseUrl).origin

export function connectMessagingSocket(currentUserId: string): Socket {
  return io(socketServerUrl, {
    auth: { userId: currentUserId },
    transports: ['websocket'],
  })
}
