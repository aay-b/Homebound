import { useEffect, useState } from 'react'

export function ImageAttachmentPreview({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [failedUrl, setFailedUrl] = useState('')
  const url = preview?.file === file ? preview.url : ''

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setPreview({ file, url: objectUrl })
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#757A5E]/20 bg-[#f7f3eb] p-3">
      <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#757A5E]/10">
        {url && failedUrl !== url ? (
          <img src={url} alt="Selected image preview" onError={() => setFailedUrl(url)} className="h-full w-full object-contain" />
        ) : (
          <svg aria-hidden="true" className="h-7 w-7 text-[#757A5E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#344336]" title={file.name}>{file.name}</p>
        {url && failedUrl === url && <p className="mt-1 text-xs text-slate-500">Preview is not available for this image format.</p>}
      </div>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove selected image" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#344336] transition hover:bg-[#757A5E]/15 disabled:opacity-50">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
  )
}
