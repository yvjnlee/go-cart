import { useEffect, useMemo, useRef, useState } from 'react'
import type { CartItem, ShoppingRequest } from '../../types'
import { curationService, type CuratedSection } from '../../services/curation.service'
import CartSpotlight from '../cart/CartSpotlight'
import { storage } from '../../services/storage'
import { CartItemList } from '../cart/CartItemList'

export default function RequestDetailOverlay({ request, onClose }: { request: ShoppingRequest; onClose: () => void }) {
  const [tab, setTab] = useState<'crowdcarts' | 'added'>('crowdcarts')
  const [showPostFirst, setShowPostFirst] = useState(true)
  const [userItems, setUserItems] = useState<CartItem[]>([])
  const [crowdcartIndex, setCrowdcartIndex] = useState(0)

  useEffect(() => {
    storage.getUserCartItemsForRequest(request.id).then((list) => setUserItems(list as CartItem[]))
  }, [request.id])

  function addUserItem(item: CartItem) {
    setUserItems(prev => {
      const next = [...prev, item]
      storage.saveUserCartItemsForRequest(request.id, next)
      return next
    })
  }

  function addAllToCart() {
    storage.saveUserCartItemsForRequest(request.id, userItems)
  }

  function removeUserItem(idx: number) {
    setUserItems(prev => {
      const next = prev.filter((_, i) => i !== idx)
      storage.saveUserCartItemsForRequest(request.id, next)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 md:inset-x-8 md:inset-y-8 bg-white rounded-none md:rounded-2xl overflow-hidden flex flex-col">
        {!showPostFirst && (
          <button className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/20" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.71L12 12.01 5.7 5.7 4.29 7.11l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.29 1.41-1.41-6.29-6.29 6.3-6.3z"/></svg>
          </button>
        )}
        {!showPostFirst && (
          <div className="p-2 pt-3">
            <div className="inline-flex rounded-full border p-1 text-sm bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <button className={`px-3 py-1 rounded-full ${tab==='crowdcarts'?'bg-gray-900 text-white':'text-gray-700'}`} onClick={() => setTab('crowdcarts')}>Crowdcarts</button>
              <button className={`px-3 py-1 rounded-full ${tab==='added'?'bg-gray-900 text-white':'text-gray-700'}`} onClick={() => setTab('added')}>Added items</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          {tab === 'crowdcarts' ? (
            <SwipeCrowdcarts
              request={request}
              items={userItems}
              onAddItem={addUserItem}
              onRemoveItem={removeUserItem}
              index={crowdcartIndex}
              onIndexChange={setCrowdcartIndex}
              onExhausted={() => setTab('added')}
            />
          ) : (
            <AddedItemsPanel items={userItems} onRemoveItem={removeUserItem} onAddAll={addAllToCart} />
          )}

          {showPostFirst ? (
            <RequestPostPreview request={request} onContinue={() => setShowPostFirst(false)} onClose={onClose} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SwipeCrowdcarts({
  request,
  items,
  onAddItem,
  onRemoveItem,
  index,
  onIndexChange,
  onExhausted,
}: {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  index: number
  onIndexChange: (i: number) => void
  onExhausted: () => void
}) {
  const [sections, setSections] = useState<CuratedSection[] | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [dragX, setDragX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [animating, setAnimating] = useState(false)
  const commitDirRef = useRef<null | 'left' | 'right'>(null)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const [feedback, setFeedback] = useState<null | 'left' | 'right'>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const swipeScrollRef = useRef<HTMLDivElement | null>(null)
  const swipeTransformRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    curationService.getCuratedSections(request).then(setSections)
  }, [request])

  useEffect(() => {
    let cancelled = false
    storage.getDismissedCrowdcartsForRequest(request.id).then((list) => {
      if (cancelled) return
      setDismissedIds(new Set(list))
    })
    return () => { cancelled = true }
  }, [request.id])

  const profiles = useMemo(() => {
    if (!sections) return []
    return sections.map(sec => ({ id: sec.title, title: sec.title, products: sec.products }))
  }, [sections])

  const filteredProfiles = useMemo(() => profiles.filter(p => !dismissedIds.has(p.id)), [profiles, dismissedIds])

  function commitSwipe(direction: 'left' | 'right') {
    const current = filteredProfiles[index]
    if (!current) return
    if (direction === 'right') {
      const existingIds = new Set(items.map(it => it.product.id))
      const toAdd = current.products.filter(p => !existingIds.has(p.id))
      toAdd.forEach(p => onAddItem({ product: p, quantity: 1 }))
    }
    storage.addDismissedCrowdcart(request.id, current.id).then(() => {
      setDismissedIds(prev => new Set([...prev, current.id]))
      onIndexChange(index)
    })
    const sc = swipeScrollRef.current
    if (sc) {
      sc.scrollTo({ top: 0, behavior: 'auto' })
    }
    setDragX(0)
    setFeedback(direction)
    setFeedbackVisible(true)
    window.setTimeout(() => setFeedbackVisible(false), 320)
    window.setTimeout(() => setFeedback(null), 520)
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0]
    startXRef.current = t.clientX
    startYRef.current = t.clientY
    setSwiping(false)
    setAnimating(false)
    commitDirRef.current = null
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (startXRef.current == null || startYRef.current == null) return
    const t = e.touches[0]
    const dx = t.clientX - startXRef.current
    const dy = t.clientY - startYRef.current
    if (!swiping) {
      const intentThreshold = 8
      if (Math.abs(dx) > intentThreshold && Math.abs(dx) > Math.abs(dy)) {
        setSwiping(true)
      } else if (Math.abs(dy) > intentThreshold && Math.abs(dy) > Math.abs(dx)) {
        return
      } else {
        return
      }
    }
    e.preventDefault()
    setDragX(dx)
  }

  function finishSwipe(direction: 'left' | 'right') {
    const off = (direction === 'right' ? window.innerWidth : -window.innerWidth) * 1.15
    commitDirRef.current = direction
    setAnimating(true)
    setDragX(off)
  }

  function onTouchEnd() {
    const distanceThreshold = 110
    if (swiping && Math.abs(dragX) > distanceThreshold) {
      finishSwipe(dragX > 0 ? 'right' : 'left')
    } else {
      setAnimating(true)
      setDragX(0)
      window.setTimeout(() => setAnimating(false), 220)
    }
    setSwiping(false)
    startXRef.current = null
    startYRef.current = null
  }

  function onTransformTransitionEnd() {
    if (commitDirRef.current) {
      const dir = commitDirRef.current
      commitDirRef.current = null
      setAnimating(false)
      setDragX(0)
      commitSwipe(dir)
    }
  }

  if (!sections) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
  if (filteredProfiles.length === 0) return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center p-6">
        <div className="text-lg font-semibold text-gray-800">No carts to review</div>
        <div className="text-sm text-gray-600 mt-1">There are currently no crowdcarts for this request.</div>
      </div>
    </div>
  )

  const current = filteredProfiles[index]
  const hasMore = index < filteredProfiles.length
  const likeOpacity = Math.max(0, Math.min(1, Math.abs(dragX) / 200)) * (dragX > 0 ? 1 : 0)
  const nopeOpacity = Math.max(0, Math.min(1, Math.abs(dragX) / 200)) * (dragX < 0 ? 1 : 0)
  const indicatorOpacity = swiping ? Math.max(likeOpacity, nopeOpacity) : 0
  const displayedX = dragX
  const displayedRotate = Math.max(-10, Math.min(10, displayedX * 0.02))

  return (
    <div className="h-full w-full relative bg-white">
      {hasMore ? (
        <div className="absolute inset-0">
          <div
            ref={swipeScrollRef}
            className="absolute inset-0 pb-24 overflow-y-auto select-none"
            style={{ WebkitOverflowScrolling: 'touch' as any }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <div
              ref={swipeTransformRef}
              onTransitionEnd={onTransformTransitionEnd}
              style={{
                transform: `translateX(${displayedX}px) rotate(${displayedRotate}deg)`,
                willChange: 'transform',
                transition: animating ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
              }}
            >
              <CartSpotlight
                request={request}
                items={current.products.map(p => ({ product: p, quantity: 1 }))}
                userItemsForInCart={items}
                onAddItem={onAddItem}
                onRemoveItem={onRemoveItem}
                onClose={() => {}}
                variant="embedded"
              />
            </div>
          </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  opacity: indicatorOpacity,
                  transform: `scale(${0.95 + 0.15 * indicatorOpacity})`,
                  color: likeOpacity ? '#16a34a' : '#dc2626',
                  background: 'transparent',
                  filter: 'none',
                  mixBlendMode: 'normal',
                  transition: 'opacity 120ms ease-out, transform 120ms ease-out'
                }}
              >
                {likeOpacity > 0 && likeOpacity >= nopeOpacity ? (
                  <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.59C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
                ) : (
                  <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>
                )}
              </div>
            </div>

            {feedback && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: feedbackVisible ? 1 : 0, transition: 'opacity 220ms ease-out' }}>
                <div className={`${feedback==='right' ? 'text-green-600' : 'text-red-600'}`} style={{ transform: `scale(${feedbackVisible ? 1 : 0.9})`, transition: 'transform 220ms ease-out' }}>
                  {feedback === 'right' ? (
                    <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.59C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
                  ) : (
                    <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                  )}
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-20 pointer-events-none">
              <button
                aria-label="Dislike"
                className="pointer-events-auto h-12 w-12 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-red-600 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); finishSwipe('left') }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.71L12 12.01 5.7 5.7 4.29 7.11l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.29 1.41-1.41-6.29-6.29 6.3-6.3z"/></svg>
              </button>
              <button
                aria-label="Like"
                className="pointer-events-auto h-12 w-12 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-green-600 hover:bg-green-50"
                onClick={(e) => { e.stopPropagation(); finishSwipe('right') }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.59C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </button>
            </div>
          </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-lg font-semibold text-gray-800">You're all caught up</div>
            <div className="text-sm text-gray-600 mt-1">No more carts to review for this request.</div>
            <div className="mt-4">
              <button className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white" onClick={onExhausted}>View added items</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RequestPostPreview({ request, onContinue, onClose }: { request: ShoppingRequest; onContinue: () => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const imagesRef = useRef<HTMLDivElement | null>(null)
  const media = request.media
  const isVideo = media?.type === 'video' && media.urls?.[0]
  const isImages = media?.type === 'image' && (media.urls?.length ?? 0) > 0
  const [isMuted, setIsMuted] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.play().catch(() => {})
    return () => { try { v.pause() } catch {} }
  }, [])

  function handleImagesScroll() {
    const el = imagesRef.current
    if (!el) return
    const w = el.clientWidth || 1
    const idx = Math.round(el.scrollLeft / w)
    if (idx !== currentIdx) setCurrentIdx(idx)
  }

  function scrollToImage(i: number) {
    const el = imagesRef.current
    if (!el) return
    const w = el.clientWidth
    el.scrollTo({ left: w * i, behavior: 'smooth' })
  }

  return (
    <div className="absolute inset-0 bg-black z-20">
      {isVideo ? (
        <video
          ref={videoRef}
          src={media!.urls![0]}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted={isMuted}
          playsInline
        />
      ) : isImages ? (
        <div
          ref={imagesRef}
          className="absolute inset-0 h-full w-full overflow-x-auto flex snap-x snap-mandatory"
          onScroll={handleImagesScroll}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' as any }}
        >
          {media!.urls!.map((u, i) => (
            <img
              key={i}
              src={u}
              alt={`${request.title} ${i+1}`}
              className="h-full w-full object-cover flex-shrink-0 snap-start select-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/90 p-6 text-center">
          <p className="text-sm whitespace-pre-wrap max-w-prose">{request.description}</p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 p-3 flex items-center justify-between">
        <button className="h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/20" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.71L12 12.01 5.7 5.7 4.29 7.11l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.29 1.41-1.41-6.29-6.29 6.3-6.3z"/></svg>
        </button>
        {isVideo ? (
          <button className="h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/20" onClick={() => setIsMuted(m => !m)}>
            {isMuted ? (
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z"></path><path d="M16 8l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            ) : (
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z"></path><path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M18.5 6.5a8 8 0 010 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            )}
          </button>
        ) : <div />}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 pt-20 pb-[calc(env(safe-area-inset-bottom)+28px)] bg-gradient-to-t from-black/70 via-black/40 to-transparent">
        {isImages && (media!.urls!.length > 1) ? (
          <div className="mb-2 flex items-center justify-center gap-1.5">
            {media!.urls!.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to image ${i+1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-white' : 'bg-white/50'}`}
                onClick={() => scrollToImage(i)}
              />
            ))}
          </div>
        ) : null}
        <div className="text-white text-lg font-semibold">{request.title}</div>
        <div className="text-white/90 text-sm mt-1">{request.description}</div>
        <div className="mt-4">
          <button
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60 active:scale-95 transition transform duration-150 ease-out bg-gradient-to-r from-[#6E3AFF] via-[#5E2FD1] to-[#6E3AFF] hover:from-[#7B47FF] hover:to-[#5E2FD1]"
            onClick={onContinue}
          >
            See responses
          </button>
        </div>
      </div>
    </div>
  )
}

function AddedItemsPanel({ items, onRemoveItem, onAddAll }: { items: CartItem[]; onRemoveItem: (idx: number) => void; onAddAll: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 font-medium">Added items</div>
      <div className="flex-1 overflow-y-auto px-3 pb-20">
        <CartItemList items={items} onRemove={onRemoveItem} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 border-t bg-white">
        <div className="flex items-center justify-between mx-3">
          <div className="text-sm text-gray-600">Items: <span className="font-medium text-gray-900">{items.length}</span></div>
          <button className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white" onClick={onAddAll}>Add all to cart</button>
        </div>
      </div>
    </div>
  )
}


