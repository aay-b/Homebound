import { useEffect, useRef, useState } from 'react'
import type { BlockedUser } from '@/types/messages'
import { UserAvatar } from '@/components/messages/UserAvatar'
import { formatMessageTime } from '@/utils/messageTime'

const blockedDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit', day: '2-digit', year: 'numeric',
})

type BlockedUsersDialogProps = {
  users: BlockedUser[]
  isLoading: boolean
  error: string
  onClose: () => void
  onRefresh: () => void
  onUnblock: (participantId: string) => Promise<{ ok: boolean; error?: string }>
}

export function BlockedUsersDialog({ users, isLoading, error, onClose, onRefresh, onUnblock }: BlockedUsersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const submittingRef = useRef(false)
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unblockError, setUnblockError] = useState('')

  useEffect(() => {
    // A native modal keeps keyboard focus inside the dialog and restores it when closed.
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    if (selectedUser && !isSubmitting && !users.some((user) => user.id === selectedUser.id)) {
      setSelectedUser(null)
      setUnblockError('')
    }
  }, [users, selectedUser, isSubmitting])

  async function confirmUnblock() {
    if (!selectedUser || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setUnblockError('')
    try {
      const result = await onUnblock(selectedUser.id)
      if (result.ok) setSelectedUser(null)
      else setUnblockError(result.error ?? 'Unable to unblock this user. Please try again.')
    } catch {
      setUnblockError('Unable to unblock this user. Please try again.')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="blocked-users-title" onCancel={(event) => { if (submittingRef.current) event.preventDefault() }} onClose={onClose} className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#757A5E]/20 bg-[#fffdf9] p-0 text-[#344336] shadow-xl backdrop:bg-[#344336]/45">
      <div className="flex items-center justify-between gap-3 border-b border-[#757A5E]/15 px-6 py-5">
        <h2 id="blocked-users-title" className="text-lg font-bold">{selectedUser ? `Unblock ${selectedUser.name.trim()}?` : 'Blocked users'}</h2>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close blocked users" className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-[#757A5E]/10 disabled:opacity-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {selectedUser ? (
        <div className="p-6">
          <p className="text-sm leading-6 text-slate-600">This person will be removed from your blocked list.</p>
          {unblockError && <p role="alert" className="mt-3 text-sm text-[#C44B3B]">{unblockError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={isSubmitting} onClick={() => { setSelectedUser(null); setUnblockError('') }} className="rounded-lg border border-[#757A5E]/30 px-4 py-2 text-sm font-semibold transition hover:bg-[#FABF6B]/15 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={confirmUnblock} className="rounded-lg bg-[#757A5E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344336] disabled:opacity-50">{isSubmitting ? 'Unblocking...' : 'Unblock'}</button>
          </div>
        </div>
      ) : (
        <div className="p-6" aria-busy={isLoading}>
          {isLoading ? <p role="status" className="py-5 text-center text-sm text-slate-500">Loading blocked users...</p>
            : error ? <div className="space-y-3 text-center"><p role="alert" className="text-sm text-[#C44B3B]">{error}</p><button type="button" onClick={onRefresh} className="text-sm font-semibold underline underline-offset-4">Try again</button></div>
              : users.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">Your blocked list is empty.</p>
                : <ul className="space-y-4" aria-label="People you have blocked">
                  {users.map((user) => (
                    <li key={user.id} className="flex items-center gap-3">
                      <UserAvatar userId={user.id} name={user.name} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{user.name}</p>
                        <time dateTime={user.blockedAt} className="mt-1 block text-[11px] leading-5 text-slate-500">
                          Blocked on {blockedDateFormatter.format(new Date(user.blockedAt))} at {formatMessageTime(user.blockedAt)}
                        </time>
                      </div>
                      <button type="button" onClick={() => { setSelectedUser(user); setUnblockError('') }} aria-label={`Unblock ${user.name}`} className="shrink-0 rounded-lg border border-[#757A5E]/30 px-3 py-2 text-xs font-semibold transition hover:bg-[#757A5E]/10">Unblock</button>
                    </li>
                  ))}
                </ul>}
        </div>
      )}
    </dialog>
  )
}
