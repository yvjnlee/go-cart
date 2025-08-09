interface Props {
  current: 'feed' | 'shoppingRequests'
  onNavigate: (view: 'feed' | 'shoppingRequests') => void
}

export function NavBar({ current, onNavigate }: Props) {
  // Renamed component exported as NavBar for clarity
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3">
      <div className="backdrop-blur-xl bg-white/15 border border-white/25 ring-1 ring-black/10 rounded-full p-0.5 overflow-hidden pointer-events-auto flex gap-0.5">
        <button
          onClick={() => onNavigate('feed')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            current === 'feed' ? 'bg-white/90 text-gray-900' : 'text-white hover:bg-white/10'
          }`}
        >
          {current === 'feed' ? 'Feed' : <span className="mix-blend-difference">Feed</span>}
        </button>
        <button
          onClick={() => onNavigate('shoppingRequests')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            current === 'shoppingRequests' ? 'bg-white/90 text-gray-900' : 'text-white hover:bg-white/10'
          }`}
        >
          {current === 'shoppingRequests' ? 'Requests' : <span className="mix-blend-difference">Requests</span>}
        </button>
      </div>
    </div>
  )
}


