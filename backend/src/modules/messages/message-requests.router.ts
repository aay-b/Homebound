import { Router } from 'express'
import { z } from 'zod'
import { createMessageRequest } from '@/modules/messages/message-requests.service.js'

const createMessageRequestBodySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
  recipientId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

export const messageRequestsRouter = Router()

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

    response.status(201).json({ requestId: result.requestId })
  } catch (error) {
    next(error)
  }
})
