import { prisma } from '@/config/prisma.js'

type CreateMessageRequestResult =
  | { status: 'not_found' }
  | { status: 'not_allowed' }
  | { status: 'already_pending' }
  | { status: 'created'; requestId: string }

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
