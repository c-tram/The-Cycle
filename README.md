# The Cycle - MLB Dashboard

A comprehensive MLB dashboard application providing real-time standings, player statistics, game schedules, and trend analysis. Built with a modern React frontend and Express.js backend, featuring **HTTP-based web scraping** for reliable data collection without browser automation dependencies.

## 🎯 Features

### Core Functionality
- **Real-time MLB Standings**: Division standings with wins/losses, percentages, and games behind
- **Player Statistics**: Detailed Statcast data including batting averages, exit velocity, launch angles, and advanced metrics
- **Game Schedules**: Recent completed games and upcoming scheduled games
- **Trend Analysis**: Historical batting average trends and performance metrics
- **Team Management**: Searchable UI for selecting MLB teams and filtering data

### Technical Features
- **HTTP-Based Scraping**: Lightweight data collection using fetch + cheerio (no browser automation)
- **Redis Caching**: High-performance in-memory caching with Azure Redis Cache support
- **TypeScript**: Full type safety across frontend and backend
- **Dockerized**: Container-ready for easy deployment
- **Azure-Ready**: Built for Azure cloud deployment with DevOps pipelines and AAD authentication
- **REST API**: Clean API endpoints for all data access
- **Responsive UI**: Modern React interface with custom styling

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ with npm
- **Redis** (for local development) or **Azure Redis Cache** (for production)

### Development Setup

1. **Install backend dependencies**
   ```bash
   cd src/react-backend
   npm install
   ```

