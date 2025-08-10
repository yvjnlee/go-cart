import type { CartItemProductSnapshot, ShoppingRequest } from '../types'
import { api } from './api'
import type { GeneratedTagsResult } from './fal.service'
import { generateRequestTags } from './fal.service'

export interface CuratedSection {
  title: string
  products: CartItemProductSnapshot[]
}

export interface CuratedStore {
  name: string
  url: string
  imageUrl?: string
}

// There is no backend curation endpoint yet. As an interim step, we will
// synthesize sections from the real products table if present; otherwise return empty arrays.

async function fetchAllProducts(): Promise<{ product_id: string; shopify_product_id: string; shopify_variant_id: string }[]> {
  try {
    return await api.get('/products/')
  } catch {
    return []
  }
}

function toSnapshot(p: { product_id: string; shopify_product_id: string }): CartItemProductSnapshot {
  return {
    id: p.shopify_product_id || p.product_id,
    title: p.shopify_product_id,
    priceAmount: undefined,
    priceCurrencyCode: 'USD',
    imageUrl: undefined,
  }
}

export const curationService = {
  async generateTagsForRequest(request: ShoppingRequest): Promise<GeneratedTagsResult> {
    return generateRequestTags(request)
  },
  async getCuratedSections(_request: ShoppingRequest): Promise<CuratedSection[]> {
    const products = await fetchAllProducts()
    const snapshots = products.slice(0, 12).map(toSnapshot)
    const curated = snapshots.slice(0, 4)
    const recommended = snapshots.slice(4, 8)
    const popular = snapshots.slice(8, 12)
    if (snapshots.length === 0) return []
    return [
      { title: 'Curated picks', products: curated },
      { title: 'Recommended for this request', products: recommended },
      { title: 'Popular right now', products: popular },
    ]
  },
  async getCuratedStores(_request: ShoppingRequest): Promise<CuratedStore[]> {
    // No backend source of stores; return empty for now
    return []
  },
}


