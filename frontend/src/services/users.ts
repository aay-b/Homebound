import type { SearchPerson } from '@/types/messages'

type SearchPeopleResponse = {
  people?: SearchPerson[]
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function searchPeople(query: string, currentUserId: string, signal?: AbortSignal): Promise<SearchPerson[]> {
  const searchParams = new URLSearchParams({ q: query, currentUserId })
  const response = await fetch(`${apiBaseUrl}/users/search?${searchParams}`, { signal })
  const payload = await response.json() as SearchPeopleResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to search people.')

  return payload.people ?? []
}
