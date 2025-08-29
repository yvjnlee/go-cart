import os
import uuid
from fastapi import HTTPException
import mimetypes
from dotenv import load_dotenv
from .shopify_files_service import ShopifyFilesService

# Load environment variables from .env file
load_dotenv()


class R2Service:
    """Cloudflare R2 storage service for handling file uploads and management"""
    
    def __init__(self):
        # Completely delegate to Shopify implementation while keeping the same interface
        self.shopify = ShopifyFilesService()
    
    def _generate_file_key(self, request_id: str, filename: str) -> str:
        """Generate a unique file key for R2 storage"""
        file_extension = os.path.splitext(filename)[1]
        unique_id = str(uuid.uuid4())
        return f"request-assets/{request_id}/{unique_id}{file_extension}"
    
    def _get_content_type(self, filename: str) -> str:
        """Determine content type from filename"""
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or 'application/octet-stream'
    
    async def upload_file(self, request_id: str, file_content: bytes, filename: str) -> str:
        """
        Upload a file to R2 storage
        
        Args:
            request_id: The request ID this asset belongs to
            file_content: The file content as bytes
            filename: Original filename
            
        Returns:
            The public URL of the uploaded file
        """
        # Delegate upload to Shopify Admin API service; returns Shopify file ID
        return await self.shopify.upload_file(request_id, file_content, filename)
    
    async def delete_file(self, file_key: str) -> bool:
        """
        Delete a file from R2 storage using its URL
        
        Args:
            url: The public URL of the file to delete
            
        Returns:
            True if deletion was successful
        """
        return await self.shopify.delete_file(file_key)
    
    def get_signed_url(self, file_key: str, expiration: int = 3600) -> str:
        """
        Generate a signed URL for private file access
        
        Args:
            url: The file URL
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Signed URL for temporary access
        """
        # For Shopify we just resolve and return the public URL
        return self.shopify.get_signed_url(file_key, expiration)


# Global R2 service instance
def get_r2_service() -> R2Service:
    """Dependency to get R2 service instance"""
    try:
        return R2Service()
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"R2 service configuration error: {str(e)}"
        )