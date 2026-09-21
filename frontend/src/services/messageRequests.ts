type CreateMessageRequestResponse = {
  requestId?: string
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
