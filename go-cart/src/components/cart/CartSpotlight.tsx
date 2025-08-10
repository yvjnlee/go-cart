import { useEffect, useMemo, useState } from 'react'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../../types'
import { getOrGenerateCartProfileCopy, getCachedCartProfileCopy, prefetchCartProfileCopy, type CartProfileCopy } from '../../services/fal.service'
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
                    <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="-mt-10 px-5">
                      <div className="h-20 w-20 rounded-full border-4 border-white bg-gray-200" />
                    </div>
                    <div className="p-5 pt-2">
                      <div className="text-xl font-semibold">Cart profile</div>
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

              {/* Product sections - full width cards stacked */}
              <section className="p-4 space-y-6 pb-28">
                {baseProducts.map(p => {
                  const { inCart, index } = isInCart(p.id)
                  return (
                    <article key={p.id} className="mx-auto w-full max-w-2xl bg-white border rounded-2xl overflow-hidden shadow-sm">
                      <div className="w-full bg-gray-100">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title || 'Product'} className="w-full h-[280px] sm:h-[360px] object-cover" />
                        ) : (
                          <div className="w-full h-[280px] sm:h-[360px] bg-gray-100" />)
                        }
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">{p.title || p.id}</div>
                            <div className="text-sm text-gray-600">{p.priceCurrencyCode || 'USD'} {p.priceAmount ?? '-'}</div>
                          </div>
                          {inCart ? (
                            <button className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700" onClick={() => onRemoveItem(index)}>Remove</button>
                          ) : (
                            <button className="text-xs px-3 py-1.5 rounded-md bg-[#5A31F4] text-white" onClick={() => onAddItem({ product: p, quantity: 1 })}>Add</button>
                          )}
                        </div>
                        <div className="mt-3 text-[13px] text-gray-900">{copy.productTaglines[p.id]}</div>
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


