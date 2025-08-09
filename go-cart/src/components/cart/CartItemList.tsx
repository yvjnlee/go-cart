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
            className="absolute top-2 right-2 text-xs bg-white/80 border border-gray-200 rounded px-2 py-1 text-red-600 hover:bg-white"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}


