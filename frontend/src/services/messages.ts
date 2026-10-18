export type StoredReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
  reactors: Array<{ id: string; name: string }>
}

export type StoredMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  editedAt: string | null
  reactions: StoredReaction[]
}

type ConversationMessagesResponse = {
  messages?: StoredMessage[]
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function getConversationMessages(
  currentUserId: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<StoredMessage[]> {
  const searchParams = new URLSearchParams({ currentUserId })
  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages?${searchParams}`, { signal })
  const payload = await response.json() as ConversationMessagesResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to load conversation messages.')

  return payload.messages ?? []
}
