import { useState } from 'react'
import type { CartItemProductSnapshot, CartItem } from '../../types'

interface Props {
  onAdd: (item: CartItem) => void
}

export function CartItemEditor({ onAdd }: Props) {
  const [productId, setProductId] = useState('')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [priceAmount, setPriceAmount] = useState<number | ''>('')
  const [priceCurrencyCode, setPriceCurrencyCode] = useState('USD')
  const [quantity, setQuantity] = useState<number | ''>('')

  const canAdd = productId.trim() && typeof priceAmount === 'number' && typeof quantity === 'number'

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdd) return
    const product: CartItemProductSnapshot = {
      id: productId.trim(),
      title: title.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      priceAmount: priceAmount as number,
      priceCurrencyCode: priceCurrencyCode || 'USD',
    }
    onAdd({ product, quantity: quantity as number })
    setProductId('')
    setTitle('')
    setImageUrl('')
    setPriceAmount('')
    setPriceCurrencyCode('USD')
    setQuantity('')
  }

  return (
    <form onSubmit={handleAdd} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product ID</label>
          <input
            value={productId}
            onChange={e => setProductId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="shopify product id"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title (optional)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Image URL (optional)</label>
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price Amount</label>
          <input
            type="number"
            value={priceAmount}
            onChange={e => setPriceAmount(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <input
            value={priceCurrencyCode}
            onChange={e => setPriceCurrencyCode(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="USD"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canAdd}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            canAdd ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          Add Item
        </button>
      </div>
    </form>
  )
}


