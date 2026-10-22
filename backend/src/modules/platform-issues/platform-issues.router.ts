import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client.js'
import { requireAuth } from '@/modules/auth/auth.middleware.js'
import { findAuthenticatedMessagingUser } from '@/modules/messages/messaging-auth.js'
import { createPlatformIssueReport } from '@/modules/platform-issues/platform-issues.service.js'
import { platformIssueReportSchema } from '@/modules/platform-issues/platform-issues.validation.js'

export const platformIssuesRouter = Router()

platformIssuesRouter.post('/', requireAuth, async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')

  const parsed = platformIssueReportSchema.safeParse(request.body ?? {})
  if (!parsed.success) {
    response.status(400).json({
      message: 'Please check the report information.',
      errors: z.flattenError(parsed.error).fieldErrors,
    })
    return
  }

  try {
    // Reuse the verified Auth-email lookup for public.Users; never trust a reporter ID from the form.
    const reporter = await findAuthenticatedMessagingUser(request.user)
    if (!reporter) {
      response.status(403).json({ message: 'Unable to find your account. Please sign in again.' })
      return
    }

    const report = await createPlatformIssueReport(reporter.id, parsed.data)
    response.status(201).json({
      message: 'Your report has been submitted successfully.',
      report,
    })
  } catch (error) {
    // The account may have been removed after the lookup, before the report was saved.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      response.status(403).json({ message: 'Unable to find your account. Please sign in again.' })
      return
    }

    // Do not log report contents, session tokens, or connection details.
    console.error('Platform issue submission failed.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    })
    response.status(500).json({ message: 'Unable to submit your report. Please try again.' })
  }
})
