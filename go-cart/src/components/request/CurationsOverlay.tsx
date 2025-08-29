import { useEffect, useState, useRef } from 'react'
import type { CartItem, CartItemProductSnapshot, ShoppingRequest } from '../../types'
import { browseService, type BrowseStore } from '../../services/browse.service'
import { CartItemList } from '../cart/CartItemList'

interface Props {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
}

type Screen = 'browse' | 'cart'

export default function CurationsOverlay({ request, items, onAddItem, onRemoveItem, onClose }: Props) {
  const [products, setProducts] = useState<CartItemProductSnapshot[]>([])
  const [stores, setStores] = useState<BrowseStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentScreen, setCurrentScreen] = useState<Screen>('browse')
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    
    browseService.getBrowseData()
      .then(({ products, stores }) => {
        if (cancelled) return
        setProducts(products)
        setStores(stores)
      })
      .catch(err => { 
        if (!cancelled) setError(err?.message || 'Failed to load browse data') 
      })
      .finally(() => { 
        if (!cancelled) setLoading(false) 
      })
    
    return () => { cancelled = true }
  }, [request])

  // Handle touch/mouse events for swiping
  const handleStart = (clientX: number) => {
    startXRef.current = clientX
    setIsDragging(true)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || startXRef.current === null) return
    
    const deltaX = clientX - startXRef.current
    const maxDrag = 300 // Maximum drag distance
    const clampedDelta = Math.max(-maxDrag, Math.min(maxDrag, deltaX))
    setDragX(clampedDelta)
  }

  const handleEnd = () => {
    if (!isDragging || startXRef.current === null) return
    
    const threshold = 80 // Minimum drag distance to trigger screen change
    
    if (dragX > threshold && currentScreen === 'cart') {
      setCurrentScreen('browse')
    } else if (dragX < -threshold && currentScreen === 'browse') {
      setCurrentScreen('cart')
    }
    
    setDragX(0)
    setIsDragging(false)
    startXRef.current = null
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
      handleMove(e.clientX)
    }
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
      const handleGlobalMouseUp = () => handleEnd()
      
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
    return undefined
  }, [isDragging, dragX, currentScreen])

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
          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{p.title || p.id}</div>
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

  const translateX = currentScreen === 'browse' ? dragX : -100 + (dragX / 3)
  const cartTranslateX = currentScreen === 'cart' ? dragX : 100 + (dragX / 3)

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 max-h-[92vh] overflow-hidden">
        {/* Header with navigation tabs */}
        <div className="p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-base font-semibold">Shop for "{request.title}"</h4>
              <p className="text-xs text-gray-500">Budget ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</p>
            </div>
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
          </div>
          
          {/* Navigation tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentScreen('browse')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                currentScreen === 'browse' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setCurrentScreen('cart')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                currentScreen === 'cart' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Your Cart ({items.length})
            </button>
          </div>
        </div>

        {/* Swipeable content container */}
        <div 
          ref={containerRef}
          className="relative w-full h-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'none' }}
        >
          {/* Browse Screen */}
          <div 
            className="absolute inset-0 w-full h-full overflow-y-auto"
            style={{ 
              transform: `translateX(${translateX}%)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : (
              <div className="p-4 space-y-6">
                <section>
                  <div className="mb-2 px-0.5">
                    <h5 className="text-sm font-semibold text-gray-900">Stores</h5>
                  </div>
                  <div className="-mx-1 overflow-x-auto">
                    <div className="px-1 flex gap-3">
                      {stores.map((s, idx) => (
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
                    {products.map((p, idx) => {
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

          {/* Cart Screen */}
          <div 
            className="absolute inset-0 w-full h-full overflow-y-auto"
            style={{ 
              transform: `translateX(${cartTranslateX}%)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            <div className="p-4">
              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs text-gray-400 mt-1">Browse products to add items</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {items.length} item{items.length !== 1 ? 's' : ''} in your cart
                  </div>
                  <CartItemList items={items} onRemove={onRemoveItem} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


