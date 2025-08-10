import type { CartItem } from '../../types'

interface Props {
  items: CartItem[]
  onRemove: (index: number) => void
}

export function CartItemList({ items, onRemove }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 text-center">No items yet</p>
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((it, idx) => (
        <li key={idx} className="relative bg-white border border-gray-200 rounded-md overflow-hidden">
          <div className="aspect-square bg-gray-50 flex items-center justify-center">
            {it.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.product.imageUrl} alt={it.product.title || 'Product'} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-100" />
            )}
          </div>
          <div className="p-2">
            <p className="text-sm font-medium text-gray-800 truncate">{it.product.title || it.product.id}</p>
            <p className="text-xs text-gray-500">Qty {it.quantity} · {it.product.priceCurrencyCode || 'USD'} {it.product.priceAmount ?? '-'}</p>
          </div>
          <button
            onClick={() => onRemove(idx)}
            aria-label="Remove"
            title="Remove"
            className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-white/90 border border-gray-200 rounded-full text-red-600 hover:bg-white shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 3a1 1 0 00-1 1v1H5v2h14V5h-3V4a1 1 0 00-1-1H9zm1 2h4V4h-4v1z" />
              <path d="M7 9h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z" />
              <path d="M6 7h12v2H6V7z" fill="none" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}


