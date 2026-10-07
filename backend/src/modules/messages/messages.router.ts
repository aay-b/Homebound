import { Router } from 'express'
import { z } from 'zod'
import { getConversationMessages } from '@/modules/messages/messages.service.js'

const conversationParamsSchema = z.object({
  conversationId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

const currentUserQuerySchema = z.object({
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

export const messagesRouter = Router()

messagesRouter.get('/:conversationId/messages', async (request, response, next) => {
  try {
    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedQuery = currentUserQuerySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      response.status(400).json({ message: 'A valid conversation ID and currentUserId are required.' })
      return
    }

    const result = await getConversationMessages(
      parsedParams.data.conversationId,
      parsedQuery.data.currentUserId,
    )

    // Do not expose whether a conversation exists to a user who is not a member.
    if (result.status === 'not_found' || result.status === 'not_a_member') {
      response.status(404).json({ message: 'Conversation was not found.' })
      return
    }

    response.json({ messages: result.messages })
  } catch (error) {
    next(error)
  }
})
