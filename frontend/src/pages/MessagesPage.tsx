import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { BlockedUsersDialog } from '@/components/messages/BlockedUsersDialog'
import { ConversationSidebar } from '@/components/messages/ConversationSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { getConversations, type ConversationPreview } from '@/services/conversations'
import { cancelOutgoingMessageRequest, getIncomingMessageRequests, getOutgoingMessageRequests, respondToMessageRequest, type IncomingMessageRequest, type OutgoingMessageRequest } from '@/services/messageRequests'
import { getConversationMessages, type StoredMessage } from '@/services/messages'
import { connectMessagingSocket } from '@/services/socket'
import { getCurrentMessagingUser, type CurrentMessagingUser } from '@/services/users'
import type { BlockedUser, Conversation, Message, MessageRequest } from '@/types/messages'

// Conversations start empty until the messaging API is connected.
const initialConversations: Conversation[] = []

// Requests start empty until the backend request endpoint is connected.
const initialRequests: MessageRequest[] = []

function getInitials(name: string) {
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2)
}

function toConversation(preview: ConversationPreview): Conversation {
  return {
    id: preview.id,
    participantId: preview.participant.id,
    isBlocked: preview.isBlocked ?? false,
    participantName: preview.participant.name,
    participantInitials: getInitials(preview.participant.name),
    participantRole: preview.participant.role === 'shelter_staff' ? 'shelterStaff' : 'user',
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    messages: [],
  }
}

function toMessageRequest(request: IncomingMessageRequest): MessageRequest {
  return {
    id: request.id,
    personId: request.sender.id,
    name: request.sender.name,
    initials: getInitials(request.sender.name),
    note: request.sender.role === 'shelter_staff' ? 'Shelter staff' : 'User',
  }
}

function toOutgoingMessageRequest(request: OutgoingMessageRequest): MessageRequest {
  return {
    id: request.id,
    personId: request.recipient.id,
    name: request.recipient.name,
    initials: getInitials(request.recipient.name),
    note: request.recipient.role === 'shelter_staff' ? 'Shelter staff' : 'User',
  }
}

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(createdAt))
}

function toMessage(storedMessage: StoredMessage): Message {
  return {
    id: storedMessage.id,
    senderId: storedMessage.senderId,
    content: storedMessage.content,
    createdAt: storedMessage.createdAt,
    sentAt: formatMessageTime(storedMessage.createdAt),
    edited: Boolean(storedMessage.editedAt),
    reactions: storedMessage.reactions,
  }
}

function sortMessages(messages: Message[]) {
  // Preserve server order even when two messages share the same timestamp.
  return [...messages].sort((firstMessage, secondMessage) => {
    const timeDifference = new Date(firstMessage.createdAt).getTime() - new Date(secondMessage.createdAt).getTime()
    return timeDifference || firstMessage.id.localeCompare(secondMessage.id)
  })
}

function mergeConversationMessages(conversation: Conversation, incomingMessages: Message[]): Conversation {
  const messagesById = new Map(conversation.messages.map((message) => [message.id, message]))
  incomingMessages.forEach((message) => messagesById.set(message.id, message))
  const messages = sortMessages([...messagesById.values()])
  const latestMessage = messages.at(-1)

  return {
    ...conversation,
    messages,
    lastMessage: latestMessage?.content ?? '',
    lastMessageTime: latestMessage?.sentAt ?? '',
  }
}

function getConnectionError() {
  // navigator.onLine distinguishes a network outage from an unavailable local messaging server.
  return navigator.onLine
    ? 'The messaging server is unavailable. Please try again.'
    : 'You are offline. Check your connection and try again.'
}

type MessageReactionUpdate = {
  messageId: string
  conversationId: string
  userId: string
  userName: string
  emoji: string
  action: 'added' | 'removed' | 'replaced'
  previousEmoji?: string
}

type MessageUpdate = {
  id: string
  conversationId: string
  content: string
  editedAt: string
}

type MessageDeletion = {
  id: string
  conversationId: string
}

type ConversationDeletion = {
  id: string
}

type MessageRequestParticipant = {
  id: string
  name: string
  role: 'user' | 'shelter_staff'
}

type MessageRequestCreatedEvent = {
  id: string
  sender: MessageRequestParticipant
}

