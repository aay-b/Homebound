import { supabase } from '@/config/supabase'
import type { MessageImageSource } from '@/types/messages'

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
  imagePath: string | null
  image?: MessageImageSource | null
  createdAt: string
  editedAt: string | null
  reactions: StoredReaction[]
}

type ConversationMessagesResponse = {
  messages?: StoredMessage[]
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

type MessageImageUpload = {
  imagePath: string
  signedUrl: string
}

type MessageImageUrl = MessageImageSource
const imageUrlCache = new Map<string, MessageImageUrl>()

export async function uploadConversationImage(conversationId: string, file: File, signal?: AbortSignal): Promise<string> {
  if (!file.type.toLowerCase().startsWith('image/') || file.size === 0) throw new Error('Please select a valid image.')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to send images.')
  signal?.throwIfAborted()

  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/images/upload-url`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type }),
    signal,
  })
  const payload = await response.json() as { upload?: MessageImageUpload; message?: string }
  if (!response.ok || !payload.upload) throw new Error(payload.message ?? 'Unable to prepare the image upload.')

  // Upload the original file directly to Storage, without base64 conversion or an application file-size cap.
  // A signed upload URL authorizes only this server-chosen object; no service-role key reaches the browser.
  const form = new FormData()
  form.append('cacheControl', '3600')
  form.append('', file)
  const uploadResponse = await fetch(payload.upload.signedUrl, { method: 'PUT', body: form, signal })
  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => null) as { message?: string; error?: string } | null
    throw new Error(error?.message ?? error?.error ?? 'Unable to upload the image. Please try again.')
  }
  return payload.upload.imagePath
}

export async function getConversationMessageImage(
  conversationId: string,
  messageId: string,
  signal?: AbortSignal,
  refresh = false,
): Promise<MessageImageUrl> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to view images.')
  signal?.throwIfAborted()
  // Cache only in memory, scoped to the Auth account, and never reuse an almost-expired URL.
  const key = `${session.user.id}:${conversationId}:${messageId}`
  const cached = imageUrlCache.get(key)
  if (!refresh && cached && Date.parse(cached.expiresAt) > Date.now() + 60_000) return cached

  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages/${messageId}/image`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    signal,
  })
  const payload = await response.json() as { image?: MessageImageUrl; message?: string }
  if (!response.ok || !payload.image) throw new Error(payload.message ?? 'Unable to load the image.')
  if (imageUrlCache.size >= 150) imageUrlCache.delete(imageUrlCache.keys().next().value!)
  imageUrlCache.set(key, payload.image)
  return payload.image
}

export async function getConversationMessages(
  currentUserId: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<StoredMessage[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to open messages.')
  const searchParams = new URLSearchParams({ currentUserId })
  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages?${searchParams}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    signal,
  })
  const payload = await response.json() as ConversationMessagesResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to load conversation messages.')

  return payload.messages ?? []
}
