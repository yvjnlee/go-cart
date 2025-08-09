import type { ShoppingRequest } from '../../types'

interface Props {
  request: ShoppingRequest
  onSelect?: (requestId: string) => void
}

export function RequestCard({ request, onSelect }: Props) {
  const isOpen = request.status === 'open'

  return (
    <button
      onClick={() => onSelect?.(request.id)}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
      disabled={!isOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{request.title}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.description}</p>
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span>Budget: ${request.budget}</span>
            {request.occasion ? <span>Occasion: {request.occasion}</span> : null}
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded ${
            isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
          }`}
        >
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
    </button>
  )
}


