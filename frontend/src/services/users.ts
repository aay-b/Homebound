import type { SearchPerson } from '@/types/messages'
import { supabase } from '@/config/supabase'

type SearchPeopleResponse = {
  people?: SearchPerson[]
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function getMessagingAvatarUrls(userIds: string[], signal?: AbortSignal): Promise<Record<string, string | null>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to view profile pictures.')
  const response = await fetch(`${apiBaseUrl}/users/avatars`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
    signal,
  })
  const payload = await response.json() as { avatars?: Record<string, string | null>; message?: string }
  if (!response.ok || !payload.avatars) throw new Error(payload.message ?? 'Unable to load profile pictures.')
  return payload.avatars
}

export type CurrentMessagingUser = {
  id: string
  name: string
  role: 'user' | 'shelter_staff' | 'admin'
}

export async function getCurrentMessagingUser(): Promise<CurrentMessagingUser> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to open messages.')

  const response = await fetch(`${apiBaseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  const payload = await response.json() as { user?: CurrentMessagingUser; message?: string }

  if (!response.ok || !payload.user) {
    throw new Error(payload.message ?? 'Unable to load the messaging account.')
  }

  return payload.user
}

export async function searchPeople(query: string, currentUserId: string, signal?: AbortSignal): Promise<SearchPerson[]> {
  const searchParams = new URLSearchParams({ q: query, currentUserId })
  const response = await fetch(`${apiBaseUrl}/users/search?${searchParams}`, { signal })
  const payload = await response.json() as SearchPeopleResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to search people.')

  return payload.people ?? []
}
