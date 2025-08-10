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

export const requestsService = {
  async list(): Promise<ShoppingRequest[]> {
    // Fetch requests and assets in parallel
    const [requestsRes, assetsRes] = await Promise.all([
      fetch(`${API_BASE}/requests/`),
      fetch(`${API_BASE}/request-assets/`),
    ]);

    if (!requestsRes.ok) {
      throw new Error(`Failed to fetch requests: ${requestsRes.status}`);
    }

    // Parse requests
    const requestsData = (await requestsRes.json()) as RequestResponse[];
    const mappedRequests = requestsData.map(mapBackendToShoppingRequest);

    // Parse assets if available; otherwise, treat as empty array
    let assetsData: RequestAssetResponse[] = [];
    if (assetsRes.ok) {
      try {
        assetsData = (await assetsRes.json()) as RequestAssetResponse[];
      } catch {
        assetsData = [];
      }
    }

    // Group assets by request_id
    const assetsByRequestId = new Map<string, RequestAssetResponse[]>();
    for (const asset of assetsData) {
      const list = assetsByRequestId.get(asset.request_id) || [];
      list.push(asset);
      assetsByRequestId.set(asset.request_id, list);
    }

    // Helper to guess media type by URL extension
    const isVideoUrl = (url: string) =>
      /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);

    // Keep any locally created demo media associated by id if present
    const local = (await storage.getRequests()) as ShoppingRequest[];
    const localById = new Map(local.map((r) => [r.id, r]));

    // Attach derived media from assets; fallback to local media when no assets
    return mappedRequests.map((req) => {
      const assets = assetsByRequestId.get(req.id) || [];
      if (assets.length === 0) {
        return { ...req, media: localById.get(req.id)?.media };
      }

      const urls = assets.map((a) => a.url).filter(Boolean);
      const hasVideo = urls.some(isVideoUrl);
      return {
        ...req,
        media: {
          type: hasVideo ? "video" : "image",
          urls,
        },
      };
    });
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
