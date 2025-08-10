from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from ..models import CartCreate, CartUpdate, CartResponse
from ..database import get_db

router = APIRouter(prefix="/carts", tags=["carts"])


@router.post("/", response_model=CartResponse)
async def create_cart(cart: CartCreate, conn=Depends(get_db)):
    cart_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    await conn.execute("""
        INSERT INTO carts (cart_id, request_id, shopify_user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
    """, cart_id, cart.request_id, cart.shopify_user_id, now, now)
    
    return CartResponse(
        cart_id=cart_id,
        request_id=cart.request_id,
        shopify_user_id=cart.shopify_user_id,
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[CartResponse])
async def get_carts(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM carts ORDER BY created_at DESC")
    return [CartResponse(**dict(row)) for row in rows]


@router.get("/{cart_id}", response_model=CartResponse)
async def get_cart(cart_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow("SELECT * FROM carts WHERE cart_id = $1", cart_id)
    if not row:
        raise HTTPException(status_code=404, detail="Cart not found")
    return CartResponse(**dict(row))


@router.put("/{cart_id}", response_model=CartResponse)
async def update_cart(cart_id: str, cart: CartUpdate, conn=Depends(get_db)):
    existing = await conn.fetchrow("SELECT * FROM carts WHERE cart_id = $1", cart_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    update_data = cart.dict(exclude_unset=True)
    if not update_data:
        return CartResponse(**dict(existing))
    
    update_data["updated_at"] = datetime.utcnow()
    
    set_clause = ", ".join([f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())])
    values = [cart_id] + list(update_data.values())
    
    await conn.execute(f"UPDATE carts SET {set_clause} WHERE cart_id = $1", *values)
    
    updated_row = await conn.fetchrow("SELECT * FROM carts WHERE cart_id = $1", cart_id)
    return CartResponse(**dict(updated_row))


@router.delete("/{cart_id}")
async def delete_cart(cart_id: str, conn=Depends(get_db)):
    result = await conn.execute("DELETE FROM carts WHERE cart_id = $1", cart_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Cart not found")
    return {"message": "Cart deleted successfully"}