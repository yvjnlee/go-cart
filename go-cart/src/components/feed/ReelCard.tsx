import { useEffect, useRef, useState } from 'react'
import type { ShoppingRequest } from '../../types'

interface Props {
  request: ShoppingRequest
  isActive: boolean
  onShop: () => void
}

export default function ReelCard({ request, isActive, onShop }: Props) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const media = request.media
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [showHud, setShowHud] = useState(false)
  const hudHideTimeoutRef = useRef<number | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const holdTimeoutRef = useRef<number | null>(null)
  const isHoldingRef = useRef(false)
  const wasPlayingBeforeHoldRef = useRef(false)
  const suppressNextClickRef = useRef(false)
  const suppressClickUntilRef = useRef(0)

  function handleScroll() {
    const el = scrollContainerRef.current
    if (!el) return
    const containerWidth = el.clientWidth || 1
    const index = Math.round(el.scrollLeft / containerWidth)
    if (index !== currentImageIndex) setCurrentImageIndex(index)
  }

  function scrollToImage(index: number) {
    const el = scrollContainerRef.current
    if (!el) return
    const containerWidth = el.clientWidth
    el.scrollTo({ left: containerWidth * index, behavior: 'smooth' })
  }

  function toggleMute() {
    const el = videoRef.current
    if (!el) return
    const next = !el.muted
    el.muted = next
    setIsMuted(next)
  }

  function onPointerDown() {
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current)
    isHoldingRef.current = false
    wasPlayingBeforeHoldRef.current = false
    holdTimeoutRef.current = window.setTimeout(() => {
      const el = videoRef.current
      if (!el) return
      isHoldingRef.current = true
      suppressNextClickRef.current = true
      if (!el.paused) {
        wasPlayingBeforeHoldRef.current = true
        el.pause()
        showHudTemporarily()
      }
    }, 280)
  }

  function endHold(e?: { preventDefault?: () => void; stopPropagation?: () => void }) {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    const el = videoRef.current
    if (!el) return
    if (isHoldingRef.current) {
      suppressClickUntilRef.current = Date.now() + 500
      if (e?.preventDefault) e.preventDefault()
      if (e?.stopPropagation) e.stopPropagation()
      if (wasPlayingBeforeHoldRef.current) {
        el.play().catch(() => {})
      }
      isHoldingRef.current = false
      wasPlayingBeforeHoldRef.current = false
    }
  }

  function showHudTemporarily() {
    setShowHud(true)
    if (hudHideTimeoutRef.current) {
      clearTimeout(hudHideTimeoutRef.current)
    }
    hudHideTimeoutRef.current = window.setTimeout(() => {
      setShowHud(false)
      hudHideTimeoutRef.current = null
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (hudHideTimeoutRef.current) clearTimeout(hudHideTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (!isActive) {
      try {
        el.pause()
      } catch {}
      el.currentTime = 0
    } else {
      el.currentTime = 0
      el.play().catch(() => {})
    }
  }, [isActive])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {isDescriptionExpanded ? (
        <button
          aria-label="Collapse description"
          className="absolute inset-0 z-20 bg-transparent cursor-default"
          onClick={() => setIsDescriptionExpanded(false)}
        />
      ) : null}
      {media ? (
        media.type === 'video' && media.urls?.[0] ? (
          <>
            <video
              ref={videoRef}
              src={media.urls[0]}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              controls={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}
              onPointerDown={onPointerDown}
              onPointerUp={(e) => endHold(e)}
              onPointerCancel={(e) => endHold(e)}
              onPointerLeave={(e) => endHold(e)}
              onMouseDown={onPointerDown}
              onMouseUp={(e) => endHold(e)}
              onTouchStart={onPointerDown}
              onTouchEnd={(e) => endHold(e)}
              onTouchCancel={(e) => endHold(e)}
              onClick={() => {
                const now = Date.now()
                if (suppressNextClickRef.current || now < suppressClickUntilRef.current) {
                  suppressNextClickRef.current = false
                  return
                }
                toggleMute();
                showHudTemporarily()
              }}
              onPlay={() => { showHudTemporarily() }}
              onPause={() => { showHudTemporarily() }}
            />
            <button
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className={`absolute bottom-28 right-4 z-10 h-10 w-10 rounded-full flex items-center justify-center text-white bg-black/50 hover:bg-black/60 border border-white/20 transition-opacity duration-300 ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={(e) => { e.stopPropagation(); toggleMute() }}
            >
              {isMuted ? (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4h4l5 5V5L7 10H3z"></path>
                  <path d="M16 8l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4h4l5 5V5L7 10H3z"></path>
                  <path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M18.5 6.5a8 8 0 010 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </>
        ) : media.type === 'image' && media.urls && media.urls.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="absolute inset-0 w-full h-full overflow-x-auto flex snap-x snap-mandatory"
            onScroll={handleScroll}
          >
            {media.urls.map((u, i) => (
              <img
                key={i}
                src={u}
                alt={`image ${i + 1}`}
                className="h-full w-full object-cover flex-shrink-0 snap-start"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center p-6">
            <p className="text-gray-700 text-center text-sm whitespace-pre-wrap max-w-prose">{request.description}</p>
          </div>
        )
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          No media
        </div>
      )}



      <div
        className="absolute inset-x-0 bottom-0 z-10 p-6 pb-20 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none"
      >
        {media?.type === 'image' && media.urls && media.urls.length > 1 ? (
          <div className="mb-2 flex items-center justify-center gap-1.5 pointer-events-auto" onClick={e => e.stopPropagation()}>
            {media.urls.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                onClick={() => scrollToImage(i)}
              />
            ))}
          </div>
        ) : null}
        <h3 className="text-white font-semibold text-base">{request.title}</h3>
        <div className="relative mt-1 pointer-events-auto">
          <p
            className={`text-white/95 text-sm px-1 py-0.5 ${isDescriptionExpanded ? 'line-clamp-none max-h-32 overflow-y-auto pr-28' : 'line-clamp-1 pr-24'} pointer-events-auto`}
            onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(prev => !prev) }}
          >
            {request.description}
          </p>
          <button
            type="button"
            aria-expanded={isDescriptionExpanded}
            className="absolute right-0 top-0 z-30 text-xs font-medium text-white/90 underline decoration-white/60 hover:text-white pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(prev => !prev) }}
          >
            {isDescriptionExpanded ? 'Show less' : 'Show more'}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-white/90 text-xs">
            Budget: <span className="text-white font-bold text-sm bg-green-500 px-2 py-0.5 rounded-full">${request.budget}</span>
            {request.occasion ? ` · ${request.occasion}` : ''}
          </div>
          <button
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5A31F4] hover:bg-[#4E28D6] shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 pointer-events-auto"
            onClick={() => {
              if (isDescriptionExpanded) {
                setIsDescriptionExpanded(false)
                setTimeout(() => onShop(), 0)
              } else {
                onShop()
              }
            }}
          >
            Shop for them
          </button>
        </div>
      </div>
    </div>
  )
}


