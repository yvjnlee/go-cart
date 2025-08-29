from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from ..models import RequestTagCreate, RequestTagResponse
from ..database import get_db

router = APIRouter(prefix="/request-tags", tags=["request-tags"])


@router.post("/", response_model=RequestTagResponse)
async def create_request_tag(request_tag: RequestTagCreate, conn=Depends(get_db)):
    now = datetime.utcnow()
    
    await conn.execute("""
        INSERT INTO request_tags (tag_value, request_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
    """, request_tag.tag_value, request_tag.request_id, now, now)
    
    return RequestTagResponse(
        tag_value=request_tag.tag_value,
        request_id=request_tag.request_id,
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[RequestTagResponse])
async def get_request_tags(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM request_tags ORDER BY created_at DESC")
    return [RequestTagResponse(**dict(row)) for row in rows]


@router.get("/{tag_value}/{request_id}", response_model=RequestTagResponse)
async def get_request_tag(tag_value: str, request_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM request_tags WHERE tag_value = $1 AND request_id = $2", 
        tag_value, request_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request tag not found")
    return RequestTagResponse(**dict(row))


@router.delete("/{tag_value}/{request_id}")
async def delete_request_tag(tag_value: str, request_id: str, conn=Depends(get_db)):
    result = await conn.execute(
        "DELETE FROM request_tags WHERE tag_value = $1 AND request_id = $2", 
        tag_value, request_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Request tag not found")
    return {"message": "Request tag deleted successfully"}