from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from ..models import RequestCreate, RequestUpdate, RequestResponse
from ..database import get_db

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("/", response_model=RequestResponse)
async def create_request(request: RequestCreate, conn=Depends(get_db)):
    request_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    await conn.execute("""
        INSERT INTO requests (request_id, shopify_user_id, query, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, request_id, request.shopify_user_id, request.query, now, now)
    
    return RequestResponse(
        request_id=request_id,
        shopify_user_id=request.shopify_user_id,
        query=request.query,
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[RequestResponse])
async def get_requests(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM requests ORDER BY created_at DESC")
    return [RequestResponse(**dict(row)) for row in rows]


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(request_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow("SELECT * FROM requests WHERE request_id = $1", request_id)
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return RequestResponse(**dict(row))


@router.put("/{request_id}", response_model=RequestResponse)
async def update_request(request_id: str, request: RequestUpdate, conn=Depends(get_db)):
    # Check if request exists
    existing = await conn.fetchrow("SELECT * FROM requests WHERE request_id = $1", request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = request.dict(exclude_unset=True)
    if not update_data:
        return RequestResponse(**dict(existing))
    
    update_data["updated_at"] = datetime.utcnow()
    
    set_clause = ", ".join([f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())])
    values = [request_id] + list(update_data.values())
    
    await conn.execute(f"UPDATE requests SET {set_clause} WHERE request_id = $1", *values)
    
    updated_row = await conn.fetchrow("SELECT * FROM requests WHERE request_id = $1", request_id)
    return RequestResponse(**dict(updated_row))


@router.delete("/{request_id}")
async def delete_request(request_id: str, conn=Depends(get_db)):
    result = await conn.execute("DELETE FROM requests WHERE request_id = $1", request_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted successfully"}