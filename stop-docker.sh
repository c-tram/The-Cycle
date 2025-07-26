#!/bin/bash
# Stop The Cycle Docker containers

echo "🛑 Stopping The Cycle containers..."

# Stop all services
docker-compose down

# Optional: Remove volumes (uncomment if you want to clear data)
# docker-compose down -v

# Optional: Remove images (uncomment if you want to rebuild from scratch)
# docker-compose down --rmi all

echo "✅ All containers stopped!"

# Show remaining containers (if any)
echo ""
echo "Remaining containers:"
docker ps -a --filter "name=the-cycle" --format "table {{.Names}}\t{{.Status}}"
