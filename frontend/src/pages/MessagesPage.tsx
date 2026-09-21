import { useState } from 'react'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { ConversationSidebar } from '@/components/messages/ConversationSidebar'
import type { Conversation, MessageRequest } from '@/types/messages'

// This temporary identity will be replaced by the authenticated user ID.
const currentUserId = 'current-user'

// Conversations remain local until the messaging API is connected.
const initialConversations: Conversation[] = [
  {
    id: 'happy-paws', participantName: 'Happy Paws Shelter', participantInitials: 'HP', participantRole: 'shelterStaff', lastMessage: 'Yes, Luna is still available!', lastMessageTime: '10:28 AM', unreadCount: 2,
    messages: [
      { id: 'm-1', senderId: currentUserId, content: 'Hi! Is Luna still available for adoption?', sentAt: '10:24 AM', reactions: [] },
      { id: 'm-2', senderId: 'happy-paws', content: 'Yes! Luna is still available. She is gentle, playful, and ready to meet her forever family.', sentAt: '10:26 AM', reactions: [{ emoji: '❤️', count: 1, reactedByCurrentUser: true }] },
      { id: 'm-3', senderId: currentUserId, content: 'That is wonderful. Could I schedule a visit this weekend?', sentAt: '10:28 AM', reactions: [] },
    ],
  },
  { id: 'city-animal', participantName: 'City Animal Rescue', participantInitials: 'CA', participantRole: 'shelterStaff', lastMessage: 'We can help with that.', lastMessageTime: 'Yesterday', unreadCount: 0, messages: [{ id: 'm-4', senderId: 'city-animal', content: 'Hello! How can we help you today?', sentAt: 'Yesterday', reactions: [] }] },
  { id: 'northside', participantName: 'Northside Shelter', participantInitials: 'NS', participantRole: 'shelterStaff', lastMessage: 'Thanks for reaching out!', lastMessageTime: 'Mon', unreadCount: 0, messages: [{ id: 'm-5', senderId: 'northside', content: 'Thanks for reaching out to Northside Shelter.', sentAt: 'Mon', reactions: [] }] },
]

// Requests start empty until the backend request endpoint is connected.
const initialRequests: MessageRequest[] = []

export function MessagesPage() {
  const [conversations, setConversations] = useState(initialConversations)
  const [messageRequests, setMessageRequests] = useState(initialRequests)
  const [activeConversationId, setActiveConversationId] = useState(initialConversations[0].id)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0]

  function updateActiveConversation(updateConversation: (conversation: Conversation) => Conversation) {
    // Centralize local conversation updates until message mutations use the API.
    setConversations((currentConversations) => currentConversations.map((conversation) => conversation.id === activeConversationId ? updateConversation(conversation) : conversation))
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

  function handleRequestAction(requestId: string, action: 'accept' | 'decline') {
    setMessageRequests((requests) => requests.filter((request) => request.id !== requestId))
    if (action === 'accept') console.info(`Accepted message request: ${requestId}`)
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
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20" aria-label="Open profile">U</button>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,81,75,0.25)] lg:flex">
          <ConversationSidebar conversations={conversations} activeConversationId={activeConversationId} messageRequests={messageRequests} onConversationSelect={setActiveConversationId} onRequestAction={handleRequestAction} />
          <ChatWindow conversation={activeConversation} currentUserId={currentUserId} onSendMessage={sendMessage} onEditMessage={editMessage} onDeleteMessage={deleteMessage} onToggleReaction={toggleReaction} />
        </div>
      </div>
    </main>
  )
}
