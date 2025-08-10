from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from ..models import RequestAssetCreate, RequestAssetUpdate, RequestAssetResponse
from ..database import get_db
from ..r2_service import get_r2_service, R2Service

router = APIRouter(prefix="/request-assets", tags=["request_assets"])

logger = logging.getLogger(__name__)


def _signed_url_from_key(file_key: str, r2_service: R2Service, expiration_seconds: int = 3600) -> str:
    """Build a presigned URL for a given file key."""
    # public_url = r2_service.build_public_url(file_key)
    return r2_service.get_signed_url(file_key, expiration_seconds)

@router.post("/upload", response_model=RequestAssetResponse)
async def upload_asset(
    request_id: str = Form(...),
    file: UploadFile = File(...),
    conn=Depends(get_db),
    r2_service: R2Service = Depends(get_r2_service)
):
    """Upload a file asset for a request to Cloudflare R2"""
    
    # Validate that the request exists
    request_exists = await conn.fetchrow(
        "SELECT request_id FROM requests WHERE request_id = $1", request_id
    )
    if not request_exists:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Read file content
    try:
        file_content = await file.read()
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="Empty file provided")
    except HTTPException:
        # Preserve HTTPException details (e.g., our empty file validation)
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Upload to R2
    try:
        file_key = await r2_service.upload_file(request_id, file_content, file.filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    # Save asset record to database
    request_asset_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Store file_key in database
    await conn.execute("""
        INSERT INTO request_assets (request_asset_id, request_id, file_key, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, request_asset_id, request_id, file_key, now, now)
    
    # Return a presigned URL while storing the canonical public URL
    response = RequestAssetResponse(
        request_asset_id=request_asset_id,
        request_id=request_id,
        url=_signed_url_from_key(file_key, r2_service),
        created_at=now,
        updated_at=now
    )

    # Log successful upload
    try:
        logger.info(
            "Uploaded asset: request_id=%s request_asset_id=%s filename=%s content_type=%s size_bytes=%s",
            request_id,
            request_asset_id,
            file.filename,
            getattr(file, "content_type", None),
            len(file_content),
        )
    except Exception:
        # avoid breaking the response on logging errors
        pass

    return response


@router.post("/", response_model=RequestAssetResponse)
async def create_request_asset(asset: RequestAssetCreate, conn=Depends(get_db), r2_service: R2Service = Depends(get_r2_service)):
    """Create a new request asset record (for external URLs)"""
    
    # Validate that the request exists
    request_exists = await conn.fetchrow(
        "SELECT request_id FROM requests WHERE request_id = $1", asset.request_id
    )
    if not request_exists:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request_asset_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    await conn.execute("""
        INSERT INTO request_assets (request_asset_id, request_id, file_key, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, request_asset_id, asset.request_id, asset.file_key, now, now)
    
    return RequestAssetResponse(
        request_asset_id=request_asset_id,
        request_id=asset.request_id,
        url=_signed_url_from_key(asset.file_key, r2_service),
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[RequestAssetResponse])
async def get_request_assets(
    request_id: Optional[str] = None, 
    conn=Depends(get_db),
    r2_service: R2Service = Depends(get_r2_service)
):
    """Get all request assets, optionally filtered by request_id"""
    
    if request_id:
        rows = await conn.fetch(
            "SELECT * FROM request_assets WHERE request_id = $1 ORDER BY created_at DESC", 
            request_id
        )
    else:
        rows = await conn.fetch("SELECT * FROM request_assets ORDER BY created_at DESC")

    responses: List[RequestAssetResponse] = []
    for row in rows:
        data = dict(row)
        file_key = data.get("file_key")
        responses.append(RequestAssetResponse(
            request_asset_id=data["request_asset_id"],
            request_id=data["request_id"],
            url=_signed_url_from_key(file_key, r2_service),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        ))
    return responses


@router.get("/{request_asset_id}", response_model=RequestAssetResponse)
async def get_request_asset(request_asset_id: str, conn=Depends(get_db), r2_service: R2Service = Depends(get_r2_service)):
    """Get a specific request asset by ID"""
    
    row = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    data = dict(row)
    file_key = data.get("file_key")
    return RequestAssetResponse(
        request_asset_id=data["request_asset_id"],
        request_id=data["request_id"],
        url=_signed_url_from_key(file_key, r2_service),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


@router.put("/{request_asset_id}", response_model=RequestAssetResponse)
async def update_request_asset(
    request_asset_id: str, 
    asset: RequestAssetUpdate, 
    conn=Depends(get_db),
    r2_service: R2Service = Depends(get_r2_service)
):
    """Update a request asset"""
    
    # Check if request asset exists
    existing = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    update_data = asset.dict(exclude_unset=True)
    if not update_data:
        return RequestAssetResponse(**dict(existing))
    
    # If updating request_id, validate it exists
    if "request_id" in update_data:
        request_exists = await conn.fetchrow(
            "SELECT request_id FROM requests WHERE request_id = $1", 
            update_data["request_id"]
        )
        if not request_exists:
            raise HTTPException(status_code=404, detail="Request not found")
    
    update_data["updated_at"] = datetime.utcnow()
    
    set_clause = ", ".join([f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())])
    values = [request_asset_id] + list(update_data.values())
    
    await conn.execute(
        f"UPDATE request_assets SET {set_clause} WHERE request_asset_id = $1", 
        *values
    )
    
    updated_row = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    data = dict(updated_row)
    file_key = data.get("file_key")
    return RequestAssetResponse(
        request_asset_id=data["request_asset_id"],
        request_id=data["request_id"],
        url=_signed_url_from_key(file_key, r2_service),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


@router.delete("/{request_asset_id}")
async def delete_request_asset(
    request_asset_id: str, 
    delete_from_r2: bool = True,
    conn=Depends(get_db),
    r2_service: R2Service = Depends(get_r2_service)
):
    """Delete a request asset and optionally remove file from R2"""
    
    # Get asset details before deletion
    asset_row = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if not asset_row:
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    # Delete from database
    result = await conn.execute(
        "DELETE FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    # Optionally delete from R2 storage
    if delete_from_r2:
        try:
            file_key = dict(asset_row)["file_key"]
            await r2_service.delete_file(file_key)
        except HTTPException as e:
            # Log warning but don't fail the operation
            print(f"Warning: Failed to delete file from R2: {e.detail}")
        except Exception as e:
            print(f"Warning: Unexpected error deleting file from R2: {str(e)}")
    
    return {"message": "Request asset deleted successfully"}


@router.get("/{request_asset_id}/signed-url")
async def get_signed_url(
    request_asset_id: str,
    expiration: int = 3600,
    conn=Depends(get_db),
    r2_service: R2Service = Depends(get_r2_service)
):
    """Get a signed URL for temporary access to a private asset"""
    
    # Get asset details
    asset_row = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if not asset_row:
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    file_key = dict(asset_row)["file_key"]
    
    try:
        # public_url = r2_service.build_public_url(file_key)
        signed_url = r2_service.get_signed_url(file_key, expiration)
        return {
            "signed_url": signed_url,
            "expires_in": expiration,
            # "original_url": public_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate signed URL: {str(e)}"
        )