type MessageRequestResolvedEvent = {
  requestId: string
  status: 'accepted' | 'declined'
  recipientId: string
  conversation?: {
    id: string
    participants: MessageRequestParticipant[]
  }
}

type MessageRequestCancelledEvent = {
  requestId: string
}

type UserBlockEvent = { blockerId: string; blockedId: string }
type UserUnblockEvent = UserBlockEvent & { isBlocked: boolean }

type AppliedReactionChange = {
  emoji: string
  action: 'added' | 'removed'
}

function applyReactionChange(message: Message, change: AppliedReactionChange, update: MessageReactionUpdate, currentUserId: string): Message {
  const existingReaction = message.reactions.find((reaction) => reaction.emoji === change.emoji)
  const isCurrentUserReaction = update.userId === currentUserId

  if (change.action === 'added') {
    const reaction = {
      emoji: change.emoji,
      count: (existingReaction?.count ?? 0) + 1,
      reactedByCurrentUser: (existingReaction?.reactedByCurrentUser ?? false) || isCurrentUserReaction,
      reactors: [
        ...(existingReaction?.reactors ?? []),
        { id: update.userId, name: update.userName },
      ],
    }

    return {
      ...message,
      reactions: existingReaction
        ? message.reactions.map((item) => item.emoji === change.emoji ? reaction : item)
        : [...message.reactions, reaction],
    }
  }

  if (!existingReaction) return message

  const reaction = {
    ...existingReaction,
    count: existingReaction.count - 1,
    reactedByCurrentUser: isCurrentUserReaction ? false : existingReaction.reactedByCurrentUser,
    reactors: existingReaction.reactors.filter((reactor) => reactor.id !== update.userId),
  }

  return {
    ...message,
    reactions: reaction.count > 0
      ? message.reactions.map((item) => item.emoji === change.emoji ? reaction : item)
      : message.reactions.filter((item) => item.emoji !== change.emoji),
  }
}

function applyReactionUpdate(conversation: Conversation, update: MessageReactionUpdate, currentUserId: string): Conversation {
  const changes: AppliedReactionChange[] = update.action === 'replaced' && update.previousEmoji
    ? [
        { emoji: update.previousEmoji, action: 'removed' },
        { emoji: update.emoji, action: 'added' },
      ]
    : [{ emoji: update.emoji, action: update.action === 'removed' ? 'removed' : 'added' }]

  return {
    ...conversation,
    messages: conversation.messages.map((message) => {
      if (message.id !== update.messageId) return message

      // Replacing an emoji is modelled as removing the previous count before adding the new one.
      return changes.reduce((currentMessage, change) => (
        applyReactionChange(currentMessage, change, update, currentUserId)
      ), message)
    }),
  }
}

function applyMessageUpdate(conversation: Conversation, update: MessageUpdate): Conversation {
  const messages = conversation.messages.map((message) => (
    message.id === update.id ? { ...message, content: update.content, edited: true } : message
  ))

  return {
    ...conversation,
    messages,
    lastMessage: messages.at(-1)?.id === update.id ? update.content : conversation.lastMessage,
  }
}

function applyMessageDeletion(conversation: Conversation, deletion: MessageDeletion): Conversation {
  const messages = conversation.messages.filter((message) => message.id !== deletion.id)
  const latestMessage = messages.at(-1)

  return {
    ...conversation,
    messages,
    lastMessage: latestMessage?.content ?? '',
    lastMessageTime: latestMessage?.sentAt ?? '',
  }
}

function toConversationFromParticipants(
  conversation: NonNullable<MessageRequestResolvedEvent['conversation']>,
  currentUserId: string,
): Conversation | null {
  const participant = conversation.participants.find((member) => member.id !== currentUserId)
  if (!participant) return null

  return toConversation({ id: conversation.id, participant })
}

