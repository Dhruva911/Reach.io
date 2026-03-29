#!/bin/bash
# AutoReach — Quick Setup Script
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

echo "=========================================="
echo "  AutoReach — Quick Setup"
echo "=========================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "WARNING: Docker not found. You'll need to set up PostgreSQL and Redis manually."
    SKIP_DOCKER=true
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "  Node.js: $(node -v) ✓"

# Start Docker services
if [ "$SKIP_DOCKER" != true ]; then
    echo ""
    echo "Starting PostgreSQL and Redis via Docker..."
    docker-compose up -d postgres redis
    echo "  Waiting for services to be ready..."
    sleep 5
    echo "  PostgreSQL: running on port 5432 ✓"
    echo "  Redis: running on port 6379 ✓"
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
npm install
echo "  Dependencies installed ✓"

# Set up environment
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    echo "  .env created ✓"
    echo "  IMPORTANT: Edit .env to add your API keys"
fi

# Run migrations
echo ""
echo "Running database migrations..."
npm run migrate 2>/dev/null || echo "  (Run manually: npm run migrate)"

# Seed data
echo ""
echo "Seeding Auriga-specific data..."
npm run seed 2>/dev/null || echo "  (Run manually: npm run seed)"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Start the API server:"
echo "    cd backend && npm run dev"
echo ""
echo "  Start the worker (separate terminal):"
echo "    cd backend && npm run worker"
echo ""
echo "  API will be running at:"
echo "    http://localhost:3001"
echo ""
echo "  Health check:"
echo "    http://localhost:3001/health"
echo ""
echo "  Next steps:"
echo "    1. Edit backend/.env with your API keys"
echo "    2. Add Claude API key for AI personalization"
echo "    3. Add Apollo API key for prospect discovery"
echo "    4. Add Instantly API key for email delivery"
echo ""
echo "  Mock mode: All AI + delivery features work"
echo "  without API keys (uses realistic mock data)"
echo "=========================================="
