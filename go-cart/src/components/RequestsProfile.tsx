import { useEffect, useMemo, useState } from 'react'
import type { ShoppingRequest } from '../types'
import { requestsService } from '../services/request.service'
import PostComposer from './PostComposer'
import RequestDetailOverlay from './requests/RequestDetailOverlay'

export default function RequestsProfile() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)
  const [selected, setSelected] = useState<ShoppingRequest | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')

  useEffect(() => {
    requestsService.list().then(setRequests)
  }, [])

  // Per-request data is fetched in child overlay

  const activeRequests = useMemo(() => (requests || []).filter(r => r.status === 'open'), [requests])
  const pastRequests = useMemo(() => (requests || []).filter(r => r.status !== 'open'), [requests])
  const filtered = useMemo(() => {
    if (!requests) return null
    if (filter === 'all') return requests
    if (filter === 'open') return activeRequests
    return pastRequests
  }, [requests, filter, activeRequests, pastRequests])

  return (
    <div className="h-full w-full overflow-y-auto p-4 pt-20 sm:pt-24 pb-28">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Your requests</h2>
              <p className="text-sm text-white/60">Create and manage your posts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 mr-2 text-white/90">
              <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs">
                Live: <span className="font-semibold text-white">{activeRequests.length}</span>
              </div>
              <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs">
                Expired: <span className="font-semibold text-white">{pastRequests.length}</span>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/90 text-gray-900 hover:bg-white whitespace-nowrap shrink-0"
              onClick={() => setShowComposer(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
              New request
            </button>
          </div>
        </div>
        <div className="mt-3">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 p-0.5 text-xs text-white/80">
            <button
              className={`px-3 py-1 rounded-full ${filter==='all' ? 'bg-white/90 text-gray-900' : 'hover:bg-white/10'}`}
              onClick={() => setFilter('all')}
            >All ({requests?.length ?? 0})</button>
            <button
              className={`px-3 py-1 rounded-full ${filter==='open' ? 'bg-white/90 text-gray-900' : 'hover:bg-white/10'}`}
              onClick={() => setFilter('open')}
            >Live ({activeRequests.length})</button>
            <button
              className={`px-3 py-1 rounded-full ${filter==='closed' ? 'bg-white/90 text-gray-900' : 'hover:bg-white/10'}`}
              onClick={() => setFilter('closed')}
            >Expired ({pastRequests.length})</button>
          </div>
        </div>
      </header>

      {/* Tabs removed for a unified grid view */}

      {requests === null ? (
        <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
      ) : filtered && filtered.length > 0 ? (
        <RequestsGrid list={filtered} onSelect={setSelected} />
      ) : (
        <div className="h-[50vh] flex items-center justify-center">
          <div className="text-center text-white/80">
            <div className="text-lg font-medium mb-1">No requests yet</div>
            <div className="text-sm text-white/60 mb-3">Create your first request to get curated carts.</div>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/90 text-gray-900 hover:bg-white whitespace-nowrap shrink-0"
              onClick={() => setShowComposer(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
              New request
            </button>
          </div>
        </div>
      )}

      {selected && (
        <RequestDetailOverlay request={selected} onClose={() => setSelected(null)} />
      )}

      {showComposer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowComposer(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Create a request/post</h3>
              <button className="text-sm text-gray-600" onClick={() => setShowComposer(false)}>Close</button>
            </div>
            <PostComposer />
          </div>
        </div>
      )}
    </div>
  )
}

function RequestsGrid({ list, onSelect }: { list: ShoppingRequest[]; onSelect: (r: ShoppingRequest) => void }) {
  if (list.length === 0) return <p className="text-sm text-white/70">No requests.</p>
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
      {list.map(r => (
        <li key={r.id}>
          <RequestTile request={r} onClick={() => onSelect(r)} />
        </li>
      ))}
    </ul>
  )
}

function RequestTile({ request, onClick }: { request: ShoppingRequest; onClick: () => void }) {
  const media = request.media
  const isVideo = media?.type === 'video' && !!media.urls?.[0]
  const isImage = media?.type === 'image' && !!media.urls?.[0]
  const coverUrl = isImage || isVideo ? media!.urls![0] : null

  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-lg bg-white/[0.07] border border-white/10 hover:border-white/30 transition"
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={request.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 p-2 flex items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-white/85 line-clamp-4">{request.description || request.title}</p>
        </div>
      )}
      {/* 3:4 aspect ratio wrapper using padding-top trick */}
      <div className="invisible">
        <div className="pt-[133.333%]" />
      </div>
      {/* gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      {/* live/ended badge */}
      <span
        className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${request.status==='open' ? 'bg-green-400/20 text-green-200 border-green-300/30' : 'bg-white/10 text-white/80 border-white/20'}`}
      >
        {request.status === 'open' ? 'Live' : 'Expired'}
      </span>
      {/* video icon */}
      {isVideo ? (
        <span className="absolute top-1.5 right-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h14a2 2 0 012 2v2l4-2v10l-4-2v2a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z"></path></svg>
        </span>
      ) : null}
      {/* no title/text on preview grid */}
    </button>
  )
}