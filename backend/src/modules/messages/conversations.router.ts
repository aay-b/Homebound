import { Router } from 'express'
import { z } from 'zod'
import { getConversations } from '@/modules/messages/conversations.service.js'

const conversationsQuerySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
  q: z.string().trim().max(100).optional(),
})

export const conversationsRouter = Router()

conversationsRouter.get('/', async (request, response, next) => {
  try {
    const parsedQuery = conversationsQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      response.status(400).json({ message: 'A valid currentUserId and a search term of at most 100 characters are required.' })
      return
    }

    const result = await getConversations(parsedQuery.data.currentUserId, parsedQuery.data.q)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Current user was not found.' })
      return
    }

    response.json({ conversations: result.conversations })
  } catch (error) {
    next(error)
  }
})
