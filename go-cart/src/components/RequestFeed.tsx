import { useEffect, useMemo, useRef, useState } from 'react'
import { requestsService } from '../services/request.service'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../types'
import { CartItemEditor } from './cart/CartItemEditor'
import { CartItemList } from './cart/CartItemList'
import { CartSubmitForm } from './cart/CartSubmitForm'
import { curationService, type CuratedSection } from '../services/curation.service'

export function RequestFeed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ShoppingRequest | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [showCurated, setShowCurated] = useState(false)
  const scrollFeedRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    console.log('RequestFeed: Loading requests...')
    requestsService.list().then(data => {
      console.log('RequestFeed: Loaded requests:', data)
      setRequests(data)
    }).catch(err => {
      console.error('RequestFeed: Error loading requests:', err)
      setRequests([])
    })
  }, [])

  useEffect(() => {
    setItems([])
  }, [selectedRequest?.id])

  console.log('RequestFeed render:', { requests, requestsLength: requests?.length })

  if (requests === null) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-white">Loading requests...</p>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 h-full flex items-center justify-center">
        <div>
          <h3 className="text-white text-lg mb-2">No requests yet</h3>
          <p className="text-gray-400">Create a post to see requests here!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-black">
      <div
        className="h-[calc(100vh-6rem)] overflow-y-auto snap-y snap-mandatory"
        ref={scrollFeedRef}
        onScroll={() => {
          const el = scrollFeedRef.current
          if (!el) return
          const containerHeight = el.clientHeight || 1
          const index = Math.round(el.scrollTop / containerHeight)
          if (index !== activeIndex) setActiveIndex(index)
        }}
      >
        {requests.map((req, i) => (
          <div key={req.id} className="snap-start h-[calc(100vh-6rem)]">
            <ReelCard
              request={req}
              isActive={i === activeIndex}
              onShop={() => {
                setSelectedRequest(req)
                setShowCurated(true)
              }}
            />
          </div>
        ))}
      </div>

      {selectedRequest && showCurated ? (
        <CuratedOverlay
          request={selectedRequest}
          items={items}
          onAddItem={it => setItems(prev => [...prev, it])}
          onRemoveItem={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => { setShowCurated(false); setSelectedRequest(null) }}
          onProceedToSubmit={() => setShowCurated(false)}
        />
      ) : null}

      {selectedRequest && !showCurated ? (
        <BuilderOverlay
          request={selectedRequest}
          items={items}
          onAddItem={it => setItems(prev => [...prev, it])}
          onRemoveItem={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => setSelectedRequest(null)}
          onSubmitted={() => setSelectedRequest(null)}
        />
      ) : null}
    </div>
  )
}

export default RequestFeed

function ReelCard({ request, isActive, onShop }: { request: ShoppingRequest; isActive: boolean; onShop: () => void }) {
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
  
  // Cart animation states
  const [cartShaking, setCartShaking] = useState(false)
  const [cartExpanded, setCartExpanded] = useState(false)
  const cartTimeoutRef = useRef<number | null>(null)

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
    // Start a short delay before engaging hold-to-pause to avoid jank on quick taps
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
      // Prevent the subsequent synthetic click from a long press
      suppressClickUntilRef.current = Date.now() + 500
      if (e?.preventDefault) e.preventDefault()
      if (e?.stopPropagation) e.stopPropagation()
      if (wasPlayingBeforeHoldRef.current) {
        el.play().catch(() => {})
      }
      isHoldingRef.current = false
      wasPlayingBeforeHoldRef.current = false
      // Keep boolean suppression until the time-based window expires
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

  // Pause and reset video when card is not active; autoplay when it becomes active
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

  // Handle cart animation for all active cards (videos and images)
  useEffect(() => {
    if (!isActive) {
      // Reset cart animation when card becomes inactive
      if (cartTimeoutRef.current) {
        clearTimeout(cartTimeoutRef.current)
        cartTimeoutRef.current = null
      }
      setCartShaking(false)
      setCartExpanded(false)
    } else {
      // Start cart animation timer when card becomes active
      cartTimeoutRef.current = window.setTimeout(() => {
        console.log('Starting cart shake animation')
        setCartShaking(true)
        // After shaking for 1 second, expand the button
        setTimeout(() => {
          console.log('Expanding cart button')
          setCartShaking(false)
          setCartExpanded(true)
        }, 1000)
      }, 3000)
    }
  }, [isActive])

  // Cleanup cart timeout on unmount
  useEffect(() => {
    return () => {
      if (cartTimeoutRef.current) {
        clearTimeout(cartTimeoutRef.current)
      }
    }
  }, [])

  // Debug logging
  console.log('ReelCard render:', { isActive, cartShaking, cartExpanded })

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
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
              // Prevent long-press menu and accidental selections
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
                  // Suppress click triggered by a hold interaction
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
                // Muted icon (speaker off)
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4h4l5 5V5L7 10H3z"></path>
                  <path d="M16 8l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                // Unmuted icon (speaker on)
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
              // eslint-disable-next-line @next/next/no-img-element
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

      <button
        className={`absolute bottom-28 right-4 z-10 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#5A31F4] to-[#6E3AFF] hover:from-[#4E28D6] hover:to-[#5E2FD1] shadow-lg shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-white/10 ${
          cartShaking ? 'animate-shake' : ''
        } ${
          cartExpanded ? 'px-6 py-3' : 'p-3'
        }`}
        onClick={onShop}
      >
        <div className={`flex items-center ${cartExpanded ? 'gap-2' : 'justify-center'}`}>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
          <span className={`whitespace-nowrap transition-all duration-300 ${
            cartExpanded ? 'opacity-100 max-w-32' : 'opacity-0 max-w-0 overflow-hidden'
          }`}>
            Shop for them
          </span>
        </div>
      </button>

      {null}

      <div
        className="absolute inset-x-0 bottom-0 z-10 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent"
      >
        {media?.type === 'image' && media.urls && media.urls.length > 1 ? (
          <div className="mb-4 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
            {media.urls.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to image ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/70'}`}
                onClick={() => scrollToImage(i)}
              />
            ))}
          </div>
        ) : null}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg leading-tight">{request.title}</h3>
          <div className="relative">
            <p className="text-white/95 text-sm leading-relaxed line-clamp-2">{request.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13 5V7H11V5L9 4L3 7V9H21ZM2 10V12H4V22H20V12H22V10H2Z"/>
              </svg>
              <span className="text-white/95 text-xs font-medium">${request.budget}</span>
            </div>
            {request.occasion ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
                  <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z"/>
                </svg>
                <span className="text-white/95 text-xs font-medium">{request.occasion}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {null}
    </div>
  )
}

