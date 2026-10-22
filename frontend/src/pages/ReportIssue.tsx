import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PetLayout from '@/components/PetLayout'
import { useAuth } from '@/contexts/AuthContext'
import { PlatformIssueSubmissionError, submitPlatformIssueReport } from '@/services/platformIssues'
import type { PlatformIssueFieldErrors, PlatformIssueReportInput } from '@/services/platformIssues'

const fields = ['title', 'category', 'description'] as const
const categories = [
  'Account',
  'Login and registration',
  'Profile',
  'Pet listings',
  'Search and filters',
  'Applications',
  'Messages',
  'Photos and uploads',
  'Notifications',
  'Privacy and security',
  'Performance',
  'Other',
]
const fieldClass = 'mt-2 w-full rounded-xl border bg-white px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-50'

function getReturnLocation(state: unknown): { path: string; state: unknown } {
  const fallback = { path: '/pets', state: null }
  if (!state || typeof state !== 'object') return fallback
  const { reportReturnTo, reportReturnState } = state as { reportReturnTo?: unknown; reportReturnState?: unknown }
  if (typeof reportReturnTo !== 'string' || !reportReturnTo.startsWith('/') || reportReturnTo.startsWith('//')) return fallback

  try {
    const url = new URL(reportReturnTo, window.location.origin)
    const pathname = url.pathname.replace(/\/+$/, '').toLowerCase()
    if (url.origin !== window.location.origin || ['/report-issue', '/login', '/register'].includes(pathname)) return fallback
    return { path: `${url.pathname}${url.search}${url.hash}`, state: reportReturnState ?? null }
  } catch {
    return fallback
  }
}

function validate(input: PlatformIssueReportInput): PlatformIssueFieldErrors {
  const errors: PlatformIssueFieldErrors = {}
  if (!input.title) errors.title = 'Please enter a title.'
  else if (input.title.length > 150) errors.title = 'The title must be 150 characters or fewer.'
  if (!input.category) errors.category = 'Please select a category.'
  else if (input.category.length > 50) errors.category = 'The category must be 50 characters or fewer.'
  if (!input.description) errors.description = 'Please describe the issue.'
  else if (input.description.length > 5000) errors.description = 'The description must be 5,000 characters or fewer.'
  return errors
}

