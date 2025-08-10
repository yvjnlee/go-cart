// Minimal HTTP client for backend requests
// Reads base URL from Vite env: VITE_API_BASE_URL (default http://localhost:8000)

export interface ApiError extends Error {
  status?: number
  info?: unknown
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const base = path.startsWith('http') ? path : `${API_BASE}${path}`
  if (!params) return base
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    query.set(key, String(value))
  })
  const qs = query.toString()
  return qs ? `${base}?${qs}` : base
}

async function request<T>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | boolean | undefined | null> } = {}
): Promise<T> {
  const { query, ...init } = options
  const url = buildUrl(path, query)
  const method = (init.method || 'GET').toUpperCase()
  // Avoid sending Content-Type on GET/HEAD to prevent unnecessary preflights
  const headers: HeadersInit = { ...(init.headers || {}) }
  if (init.body != null && (headers as any)['Content-Type'] == null) {
    ;(headers as any)['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, { ...init, method, headers, mode: 'cors' })
  if (!res.ok) {
    let info: unknown
    try {
      info = await res.json()
    } catch {
      info = await res.text()
    }
    const err: ApiError = new Error(`Request failed: ${res.status}`)
    err.status = res.status
    err.info = info
    throw err
  }
  if (res.status === 204) {
    // no content
    return undefined as unknown as T
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return (await res.text()) as unknown as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function getConfiguredShopifyUserId(): string {
  const id = (import.meta as any)?.env?.VITE_SHOPIFY_USER_ID
  return id || 'demo-user'
}


