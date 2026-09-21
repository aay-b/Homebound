import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { ConversationSidebar } from '@/components/messages/ConversationSidebar'
import { getConversations, type ConversationPreview } from '@/services/conversations'
import { getIncomingMessageRequests, respondToMessageRequest, type IncomingMessageRequest } from '@/services/messageRequests'
import type { Conversation, MessageRequest } from '@/types/messages'

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

export function MessagesPage() {
  // The path segment supplies a temporary account ID until authentication is available.
  const { demoUserId } = useParams<{ demoUserId: string }>()
  const currentUserId = demoUserId ?? '1'
  const [conversations, setConversations] = useState(initialConversations)
  const [messageRequests, setMessageRequests] = useState(initialRequests)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

  useEffect(() => {
    let isCurrentAccount = true

    setActiveConversationId(null)

    Promise.all([
      getIncomingMessageRequests(currentUserId),
      getConversations(currentUserId),
    ])
      .then(([requests, loadedConversations]) => {
        if (!isCurrentAccount) return
        setMessageRequests(requests.map(toMessageRequest))
        setConversations(loadedConversations.map(toConversation))
      })
      .catch((error: unknown) => {
        if (isCurrentAccount) console.error('Unable to load messaging data.', error)
      })

    return () => {
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
    const now = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())
    updateActiveConversation((conversation) => ({ ...conversation, lastMessage: content, lastMessageTime: now, messages: [...conversation.messages, { id: crypto.randomUUID(), senderId: currentUserId, content, sentAt: now, reactions: [] }] }))
  }

  function editMessage(messageId: string, content: string) {
    updateActiveConversation((conversation) => ({ ...conversation, lastMessage: conversation.messages.at(-1)?.id === messageId ? content : conversation.lastMessage, messages: conversation.messages.map((message) => message.id === messageId ? { ...message, content, edited: true } : message) }))
  }

  function deleteMessage(messageId: string) {
    updateActiveConversation((conversation) => ({ ...conversation, messages: conversation.messages.filter((message) => message.id !== messageId) }))
  }

  function toggleReaction(messageId: string, emoji: string) {
    updateActiveConversation((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => {
      if (message.id !== messageId) return message
      const reaction = message.reactions.find((item) => item.emoji === emoji)
      const reactions = reaction
        ? message.reactions.map((item) => item.emoji === emoji ? { ...item, count: item.reactedByCurrentUser ? item.count - 1 : item.count + 1, reactedByCurrentUser: !item.reactedByCurrentUser } : item).filter((item) => item.count > 0)
        : [...message.reactions, { emoji, count: 1, reactedByCurrentUser: true }]
      return { ...message, reactions }
    }) }))
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
          <ConversationSidebar currentUserId={currentUserId} conversations={conversations} activeConversationId={activeConversationId} messageRequests={messageRequests} onConversationSelect={setActiveConversationId} onRequestAction={handleRequestAction} />
          <ChatWindow conversation={activeConversation} currentUserId={currentUserId} onSendMessage={sendMessage} onEditMessage={editMessage} onDeleteMessage={deleteMessage} onToggleReaction={toggleReaction} />
        </div>
      </div>
    </main>
  )
}
