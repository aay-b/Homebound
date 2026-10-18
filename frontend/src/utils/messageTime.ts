const messageTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatMessageTime(createdAt: string) {
  return messageTimeFormatter.format(new Date(createdAt))
}
