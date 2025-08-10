import { storage, generateId } from './storage'
import { ShoppingRequest } from '../types'

// Backend API Models
interface ApiRequestResponse {
  request_id: string
  shopify_user_id: string
  query: string
  created_at: string
  updated_at: string
}

interface ApiCartResponse {
  cart_id: string
  request_id: string
  shopify_user_id: string
  created_at: string
  updated_at: string
}

interface ApiProductResponse {
  product_id: string
  shopify_product_id: string
  shopify_variant_id: string
}

interface ApiCartProductResponse {
  cart_id: string
  product_id: string
  created_at: string
  updated_at: string
}

interface ApiRequestTagResponse {
  tag_value: string
  request_id: string
  created_at: string
  updated_at: string
}

interface ApiRequestAssetResponse {
  request_asset_id: string
  request_id: string
  url: string
  created_at: string
  updated_at: string
}

// Create interfaces
interface RequestCreate {
  shopify_user_id: string
  query: string
}

interface CartCreate {
  request_id: string
  shopify_user_id: string
}

interface ProductCreate {
  shopify_product_id: string
  shopify_variant_id: string
}

interface CartProductCreate {
  cart_id: string
  product_id: string
}

interface RequestTagCreate {
  tag_value: string
  request_id: string
}

interface RequestAssetCreate {
  request_id: string
  file_key: string
}

// Update interfaces
interface RequestUpdate {
  shopify_user_id?: string
  query?: string
}

interface CartUpdate {
  request_id?: string
  shopify_user_id?: string
}

interface ProductUpdate {
  shopify_product_id?: string
  shopify_variant_id?: string
}

interface RequestAssetUpdate {
  request_id?: string
  file_key?: string
}

const API_BASE_URL = (window as any).__API_BASE_URL__ || (import.meta as any)?.env?.VITE_API_BASE_URL || 'https://macbook-air.brumby-ratio.ts.net'

function mapApiToShoppingRequest(r: ApiRequestResponse): ShoppingRequest {
  // Minimal mapping: map backend "query" to our demo title/description fields
  return {
    id: r.request_id,
    title: r.query.slice(0, 60) || 'Shopping request',
    description: r.query,
    budget: 0,
    status: 'open',
    createdAt: r.created_at,
  }
}

async function seedDemoRequests(): Promise<ShoppingRequest[]> {
  const now = new Date()
  const demo: ShoppingRequest[] = [
    {
      id: generateId('req'),
      title: 'Cozy Fall Outfit Inspo',
      description: 'Looking for warm neutral-toned outfits for weekend brunch. Size M. Prefer wool/cashmere blends.',
      budget: 250,
      occasion: 'Weekend',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://images.unsplash.com/photo-1516822003754-cca485356ecb?q=80&w=1600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1600&auto=format&fit=crop',
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Minimalist Desk Setup',
      description: 'Need a clean desk setup with a lamp, organizers, and a plant. White/black, small budget.',
      budget: 150,
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
      media: {
        type: 'video',
        urls: ['https://www.w3schools.com/html/mov_bbb.mp4'],
      },
    },
    {
      id: generateId('req'),
      title: 'Gift for sister (college)',
      description: 'She loves stationery, tote bags, and pastel colors.',
      budget: 60,
      occasion: 'Birthday',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      media: {
        type: 'text',
      },
    },
    {
      id: generateId('req'),
      title: 'Game Night Snack Haul',
      description: 'Hosting friends this Friday — need a mix of salty and sweet snacks, preferably locally made or unique finds. Budget is for all snacks combined.',
      budget: 60,
      occasion: 'Party',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 12).toISOString(),
      media: {
        type: 'video',
        urls: [
          'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_30fps.mp4'
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Minimalist Desk Setup',
      description: 'Looking for a sleek white + wood desk setup for a small apartment. Items can include desk, chair, monitor stand, and organizers.',
      budget: 400,
      occasion: 'Home Office',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73e?q=80&w=1600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1616627981806-9bfc1fbc9dfb?q=80&w=1600&auto=format&fit=crop',
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Streetwear Sneaker Hunt',
      description: 'Hunting for high-top sneakers in bold colors. US size 10. Prefer limited editions or unique designs.',
      budget: 200,
      occasion: 'Casual',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1600&auto=format&fit=crop',
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Cozy Reading Nook Essentials',
      description: 'Looking for a plush armchair, warm throw blanket, and a good floor lamp for winter reading.',
      budget: 300,
      occasion: 'Home Decor',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
      media: {
        type: 'video',
        urls: [
          'https://videos.pexels.com/video-files/3184336/3184336-uhd_2560_1440_25fps.mp4'
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Korean Skincare Starter Kit',
      description: 'Looking for beginner-friendly Korean skincare — cleanser, toner, serum, and moisturizer. Suitable for sensitive skin.',
      budget: 100,
      occasion: 'Self-care',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 240).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://images.unsplash.com/photo-1600180758890-6d0b97f5da5a?q=80&w=1600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1618477462257-92e9632d4b65?q=80&w=1600&auto=format&fit=crop',
        ],
      },
    },    
  ]
  await storage.saveRequests(demo)
  return demo
}

