import { prisma } from '@/config/prisma.js'
import { hasBlockBetween, lockMessagingPair } from '@/modules/messages/blocking.service.js'

export type StoredMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
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
  | { status: 'updated'; update: MessageReactionUpdate }

type EditMessageResult =
  | { status: 'empty_content' }
  | { status: 'message_not_found' }
  | { status: 'not_sender' }
  | { status: 'updated'; update: MessageUpdate }

type DeleteMessageResult =
  | { status: 'message_not_found' }
  | { status: 'not_sender' }
  | { status: 'deleted'; deletion: MessageDeletion }

function toStoredMessage(message: {
  id: bigint
  conversationId: bigint
  senderId: bigint
  content: string
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
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
    reactions: [...reactionsByEmoji.values()],
  }
}

export async function createMessage(
  conversationId: bigint,
  senderId: bigint,
  content: string,
): Promise<CreateMessageResult> {
  // The UI keeps Send enabled, but the server remains the final guard against blank messages.
  const normalizedContent = content.trim()
  if (!normalizedContent) return { status: 'empty_content' }

  return prisma.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, members: { select: { userId: true } } },
    })
    if (!conversation) return { status: 'conversation_not_found' }

    // A sender may write only to a conversation they belong to.
    if (!conversation.members.some((member) => member.userId === senderId)) return { status: 'not_a_member' }

    const otherMembers = conversation.members
      .filter((member) => member.userId !== senderId)
      .sort((a, b) => a.userId < b.userId ? -1 : 1)
    for (const member of otherMembers) {
      await lockMessagingPair(transaction, senderId, member.userId)
      if (await hasBlockBetween(senderId, member.userId, transaction)) return { status: 'blocked' }
    }

    // Store normalized content so persisted messages never contain whitespace-only values.
    const message = await transaction.message.create({
      data: {
        conversationId,
        senderId,
        content: normalizedContent,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
      },
    })

    return {
      status: 'created',
      message: toStoredMessage(message),
    }
  })
}

export async function editMessage(
  messageId: bigint,
  senderId: bigint,
  content: string,
): Promise<EditMessageResult> {
  // Keep validation on the server because socket payloads can bypass the UI.
  const normalizedContent = content.trim()
  if (!normalizedContent) return { status: 'empty_content' }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true, senderId: true, deletedAt: true },
  })

  if (!message || message.deletedAt) return { status: 'message_not_found' }
  if (message.senderId !== senderId) return { status: 'not_sender' }

  const updatedMessage = await prisma.message.update({
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
}

export async function deleteMessage(
  messageId: bigint,
  senderId: bigint,
): Promise<DeleteMessageResult> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true, senderId: true },
  })

  if (!message) return { status: 'message_not_found' }
  if (message.senderId !== senderId) return { status: 'not_sender' }

  // The MessageReactions foreign key cascades, so deleting the message also removes its reactions.
  await prisma.message.delete({ where: { id: messageId } })

  return {
    status: 'deleted',
    deletion: {
      id: message.id.toString(),
      conversationId: message.conversationId.toString(),
    },
  }
}

export async function getConversationMessages(
  conversationId: bigint,
  currentUserId: bigint,
): Promise<ConversationMessagesResult> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })
  if (!conversation) return { status: 'not_found', messages: [] }

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
      createdAt: true,
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

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true, deletedAt: true },
  })
  if (!message || message.deletedAt) return { status: 'message_not_found' }

  // Reactions follow the same access rule as messages: only conversation members may change them.
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId } },
    select: { conversationId: true, user: { select: { name: true } } },
  })
  if (!membership) return { status: 'not_a_member' }

  const existingReaction = await prisma.messageReaction.findFirst({
    where: { messageId, userId },
    select: { emoji: true },
  })

  if (existingReaction?.emoji === emoji) {
    await prisma.messageReaction.delete({
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
    await prisma.messageReaction.update({
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

  await prisma.messageReaction.create({ data: { messageId, userId, emoji } })

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
}
