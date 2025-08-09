import { useEffect, useMemo, useState } from 'react'
import { requestsService } from '../services/requestsService'
import type { CartItem, ShoppingRequest } from '../types'
import { CartItemEditor } from './cart/CartItemEditor'
import { CartItemList } from './cart/CartItemList'
import { CartSubmitForm } from './cart/CartSubmitForm'

export function Feed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ShoppingRequest | null>(null)
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    requestsService.list().then(setRequests)
  }, [])

  useEffect(() => {
    setItems([])
  }, [selectedRequest?.id])

  if (requests === null) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No requests yet.</div>
  }

  return (
    <div className="relative">
      <div className="h-[calc(100vh-6rem)] overflow-y-auto snap-y snap-mandatory">
        {requests.map(req => (
          <div key={req.id} className="snap-start h-[calc(100vh-6rem)]">
            <ReelCard request={req} onShop={() => setSelectedRequest(req)} />
          </div>
        ))}
      </div>

      {selectedRequest ? (
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

function ReelCard({ request, onShop }: { request: ShoppingRequest; onShop: () => void }) {
  const [showDetails, setShowDetails] = useState(false)
  const media = request.media

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {media ? (
        media.type === 'video' && media.urls?.[0] ? (
          <video
            src={media.urls[0]}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            onClick={() => setShowDetails(true)}
          />
        ) : media.type === 'image' && media.urls && media.urls.length > 0 ? (
          <div className="absolute inset-0 w-full h-full overflow-x-auto flex snap-x snap-mandatory" onClick={() => setShowDetails(true)}>
            {media.urls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={u}
                alt={`image ${i + 1}`}
                className="h-full w-full object-cover flex-shrink-0 snap-start"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center p-6" onClick={() => setShowDetails(true)}>
            <p className="text-gray-700 text-center text-sm whitespace-pre-wrap max-w-prose">{request.description}</p>
          </div>
        )
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-sm" onClick={() => setShowDetails(true)}>
          No media
        </div>
      )}

      <button
        className="absolute bottom-20 right-4 z-10 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white shadow"
        onClick={onShop}
      >
        Shop for them
      </button>

      <div
        className="absolute inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        onClick={() => setShowDetails(true)}
      >
        <h3 className="text-white font-semibold text-base">{request.title}</h3>
        <p className="text-white/90 text-sm line-clamp-2">{request.description}</p>
        <div className="text-white/70 text-xs mt-1">Budget: ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</div>
      </div>

      {showDetails ? (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-md">
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="bg-white/10 rounded-xl border border-white/20 p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold">{request.title}</h4>
                  <div className="text-xs text-white/80 mt-1">Budget: ${request.budget}{request.occasion ? ` · ${request.occasion}` : ''}</div>
                </div>
                <button className="text-sm text-white/80" onClick={() => setShowDetails(false)}>Close</button>
              </div>
              <p className="text-sm mt-3 whitespace-pre-wrap">{request.description}</p>
              <div className="mt-4 flex gap-2">
                <button className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white" onClick={onShop}>Shop for them</button>
                <button className="px-3 py-2 rounded-md text-sm bg-white/20 text-white" onClick={() => setShowDetails(false)}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function BuilderOverlay({
  request,
  items,
  onAddItem,
  onRemoveItem,
  onClose,
  onSubmitted,
}: {
  request: ShoppingRequest
  items: CartItem[]
  onAddItem: (it: CartItem) => void
  onRemoveItem: (idx: number) => void
  onClose: () => void
  onSubmitted: () => void
}) {
  const canSubmit = useMemo(() => items.length > 0, [items])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-base font-semibold">Curate for “{request.title}”</h4>
            <p className="text-xs text-gray-500">Build a moodboard and submit</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
        </div>

        <div className="space-y-3">
          <CartItemEditor onAdd={onAddItem} />
          <CartItemList items={items} onRemove={onRemoveItem} />
          <CartSubmitForm
            requestId={request.id}
            items={items}
            onSubmitted={() => {
              onSubmitted()
            }}
          />
          {!canSubmit ? (
            <p className="text-xs text-gray-500 text-center">Add at least one item to submit.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}