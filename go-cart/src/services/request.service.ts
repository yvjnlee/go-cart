import { storage } from "./storage";
import { ShoppingRequest } from "../types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

// Helper function to generate IDs for dummy data
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

// Dummy data to replace live API calls
const DUMMY_REQUESTS: ShoppingRequest[] = (() => {
  const now = new Date();
  return [
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
          'https://www.makerstations.io/content/images/2022/02/marc-desk-setup-02.jpg',
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
      title: 'Baseball Game Outfit',
      description: 'Looking for a casual, sporty outfit for a summer baseball game — breathable fabrics, comfortable shoes, and a team cap. Size M.',
      budget: 120,
      occasion: 'Sports Event',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://cdn.lookastic.com/looks/short-sleeve-shirt-skinny-jeans-low-top-sneakers-large-98281.jpg'
        ],
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
        type: 'image',
        urls: [
          'https://beziergames.com/cdn/shop/articles/IMG_8132_2048x.jpg?v=1622648821'
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
          'https://lamcy-kr.com/cdn/shop/files/0008958_beauty-of-joseon-basic-skincare-set.jpg?v=1711741085'
        ],
      },
    },
  ];
})();

type RequestResponse = {
  request_id: string;
  shopify_user_id: string;
  query: string;
  created_at: string;
  updated_at: string;
};

type RequestAssetResponse = {
  request_asset_id: string;
  request_id: string;
  url: string;
  created_at: string;
  updated_at: string;
};

function mapBackendToShoppingRequest(r: RequestResponse): ShoppingRequest {
  return {
    id: r.request_id,
    title: r.query, // until richer schema exists
    description: r.query,
    budget: 0,
    status: "open",
    createdAt: r.created_at,
  };
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
    // Return dummy data instead of making API calls
    return Promise.resolve([...DUMMY_REQUESTS]);
  },

  async create(input: {
    shopifyUserId: string;
    query: string;
  }): Promise<ShoppingRequest> {
    const res = await fetch(`${API_BASE}/requests/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopify_user_id: input.shopifyUserId,
        query: input.query,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create request: ${res.status}`);
    const data = (await res.json()) as RequestResponse;
    const mapped = mapBackendToShoppingRequest(data);
    // Also persist locally so UI with media can still reference it
    const existing = (await storage.getRequests()) as ShoppingRequest[];
    await storage.saveRequests([mapped, ...existing]);
    return mapped;
  },

  async close(id: string): Promise<void> {
    // No explicit status on backend; leaving as no-op for now
    void id;
  },
};

export const requestAssetsApi = {
  async upload(
    requestId: string,
    file: File
  ): Promise<{ request_asset_id: string; url: string }> {
    const form = new FormData();
    form.append("request_id", requestId);
    form.append("file", file);
    const res = await fetch(`${API_BASE}/request-assets/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    return { request_asset_id: data.request_asset_id, url: data.url };
  },
};
