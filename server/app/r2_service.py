import boto3
import os
import uuid
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException
from typing import Optional
import mimetypes
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class R2Service:
    """Cloudflare R2 storage service for handling file uploads and management"""
    
    def __init__(self):
        # R2 credentials and configuration
        self.endpoint_url = os.getenv("R2_ENDPOINT_URL")
        self.access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        self.public_url_base = os.getenv("R2_PUBLIC_URL_BASE")
        
        if not all([self.endpoint_url, self.access_key_id, self.secret_access_key, self.bucket_name]):
            raise ValueError("Missing required R2 environment variables. Please set R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME")
        
        # Configure S3 client for R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(
                region_name='auto',  # R2 uses 'auto' region
                signature_version='s3v4',
            )
        )
    
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
        try:
            file_key = self._generate_file_key(request_id, filename)
            content_type = self._get_content_type(filename)
            
            # Upload file to R2
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type,
                # Make file publicly readable if needed
                ACL='public-read'
            )
            
            # Generate public URL
            if self.public_url_base:
                public_url = f"{self.public_url_base.rstrip('/')}/{file_key}"
            else:
                # Fallback to S3-style URL
                public_url = f"{self.endpoint_url}/{self.bucket_name}/{file_key}"
            
            return public_url
            
        except ClientError as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload file to R2: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Unexpected error during file upload: {str(e)}"
            )
    
    async def delete_file(self, url: str) -> bool:
        """
        Delete a file from R2 storage using its URL
        
        Args:
            url: The public URL of the file to delete
            
        Returns:
            True if deletion was successful
        """
        try:
            # Extract file key from URL
            if self.public_url_base and url.startswith(self.public_url_base):
                file_key = url.replace(f"{self.public_url_base.rstrip('/')}/", "")
            else:
                # Parse S3-style URL
                url_parts = url.replace(f"{self.endpoint_url}/{self.bucket_name}/", "")
                file_key = url_parts
            
            # Delete file from R2
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            
            return True
            
        except ClientError as e:
            # If file doesn't exist, consider it successfully deleted
            if e.response['Error']['Code'] == 'NoSuchKey':
                return True
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to delete file from R2: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Unexpected error during file deletion: {str(e)}"
            )
    
    def get_signed_url(self, url: str, expiration: int = 3600) -> str:
        """
        Generate a signed URL for private file access
        
        Args:
            url: The file URL
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Signed URL for temporary access
        """
        try:
            # Extract file key from URL
            if self.public_url_base and url.startswith(self.public_url_base):
                file_key = url.replace(f"{self.public_url_base.rstrip('/')}/", "")
            else:
                url_parts = url.replace(f"{self.endpoint_url}/{self.bucket_name}/", "")
                file_key = url_parts
            
            # Generate signed URL
            signed_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_key},
                ExpiresIn=expiration
            )
            
            return signed_url
            
        except ClientError as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate signed URL: {str(e)}"
            )


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