from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid

from ..models import ProductCreate, ProductUpdate, ProductResponse
from ..database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductResponse)
async def create_product(product: ProductCreate, conn=Depends(get_db)):
    product_id = str(uuid.uuid4())

    await conn.execute(
        """
        INSERT INTO products (product_id, shopify_product_id, shopify_variant_id)
        VALUES ($1, $2, $3)
    """,
        product_id,
        product.shopify_product_id,
        product.shopify_variant_id,
    )

    return ProductResponse(
        product_id=product_id,
        shopify_product_id=product.shopify_product_id,
        shopify_variant_id=product.shopify_variant_id,
    )


@router.get("/", response_model=List[ProductResponse])
async def get_products(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM products")
    return [ProductResponse(**dict(row)) for row in rows]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM products WHERE product_id = $1", product_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**dict(row))


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, conn=Depends(get_db)):
    existing = await conn.fetchrow(
        "SELECT * FROM products WHERE product_id = $1", product_id
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product.dict(exclude_unset=True)
    if not update_data:
        return ProductResponse(**dict(existing))

    set_clause = ", ".join(
        [f"{key} = ${i + 2}" for i, key in enumerate(update_data.keys())]
    )
    values = [product_id] + list(update_data.values())

    await conn.execute(
        f"UPDATE products SET {set_clause} WHERE product_id = $1", *values
    )

    updated_row = await conn.fetchrow(
        "SELECT * FROM products WHERE product_id = $1", product_id
    )
    return ProductResponse(**dict(updated_row))


@router.delete("/{product_id}")
async def delete_product(product_id: str, conn=Depends(get_db)):
    result = await conn.execute(
        "DELETE FROM products WHERE product_id = $1", product_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
