interface Props {
  current: 'feed' | 'shoppingRequests'
  onNavigate: (view: 'feed' | 'shoppingRequests') => void
}

export function OverlayNav({ current, onNavigate }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3">
      <div className="backdrop-blur-md bg-black/30 border border-white/20 rounded-full shadow-sm px-1 py-1 pointer-events-auto flex gap-1">
        <button
          onClick={() => onNavigate('feed')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            current === 'feed' ? 'bg-white text-gray-900' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => onNavigate('shoppingRequests')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            current === 'shoppingRequests' ? 'bg-white text-gray-900' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          Requests
        </button>
      </div>
    </div>
  )
}


