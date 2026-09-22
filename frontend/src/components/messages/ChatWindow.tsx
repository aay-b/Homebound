import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Conversation, Message } from '@/types/messages'

type SendMessageResult = {
  ok: boolean
  error?: string
}

type ChatWindowProps = {
  conversation?: Conversation
  currentUserId: string
  onSendMessage: (content: string) => Promise<SendMessageResult>
  onEditMessage: (messageId: string, content: string) => void
  onDeleteMessage: (messageId: string) => void
  onToggleReaction: (messageId: string, emoji: string) => void
}

// These are the six reaction options available in the current messaging UI.
const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function ChatWindow({ conversation, currentUserId, onSendMessage, onEditMessage, onDeleteMessage, onToggleReaction }: ChatWindowProps) {
  const [draft, setDraft] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [dismissedReactionPickerId, setDismissedReactionPickerId] = useState<string | null>(null)
  const [reactionDetailsMessageId, setReactionDetailsMessageId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const isSendingRef = useRef(false)

  useEffect(() => {
    // Scroll only the message pane so receiving a message never moves the entire page.
    const messagesContainer = messagesContainerRef.current
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
  }, [conversation?.id, conversation?.messages.length])

  if (!conversation) {
    return <section className="h-[640px] flex-1 bg-[#fcfdfd]" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Send remains clickable by design; blank drafts simply do not create a message.
    if (!draft.trim() || isSendingRef.current) return

    // State updates are asynchronous, so this ref blocks rapid repeated Enter submissions immediately.
    isSendingRef.current = true
    setIsSending(true)
    setSendError('')

    try {
      const result = await onSendMessage(draft.trim())
      if (result.ok) {
        // Clear only after the server confirms that the message was persisted.
        setDraft('')
      } else {
        setSendError(result.error ?? 'Message was not sent. Please try again.')
      }
    } catch {
      setSendError('Message was not sent. Please try again.')
    } finally {
      isSendingRef.current = false
      setIsSending(false)
    }
  }

  function startEditing(message: Message) {
    setEditingMessageId(message.id)
    setEditingContent(message.content)
  }

  function saveEditing() {
    if (!editingMessageId || !editingContent.trim()) return
    onEditMessage(editingMessageId, editingContent.trim())
    setEditingMessageId(null)
  }

  return (
    <section className="flex h-[640px] flex-1 flex-col bg-[#fcfdfd]">
      <header className="border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{conversation.participantInitials}</div>
          <div>
            <h2 className="font-bold text-slate-900">{conversation.participantName}</h2>
          </div>
        </div>
      </header>

      <div ref={messagesContainerRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
        {conversation.messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId
          const isEditing = editingMessageId === message.id
          return (
            <div key={message.id} className={`group/action flex gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {!isOwnMessage && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">{conversation.participantInitials}</div>}
              <div className={`relative w-fit min-w-0 max-w-[78%] pb-7 sm:max-w-[360px] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div onMouseLeave={() => setDismissedReactionPickerId(null)} className={`group/message relative w-fit max-w-full rounded-2xl px-4 py-3 shadow-sm ${isOwnMessage ? 'rounded-br-md bg-teal-700 text-white' : 'rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-100'}`}>
                  {isEditing ? (
                    <div className="min-w-[220px]">
                      <input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEditing(); if (event.key === 'Escape') setEditingMessageId(null) }} autoFocus className="w-full rounded bg-white/20 px-2 py-1 text-sm outline-none ring-1 ring-white/50" />
                      <div className="mt-2 flex gap-2 text-xs font-semibold">
                        <button onClick={saveEditing}>Save</button>
                        <button onClick={() => setEditingMessageId(null)} className="opacity-70">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="break-words [overflow-wrap:anywhere] text-sm leading-6">{message.content}</p>
                      <time dateTime={message.createdAt} className={`mt-1 block text-right text-[10px] ${isOwnMessage ? 'text-white/65' : 'text-slate-400'}`}>{message.sentAt}</time>
                    </>
                  )}
                  <div className={`absolute bottom-full z-10 w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ${isOwnMessage ? 'right-0' : 'left-0'} ${dismissedReactionPickerId === message.id ? 'hidden' : 'hidden group-hover/message:flex'}`} aria-label="Choose a reaction">
                    {reactionOptions.map((emoji) => {
                      const isSelected = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser)
                      return <button key={emoji} type="button" aria-pressed={isSelected} onClick={() => { onToggleReaction(message.id, emoji); setDismissedReactionPickerId(message.id) }} className={`grid h-7 w-7 place-items-center rounded-lg text-sm transition hover:bg-teal-50 ${isSelected ? 'bg-teal-100 ring-1 ring-teal-300' : ''}`}>{emoji}</button>
                    })}
                  </div>
                </div>
                <div className={`mt-1 flex items-center gap-2 text-[11px] text-slate-400 ${isOwnMessage ? 'justify-end' : ''}`}>
                  {message.edited && <span>Edited</span>}
                  {isOwnMessage && !isEditing && (
                    <span className="hidden gap-2 group-hover/action:flex">
                      <button onClick={() => startEditing(message)} className="hover:text-teal-700">Edit</button>
                      <button onClick={() => onDeleteMessage(message.id)} className="hover:text-rose-600">Delete</button>
                    </span>
                  )}
                </div>
                {message.reactions.length > 0 && (
                  <button type="button" onClick={() => setReactionDetailsMessageId((currentMessageId) => currentMessageId === message.id ? null : message.id)} aria-expanded={reactionDetailsMessageId === message.id} className={`absolute bottom-0 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs transition hover:bg-teal-50 ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                    {message.reactions.map((reaction) => <span key={reaction.emoji} className="inline-flex items-center gap-1 whitespace-nowrap"><span>{reaction.emoji}</span><span>{reaction.count}</span></span>)}
                  </button>
                )}
                {reactionDetailsMessageId === message.id && (
                  <div className={`absolute bottom-8 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                    {message.reactions.flatMap((reaction) => reaction.reactors.map((reactor) => (
                      <p key={`${reaction.emoji}-${reactor.id}`} className="flex items-center gap-2 px-1 py-1 text-xs text-slate-700"><span>{reaction.emoji}</span><span>{reactor.name}</span></p>
                    )))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-4 sm:px-7 sm:py-5">
        <div className="flex items-end gap-3">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} readOnly={isSending} rows={1} className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-50" placeholder="Write a message..." />
          <button type="submit" disabled={isSending} className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-500">{isSending ? 'Sending...' : 'Send'}</button>
        </div>
        {sendError && <p className="mt-2 text-xs text-rose-600" role="alert">{sendError}</p>}
      </form>
    </section>
  )
}
