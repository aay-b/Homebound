import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BlockParticipantDialog } from '@/components/messages/BlockParticipantDialog'
import { ImageAttachmentPreview } from '@/components/messages/ImageAttachmentPreview'
import { MessageImage } from '@/components/messages/MessageImage'
import { UserAvatar } from '@/components/messages/UserAvatar'
import type { Conversation, Message } from '@/types/messages'
import { formatMessageTime } from '@/utils/messageTime'

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
  onSendImage: (file: File, signal: AbortSignal) => Promise<SendMessageResult>
  onEditMessage: (messageId: string, content: string) => Promise<EditMessageResult>
  onDeleteMessage: (messageId: string) => Promise<SendMessageResult>
  onToggleReaction: (messageId: string, emoji: string) => void
  onBlockParticipant: (participantId: string) => Promise<SendMessageResult>
  isHistoryLoading: boolean
  historyError: string
  onRetryHistory: () => void
}

// These are the six reaction options available in the current messaging UI.
const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function ChatWindow({ conversation, currentUserId, onSendMessage, onSendImage, onEditMessage, onDeleteMessage, onToggleReaction, onBlockParticipant, isHistoryLoading, historyError, onRetryHistory }: ChatWindowProps) {
  const [draft, setDraft] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editError, setEditError] = useState('')
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [messageIdPendingDeletion, setMessageIdPendingDeletion] = useState<string | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [dismissedReactionPickerId, setDismissedReactionPickerId] = useState<string | null>(null)
  const [reactionDetailsMessageId, setReactionDetailsMessageId] = useState<string | null>(null)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [isBlockingParticipant, setIsBlockingParticipant] = useState(false)
  const [blockError, setBlockError] = useState('')
  const isParticipantBlocked = conversation?.isBlocked ?? false
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const scrollStateRef = useRef<{ conversationId?: string; messageCount: number }>({ messageCount: 0 })
  const isSendingRef = useRef(false)
  const isEditingRef = useRef(false)
  const isDeletingRef = useRef(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageUploadControllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => imageUploadControllerRef.current?.abort(), [])

  useLayoutEffect(() => {
    // Open at the latest message before painting; animate only subsequent live messages.
    const messagesContainer = messagesContainerRef.current
    const isOpening = scrollStateRef.current.conversationId !== conversation?.id || scrollStateRef.current.messageCount === 0
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: isOpening ? 'auto' : 'smooth' })
    scrollStateRef.current = { conversationId: conversation?.id, messageCount: conversation?.messages.length ?? 0 }
  }, [conversation?.id, conversation?.messages.length, selectedImage])

  useEffect(() => {
    setIsActionsMenuOpen(false)
    setIsBlockDialogOpen(false)
    setBlockError('')
  }, [currentUserId, conversation?.id])

  useEffect(() => {
    if (!isParticipantBlocked) return
    imageUploadControllerRef.current?.abort()
    setSelectedImage(null)
    setDraft('')
    setSendError('')
    setIsActionsMenuOpen(false)
    setIsBlockDialogOpen(false)
    setEditingMessageId(null)
    setEditingContent('')
    setEditError('')
    setMessageIdPendingDeletion(null)
    setDeleteError('')
  }, [isParticipantBlocked])

  if (!conversation) {
    return <section className="min-h-0 min-w-0 flex-1 bg-[#fffdf9]" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedImage) { await submitImage(); return }
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

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || isSendingRef.current || isParticipantBlocked) return
    if (!file.type.toLowerCase().startsWith('image/') || file.size === 0) {
      setSendError('Please select a valid image.')
      return
    }
    setSelectedImage(file)
    setSendError('')
  }

  async function submitImage() {
    if (!selectedImage || isSendingRef.current || isParticipantBlocked) return
    const controller = new AbortController()
    imageUploadControllerRef.current = controller
    isSendingRef.current = true
    setIsSending(true)
    setSendError('')
    try {
      const result = await onSendImage(selectedImage, controller.signal)
      if (controller.signal.aborted) return
      if (result.ok) setSelectedImage(null)
      else setSendError(result.error ?? 'Image was not sent. Please try again.')
      // Keep any text draft untouched: an image is a separate message, not a caption.
    } catch {
      if (!controller.signal.aborted) setSendError('Image was not sent. Please try again.')
    } finally {
      if (imageUploadControllerRef.current === controller) {
        imageUploadControllerRef.current = null
        isSendingRef.current = false
        setIsSending(false)
      }
    }
  }

  function startEditing(message: Message) {
    if (isParticipantBlocked || message.imagePath) return
    setEditingMessageId(message.id)
    setEditingContent(message.content)
    setEditError('')
  }

  async function saveEditing() {
    if (!editingMessageId || !editingContent.trim() || isEditingRef.current || isParticipantBlocked) return

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
    if (!conversation || isBlockingParticipant || isSendingRef.current || isDeletingRef.current || isParticipantBlocked) return

    setIsBlockingParticipant(true)
    setBlockError('')

    try {
      const result = await onBlockParticipant(conversation.participantId)
      if (result.ok) {
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

  async function confirmMessageDeletion() {
    if (!messageIdPendingDeletion || isDeletingRef.current || isParticipantBlocked) return
    isDeletingRef.current = true
    setIsDeletingMessage(true)
    setDeleteError('')
    try {
      const result = await onDeleteMessage(messageIdPendingDeletion)
      if (result.ok) setMessageIdPendingDeletion(null)
      else setDeleteError(result.error ?? 'Unable to finish deleting the message. Please try again.')
    } catch {
      setDeleteError('Unable to finish deleting the message. Please try again.')
    } finally {
      isDeletingRef.current = false
      setIsDeletingMessage(false)
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fffdf9]">
      <header className="shrink-0 border-b border-[#757A5E]/15 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar userId={conversation.participantId} name={conversation.participantName} className="h-11 w-11" />
            <div>
              <h2 className="font-bold text-slate-900">{conversation.participantName}</h2>
            </div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setIsActionsMenuOpen((isOpen) => !isOpen)} className="grid h-10 w-10 place-items-center rounded-full text-xl font-bold text-[#344336] transition hover:bg-[#FABF6B]/20" aria-label={`Conversation actions for ${conversation.participantName}`} aria-expanded={isActionsMenuOpen}>⋮</button>
            {isActionsMenuOpen && (
              <div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button type="button" disabled={isParticipantBlocked || isSending || isDeletingMessage} onClick={() => { setIsActionsMenuOpen(false); setBlockError(''); setIsBlockDialogOpen(true) }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#C44B3B] transition hover:bg-[#D15A4A]/10 disabled:cursor-not-allowed disabled:opacity-50">{isParticipantBlocked ? 'Blocked' : 'Block user'}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-6 pt-10 sm:px-7">
        {isHistoryLoading && conversation.messages.length === 0 && (
          <div role="status" aria-label="Loading messages" className="space-y-4 motion-safe:animate-pulse">
            <span className="sr-only">Loading messages...</span>
            <div aria-hidden="true" className="h-14 w-44 max-w-[70%] rounded-2xl bg-[#757A5E]/10" />
            <div aria-hidden="true" className="ml-auto h-14 w-52 max-w-[70%] rounded-2xl bg-[#757A5E]/20" />
            <div aria-hidden="true" className="h-14 w-36 max-w-[70%] rounded-2xl bg-[#757A5E]/10" />
          </div>
        )}
        {historyError && (
          <div className="rounded-xl bg-[#D15A4A]/5 p-3 text-sm text-[#A74337]">
            <p role="alert">{historyError}</p>
            <button type="button" onClick={onRetryHistory} className="mt-2 font-semibold underline underline-offset-4">Try again</button>
          </div>
        )}
        {conversation.messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId
          const isEditing = !isParticipantBlocked && !message.imagePath && editingMessageId === message.id
          return (
            <div key={message.id} className={`flex gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {!isOwnMessage && <UserAvatar userId={conversation.participantId} name={conversation.participantName} className="mt-1 h-8 w-8" />}
              <div className={`group/action relative w-fit min-w-0 max-w-[78%] sm:max-w-[360px] ${message.reactions.length > 0 ? 'pb-7' : ''} ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div onMouseLeave={() => setDismissedReactionPickerId(null)} className={`group/message relative w-fit max-w-full rounded-2xl ${message.imagePath ? 'p-2' : 'px-4 py-3'} shadow-sm ${isOwnMessage ? 'rounded-br-md bg-[#757A5E] text-white' : 'rounded-bl-md bg-white text-[#344336] ring-1 ring-[#757A5E]/15'}`}>
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
                      {message.imagePath ? (
                        <MessageImage conversationId={conversation.id} messageId={message.id} currentUserId={currentUserId} initialImage={message.image} />
                      ) : (
                        <p className="break-words [overflow-wrap:anywhere] text-sm leading-6">{message.content}</p>
                      )}
                      <time dateTime={message.createdAt} className={`mt-1 block text-[10px] ${isOwnMessage ? 'text-right text-white/65' : 'text-left text-slate-400'}`}>{formatMessageTime(message.createdAt)}</time>
                    </>
                  )}
                  {/* The transparent bridge preserves hover while the pointer crosses the visual gap. */}
                  {!isParticipantBlocked && (
                  <div className={`absolute bottom-full z-10 mb-2 w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg after:absolute after:-bottom-2 after:left-0 after:h-2 after:w-full after:content-[''] ${isOwnMessage ? 'right-0' : 'left-0'} ${dismissedReactionPickerId === message.id ? 'hidden' : 'hidden group-hover/message:flex'}`} aria-label="Choose a reaction">
                    {reactionOptions.map((emoji) => {
                      const isSelected = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser)
                      return <button key={emoji} type="button" aria-pressed={isSelected} onClick={() => { onToggleReaction(message.id, emoji); setDismissedReactionPickerId(message.id) }} className={`grid h-7 w-7 place-items-center rounded-lg text-sm transition hover:bg-[#FABF6B]/25 ${isSelected ? 'bg-[#FABF6B]/45 ring-1 ring-[#D7885C]' : ''}`}>{emoji}</button>
                    })}
                  </div>
                  )}
                </div>
                <div className={`mt-1 flex items-center gap-2 text-[11px] text-slate-400 ${isOwnMessage ? 'justify-end' : ''}`}>
                  {message.edited && <span className="group-hover/action:hidden">Edited</span>}
                  {isOwnMessage && !isEditing && !isParticipantBlocked && (
                    <span className="hidden gap-2 group-hover/action:flex">
                      {!message.imagePath && <button onClick={() => startEditing(message)} className="hover:text-teal-700">Edit</button>}
                        <button onClick={() => { setDeleteError(''); setMessageIdPendingDeletion(message.id) }} className="hover:text-[#D7885C]">Delete</button>
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
        <div className="shrink-0 border-t border-[#757A5E]/15 bg-[#f7f3eb] px-5 py-6 text-center text-sm font-medium text-slate-600" role="status">
          You cannot send messages to this person.
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#757A5E]/15 bg-white p-4 sm:px-7 sm:py-5">
        {selectedImage && <ImageAttachmentPreview file={selectedImage} disabled={isSending} onRemove={() => { setSelectedImage(null); setSendError('') }} />}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={chooseImage} disabled={isSending} aria-label="Choose an image to send" className="hidden" />
        <div className="flex items-end gap-3">
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={isSending} aria-label="Choose image" title="Choose image" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#757A5E] transition hover:bg-[#FABF6B]/20 disabled:cursor-not-allowed disabled:opacity-50">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
          </button>
          {selectedImage ? <div role="status" className="flex min-h-11 min-w-0 flex-1 items-center px-1 text-sm text-slate-500">{isSending ? 'Sending image...' : 'Ready to send image'}</div> : (
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} readOnly={isSending} rows={1} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[#757A5E]/25 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#757A5E] focus:ring-4 focus:ring-[#FABF6B]/20" placeholder="Write a message..." />
          )}
          <button type="submit" disabled={isSending} className="h-11 shrink-0 rounded-xl bg-[#757A5E] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#344336] disabled:cursor-not-allowed disabled:bg-[#757A5E]/60">{isSending ? 'Sending...' : selectedImage ? 'Send image' : 'Send'}</button>
        </div>
        {sendError && <p className="mt-2 text-xs text-rose-600" role="alert">{sendError}</p>}
      </form>
      )}

      {messageIdPendingDeletion && !isParticipantBlocked && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#344336]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
          <div className="w-full max-w-sm rounded-2xl bg-[#fffdf9] p-6 shadow-xl">
            <h3 id="delete-message-title" className="text-lg font-bold text-[#344336]">Delete message?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">This message and its reactions will be deleted.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isDeletingMessage} onClick={() => setMessageIdPendingDeletion(null)} className="rounded-lg border border-[#757A5E]/30 px-4 py-2 text-sm font-semibold text-[#344336] transition hover:bg-[#FABF6B]/15 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isDeletingMessage} onClick={confirmMessageDeletion} className="rounded-lg bg-[#D7885C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344336] disabled:cursor-not-allowed disabled:opacity-50">{isDeletingMessage ? 'Deleting...' : 'Delete'}</button>
            </div>
            {deleteError && <p role="alert" className="mt-3 text-xs text-rose-600">{deleteError}</p>}
          </div>
        </div>
      )}

      {isBlockDialogOpen && (
        <BlockParticipantDialog participantName={conversation.participantName} isSubmitting={isBlockingParticipant} error={blockError} onCancel={() => { if (!isBlockingParticipant) { setIsBlockDialogOpen(false); setBlockError('') } }} onConfirm={handleBlockParticipant} />
      )}
    </section>
  )
}
