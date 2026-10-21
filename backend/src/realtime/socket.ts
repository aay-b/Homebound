import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { isAllowedClientOrigin } from '@/config/env.js'
import { prisma } from '@/config/prisma.js'
import { supabase } from '@/config/supabase.js'
import { findAuthenticatedMessagingUser } from '@/modules/messages/messaging-auth.js'
import { blockedMessagingError, blockUser, getBlockedUsers, unblockUser, type BlockedUser, type UserBlockEvent, type UserUnblockEvent } from '@/modules/messages/blocking.service.js'
import { deleteConversation, type ConversationDeletion } from '@/modules/messages/conversations.service.js'
import type { MessageRequestParticipant } from '@/modules/messages/message-requests.service.js'
import { createMessage, deleteMessage, editMessage, toggleMessageReaction, type MessageDeletion, type MessageReactionUpdate, type MessageUpdate, type StoredMessage } from '@/modules/messages/messages.service.js'

type JoinConversationAcknowledgement = (response: { ok: boolean; message?: string }) => void
type SendMessageAcknowledgement = (response: { ok: boolean; error?: string; message?: StoredMessage }) => void
type ToggleReactionAcknowledgement = (response: { ok: boolean; error?: string; update?: MessageReactionUpdate }) => void
type EditMessageAcknowledgement = (response: { ok: boolean; error?: string; update?: MessageUpdate }) => void
type DeleteMessageAcknowledgement = (response: { ok: boolean; error?: string; deletion?: MessageDeletion }) => void
type DeleteConversationAcknowledgement = (response: { ok: boolean; error?: string; deletion?: ConversationDeletion }) => void
type BlockUserAcknowledgement = (response: { ok: boolean; error?: string; block?: UserBlockEvent }) => void
type BlockedUsersAcknowledgement = (response: { ok: boolean; error?: string; users?: BlockedUser[] }) => void
type UnblockUserAcknowledgement = (response: { ok: boolean; error?: string; block?: UserUnblockEvent }) => void

type SendMessagePayload = {
  conversationId: unknown
  content: unknown
  imagePath?: unknown
}

type ToggleReactionPayload = {
  messageId: unknown
  emoji: unknown
}

type EditMessagePayload = {
  messageId: unknown
  content: unknown
}

type DeleteMessagePayload = {
  messageId: unknown
}

type DeleteConversationPayload = {
  conversationId: unknown
}

type MessageRequestCreatedEvent = {
  id: string
  sender: MessageRequestParticipant
}

type MessageRequestResolvedEvent = {
  requestId: string
  status: 'accepted' | 'declined'
  recipientId: string
  conversation?: {
    id: string
    participants: MessageRequestParticipant[]
  }
}

let messagingSocketServer: Server | null = null

export function userRoom(userId: bigint) {
  // A personal room is reserved for user-specific events such as incoming requests.
  return `user:${userId}`
}

export function conversationRoom(conversationId: bigint) {
  // Conversation events are broadcast only to members who joined this room.
  return `conversation:${conversationId}`
}

export function emitMessageRequestCreated(recipientId: bigint, request: MessageRequestCreatedEvent) {
  messagingSocketServer?.to(userRoom(recipientId)).emit('message_request_created', request)
}

export function emitMessageRequestResolved(
  participantIds: bigint[],
  resolution: MessageRequestResolvedEvent,
) {
  participantIds.forEach((participantId) => {
    messagingSocketServer?.to(userRoom(participantId)).emit('message_request_resolved', resolution)
  })
}

export function emitMessageRequestCancelled(recipientId: bigint, requestId: string) {
  // Only the recipient needs this event because the sender already removed it locally after the REST call.
  messagingSocketServer?.to(userRoom(recipientId)).emit('message_request_cancelled', { requestId })
}

function toDatabaseId(value: unknown) {
  // Socket payloads are untrusted strings, so reject values that cannot be safe database IDs.
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) return null
  const id = BigInt(value)
  return id <= 9223372036854775807n ? id : null
}

function parseSendMessagePayload(value: unknown): { conversationId: bigint; content: string; imagePath?: string } | null {
  // Validate the event payload before it reaches the persistence layer.
  if (!value || typeof value !== 'object') return null

  const payload = value as SendMessagePayload
  const conversationId = toDatabaseId(payload.conversationId)
  const content = payload.content === undefined ? '' : payload.content
  const imagePath = payload.imagePath == null ? undefined : payload.imagePath
  if (!conversationId || typeof content !== 'string') return null
  if (imagePath !== undefined && typeof imagePath !== 'string') return null
  if (payload.content === undefined && imagePath === undefined) return null

  return { conversationId, content, imagePath }
}

function parseToggleReactionPayload(value: unknown): { messageId: bigint; emoji: string } | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as ToggleReactionPayload
  const messageId = toDatabaseId(payload.messageId)
  if (!messageId || typeof payload.emoji !== 'string') return null

  return { messageId, emoji: payload.emoji }
}

