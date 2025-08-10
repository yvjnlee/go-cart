import { useEffect, useMemo, useRef, useState } from 'react'
import { requestsService } from '../services/request.service'
import { SearchProvider, SearchInput, SearchResultsList, ProductCard, Button, useShopCartActions, useCuratedProducts, usePopularProducts, useRecommendedProducts, Carousel, CarouselContent, CarouselItem } from '@shopify/shop-minis-react'
// We can optionally use FAL-generated copy to build a topic handle for SDK queries
// removed curated services for this overlay; we use built-in Search
import type { CartItem, ShoppingRequest } from '../types'
import { CartItemEditor } from './cart/CartItemEditor'
import { CartItemList } from './cart/CartItemList'
import { CartSubmitForm } from './cart/CartSubmitForm'
import { getOrGenerateCartProfileCopy } from '../services/fal.service'
import { curationService } from '../services/curation.service'

export function RequestFeed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ShoppingRequest | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [showCurated, setShowCurated] = useState(false)
  // navigation used within overlays when rendering Search results
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
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No requests yet.</div>
  }

  return (
    <div className="relative h-full">
      <div
        className="h-full overflow-y-auto snap-y snap-mandatory"
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
          <div key={req.id} className="snap-start h-full">
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
        <CurationsOverlay
          request={selectedRequest}
          items={items}
          onAddItem={it => setItems(prev => [...prev, it])}
          onRemoveItem={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => { setShowCurated(false); setSelectedRequest(null) }}
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
  // track muted state only; remove unused isPlaying
  // (HUD visibility is handled by showHud)
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

  // Remove unused togglePlay to satisfy the linter

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
        className="absolute bottom-44 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-sm font-medium text-white bg-[#5A31F4] hover:bg-[#4E28D6] pointer-events-auto"
        onClick={() => {
          if (isDescriptionExpanded) {
            setIsDescriptionExpanded(false)
            // Navigate after collapsing to feel responsive
            setTimeout(() => onShop(), 0)
          } else {
            onShop()
          }
        }}
      >
        Shop
      </button>

      {null}

      <div
        className="absolute inset-x-0 bottom-0 z-10 p-4 pb-8 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none"
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
        <div className="relative mt-1">
          <p
            className={`text-white/95 text-sm px-1 py-0.5 ${isDescriptionExpanded ? 'line-clamp-none max-h-32 overflow-y-auto pr-28' : 'line-clamp-1 pr-24'} pointer-events-auto`}
            onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(prev => !prev) }}
          >
            {request.description}
          </p>
          <button
            className="absolute right-0 top-0 text-xs font-medium text-white/90 underline decoration-white/60 hover:text-white pointer-events-auto"
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

// CuratedOverlay removed in favor of CartSpotlight

