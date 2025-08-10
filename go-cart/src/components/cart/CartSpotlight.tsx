import { useEffect, useMemo, useState } from 'react'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../../types'
import { getOrGenerateCartProfileCopy, getCachedCartProfileCopy, prefetchCartProfileCopy, type CartProfileCopy, generateCartCollageDataUrl } from '../../services/fal.service'
import { curationService, type CuratedSection } from '../../services/curation.service'

interface Props {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
  variant?: 'overlay' | 'embedded'
  // When provided, this list is used to determine whether a product is already in the user's cart,
  // while `items` controls which products are displayed.
  userItemsForInCart?: CartItem[]
}

export default function CartSpotlight({ request, items, onAddItem, onRemoveItem, onClose, variant = 'overlay', userItemsForInCart }: Props) {
  const [copy, setCopy] = useState<CartProfileCopy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [curated, setCurated] = useState<CuratedSection[] | null>(null)
  const [collageUrl, setCollageUrl] = useState<string | null>(null)

  const moodboardProducts: CartItemProductSnapshot[] = useMemo(() => items.map(i => i.product), [items])
  const baseProducts: CartItemProductSnapshot[] = useMemo(() => (
    moodboardProducts.length > 0 ? moodboardProducts : (curated?.flatMap(s => s.products) ?? [])
  ), [moodboardProducts, curated])

  // Fetch curated products if moodboard empty so we can still generate a good spotlight
  useEffect(() => {
    let cancelled = false
    if (moodboardProducts.length === 0) {
      curationService.getCuratedSections(request).then(res => { if (!cancelled) setCurated(res) })
    } else {
      setCurated(null)
    }
    return () => { cancelled = true }
  }, [request, moodboardProducts.length])

  // Build collage when products ready
  useEffect(() => {
    const prods = baseProducts
    if (!prods || prods.length === 0) { setCollageUrl(null); return }
    let cancelled = false
    generateCartCollageDataUrl(prods).then(url => { if (!cancelled) setCollageUrl(url) })
    return () => { cancelled = true }
  }, [baseProducts])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Try cache first for instant appearance
    const cached = getCachedCartProfileCopy(request, baseProducts)
    if (cached) {
      setCopy(cached)
      setLoading(false)
      // still refresh in background
      prefetchCartProfileCopy(request, baseProducts)
      return () => { cancelled = true }
    }
    getOrGenerateCartProfileCopy(request, baseProducts)
      .then(res => { if (!cancelled) setCopy(res) })
      .catch(err => { if (!cancelled) setError(err?.message || 'Failed to generate spotlight') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request, baseProducts])

  function isInCart(productId: string): { inCart: boolean; index: number } {
    const source = userItemsForInCart ?? items
    const idx = source.findIndex(it => it.product.id === productId)
    return { inCart: idx >= 0, index: idx }
  }

  const isOverlay = variant === 'overlay'

  return (
    <div className={isOverlay ? 'fixed inset-0 z-50' : 'w-full bg-white'}>
      {isOverlay ? <div className="absolute inset-0 bg-black/40" onClick={onClose} /> : null}
      <div className={isOverlay ? 'absolute inset-x-0 bottom-0 bg-white rounded-t-2xl border-t border-gray-200 p-0 max-h-[92vh] overflow-hidden' : 'w-full'}>
        {isOverlay ? (
          <div className={`p-3 flex items-center justify-between border-b sticky top-0 bg-white z-10`}>
            <div>
              <h4 className="text-base font-semibold">Cart profile</h4>
            </div>
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : copy ? (
          <div className="relative">
            <div className={isOverlay ? 'h-[calc(92vh-48px)] overflow-y-auto pb-6' : 'pb-6'}>
              {/* Intro card only in overlay mode */}
              {isOverlay ? (
                <section className="p-4 pb-24">
                  <div className="mx-auto w-full max-w-2xl bg-white border rounded-2xl shadow-sm overflow-hidden">
                    {collageUrl ? (
                      <img src={collageUrl} alt={request.title} className="h-72 w-full object-cover" />
                    ) : (
                      (() => {
                        const fallback = (request.media?.type === 'image' && request.media.urls?.[0]) || baseProducts[0]?.imageUrl || null
                        return fallback ? (
                          <img src={fallback} alt={request.title} className="h-72 w-full object-cover" />
                        ) : (
                          <div className="h-72 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        )
                      })()
                    )}
                    <div className="-mt-10 px-5 flex items-end gap-3">
                      <div className="h-20 w-20 rounded-full border-4 border-white overflow-hidden bg-gray-200">
                        {(() => {
                          const avatar = baseProducts[1]?.imageUrl || (request.media?.type === 'image' && request.media.urls?.[1]) || baseProducts[0]?.imageUrl
                          return avatar ? <img src={avatar} alt="profile" className="h-full w-full object-cover" /> : null
                        })()}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold">{copy.name || 'Cart profile'}</div>
                            {copy.vibe ? <div className="text-xs text-gray-600 mt-0.5">{copy.vibe}</div> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            {copy.source === 'fal' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z"/></svg>
                                AI‑generated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">Local</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 pt-3">
                      <div className="text-sm text-gray-600">Use case: "{request.title}" · Budget ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</div>
                      <div className="mt-3 text-[14px] text-gray-800 whitespace-pre-wrap leading-6">{copy.about}</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {copy.prompts.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="text-[12px] font-medium text-gray-700">{p.prompt}</div>
                            <div className="text-[13px] text-gray-900 mt-0.5">{p.answer}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* Compact profile header for embedded view */}
              {!isOverlay ? (
                <section className="px-3 pt-3 pb-2">
                  <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                    {collageUrl ? (
                      <img src={collageUrl} alt={request.title} className="h-56 w-full object-cover" />
                    ) : (
                      (() => {
                        const fallback = (request.media?.type === 'image' && request.media.urls?.[0]) || baseProducts[0]?.imageUrl || null
                        return fallback ? (
                          <img src={fallback} alt={request.title} className="h-56 w-full object-cover" />
                        ) : (
                          <div className="h-56 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        )
                      })()
                    )}
                    <div className="-mt-8 px-3 flex items-end gap-2">
                      <div className="h-14 w-14 rounded-full border-4 border-white overflow-hidden bg-gray-200">
                        {(() => {
                          const avatar = baseProducts[1]?.imageUrl || (request.media?.type === 'image' && request.media.urls?.[1]) || baseProducts[0]?.imageUrl
                          return avatar ? <img src={avatar} alt="profile" className="h-full w-full object-cover" /> : null
                        })()}
                      </div>
                      <div className="flex-1 pb-0.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-base font-semibold">{copy.name || 'Cart profile'}</div>
                            {copy.vibe ? <div className="text-[11px] text-gray-600 mt-0.5">{copy.vibe}</div> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            {copy.source === 'fal' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z"/></svg>
                                AI‑generated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">Local</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Hide long about text in embedded for a more visual, less texty look */}
                  </div>
                </section>
              ) : null}

              {/* Product sections - masonry feed with swipe actions */}
              <section className="p-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 pb-28">
                {baseProducts.map(p => {
                  const { inCart, index } = isInCart(p.id)
                  return (
                    <article key={p.id} className="group bg-white border rounded-2xl overflow-hidden shadow-sm">
                      <div className="relative w-full bg-gray-100">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title || 'Product'} className="w-full h-64 sm:h-72 object-cover" />
                        ) : (
                          <div className="w-full h-64 sm:h-72 bg-gray-100" />)
                        }
                        <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button aria-label="Dislike" className="h-8 w-8 rounded-full bg-white/90 text-red-600 border border-gray-200 flex items-center justify-center" onClick={() => onRemoveItem(index)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
                          </button>
                          {inCart ? (
                            <button className="h-8 px-3 rounded-full bg-white/90 text-gray-900 border border-gray-200 text-xs" onClick={() => onRemoveItem(index)}>Remove</button>
                          ) : (
                            <button className="h-8 px-3 rounded-full bg-[#5A31F4] text-white text-xs" onClick={() => onAddItem({ product: p, quantity: 1 })}>Add</button>
                          )}
                          <button aria-label="Like" className="h-8 w-8 rounded-full bg-white/90 text-green-600 border border-gray-200 flex items-center justify-center" onClick={() => !inCart && onAddItem({ product: p, quantity: 1 })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.59C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-[12px] text-gray-900 truncate">{copy.productTaglines[p.id]}</div>
                      </div>
                    </article>
                  )
                })}
              </section>
            </div>

            {null}
          </div>
        ) : null}
      </div>
    </div>
  )
}


