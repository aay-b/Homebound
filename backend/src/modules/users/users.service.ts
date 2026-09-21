import { prisma } from '@/config/prisma.js'

type SearchPeopleResult =
  | { status: 'not_found'; people: [] }
  | { status: 'not_allowed'; people: [] }
  | {
      status: 'success'
      people: Array<{
        id: string
        name: string
        role: 'user' | 'shelter_staff'
        hasPendingRequest: boolean
      }>
    }

export async function searchPeople(keyword: string, currentUserId: bigint): Promise<SearchPeopleResult> {
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { role: true },
  })

  if (!currentUser) return { status: 'not_found', people: [] }

  // Messaging recipients must have the opposite supported role.
  const targetRole = currentUser.role === 'user'
    ? 'shelter_staff'
    : currentUser.role === 'shelter_staff'
      ? 'user'
      : null

  if (!targetRole) return { status: 'not_allowed', people: [] }

  const people = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      role: targetRole,
      name: { contains: keyword, mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: 'asc' },
    take: 10,
  })

  const pendingRequests = await prisma.messageRequest.findMany({
    where: {
      status: 'pending',
      OR: [
        { senderId: currentUserId, recipientId: { in: people.map((person) => person.id) } },
        { senderId: { in: people.map((person) => person.id) }, recipientId: currentUserId },
      ],
    },
    select: { senderId: true, recipientId: true },
  })
  const pendingRecipientIds = new Set(
    pendingRequests
      .filter((request) => request.senderId === currentUserId)
      .map((request) => request.recipientId.toString()),
  )
  // Hide people who already sent the current user a pending request.
  const incomingSenderIds = new Set(
    pendingRequests
      .filter((request) => request.recipientId === currentUserId)
      .map((request) => request.senderId.toString()),
  )

  return {
    status: 'success',
    people: people.filter((person) => !incomingSenderIds.has(person.id.toString())).map((person) => ({
      id: person.id.toString(),
      name: person.name,
      role: person.role as 'user' | 'shelter_staff',
      hasPendingRequest: pendingRecipientIds.has(person.id.toString()),
    })),
  }
}
