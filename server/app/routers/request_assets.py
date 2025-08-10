from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import uuid

from ..models import RequestAssetCreate, RequestAssetUpdate, RequestAssetResponse
from ..database import get_db
from ..r2_service import get_r2_service, R2Service

router = APIRouter(prefix="/request-assets", tags=["request_assets"])


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
        file_url = await r2_service.upload_file(request_id, file_content, file.filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    # Save asset record to database
    request_asset_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    await conn.execute("""
        INSERT INTO request_assets (request_asset_id, request_id, url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, request_asset_id, request_id, file_url, now, now)
    
    return RequestAssetResponse(
        request_asset_id=request_asset_id,
        request_id=request_id,
        url=file_url,
        created_at=now,
        updated_at=now
    )


@router.post("/", response_model=RequestAssetResponse)
async def create_request_asset(asset: RequestAssetCreate, conn=Depends(get_db)):
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
        INSERT INTO request_assets (request_asset_id, request_id, url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, request_asset_id, asset.request_id, asset.url, now, now)
    
    return RequestAssetResponse(
        request_asset_id=request_asset_id,
        request_id=asset.request_id,
        url=asset.url,
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[RequestAssetResponse])
async def get_request_assets(
    request_id: Optional[str] = None, 
    conn=Depends(get_db)
):
    """Get all request assets, optionally filtered by request_id"""
    
    if request_id:
        rows = await conn.fetch(
            "SELECT * FROM request_assets WHERE request_id = $1 ORDER BY created_at DESC", 
            request_id
        )
    else:
        rows = await conn.fetch("SELECT * FROM request_assets ORDER BY created_at DESC")
    
    return [RequestAssetResponse(**dict(row)) for row in rows]


@router.get("/{request_asset_id}", response_model=RequestAssetResponse)
async def get_request_asset(request_asset_id: str, conn=Depends(get_db)):
    """Get a specific request asset by ID"""
    
    row = await conn.fetchrow(
        "SELECT * FROM request_assets WHERE request_asset_id = $1", 
        request_asset_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request asset not found")
    
    return RequestAssetResponse(**dict(row))


@router.put("/{request_asset_id}", response_model=RequestAssetResponse)
async def update_request_asset(
    request_asset_id: str, 
    asset: RequestAssetUpdate, 
    conn=Depends(get_db)
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
    return RequestAssetResponse(**dict(updated_row))


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
            asset_url = dict(asset_row)["url"]
            await r2_service.delete_file(asset_url)
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
    
    asset_url = dict(asset_row)["url"]
    
    try:
        signed_url = r2_service.get_signed_url(asset_url, expiration)
        return {
            "signed_url": signed_url,
            "expires_in": expiration,
            "original_url": asset_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate signed URL: {str(e)}"
        )