import { storage, generateId } from './storage'
import { SubmittedCart } from '../types'
import { apiService } from './request.service'

export const cartsService = {
  async listByRequest(requestId: string): Promise<SubmittedCart[]> {
    const carts = (await storage.getCarts()) as SubmittedCart[]
    return carts.filter(c => c.requestId === requestId).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
  },

  async submit(input: Omit<SubmittedCart, 'id' | 'submittedAt'>): Promise<SubmittedCart> {
    // Try backend write (create cart + attach products). Fallback to local storage.
    try {
      // Create cart using the comprehensive API service
      const createdCart = await apiService.carts.create({
        request_id: input.requestId,
        shopify_user_id: 'demo-user'
      })
      const cartId = createdCart.cart_id

      // Create product entities and link them to the cart
      for (const item of input.items) {
        try {
          // Create product placeholder if needed
          const product = await apiService.products.create({
            shopify_product_id: item.product.id,
            shopify_variant_id: item.product.id
          })
          
          // Link product to cart
          await apiService.cartProducts.create({
            cart_id: cartId,
            product_id: product.product_id
          })
        } catch {
          // Continue if product creation/linking fails
          continue
        }
      }

      const newCart: SubmittedCart = {
        ...input,
        id: cartId,
        submittedAt: new Date().toISOString(),
      }
      return newCart
    } catch {
      const newCart: SubmittedCart = {
        ...input,
        id: generateId('cart'),
        submittedAt: new Date().toISOString(),
      }
      const existing = (await storage.getCarts()) as SubmittedCart[]
      const updated = [newCart, ...existing]
      await storage.saveCarts(updated)
      return newCart
    }
  },
}