export function MessagesPage() {
  const { user, loading: isAuthLoading } = useAuth()
  const [messagingUser, setMessagingUser] = useState<CurrentMessagingUser | null>(null)
  const [messagingUserError, setMessagingUserError] = useState<string | null>(null)
  const [conversations, setConversations] = useState(initialConversations)
  const [messageRequests, setMessageRequests] = useState(initialRequests)
  const [outgoingMessageRequests, setOutgoingMessageRequests] = useState(initialRequests)
  const [resolvedOutgoingRequest, setResolvedOutgoingRequest] = useState<{ requestId: string; recipientId: string } | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isBlockedUsersLoading, setIsBlockedUsersLoading] = useState(false)
  const [blockedUsersError, setBlockedUsersError] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const blockedParticipantIdsRef = useRef(new Set<string>())
  const blockVersionRef = useRef(0)
  const blockChangesRef = useRef(new Map<string, { version: number; isBlocked: boolean }>())
  const blockedListRequestRef = useRef(0)
  const activeConversationIdRef = useRef<string | null>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
  const currentUserId = messagingUser?.id

  useEffect(() => {
    let isCurrentUser = true

    if (!user) {
      setMessagingUser(null)
      return
    }

    setMessagingUserError(null)
    getCurrentMessagingUser()
      .then((resolvedUser) => {
        if (isCurrentUser) setMessagingUser(resolvedUser)
      })
      .catch((error: unknown) => {
        if (isCurrentUser) setMessagingUserError(error instanceof Error ? error.message : 'Unable to load messaging account.')
      })

    return () => {
      isCurrentUser = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!currentUserId) return

    // Reconnect whenever the authenticated messaging account changes.
    const socket = connectMessagingSocket(currentUserId)
    socketRef.current = socket
    blockedParticipantIdsRef.current = new Set()
    blockVersionRef.current = 0
    blockChangesRef.current = new Map()
    setIsBlockedUsersOpen(false)
    setBlockedUsers([])
    setBlockedUsersError('')

    const handleUserBlocked = (block: UserBlockEvent) => {
      applyUserBlock(block)
      if (block.blockerId === currentUserId) loadBlockedUsers()
    }
    const handleUserUnblocked = (block: UserUnblockEvent) => {
      applyUserUnblock(block)
      if (block.blockerId === currentUserId) loadBlockedUsers()
    }
    let isCurrentConnection = true
    const refreshConversationBlocks = () => {
      const requestVersion = blockVersionRef.current
      getConversations(currentUserId).then((previews) => {
        if (!isCurrentConnection) return
        const statuses = new Map(previews.map((preview) => [preview.id, readConversationBlockStatus(preview, requestVersion)]))
        setConversations((current) => current.map((conversation) => ({
          ...conversation,
          isBlocked: statuses.get(conversation.id) ?? conversation.isBlocked,
        })))
      }).catch((error: unknown) => console.error('Unable to refresh conversation block status.', error))
    }
    const handleConnect = () => {
      // Recover both blocks and unblocks missed while this account was offline.
      const selectedId = activeConversationIdRef.current
      if (selectedId) socket.emit('join_conversation', selectedId, () => {})
      refreshConversationBlocks()
      loadBlockedUsers()
    }

    const handleMessageCreated = (storedMessage: StoredMessage) => {
      // Use the database ID to ignore a duplicate received through the event acknowledgement.
      setConversations((currentConversations) => currentConversations.map((conversation) => (
        conversation.id === storedMessage.conversationId
          ? mergeConversationMessages(conversation, [toMessage(storedMessage)])
          : conversation
      )))
    }

    const handleReactionUpdated = (update: MessageReactionUpdate) => {
      setConversations((currentConversations) => currentConversations.map((conversation) => (
        conversation.id === update.conversationId
          ? applyReactionUpdate(conversation, update, currentUserId)
          : conversation
      )))
    }

    const handleMessageUpdated = (update: MessageUpdate) => {
      setConversations((currentConversations) => currentConversations.map((conversation) => (
        conversation.id === update.conversationId
          ? applyMessageUpdate(conversation, update)
          : conversation
      )))
    }

    const handleMessageDeleted = (deletion: MessageDeletion) => {
      setConversations((currentConversations) => currentConversations.map((conversation) => (
        conversation.id === deletion.conversationId
          ? applyMessageDeletion(conversation, deletion)
          : conversation
      )))
    }

    const handleConversationDeleted = (deletion: ConversationDeletion) => {
      setConversations((currentConversations) => currentConversations.filter((conversation) => conversation.id !== deletion.id))
      setActiveConversationId((currentConversationId) => currentConversationId === deletion.id ? null : currentConversationId)
    }

    const handleMessageRequestCreated = (request: MessageRequestCreatedEvent) => {
      setMessageRequests((currentRequests) => (
        currentRequests.some((currentRequest) => currentRequest.id === request.id)
          ? currentRequests
          : [toMessageRequest({ id: request.id, sender: request.sender }), ...currentRequests]
      ))
    }

    const handleMessageRequestResolved = (resolution: MessageRequestResolvedEvent) => {
      setMessageRequests((currentRequests) => currentRequests.filter((request) => request.id !== resolution.requestId))
      setOutgoingMessageRequests((currentRequests) => currentRequests.filter((request) => request.id !== resolution.requestId))

      if (resolution.recipientId !== currentUserId) {
        setResolvedOutgoingRequest({ requestId: resolution.requestId, recipientId: resolution.recipientId })
      }

      if (resolution.status !== 'accepted' || !resolution.conversation) return

      const conversation = toConversationFromParticipants(resolution.conversation, currentUserId)
      if (!conversation) return
      conversation.isBlocked = blockedParticipantIdsRef.current.has(conversation.participantId)

      setConversations((currentConversations) => (
        currentConversations.some((currentConversation) => currentConversation.id === conversation.id)
          ? currentConversations
          : [conversation, ...currentConversations]
      ))

      // The accepting participant opens the new chat immediately; the sender sees it in the sidebar.
      if (resolution.recipientId === currentUserId) setActiveConversationId(conversation.id)
      refreshConversationBlocks()
    }

    const handleMessageRequestCancelled = (cancellation: MessageRequestCancelledEvent) => {
      setMessageRequests((currentRequests) => currentRequests.filter((request) => request.id !== cancellation.requestId))
    }

    socket.on('message_created', handleMessageCreated)
    socket.on('message_updated', handleMessageUpdated)
    socket.on('message_deleted', handleMessageDeleted)
    socket.on('conversation_deleted', handleConversationDeleted)
    socket.on('message_request_created', handleMessageRequestCreated)
    socket.on('message_request_resolved', handleMessageRequestResolved)
    socket.on('message_request_cancelled', handleMessageRequestCancelled)
    socket.on('message_reaction_updated', handleReactionUpdated)
    socket.on('user_blocked', handleUserBlocked)
    socket.on('user_unblocked', handleUserUnblocked)
    socket.on('connect', handleConnect)

    return () => {
      isCurrentConnection = false
      blockedListRequestRef.current += 1
      socket.off('message_created', handleMessageCreated)
      socket.off('message_updated', handleMessageUpdated)
      socket.off('message_deleted', handleMessageDeleted)
      socket.off('conversation_deleted', handleConversationDeleted)
      socket.off('message_request_created', handleMessageRequestCreated)
      socket.off('message_request_resolved', handleMessageRequestResolved)
      socket.off('message_request_cancelled', handleMessageRequestCancelled)
      socket.off('message_reaction_updated', handleReactionUpdated)
      socket.off('user_blocked', handleUserBlocked)
      socket.off('user_unblocked', handleUserUnblocked)
      socket.off('connect', handleConnect)
      socket.disconnect()
      socketRef.current = null
    }
  }, [currentUserId])

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
    if (!activeConversationId || !currentUserId) return

    // Join only the selected thread so later real-time events can be scoped to its members.
    socketRef.current?.emit('join_conversation', activeConversationId, (response: { ok: boolean; message?: string }) => {
      if (!response.ok) console.error(response.message ?? 'Unable to join the conversation room.')
    })
  }, [activeConversationId, currentUserId])

  useEffect(() => {
    if (!activeConversationId || !currentUserId) return

    let isCurrentConversation = true

    getConversationMessages(currentUserId, activeConversationId)
      .then((storedMessages) => {
        if (!isCurrentConversation) return

        // Merge rather than replace so a real-time message arriving during the request is retained.
        setConversations((currentConversations) => currentConversations.map((conversation) => (
          conversation.id === activeConversationId
            ? mergeConversationMessages(conversation, storedMessages.map(toMessage))
            : conversation
        )))
      })
      .catch((error: unknown) => {
        if (isCurrentConversation) console.error('Unable to load conversation messages.', error)
      })

    return () => {
      isCurrentConversation = false
    }
  }, [activeConversationId, currentUserId])

  useEffect(() => {
    if (!currentUserId) {
      setActiveConversationId(null)
      setMessageRequests([])
      setOutgoingMessageRequests([])
      setConversations([])
      return
    }

    let isCurrentAccount = true

    // Clear the previous account's selected thread before loading its messaging data.
    setActiveConversationId(null)
    setResolvedOutgoingRequest(null)
    const requestVersion = blockVersionRef.current

    Promise.all([
      getIncomingMessageRequests(currentUserId),
      getOutgoingMessageRequests(currentUserId),
      getConversations(currentUserId),
    ])
      .then(([requests, outgoingRequests, loadedConversations]) => {
        if (!isCurrentAccount) return
        setMessageRequests(requests.map(toMessageRequest))
        setOutgoingMessageRequests(outgoingRequests.map(toOutgoingMessageRequest))
        setConversations(loadedConversations.map((preview) => ({
          ...toConversation(preview),
          isBlocked: readConversationBlockStatus(preview, requestVersion),
        })))
      })
      .catch((error: unknown) => {
        if (isCurrentAccount) console.error('Unable to load messaging data.', error)
      })

    return () => {
      // Ignore slow responses that belong to an account selected before the URL changed.
      isCurrentAccount = false
    }
  }, [currentUserId])

  function readConversationBlockStatus(preview: ConversationPreview, requestVersion: number) {
    const change = blockChangesRef.current.get(preview.participant.id)
    // A response started before a live block/unblock must not undo that newer action.
    const isBlocked = change && change.version > requestVersion ? change.isBlocked : Boolean(preview.isBlocked)
    if (isBlocked) blockedParticipantIdsRef.current.add(preview.participant.id)
    else blockedParticipantIdsRef.current.delete(preview.participant.id)
    return isBlocked
  }

  function applyBlockStatus(block: UserBlockEvent, isBlocked: boolean) {
    if (block.blockerId !== currentUserId && block.blockedId !== currentUserId) return
    const participantId = block.blockerId === currentUserId ? block.blockedId : block.blockerId
    blockVersionRef.current += 1
    blockChangesRef.current.set(participantId, { version: blockVersionRef.current, isBlocked })
    if (isBlocked) blockedParticipantIdsRef.current.add(participantId)
    else blockedParticipantIdsRef.current.delete(participantId)
    setConversations((current) => current.map((conversation) => conversation.participantId === participantId
      ? { ...conversation, isBlocked } : conversation))
  }

  function applyUserBlock(block: UserBlockEvent) {
    applyBlockStatus(block, true)
  }

  function applyUserUnblock(block: UserUnblockEvent) {
    applyBlockStatus(block, block.isBlocked)
    if (block.blockerId === currentUserId) setBlockedUsers((current) => current.filter((user) => user.id !== block.blockedId))
  }

  function loadBlockedUsers() {
    const requestId = ++blockedListRequestRef.current
    const socket = socketRef.current
    setBlockedUsersError('')
    if (!socket?.connected) {
      setIsBlockedUsersLoading(false)
      setBlockedUsersError(getConnectionError())
      return
    }
    setIsBlockedUsersLoading(true)
    socket.timeout(5000).emit('get_blocked_users', {}, (timeoutError: Error | null, response?: { ok: boolean; error?: string; users?: BlockedUser[] }) => {
      if (socketRef.current !== socket || requestId !== blockedListRequestRef.current) return
      setIsBlockedUsersLoading(false)
      if (timeoutError || !response?.ok || !response.users) {
        setBlockedUsersError(response?.error ?? 'Unable to load your blocked users. Please try again.')
        return
      }
      setBlockedUsers(response.users)
    })
  }

  function unblockParticipant(participantId: string) {
    const socket = socketRef.current
    if (!socket?.connected) return Promise.resolve({ ok: false, error: getConnectionError() })
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.timeout(5000).emit('unblock_user', { participantId }, (timeoutError: Error | null, response?: { ok: boolean; error?: string; block?: UserUnblockEvent }) => {
        if (socketRef.current !== socket) {
          resolve({ ok: false, error: 'The messaging account has changed.' })
          return
        }
        if (timeoutError || !response?.ok || !response.block) {
          resolve({ ok: false, error: response?.error ?? 'Unable to unblock this user. Please try again.' })
          return
        }
        applyUserUnblock(response.block)
        loadBlockedUsers()
        resolve({ ok: true })
      })
    })
  }

  function blockParticipant(participantId: string) {
    const socket = socketRef.current
    if (!socket?.connected) return Promise.resolve({ ok: false, error: getConnectionError() })
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.timeout(5000).emit('block_user', { participantId }, (timeoutError: Error | null, response?: { ok: boolean; error?: string; block?: UserBlockEvent }) => {
        if (timeoutError) {
          resolve({ ok: false, error: getConnectionError() })
          return
        }
        if (!response?.ok || !response.block) {
          resolve({ ok: false, error: response?.error ?? 'Unable to block this user. Please try again.' })
          return
        }
        applyUserBlock(response.block)
        resolve({ ok: true })
      })
    })
  }

  function sendMessage(content: string) {
    if (activeConversation?.isBlocked) return Promise.resolve({ ok: false, error: 'You cannot send messages to this person.' })
    const socket = socketRef.current
    if (!activeConversationId || !socket || !socket.connected) {
      return Promise.resolve({ ok: false, error: getConnectionError() })
    }

    const conversationId = activeConversationId

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      // A timeout prevents the input from waiting forever when the server is unreachable.
      socket.timeout(5000).emit(
        'send_message',
        { conversationId, content },
        (timeoutError: Error | null, response?: { ok: boolean; error?: string; message?: StoredMessage }) => {
          if (timeoutError) {
            resolve({ ok: false, error: getConnectionError() })
            return
          }

          const storedMessage = response?.message
          if (!response?.ok || !storedMessage) {
            resolve({ ok: false, error: response?.error ?? 'Message was not sent. Please try again.' })
            return
          }

          // The acknowledgement covers the short interval before this client finishes joining the room.
          setConversations((currentConversations) => currentConversations.map((conversation) => (
            conversation.id === storedMessage.conversationId
              ? mergeConversationMessages(conversation, [toMessage(storedMessage)])
              : conversation
          )))
          resolve({ ok: true })
        },
      )
    })
  }

  function editMessage(messageId: string, content: string) {
    if (activeConversation?.isBlocked) return Promise.resolve({ ok: false, error: 'You cannot edit messages in this conversation.' })
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      return Promise.resolve({ ok: false, error: getConnectionError() })
    }

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.timeout(5000).emit(
        'edit_message',
        { messageId, content },
        (timeoutError: Error | null, response?: { ok: boolean; error?: string; update?: MessageUpdate }) => {
          if (timeoutError) {
            resolve({ ok: false, error: getConnectionError() })
            return
          }

          if (!response?.ok || !response.update) {
            resolve({ ok: false, error: response?.error ?? 'Message was not edited. Please try again.' })
            return
          }

          // The room event handles the visible update for every participant, including the editor.
          resolve({ ok: true })
        },
      )
    })
  }

  function deleteMessage(messageId: string) {
    if (activeConversation?.isBlocked) return
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      console.error(getConnectionError())
      return
    }

    socket.timeout(5000).emit(
      'delete_message',
      { messageId },
      (timeoutError: Error | null, response?: { ok: boolean; error?: string; deletion?: MessageDeletion }) => {
        if (timeoutError || !response?.ok || !response.deletion) {
          console.error(response?.error ?? 'Unable to delete the message.')
        }

        // The room event removes the message for both participants, including the sender.
      },
    )
  }

  function deleteConversation(conversationId: string) {
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      return Promise.resolve({ ok: false, error: getConnectionError() })
    }

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.timeout(5000).emit(
        'delete_conversation',
        { conversationId },
        (timeoutError: Error | null, response?: { ok: boolean; error?: string; deletion?: ConversationDeletion }) => {
          if (timeoutError) {
            resolve({ ok: false, error: getConnectionError() })
            return
          }

          if (!response?.ok || !response.deletion) {
            resolve({ ok: false, error: response?.error ?? 'Unable to delete the conversation.' })
            return
          }

          // Both dashboards are updated by the personal-room conversation_deleted event.
          resolve({ ok: true })
        },
      )
    })
  }

  function toggleReaction(messageId: string, emoji: string) {
    if (activeConversation?.isBlocked) return
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      console.error(getConnectionError())
      return
    }

    socket.timeout(5000).emit(
      'toggle_reaction',
      { messageId, emoji },
      (timeoutError: Error | null, response?: { ok: boolean; error?: string; update?: MessageReactionUpdate }) => {
        if (timeoutError || !response?.ok || !response.update) {
          console.error(response?.error ?? 'Unable to update the reaction.')
          return
        }

        // The room event updates every open client, including the sender, exactly once.
      },
    )
  }

  async function handleRequestAction(requestId: string, action: 'accept' | 'decline') {
    if (!currentUserId) return

    try {
      const result = await respondToMessageRequest(currentUserId, requestId, action)
      setMessageRequests((requests) => requests.filter((request) => request.id !== requestId))

      if (result.status === 'accepted' && result.conversation) {
        const conversation = toConversation(result.conversation)
        conversation.isBlocked = conversation.isBlocked || blockedParticipantIdsRef.current.has(conversation.participantId)
        setConversations((currentConversations) => (
          currentConversations.some((currentConversation) => currentConversation.id === conversation.id)
            ? currentConversations
            : [conversation, ...currentConversations]
        ))
        setActiveConversationId(conversation.id)
      }
    } catch (error) {
      console.error('Unable to respond to the message request.', error)
    }
  }

  async function handleCancelOutgoingRequest(requestId: string) {
    if (!currentUserId) return

    try {
      await cancelOutgoingMessageRequest(currentUserId, requestId)
      setOutgoingMessageRequests((requests) => requests.filter((request) => request.id !== requestId))
    } catch (error) {
      console.error('Unable to cancel the outgoing message request.', error)
      throw error
    }
  }

  function handleOutgoingRequestCreated(request: MessageRequest) {
    // Show a newly sent request immediately; a page reload still restores it from the API.
    setOutgoingMessageRequests((requests) => [request, ...requests])
  }

  if (isAuthLoading || !currentUserId) {
    return (
      <main className="grid h-dvh place-items-center bg-[#f7f3eb] px-4 text-[#344336]">
        <p className="rounded-xl bg-white px-5 py-4 shadow-sm">
          {messagingUserError ?? 'Loading your messaging account...'}
        </p>
      </main>
    )
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-stone-50 text-stone-900">
      <nav className="relative z-50 shrink-0 border-b border-stone-200 bg-white/95 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-[0.15em]">
            HOMEBOUND
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link to="/" className="transition hover:text-stone-500">Home</Link>
            <Link to="/pets" className="transition hover:text-stone-500">Find a Pet</Link>
            <Link to="/messages" className="text-stone-900 transition hover:text-stone-500">Messages</Link>
            <Link to="/profile" className="rounded-full border border-stone-300 px-5 py-2.5 transition hover:bg-stone-100">
              My Profile
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-8 lg:px-12 lg:py-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#757A5E]/25 bg-white shadow-[0_20px_60px_-25px_rgba(52,67,54,0.28)] lg:flex-row">
          <ConversationSidebar currentUserId={currentUserId} conversations={conversations} activeConversationId={activeConversationId} messageRequests={messageRequests} outgoingMessageRequests={outgoingMessageRequests} resolvedOutgoingRequest={resolvedOutgoingRequest} onConversationSelect={setActiveConversationId} onRequestAction={handleRequestAction} onCancelOutgoingRequest={handleCancelOutgoingRequest} onOutgoingRequestCreated={handleOutgoingRequestCreated} onConversationDelete={deleteConversation} onOpenBlockedUsers={() => { setIsBlockedUsersOpen(true); loadBlockedUsers() }} />
          <ChatWindow conversation={activeConversation} currentUserId={currentUserId} onSendMessage={sendMessage} onEditMessage={editMessage} onDeleteMessage={deleteMessage} onToggleReaction={toggleReaction} onBlockParticipant={blockParticipant} />
        </div>
      </div>
      {isBlockedUsersOpen && <BlockedUsersDialog key={currentUserId} users={blockedUsers} isLoading={isBlockedUsersLoading} error={blockedUsersError} onClose={() => setIsBlockedUsersOpen(false)} onRefresh={loadBlockedUsers} onUnblock={unblockParticipant} />}
    </main>
  )
}
