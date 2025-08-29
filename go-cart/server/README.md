# Shopify Minis FastAPI Server

A clean, modular FastAPI server with asyncpg for database operations, implementing CRUD operations for the Shopify Minis database schema.

## Project Structure

```
server/
├── app/
│   ├── __init__.py
│   ├── models.py          # Pydantic models for request/response validation
│   ├── database.py        # Database connection and table creation
│   └── routers/
│       ├── __init__.py
│       ├── requests.py    # Request CRUD operations
│       ├── carts.py       # Cart CRUD operations
│       ├── products.py    # Product CRUD operations
│       ├── cart_products.py # Cart-Product relationship operations
│       └── request_tags.py  # Request tag operations
├── main.py               # FastAPI app with router includes
├── requirements.txt      # Dependencies
├── db.txt               # Database schema with FK relations
└── README.md           # This file
```

## Setup with UV (Recommended)

UV is a fast Python package manager that makes dependency management simple.

### Quick Start

1. **Install UV** (if not already installed):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Easy Setup with Script**:

```bash
./setup_db.sh
```

This script will guide you through database setup options and start the server.

### Manual Setup

1. **Install dependencies**:

```bash
uv sync
```

2. **Choose your database setup**:

**Option A: Docker PostgreSQL (Recommended)**

```bash
docker run --name shopify-minis-postgres \
  -e POSTGRES_DB=shopify_minis \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:15

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopify_minis"
```

**Option B: Homebrew PostgreSQL**

```bash
brew services start postgresql
createdb shopify_minis
export DATABASE_URL="postgresql://localhost:5432/shopify_minis"
```

**Option C: Skip Database (API only)**

```bash
# The API will start without database connection
```

3. **Run the server**:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# OR
uv run python main.py
```

The server will start on `http://localhost:8000`

## Traditional Setup (pip)

If you prefer using pip:

```bash
pip install -r requirements.txt
export DATABASE_URL="postgresql://username:password@localhost:5432/shopify_minis"
python main.py
```

## API Documentation

Once the server is running, you can access:

- Interactive API docs: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

## Available Endpoints

### Requests

- `POST /requests/` - Create a new request
- `GET /requests/` - Get all requests
- `GET /requests/{request_id}` - Get a specific request
- `PUT /requests/{request_id}` - Update a request
- `DELETE /requests/{request_id}` - Delete a request

### Carts

- `POST /carts/` - Create a new cart
- `GET /carts/` - Get all carts
- `GET /carts/{cart_id}` - Get a specific cart
- `PUT /carts/{cart_id}` - Update a cart
- `DELETE /carts/{cart_id}` - Delete a cart

### Products

- `POST /products/` - Create a new product
- `GET /products/` - Get all products
- `GET /products/{product_id}` - Get a specific product
- `PUT /products/{product_id}` - Update a product
- `DELETE /products/{product_id}` - Delete a product

### Cart Products

- `POST /cart-products/` - Add a product to a cart
- `GET /cart-products/` - Get all cart-product relationships
- `GET /cart-products/{cart_id}/{product_id}` - Get a specific cart-product relationship
- `DELETE /cart-products/{cart_id}/{product_id}` - Remove a product from a cart

### Request Tags

- `POST /request-tags/` - Add a tag to a request
- `GET /request-tags/` - Get all request tags
- `GET /request-tags/{tag_value}/{request_id}` - Get a specific request tag
- `DELETE /request-tags/{tag_value}/{request_id}` - Remove a tag from a request

### Request Assets

- `POST /request-assets/upload` - Upload a file asset for a request to Cloudflare R2
- `POST /request-assets/` - Create a new request asset record (for external URLs)
- `GET /request-assets/` - Get all request assets (optionally filter by request_id)
- `GET /request-assets/{request_asset_id}` - Get a specific request asset
- `PUT /request-assets/{request_asset_id}` - Update a request asset
- `DELETE /request-assets/{request_asset_id}` - Delete a request asset (optionally remove from R2)
- `GET /request-assets/{request_asset_id}/signed-url` - Get a signed URL for temporary access

## Database Schema

The server automatically creates the following tables on startup with proper foreign key relationships:

- `requests` - User requests with queries (root table)
- `products` - Product information with Shopify IDs (independent table)
- `carts` - Shopping carts linked to requests (FK: request_id → requests)
- `carts_products` - Many-to-many relationship (FK: cart_id → carts, product_id → products)
- `request_tags` - Tags associated with requests (FK: request_id → requests)
- `request_assets` - File assets linked to requests with R2 URLs (FK: request_id → requests)

All foreign keys use `ON DELETE CASCADE` for referential integrity.

## Cloudflare R2 Configuration

To enable file upload functionality, set the following environment variables:

```bash
# Required R2 Configuration
export R2_ENDPOINT_URL="https://your-account-id.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="your-r2-access-key-id"
export R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
export R2_BUCKET_NAME="your-bucket-name"

# Optional: Custom domain for public file URLs
export R2_PUBLIC_URL_BASE="https://your-custom-domain.com"
```

Files uploaded via `/request-assets/upload` are stored in R2 with the path structure:
`request-assets/{request_id}/{unique_id}{file_extension}`
