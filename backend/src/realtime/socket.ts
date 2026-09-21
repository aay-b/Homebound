import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { isAllowedClientOrigin } from '@/config/env.js'
import { prisma } from '@/config/prisma.js'
import { createMessage, type StoredMessage } from '@/modules/messages/messages.service.js'

type JoinConversationAcknowledgement = (response: { ok: boolean; message?: string }) => void
type SendMessageAcknowledgement = (response: { ok: boolean; error?: string; message?: StoredMessage }) => void

type SendMessagePayload = {
  conversationId: unknown
  content: unknown
}

export function userRoom(userId: bigint) {
  // A personal room is reserved for user-specific events such as incoming requests.
  return `user:${userId}`
}

export function conversationRoom(conversationId: bigint) {
  // Conversation events are broadcast only to members who joined this room.
  return `conversation:${conversationId}`
}

function toDatabaseId(value: unknown) {
  // Socket payloads are untrusted strings, so reject values that cannot be safe database IDs.
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  return BigInt(value)
}

function parseSendMessagePayload(value: unknown): { conversationId: bigint; content: string } | null {
  // Validate the event payload before it reaches the persistence layer.
  if (!value || typeof value !== 'object') return null

  const payload = value as SendMessagePayload
  const conversationId = toDatabaseId(payload.conversationId)
  if (!conversationId || typeof payload.content !== 'string') return null

  return { conversationId, content: payload.content }
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)),
      methods: ['GET', 'POST'],
    },
  })

  io.use(async (socket, next) => {
    // Authentication is temporary: the URL-selected demo user is passed during the handshake.
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

        // Never trust the client to choose a room; verify membership before joining it.
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

    socket.on('send_message', async (payloadValue: unknown, acknowledge?: SendMessageAcknowledgement) => {
      try {
        const payload = parseSendMessagePayload(payloadValue)
        if (!payload) {
          acknowledge?.({ ok: false, error: 'A valid conversation ID and message content are required.' })
          return
        }

        const result = await createMessage(payload.conversationId, userId, payload.content)

        if (result.status === 'empty_content') {
          acknowledge?.({ ok: false, error: 'Message content cannot be empty.' })
          return
        }

        if (result.status === 'conversation_not_found') {
          acknowledge?.({ ok: false, error: 'Conversation was not found.' })
          return
        }

        if (result.status === 'not_a_member') {
          acknowledge?.({ ok: false, error: 'User is not a conversation member.' })
          return
        }

        // Persist first, then publish the same stored message only to this conversation's room.
        io.to(conversationRoom(payload.conversationId)).emit('message_created', result.message)
        acknowledge?.({ ok: true, message: result.message })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to send the message.' })
      }
    })
  })

  return io
}
