// Simple async wrappers to mimic persistence. Replace with backend calls later.

const REQUESTS_KEY = 'gc.shoppingRequests'
const CARTS_KEY = 'gc.submittedCarts'

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
}


