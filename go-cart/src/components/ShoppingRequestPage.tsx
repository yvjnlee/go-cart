import { useEffect, useMemo, useState } from 'react'
import { RequestForm } from './requests/RequestForm'
import { RequestList } from './requests/RequestList'
import { cartsService } from '../services/cartsService'
import type { CartItem } from '../types'
import { CartItemEditor } from './cart/CartItemEditor'
import { CartItemList } from './cart/CartItemList'
import { CartSubmitForm } from './cart/CartSubmitForm'

interface Props {
  onBack?: () => void
}

export function ShoppingRequestPage({ onBack }: Props) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [submittedCount, setSubmittedCount] = useState<number>(0)

  useEffect(() => {
    // Reset items when switching requests
    setItems([])
  }, [selectedRequestId])

  const canSubmit = useMemo(() => items.length > 0 && !!selectedRequestId, [items, selectedRequestId])

  function handleAddItem(item: CartItem) {
    setItems(prev => [...prev, item])
  }

  function handleRemoveItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmitted() {
    // Just refresh some UI; in a real app you might navigate or show toast
    setSubmittedCount(c => c + 1)
    setItems([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Shopping Requests</h2>
        {onBack ? (
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-800">Back</button>
        ) : null}
      </div>

      <RequestForm onCreated={setSelectedRequestId} />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Browse Requests</h3>
        <RequestList onSelect={setSelectedRequestId} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Build Cart {selectedRequestId ? `(for ${selectedRequestId})` : ''}</h3>
        {selectedRequestId ? (
          <div className="space-y-3">
            <CartItemEditor onAdd={handleAddItem} />
            <CartItemList items={items} onRemove={handleRemoveItem} />
            <CartSubmitForm
              requestId={selectedRequestId}
              items={items}
              onSubmitted={handleSubmitted}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Select a request to start building a cart.</p>
        )}
      </div>

      <SubmittedCartsSummary requestId={selectedRequestId} refreshKey={submittedCount} />
    </div>
  )
}

function SubmittedCartsSummary({ requestId, refreshKey }: { requestId: string | null, refreshKey: number }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!requestId) {
      setCount(null)
      return
    }
    cartsService.listByRequest(requestId).then(list => setCount(list.length))
  }, [requestId, refreshKey])

  if (!requestId) return null

  return (
    <div className="text-xs text-gray-500 text-center">Submitted carts for this request: {count ?? '…'}</div>
  )
}


