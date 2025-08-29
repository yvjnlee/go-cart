#!/bin/bash

# =============================================================================
# Shopify Minis Server Environment Setup Script
# =============================================================================

echo "🚀 Setting up environment variables for Shopify Minis Server"
echo ""

# Check if .env file already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file
echo "📝 Creating .env file..."

cat > .env << 'EOF'
# =============================================================================
# Shopify Minis Server Environment Configuration
# =============================================================================

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopify_minis

# Cloudflare R2 Storage Configuration
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL_BASE=https://your-custom-domain.com

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
LOG_LEVEL=INFO
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your actual values:"
echo "   nano .env"
echo ""
echo "2. Required variables to update:"
echo "   - DATABASE_URL: Your PostgreSQL connection string"
echo "   - R2_ENDPOINT_URL: Your Cloudflare R2 endpoint"
echo "   - R2_ACCESS_KEY_ID: Your R2 access key"
echo "   - R2_SECRET_ACCESS_KEY: Your R2 secret key"
echo "   - R2_BUCKET_NAME: Your R2 bucket name"
echo ""
echo "3. Start the server:"
echo "   uv run python main.py"
echo "   # or"
echo "   uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "📚 For detailed setup instructions, see README.md"
echo "🔒 Remember: Never commit .env file to version control!" 