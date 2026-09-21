import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { isAllowedClientOrigin } from '@/config/env.js'
import { prisma } from '@/config/prisma.js'

type JoinConversationAcknowledgement = (response: { ok: boolean; message?: string }) => void

export function userRoom(userId: bigint) {
  return `user:${userId}`
}

export function conversationRoom(conversationId: bigint) {
  return `conversation:${conversationId}`
}

function toDatabaseId(value: unknown) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  return BigInt(value)
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)),
      methods: ['GET', 'POST'],
    },
  })

  io.use(async (socket, next) => {
    const userId = toDatabaseId(socket.handshake.auth.userId)
    if (!userId) return next(new Error('A valid user ID is required.'))

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) return next(new Error('User was not found.'))

    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as bigint
    socket.join(userRoom(userId))

    socket.on('join_conversation', async (conversationIdValue: unknown, acknowledge: JoinConversationAcknowledgement) => {
      try {
        const conversationId = toDatabaseId(conversationIdValue)
        if (!conversationId) {
          acknowledge({ ok: false, message: 'A valid conversation ID is required.' })
          return
        }

        const membership = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
          select: { conversationId: true },
        })

        if (!membership) {
          acknowledge({ ok: false, message: 'User is not a conversation member.' })
          return
        }

        socket.join(conversationRoom(conversationId))
        acknowledge({ ok: true })
      } catch {
        acknowledge({ ok: false, message: 'Unable to join the conversation room.' })
      }
    })
  })

  return io
}
