export type UserRole = 'user' | 'shelterStaff'

export type MessageReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
}

export type Message = {
  id: string
  senderId: string
  content: string
  sentAt: string
  edited?: boolean
  reactions: MessageReaction[]
}

export type Conversation = {
  id: string
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
  name: string
  initials: string
  note: string
}

export type SearchPerson = {
  id: string
  name: string
  role: 'user' | 'shelter_staff'
}
