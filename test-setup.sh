#!/bin/zsh

# Test script for The Cycle development environment
echo "🧪 Testing The Cycle Development Setup..."

# Test if scripts are executable
echo "📝 Checking script permissions..."
if [[ -x "./run-dev.sh" ]]; then
    echo "✅ run-dev.sh is executable"
else
    echo "❌ run-dev.sh is not executable"
    chmod +x run-dev.sh
    echo "✅ Fixed run-dev.sh permissions"
fi

if [[ -x "./deploy.sh" ]]; then
    echo "✅ deploy.sh is executable"
else
    echo "❌ deploy.sh is not executable"
    chmod +x deploy.sh
    echo "✅ Fixed deploy.sh permissions"
fi

# Test directory structure
echo "📁 Checking directory structure..."
if [[ -d "src/express-backend" ]]; then
    echo "✅ Express backend directory exists"
else
    echo "❌ Express backend directory missing"
fi

if [[ -d "src/web-frontend" ]]; then
    echo "✅ React frontend directory exists"
else
    echo "❌ React frontend directory missing"
fi

# Test package.json files
echo "📦 Checking package.json files..."
if [[ -f "src/express-backend/package.json" ]]; then
    echo "✅ Backend package.json exists"
else
    echo "❌ Backend package.json missing"
fi

if [[ -f "src/web-frontend/package.json" ]]; then
    echo "✅ Frontend package.json exists"
else
    echo "❌ Frontend package.json missing"
fi

# Test Docker files
echo "🐳 Checking Docker configuration..."
if [[ -f "Dockerfile" ]]; then
    echo "✅ Main Dockerfile exists"
else
    echo "❌ Main Dockerfile missing"
fi

if [[ -f "docker-compose.yml" ]]; then
    echo "✅ docker-compose.yml exists"
else
    echo "❌ docker-compose.yml missing"
fi

if [[ -f "docker-compose.dev.yml" ]]; then
    echo "✅ docker-compose.dev.yml exists"
else
    echo "❌ docker-compose.dev.yml missing"
fi

echo ""
echo "🎯 Usage:"
echo "  📚 Development mode: ./run-dev.sh"
echo "  🚀 Deploy to Azure: ./deploy.sh [commit-message]"
echo "  🐳 Docker development: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up"
echo "  🏗️  Docker production: ./run-docker.sh"
echo ""
echo "🔗 URLs (when running):"
echo "  🌐 Frontend: http://localhost:3001"
echo "  📡 Backend API: http://localhost:8080/api"
echo "  💊 Health Check: http://localhost:8080/api/health"
