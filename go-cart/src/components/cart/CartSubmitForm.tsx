import { useState } from 'react'
import type { CartItem } from '../../types'
import { cartsService } from '../../services/cart.service'

interface Props {
  requestId: string
  items: CartItem[]
  onSubmitted?: (cartId: string) => void
}

export function CartSubmitForm({ requestId, items, onSubmitted }: Props) {
  const [reasoning, setReasoning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = items.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    const submitted = await cartsService.submit({
      requestId,
      items,
      reasoning: reasoning.trim() || undefined,
    })
    setIsSubmitting(false)
    setReasoning('')
    onSubmitted?.(submitted.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Why this cart? (optional)</label>
        <textarea
          value={reasoning}
          onChange={e => setReasoning(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={3}
          placeholder="Explain your choices"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            canSubmit && !isSubmitting ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Cart'}
        </button>
      </div>
    </form>
  )
}


