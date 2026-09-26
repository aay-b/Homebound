import { prisma } from '@/config/prisma.js'

type ConversationsResult =
  | { status: 'not_found'; conversations: [] }
  | {
      status: 'success'
      conversations: Array<{
        id: string
        participant: { id: string; name: string; role: 'user' | 'shelter_staff' }
      }>
    }

export type ConversationDeletion = {
  id: string
  participantIds: string[]
}

type DeleteConversationResult =
  | { status: 'not_found' }
  | { status: 'not_a_member' }
  | { status: 'deleted'; deletion: ConversationDeletion }

export async function getConversations(currentUserId: bigint): Promise<ConversationsResult> {
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { id: true } })
  if (!currentUser) return { status: 'not_found', conversations: [] }

  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId: currentUserId } } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      members: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, role: true } },
        },
      },
    },
  })

  return {
    status: 'success',
    conversations: conversations.flatMap((conversation) => {
      // Conversations are currently private two-person threads, so the other member is the preview participant.
      const participant = conversation.members.find((member) => member.userId !== currentUserId)?.user
      if (!participant) return []

      return [{
        id: conversation.id.toString(),
        participant: {
          id: participant.id.toString(),
          name: participant.name,
          role: participant.role as 'user' | 'shelter_staff',
        },
      }]
    }),
  }
}

export async function deleteConversation(
  conversationId: bigint,
  currentUserId: bigint,
): Promise<DeleteConversationResult> {
  return prisma.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, members: { select: { userId: true } } },
    })

    if (!conversation) return { status: 'not_found' }
    if (!conversation.members.some((member) => member.userId === currentUserId)) return { status: 'not_a_member' }

    const participantIds = conversation.members.map((member) => member.userId)

    // Remove every request between these participants so a new request can start a new thread later.
    await transaction.messageRequest.deleteMany({
      where: {
        senderId: { in: participantIds },
        recipientId: { in: participantIds },
      },
    })

    // Database foreign keys cascade from the conversation to members, messages, and message reactions.
    await transaction.conversation.delete({ where: { id: conversationId } })

    return {
      status: 'deleted',
      deletion: {
        id: conversation.id.toString(),
        participantIds: participantIds.map((participantId) => participantId.toString()),
      },
    }
  })
}
