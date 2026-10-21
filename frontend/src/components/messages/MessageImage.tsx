import { useEffect, useRef, useState } from 'react'
import { getConversationMessageImage } from '@/services/messages'

type MessageImageProps = { conversationId: string; messageId: string; currentUserId: string }

export function MessageImage({ conversationId, messageId, currentUserId }: MessageImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [image, setImage] = useState<{ url: string; expiresAt: string } | null>(null)
  const [loadedUrl, setLoadedUrl] = useState('')
  const [failedUrl, setFailedUrl] = useState('')
  const [error, setError] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [reload, setReload] = useState(0)
  const isImageReady = Boolean(image && loadedUrl === image.url)
  const isImageFailed = Boolean(image && failedUrl === image.url)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (!('IntersectionObserver' in window)) { setIsVisible(true); return }
    // Do not request signed links for every old image when a long conversation opens.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const controller = new AbortController()
    setIsFetching(true)
    setError('')
    getConversationMessageImage(conversationId, messageId, controller.signal, reload > 0)
      .then((result) => { if (!controller.signal.aborted) setImage(result) })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load the image.')
      })
      .finally(() => { if (!controller.signal.aborted) setIsFetching(false) })
    return () => controller.abort()
  }, [conversationId, messageId, currentUserId, isVisible, reload])

  useEffect(() => {
    if (!image) return
    // Refresh while this message remains mounted so an hour-old chat does not show broken images.
    const timeout = window.setTimeout(() => setReload((value) => value + 1), Math.max(1000, Date.parse(image.expiresAt) - Date.now() - 60_000))
    return () => window.clearTimeout(timeout)
  }, [image])

  function openImage() {
    if (!image) return
    if (Date.parse(image.expiresAt) <= Date.now()) { setReload((value) => value + 1); return }
    dialogRef.current?.showModal()
  }

  return (
    <div ref={containerRef} className="w-56 max-w-full">
      {(!isFetching && (error || isImageFailed)) ? (
        <div className="grid aspect-[4/3] place-content-center gap-2 rounded-xl bg-stone-100 px-4 text-center text-xs text-slate-600">
          <p role="alert">{error || 'This image could not be previewed.'}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold text-[#344336] underline underline-offset-4">Try again</button>
          {image && <button type="button" onClick={openImage} className="font-semibold text-[#344336] underline underline-offset-4">Open image</button>}
        </div>
      ) : (
        <button type="button" onClick={openImage} disabled={!isImageReady} aria-label="Open image" className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FABF6B]">
          {!isImageReady && <span role="status" className="absolute inset-0 grid place-items-center bg-[#757A5E]/10 text-xs text-[#344336] motion-safe:animate-pulse">Loading image...</span>}
          {image && <img src={image.url} alt="Image shared in this conversation" decoding="async" onLoad={() => setLoadedUrl(image.url)} onError={() => setFailedUrl(image.url)} className={`h-full w-full object-contain ${isImageReady ? '' : 'opacity-0'}`} />}
        </button>
      )}
      <dialog ref={dialogRef} aria-label="Image viewer" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-auto rounded-2xl bg-[#fffdf9] p-4 text-stone-900 shadow-2xl backdrop:bg-stone-900/70">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Image</h3>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close image" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-stone-100">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {image && (isImageFailed ? (
          <p className="py-10 text-center text-sm text-slate-600">This image format cannot be previewed. Open the original image to view or save it.</p>
        ) : (
          <img src={image.url} alt="Full-size image shared in this conversation" onError={() => setFailedUrl(image.url)} className="mx-auto max-h-[70dvh] max-w-full object-contain" />
        ))}
        {image && <a href={image.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-[#344336] underline underline-offset-4">Open original image</a>}
      </dialog>
    </div>
  )
}
