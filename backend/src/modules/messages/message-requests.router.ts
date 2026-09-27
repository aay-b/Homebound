import { Router } from 'express'
import { z } from 'zod'
import { cancelMessageRequest, createMessageRequest, getIncomingMessageRequests, getOutgoingMessageRequests, respondToMessageRequest } from '@/modules/messages/message-requests.service.js'
import { emitMessageRequestCreated, emitMessageRequestResolved } from '@/realtime/socket.js'

const createMessageRequestBodySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
  recipientId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

const currentUserQuerySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

const respondToMessageRequestParamsSchema = z.object({
  requestId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

const respondToMessageRequestBodySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
  action: z.enum(['accept', 'decline']),
})

export const messageRequestsRouter = Router()

messageRequestsRouter.get('/', async (request, response, next) => {
  try {
    const parsedQuery = currentUserQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      response.status(400).json({ message: 'A valid currentUserId is required.' })
      return
    }

    const result = await getIncomingMessageRequests(parsedQuery.data.currentUserId)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Current user was not found.' })
      return
    }

    response.json({ requests: result.requests })
  } catch (error) {
    next(error)
  }
})

messageRequestsRouter.get('/outgoing', async (request, response, next) => {
  try {
    const parsedQuery = currentUserQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      response.status(400).json({ message: 'A valid currentUserId is required.' })
      return
    }

    const result = await getOutgoingMessageRequests(parsedQuery.data.currentUserId)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Current user was not found.' })
      return
    }

    response.json({ requests: result.requests })
  } catch (error) {
    next(error)
  }
})

messageRequestsRouter.post('/', async (request, response, next) => {
  try {
    const parsedBody = createMessageRequestBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      response.status(400).json({ message: 'Valid currentUserId and recipientId are required.' })
      return
    }

    const result = await createMessageRequest(parsedBody.data.currentUserId, parsedBody.data.recipientId)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Sender or recipient was not found.' })
      return
    }

    if (result.status === 'not_allowed') {
      response.status(403).json({ message: 'Message requests can only be sent to a different role.' })
      return
    }

    if (result.status === 'already_pending') {
      response.status(409).json({ message: 'A pending request already exists for this person.' })
      return
    }

    emitMessageRequestCreated(parsedBody.data.recipientId, {
      id: result.request.id,
      sender: result.request.sender,
    })

    response.status(201).json({ requestId: result.requestId })
  } catch (error) {
    next(error)
  }
})

messageRequestsRouter.post('/:requestId/respond', async (request, response, next) => {
  try {
    const parsedParams = respondToMessageRequestParamsSchema.safeParse(request.params)
    const parsedBody = respondToMessageRequestBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      response.status(400).json({ message: 'A valid request ID, currentUserId, and action are required.' })
      return
    }

    const result = await respondToMessageRequest(
      parsedParams.data.requestId,
      parsedBody.data.currentUserId,
      parsedBody.data.action,
    )

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Pending message request was not found.' })
      return
    }

    if (result.status === 'declined') {
      emitMessageRequestResolved(
        [BigInt(result.senderId), BigInt(result.recipientId)],
        { requestId: result.requestId, status: 'declined', recipientId: result.recipientId },
      )
      response.json({ status: 'declined' })
      return
    }

    emitMessageRequestResolved(
      [BigInt(result.senderId), BigInt(result.recipientId)],
      {
        requestId: result.requestId,
        status: 'accepted',
        recipientId: result.recipientId,
        conversation: {
          id: result.conversation.id,
          participants: result.conversation.participants,
        },
      },
    )
    response.json({ status: 'accepted', conversation: result.conversation })
  } catch (error) {
    next(error)
  }
})

messageRequestsRouter.post('/:requestId/cancel', async (request, response, next) => {
  try {
    const parsedParams = respondToMessageRequestParamsSchema.safeParse(request.params)
    const parsedBody = currentUserQuerySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      response.status(400).json({ message: 'A valid request ID and currentUserId are required.' })
      return
    }

    const result = await cancelMessageRequest(parsedParams.data.requestId, parsedBody.data.currentUserId)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Pending outgoing message request was not found.' })
      return
    }

    response.json({ status: 'cancelled' })
  } catch (error) {
    next(error)
  }
})
