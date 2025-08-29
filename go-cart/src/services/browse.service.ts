import type { CartItemProductSnapshot } from '../types'

export interface BrowseStore {
  name: string
  imageUrl?: string
}

export interface BrowseProduct {
  id: string
  title: string
  imageUrl?: string
  priceAmount?: number
  priceCurrencyCode?: string
  shopify_product_id?: string
  shopify_variant_id?: string
}

export interface BrowseResponse {
  products: BrowseProduct[]
  stores: BrowseStore[]
}

// Convert BrowseProduct to CartItemProductSnapshot for compatibility
function convertToProductSnapshot(product: BrowseProduct): CartItemProductSnapshot {
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.imageUrl,
    priceAmount: product.priceAmount,
    priceCurrencyCode: product.priceCurrencyCode
  }
}

const API_BASE_URL = 'http://localhost:8000'

export const browseService = {
  async getBrowseData(): Promise<{ products: CartItemProductSnapshot[]; stores: BrowseStore[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/browse`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: BrowseResponse = await response.json()
      
      return {
        products: data.products.map(convertToProductSnapshot),
        stores: data.stores
      }
    } catch (error) {
      console.error('Failed to fetch browse data:', error)
      
      // Fallback to mock data if API fails
      return {
        products: [
          {
            id: 'fallback-1',
            title: 'Sample Product',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=500&fit=crop&crop=center',
            priceAmount: 29.99,
            priceCurrencyCode: 'USD'
          }
        ],
        stores: [
          {
            name: 'Sample Store',
            imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=center'
          }
        ]
      }
    }
  }
}
