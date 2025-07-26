# The Cycle - Professional MLB Analytics Platform

> Enterprise-grade baseball analytics dashboard with comprehensive statistics, advanced insights, and professional scouting tools

## 🎯 Project Overview

The Cycle is a professional-grade MLB analytics platform featuring a modern React frontend with Material-UI design, enhanced backend APIs with 40+ statistical categories, and comprehensive baseball analytics matching MLB.com standards.

### 🏆 Key Features
- **Professional React Frontend** - Modern Material-UI interface with baseball-inspired theming
- **Enhanced v2 API Endpoints** - Comprehensive statistics with proper weighted calculations
- **Real-time MLB Data** - Official MLB API integration with Redis caching
- **Advanced Analytics** - 40+ statistical categories including FIP, BABIP, OPS+, and more
- **Professional Scouting Tools** - Comprehensive player analysis and team comparisons
- **Responsive Design** - Mobile-optimized interface with dark/light themes
- **Statistical Leaders** - Real-time leaderboards across all categories

---

## 📋 Project Checklist & Progress

### ✅ Phase 1: Backend Infrastructure (COMPLETED)
- [x] **Redis Data Architecture** - Comprehensive MLB data storage with Azure Redis Cache
- [x] **Enhanced Data Scripts** - Professional pullBoxscoresToRedis_v2.cjs with proper calculations
- [x] **Express API Server v2** - Enhanced RESTful API with 40+ statistical categories
- [x] **Advanced Statistics** - FIP, BABIP, OPS+, wOBA, and professional-grade metrics
- [x] **Azure Web App Ready** - Production deployment configuration
- [x] **Comprehensive Documentation** - Enhanced API documentation and analysis reports

### ✅ Phase 2: Professional Frontend (COMPLETED)
- [x] **React + Material-UI** - Modern professional interface with enterprise-grade design
- [x] **Professional Dashboard** - Comprehensive analytics overview with summary cards
- [x] **Player Management** - Advanced player browser with filtering and detailed profiles
- [x] **Team Center** - Complete team information with standings and statistics
- [x] **Search & Filtering** - Comprehensive search across players and teams
- [x] **Advanced Theming** - Baseball-inspired color system with dark/light modes
- [x] **Responsive Design** - Mobile-optimized interface with smooth animations
- [x] **API Integration** - Professional service layer with health monitoring
- [x] **Statistical Visualizations** - Charts and graphs for data analysis

### 🚧 Phase 3: Advanced Features (IN PROGRESS)
- [x] **Professional UI Foundation** - Complete layout with navigation and sidebar
- [ ] **Real-time Data Updates** - Live statistical updates and notifications
- [ ] **Advanced Analytics Dashboard** - Trend analysis and predictive insights
- [ ] **Player Comparison Tools** - Side-by-side statistical comparisons
- [ ] **Team Roster Management** - Detailed roster analysis and projections
- [ ] **Historical Analysis** - Multi-season trend analysis and comparisons

### 🔄 Phase 4: Production & Optimization (PENDING)
- [ ] **Azure Production Deployment** - Cloud deployment with load balancing
- [ ] **Performance Optimization** - Advanced caching and query optimization
- [ ] **Testing Suite** - Comprehensive unit and integration testing
- [ ] **Mobile App** - React Native application for mobile platforms

---

## 🏗️ Architecture

### Project Structure
```
The-Cycle/
├── src/
│   ├── express-backend/        # Backend API service
│   └── next-frontend/         # Frontend web application
├── docker-compose.yml         # Production container orchestration
├── docker-compose.dev.yml     # Development overrides
├── Dockerfile                 # Multi-stage build configuration
├── nginx.conf                 # Reverse proxy configuration
├── run-docker.sh             # Container startup script
└── stop-docker.sh            # Container shutdown script
```

