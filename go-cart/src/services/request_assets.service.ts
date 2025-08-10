// Import the comprehensive API service
import { apiService } from './request.service'

// Re-export the interface from the main service for backward compatibility
export interface RequestAssetResponse {
  request_asset_id: string
  request_id: string
  url: string
  created_at: string
  updated_at: string
}

// Legacy service for backward compatibility - now uses the comprehensive apiService
export const requestAssetsService = {
  async upload(requestId: string, file: File): Promise<RequestAssetResponse> {
    return apiService.requestAssets.upload(requestId, file)
  },

  // Additional methods now available through the comprehensive API service
  async list(requestId?: string) {
    return apiService.requestAssets.list(requestId)
  },

  async get(id: string) {
    return apiService.requestAssets.get(id)
  },

  async create(data: { request_id: string; file_key: string }) {
    return apiService.requestAssets.create(data)
  },

  async update(id: string, data: { request_id?: string; file_key?: string }) {
    return apiService.requestAssets.update(id, data)
  },

  async delete(id: string, removeFromR2?: boolean) {
    return apiService.requestAssets.delete(id, removeFromR2)
  },

  async getSignedUrl(id: string) {
    return apiService.requestAssets.getSignedUrl(id)
  },
}


