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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900">Create New Request</h2>
        <p className="text-sm text-gray-600">Tell us what you're looking for and we'll help you find it</p>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#5A31F4] focus:ring-2 focus:ring-[#5A31F4]/20 transition-all"
          placeholder="e.g., Gift for my sister"
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#5A31F4] focus:ring-2 focus:ring-[#5A31F4]/20 transition-all resize-none"
          rows={4}
          placeholder="Tell us about their interests, style preferences, size, colors they like, etc."
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">Budget ($)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-sm focus:border-[#5A31F4] focus:ring-2 focus:ring-[#5A31F4]/20 transition-all"
              min={0}
              placeholder="100"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">Occasion <span className="text-gray-500 font-normal">(optional)</span></label>
          <input
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#5A31F4] focus:ring-2 focus:ring-[#5A31F4]/20 transition-all"
            placeholder="Birthday, anniversary, etc."
          />
        </div>
      </div>
      
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
            canSubmit && !isSubmitting 
              ? 'bg-gradient-to-r from-[#5A31F4] to-[#6E3AFF] text-white hover:from-[#4E28D6] hover:to-[#5E2FD1] shadow-lg hover:shadow-xl transform hover:scale-105' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Create Request
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  )
}


