import { storage } from "./storage";
import { ShoppingRequest } from "../types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

type RequestResponse = {
  request_id: string;
  shopify_user_id: string;
  query: string;
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

export const requestsService = {
  async list(): Promise<ShoppingRequest[]> {
    const res = await fetch(`${API_BASE}/requests/`);
    if (!res.ok) throw new Error(`Failed to fetch requests: ${res.status}`);
    const data = (await res.json()) as RequestResponse[];
    const mapped = data.map(mapBackendToShoppingRequest);
    // Keep any locally created demo media associated by id if present
    const local = (await storage.getRequests()) as ShoppingRequest[];
    const localById = new Map(local.map((r) => [r.id, r]));
    return mapped.map((r) => ({ ...r, media: localById.get(r.id)?.media }));
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
