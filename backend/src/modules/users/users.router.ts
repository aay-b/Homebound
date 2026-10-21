import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/modules/auth/auth.middleware.js'
import { searchPeople } from '@/modules/users/users.service.js'
import { getMessagingAvatarUrls } from '@/modules/users/user-avatars.service.js'
import { findAuthenticatedMessagingUser } from '@/modules/messages/messaging-auth.js'

const searchPeopleQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  // This will be read from the authenticated session when authentication is available.
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

export const usersRouter = Router()

usersRouter.post('/avatars', requireAuth, async (request, response, next) => {
  try {
    const parsed = z.object({
      userIds: z.array(z.string().regex(/^[1-9]\d{0,18}$/).transform((id) => BigInt(id)).refine((id) => id <= 9223372036854775807n)).min(1).max(100),
    }).safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: 'Valid user IDs are required.' })
      return
    }
    response.setHeader('Cache-Control', 'no-store')
    response.json({ avatars: await getMessagingAvatarUrls(parsed.data.userIds) })
  } catch (error) {
    next(error)
  }
})

usersRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await findAuthenticatedMessagingUser(request.user)

    if (!user) {
      response.status(404).json({ message: 'No messaging account matches the authenticated user.' })
      return
    }

    response.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.get('/search', async (request, response, next) => {
  try {
    const parsedQuery = searchPeopleQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      response.status(400).json({ message: 'A keyword and valid currentUserId are required.' })
      return
    }

    const result = await searchPeople(parsedQuery.data.q, parsedQuery.data.currentUserId)

    if (result.status === 'not_found') {
      response.status(404).json({ message: 'Current user was not found.' })
      return
    }

    if (result.status === 'not_allowed') {
      response.status(403).json({ message: 'This role cannot search for messaging recipients.' })
      return
    }

    response.json({ people: result.people })
  } catch (error) {
    next(error)
  }
})
