#!/bin/bash

# Test script for The Cycle backend API endpoints
# Usage: ./test-api.sh [endpoint] [method] [params...]

BASE_URL="http://localhost:3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to make API calls and format output
call_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local url="${BASE_URL}${endpoint}"
    
    echo -e "${BLUE}🔗 ${method} ${url}${NC}"
    echo "---"
    
    response=$(curl -s -w "\n%{http_code}" -X "${method}" "${url}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        echo -e "${GREEN}✅ Status: ${http_code}${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ Status: ${http_code}${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    
    echo
    echo "================================"
    echo
}

# Health checks
test_health() {
    echo -e "${YELLOW}🏥 Testing Health Endpoints${NC}"
    call_api "/api/health"
    call_api "/api/redis-health"
}

# Basic player endpoints
test_players() {
    echo -e "${YELLOW}⚾ Testing Player Endpoints${NC}"
    call_api "/api/players?limit=5"
    call_api "/api/players?team=NYY&limit=3"
    call_api "/api/players/NYY/Aaron_Judge/2025"
    call_api "/api/players/NYY/Aaron_Judge/2025/games?limit=3"
}

# Basic team endpoints  
test_teams() {
    echo -e "${YELLOW}🏟️  Testing Team Endpoints${NC}"
    call_api "/api/teams?limit=5"
    call_api "/api/teams/NYY/2025"
    call_api "/api/teams/NYY/2025/games?limit=3"
    call_api "/api/teams/NYY/2025/roster?limit=5"
}

# Matchup endpoints
test_matchups() {
    echo -e "${YELLOW}⚔️  Testing Matchup Endpoints${NC}"
    call_api "/api/matchups/players?limit=3"
    call_api "/api/matchups/teams?limit=3"
    call_api "/api/matchups/teams/NYY/vs/BOS/games?limit=2"
}

# Stats endpoints
test_stats() {
    echo -e "${YELLOW}📊 Testing Stats Endpoints${NC}"
    call_api "/api/stats/summary"
    call_api "/api/stats/leaders?category=batting&stat=avg&limit=5"
    call_api "/api/stats/search?q=Judge&limit=3"
}

# Run all tests
test_all() {
    echo -e "${BLUE}🚀 Running Full API Test Suite${NC}"
    echo "================================"
    echo
    
    test_health
    test_players
    test_teams
    test_matchups
    test_stats
    
    echo -e "${GREEN}✅ All tests completed!${NC}"
}

# Help function
show_help() {
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  health     - Test health endpoints"
    echo "  players    - Test player endpoints"
    echo "  teams      - Test team endpoints"
    echo "  matchups   - Test matchup endpoints"
    echo "  stats      - Test stats endpoints"
    echo "  all        - Run all tests"
    echo "  custom     - Make custom API call (interactive)"
    echo "  help       - Show this help"
    echo
    echo "Examples:"
    echo "  $0 health"
    echo "  $0 players"
    echo "  $0 all"
}

# Custom API call
test_custom() {
    echo "Enter endpoint (e.g., /api/players?team=NYY):"
    read -r endpoint
    echo "Enter method (default: GET):"
    read -r method
    method=${method:-GET}
    
    call_api "$endpoint" "$method"
}

# Main script logic
case "${1:-help}" in
    "health")
        test_health
        ;;
    "players")
        test_players
        ;;
    "teams")
        test_teams
        ;;
    "matchups")
        test_matchups
        ;;
    "stats")
        test_stats
        ;;
    "all")
        test_all
        ;;
    "custom")
        test_custom
        ;;
    "help"|*)
        show_help
        ;;
esac
