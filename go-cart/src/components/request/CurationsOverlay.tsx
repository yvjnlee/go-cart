import { useEffect, useMemo, useState } from 'react'
import { useProductSearch } from '@shopify/shop-minis-react'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../../types'
import { curationService, type CuratedStore } from '../../services/curation.service'
import { generateProductSearchQuery } from '../../services/fal.service'

interface Props {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
}

export default function CurationsOverlay({ request, items, onAddItem, onRemoveItem, onClose }: Props) {
  // (Tags no longer required; search will use AI query directly)

  // AI query + Minis product search
  const [searchQuery, setSearchQuery] = useState<string>('')
  useEffect(() => {
    let cancelled = false
    generateProductSearchQuery(request).then((q) => { if (!cancelled) setSearchQuery(q) })
    return () => { cancelled = true }
  }, [request])
  const { products: minisProducts, loading: minisLoading, error: minisError } = useProductSearch({
    handle: request.id,
    query: searchQuery,
    skip: !searchQuery,
  } as any)

  const productSnapshots: CartItemProductSnapshot[] = useMemo(() => {
    const products = minisProducts ?? []
    const mapped: CartItemProductSnapshot[] = products.map((p: any) => ({
      id: String(p?.id ?? ''),
      title: String(p?.title ?? ''),
      imageUrl: p?.featuredImage?.url ?? undefined,
      priceAmount: p?.price?.amount != null ? Number(p.price.amount) : undefined,
      priceCurrencyCode: p?.price?.currencyCode ?? 'USD',
    }))
    const seen = new Set<string>()
    return mapped.filter(p => {
      if (!p.id || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [minisProducts])

  // Stores (optional): fetch from curation service when available
  const [stores, setStores] = useState<CuratedStore[] | null>(null)
  useEffect(() => {
    let cancelled = false
    curationService.getCuratedStores(request).then((res) => { if (!cancelled) setStores(res) })
    return () => { cancelled = true }
  }, [request])

  function SimpleProductTile({ p, inCartIdx }: { p: CartItemProductSnapshot; inCartIdx: number }) {
    return (
      <div className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        <div className="w-full bg-gray-100 aspect-[4/5]">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.title || 'Product'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
        </div>
        <div className="p-3">
          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{p.title || 'Product'}</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="text-[13px] text-gray-600">{p.priceCurrencyCode || 'USD'} {p.priceAmount ?? '-'}</div>
            <div>
              {inCartIdx >= 0 ? (
                <button className="text-[11px] px-2 py-1 rounded-md border border-gray-300 bg-white/95 shadow-sm hover:bg-white" onClick={() => onRemoveItem(inCartIdx)}>Remove</button>
              ) : (
                <button className="text-[11px] px-2 py-1 rounded-md bg-[#5A31F4] text-white shadow-sm hover:bg-[#4E28D6]" onClick={() => onAddItem({ product: p, quantity: 1 })}>Add</button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function SimpleStoreTile({ name, imageUrl }: { name: string; imageUrl?: string }) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-400 text-sm">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span>{name.slice(0,1)}</span>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-600 mt-0.5">Store</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b sticky top-0 bg-white z-20 flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold">Shop for “{request.title}”</h4>
            <p className="text-xs text-gray-500">Budget ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
        </div>

        {minisLoading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
        ) : minisError ? (
          <div className="p-4 text-sm text-red-600">{String(minisError)}</div>
        ) : (
          <div className="p-4 space-y-6">
            <section>
              <div className="mb-2 px-0.5">
                <h5 className="text-sm font-semibold text-gray-900">Stores</h5>
              </div>
              <div className="-mx-1 overflow-x-auto">
                <div className="px-1 flex gap-3">
                  {(stores ?? []).map((s, idx) => (
                    <div key={`s-${idx}`} className="w-40 shrink-0">
                      <SimpleStoreTile name={s.name} imageUrl={s.imageUrl} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
            <section>
              <div className="mb-2 px-0.5">
                <h5 className="text-sm font-semibold text-gray-900">Products</h5>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {productSnapshots.map((p, idx) => {
                  const inCartIdx = items.findIndex(it => it.product.id === p.id)
                  return (
                    <div key={`p-${idx}`} className="relative">
                      <SimpleProductTile p={p} inCartIdx={inCartIdx} />
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}