### Backend (Express.js + Redis + Azure)
```
src/express-backend/           # Express.js API server
├── src/
│   ├── server.js              # Main server configuration
│   └── routes/                # API endpoints
│       ├── players_v2.js      # Enhanced player API with 40+ stats
│       ├── teams_v2.js        # Enhanced team statistics API
│       ├── stats_v2.js        # Advanced statistics API
│       ├── players.js         # Legacy player API (v1)
│       ├── teams.js           # Legacy team statistics API
│       ├── matchups.js        # Matchup analytics API
│       └── stats.js           # Legacy statistics API (v1)
│   └── utils/
│       └── redis.js           # Redis connection utilities
├── scripts/                   # Data management scripts
│   ├── pullBoxscoresToRedis_v2.cjs    # Enhanced data ingestion with proper calculations
│   ├── pullBoxscoresToRedis.cjs       # Legacy data ingestion
│   ├── clearRedisCache.cjs            # Cache management
│   └── queryRedisStats.cjs            # Data validation
├── package.json               # Dependencies & scripts
├── web.config                 # Azure Web App configuration
└── .env.template              # Environment variables template
```

### Professional React Frontend (Material-UI + React Router)
```
src/web-frontend/              # React application
├── src/
│   ├── App.js                 # Main application component
│   ├── index.js               # Application entry point
│   ├── components/            # Reusable UI components
│   │   ├── layout/            # Navigation and layout components
│   │   ├── common/            # Shared UI components
│   │   └── charts/            # Data visualization components
│   ├── pages/                 # Main application pages
│   │   ├── Dashboard.js       # Analytics overview
│   │   ├── Players.js         # Player browser with filtering
│   │   ├── PlayerDetail.js    # Detailed player profiles
│   │   ├── Teams.js           # Team management center
│   │   ├── TeamDetail.js      # Detailed team analysis
│   │   ├── Leaders.js         # Statistical leaderboards
│   │   ├── Analytics.js       # Advanced analytics
│   │   ├── Compare.js         # Player/team comparisons
│   │   └── Settings.js        # Application settings
│   ├── services/
│   │   └── apiService.js      # Professional API integration layer
│   └── theme/
│       ├── theme.js           # Material-UI theme configuration
│       └── teamColors.js      # Baseball team color system
├── public/                    # Static assets
├── package.json               # Frontend dependencies
└── README.md                  # Frontend documentation
```
```
src/express-backend/
├── src/
│   ├── server.js              # Main Express server
│   ├── routes/                # API endpoints
│   │   ├── players.js         # Player statistics API
│   │   ├── teams.js           # Team statistics API
│   │   ├── matchups.js        # Matchup analytics API
│   │   └── stats.js           # General statistics API
│   └── utils/
│       └── redis.js           # Redis connection utilities
├── scripts/                   # Data management scripts
│   ├── pullBoxscoresToRedis.cjs    # Main data ingestion
│   ├── clearRedisCache.cjs         # Cache management
│   └── queryRedisStats.cjs         # Data validation
├── package.json               # Dependencies & scripts
├── web.config                 # Azure Web App configuration
└── .env.template              # Environment variables template
```



### Data Structure (Redis)
```
# Enhanced v2 Data Structure with 40+ Statistical Categories
player:TEAM-PLAYER-YEAR:DATE           # Individual game stats with advanced metrics
player:TEAM-PLAYER-YEAR:average        # Season averages with FIP, BABIP, OPS+, wOBA
team:TEAM:YEAR:DATE                    # Team game stats with comprehensive data
team:TEAM:YEAR:average                 # Team season averages with advanced analytics
player-vs-team:PLAYER:vs:OPPONENT:*    # Matchup analytics with situational splits
team-vs-team:TEAM:vs:OPPONENT:*        # Team matchup data with trend analysis

# Statistical Categories (v2 Enhancement)
Batting: AVG, OBP, SLG, OPS, OPS+, wOBA, ISO, BABIP, wRC+
Pitching: ERA, FIP, WHIP, K/9, BB/9, HR/9, SIERA, xFIP
Fielding: DRS, UZR, Range Factor, Fielding %, Errors
Advanced: WPA, RE24, Clutch Index, Pressure situations
```

