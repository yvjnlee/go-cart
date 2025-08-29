from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid

from ..models import ProductCreate, ProductUpdate, ProductResponse, BrowseResponse, BrowseProduct, BrowseStore
from ..database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductResponse)
async def create_product(product: ProductCreate, conn=Depends(get_db)):
    product_id = str(uuid.uuid4())
    
    await conn.execute("""
        INSERT INTO products (product_id, shopify_product_id, shopify_variant_id)
        VALUES ($1, $2, $3)
    """, product_id, product.shopify_product_id, product.shopify_variant_id)
    
    return ProductResponse(
        product_id=product_id,
        shopify_product_id=product.shopify_product_id,
        shopify_variant_id=product.shopify_variant_id
    )


@router.get("/", response_model=List[ProductResponse])
async def get_products(conn=Depends(get_db)):
    rows = await conn.fetch("SELECT * FROM products")
    return [ProductResponse(**dict(row)) for row in rows]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow("SELECT * FROM products WHERE product_id = $1", product_id)
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**dict(row))


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, conn=Depends(get_db)):
    existing = await conn.fetchrow("SELECT * FROM products WHERE product_id = $1", product_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.dict(exclude_unset=True)
    if not update_data:
        return ProductResponse(**dict(existing))
    
    set_clause = ", ".join([f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())])
    values = [product_id] + list(update_data.values())
    
    await conn.execute(f"UPDATE products SET {set_clause} WHERE product_id = $1", *values)
    
    updated_row = await conn.fetchrow("SELECT * FROM products WHERE product_id = $1", product_id)
    return ProductResponse(**dict(updated_row))


@router.delete("/{product_id}")
async def delete_product(product_id: str, conn=Depends(get_db)):
    result = await conn.execute("DELETE FROM products WHERE product_id = $1", product_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


@router.get("/browse", response_model=BrowseResponse)
async def get_browse_data():
    """
    Get browse data including products and stores.
    This endpoint provides rich product information for the browse screen.
    In a real implementation, this would fetch from Shopify API or enhanced database.
    """
    
    # Sample product data - in production this would come from Shopify API
    sample_products = [
        BrowseProduct(
            id="1",
            title="Wireless Headphones",
            imageUrl="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=500&fit=crop&crop=center",
            priceAmount=99.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_123",
            shopify_variant_id="variant_123"
        ),
        BrowseProduct(
            id="2", 
            title="Smart Watch",
            imageUrl="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop&crop=center",
            priceAmount=199.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_124",
            shopify_variant_id="variant_124"
        ),
        BrowseProduct(
            id="3",
            title="Laptop Stand",
            imageUrl="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=500&fit=crop&crop=center",
            priceAmount=49.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_125",
            shopify_variant_id="variant_125"
        ),
        BrowseProduct(
            id="4",
            title="Coffee Mug",
            imageUrl="https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=500&fit=crop&crop=center",
            priceAmount=24.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_126",
            shopify_variant_id="variant_126"
        ),
        BrowseProduct(
            id="5",
            title="Desk Lamp",
            imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=center",
            priceAmount=79.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_127",
            shopify_variant_id="variant_127"
        ),
        BrowseProduct(
            id="6",
            title="Phone Case",
            imageUrl="https://images.unsplash.com/photo-1601593346740-925612772716?w=400&h=500&fit=crop&crop=center",
            priceAmount=19.99,
            priceCurrencyCode="USD",
            shopify_product_id="shopify_128",
            shopify_variant_id="variant_128"
        )
    ]
    
    # Sample store data
    sample_stores = [
        BrowseStore(
            name="TechGear",
            imageUrl="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=center"
        ),
        BrowseStore(
            name="Home & Office",
            imageUrl="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop&crop=center"
        ),
        BrowseStore(
            name="Fashion Hub",
            imageUrl="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop&crop=center"
        ),
        BrowseStore(
            name="Accessories Plus",
            imageUrl="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop&crop=center"
        )
    ]
    
    return BrowseResponse(
        products=sample_products,
        stores=sample_stores
    )