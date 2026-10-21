import { prisma } from '@/config/prisma.js'
import { Prisma } from '@/generated/prisma/client.js'
import { lockAndCheckParticipantBlocks } from '@/modules/messages/blocking.service.js'
import { removeMessageImages, validateMessageImage } from '@/modules/messages/message-images.service.js'

export type StoredMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  imagePath: string | null
  createdAt: string
  editedAt: string | null
  reactions: StoredReaction[]
}

export type MessageUpdate = {
  id: string
  conversationId: string
  content: string
  editedAt: string
}

export type MessageDeletion = {
  id: string
  conversationId: string
}

export type StoredReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
  reactors: StoredReactor[]
}

export type StoredReactor = {
  id: string
  name: string
}

export type MessageReactionUpdate = {
  messageId: string
  conversationId: string
  userId: string
  userName: string
  emoji: string
  action: 'added' | 'removed' | 'replaced'
  previousEmoji?: string
}

const allowedReactionEmojis = new Set(['👍', '❤️', '😂', '😮', '😢', '😡'])

type CreateMessageResult =
  | { status: 'empty_content' }
  | { status: 'mixed_content' }
  | { status: 'invalid_image' }
  | { status: 'image_already_used' }
  | { status: 'storage_unavailable' }
  | { status: 'conversation_not_found' }
  | { status: 'not_a_member' }
  | { status: 'blocked' }
  | { status: 'created'; message: StoredMessage }

type ConversationMessagesResult =
  | { status: 'not_found'; messages: [] }
  | { status: 'not_a_member'; messages: [] }
  | { status: 'success'; messages: StoredMessage[] }

type ToggleMessageReactionResult =
  | { status: 'invalid_emoji' }
  | { status: 'message_not_found' }
  | { status: 'not_a_member' }
  | { status: 'blocked' }
  | { status: 'updated'; update: MessageReactionUpdate }

type EditMessageResult =
  | { status: 'empty_content' }
  | { status: 'image_not_editable' }
  | { status: 'message_not_found' }
  | { status: 'not_sender' }
  | { status: 'blocked' }
  | { status: 'updated'; update: MessageUpdate }

type DeleteMessageResult =
  | { status: 'message_not_found' }
  | { status: 'not_sender' }
  | { status: 'blocked' }
  | { status: 'deleted'; deletion: MessageDeletion }

function toStoredMessage(message: {
  id: bigint
  conversationId: bigint
  senderId: bigint
  content: string
  imagePath: string | null
  createdAt: Date
  editedAt?: Date | null
  reactions?: Array<{ emoji: string; userId: bigint; user: { name: string } }>
}, currentUserId?: bigint): StoredMessage {
  const reactionsByEmoji = new Map<string, StoredReaction>()

  message.reactions?.forEach((reaction) => {
    const existingReaction = reactionsByEmoji.get(reaction.emoji)
    reactionsByEmoji.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: (existingReaction?.count ?? 0) + 1,
      reactedByCurrentUser: (existingReaction?.reactedByCurrentUser ?? false) || reaction.userId === currentUserId,
      reactors: [
        ...(existingReaction?.reactors ?? []),
        { id: reaction.userId.toString(), name: reaction.user.name },
      ],
    })
  })

  return {
    id: message.id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.senderId.toString(),
    content: message.content,
    imagePath: message.imagePath,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
    reactions: [...reactionsByEmoji.values()],
  }
}

export async function createMessage(
  conversationId: bigint,
  senderId: bigint,
  content: string,
  imagePath?: string,
): Promise<CreateMessageResult> {
  // Each message contains either text or one image, never an image with a caption.
  const normalizedContent = content.trim()
  if (!normalizedContent && !imagePath) return { status: 'empty_content' }
  if (normalizedContent && imagePath) return { status: 'mixed_content' }

  if (imagePath !== undefined) {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
      select: { conversationId: true },
    })
    if (!membership) return { status: 'not_a_member' }
    // Keep Storage network requests outside the transaction and its blocking locks.
    const imageStatus = await validateMessageImage(imagePath, conversationId, senderId)
    if (imageStatus !== 'valid') return { status: imageStatus }
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, members: { select: { userId: true } } },
      })
      if (!conversation) return { status: 'conversation_not_found' }

      // Recheck membership and blocks after upload; a block may have happened while the file uploaded.
      if (!conversation.members.some((member) => member.userId === senderId)) return { status: 'not_a_member' }
      if (await lockAndCheckParticipantBlocks(transaction, senderId, conversation.members.map((member) => member.userId))) {
        return { status: 'blocked' }
      }

      const message = await transaction.message.create({
        data: {
          conversationId,
          senderId,
          content: normalizedContent,
          imagePath: imagePath ?? null,
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          imagePath: true,
          createdAt: true,
          editedAt: true,
        },
      })

      return {
        status: 'created',
        message: toStoredMessage(message),
      }
    })
  } catch (error) {
    if (imagePath && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      && Array.isArray(error.meta?.target) && error.meta.target.includes('image_path')) {
      return { status: 'image_already_used' }
    }
    throw error
  }
}

