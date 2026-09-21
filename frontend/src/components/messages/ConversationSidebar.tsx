import { useEffect, useState } from 'react'
import { searchPeople } from '@/services/users'
import type { Conversation, MessageRequest, SearchPerson } from '@/types/messages'

type ConversationSidebarProps = {
  currentUserId: string
  conversations: Conversation[]
  activeConversationId: string | null
  messageRequests: MessageRequest[]
  onConversationSelect: (conversationId: string) => void
  onRequestAction: (requestId: string, action: 'accept' | 'decline') => void
}

export function ConversationSidebar({
  currentUserId,
  conversations,
  activeConversationId,
  messageRequests,
  onConversationSelect,
  onRequestAction,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchPerson[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

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

  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:w-[320px] lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-100 px-5 py-4">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-500 focus-within:bg-white">
          <span aria-hidden="true">⌕</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="Search people" />
        </label>
        {searchQuery.trim() && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {isSearching && <p className="px-2 py-1 text-xs text-slate-500">Searching...</p>}
            {searchError && <p className="px-2 py-1 text-xs text-rose-600">{searchError}</p>}
            {!isSearching && !searchError && searchResults.length === 0 && <p className="px-2 py-1 text-xs text-slate-500">No matching people found.</p>}
            {!isSearching && !searchError && searchResults.length > 0 && (
              <ul className="space-y-1" aria-label="People matching your search">
                {searchResults.map((person) => (
                  <li key={person.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{person.name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{person.name}</p>
                      <p className="text-xs text-slate-500">{person.role === 'shelter_staff' ? 'Shelter staff' : 'User'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {messageRequests.length > 0 && (
        <section className="border-b border-slate-100 px-4 py-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800">Message requests</h2>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white">{messageRequests.length}</span>
          </div>
          <div className="space-y-2">
            {messageRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">{request.initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{request.name}</p>
                    <p className="truncate text-xs text-slate-500">{request.note}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => onRequestAction(request.id, 'accept')} className="rounded-lg bg-teal-700 px-2 py-2 text-xs font-bold text-white transition hover:bg-teal-800">Accept</button>
                  <button onClick={() => onRequestAction(request.id, 'decline')} className="rounded-lg bg-rose-50 px-2 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100">Decline</button>
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
              <button key={conversation.id} onClick={() => onConversationSelect(conversation.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${isActive ? 'bg-teal-50 ring-1 ring-inset ring-teal-200' : 'hover:bg-slate-50'}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${isActive ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{conversation.participantInitials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-800">{conversation.participantName}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
