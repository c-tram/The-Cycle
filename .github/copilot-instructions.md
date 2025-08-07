# The Cycle - MLB Analytics Platform AI Instructions

## Project Mission

**ULTIMATE GOAL**: Testing every possible baseball statistic that is imaginable. This project aims to be the most comprehensive MLB analytics platform with exhaustive statistical coverage including traditional stats, advanced sabermetrics, situational analytics, and experimental metrics.

## Architecture Overview

**The Cycle** is a professional MLB analytics platform with a React frontend, Express.js API backend, and Azure Redis data layer. The system features dual API versions (v1/v2) with v2 providing enhanced 40+ statistical categories as a foundation for comprehensive statistical testing.

### Key Components
- **Backend**: Express.js API (`src/express-backend/`) with v2 routes providing enhanced MLB statistics
- **Frontend**: React + Material-UI (`src/web-frontend/`) with professional baseball-themed interface  
- **Data Layer**: Azure Redis Cache with structured keys for players, teams, and matchups
- **Data Ingestion**: MLB Stats API integration via `pullBoxscoresToRedis_v2.cjs` script
- **Statistical Engine**: Comprehensive calculation functions for traditional and advanced metrics

## Critical Data Patterns

### Redis Key Structure
```
player:TEAM-PLAYER_NAME-YEAR:DATE        # Individual game stats
player:TEAM-PLAYER_NAME-YEAR:season      # Season aggregations
team:TEAM:YEAR:DATE                      # Team game stats
team:TEAM:YEAR:season                    # Team season stats
player-vs-team:PLAYER:vs:OPPONENT:*      # Matchup analytics
```

**Example**: `player:HOU-Jose_Altuve-2025:season` or `team:HOU:2025:2025-08-01`

### API Route Patterns
- Primary: `/api/v2/players`, `/api/v2/teams`, `/api/v2/stats` (enhanced with 40+ stat categories)
- Legacy: `/api/players`, `/api/teams` (redirected to v2 for compatibility)
- Use `getKeysByPattern()` and `getMultipleKeys()` from `utils/redis.js` for Redis operations

## Development Workflows

### Local Development
```bash
# Backend only
cd src/express-backend && npm run dev  # Port 8080

# Frontend only  
cd src/web-frontend && npm start       # Port 3001, proxies to 8080

# Full Docker stack
./run-docker.sh                        # Production mode
./run-docker.sh dev                    # Development with hot reload
```

### Data Management
```bash
# Pull latest MLB data (use v2 script for enhanced stats)
cd src/express-backend
node scripts/pullBoxscoresToRedis_v2.cjs

# Clear cache and validate
node scripts/clearRedisCache.cjs
node scripts/queryRedisStats.cjs
```

### Azure Deployment
```bash
# Complete deployment pipeline (commits, pushes to GitHub + Azure DevOps, triggers Azure Web App deployment)
./run-dev.sh

# The script handles:
# - Git optimization for large repos
# - Automatic commits with timestamps  
# - Force push to GitHub
# - Force push to Azure DevOps (triggers deployment pipeline)
# - Azure Web App automatic deployment via Azure DevOps pipeline
```

## Project-Specific Conventions

### Statistical Calculations
- **Batting**: Use proper weighted calculations (hits/atBats, not simple averages)
- **Pitching**: Parse innings pitched as "5.1" → 5.33 (outs/3), handle ERA as (earnedRuns * 9) / inningsPitched
- **Advanced metrics**: FIP, BABIP, OPS+, wOBA calculations in `pullBoxscoresToRedis_v2.cjs`
- **Comprehensive Coverage**: Project goal is testing EVERY possible baseball statistic - traditional, sabermetric, situational, and experimental
- **Statistical Categories**: Current 40+ categories are foundation for exhaustive statistical testing across all aspects of baseball performance

### Frontend Patterns
- **Theme**: Use `createAppTheme()` from `theme/theme.js` with baseball team colors
- **API calls**: Always use `apiService.js` methods, includes retry logic and error handling
- **Navigation**: Material-UI AppBar + Sidebar pattern with responsive breakpoints
- **State**: Local state for UI, API calls for data (no global state management)

### Error Handling
- Backend: Structured error responses with development/production modes
- Frontend: ErrorBoundary components wrap major sections
- Redis: Connection health checks at `/api/redis-health`

## Integration Points

### External Dependencies
- **MLB Stats API**: `statsapi.mlb.com` (no authentication required)
- **Azure Redis**: Production cache with TLS, fallback to local for development
- **Docker**: Multi-stage builds with separate frontend/backend containers

### Cross-Component Communication
- Frontend → Backend: REST API calls via `apiService.js`
- Backend → Redis: Singleton pattern via `utils/redis.js`
- Docker: Service networking with health checks and dependency management

## When Making Changes

1. **API modifications**: Update both v1 and v2 routes if changing core functionality
2. **Statistical calculations**: Modify `pullBoxscoresToRedis_v2.cjs` for data changes, API routes for presentation
3. **Frontend updates**: Use Material-UI components, maintain theme consistency, update proxy settings if changing backend ports
4. **Redis schema**: Update key patterns across scripts, API routes, and documentation when changing data structure

Always test with `./run-docker.sh dev` for full-stack integration before production deployment.
