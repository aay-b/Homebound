import { prisma } from '@/config/prisma.js'

export type StoredMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
}

type CreateMessageResult =
  | { status: 'empty_content' }
  | { status: 'conversation_not_found' }
  | { status: 'not_a_member' }
  | { status: 'created'; message: StoredMessage }

export async function createMessage(
  conversationId: bigint,
  senderId: bigint,
  content: string,
): Promise<CreateMessageResult> {
  // The UI keeps Send enabled, but the server remains the final guard against blank messages.
  const normalizedContent = content.trim()
  if (!normalizedContent) return { status: 'empty_content' }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })
  if (!conversation) return { status: 'conversation_not_found' }

  // A sender may write only to a conversation they belong to.
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
    select: { conversationId: true },
  })
  if (!membership) return { status: 'not_a_member' }

  // Store normalized content so persisted messages never contain whitespace-only values.
  const message = await prisma.message.create({
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
    },
  })

  return {
    status: 'created',
    message: {
      id: message.id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  }
}
