from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from app.database import create_tables
from app.routers import requests, carts, products, cart_products, request_tags, request_assets
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Basic logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables with foreign key constraints"""
    try:
        await create_tables()
        print("✅ Database tables created successfully!")
    except (asyncpg.PostgresConnectionError, OSError) as e:
        print(f"⚠️  Warning: Could not connect to PostgreSQL database: {e}")
        print("💡 Please ensure PostgreSQL is running and accessible.")
        print("   You can start PostgreSQL using:")
        print("   - macOS: brew services start postgresql")
        print("   - Docker: docker run --name postgres -e POSTGRES_DB=shopify_minis -p 5432:5432 -d postgres")
        print("   Or set DATABASE_URL environment variable to a different database.")
        print("\n🔗 API will start without database connection.")
    yield


app = FastAPI(
    title="Shopify Minis API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",  # vite preview
        "http://127.0.0.1:4173",
        "http://0.0.0.0:5173",
        "http://0.0.0.0:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(requests.router)
app.include_router(carts.router)
app.include_router(products.router)
app.include_router(cart_products.router)
app.include_router(request_tags.router)
app.include_router(request_assets.router)


@app.get("/")
async def root():
    return {
        "message": "Shopify Minis API", 
        "version": "1.0.0",
        "database_url": os.getenv("DATABASE_URL", "postgresql://localhost:5432/shopify_minis"),
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)