export async function editMessage(
  messageId: bigint,
  senderId: bigint,
  content: string,
): Promise<EditMessageResult> {
  const normalizedContent = content.trim()

  return prisma.$transaction(async (transaction) => {
    const message = await transaction.message.findUnique({
      where: { id: messageId },
      select: {
        id: true, conversationId: true, senderId: true, deletedAt: true, imagePath: true,
        conversation: { select: { members: { select: { userId: true } } } },
      },
    })

    if (!message || message.deletedAt) return { status: 'message_not_found' }
    if (message.senderId !== senderId) return { status: 'not_sender' }
    if (await lockAndCheckParticipantBlocks(transaction, senderId, message.conversation.members.map((member) => member.userId))) return { status: 'blocked' }
    // Image messages stay image-only; editing cannot add a caption or replace the image with text.
    if (message.imagePath) return { status: 'image_not_editable' }
    if (!normalizedContent) return { status: 'empty_content' }

    const updatedMessage = await transaction.message.update({
      where: { id: messageId },
      data: { content: normalizedContent, editedAt: new Date() },
      select: { id: true, conversationId: true, content: true, editedAt: true },
    })

    return {
      status: 'updated',
      update: {
        id: updatedMessage.id.toString(),
        conversationId: updatedMessage.conversationId.toString(),
        content: updatedMessage.content,
        editedAt: updatedMessage.editedAt!.toISOString(),
      },
    }
  })
}

export async function deleteMessage(
  messageId: bigint,
  senderId: bigint,
): Promise<DeleteMessageResult> {
  let imagePath: string | null = null
  const result = await prisma.$transaction<DeleteMessageResult>(async (transaction) => {
    const message = await transaction.message.findUnique({
      where: { id: messageId },
      select: {
        id: true, conversationId: true, senderId: true, imagePath: true,
        conversation: { select: { members: { select: { userId: true } } } },
      },
    })

    if (!message) return { status: 'message_not_found' }
    if (message.senderId !== senderId) return { status: 'not_sender' }
    if (await lockAndCheckParticipantBlocks(transaction, senderId, message.conversation.members.map((member) => member.userId))) return { status: 'blocked' }

    // The MessageReactions foreign key cascades, so deleting the message also removes its reactions.
    await transaction.message.delete({ where: { id: messageId } })
    imagePath = message.imagePath

    return {
      status: 'deleted',
      deletion: {
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
      },
    }
  })
  if (result.status === 'deleted' && imagePath) await removeMessageImages([imagePath])
  return result
}

export async function getConversationMessages(
  conversationId: bigint,
  currentUserId: bigint,
): Promise<ConversationMessagesResult> {
  // This indexed membership lookup also establishes that the conversation exists.
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
    select: { conversationId: true },
  })
  if (!membership) return { status: 'not_a_member', messages: [] }

  const messages = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    // A secondary ID sort makes message order stable when timestamps are identical.
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      content: true,
      imagePath: true,
      createdAt: true,
      editedAt: true,
      reactions: { select: { emoji: true, userId: true, user: { select: { name: true } } } },
    },
  })

  return { status: 'success', messages: messages.map((message) => toStoredMessage(message, currentUserId)) }
}

export async function toggleMessageReaction(
  messageId: bigint,
  userId: bigint,
  emoji: string,
): Promise<ToggleMessageReactionResult> {
  if (!allowedReactionEmojis.has(emoji)) return { status: 'invalid_emoji' }

  return prisma.$transaction(async (transaction) => {
    const message = await transaction.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        deletedAt: true,
        conversation: { select: { members: { select: { userId: true } } } },
      },
    })
    if (!message || message.deletedAt) return { status: 'message_not_found' }

    // Reactions follow the same access rule as messages: only conversation members may change them.
    const membership = await transaction.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId } },
      select: { conversationId: true, user: { select: { name: true } } },
    })
    if (!membership) return { status: 'not_a_member' }

    // Serialize all reaction changes with blocking, including removal and replacement.
    if (await lockAndCheckParticipantBlocks(transaction, userId, message.conversation.members.map((member) => member.userId))) return { status: 'blocked' }

    const existingReaction = await transaction.messageReaction.findFirst({
      where: { messageId, userId },
      select: { emoji: true },
    })

    if (existingReaction?.emoji === emoji) {
      await transaction.messageReaction.delete({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
      })

      return {
        status: 'updated',
        update: {
          messageId: message.id.toString(),
          conversationId: message.conversationId.toString(),
          userId: userId.toString(),
          userName: membership.user.name,
          emoji,
          action: 'removed',
        },
      }
    }

    if (existingReaction) {
      // Choosing a different emoji replaces the member's previous reaction instead of adding a second one.
      await transaction.messageReaction.update({
        where: { messageId_userId_emoji: { messageId, userId, emoji: existingReaction.emoji } },
        data: { emoji },
      })

      return {
        status: 'updated',
        update: {
          messageId: message.id.toString(),
          conversationId: message.conversationId.toString(),
          userId: userId.toString(),
          userName: membership.user.name,
          emoji,
          action: 'replaced',
          previousEmoji: existingReaction.emoji,
        },
      }
    }

    await transaction.messageReaction.create({ data: { messageId, userId, emoji } })

    return {
      status: 'updated',
      update: {
        messageId: message.id.toString(),
        conversationId: message.conversationId.toString(),
        userId: userId.toString(),
        userName: membership.user.name,
        emoji,
        action: 'added',
      },
    }
  })
}
