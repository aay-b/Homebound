import type { Conversation, MessageRequest } from '@/types/messages'

type ConversationSidebarProps = {
  conversations: Conversation[]
  activeConversationId: string
  messageRequests: MessageRequest[]
  onConversationSelect: (conversationId: string) => void
  onRequestAction: (requestId: string, action: 'accept' | 'decline') => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  messageRequests,
  onConversationSelect,
  onRequestAction,
}: ConversationSidebarProps) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:w-[320px] lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-100 px-5 py-4">
        {/* Results will be loaded from the user search API during the next frontend step. */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-500 focus-within:bg-white">
          <span aria-hidden="true">⌕</span>
          <input className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="Search people" />
        </label>
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
