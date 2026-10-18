import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getMessagingAvatarUrls } from '@/services/users'

type AvatarContextValue = {
  urls: Record<string, string | null>
  register: (userId: string) => void
}

const AvatarContext = createContext<AvatarContextValue | null>(null)

type AvatarCache = Record<string, { url: string | null; expiresAt: number }>
const avatarLifetime = 45 * 60 * 1000

function readAvatarCache(key: string): AvatarCache {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).filter(([, entry]) => (
      entry && typeof entry === 'object'
      && (entry.url === null || (typeof entry.url === 'string' && /^https?:\/\//.test(entry.url)))
      && typeof entry.expiresAt === 'number' && entry.expiresAt > Date.now()
    )))
  } catch {
    return {}
  }
}

export function MessagingAvatarProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const cacheKey = `homebound:message-avatars:${accountId}`
  const [initialCache] = useState(() => readAvatarCache(cacheKey))
  const cacheRef = useRef<AvatarCache>(initialCache)
  const [userIds, setUserIds] = useState<string[]>([])
  const [urls, setUrls] = useState<Record<string, string | null>>(() => (
    Object.fromEntries(Object.entries(initialCache).map(([id, entry]) => [id, entry.url]))
  ))
  const refreshVersionRef = useRef(0)
  const register = useCallback((userId: string) => {
    setUserIds((current) => current.includes(userId) ? current : [...current, userId])
  }, [])

  useEffect(() => {
    if (userIds.length === 0) return
    const controller = new AbortController()
    async function refresh(force = false) {
      const requestedIds = force ? userIds : userIds.filter((id) => !(cacheRef.current[id]?.expiresAt > Date.now()))
      if (requestedIds.length === 0) return
      const version = ++refreshVersionRef.current
      try {
        // Batch shared pictures rather than issuing one request for every message bubble.
        const batches = []
        for (let index = 0; index < requestedIds.length; index += 100) batches.push(getMessagingAvatarUrls(requestedIds.slice(index, index + 100), controller.signal))
        const results = await Promise.all(batches)
        if (controller.signal.aborted || version !== refreshVersionRef.current) return
        const received: Record<string, string | null> = Object.assign({}, ...results)
        for (const id of requestedIds) {
          const url = received[id] ?? null
          received[id] = url
          cacheRef.current[id] = { url, expiresAt: Date.now() + (url ? avatarLifetime : 60 * 1000) }
        }
        setUrls((current) => ({ ...current, ...received }))
        // Keep signed URLs across reloads without sharing the cache between signed-in accounts.
        try {
          const currentEntries = Object.entries(cacheRef.current).filter(([, entry]) => entry.expiresAt > Date.now()).slice(-200)
          sessionStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(currentEntries)))
        } catch {
          // Pictures still work if browser storage is unavailable.
        }
      } catch {
        if (!controller.signal.aborted && version === refreshVersionRef.current) {
          // End the loading state on failure while retaining any picture already displayed.
          setUrls((current) => {
            const next = { ...current }
            for (const id of requestedIds) if (next[id] === undefined) next[id] = null
            return next
          })
        }
      }
    }
    void refresh()
    const handleFocus = () => { void refresh(true) }
    window.addEventListener('focus', handleFocus)
    // Renew signed URLs before they expire while a chat remains open.
    const timer = window.setInterval(handleFocus, 45 * 60 * 1000)
    return () => {
      controller.abort()
      window.removeEventListener('focus', handleFocus)
      window.clearInterval(timer)
    }
  }, [userIds, cacheKey])

  return <AvatarContext.Provider value={{ urls, register }}>{children}</AvatarContext.Provider>
}

export function UserAvatar({ userId, name, className = '' }: { userId: string; name: string; className?: string }) {
  const context = useContext(AvatarContext)
  const register = context?.register
  const url = context?.urls[userId]
  const [loadedImage, setLoadedImage] = useState<{ userId: string; url: string } | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  useEffect(() => { register?.(userId) }, [register, userId])

  useEffect(() => {
    if (!url) {
      setLoadedImage(null)
      return
    }
    let isCurrentImage = true
    // Load off-screen first so neither broken-image text nor an undecoded image is displayed.
    const image = new Image()
    image.decoding = 'async'
    const showImage = () => {
      if (isCurrentImage) {
        setLoadedImage({ userId, url })
        setFailedUrl(null)
      }
    }
    image.onload = showImage
    image.onerror = () => { if (isCurrentImage) setFailedUrl(url) }
    image.src = url
    if (image.complete && image.naturalWidth > 0) showImage()
    return () => { isCurrentImage = false }
  }, [url, userId])

  const displayedUrl = loadedImage?.userId === userId ? loadedImage.url : null
  const hasFailed = Boolean(url && failedUrl === url)
  const isLoading = url === undefined || Boolean(url && !displayedUrl && !hasFailed)

  return (
    <span role="img" aria-label={`${name} profile picture`} aria-busy={isLoading} className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#757A5E]/15 text-[#344336] ${className}`}>
      {displayedUrl && !hasFailed ? <img src={displayedUrl} alt="" onError={() => setFailedUrl(url ?? displayedUrl)} className="absolute inset-0 h-full w-full object-cover" />
        : isLoading ? <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-[#757A5E]/15 motion-reduce:animate-none" />
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3/5 w-3/5" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>}
    </span>
  )
}