---

## 🗃️ Database Status

### Current Data Load (2025 Season)
- **Games Processed**: 1,491 completed games
- **Players**: 1,471 unique players
- **Teams**: 32 MLB teams
- **Player vs Team Matchups**: 19,627 records
- **Team vs Team Matchups**: 672 records
- **Date Range**: July 23 - September 30, 2025

### Data Quality
- ✅ Proper batting average calculations (hits/at-bats)
- ✅ Accurate ERA calculations ((earned runs * 9) / innings pitched)
- ✅ Comprehensive aggregation (per-game and season totals)
- ✅ Advanced matchup analytics for scouting

---

## 🚀 Enhanced v2 API Endpoints

### Players (v2 Enhanced)
- `GET /api/v2/players` - List all players with advanced filtering and 40+ statistical categories
- `GET /api/v2/players/:team/:name/:year` - Player season stats with FIP, BABIP, OPS+, wOBA
- `GET /api/v2/players/:team/:name/:year/games` - Game-by-game stats with advanced metrics
- `GET /api/v2/players/:team/:name/:year/vs/:opponent` - Enhanced player vs team analytics
- `GET /api/v2/players/compare` - Advanced player comparison tool
- `GET /api/v2/players/trends` - Player performance trend analysis

### Teams (v2 Enhanced)
- `GET /api/v2/teams` - List all teams with comprehensive statistics
- `GET /api/v2/teams/:team/:year` - Team season stats with advanced team metrics
- `GET /api/v2/teams/:team/:year/games` - Team game-by-game with situational splits
- `GET /api/v2/teams/:team/:year/vs/:opponent` - Enhanced team vs team analytics
- `GET /api/v2/teams/:team/:year/roster` - Team roster with advanced player metrics
- `GET /api/v2/teams/standings` - Enhanced standings with advanced team statistics

### Statistics (v2 Enhanced)
- `GET /api/v2/stats/summary` - Comprehensive database overview with v2 metrics
- `GET /api/v2/stats/leaders` - Statistical leaders across 40+ categories
- `GET /api/v2/stats/search` - Advanced search with statistical filters
- `POST /api/v2/stats/compare` - Enhanced player/team comparison with advanced metrics
- `GET /api/v2/stats/trends` - Statistical trend analysis and projections

### Legacy v1 Endpoints (Maintained for Compatibility)
- `GET /api/players` - Original player endpoints
- `GET /api/teams` - Original team endpoints  
- `GET /api/matchups` - Original matchup analytics
- `GET /api/stats` - Original statistics endpoints

### Health & Monitoring
- `GET /health` - Server health check
- `GET /api/redis-health` - Redis connection status
- `GET /api/v2/health` - Enhanced health check with v2 metrics

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for containerized setup)
- Azure Redis Cache access
- MLB API access (built-in, no key required)

### Option 1: Docker Setup (Recommended)
```bash
# Standard mode
./run-docker.sh

# Development mode (with hot reload)
./run-docker.sh dev

# Production mode (with nginx reverse proxy)
./run-docker.sh prod

# Stop containers
./stop-docker.sh
```

**Docker URLs:**
- Professional React Frontend: http://localhost:3000 (dev) / http://localhost (prod)
- Express Backend API: http://localhost:3001
- Production (nginx): http://localhost

### Option 2: Local Development

#### Backend Setup
```bash
cd src/express-backend
npm install
npm run dev
# Enhanced v2 API runs on http://localhost:8080
```

#### React Frontend Setup
```bash
cd src/web-frontend
npm install
npm start
# Professional React frontend runs on http://localhost:3001
```

**Local Development URLs:**
- React Frontend: http://localhost:3001
- Backend API: http://localhost:8080
- Frontend connects to backend automatically with proxy configuration

