import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getConversationMessageImage } from '@/services/messages'
import type { MessageImageSource } from '@/types/messages'

type MessageImageProps = { conversationId: string; messageId: string; currentUserId: string; initialImage?: MessageImageSource | null }

export function MessageImage({ conversationId, messageId, currentUserId, initialImage }: MessageImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const imageElementRef = useRef<HTMLImageElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [image, setImage] = useState<MessageImageSource | null>(() => initialImage && Date.parse(initialImage.expiresAt) > Date.now() + 60_000 ? initialImage : null)
  const [loadedUrl, setLoadedUrl] = useState('')
  const [failedUrl, setFailedUrl] = useState('')
  const [error, setError] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [reload, setReload] = useState(0)
  const isImageReady = Boolean(image && loadedUrl === image.url)
  const isImageFailed = Boolean(image && failedUrl === image.url)

  useLayoutEffect(() => {
    // A cached bitmap should display before painting, without flashing the loading placeholder.
    if (image && imageElementRef.current?.complete && imageElementRef.current.naturalWidth > 0) setLoadedUrl(image.url)
  }, [image?.url])

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
    if (!reload && initialImage && Date.parse(initialImage.expiresAt) > Date.now() + 60_000) {
      setImage(initialImage)
      setError('')
      setIsFetching(false)
      return
    }
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
  }, [conversationId, messageId, currentUserId, isVisible, reload, initialImage?.url, initialImage?.expiresAt])

  useEffect(() => {
    if (!image) return
    // Refresh while this message remains mounted so an hour-old chat does not show broken images.
    const timeout = window.setTimeout(() => setReload((value) => value + 1), Math.max(1000, Date.parse(image.expiresAt) - Date.now() - 60_000))
    return () => window.clearTimeout(timeout)
  }, [image])

  function openImage() {
    if (!image) return
    if (Date.parse(image.expiresAt) <= Date.now()) { setReload((value) => value + 1); return }
    setIsViewerOpen(true)
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
          {!isImageReady && <span role="status" className="absolute inset-0 bg-[#757A5E]/10 motion-safe:animate-pulse"><span className="sr-only">Loading image...</span></span>}
          {image && <img ref={imageElementRef} src={image.url} alt="Image shared in this conversation" loading="lazy" decoding="async" onLoad={() => setLoadedUrl(image.url)} onError={() => setFailedUrl(image.url)} className={`h-full w-full object-contain ${isImageReady ? '' : 'opacity-0'}`} />}
        </button>
      )}
      <dialog ref={dialogRef} aria-label="Image viewer" onClose={() => setIsViewerOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-auto rounded-2xl bg-[#fffdf9] p-4 text-stone-900 shadow-2xl backdrop:bg-stone-900/70">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Image</h3>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close image" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-stone-100">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {image && isViewerOpen && (isImageFailed ? (
          <p className="py-10 text-center text-sm text-slate-600">This image format cannot be previewed.</p>
        ) : (
          <img src={image.url} alt="Full-size image shared in this conversation" onError={() => setFailedUrl(image.url)} className="mx-auto max-h-[70dvh] max-w-full object-contain" />
        ))}
      </dialog>
    </div>
  )
}
