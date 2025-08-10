import type { OrderRecord } from '../types'

// Note: The backend does not expose an orders resource yet.
// For now, we provide no-op implementations backed by the carts/products relations or return empty arrays.

export const ordersService = {
  async listByRequest(_requestId: string): Promise<OrderRecord[]> {
    return []
  },

  async listAll(): Promise<OrderRecord[]> {
    return []
  },

  async add(_input: Omit<OrderRecord, 'id' | 'purchasedAt'>): Promise<OrderRecord> {
    // Without a backend resource, we cannot persist orders. Throw to catch improper usage.
    throw new Error('ordersService.add is not implemented: backend orders API not available')
  },
}


