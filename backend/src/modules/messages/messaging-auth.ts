import type { User as AuthUser } from '@supabase/supabase-js'
import type { RequestHandler } from 'express'
import { prisma } from '@/config/prisma.js'

export async function findAuthenticatedMessagingUser(authUser: Pick<AuthUser, 'id'>) {
  // Resolve only the verified Auth UUID, never a display name, email, or client-provided numeric ID.
  return prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, name: true, role: true },
  })
}

// Use after requireAuth. No messaging route may trust a caller's numeric currentUserId.
export const requireMessagingAccount: RequestHandler = async (request, response, next) => {
  try {
    const user = await findAuthenticatedMessagingUser(request.user)
    if (!user) {
      response.status(403).json({ message: 'No messaging account matches the authenticated user.' })
      return
    }
    response.locals.messagingUserId = user.id
    next()
  } catch (error) {
    next(error)
  }
}
