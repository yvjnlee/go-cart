import { storage, generateId } from './storage'
import type { OrderRecord } from '../types'

export const ordersService = {
  async listByRequest(requestId: string): Promise<OrderRecord[]> {
    const orders = (await storage.getOrders()) as OrderRecord[]
    return orders.filter(o => o.requestId === requestId).sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))
  },

  async listAll(): Promise<OrderRecord[]> {
    const orders = (await storage.getOrders()) as OrderRecord[]
    return [...orders].sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))
  },

  async add(input: Omit<OrderRecord, 'id' | 'purchasedAt'>): Promise<OrderRecord> {
    const newOrder: OrderRecord = {
      ...input,
      id: generateId('order'),
      purchasedAt: new Date().toISOString(),
    }
    const existing = (await storage.getOrders()) as OrderRecord[]
    const updated = [newOrder, ...existing]
    await storage.saveOrders(updated)
    return newOrder
  },
}


