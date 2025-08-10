import { useEffect, useRef, useState } from 'react'
import { requestsService } from '../services/request.service'
import type { CartItem, ShoppingRequest } from '../types'
import ReelCard from './feed/ReelCard'
import BuilderOverlay from './request/BuilderOverlay'
import CurationsOverlay from './request/CurationsOverlay'

export function RequestFeed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ShoppingRequest | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [showCurated, setShowCurated] = useState(false)
  const scrollFeedRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    requestsService.list().then(setRequests)
  }, [])

  useEffect(() => {
    setItems([])
  }, [selectedRequest?.id])

  if (requests === null) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No requests yet.</div>
  }

  return (
    <div className="relative h-full">
      <div
        className="h-full overflow-y-auto snap-y snap-mandatory"
        ref={scrollFeedRef}
        onScroll={() => {
          const el = scrollFeedRef.current
          if (!el) return
          const containerHeight = el.clientHeight || 1
          const index = Math.round(el.scrollTop / containerHeight)
          if (index !== activeIndex) setActiveIndex(index)
        }}
      >
        {requests.map((req, i) => (
          <div key={req.id} className="snap-start h-full">
            <ReelCard
              request={req}
              isActive={i === activeIndex}
              onShop={() => {
                setSelectedRequest(req)
                setShowCurated(true)
              }}
            />
          </div>
        ))}
      </div>

      {selectedRequest && showCurated ? (
        <CurationsOverlay
          request={selectedRequest}
          items={items}
          onAddItem={it => setItems(prev => [...prev, it])}
          onRemoveItem={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => { setShowCurated(false); setSelectedRequest(null) }}
        />
      ) : null}

      {selectedRequest && !showCurated ? (
        <BuilderOverlay
          request={selectedRequest}
          items={items}
          onAddItem={it => setItems(prev => [...prev, it])}
          onRemoveItem={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => setSelectedRequest(null)}
          onSubmitted={() => setSelectedRequest(null)}
        />
      ) : null}
    </div>
  )
}

export default RequestFeed
 