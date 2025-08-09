import { storage, generateId } from './storage'
import { SubmittedCart } from '../types'

export const cartsService = {
  async listByRequest(requestId: string): Promise<SubmittedCart[]> {
    const carts = (await storage.getCarts()) as SubmittedCart[]
    return carts.filter(c => c.requestId === requestId).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
  },

  async submit(input: Omit<SubmittedCart, 'id' | 'submittedAt'>): Promise<SubmittedCart> {
    const newCart: SubmittedCart = {
      ...input,
      id: generateId('cart'),
      submittedAt: new Date().toISOString(),
    }
    const existing = (await storage.getCarts()) as SubmittedCart[]
    const updated = [newCart, ...existing]
    await storage.saveCarts(updated)
    return newCart
  },
}


