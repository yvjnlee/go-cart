import { useMemo } from 'react'
import type { CartItem, ShoppingRequest } from '../../types'
import { CartItemEditor } from '../cart/CartItemEditor'
import { CartItemList } from '../cart/CartItemList'
import { CartSubmitForm } from '../cart/CartSubmitForm'

interface Props {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
  onSubmitted: () => void
}

export default function BuilderOverlay({ request, items, onAddItem, onRemoveItem, onClose, onSubmitted }: Props) {
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


