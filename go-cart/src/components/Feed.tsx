import { useEffect, useMemo, useRef, useState } from 'react'
import { requestsService } from '../services/requestsService'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../types'
import { CartItemEditor } from './cart/CartItemEditor'
import { CartItemList } from './cart/CartItemList'
import { CartSubmitForm } from './cart/CartSubmitForm'
import { curationService, type CuratedSection } from '../services/curationService'

export function Feed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ShoppingRequest | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [showCurated, setShowCurated] = useState(false)
  const scrollFeedRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    requestsService.list().then(setRequests)
  }, [])

  useEffect(() => {
    setItems([])
  }, [selectedRequest?.id])

  if (requests === null) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No requests yet.</div>
  }

  return (
    <div className="relative">
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

function ReelCard({ request, isActive, onShop }: { request: ShoppingRequest; isActive: boolean; onShop: () => void }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const media = request.media
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showHud, setShowHud] = useState(false)
  const hudHideTimeoutRef = useRef<number | null>(null)

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

  function togglePlay() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
    } else {
      el.pause()
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
              muted
              playsInline
              controls={false}
              onClick={() => { togglePlay(); showHudTemporarily() }}
              onPlay={() => { setIsPlaying(true); showHudTemporarily() }}
              onPause={() => { setIsPlaying(false); showHudTemporarily() }}
            />
            <button
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className={`absolute bottom-28 right-4 z-10 h-10 w-10 rounded-full flex items-center justify-center text-white bg-black/50 hover:bg-black/60 border border-white/20 transition-opacity duration-300 ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
            >
              {isPlaying ? (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1"></rect>
                  <rect x="14" y="5" width="4" height="14" rx="1"></rect>
                </svg>
              ) : (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7-11-7z"></path>
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
        className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-sm font-medium text-white bg-[#5A31F4] hover:bg-[#4E28D6]"
        onClick={onShop}
      >
        Shop for them
      </button>

      {null}

      <div
        className="absolute inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent"
      >
        {media?.type === 'image' && media.urls && media.urls.length > 1 ? (
          <div className="mb-2 flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
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
        <div className="relative mt-1">
          <p className={`text-white/95 text-sm ${isDescriptionExpanded ? 'line-clamp-none max-h-28 overflow-y-auto pr-28' : 'line-clamp-1 pr-24'}`}>{request.description}</p>
          <button
            className="absolute right-0 top-0 text-xs font-medium text-white/90 underline decoration-white/60 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(prev => !prev) }}
          >
            {isDescriptionExpanded ? 'Show less' : 'Show more'}
          </button>
        </div>
        <div className="text-white/90 text-xs mt-1">Budget: ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</div>
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-base font-semibold">Curate for “{request.title}”</h4>
            <p className="text-xs text-gray-500">Build a moodboard and submit</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl border-t border-gray-200 p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-base font-semibold">Shop for “{request.title}”</h4>
            <p className="text-xs text-gray-500">Curated, recommended and popular products</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
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
              <div key={i} className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">{sec.title}</h5>
                <ul className="grid grid-cols-2 gap-3">
                  {sec.products.map(p => (
                    <li key={p.id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      <div className="aspect-square bg-gray-50 flex items-center justify-center">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.title || 'Product'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gray-100" />
                        )}
                      </div>
                      <div className="p-2 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate">{p.title || p.id}</p>
                          <p className="text-xs text-gray-500">{p.priceCurrencyCode || 'USD'} {p.priceAmount ?? '-'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 rounded-md text-xs font-medium bg-green-600 text-white" onClick={() => addProduct(p)}>Add</button>
                          <a className="px-3 py-1 rounded-md text-xs bg-white border border-gray-300 text-gray-700" href="#" onClick={e => e.preventDefault()}>View store</a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700">Moodboard</h5>
              <CartItemList items={items} onRemove={onRemoveItem} />
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white" onClick={onProceedToSubmit}>Proceed to submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}