type CreateMessageRequestResponse = {
  requestId?: string
  message?: string
}

export type IncomingMessageRequest = {
  id: string
  sender: { id: string; name: string; role: 'user' | 'shelter_staff' }
}

export type OutgoingMessageRequest = {
  id: string
  recipient: { id: string; name: string; role: 'user' | 'shelter_staff' }
}

type IncomingMessageRequestsResponse = {
  requests?: IncomingMessageRequest[]
  message?: string
}

type OutgoingMessageRequestsResponse = {
  requests?: OutgoingMessageRequest[]
  message?: string
}

export type MessageRequestResponse = {
  status: 'accepted' | 'declined'
  conversation?: {
    id: string
    participant: { id: string; name: string; role: 'user' | 'shelter_staff' }
  }
}

type MessageRequestResponsePayload = MessageRequestResponse & {
  message?: string
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function sendMessageRequest(currentUserId: string, recipientId: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/message-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentUserId, recipientId }),
  })
  const payload = await response.json() as CreateMessageRequestResponse

  if (!response.ok || !payload.requestId) throw new Error(payload.message ?? 'Unable to send the message request.')

  return payload.requestId
}

export async function getIncomingMessageRequests(currentUserId: string): Promise<IncomingMessageRequest[]> {
  const searchParams = new URLSearchParams({ currentUserId })
  const response = await fetch(`${apiBaseUrl}/message-requests?${searchParams}`)
  const payload = await response.json() as IncomingMessageRequestsResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to load message requests.')

  return payload.requests ?? []
}

export async function getOutgoingMessageRequests(currentUserId: string): Promise<OutgoingMessageRequest[]> {
  const searchParams = new URLSearchParams({ currentUserId })
  const response = await fetch(`${apiBaseUrl}/message-requests/outgoing?${searchParams}`)
  const payload = await response.json() as OutgoingMessageRequestsResponse

  if (!response.ok) throw new Error(payload.message ?? 'Unable to load outgoing message requests.')

  return payload.requests ?? []
}

export async function cancelOutgoingMessageRequest(currentUserId: string, requestId: string) {
  const response = await fetch(`${apiBaseUrl}/message-requests/${requestId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentUserId }),
  })
  const payload = await response.json() as { message?: string }

  if (!response.ok) throw new Error(payload.message ?? 'Unable to cancel the message request.')
}

export async function respondToMessageRequest(
  currentUserId: string,
  requestId: string,
  action: 'accept' | 'decline',
): Promise<MessageRequestResponse> {
  const response = await fetch(`${apiBaseUrl}/message-requests/${requestId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentUserId, action }),
  })
  const payload = await response.json() as MessageRequestResponsePayload

  if (!response.ok) throw new Error(payload.message ?? 'Unable to respond to the message request.')

  return payload
}
