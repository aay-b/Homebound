import { Router } from 'express'
import { z } from 'zod'
import { searchPeople } from '@/modules/users/users.service.js'

const searchPeopleQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  // This will be read from the authenticated session when authentication is available.
  currentUserId: z.string().regex(/^\d+$/).transform((id) => BigInt(id)),
})

export const usersRouter = Router()

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