export default function ReportIssue() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const returnLocation = useMemo(() => getReturnLocation(location.state), [location.state])
  const [form, setForm] = useState<PlatformIssueReportInput>({ title: '', category: '', description: '' })
  const [fieldErrors, setFieldErrors] = useState<PlatformIssueFieldErrors>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const successRef = useRef<HTMLDialogElement>(null)
  const pendingFocusRef = useRef<keyof PlatformIssueReportInput | null>(null)

  const goBack = useCallback(() => {
    navigate(returnLocation.path, { replace: true, state: returnLocation.state })
  }, [navigate, returnLocation])

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (submitting || !pendingFocusRef.current) return
    formRef.current?.querySelector<HTMLElement>(`[name="${pendingFocusRef.current}"]`)?.focus()
    pendingFocusRef.current = null
  }, [fieldErrors, submitting])

  useEffect(() => {
    const dialog = successRef.current
    if (success && dialog && !dialog.open) dialog.showModal()
  }, [success])

  function change(field: keyof PlatformIssueReportInput, value: string) {
    setForm(current => ({ ...current, [field]: value }))
    setFieldErrors(current => ({ ...current, [field]: undefined }))
    setError('')
  }

  function showFieldErrors(errors: PlatformIssueFieldErrors) {
    // Wait until the fields are enabled and their error descriptions have rendered before focusing.
    pendingFocusRef.current = fields.find(field => errors[field]) ?? null
    setFieldErrors(errors)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestRef.current || success) return
    setError('')
    const input = { title: form.title.trim(), category: form.category.trim(), description: form.description.trim() }
    const errors = validate(input)
    showFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (!user) {
      setError('Please log in before submitting a report.')
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setSubmitting(true)
    try {
      const result = await submitPlatformIssueReport(input, user.id, controller.signal)
      if (!controller.signal.aborted) setSuccess(result.message)
    } catch (submissionError) {
      if (controller.signal.aborted) return
      if (submissionError instanceof PlatformIssueSubmissionError) {
        showFieldErrors(submissionError.fieldErrors)
        setError(submissionError.message)
      } else {
        setError('Unable to submit your report. Please check your connection and try again.')
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  function inputClass(field: keyof PlatformIssueReportInput) {
    return `${fieldClass} ${fieldErrors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-stone-300 focus:border-[#344336] focus:ring-[#344336]/10'}`
  }

  return (
    <PetLayout>
      <section className="mx-auto max-w-2xl" aria-labelledby="report-issue-title">
        <h1 id="report-issue-title" className="text-3xl font-bold tracking-tight">Report an Issue</h1>
        <p className="mt-3 leading-6 text-stone-600">Let us know about a problem with Homebound so we can review it.</p>

        {success && (
          <dialog
            ref={successRef} onClose={goBack} aria-labelledby="report-success-title" aria-describedby="report-success-message"
            onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}
            className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/45"
          >
            <div className="relative p-6 sm:p-8">
              <button type="button" onClick={() => successRef.current?.close()} aria-label="Close confirmation" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
              </div>
              <h2 id="report-success-title" className="mt-4 text-center text-xl font-semibold">Report submitted</h2>
              <p id="report-success-message" className="mt-2 text-center text-sm leading-6 text-stone-600">{success}</p>
              <button type="button" autoFocus onClick={() => successRef.current?.close()} className="mt-6 w-full rounded-xl bg-[#344336] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263329] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344336]">
                OK
              </button>
            </div>
          </dialog>
        )}
          <form ref={formRef} onSubmit={submit} noValidate aria-busy={submitting} className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-6 text-sm text-stone-500">Fields marked * are required.</p>
            {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            <fieldset disabled={submitting || Boolean(success)} className="space-y-6">
              <legend className="sr-only">Issue details</legend>
              <div>
                <label htmlFor="issue-title" className="text-sm font-semibold">Title <span aria-hidden="true">*</span></label>
                <input
                  id="issue-title" name="title" type="text" value={form.title} onChange={event => change('title', event.target.value)}
                  required maxLength={150} placeholder="Briefly summarize the issue" className={inputClass('title')}
                  aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'issue-title-error' : undefined}
                />
                {fieldErrors.title && <p id="issue-title-error" role="alert" className="mt-2 text-sm text-red-700">{fieldErrors.title}</p>}
              </div>
              <div>
                <label htmlFor="issue-category" className="text-sm font-semibold">Category <span aria-hidden="true">*</span></label>
                <select
                  id="issue-category" name="category" value={form.category} onChange={event => change('category', event.target.value)}
                  required className={inputClass('category')} aria-invalid={Boolean(fieldErrors.category)}
                  aria-describedby={fieldErrors.category ? 'issue-category-error' : undefined}
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
                {fieldErrors.category && <p id="issue-category-error" role="alert" className="mt-2 text-sm text-red-700">{fieldErrors.category}</p>}
              </div>
              <div>
                <label htmlFor="issue-description" className="text-sm font-semibold">Description <span aria-hidden="true">*</span></label>
                <textarea
                  id="issue-description" name="description" rows={6} value={form.description} onChange={event => change('description', event.target.value)}
                  required maxLength={5000} placeholder="Describe what happened and what you expected to happen." className={`${inputClass('description')} resize-y`}
                  aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'issue-description-error' : undefined}
                />
                <div className="mt-2 flex justify-end text-xs text-stone-500">
                  <span>{form.description.length.toLocaleString('en-US')} / 5,000</span>
                </div>
                {fieldErrors.description && <p id="issue-description-error" role="alert" className="mt-2 text-sm text-red-700">{fieldErrors.description}</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-6">
                <button type="button" onClick={goBack} className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#344336] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263329] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344336] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit report'}
                </button>
              </div>
            </fieldset>
          </form>
      </section>
    </PetLayout>
  )
}
