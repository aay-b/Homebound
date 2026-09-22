import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { ConversationSidebar } from '@/components/messages/ConversationSidebar'
import { getConversations, type ConversationPreview } from '@/services/conversations'
import { cancelOutgoingMessageRequest, getIncomingMessageRequests, getOutgoingMessageRequests, respondToMessageRequest, type IncomingMessageRequest, type OutgoingMessageRequest } from '@/services/messageRequests'
import { getConversationMessages, type StoredMessage } from '@/services/messages'
import { connectMessagingSocket } from '@/services/socket'
import type { Conversation, Message, MessageRequest } from '@/types/messages'

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
    name: request.sender.name,
    initials: getInitials(request.sender.name),
    note: request.sender.role === 'shelter_staff' ? 'Shelter staff' : 'User',
  }
}

function toOutgoingMessageRequest(request: OutgoingMessageRequest): MessageRequest {
  return {
    id: request.id,
    name: request.recipient.name,
    initials: getInitials(request.recipient.name),
    note: request.recipient.role === 'shelter_staff' ? 'Shelter staff' : 'User',
  }
}

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(createdAt))
}

function toMessage(storedMessage: StoredMessage): Message {
  return {
    id: storedMessage.id,
    senderId: storedMessage.senderId,
    content: storedMessage.content,
    createdAt: storedMessage.createdAt,
    sentAt: formatMessageTime(storedMessage.createdAt),
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
  emoji: string
  action: 'added' | 'removed' | 'replaced'
  previousEmoji?: string
}

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

export function MessagesPage() {
  // The path segment supplies a temporary account ID until authentication is available.
  const { demoUserId } = useParams<{ demoUserId: string }>()
  const currentUserId = demoUserId ?? '1'
  const [conversations, setConversations] = useState(initialConversations)
  const [messageRequests, setMessageRequests] = useState(initialRequests)
  const [outgoingMessageRequests, setOutgoingMessageRequests] = useState(initialRequests)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

  useEffect(() => {
    // Reconnect whenever the URL switches the temporary demo account.
    const socket = connectMessagingSocket(currentUserId)
    socketRef.current = socket

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

    socket.on('message_created', handleMessageCreated)
    socket.on('message_reaction_updated', handleReactionUpdated)

    return () => {
      socket.off('message_created', handleMessageCreated)
      socket.off('message_reaction_updated', handleReactionUpdated)
      socket.disconnect()
      socketRef.current = null
    }
  }, [currentUserId])

  useEffect(() => {
    if (!activeConversationId) return

    // Join only the selected thread so later real-time events can be scoped to its members.
    socketRef.current?.emit('join_conversation', activeConversationId, (response: { ok: boolean; message?: string }) => {
      if (!response.ok) console.error(response.message ?? 'Unable to join the conversation room.')
    })
  }, [activeConversationId])

  useEffect(() => {
    if (!activeConversationId) return

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
    let isCurrentAccount = true

    // Clear the previous account's selected thread before loading its messaging data.
    setActiveConversationId(null)

    Promise.all([
      getIncomingMessageRequests(currentUserId),
      getOutgoingMessageRequests(currentUserId),
      getConversations(currentUserId),
    ])
      .then(([requests, outgoingRequests, loadedConversations]) => {
        if (!isCurrentAccount) return
        setMessageRequests(requests.map(toMessageRequest))
        setOutgoingMessageRequests(outgoingRequests.map(toOutgoingMessageRequest))
        setConversations(loadedConversations.map(toConversation))
      })
      .catch((error: unknown) => {
        if (isCurrentAccount) console.error('Unable to load messaging data.', error)
      })

    return () => {
      // Ignore slow responses that belong to an account selected before the URL changed.
      isCurrentAccount = false
    }
  }, [currentUserId])

  function updateActiveConversation(updateConversation: (conversation: Conversation) => Conversation) {
    // Centralize local conversation updates until message mutations use the API.
    setConversations((currentConversations) => activeConversationId
      ? currentConversations.map((conversation) => conversation.id === activeConversationId ? updateConversation(conversation) : conversation)
      : currentConversations)
  }

  function sendMessage(content: string) {
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
    updateActiveConversation((conversation) => ({ ...conversation, lastMessage: conversation.messages.at(-1)?.id === messageId ? content : conversation.lastMessage, messages: conversation.messages.map((message) => message.id === messageId ? { ...message, content, edited: true } : message) }))
  }

  function deleteMessage(messageId: string) {
    updateActiveConversation((conversation) => ({ ...conversation, messages: conversation.messages.filter((message) => message.id !== messageId) }))
  }

  function toggleReaction(messageId: string, emoji: string) {
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

        // Apply the acknowledgement locally because the sender is excluded from the room broadcast.
        setConversations((currentConversations) => currentConversations.map((conversation) => (
          conversation.id === response.update?.conversationId
            ? applyReactionUpdate(conversation, response.update, currentUserId)
            : conversation
        )))
      },
    )
  }

  async function handleRequestAction(requestId: string, action: 'accept' | 'decline') {
    try {
      const result = await respondToMessageRequest(currentUserId, requestId, action)
      setMessageRequests((requests) => requests.filter((request) => request.id !== requestId))

      if (result.status === 'accepted' && result.conversation) {
        const conversation = toConversation(result.conversation)
        setConversations((currentConversations) => [conversation, ...currentConversations])
        setActiveConversationId(conversation.id)
      }
    } catch (error) {
      console.error('Unable to respond to the message request.', error)
    }
  }

  async function handleCancelOutgoingRequest(requestId: string) {
    try {
      await cancelOutgoingMessageRequest(currentUserId, requestId)
      setOutgoingMessageRequests((requests) => requests.filter((request) => request.id !== requestId))
    } catch (error) {
      console.error('Unable to cancel the outgoing message request.', error)
    }
  }

  function handleOutgoingRequestCreated(request: MessageRequest) {
    // Show a newly sent request immediately; a page reload still restores it from the API.
    setOutgoingMessageRequests((requests) => [request, ...requests])
  }

  return (
    <main className="min-h-screen bg-[#f4f8f7] px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between rounded-2xl bg-teal-950 px-5 py-4 text-white shadow-lg shadow-teal-950/10 sm:px-7">
          <a className="text-xl font-extrabold tracking-tight" href="#home">Homebound<span className="text-amber-300">.</span></a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-teal-50/70 sm:flex" aria-label="Primary navigation">
            <a className="transition hover:text-white" href="#home">Home</a>
            <a className="transition hover:text-white" href="#search">Search</a>
            <a className="transition hover:text-white" href="#applications">Applications</a>
            <a className="border-b-2 border-amber-300 pb-1 text-white" href="/messages">Messages</a>
          </nav>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20" aria-label="Open profile">U</span>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,81,75,0.25)] lg:flex">
          <ConversationSidebar currentUserId={currentUserId} conversations={conversations} activeConversationId={activeConversationId} messageRequests={messageRequests} outgoingMessageRequests={outgoingMessageRequests} onConversationSelect={setActiveConversationId} onRequestAction={handleRequestAction} onCancelOutgoingRequest={handleCancelOutgoingRequest} onOutgoingRequestCreated={handleOutgoingRequestCreated} />
          <ChatWindow conversation={activeConversation} currentUserId={currentUserId} onSendMessage={sendMessage} onEditMessage={editMessage} onDeleteMessage={deleteMessage} onToggleReaction={toggleReaction} />
        </div>
      </div>
    </main>
  )
}
