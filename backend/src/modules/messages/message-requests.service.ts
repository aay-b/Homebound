import { prisma } from '@/config/prisma.js'

type CreateMessageRequestResult =
  | { status: 'not_found' }
  | { status: 'not_allowed' }
  | { status: 'already_pending' }
  | { status: 'created'; requestId: string }

type IncomingMessageRequestsResult =
  | { status: 'not_found'; requests: [] }
  | {
      status: 'success'
      requests: Array<{
        id: string
        sender: { id: string; name: string; role: 'user' | 'shelter_staff' }
      }>
    }

type OutgoingMessageRequestsResult =
  | { status: 'not_found'; requests: [] }
  | {
      status: 'success'
      requests: Array<{
        id: string
        recipient: { id: string; name: string; role: 'user' | 'shelter_staff' }
      }>
    }

type CancelMessageRequestResult =
  | { status: 'not_found' }
  | { status: 'cancelled' }

type RespondToMessageRequestResult =
  | { status: 'not_found' }
  | { status: 'declined' }
  | {
      status: 'accepted'
      conversation: {
        id: string
        participant: { id: string; name: string; role: 'user' | 'shelter_staff' }
      }
    }

export async function createMessageRequest(senderId: bigint, recipientId: bigint): Promise<CreateMessageRequestResult> {
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } }),
  ])

  if (!sender || !recipient) return { status: 'not_found' }

  // Only users and shelter staff with opposite roles can start a request.
  const canSendRequest = (sender.role === 'user' && recipient.role === 'shelter_staff')
    || (sender.role === 'shelter_staff' && recipient.role === 'user')

  if (!canSendRequest) return { status: 'not_allowed' }

  const existingRequest = await prisma.messageRequest.findFirst({
    where: { senderId, recipientId, status: 'pending' },
    select: { id: true },
  })

  if (existingRequest) return { status: 'already_pending' }

  const request = await prisma.messageRequest.create({
    data: { senderId, recipientId },
    select: { id: true },
  })

  return { status: 'created', requestId: request.id.toString() }
}

export async function getIncomingMessageRequests(recipientId: bigint): Promise<IncomingMessageRequestsResult> {
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } })
  if (!recipient) return { status: 'not_found', requests: [] }

  const requests = await prisma.messageRequest.findMany({
    where: { recipientId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sender: { select: { id: true, name: true, role: true } },
    },
  })

  return {
    status: 'success',
    requests: requests.map((request) => ({
      id: request.id.toString(),
      sender: {
        id: request.sender.id.toString(),
        name: request.sender.name,
        role: request.sender.role as 'user' | 'shelter_staff',
      },
    })),
  }
}

export async function getOutgoingMessageRequests(senderId: bigint): Promise<OutgoingMessageRequestsResult> {
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { id: true } })
  if (!sender) return { status: 'not_found', requests: [] }

  const requests = await prisma.messageRequest.findMany({
    where: { senderId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      recipient: { select: { id: true, name: true, role: true } },
    },
  })

  return {
    status: 'success',
    requests: requests.map((request) => ({
      id: request.id.toString(),
      recipient: {
        id: request.recipient.id.toString(),
        name: request.recipient.name,
        role: request.recipient.role as 'user' | 'shelter_staff',
      },
    })),
  }
}

export async function cancelMessageRequest(requestId: bigint, senderId: bigint): Promise<CancelMessageRequestResult> {
  const request = await prisma.messageRequest.findFirst({
    where: { id: requestId, senderId, status: 'pending' },
    select: { id: true },
  })

  if (!request) return { status: 'not_found' }

  await prisma.messageRequest.delete({
    where: { id: request.id },
  })

  return { status: 'cancelled' }
}

export async function respondToMessageRequest(
  requestId: bigint,
  recipientId: bigint,
  action: 'accept' | 'decline',
): Promise<RespondToMessageRequestResult> {
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.messageRequest.findFirst({
      where: { id: requestId, recipientId, status: 'pending' },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        sender: { select: { id: true, name: true, role: true } },
      },
    })

    if (!request) return { status: 'not_found' }

    if (action === 'decline') {
      await transaction.messageRequest.update({
        where: { id: request.id },
        data: { status: 'declined', respondedAt: new Date() },
      })
      return { status: 'declined' }
    }

    // Creating the conversation and accepting the request succeed or fail together.
    const conversation = await transaction.conversation.create({
      data: {
        members: {
          create: [
            { userId: request.senderId },
            { userId: request.recipientId },
          ],
        },
      },
      select: { id: true },
    })

    await transaction.messageRequest.update({
      where: { id: request.id },
      data: { status: 'accepted', respondedAt: new Date() },
    })

    return {
      status: 'accepted',
      conversation: {
        id: conversation.id.toString(),
        participant: {
          id: request.sender.id.toString(),
          name: request.sender.name,
          role: request.sender.role as 'user' | 'shelter_staff',
        },
      },
    }
  })
}