2. **Configure Redis (choose one option)**
   
   **Option A: Local Redis**
   ```bash
   # Install and start Redis locally
   brew install redis  # macOS
   redis-server        # Start Redis server
   ```
   
   **Option B: Azure Redis Cache**
   ```bash
   # Set environment variables
   export REDIS_HOST=your-redis-cache.redis.cache.windows.net
   export REDIS_PORT=6380
   export REDIS_PASSWORD=your-redis-key
   export REDIS_TLS=true
   export REDIS_AUTH_MODE=key  # or 'aad' for Azure AD authentication
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - Endpoints available at `/api/*`

4. **Install frontend dependencies** (separate terminal)
   ```bash
   cd src/react-frontend
   npm install
   ```

5. **Start the frontend**
   ```bash
   npm run dev
   ```
   - Frontend UI: [http://localhost:5173](http://localhost:5173)

### Production Build

1. **Build TypeScript backend**
   ```bash
   cd src/react-backend
   npm run build
   ```

2. **Build React frontend**
   ```bash
   cd src/react-frontend
   npm run build
   ```

## 🐳 Docker Deployment

### Build and Run Container

```bash
# Build the Docker image with Redis configuration
docker build -t mlb-dashboard \
  --build-arg REDIS_HOST=your-redis-host \
  --build-arg REDIS_PORT=6379 \
  --build-arg REDIS_AUTH_MODE=key \
  .

# Run the container with Redis environment variables
docker run -p 3000:3000 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=your-redis-password \
  -e REDIS_TLS=true \
  -e REDIS_AUTH_MODE=key \
  mlb-dashboard
```

The containerized app will be available at [http://localhost:3000](http://localhost:3000)

### Azure Container Registry

```bash
# Tag for Azure Container Registry
docker tag mlb-dashboard your-registry.azurecr.io/mlb-dashboard:latest

# Push to registry
docker push your-registry.azurecr.io/mlb-dashboard:latest
```

## 📡 API Endpoints

All endpoints return JSON data with intelligent Redis caching for optimal performance. Cache expiration times are optimized per data type (standings: 30min, stats: 60min, games: 15min).

### `/api/standings`
Returns current MLB division standings
```json
[
  {
    "division": "American League East",
    "teams": [
      {
        "team": "New York Yankees",
        "wins": 92,
        "losses": 70,
        "pct": ".568",
        "gb": "-",
        "last10": "7-3",
        "streak": "W4"
      }
    ]
  }
]
```

### `/api/roster`
Returns detailed player statistics and Statcast data
```json
{
  "statHeaders": ["Player", "Season", "PA", "AB", "H", "HR", "BA", "OBP", "SLG", ...],
  "players": [
    {
      "name": "Judge, Aaron",
      "season": "2025",
      "stats": ["244", "205", "81", "18", ".395", ".488", ".746", ...]
    }
  ]
}
```

### `/api/games`
Returns recent and upcoming games
```json
{
  "recent": [
    {
      "homeTeam": "Cleveland Guardians",
      "awayTeam": "Los Angeles Dodgers",
      "date": "2025-05-27",
      "status": "completed",
      "homeScore": 5,
      "awayScore": 9
    }
  ],
  "upcoming": [
    {
      "homeTeam": "Detroit Tigers",
      "awayTeam": "San Francisco Giants",
      "date": "2025-05-28",
      "status": "scheduled",
      "time": "12:10 PM"
    }
  ]
}
```

### `/api/trends`
Returns trend analysis data
```json
{
  "Batting Average": [0.268, 0.265, 0.271, 0.275, 0.269, 0.263, 0.267]
}
```

## 🔄 Migration: Local Files → Redis Caching

**Successfully completed migration from local file caching to Redis-based caching (June 2025)**

### What Changed
- **Removed**: Local JSON file caching in `data/` directory
- **Added**: Redis-based in-memory caching with configurable TTL
- **Enhanced**: Support for both local Redis and Azure Redis Cache
- **Implemented**: Azure AD authentication for enterprise Redis instances

### Benefits
- **Faster Performance**: In-memory caching vs file I/O operations
- **Scalability**: Multiple application instances can share cache
- **Cloud-Ready**: Native Azure Redis Cache integration
- **Configurable TTL**: Optimized cache expiration per data type
- **High Availability**: Redis clustering and failover support
- **Security**: Azure AD authentication and TLS encryption

### Cache Configuration
```typescript
// Cache TTL by data type
const cacheTTL = {
  standings: 30 * 60,     // 30 minutes
  playerStats: 60 * 60,   // 60 minutes  
  games: 15 * 60,         // 15 minutes
  trends: 120 * 60        // 2 hours
};
```

### Redis Authentication Modes
- **Key Authentication**: Traditional Redis password-based auth
- **Azure AD Authentication**: Enterprise SSO with managed identities
- **Automatic Fallback**: In-memory cache when Redis unavailable

## 🚀 Recent Updates & Upcoming Features

### Recent Performance Improvements (June 2025)
- **Enhanced Timeout Handling**: Increased frontend timeout to 60s, backend to 90s
- **Retry Logic**: Added exponential backoff for API retries (2s, 4s, 8s)
- **Error Handling**: Improved error logging and user feedback
- **API Stability**: Enhanced connection reliability between frontend and backend

### 🚀 Upcoming Features

#### 1. Enhanced Trend Analysis
- **1/7/30 Day Views**: Historical performance trends across different timeframes
- **Key Metrics**:
  - Batting averages and slash lines
  - Pitching ERA and WHIP
  - Team win/loss percentages
- **Visual Analytics**: Interactive charts and graphs
- **Data Export**: CSV/JSON export options

#### 2. Team Schedule Management
- **Calendar View**: Visual schedule representation
- **Game Details**: 
  - Start times and venues
  - Probable pitchers
  - Weather conditions
  - TV/streaming information
- **Filters**: Home/away games, division matchups
- **Integration**: Sync with calendar apps

#### 3. Game Prediction Engine
- **Win/Loss Predictions**: Machine learning-based game outcome forecasting
- **Factors Considered**:
  - Historical matchup data
  - Current team performance
  - Pitcher matchups
  - Weather conditions
  - Team rest days
- **Confidence Scores**: Probability ratings for predictions
- **Performance Tracking**: Accuracy monitoring of predictions

## 🔧 Recent Fixes: MLB Batting Stats API (May 28, 2025)

**Successfully resolved batting stats API issue that was returning empty player data**

### Issue Summary
The backend endpoint `/api/roster?team=nyy&statType=batting` was returning 0 players while pitching stats worked correctly. Investigation revealed a parameter mismatch between frontend requests and backend processing.

### Root Cause
- **Frontend**: Sending `statType=batting` in API requests
- **Backend**: Expecting `statType=hitting` for MLB API calls
- **MLB API**: Uses `group=hitting` for batting statistics

### Solution Implemented
Added parameter normalization in the backend API handler:

```typescript
// Normalize statType - 'batting' should be treated as 'hitting' for MLB API
const statType = requestedStatType === 'batting' ? 'hitting' : requestedStatType;
```

### Results
✅ **Yankees Batting Stats**: Now returns 13 players with complete statistics
- Aaron Judge: AVG=.395, HR=18, RBI=47
- Anthony Volpe: AVG=.245, HR=6, RBI=32
- Austin Wells: AVG=.206, HR=8, RBI=31

✅ **All Teams**: Batting stats working for all 30 MLB teams
✅ **Pitching Stats**: Continue to work correctly (13 pitchers per team)
✅ **API Compatibility**: Backend now accepts both `batting` and `hitting` parameters

### Technical Details
- **Enhanced Logging**: Added detailed request/response logging for debugging
- **Parameter Flexibility**: Backend gracefully handles both parameter formats
- **MLB API Integration**: Improved error handling and data validation
- **Performance**: No impact on response times or reliability

## 🧪 Testing

### Backend Tests
```bash
cd src/react-backend
npm test
```
- **Framework**: Jest with TypeScript support
- **Coverage**: Generated in `coverage/` directory
- **Files**: All `*.test.ts` files in `src/` directory

### Frontend Tests
```bash
cd src/react-frontend
npm test
```
- **Framework**: Vitest for React components
- **Coverage**: Generated in `coverage/` directory
- **Files**: All `*.test.ts` and `*.test.tsx` files

## ☁️ Azure Deployment

### Azure Web App for Containers
1. Push Docker image to Azure Container Registry
2. Create Azure Web App with container deployment
3. Configure environment variables and scaling

### Azure DevOps Pipeline
```yaml
# Example azure-pipelines.yml configuration
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: Docker@2
  inputs:
    command: 'buildAndPush'
    repository: 'mlb-dashboard'
    dockerfile: 'src/Dockerfile'
    tags: |
      $(Build.BuildId)
      latest
```

## 📁 Project Structure

```
The Cycle/
├── README.md                 # This file
├── package.json             # Root package configuration
├── DATABASE_PLAN.md         # Database planning documentation
├── run-dev.sh              # Development startup script
└── src/
    ├── Dockerfile           # Container configuration
    ├── react-backend/       # Express.js API server
    │   ├── src/
    │   │   ├── index.ts    # Server entry point
    │   │   ├── scrapers/   # HTTP-based data scrapers
    │   │   │   ├── standingsScraper.ts
    │   │   │   ├── playerStatsScraper.ts
    │   │   │   ├── gamesScraper.ts
    │   │   │   └── trendsScraper.ts
    │   │   └── services/   # Business logic services
    │   ├── data/           # Mock/fallback data
    │   └── coverage/       # Test coverage reports
    └── react-frontend/     # React application
        ├── src/
        │   ├── components/ # React components
        │   ├── pages/      # Page components
        │   ├── services/   # API client
        │   └── styles/     # CSS styling
        └── coverage/       # Test coverage reports
```

## 🛠 Development

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting for consistency
- **Jest/Vitest**: Comprehensive testing setup
- **Error Handling**: Graceful fallbacks for all data sources

### Data Sources
- **MLB.com**: Primary source for standings and statistics
- **Baseball Savant**: Advanced Statcast metrics
- **Fallback Data**: Mock data ensures application functionality during outages

## 📊 Current Status

✅ **Fully Functional**
- All API endpoints operational
- HTTP-based scraping working reliably
- Docker container builds successfully
- Frontend and backend integrated
- Test suites passing

✅ **Ready for Production**
- Container-optimized for deployment
- Error handling and fallbacks implemented
- Performance optimized (post-migration)
- Documentation complete

---

**Built with React, Node.js, TypeScript, Docker, and Azure** | **Powered by HTTP-based web scraping**
