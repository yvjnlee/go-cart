from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# Request models
class RequestCreate(BaseModel):
    shopify_user_id: str
    query: str


class RequestUpdate(BaseModel):
    shopify_user_id: Optional[str] = None
    query: Optional[str] = None


class RequestResponse(BaseModel):
    request_id: str
    shopify_user_id: str
    query: str
    created_at: datetime
    updated_at: datetime


# Cart models
class CartCreate(BaseModel):
    request_id: str
    shopify_user_id: str


class CartUpdate(BaseModel):
    request_id: Optional[str] = None
    shopify_user_id: Optional[str] = None


class CartResponse(BaseModel):
    cart_id: str
    request_id: str
    shopify_user_id: str
    created_at: datetime
    updated_at: datetime


# Product models
class ProductCreate(BaseModel):
    shopify_product_id: str
    shopify_variant_id: str


class ProductUpdate(BaseModel):
    shopify_product_id: Optional[str] = None
    shopify_variant_id: Optional[str] = None


class ProductResponse(BaseModel):
    product_id: str
    shopify_product_id: str
    shopify_variant_id: str


# Cart Product models
class CartProductCreate(BaseModel):
    cart_id: str
    product_id: str


class CartProductResponse(BaseModel):
    cart_id: str
    product_id: str
    created_at: datetime
    updated_at: datetime


# Request Asset models
class RequestAssetCreate(BaseModel):
    request_id: str
    url: str


class RequestAssetUpdate(BaseModel):
    request_id: Optional[str] = None
    url: Optional[str] = None


class RequestAssetResponse(BaseModel):
    request_asset_id: str
    request_id: str
    url: str
    created_at: datetime
    updated_at: datetime


# Request Tag models
class RequestTagCreate(BaseModel):
    tag_value: str
    request_id: str


class RequestTagResponse(BaseModel):
    tag_value: str
    request_id: str
    created_at: datetime
    updated_at: datetime