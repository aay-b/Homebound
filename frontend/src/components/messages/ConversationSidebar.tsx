import { useEffect, useState } from 'react'
import { sendMessageRequest } from '@/services/messageRequests'
import { searchPeople } from '@/services/users'
import type { Conversation, MessageRequest, SearchPerson } from '@/types/messages'

type ConversationSidebarProps = {
  currentUserId: string
  conversations: Conversation[]
  activeConversationId: string | null
  messageRequests: MessageRequest[]
  outgoingMessageRequests: MessageRequest[]
  onConversationSelect: (conversationId: string) => void
  onRequestAction: (requestId: string, action: 'accept' | 'decline') => void
  onCancelOutgoingRequest: (requestId: string) => void
  onOutgoingRequestCreated: (request: MessageRequest) => void
  onConversationDelete: (conversationId: string) => Promise<{ ok: boolean; error?: string }>
}

export function ConversationSidebar({
  currentUserId,
  conversations,
  activeConversationId,
  messageRequests,
  outgoingMessageRequests,
  onConversationSelect,
  onRequestAction,
  onCancelOutgoingRequest,
  onOutgoingRequestCreated,
  onConversationDelete,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchPerson[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestingRecipientId, setRequestingRecipientId] = useState<string | null>(null)
  const [sentRecipientIds, setSentRecipientIds] = useState<Set<string>>(() => new Set())
  const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null)
  const [conversationIdPendingDeletion, setConversationIdPendingDeletion] = useState<string | null>(null)
  const [conversationDeleteError, setConversationDeleteError] = useState('')
  const [isDeletingConversation, setIsDeletingConversation] = useState(false)
  const conversationPendingDeletion = conversations.find((conversation) => conversation.id === conversationIdPendingDeletion)

  useEffect(() => {
    // Close a conversation context menu when the user interacts anywhere else on the page.
    const closeContextMenu = () => setContextMenuConversationId(null)
    window.addEventListener('pointerdown', closeContextMenu)

    return () => window.removeEventListener('pointerdown', closeContextMenu)
  }, [])

  useEffect(() => {
    // This set only covers requests sent during the current page session.
    setRequestError('')
    setSentRecipientIds(new Set())
  }, [currentUserId])

  useEffect(() => {
    const query = searchQuery.trim()

    if (!query) {
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      setSearchError('')

      searchPeople(query, currentUserId, controller.signal)
        .then(setSearchResults)
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setSearchResults([])
          setSearchError(error instanceof Error ? error.message : 'Unable to search people.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false)
        })
    }, 300)

    // Cancel stale requests when the keyword or current user changes.
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [currentUserId, searchQuery])

  async function handleSendRequest(person: SearchPerson) {
    setRequestingRecipientId(person.id)
    setRequestError('')

    try {
      const requestId = await sendMessageRequest(currentUserId, person.id)
      // The API result is persisted; keep local search and the sent-request list in sync immediately.
      setSentRecipientIds((currentIds) => new Set([...currentIds, person.id]))
      onOutgoingRequestCreated({
        id: requestId,
        name: person.name,
        initials: person.name.split(' ').map((name) => name[0]).join('').slice(0, 2),
        note: person.role === 'shelter_staff' ? 'Shelter staff' : 'User',
      })
      // The new request is visible in the sent section, so close the completed search flow.
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to send the message request.')
    } finally {
      setRequestingRecipientId(null)
    }
  }

  async function handleConversationDeletion() {
    if (!conversationPendingDeletion || isDeletingConversation) return

    setIsDeletingConversation(true)
    setConversationDeleteError('')

    try {
      const result = await onConversationDelete(conversationPendingDeletion.id)
      if (result.ok) {
        setConversationIdPendingDeletion(null)
      } else {
        setConversationDeleteError(result.error ?? 'Unable to delete the conversation.')
      }
    } catch {
      setConversationDeleteError('Unable to delete the conversation.')
    } finally {
      setIsDeletingConversation(false)
    }
  }

  return (
    <aside className="w-full border-b border-[#757A5E]/20 bg-[#fffdf9] lg:w-[320px] lg:border-b-0 lg:border-r">
      <div className="border-b border-[#757A5E]/15 px-5 py-4">
        <label className="flex items-center gap-2 rounded-xl border border-[#757A5E]/25 bg-[#f7f3eb] px-3 py-2.5 focus-within:border-[#757A5E] focus-within:bg-white">
          <span aria-hidden="true">⌕</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="Search people" />
        </label>
        {searchQuery.trim() && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {isSearching && <p className="px-2 py-1 text-xs text-slate-500">Searching...</p>}
            {searchError && <p className="px-2 py-1 text-xs text-rose-600">{searchError}</p>}
            {requestError && <p className="px-2 py-1 text-xs text-rose-600">{requestError}</p>}
            {!isSearching && !searchError && searchResults.length === 0 && <p className="px-2 py-1 text-xs text-slate-500">No matching people found.</p>}
            {!isSearching && !searchError && searchResults.length > 0 && (
              <ul className="space-y-1" aria-label="People matching your search">
                {searchResults.map((person) => {
                  const hasPendingRequest = person.hasPendingRequest || sentRecipientIds.has(person.id)

                  return (
                    <li key={person.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FABF6B]/35 text-xs font-bold text-[#344336]">{person.name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{person.name}</p>
                        <p className="text-xs text-slate-500">{person.role === 'shelter_staff' ? 'Shelter staff' : 'User'}</p>
                      </div>
                      <button type="button" onClick={() => handleSendRequest(person)} disabled={requestingRecipientId === person.id || hasPendingRequest} className="shrink-0 rounded-md bg-[#757A5E] px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-[#344336] disabled:cursor-not-allowed disabled:bg-slate-300">
                        {requestingRecipientId === person.id ? 'Sending...' : hasPendingRequest ? 'Request sent' : 'Send request'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {messageRequests.length > 0 && (
        <section className="border-b border-slate-100 px-4 py-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800">Received requests</h2>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#D7885C] px-1 text-xs font-bold text-white">{messageRequests.length}</span>
          </div>
          <div className="space-y-2">
            {messageRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FABF6B]/35 text-xs font-bold text-[#344336]">{request.initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{request.name}</p>
                    <p className="truncate text-xs text-slate-500">{request.note}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => onRequestAction(request.id, 'accept')} className="rounded-lg bg-[#757A5E] px-2 py-2 text-xs font-bold text-white transition hover:bg-[#344336]">Accept</button>
                  <button onClick={() => onRequestAction(request.id, 'decline')} className="rounded-lg bg-[#D7885C]/15 px-2 py-2 text-xs font-bold text-[#A95F3D] transition hover:bg-[#D7885C]/25">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoingMessageRequests.length > 0 && (
        <section className="border-b border-slate-100 px-4 py-4">
          <h2 className="mb-3 px-1 text-sm font-bold text-slate-800">Requests you&apos;ve sent</h2>
          <div className="space-y-2">
            {outgoingMessageRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FABF6B]/25 text-xs font-bold text-[#344336]">{request.initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{request.name}</p>
                    <p className="truncate text-xs text-slate-500">Pending · {request.note}</p>
                  </div>
                  <button type="button" onClick={() => onCancelOutgoingRequest(request.id)} className="rounded-lg bg-[#D7885C]/15 px-2 py-1.5 text-xs font-bold text-[#A95F3D] transition hover:bg-[#D7885C]/25">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-slate-800">Conversations</h2>
        <div className="space-y-1.5">
          {conversations.length === 0 && <p className="px-1 py-2 text-sm text-slate-500">No conversations yet.</p>}
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId
            return (
              <div key={conversation.id} className="relative overflow-hidden rounded-xl">
                {contextMenuConversationId === conversation.id && (
                  <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { setConversationDeleteError(''); setConversationIdPendingDeletion(conversation.id); setContextMenuConversationId(null) }} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl bg-[#D7885C] text-white transition hover:bg-[#344336]" aria-label={`Delete conversation with ${conversation.participantName}`} title="Delete conversation">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                )}
                <button onClick={() => { onConversationSelect(conversation.id); setContextMenuConversationId(null) }} onContextMenu={(event) => { event.preventDefault(); setContextMenuConversationId(conversation.id) }} className={`relative z-10 flex items-center p-3 text-left transition-[width,gap] duration-200 ease-out ${contextMenuConversationId === conversation.id ? 'w-[calc(100%-3rem)] gap-2 rounded-l-xl' : 'w-full gap-3 rounded-xl'} ${isActive ? contextMenuConversationId === conversation.id ? 'bg-[#FABF6B]/20' : 'bg-[#FABF6B]/20 ring-1 ring-inset ring-[#FABF6B]/60' : 'bg-[#fffdf9] hover:bg-[#757A5E]/10'}`}>
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${isActive ? 'bg-[#757A5E] text-white' : 'bg-[#757A5E]/15 text-[#344336]'}`}>{conversation.participantInitials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{conversation.participantName}</p>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {conversationPendingDeletion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#344336]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-conversation-title">
          <div className="w-full max-w-sm rounded-2xl bg-[#fffdf9] p-6 shadow-xl">
            <h3 id="delete-conversation-title" className="text-lg font-bold text-[#344336]">Delete conversation?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your conversation with {conversationPendingDeletion.participantName} will be deleted.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isDeletingConversation} onClick={() => { setConversationIdPendingDeletion(null); setConversationDeleteError('') }} className="rounded-lg border border-[#757A5E]/30 px-4 py-2 text-sm font-semibold text-[#344336] transition hover:bg-[#FABF6B]/15 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isDeletingConversation} onClick={handleConversationDeletion} className="rounded-lg bg-[#D7885C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344336] disabled:opacity-50">{isDeletingConversation ? 'Deleting...' : 'Delete'}</button>
            </div>
            {conversationDeleteError && <p className="mt-3 text-xs text-[#D7885C]" role="alert">{conversationDeleteError}</p>}
          </div>
        </div>
      )}
    </aside>
  )
}
