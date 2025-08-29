#!/bin/bash

echo "🗄️  Shopify Minis Database Setup"
echo "=================================="
echo ""
echo "Choose your database setup option:"
echo ""
echo "1. Start PostgreSQL with Docker (Recommended)"
echo "2. Start PostgreSQL with Homebrew"
echo "3. Use existing PostgreSQL connection"
echo "4. Skip database setup and run API only"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🐳 Starting PostgreSQL with Docker..."
        docker run --name shopify-minis-postgres \
            -e POSTGRES_DB=shopify_minis \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -p 5432:5432 \
            -d postgres:15
        
        if [ $? -eq 0 ]; then
            echo "✅ PostgreSQL container started successfully!"
            echo "🔗 Database URL: postgresql://postgres:postgres@localhost:5432/shopify_minis"
            export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopify_minis"
            echo "⏳ Waiting 5 seconds for database to start..."
            sleep 5
        else
            echo "❌ Failed to start PostgreSQL container"
            exit 1
        fi
        ;;
    2)
        echo "🍺 Starting PostgreSQL with Homebrew..."
        brew services start postgresql@15 || brew services start postgresql
        if [ $? -eq 0 ]; then
            echo "✅ PostgreSQL started with Homebrew!"
            echo "🔗 Database URL: postgresql://localhost:5432/shopify_minis"
            export DATABASE_URL="postgresql://localhost:5432/shopify_minis"
            # Create database if it doesn't exist
            createdb shopify_minis 2>/dev/null || true
        else
            echo "❌ Failed to start PostgreSQL with Homebrew"
            echo "💡 Try: brew install postgresql@15"
            exit 1
        fi
        ;;
    3)
        read -p "Enter your PostgreSQL DATABASE_URL: " db_url
        export DATABASE_URL="$db_url"
        echo "🔗 Using custom database URL: $DATABASE_URL"
        ;;
    4)
        echo "⏭️  Skipping database setup..."
        echo "⚠️  API will start without database connection"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🚀 Starting FastAPI server..."
echo "📖 API Documentation: http://localhost:8000/docs"
echo "🌐 API Base URL: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload