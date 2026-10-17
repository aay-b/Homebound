import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BlockParticipantDialog } from '@/components/messages/BlockParticipantDialog'
import type { Conversation, Message } from '@/types/messages'

type SendMessageResult = {
  ok: boolean
  error?: string
}

type EditMessageResult = {
  ok: boolean
  error?: string
}

type ChatWindowProps = {
  conversation?: Conversation
  currentUserId: string
  onSendMessage: (content: string) => Promise<SendMessageResult>
  onEditMessage: (messageId: string, content: string) => Promise<EditMessageResult>
  onDeleteMessage: (messageId: string) => void
  onToggleReaction: (messageId: string, emoji: string) => void
  // The parent will connect this callback to the block API when it is available.
  onBlockParticipant?: (participantId: string) => Promise<SendMessageResult>
}

// These are the six reaction options available in the current messaging UI.
const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function ChatWindow({ conversation, currentUserId, onSendMessage, onEditMessage, onDeleteMessage, onToggleReaction, onBlockParticipant }: ChatWindowProps) {
  const [draft, setDraft] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editError, setEditError] = useState('')
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [messageIdPendingDeletion, setMessageIdPendingDeletion] = useState<string | null>(null)
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [dismissedReactionPickerId, setDismissedReactionPickerId] = useState<string | null>(null)
  const [reactionDetailsMessageId, setReactionDetailsMessageId] = useState<string | null>(null)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [isBlockingParticipant, setIsBlockingParticipant] = useState(false)
  const [blockError, setBlockError] = useState('')
  // Temporary frontend state, scoped to the signed-in user and participant until the block API is connected.
  const [blockedParticipants, setBlockedParticipants] = useState<Set<string>>(() => new Set())
  const participantKey = conversation ? `${currentUserId}:${conversation.participantId}` : ''
  const isParticipantBlocked = blockedParticipants.has(participantKey)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const isSendingRef = useRef(false)
  const isEditingRef = useRef(false)

  useEffect(() => {
    // Scroll only the message pane so receiving a message never moves the entire page.
    const messagesContainer = messagesContainerRef.current
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
  }, [conversation?.id, conversation?.messages.length])

  useEffect(() => {
    setIsActionsMenuOpen(false)
    setIsBlockDialogOpen(false)
    setBlockError('')
  }, [currentUserId, conversation?.id])

  if (!conversation) {
    return <section className="h-[calc(100vh-9rem)] min-h-[640px] max-h-[760px] flex-1 bg-[#fffdf9]" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Send remains clickable by design; blank drafts simply do not create a message.
    if (!draft.trim() || isSendingRef.current || isParticipantBlocked) return

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
    setEditError('')
  }

  async function saveEditing() {
    if (!editingMessageId || !editingContent.trim() || isEditingRef.current) return

    // Block repeated Enter presses before React state can disable the Save button.
    isEditingRef.current = true
    setIsEditingMessage(true)
    setEditError('')

    try {
      const result = await onEditMessage(editingMessageId, editingContent.trim())
      if (result.ok) {
        setEditingMessageId(null)
      } else {
        setEditError(result.error ?? 'Message was not edited. Please try again.')
      }
    } catch {
      setEditError('Message was not edited. Please try again.')
    } finally {
      isEditingRef.current = false
      setIsEditingMessage(false)
    }
  }

  async function handleBlockParticipant() {
    if (!conversation || isBlockingParticipant || isSendingRef.current || isParticipantBlocked) return

    setIsBlockingParticipant(true)
    setBlockError('')

    try {
      const result = onBlockParticipant ? await onBlockParticipant(conversation.participantId) : { ok: true }
      if (result.ok) {
        setBlockedParticipants((current) => new Set([...current, participantKey]))
        setDraft('')
        setSendError('')
        setIsBlockDialogOpen(false)
      } else {
        setBlockError(result.error ?? 'Unable to block this user. Please try again.')
      }
    } catch {
      setBlockError('Unable to block this user. Please try again.')
    } finally {
      setIsBlockingParticipant(false)
    }
  }

  return (
    <section className="flex h-[calc(100vh-9rem)] min-h-[640px] max-h-[760px] flex-1 flex-col bg-[#fffdf9]">
      <header className="border-b border-[#757A5E]/15 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#FABF6B]/40 text-sm font-bold text-[#344336]">{conversation.participantInitials}</div>
            <div>
              <h2 className="font-bold text-slate-900">{conversation.participantName}</h2>
            </div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setIsActionsMenuOpen((isOpen) => !isOpen)} className="grid h-10 w-10 place-items-center rounded-full text-xl font-bold text-[#344336] transition hover:bg-[#FABF6B]/20" aria-label={`Conversation actions for ${conversation.participantName}`} aria-expanded={isActionsMenuOpen}>⋮</button>
            {isActionsMenuOpen && (
              <div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button type="button" disabled={isParticipantBlocked || isSending} onClick={() => { setIsActionsMenuOpen(false); setBlockError(''); setIsBlockDialogOpen(true) }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#C44B3B] transition hover:bg-[#D15A4A]/10 disabled:cursor-not-allowed disabled:opacity-50">{isParticipantBlocked ? 'Blocked' : 'Block user'}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto px-5 pb-6 pt-10 sm:px-7">
        {conversation.messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId
          const isEditing = editingMessageId === message.id
          return (
            <div key={message.id} className={`flex gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {!isOwnMessage && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FABF6B]/40 text-[10px] font-bold text-[#344336]">{conversation.participantInitials}</div>}
              <div className={`group/action relative w-fit min-w-0 max-w-[78%] sm:max-w-[360px] ${message.reactions.length > 0 ? 'pb-7' : ''} ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div onMouseLeave={() => setDismissedReactionPickerId(null)} className={`group/message relative w-fit max-w-full rounded-2xl px-4 py-3 shadow-sm ${isOwnMessage ? 'rounded-br-md bg-[#757A5E] text-white' : 'rounded-bl-md bg-white text-[#344336] ring-1 ring-[#757A5E]/15'}`}>
                  {isEditing ? (
                    <div className="min-w-[220px]">
                      <input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEditing(); if (event.key === 'Escape') setEditingMessageId(null) }} autoFocus disabled={isEditingMessage} className="w-full rounded bg-white/20 px-2 py-1 text-sm outline-none ring-1 ring-white/50 disabled:opacity-60" />
                      <div className="mt-2 flex gap-2 text-xs font-semibold">
                        <button disabled={isEditingMessage} onClick={saveEditing} className="disabled:opacity-60">Save</button>
                        <button disabled={isEditingMessage} onClick={() => { setEditingMessageId(null); setEditError('') }} className="opacity-70 disabled:opacity-40">Cancel</button>
                      </div>
                      {editError && <p className="mt-2 text-xs text-[#D7885C]" role="alert">{editError}</p>}
                    </div>
                  ) : (
                    <>
                      <p className="break-words [overflow-wrap:anywhere] text-sm leading-6">{message.content}</p>
                      <time dateTime={message.createdAt} className={`mt-1 block text-[10px] ${isOwnMessage ? 'text-right text-white/65' : 'text-left text-slate-400'}`}>{message.sentAt}</time>
                    </>
                  )}
                  {/* The transparent bridge preserves hover while the pointer crosses the visual gap. */}
                  <div className={`absolute bottom-full z-10 mb-2 w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg after:absolute after:-bottom-2 after:left-0 after:h-2 after:w-full after:content-[''] ${isOwnMessage ? 'right-0' : 'left-0'} ${dismissedReactionPickerId === message.id ? 'hidden' : 'hidden group-hover/message:flex'}`} aria-label="Choose a reaction">
                    {reactionOptions.map((emoji) => {
                      const isSelected = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser)
                      return <button key={emoji} type="button" aria-pressed={isSelected} onClick={() => { onToggleReaction(message.id, emoji); setDismissedReactionPickerId(message.id) }} className={`grid h-7 w-7 place-items-center rounded-lg text-sm transition hover:bg-[#FABF6B]/25 ${isSelected ? 'bg-[#FABF6B]/45 ring-1 ring-[#D7885C]' : ''}`}>{emoji}</button>
                    })}
                  </div>
                </div>
                <div className={`mt-1 flex items-center gap-2 text-[11px] text-slate-400 ${isOwnMessage ? 'justify-end' : ''}`}>
                  {message.edited && <span className="group-hover/action:hidden">Edited</span>}
                  {isOwnMessage && !isEditing && (
                    <span className="hidden gap-2 group-hover/action:flex">
                      <button onClick={() => startEditing(message)} className="hover:text-teal-700">Edit</button>
                        <button onClick={() => setMessageIdPendingDeletion(message.id)} className="hover:text-[#D7885C]">Delete</button>
                    </span>
                  )}
                </div>
                {message.reactions.length > 0 && (
                  <button type="button" onClick={() => setReactionDetailsMessageId((currentMessageId) => currentMessageId === message.id ? null : message.id)} aria-expanded={reactionDetailsMessageId === message.id} className={`absolute bottom-0 flex items-center gap-2 rounded-full border border-[#757A5E]/25 bg-white px-2 py-0.5 text-xs transition hover:bg-[#FABF6B]/15 ${isOwnMessage ? 'right-0' : 'left-0'}`}>
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

      {isParticipantBlocked ? (
        <div className="border-t border-[#757A5E]/15 bg-[#f7f3eb] px-5 py-6 text-center text-sm font-medium text-slate-600" role="status">
          You cannot send messages to this person.
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="border-t border-[#757A5E]/15 bg-white p-4 sm:px-7 sm:py-5">
        <div className="flex items-end gap-3">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} readOnly={isSending} rows={1} className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-[#757A5E]/25 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#757A5E] focus:ring-4 focus:ring-[#FABF6B]/20" placeholder="Write a message..." />
          <button type="submit" disabled={isSending} className="h-11 rounded-xl bg-[#757A5E] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#344336] disabled:cursor-not-allowed disabled:bg-[#757A5E]/60">{isSending ? 'Sending...' : 'Send'}</button>
        </div>
        {sendError && <p className="mt-2 text-xs text-rose-600" role="alert">{sendError}</p>}
      </form>
      )}

      {messageIdPendingDeletion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#344336]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
          <div className="w-full max-w-sm rounded-2xl bg-[#fffdf9] p-6 shadow-xl">
            <h3 id="delete-message-title" className="text-lg font-bold text-[#344336]">Delete message?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">This message and its reactions will be deleted.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMessageIdPendingDeletion(null)} className="rounded-lg border border-[#757A5E]/30 px-4 py-2 text-sm font-semibold text-[#344336] transition hover:bg-[#FABF6B]/15">Cancel</button>
              <button type="button" onClick={() => { onDeleteMessage(messageIdPendingDeletion); setMessageIdPendingDeletion(null) }} className="rounded-lg bg-[#D7885C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344336]">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isBlockDialogOpen && (
        <BlockParticipantDialog participantName={conversation.participantName} isSubmitting={isBlockingParticipant} error={blockError} onCancel={() => { if (!isBlockingParticipant) { setIsBlockDialogOpen(false); setBlockError('') } }} onConfirm={handleBlockParticipant} />
      )}
    </section>
  )
}