### Data Management

#### Pull Latest MLB Data (Enhanced v2)
```bash
cd src/express-backend
node scripts/pullBoxscoresToRedis_v2.cjs
# Enhanced script with proper calculations and 40+ statistical categories
```

#### Clear Cache & Reset Data
```bash
cd src/express-backend
node scripts/clearRedisCache.cjs
```

#### Query & Validate Data
```bash
cd src/express-backend
node scripts/queryRedisStats.cjs
```

### Environment Variables (Azure Web App)
```
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.azurewebsites.net
REDIS_HOST=thecycle.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

---

## 🎯 Current Status & Next Steps

### ✅ Completed (Professional Platform Ready)
1. **Enhanced Backend Infrastructure**
   - Professional pullBoxscoresToRedis_v2.cjs with proper MLB calculations
   - v2 API routes with 40+ statistical categories including FIP, BABIP, OPS+, wOBA
   - Comprehensive error handling and health monitoring

2. **Professional React Frontend**
   - Material-UI enterprise-grade interface with baseball-inspired theming
   - Complete navigation system with AppBar, sidebar, and responsive design
   - Dashboard, Players, Teams, PlayerDetail, and comprehensive page architecture
   - Professional API service layer with health monitoring

3. **Advanced Features Implemented**
   - Real-time search across all data
   - Advanced filtering and sorting capabilities
   - Smooth animations and professional UI/UX
   - Dark/light theme support with team color integration

### 🚀 Next Development Phase
1. **Real-time Data Updates**
   - Live statistical updates and notifications
   - WebSocket integration for real-time scores

2. **Advanced Analytics Dashboard**
   - Trend analysis and predictive insights
   - Interactive charts and visualizations
3. **Player Comparison Tools**
   - Side-by-side statistical comparisons
   - Multi-player analysis capabilities
   - Advanced filtering and comparison metrics

4. **Azure Production Deployment**
   - Cloud deployment with load balancing
   - Production optimization and monitoring
   - Scalable infrastructure setup

---

## 📊 Professional Use Cases

### Baseball Analytics & Scouting
- **Advanced Player Analysis**: 40+ statistical categories including FIP, BABIP, OPS+, wOBA
- **Professional Matchup Intelligence**: Enhanced analytics on player vs team performance
- **Comprehensive Team Evaluation**: Team statistics with advanced metrics and trends

### Fantasy Baseball Intelligence
- **Data-Driven Player Selection**: Professional-grade statistics for draft decisions
- **Advanced Matchup Optimization**: Enhanced player vs team analytics for lineup decisions
- **Performance Tracking**: Season-long monitoring with trend analysis

### Professional Betting Analytics
- **Statistical Edge Detection**: Advanced metrics to identify betting opportunities
- **Trend Analysis**: Historical performance patterns with predictive insights
- **Matchup Advantages**: Enhanced team vs team performance analytics

---

## 🔧 Technical Implementation

### Backend Architecture
- **Express.js API**: Enhanced v2 routes with 40+ statistical categories
- **Azure Redis Cache**: High-performance data storage with sub-millisecond access
- **Professional Data Processing**: Enhanced pullBoxscoresToRedis_v2.cjs with proper calculations
- **Health Monitoring**: Comprehensive API health checks and monitoring

### Frontend Architecture  
- **React + Material-UI**: Professional enterprise-grade interface
- **Responsive Design**: Mobile-optimized with smooth animations
- **Advanced Theming**: Baseball-inspired design system with dark/light modes
- **Professional Navigation**: AppBar with dropdown menus and sidebar

### Data & Performance
- **Official MLB API**: Direct integration with statsapi.mlb.com
- **Enhanced Calculations**: Professional-grade statistical formulas matching MLB standards
- **Azure Cloud Ready**: Scalable deployment configuration
- **Real-time Capabilities**: Foundation for live updates and notifications

---

*Last Updated: January 2025 - Professional React Frontend Complete*