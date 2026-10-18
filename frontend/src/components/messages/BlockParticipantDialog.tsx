type BlockParticipantDialogProps = {
  participantName: string
  isSubmitting?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

// Kept independent from the API so the same confirmation UI can be reused from a chat or blocked-list page.
export function BlockParticipantDialog({ participantName, isSubmitting = false, error, onCancel, onConfirm }: BlockParticipantDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#344336]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="block-participant-title">
      <div className="w-full max-w-sm rounded-2xl bg-[#fffdf9] p-6 shadow-xl">
        <h3 id="block-participant-title" className="text-lg font-bold text-[#344336]">Block {participantName.trim()}?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">You will no longer be able to send messages.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={isSubmitting} onClick={onCancel} className="rounded-lg border border-[#757A5E]/30 px-4 py-2 text-sm font-semibold text-[#344336] transition hover:bg-[#FABF6B]/15 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={isSubmitting} onClick={onConfirm} className="rounded-lg bg-[#D15A4A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A74337] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Blocking...' : 'Block'}</button>
        </div>
        {error && <p className="mt-3 text-xs text-[#D15A4A]" role="alert">{error}</p>}
      </div>
    </div>
  )
}
