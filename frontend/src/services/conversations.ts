export type ConversationPreview = {
  id: string
  participant: { id: string; name: string; role: 'user' | 'shelter_staff' }
}

type ConversationsResponse = {
  conversations?: ConversationPreview[]
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function getConversations(currentUserId: string): Promise<ConversationPreview[]> {
  const searchParams = new URLSearchParams({ currentUserId })
  const response = await fetch(`${apiBaseUrl}/conversations?${searchParams}`)
  const payload = await response.json() as ConversationsResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to load conversations.')

  return payload.conversations ?? []
}
