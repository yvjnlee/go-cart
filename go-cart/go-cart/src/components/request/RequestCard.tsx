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
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02] group"
      disabled={!isOpen}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5A31F4] transition-colors">{request.title}</h3>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{request.description}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-600">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13 5V7H11V5L9 4L3 7V9H21ZM2 10V12H4V22H20V12H22V10H2Z"/>
              </svg>
              <span className="text-xs font-semibold text-green-700">${request.budget}</span>
            </div>
            {request.occasion ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
                  <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z"/>
                </svg>
                <span className="text-xs font-semibold text-purple-700">{request.occasion}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
              isOpen 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#5A31F4] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 group-hover:text-white transition-colors">
              <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}


