export type RequestStatus = 'open' | 'closed'

export type MediaType = 'video' | 'image' | 'text'

export interface RequestMedia {
  type: MediaType
  urls?: string[]
  text?: string
}

export interface ShoppingRequest {
  id: string
  title: string
  description: string
  budget: number
  occasion?: string
  status: RequestStatus
  createdAt: string
  media?: RequestMedia
}

export interface CartItemProductSnapshot {
  id: string
  title?: string
  imageUrl?: string
  priceAmount?: number
  priceCurrencyCode?: string
}

export interface CartItem {
  product: CartItemProductSnapshot
  quantity: number
}

export interface SubmittedCart {
  id: string
  requestId: string
  items: CartItem[]
  reasoning?: string
  submittedAt: string
}

export interface OrderRecord {
  id: string
  requestId: string
  items: CartItem[]
  purchasedAt: string
}


