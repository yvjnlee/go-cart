import type { CartItem } from '../../types'

interface Props {
  items: CartItem[]
  onRemove: (index: number) => void
}

export function CartItemList({ items, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No items yet</p>
        <p className="text-xs text-gray-500 mt-1">Items you add will appear here</p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-4">
      {items.map((it, idx) => (
        <li key={idx} className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="aspect-square bg-gray-50 flex items-center justify-center">
            {it.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.product.imageUrl} alt={it.product.title || 'Product'} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-900 truncate mb-1">{it.product.title || 'Product'}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white bg-[#5A31F4] px-2 py-0.5 rounded-full font-medium">Qty {it.quantity}</span>
              <span className="text-sm font-bold text-gray-900">{it.product.priceCurrencyCode || 'USD'} {it.product.priceAmount ?? '-'}</span>
            </div>
          </div>
          <button
            onClick={() => onRemove(idx)}
            aria-label="Remove"
            title="Remove"
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center bg-white/95 border border-gray-200 rounded-full text-red-500 hover:bg-white hover:text-red-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.3 5.71L12 12.01 5.7 5.7 4.29 7.11l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.29 1.41-1.41-6.29-6.29 6.3-6.3z"/>
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}


