import { io, type Socket } from 'socket.io-client'
import { supabase } from '@/config/supabase'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const socketServerUrl = new URL(apiBaseUrl).origin

export function connectMessagingSocket(currentUserId: string): Socket {
  return io(socketServerUrl, {
    auth: async (callback) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        callback({ userId: currentUserId, accessToken: session?.access_token })
      } catch {
        callback({ userId: currentUserId })
      }
    },
    transports: ['websocket'],
  })
}
