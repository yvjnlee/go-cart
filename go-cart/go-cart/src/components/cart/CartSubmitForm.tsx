import { useState } from 'react'
import type { CartItem } from '../../types'
import { cartsService } from '../../services/cart.service'

interface Props {
  requestId: string
  items: CartItem[]
  onSubmitted?: (cartId: string) => void
}

export function CartSubmitForm({ requestId, items, onSubmitted }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = items.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    const submitted = await cartsService.submit({
      requestId,
      items,
      reasoning: undefined,
    })
    setIsSubmitting(false)
    onSubmitted?.(submitted.id)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            canSubmit && !isSubmitting ? 'bg-[#5A31F4] text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {isSubmitting ? 'Submitting…' : 'Submit cart'}
        </button>
      </div>
    </form>
  )
}


