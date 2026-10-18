export type UserRole = 'user' | 'shelterStaff'

export type BlockedUser = {
  id: string
  name: string
  role: string
  blockedAt: string
}

export type MessageReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
  reactors: Array<{ id: string; name: string }>
}

export type Message = {
  id: string
  senderId: string
  content: string
  createdAt: string
  sentAt: string
  edited?: boolean
  reactions: MessageReaction[]
}

export type Conversation = {
  id: string
  participantId: string
  isBlocked: boolean
  participantName: string
  participantInitials: string
  participantRole: UserRole
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
}

export type MessageRequest = {
  id: string
  personId: string
  name: string
  initials: string
  note: string
}

export type SearchPerson = {
  id: string
  name: string
  role: 'user' | 'shelter_staff'
  hasPendingRequest: boolean
}
