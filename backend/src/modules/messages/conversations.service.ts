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
