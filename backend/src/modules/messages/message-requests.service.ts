import { prisma } from '@/config/prisma.js'

type CreateMessageRequestResult =
  | { status: 'not_found' }
  | { status: 'not_allowed' }
  | { status: 'already_pending' }
  | {
      status: 'created'
      requestId: string
      request: {
        id: string
        sender: MessageRequestParticipant
        recipient: MessageRequestParticipant
      }
    }

export type MessageRequestParticipant = {
  id: string
  name: string
  role: 'user' | 'shelter_staff'
}

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
  | { status: 'declined'; requestId: string; senderId: string; recipientId: string }
  | {
      status: 'accepted'
      requestId: string
      senderId: string
      recipientId: string
      conversation: {
        id: string
        participant: MessageRequestParticipant
        participants: MessageRequestParticipant[]
      }
    }

export async function createMessageRequest(senderId: bigint, recipientId: bigint): Promise<CreateMessageRequestResult> {
  // Verify both accounts before evaluating the role-based messaging rule.
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { id: true, name: true, role: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, name: true, role: true } }),
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

  // The database partial unique index also protects this rule during concurrent requests.
  const request = await prisma.messageRequest.create({
    data: { senderId, recipientId },
    select: { id: true },
  })

  return {
    status: 'created',
    requestId: request.id.toString(),
    request: {
      id: request.id.toString(),
      sender: { id: sender.id.toString(), name: sender.name, role: sender.role as 'user' | 'shelter_staff' },
      recipient: { id: recipient.id.toString(), name: recipient.name, role: recipient.role as 'user' | 'shelter_staff' },
    },
  }
}

export async function getIncomingMessageRequests(recipientId: bigint): Promise<IncomingMessageRequestsResult> {
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } })
  if (!recipient) return { status: 'not_found', requests: [] }

  const requests = await prisma.messageRequest.findMany({
    // Only unresolved requests are actionable in the recipient's inbox.
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
    // Sent requests remain visible only while the recipient can still respond.
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

  // Cancellation removes a pending request instead of retaining a cancelled status.
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
  // Read, respond, and create the conversation in one transaction to avoid partial acceptance.
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.messageRequest.findFirst({
      where: { id: requestId, recipientId, status: 'pending' },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    })

    if (!request) return { status: 'not_found' }

    if (action === 'decline') {
      await transaction.messageRequest.update({
        where: { id: request.id },
        data: { status: 'declined', respondedAt: new Date() },
      })
      return {
        status: 'declined',
        requestId: request.id.toString(),
        senderId: request.senderId.toString(),
        recipientId: request.recipientId.toString(),
      }
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
        participants: [
          {
            id: request.sender.id.toString(),
            name: request.sender.name,
            role: request.sender.role as 'user' | 'shelter_staff',
          },
          {
            id: request.recipient.id.toString(),
            name: request.recipient.name,
            role: request.recipient.role as 'user' | 'shelter_staff',
          },
        ],
      },
      requestId: request.id.toString(),
      senderId: request.senderId.toString(),
      recipientId: request.recipientId.toString(),
    }
  })
}
