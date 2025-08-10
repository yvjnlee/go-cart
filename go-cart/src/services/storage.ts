// Simple async wrappers to mimic persistence. Replace with backend calls later.

const REQUESTS_KEY = 'gc.shoppingRequests'
const CARTS_KEY = 'gc.submittedCarts'
const ORDERS_KEY = 'gc.orders'
const USER_CART_ITEMS_KEY = 'gc.userCartItems'
const DISMISSED_CROWDCARTS_KEY = 'gc.dismissedCrowdcarts'

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  async getRequests() {
    return readJson<any[]>(REQUESTS_KEY, [])
  },
  async saveRequests(requests: any[]) {
    await writeJson(REQUESTS_KEY, requests)
  },
  async getCarts() {
    return readJson<any[]>(CARTS_KEY, [])
  },
  async saveCarts(carts: any[]) {
    await writeJson(CARTS_KEY, carts)
  },
  async getOrders() {
    return readJson<any[]>(ORDERS_KEY, [])
  },
  async saveOrders(orders: any[]) {
    await writeJson(ORDERS_KEY, orders)
  },
  async getUserCartItems() {
    return readJson<any[]>(USER_CART_ITEMS_KEY, [])
  },
  async saveUserCartItems(items: any[]) {
    await writeJson(USER_CART_ITEMS_KEY, items)
  },
  // Per-request cart items helpers (preferred)
  async getUserCartItemsForRequest(requestId: string) {
    const key = `${USER_CART_ITEMS_KEY}:${requestId}`
    return readJson<any[]>(key, [])
  },
  async saveUserCartItemsForRequest(requestId: string, items: any[]) {
    const key = `${USER_CART_ITEMS_KEY}:${requestId}`
    await writeJson(key, items)
  },
  async getDismissedCrowdcarts(): Promise<Record<string, string[]>> {
    return readJson<Record<string, string[]>>(DISMISSED_CROWDCARTS_KEY, {})
  },
  async getDismissedCrowdcartsForRequest(requestId: string): Promise<string[]> {
    const all = await this.getDismissedCrowdcarts()
    return all[requestId] ?? []
  },
  async addDismissedCrowdcart(requestId: string, profileId: string): Promise<void> {
    const all = await this.getDismissedCrowdcarts()
    const existing = new Set(all[requestId] ?? [])
    existing.add(profileId)
    all[requestId] = Array.from(existing)
    await writeJson(DISMISSED_CROWDCARTS_KEY, all)
  },
}