function parseEditMessagePayload(value: unknown): { messageId: bigint; content: string } | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as EditMessagePayload
  const messageId = toDatabaseId(payload.messageId)
  if (!messageId || typeof payload.content !== 'string') return null

  return { messageId, content: payload.content }
}

function parseDeleteMessagePayload(value: unknown): { messageId: bigint } | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as DeleteMessagePayload
  const messageId = toDatabaseId(payload.messageId)
  if (!messageId) return null

  return { messageId }
}

function parseDeleteConversationPayload(value: unknown): { conversationId: bigint } | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as DeleteConversationPayload
  const conversationId = toDatabaseId(payload.conversationId)
  if (!conversationId) return null

  return { conversationId }
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)),
      methods: ['GET', 'POST'],
    },
  })

  messagingSocketServer = io

  io.use(async (socket, next) => {
    try {
      const userId = toDatabaseId(socket.handshake.auth.userId)
      if (!userId) return next(new Error('A valid user ID is required.'))
      const accessToken = socket.handshake.auth.accessToken
      if (typeof accessToken !== 'string') return next(new Error('Authentication required.'))
      const { data, error } = await supabase.auth.getUser(accessToken)
      if (error || !data.user) return next(new Error('Invalid or expired session.'))
      // Match /users/me: the numeric messaging identity must belong to the authenticated account.
      const user = await findAuthenticatedMessagingUser(data.user)
      if (!user || user.id !== userId) return next(new Error('Messaging account does not match the authenticated user.'))

      socket.data.userId = userId
      next()
    } catch {
      next(new Error('Unable to authenticate the messaging account.'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as bigint
    socket.join(userRoom(userId))

    socket.on('get_blocked_users', async (_payload: unknown, acknowledge?: BlockedUsersAcknowledgement) => {
      try {
        acknowledge?.({ ok: true, users: await getBlockedUsers(userId) })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to load your blocked users. Please try again.' })
      }
    })

    socket.on('unblock_user', async (payload: unknown, acknowledge?: UnblockUserAcknowledgement) => {
      try {
        const participantId = payload && typeof payload === 'object' && 'participantId' in payload
          ? toDatabaseId(payload.participantId) : null
        if (!participantId || participantId === userId) {
          acknowledge?.({ ok: false, error: 'A valid participant ID is required.' })
          return
        }
        const block = await unblockUser(userId, participantId)
        io.to([userRoom(userId), userRoom(participantId)]).emit('user_unblocked', block)
        acknowledge?.({ ok: true, block })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to unblock this user. Please try again.' })
      }
    })

    socket.on('block_user', async (payload: unknown, acknowledge?: BlockUserAcknowledgement) => {
      try {
        const participantId = payload && typeof payload === 'object' && 'participantId' in payload
          ? toDatabaseId(payload.participantId) : null
        if (!participantId) {
          acknowledge?.({ ok: false, error: 'A valid participant ID is required.' })
          return
        }
        const result = await blockUser(userId, participantId)
        if (result.status === 'self_block') {
          acknowledge?.({ ok: false, error: 'You cannot block yourself.' })
          return
        }
        if (result.status === 'not_found') {
          acknowledge?.({ ok: false, error: 'User was not found.' })
          return
        }
        io.to([userRoom(userId), userRoom(participantId)]).emit('user_blocked', result.block)
        acknowledge?.({ ok: true, block: result.block })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to block this user. Please try again.' })
      }
    })

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
          acknowledge?.({ ok: false, error: 'A valid conversation ID and message text or image are required.' })
          return
        }

        const result = await createMessage(payload.conversationId, userId, payload.content, payload.imagePath)

        if (result.status === 'empty_content') {
          acknowledge?.({ ok: false, error: 'A message must contain text or an image.' })
          return
        }

        if (result.status === 'mixed_content') {
          acknowledge?.({ ok: false, error: 'Send images and text as separate messages.' })
          return
        }

        if (result.status === 'invalid_image') {
          acknowledge?.({ ok: false, error: 'The image upload is missing or invalid. Please upload it again.' })
          return
        }

        if (result.status === 'image_already_used') {
          acknowledge?.({ ok: false, error: 'This image has already been sent. Please upload it again to send another message.' })
          return
        }

        if (result.status === 'storage_unavailable') {
          acknowledge?.({ ok: false, error: 'Unable to verify the image upload. Please try again.' })
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

        if (result.status === 'blocked') {
          acknowledge?.({ ok: false, error: blockedMessagingError })
          return
        }

        // Persist first, then publish the same stored message only to this conversation's room.
        io.to(conversationRoom(payload.conversationId)).emit('message_created', result.message)
        acknowledge?.({ ok: true, message: result.message })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to send the message.' })
      }
    })

    socket.on('edit_message', async (payloadValue: unknown, acknowledge?: EditMessageAcknowledgement) => {
      try {
        const payload = parseEditMessagePayload(payloadValue)
        if (!payload) {
          acknowledge?.({ ok: false, error: 'A valid message ID and message content are required.' })
          return
        }

        const result = await editMessage(payload.messageId, userId, payload.content)

        if (result.status === 'empty_content') {
          acknowledge?.({ ok: false, error: 'Message content cannot be empty.' })
          return
        }

        if (result.status === 'image_not_editable') {
          acknowledge?.({ ok: false, error: 'Image messages cannot be edited.' })
          return
        }

        if (result.status === 'message_not_found') {
          acknowledge?.({ ok: false, error: 'Message was not found.' })
          return
        }

        if (result.status === 'not_sender') {
          acknowledge?.({ ok: false, error: 'Only the sender can edit this message.' })
          return
        }

        if (result.status === 'blocked') {
          acknowledge?.({ ok: false, error: 'You cannot edit messages in this conversation.' })
          return
        }

        // Broadcast the persisted update so both open participants see the same edited content.
        const room = conversationRoom(BigInt(result.update.conversationId))
        socket.join(room)
        io.to(room).emit('message_updated', result.update)
        acknowledge?.({ ok: true, update: result.update })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to edit the message.' })
      }
    })

    socket.on('delete_message', async (payloadValue: unknown, acknowledge?: DeleteMessageAcknowledgement) => {
      try {
        const payload = parseDeleteMessagePayload(payloadValue)
        if (!payload) {
          acknowledge?.({ ok: false, error: 'A valid message ID is required.' })
          return
        }

        const result = await deleteMessage(payload.messageId, userId)

        if (result.status === 'message_not_found') {
          acknowledge?.({ ok: false, error: 'Message was not found.' })
          return
        }

        if (result.status === 'not_sender') {
          acknowledge?.({ ok: false, error: 'Only the sender can delete this message.' })
          return
        }

        if (result.status === 'blocked') {
          acknowledge?.({ ok: false, error: 'You cannot delete messages in this conversation.' })
          return
        }

        if (result.status === 'storage_unavailable') {
          acknowledge?.({ ok: false, error: 'Unable to finish deleting the image. Please try again.' })
          return
        }

        // The deletion is final and cascades to reactions before viewers receive this event.
        const room = conversationRoom(BigInt(result.deletion.conversationId))
        socket.join(room)
        io.to(room).emit('message_deleted', result.deletion)
        acknowledge?.({ ok: true, deletion: result.deletion })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to delete the message.' })
      }
    })

    socket.on('delete_conversation', async (payloadValue: unknown, acknowledge?: DeleteConversationAcknowledgement) => {
      try {
        const payload = parseDeleteConversationPayload(payloadValue)
        if (!payload) {
          acknowledge?.({ ok: false, error: 'A valid conversation ID is required.' })
          return
        }

        const result = await deleteConversation(payload.conversationId, userId)

        if (result.status === 'not_found') {
          acknowledge?.({ ok: false, error: 'Conversation was not found.' })
          return
        }

        if (result.status === 'not_a_member') {
          acknowledge?.({ ok: false, error: 'User is not a conversation member.' })
          return
        }

        if (result.status === 'storage_unavailable') {
          acknowledge?.({ ok: false, error: 'Unable to remove the conversation images. Please try again.' })
          return
        }

        // Personal rooms notify every open dashboard for both participants, even outside this thread.
        result.deletion.participantIds.forEach((participantId) => {
          io.to(userRoom(BigInt(participantId))).emit('conversation_deleted', result.deletion)
        })
        acknowledge?.({ ok: true, deletion: result.deletion })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to delete the conversation.' })
      }
    })

    socket.on('toggle_reaction', async (payloadValue: unknown, acknowledge?: ToggleReactionAcknowledgement) => {
      try {
        const payload = parseToggleReactionPayload(payloadValue)
        if (!payload) {
          acknowledge?.({ ok: false, error: 'A valid message ID and emoji are required.' })
          return
        }

        const result = await toggleMessageReaction(payload.messageId, userId, payload.emoji)

        if (result.status === 'invalid_emoji') {
          acknowledge?.({ ok: false, error: 'This reaction is not supported.' })
          return
        }

        if (result.status === 'message_not_found') {
          acknowledge?.({ ok: false, error: 'Message was not found.' })
          return
        }

        if (result.status === 'not_a_member') {
          acknowledge?.({ ok: false, error: 'User is not a conversation member.' })
          return
        }

        if (result.status === 'blocked') {
          acknowledge?.({ ok: false, error: 'You cannot react to messages in this conversation.' })
          return
        }

        // Join as a fallback, then deliver one identical update to every viewer of this conversation.
        const room = conversationRoom(BigInt(result.update.conversationId))
        socket.join(room)
        io.to(room).emit('message_reaction_updated', result.update)
        acknowledge?.({ ok: true, update: result.update })
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to update the reaction.' })
      }
    })
  })

  return io
}
