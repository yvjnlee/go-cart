import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/shopify_minis")


async def get_db():
    """Database connection dependency"""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


async def create_tables():
    """Initialize database tables with foreign key constraints"""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Create tables in dependency order
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS requests (
                request_id VARCHAR(255) PRIMARY KEY,
                shopify_user_id VARCHAR(255) NOT NULL,
                query TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                product_id VARCHAR(255) PRIMARY KEY,
                shopify_product_id VARCHAR(255) NOT NULL,
                shopify_variant_id VARCHAR(255) NOT NULL
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS carts (
                cart_id VARCHAR(255) PRIMARY KEY,
                request_id VARCHAR(255) NOT NULL,
                shopify_user_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS carts_products (
                cart_id VARCHAR(255),
                product_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (cart_id, product_id),
                FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS request_assets (
                request_asset_id VARCHAR(255) PRIMARY KEY,
                request_id VARCHAR(255) NOT NULL,
                file_key VARCHAR(500) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS request_tags (
                tag_value VARCHAR(255),
                request_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (tag_value, request_id),
                FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
            )
        """)
        
    finally:
        await conn.close()