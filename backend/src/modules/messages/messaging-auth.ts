import type { User as AuthUser } from '@supabase/supabase-js'
import type { RequestHandler } from 'express'
import { prisma } from '@/config/prisma.js'

export async function findAuthenticatedMessagingUser(authUser: Pick<AuthUser, 'email'>) {
  // Auth supplies the verified account identity. Display names and client-provided IDs are not credentials.
  const email = authUser.email?.trim()
  if (!email) return null

  const users = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, name: true, role: true },
    take: 2,
  })
  // Fail closed if legacy rows differ only in email casing.
  return users.length === 1 ? users[0] : null
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
