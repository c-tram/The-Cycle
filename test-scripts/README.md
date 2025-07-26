# The Cycle API Test Scripts

This directory contains comprehensive test scripts for testing The Cycle backend API endpoints.

## Quick Start

```bash
# Test if the backend is running
./test-api.sh health

# Get database overview
node quick-test.js summary

# Test all endpoints
node test-api.js all
```

## Available Scripts

### 1. Bash Script (`test-api.sh`)
Simple bash script using curl for quick API testing.

```bash
# Make executable
chmod +x test-api.sh

# Run tests
./test-api.sh health        # Test health endpoints
./test-api.sh players       # Test player endpoints  
./test-api.sh teams         # Test team endpoints
./test-api.sh matchups      # Test matchup endpoints
./test-api.sh stats         # Test stats endpoints
./test-api.sh all           # Run all tests
./test-api.sh custom        # Interactive custom endpoint testing
```

### 2. Node.js Script (`test-api.js`)
More advanced testing with better formatting and error handling.

```bash
# Install dependencies
npm install

# Run tests
node test-api.js health     # Test health endpoints
node test-api.js players    # Test player endpoints
node test-api.js teams      # Test team endpoints
node test-api.js matchups   # Test matchup endpoints
node test-api.js stats      # Test stats endpoints
node test-api.js discover   # Discover available data
node test-api.js all        # Run all tests
node test-api.js custom /api/endpoint  # Test custom endpoint

# Or use npm scripts
npm run test:health
npm run test:players
npm run test:teams
npm run test:matchups
npm run test:stats
npm run test:all
```

### 3. Quick Test Scenarios (`quick-test.js`)
Pre-built scenarios for common testing patterns.

```bash
node quick-test.js summary          # Database overview
node quick-test.js leaders           # Default batting average leaders
node quick-test.js leaders homeRuns batting  # Home run leaders
node quick-test.js yankees           # Yankees team info
node quick-test.js judge             # Aaron Judge stats
node quick-test.js matchups          # Sample matchups
node quick-test.js search Ohtani     # Search for Ohtani
node quick-test.js red-sox           # Red Sox info
node quick-test.js pitching          # Pitching leaders
node quick-test.js random-player     # Random player stats
node quick-test.js all-teams         # List all teams
```

## Database Overview

Current data in Redis:
- **1,471 players** with season averages
- **32 teams** (including AL/NL All-Star teams)
- **19,627 player vs team matchups**
- **672 team vs team matchups**
- **2025 season data**

## API Endpoints Tested

### Health Endpoints
- `GET /api/health` - Basic health check
- `GET /api/redis-health` - Redis connection check

### Player Endpoints
- `GET /api/players` - Get all players (with filters)
- `GET /api/players/:team/:name/:year` - Get specific player stats
- `GET /api/players/:team/:name/:year/games` - Get player game-by-game stats
- `GET /api/players/:team/:name/:year/vs/:opponent` - Get player vs team stats

### Team Endpoints
- `GET /api/teams` - Get all teams
- `GET /api/teams/:team/:year` - Get specific team stats
- `GET /api/teams/:team/:year/games` - Get team game-by-game stats
- `GET /api/teams/:team/:year/vs/:opponent` - Get team vs team stats
- `GET /api/teams/:team/:year/roster` - Get team roster

### Matchup Endpoints
- `GET /api/matchups/players` - Get player vs team matchups
- `GET /api/matchups/teams` - Get team vs team matchups
- `GET /api/matchups/players/:team/:name/:year/vs/:opponent/games` - Player vs team game history
- `GET /api/matchups/teams/:team/vs/:opponent/games` - Team vs team game history

### Stats Endpoints
- `GET /api/stats/summary` - Database summary
- `GET /api/stats/leaders` - Statistical leaders
- `GET /api/stats/search` - Search players and teams

## Requirements

### For Bash Script
- `curl` - For making HTTP requests
- `jq` - For JSON formatting (optional but recommended)

### For Node.js Script
- Node.js (v14+)
- npm dependencies: `axios`, `chalk`

## Examples

Test if backend is running:
```bash
./test-api.sh health
```

Get all available teams:
```bash
node test-api.js custom /api/teams
```

Find top batting averages:
```bash
node test-api.js custom "/api/stats/leaders?category=batting&stat=avg&limit=10"
```

Search for a specific player:
```bash
node test-api.js custom "/api/stats/search?q=Judge"
```

## Practical Examples

### Find Top Home Run Hitters
```bash
node quick-test.js leaders homeRuns batting
```

### Check Specific Player Performance
```bash
# Aaron Judge
node test-api.js custom "/api/players/NYY/Aaron_Judge/2025"

# With recent games
node test-api.js custom "/api/players/NYY/Aaron_Judge/2025/games?limit=5"
```

### Team Analysis
```bash
# Yankees roster
node test-api.js custom "/api/teams/NYY/2025/roster"

# Yankees vs Red Sox matchup
node test-api.js custom "/api/teams/NYY/2025/vs/BOS"
```

### Pitching Leaders
```bash
# Best ERAs
node test-api.js custom "/api/stats/leaders?category=pitching&stat=era&limit=10"

# Most strikeouts
node test-api.js custom "/api/stats/leaders?category=pitching&stat=strikeOuts&limit=10"
```

### Search Functionality
```bash
# Find all players named Judge
node test-api.js custom "/api/stats/search?q=Judge"

# Search for Ohtani
node test-api.js custom "/api/stats/search?q=Ohtani"
```

## Troubleshooting

1. **Connection Refused**: Make sure the backend is running on localhost:3001
   ```bash
   docker ps  # Check if the-cycle-backend container is running
   ```

2. **Empty Results**: The Redis database might not have data loaded
   ```bash
   node test-api.js discover  # See what data is available
   ```

3. **jq not found**: Install jq for better JSON formatting
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt install jq
   ```
