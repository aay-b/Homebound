import { supabase } from '@/config/supabase'

export type PlatformIssueReportInput = {
  title: string
  category: string
  description: string
}

export type PlatformIssueFieldErrors = Partial<Record<keyof PlatformIssueReportInput, string>>

type SubmissionResponse = {
  message?: string
  errors?: Partial<Record<keyof PlatformIssueReportInput, string[]>>
  report?: { id: string; createdAt: string }
}

export class PlatformIssueSubmissionError extends Error {
  readonly fieldErrors: PlatformIssueFieldErrors

  constructor(message: string, fieldErrors: PlatformIssueFieldErrors = {}) {
    super(message)
    this.name = 'PlatformIssueSubmissionError'
    this.fieldErrors = fieldErrors
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '')

export async function submitPlatformIssueReport(
  input: PlatformIssueReportInput,
  expectedAuthUserId: string,
  signal?: AbortSignal,
) {
  const { data: { session }, error } = await supabase.auth.getSession()
  signal?.throwIfAborted()
  if (error || !session) {
    throw new PlatformIssueSubmissionError('Please log in before submitting a report.')
  }
  if (session.user.id !== expectedAuthUserId) {
    throw new PlatformIssueSubmissionError('Your session has changed. Please reload this page and try again.')
  }

  const response = await fetch(`${apiBaseUrl}/platform-issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title: input.title, category: input.category, description: input.description }),
    signal,
  })
  const payload = await response.json().catch(() => null) as SubmissionResponse | null
  signal?.throwIfAborted()

  if (!response.ok) {
    const fieldErrors: PlatformIssueFieldErrors = {}
    for (const field of ['title', 'category', 'description'] as const) {
      const errors = payload?.errors?.[field]
      if (Array.isArray(errors) && typeof errors[0] === 'string') fieldErrors[field] = errors[0]
    }
    throw new PlatformIssueSubmissionError(
      typeof payload?.message === 'string' ? payload.message : 'Unable to submit your report. Please try again.',
      fieldErrors,
    )
  }

  // Only leave the form after the API confirms a saved report, not merely a successful HTTP response.
  if (response.status !== 201 || typeof payload?.report?.id !== 'string' || !payload.report.id) {
    throw new PlatformIssueSubmissionError('Unable to confirm your report submission. Please try again.')
  }

  return {
    report: payload.report,
    message: typeof payload.message === 'string' ? payload.message : 'Your report has been submitted successfully.',
  }
}
