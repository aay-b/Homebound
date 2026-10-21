import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/modules/auth/auth.middleware.js'
import { requireMessagingAccount } from '@/modules/messages/messaging-auth.js'
import { blockedMessagingError } from '@/modules/messages/blocking.service.js'
import { createMessageImageUpload, getMessageImageUrl, isImageContentType } from '@/modules/messages/message-images.service.js'
import { getConversationMessages } from '@/modules/messages/messages.service.js'

const databaseIdSchema = z.string().regex(/^[1-9]\d{0,18}$/).transform((id) => BigInt(id))
  .refine((id) => id <= 9223372036854775807n)

const conversationParamsSchema = z.object({
  conversationId: databaseIdSchema,
})

const imageUploadSchema = z.object({
  contentType: z.string().trim().toLowerCase().refine(isImageContentType),
})

const messageImageParamsSchema = conversationParamsSchema.extend({
  messageId: databaseIdSchema,
})

export const messagesRouter = Router()
messagesRouter.use(requireAuth, requireMessagingAccount)

messagesRouter.post('/:conversationId/images/upload-url', async (request, response, next) => {
  try {
    response.setHeader('Cache-Control', 'no-store')
    const params = conversationParamsSchema.safeParse(request.params)
    const body = imageUploadSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      response.status(400).json({ message: 'A valid conversation ID and image content type are required.' })
      return
    }
    const result = await createMessageImageUpload(params.data.conversationId, response.locals.messagingUserId, body.data.contentType)
    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Conversation was not found.' })
      return
    }
    if (result.status === 'blocked') {
      response.status(403).json({ message: blockedMessagingError })
      return
    }
    if (result.status === 'invalid_image') {
      response.status(400).json({ message: 'Please select an image.' })
      return
    }
    if (result.status === 'storage_unavailable') {
      response.status(503).json({ message: 'Unable to prepare the image upload. Please try again.' })
      return
    }
    response.status(201).json({ upload: result.upload })
  } catch (error) {
    next(error)
  }
})

messagesRouter.get('/:conversationId/messages/:messageId/image', async (request, response, next) => {
  try {
    response.setHeader('Cache-Control', 'no-store')
    const params = messageImageParamsSchema.safeParse(request.params)
    if (!params.success) {
      response.status(400).json({ message: 'A valid conversation ID and message ID are required.' })
      return
    }
    const result = await getMessageImageUrl(params.data.conversationId, params.data.messageId, response.locals.messagingUserId)
    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Message image was not found.' })
      return
    }
    if (result.status === 'storage_unavailable') {
      response.status(503).json({ message: 'Unable to load the image. Please try again.' })
      return
    }
    response.json({ image: result.image })
  } catch (error) {
    next(error)
  }
})

messagesRouter.get('/:conversationId/messages', async (request, response, next) => {
  try {
    response.setHeader('Cache-Control', 'no-store')
    const parsedParams = conversationParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      response.status(400).json({ message: 'A valid conversation ID is required.' })
      return
    }

    const result = await getConversationMessages(
      parsedParams.data.conversationId,
      response.locals.messagingUserId,
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
