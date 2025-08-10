from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from ..models import CartProductCreate, CartProductResponse
from ..database import get_db

router = APIRouter(prefix="/cart-products", tags=["cart-products"])


@router.post("/", response_model=CartProductResponse)
async def create_cart_product(cart_product: CartProductCreate, conn=Depends(get_db)):
    now = datetime.utcnow()

    await conn.execute(
        """
        INSERT INTO carts_products (cart_id, product_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
    """,
        cart_product.cart_id,
        cart_product.product_id,
        now,
        now,
    )

    return CartProductResponse(
        cart_id=cart_product.cart_id,
        product_id=cart_product.product_id,
        created_at=now,
        updated_at=now,
    )


@router.get("/", response_model=List[CartProductResponse])
async def get_cart_products(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM carts_products ORDER BY created_at DESC")
    return [CartProductResponse(**dict(row)) for row in rows]


@router.get("/{cart_id}/{product_id}", response_model=CartProductResponse)
async def get_cart_product(cart_id: str, product_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM carts_products WHERE cart_id = $1 AND product_id = $2",
        cart_id,
        product_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Cart product not found")
    return CartProductResponse(**dict(row))


@router.delete("/{cart_id}/{product_id}")
async def delete_cart_product(cart_id: str, product_id: str, conn=Depends(get_db)):
    result = await conn.execute(
        "DELETE FROM carts_products WHERE cart_id = $1 AND product_id = $2",
        cart_id,
        product_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Cart product not found")
    return {"message": "Cart product deleted successfully"}
