import { useEffect, useState } from 'react'
import { requestsService } from '../../services/request.service'
import type { ShoppingRequest } from '../../types'
import { RequestCard } from './RequestCard'

interface Props {
  onSelect: (requestId: string) => void
}

export function RequestList({ onSelect }: Props) {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null)

  useEffect(() => {
    requestsService.list().then(setRequests)
  }, [])

  if (requests === null) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">No requests yet. Create one above.</p>
  }

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <RequestCard key={req.id} request={req} onSelect={onSelect} />
      ))}
    </div>
  )
}