function BuilderOverlay({
  request,
  items,
  onAddItem,
  onRemoveItem,
  onClose,
  onSubmitted,
}: {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
  onSubmitted: () => void
}) {
  const canSubmit = useMemo(() => items.length > 0, [items])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-gray-900">Curate for "{request.title}"</h4>
            <p className="text-sm text-gray-600 mt-1">Build a moodboard and submit</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <CartItemEditor onAdd={onAddItem} />
          <CartItemList items={items} onRemove={onRemoveItem} />
          <CartSubmitForm
            requestId={request.id}
            items={items}
            onSubmitted={() => {
              onSubmitted()
            }}
          />
          {!canSubmit ? (
            <p className="text-xs text-gray-500 text-center">Add at least one item to submit.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CuratedOverlay({
  request,
  items,
  onAddItem,
  onRemoveItem,
  onClose,
  onProceedToSubmit,
}: {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
  onProceedToSubmit: () => void
}) {
  const [sections, setSections] = useState<CuratedSection[] | null>(null)
  const [stores, setStores] = useState<Awaited<ReturnType<typeof curationService.getCuratedStores>> | null>(null)

  useEffect(() => {
    curationService.getCuratedSections(request).then(setSections)
    curationService.getCuratedStores(request).then(setStores)
  }, [request])

  function addProduct(product: CartItemProductSnapshot) {
    onAddItem({ product, quantity: 1 })
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-gray-900">Shop for "{request.title}"</h4>
            <p className="text-sm text-gray-600 mt-1">Curated, recommended and popular products</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
            </svg>
          </button>
        </div>

        {sections === null ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="space-y-6">
            {stores && stores.length > 0 ? (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Stores</h5>
                <ul className="flex gap-3 overflow-x-auto pb-1">
                  {stores.map(s => (
                    <li key={s.url} className="min-w-[180px] max-w-[220px] bg-white border border-gray-200 rounded-md overflow-hidden">
                      <div className="aspect-[3/2] bg-gray-50 flex items-center justify-center">
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt={s.name} className="h-full w-full object-contain p-6" />
                        ) : (
                          <div className="h-full w-full bg-gray-100" />
                        )}
                      </div>
                      <div className="p-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <a className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700" href={s.url} target="_blank" rel="noreferrer">Open</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {sections.map((sec, i) => (
              <div key={i} className="space-y-3">
                <h5 className="text-base font-semibold text-gray-900">{sec.title}</h5>
                <ul className="grid grid-cols-2 gap-4">
                  {sec.products.map(p => (
                    <li key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-gray-50 flex items-center justify-center">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.title || 'Product'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                              <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{p.title || p.id}</p>
                          <p className="text-sm font-bold text-green-600 mt-1">{p.priceCurrencyCode || 'USD'} {p.priceAmount ?? '-'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#5A31F4] to-[#6E3AFF] text-white hover:from-[#4E28D6] hover:to-[#5E2FD1] transition-all" 
                            onClick={() => addProduct(p)}
                          >
                            Add to Cart
                          </button>
                          <button 
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" 
                            onClick={e => e.preventDefault()}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="space-y-4 pt-2 border-t border-gray-200">
              <h5 className="text-base font-semibold text-gray-900">Moodboard</h5>
              <CartItemList items={items} onRemove={onRemoveItem} />
              <div className="flex justify-end">
                <button className="px-6 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-[#5A31F4] to-[#6E3AFF] text-white hover:from-[#4E28D6] hover:to-[#5E2FD1] shadow-lg transition-all" onClick={onProceedToSubmit}>
                  Proceed to submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}