function CurationsOverlay({
  request,
  items: _items,
  onAddItem: _onAddItem,
  onRemoveItem: _onRemoveItem,
  onClose,
}: {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
}) {
  const { addToCart } = useShopCartActions()
  const areaRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLDivElement | null>(null)
  const [listHeight, setListHeight] = useState<number>(Math.floor(window.innerHeight * 0.72))

  // Derive a curated handle from FAL persona to improve product targeting
  const [falHandle, setFalHandle] = useState<string | null>(null)
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>('Search products...')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const copy = await getOrGenerateCartProfileCopy(request, [])
        // Build a richer topic handle using request occasion, budget tier, inferred category, and vibe/name
        const text = `${request.title || ''} ${request.description || ''}`.toLowerCase()
        const occasion = (request.occasion || '').toString().toLowerCase().trim()
        const budget = Number(request.budget || 0)
        const budgetTier = budget <= 50 ? 'under-50' : budget <= 100 ? 'under-100' : budget <= 200 ? 'under-200' : budget <= 500 ? 'under-500' : 'premium'
        // naive category inference from request text
        const isFashion = /(dress|jacket|shirt|pants|jeans|skirt|sneakers|shoes|bag|coat|hoodie|sweater)/.test(text)
        const isHome = /(sofa|couch|chair|table|lamp|decor|pillow|vase|rug|sheets|bedding|kitchen)/.test(text)
        const category = isFashion ? 'fashion' : isHome ? 'home' : 'gifts'
        const vibe = (copy?.vibe || copy?.name || copy?.prompts?.[0]?.answer || '').toString().toLowerCase()
        const base = [category, occasion, vibe, budgetTier]
          .filter(Boolean)
          .join('-')
          .toLowerCase()
        const slug = base
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const handle = slug ? `topic-${slug}` : `request-${request.id}`
        if (!cancelled) {
          setFalHandle(handle)
          const occText = occasion ? `${occasion} ` : ''
          const catText = category ? `${category} ` : ''
          const budgetText = budget ? `under $${budget}` : ''
          const ph = `Search ${occText}${catText}${budgetText}`.trim() || 'Search products...'
          setSearchPlaceholder(ph)
        }
      } catch {
        if (!cancelled) {
          setFalHandle(`request-${request.id}`)
          const budget = Number(request.budget || 0)
          const budgetText = budget ? `under $${budget}` : ''
          setSearchPlaceholder(`Search ${budgetText}`.trim() || 'Search products...')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [request.id, request.title])

  // Measure available height for the virtualized list for reliable scrolling
  useEffect(() => {
    const container = areaRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const containerHeight = container.getBoundingClientRect().height
      const inputHeight = inputRef.current?.getBoundingClientRect().height || 0
      const next = Math.max(0, Math.floor(containerHeight - inputHeight))
      setListHeight(next)
    })
    ro.observe(container)
    // Also trigger once initially
    const containerHeight = container.getBoundingClientRect().height
    const inputHeight = inputRef.current?.getBoundingClientRect().height || 0
    setListHeight(Math.max(0, Math.floor(containerHeight - inputHeight)))
    return () => {
      ro.disconnect()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 h-[92vh] flex flex-col">
        <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold">Shop for “{request.title}”</h4>
            <p className="text-xs text-gray-500">Budget ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          ref={areaRef}
          style={{ WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'contain', touchAction: 'pan-y' as any }}
        >
          <SearchProvider>
            {/* Inline search input that scrolls with content, but stays visible at top of this area */}
            <div className="px-4 pt-3 pb-2 sticky top-0 bg-white z-10" ref={inputRef}>
              <SearchInput placeholder={searchPlaceholder} />
            </div>
            {/* Always show curated row at the top for this request */}
            <CuratedRows request={request} handleOverride={falHandle ?? undefined} />
            {/* Results list – shows curated rows when query is empty, otherwise results */}
            <SearchResultsList
              height={listHeight}
              itemHeight={192}
              initialStateComponent={<DefaultRows />}
              renderItem={(product: any) => (
                <div className="px-3 pb-3">
                  <div className="relative">
                    <ProductCard product={product} />
                    <Button
                      size="sm"
                      className="absolute bottom-3 left-3 bg-white/95 text-gray-900"
                      onClick={(e: any) => {
                        e.stopPropagation()
                        addToCart({
                          productId: product.id,
                          productVariantId: product.selectedVariant?.id || product.defaultVariantId,
                          quantity: 1,
                        })
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
              showScrollbar
            />
          </SearchProvider>
        </div>
      </div>
    </div>
  )
}

function CuratedRows({ request, handleOverride }: { request: ShoppingRequest; handleOverride?: string }) {
  // Example: curated by a handle that could map to request id or topic, and a popular fallback
  const curatedHandle = handleOverride || `request-${request.id}`
  const { products: curated } = useCuratedProducts({ handle: curatedHandle, skip: false })
  const { products: popular } = usePopularProducts({ skip: false })
  const { products: recommended } = useRecommendedProducts({ skip: false })
  const [fallbackCurated, setFallbackCurated] = useState<any[]>([])
  const hasSdkCurated = Array.isArray(curated) && curated.length > 0

  // If SDK curation returns nothing, use our local lightweight curation as a fallback
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sections = await curationService.getCuratedSections(request)
        const primary = sections?.[0]?.products ?? []
        if (!cancelled) setFallbackCurated(primary)
      } catch {
        if (!cancelled) setFallbackCurated([])
      }
    })()
    return () => { cancelled = true }
  }, [request])

  const curatedList = hasSdkCurated ? curated : fallbackCurated
  const rows = [
    { title: 'Curated for this request', list: curatedList },
    { title: 'Recommended for you', list: recommended },
    { title: 'Popular now', list: popular },
  ]

  return (
    <div className="px-3 pt-3 pb-2 space-y-5">
      {rows.map((row, idx) => (
        row.list && row.list.length > 0 ? (
          <section key={idx}>
            <div className="mb-2 px-1">
              <h5 className="text-sm font-semibold text-gray-900">{row.title}</h5>
            </div>
            {/* Creative carousel presentation */}
            <Carousel className="-mx-2">
              <CarouselContent>
                {row.title === 'Curated for this request' && !hasSdkCurated
                  ? row.list.map((p: any) => (
                      <CarouselItem key={p.id} className="basis-[70%] sm:basis-1/3 px-2 mb-1">
                        <SnapshotCard snapshot={p} />
                      </CarouselItem>
                    ))
                  : row.list.map((p: any) => (
                      <CarouselItem key={p.id} className="basis-[70%] sm:basis-1/3 px-2 mb-1">
                        <ProductCard product={p} />
                      </CarouselItem>
                    ))}
              </CarouselContent>
            </Carousel>
          </section>
        ) : null
      ))}
    </div>
  )
}

function DefaultRows() {
  const { products: popular } = usePopularProducts({ skip: false })
  const { products: recommended } = useRecommendedProducts({ skip: false })

  const rows = [
    { title: 'Recommended for you', list: recommended },
    { title: 'Popular now', list: popular },
  ]

  return (
    <div className="px-3 pt-3 pb-2 space-y-5">
      {rows.map((row, idx) => (
        row.list && row.list.length > 0 ? (
          <section key={idx}>
            <div className="mb-2 px-1">
              <h5 className="text-sm font-semibold text-gray-900">{row.title}</h5>
            </div>
            <Carousel className="-mx-2">
              <CarouselContent>
                {row.list.map((p: any) => (
                  <CarouselItem key={p.id} className="basis-[70%] sm:basis-1/3 px-2 mb-1">
                    <ProductCard product={p} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </section>
        ) : null
      ))}
    </div>
  )
}

function SnapshotCard({ snapshot }: { snapshot: { id: string; title?: string; imageUrl?: string; priceAmount?: number; priceCurrencyCode?: string } }) {
  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={snapshot.imageUrl} alt={snapshot.title || 'product'} className="w-full h-48 object-cover" />
      <div className="p-2">
        <div className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">{snapshot.title}</div>
        {snapshot.priceAmount ? (
          <div className="text-sm text-gray-700 mt-1">
            {snapshot.priceCurrencyCode || 'USD'} ${snapshot.priceAmount}
          </div>
        ) : null}
      </div>
    </div>
  )
}