// Comprehensive API service for all endpoints
export const apiService = {
  // REQUESTS
  requests: {
    async list(): Promise<ApiRequestResponse[]> {
      const resp = await fetch(`${API_BASE_URL}/requests`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(id: string): Promise<ApiRequestResponse> {
      const resp = await fetch(`${API_BASE_URL}/requests/${id}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: RequestCreate): Promise<ApiRequestResponse> {
      const resp = await fetch(`${API_BASE_URL}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async update(id: string, data: RequestUpdate): Promise<ApiRequestResponse> {
      const resp = await fetch(`${API_BASE_URL}/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(id: string): Promise<{ message: string }> {
      const resp = await fetch(`${API_BASE_URL}/requests/${id}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },
  },

  // CARTS
  carts: {
    async list(): Promise<ApiCartResponse[]> {
      const resp = await fetch(`${API_BASE_URL}/carts`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(id: string): Promise<ApiCartResponse> {
      const resp = await fetch(`${API_BASE_URL}/carts/${id}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: CartCreate): Promise<ApiCartResponse> {
      const resp = await fetch(`${API_BASE_URL}/carts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async update(id: string, data: CartUpdate): Promise<ApiCartResponse> {
      const resp = await fetch(`${API_BASE_URL}/carts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(id: string): Promise<{ message: string }> {
      const resp = await fetch(`${API_BASE_URL}/carts/${id}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },
  },

  // PRODUCTS
  products: {
    async list(): Promise<ApiProductResponse[]> {
      const resp = await fetch(`${API_BASE_URL}/products`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(id: string): Promise<ApiProductResponse> {
      const resp = await fetch(`${API_BASE_URL}/products/${id}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: ProductCreate): Promise<ApiProductResponse> {
      const resp = await fetch(`${API_BASE_URL}/products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async update(id: string, data: ProductUpdate): Promise<ApiProductResponse> {
      const resp = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(id: string): Promise<{ message: string }> {
      const resp = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },
  },

  // CART PRODUCTS
  cartProducts: {
    async list(): Promise<ApiCartProductResponse[]> {
      const resp = await fetch(`${API_BASE_URL}/cart-products`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(cartId: string, productId: string): Promise<ApiCartProductResponse> {
      const resp = await fetch(`${API_BASE_URL}/cart-products/${cartId}/${productId}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: CartProductCreate): Promise<ApiCartProductResponse> {
      const resp = await fetch(`${API_BASE_URL}/cart-products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(cartId: string, productId: string): Promise<{ message: string }> {
      const resp = await fetch(`${API_BASE_URL}/cart-products/${cartId}/${productId}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },
  },

  // REQUEST TAGS
  requestTags: {
    async list(): Promise<ApiRequestTagResponse[]> {
      const resp = await fetch(`${API_BASE_URL}/request-tags`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(tagValue: string, requestId: string): Promise<ApiRequestTagResponse> {
      const resp = await fetch(`${API_BASE_URL}/request-tags/${tagValue}/${requestId}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: RequestTagCreate): Promise<ApiRequestTagResponse> {
      const resp = await fetch(`${API_BASE_URL}/request-tags/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(tagValue: string, requestId: string): Promise<{ message: string }> {
      const resp = await fetch(`${API_BASE_URL}/request-tags/${tagValue}/${requestId}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },
  },

  // REQUEST ASSETS
  requestAssets: {
    async list(requestId?: string): Promise<ApiRequestAssetResponse[]> {
      const url = requestId 
        ? `${API_BASE_URL}/request-assets?request_id=${requestId}`
        : `${API_BASE_URL}/request-assets`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async get(id: string): Promise<ApiRequestAssetResponse> {
      const resp = await fetch(`${API_BASE_URL}/request-assets/${id}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async create(data: RequestAssetCreate): Promise<ApiRequestAssetResponse> {
      const resp = await fetch(`${API_BASE_URL}/request-assets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async update(id: string, data: RequestAssetUpdate): Promise<ApiRequestAssetResponse> {
      const resp = await fetch(`${API_BASE_URL}/request-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async delete(id: string, removeFromR2?: boolean): Promise<{ message: string }> {
      const url = removeFromR2 
        ? `${API_BASE_URL}/request-assets/${id}?remove_from_r2=true`
        : `${API_BASE_URL}/request-assets/${id}`
      const resp = await fetch(url, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async getSignedUrl(id: string): Promise<{ url: string }> {
      const resp = await fetch(`${API_BASE_URL}/request-assets/${id}/signed-url`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    },

    async upload(requestId: string, file: File): Promise<ApiRequestAssetResponse> {
      const form = new FormData()
      form.append('request_id', requestId)
      form.append('file', file)

      const resp = await fetch(`${API_BASE_URL}/request-assets/upload`, {
        method: 'POST',
        body: form,
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Upload failed (${resp.status}): ${text}`)
      }
      return resp.json()
    },
  },
}

// Legacy requestsService for backward compatibility
export const requestsService = {
  async list(): Promise<ShoppingRequest[]> {
    try {
      const data = await apiService.requests.list()
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapApiToShoppingRequest)
        return mapped.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      }
      // fall through to local seed if backend empty
    } catch {
      // fall back to local storage/seed
    }
    const requests = (await storage.getRequests()) as ShoppingRequest[]
    const source = requests && requests.length > 0 ? requests : await seedDemoRequests()
    return [...source].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },

  async create(input: Omit<ShoppingRequest, 'id' | 'status' | 'createdAt'>): Promise<ShoppingRequest> {
    // Try backend create first; fallback to local
    try {
      const body: RequestCreate = {
        shopify_user_id: 'demo-user',
        query: `${input.title} — ${input.description}`.trim(),
      }
      const created = await apiService.requests.create(body)
      const mapped = mapApiToShoppingRequest(created)
      // enrich with optional fields
      mapped.budget = input.budget
      mapped.occasion = input.occasion
      mapped.media = input.media
      return mapped
    } catch {
      const newRequest: ShoppingRequest = {
        id: generateId('req'),
        title: input.title,
        description: input.description,
        budget: input.budget,
        occasion: input.occasion,
        media: input.media,
        status: 'open',
        createdAt: new Date().toISOString(),
      }
      const existing = (await storage.getRequests()) as ShoppingRequest[]
      const updated = [newRequest, ...existing]
      await storage.saveRequests(updated)
      return newRequest
    }
  },

  async update(id: string, updates: { query?: string }): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('requestsService.update called with:', { id, updates })
    // eslint-disable-next-line no-console
    console.log('API_BASE_URL:', API_BASE_URL)
    
    // Try backend update first; fallback to local
    try {
      // eslint-disable-next-line no-console
      console.log('Making PUT request via apiService...')
      
      await apiService.requests.update(id, updates)
      
      // eslint-disable-next-line no-console
      console.log('Update successful!')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Backend update failed, falling back to local storage:', error)
      // Fallback to local storage update
      const requests = (await storage.getRequests()) as ShoppingRequest[]
      const updated = requests.map(r => 
        r.id === id 
          ? { ...r, description: updates.query || r.description }
          : r
      )
      await storage.saveRequests(updated)
    }
  },

  async close(id: string): Promise<void> {
    const requests = (await storage.getRequests()) as ShoppingRequest[]
    const updated = requests.map(r => (r.id === id ? { ...r, status: 'closed' } : r))
    await storage.saveRequests(updated)
  },
}


