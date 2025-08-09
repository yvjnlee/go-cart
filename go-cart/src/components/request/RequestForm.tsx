import { useState } from 'react'
import { requestsService } from '../../services/request.service'

interface Props {
  onCreated?: (requestId: string) => void
}

export function RequestForm({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [occasion, setOccasion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = title.trim() && description.trim() && typeof budget === 'number'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    const created = await requestsService.create({
      title: title.trim(),
      description: description.trim(),
      budget: budget as number,
      occasion: occasion.trim() || undefined,
    })
    setIsSubmitting(false)
    setTitle('')
    setDescription('')
    setBudget('')
    setOccasion('')
    onCreated?.(created.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="e.g., Gift for my sister"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={3}
          placeholder="Interests, size, preferences, etc."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Occasion (optional)</label>
          <input
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Birthday, anniversary, etc."
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            canSubmit && !isSubmitting ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {isSubmitting ? 'Creating…' : 'Create Request'}
        </button>
      </div>
    </form>
  )
}


