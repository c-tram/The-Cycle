# The Cycle - MLB Analytics Platform

> **ULTIMATE GOAL**: Testing every possible baseball statistic that is imaginable. Comprehensive MLB analytics platform with exhaustive statistical coverage including traditional stats, advanced sabermetrics, situational analytics, and experimental metrics.

## 🎯 Project Mission

**The Cycle** aims to be the most comprehensive MLB analytics platform ever built, featuring:
- **Exhaustive Statistical Testing** - Every conceivable baseball metric from traditional to experimental
- **Real Contract Analysis** - True Contract Value Rating (CVR) using actual salary data
- **Dynamic Baselines** - League percentile calculations that update every 50 complete MLB games
- **Professional Grade Analytics** - WAR, CVR, FIP, BABIP, OPS+, wOBA and 40+ statistical categories
- **Production-Ready Architecture** - React frontend, Express.js API, Azure Redis, Docker deployment

---

## 🏆 Major Achievements & Current Status

### ✅ **Advanced Analytics Engine (COMPLETED)**
- **Dynamic WAR Baselines** - League percentile calculations updating every 50 complete MLB games
- **True Contract Value Rating (CVR)** - Performance assessment against actual player contracts
- **Comprehensive Statistics** - 40+ statistical categories as foundation for exhaustive testing
- **Redis Pipeline Optimization** - 500-key batch operations with atomic transactions
- **Enhanced Error Handling** - EPIPE/ECONNRESET auto-reconnection with TLS configuration

### ✅ **Data Collection & Processing (COMPLETED)**
- **MLB Stats API Integration** - Comprehensive boxscore processing with rate limiting
- **Salary Data Collection** - Team-based concurrency with bot detection avoidance
- **Parallel Processing Framework** - CPU-optimized concurrency for maximum efficiency
- **Connection Resilience** - Auto-reconnection with retry logic and graceful shutdown

### ✅ **Backend Infrastructure (COMPLETED)**
- **Enhanced v2 API Routes** - `/api/v2/players`, `/api/v2/teams`, `/api/v2/stats` with 40+ categories
- **Azure Redis Integration** - Production cache with TLS, pipeline operations, connection pooling
- **Statistical Accuracy** - Fixed pitcher percentile logic, duplicate aggregation issues
- **Professional Error Handling** - Structured responses with development/production modes

### 🚧 **Frontend Development (IN PROGRESS)**
- **React + Material-UI Foundation** - Baseball-themed professional interface
- **Dashboard Statistics** - CVR/WAR leaders with season aggregation data
- **API Service Layer** - Retry logic, error handling, proxy configuration
- **Responsive Design** - Material-UI AppBar + Sidebar with breakpoint management

### 🔄 **Current Focus Areas**
- **Season Aggregation** - Local environment missing season-level statistics for dashboard
- **Statistical Coverage Expansion** - Moving toward exhaustive baseball metric testing
- **Performance Optimization** - Team-based salary collection with controlled concurrency
- **Production Deployment** - Azure DevOps pipeline with container registry integration

---

## 🏗️ Technical Architecture

### **Core Components**
- **Backend**: Express.js API (`src/express-backend/`) with v2 routes providing enhanced MLB statistics
- **Frontend**: React + Material-UI (`src/web-frontend/`) with professional baseball-themed interface  
- **Data Layer**: Azure Redis Cache with structured keys for players, teams, and matchups
- **Data Ingestion**: MLB Stats API integration via `pullBoxscoresToRedis_v2.cjs` script
- **Statistical Engine**: Comprehensive calculation functions for traditional and advanced metrics

### **Redis Key Structure**
```
player:TEAM-PLAYER_NAME-YEAR:DATE        # Individual game stats
player:TEAM-PLAYER_NAME-YEAR:season      # Season aggregations
team:TEAM:YEAR:DATE                      # Team game stats
team:TEAM:YEAR:season                    # Team season stats
player-vs-team:PLAYER:vs:OPPONENT:*      # Matchup analytics
salary:TEAM-PLAYER_NAME-YEAR             # Contract salary data
```

### **API Route Patterns**
- **Primary**: `/api/v2/players`, `/api/v2/teams`, `/api/v2/stats` (enhanced with 40+ stat categories)
- **Legacy**: `/api/players`, `/api/teams` (redirected to v2 for compatibility)
- **Redis Operations**: `getKeysByPattern()` and `getMultipleKeys()` from `utils/redis.js`

---

## 🚀 Development Workflows

### **Local Development**
```bash
# Backend only
cd src/express-backend && npm run dev  # Port 8080

# Frontend only  
cd src/web-frontend && npm start       # Port 3001, proxies to 8080

# Full Docker stack
./run-docker.sh                        # Production mode
./run-docker.sh dev                    # Development with hot reload
```

### **Data Management**
```bash
# Collect salary data FIRST (for true CVR calculations)
cd src/express-backend
node scripts/collectSalaryData_v3.cjs 2025

# Pull latest MLB data with contract-based CVR
node scripts/pullBoxscoresToRedis_v2.cjs

# Cache management and validation
node scripts/clearRedisCache.cjs
node scripts/queryRedisStats.cjs
```

### **Azure Deployment**
```bash
# Complete deployment pipeline
./run-dev.sh

# Handles: Git optimization → Auto commits → GitHub push → 
#          Azure DevOps force push → Web App deployment
```

---

## 📊 Statistical Innovation

### **Dynamic Baselines System**
- **Adaptive Calculations** - WAR/CVR baselines update every 50 complete MLB games
- **League Context** - Percentile calculations provide responsive accuracy
- **Performance Scaling** - Realistic WAR range (-2 to 5) with context-aware evaluation

### **Contract Value Rating (CVR)**
- **True Contract Assessment** - Performance vs actual salary when available
- **Fallback Estimation** - Performance-based salary estimation when contract data unavailable
- **Value Grading** - Elite Value (1.8+) to Poor Value (<0.5) classifications
- **Source Tracking** - Clear indication of contract vs estimated salary usage

### **Comprehensive Statistics (40+ Categories)**
**Foundation for exhaustive statistical testing across:**
- **Traditional Stats** - AVG, OBP, SLG, ERA, WHIP, etc.
- **Advanced Sabermetrics** - WAR, FIP, BABIP, OPS+, wOBA
- **Situational Analytics** - Clutch performance, platoon splits
- **Experimental Metrics** - Custom value calculations and novel approaches

---

## 🎯 Project Roadmap

### **Phase 1: Statistical Foundation (COMPLETED)**
- ✅ Dynamic WAR/CVR calculations with real contract data
- ✅ Comprehensive data collection with bot detection avoidance
- ✅ Redis optimization with pipeline operations
- ✅ Enhanced API endpoints with 40+ statistical categories

### **Phase 2: Exhaustive Statistical Testing (IN PROGRESS)**
- 🔄 Expand to every conceivable baseball statistic
- 🔄 Situational analytics (clutch, platoon, weather, etc.)
- 🔄 Experimental metric development and validation
- 🔄 Historical trend analysis across multiple seasons

### **Phase 3: Advanced Analytics Dashboard (PENDING)**
- 📅 Interactive statistical exploration interface
- 📅 Custom metric builder for experimental statistics
- 📅 Predictive analytics and trend forecasting
- 📅 Professional scouting report generation

### **Phase 4: Production Excellence (PENDING)**
- 📅 Real-time data streaming and live updates
- 📅 Mobile application with offline capabilities
- 📅 API rate limiting and enterprise features
- 📅 Comprehensive testing and monitoring suite

---
## 🛠️ Technical Implementation

### **Project Structure**
```
The-Cycle/
├── src/
│   ├── express-backend/           # Enhanced API service with v2 endpoints
│   │   ├── src/
│   │   │   ├── server.js          # Main server configuration
│   │   │   ├── routes/            # API endpoints
│   │   │   │   ├── players_v2.js  # Enhanced player API (40+ stats)
│   │   │   │   ├── teams_v2.js    # Enhanced team statistics API
│   │   │   │   ├── stats_v2.js    # Advanced statistics API
│   │   │   │   └── matchups.js    # Matchup analytics API
│   │   │   └── utils/
│   │   │       └── redis.js       # Enhanced Redis utilities
│   │   └── scripts/               # Data management scripts
│   │       ├── pullBoxscoresToRedis_v2.cjs    # Enhanced MLB data ingestion
│   │       ├── collectSalaryData_v3.cjs       # Salary data collection
│   │       ├── clearRedisCache.cjs            # Cache management
│   │       └── queryRedisStats.cjs            # Data validation
│   └── web-frontend/              # React + Material-UI application
│       ├── src/
│       │   ├── components/        # Professional UI components
│       │   ├── pages/             # Application pages
│       │   ├── services/          # API integration layer
│       │   └── theme/             # Baseball-themed Material-UI
│       └── public/                # Static assets
├── docker-compose.yml             # Production orchestration
├── Dockerfile.combined            # Multi-stage Docker build
├── nginx.conf                     # Reverse proxy configuration
├── run-docker.sh                  # Container management
└── run-dev.sh                     # Azure deployment pipeline
```

### **Enhanced Features**

#### **Data Collection & Processing**
- **Team-Based Salary Collection** - Concurrent processing with 2-3s anti-bot delays
- **User-Agent Rotation** - 5 different browser signatures for stealth
- **Redis Pipeline Operations** - 500-key batches with atomic transactions  
- **Dynamic Baseline Updates** - League percentiles recalculated every 50 games
- **Error Recovery** - EPIPE/ECONNRESET auto-reconnection with exponential backoff

#### **Statistical Calculations**
- **Contract-Aware CVR** - Uses actual salary data when available
- **Performance Grading** - Elite/Star/Very Good classifications for WAR and CVR
- **Pitcher-Specific Logic** - Fixed percentile calculations for ERA/WHIP/K9
- **Two-Way Player Support** - Combined WAR calculation for multi-position players
- **Rate Stat Accuracy** - Professional weighted calculations (hits/atBats vs averages)

#### **API Architecture**
- **v2 Enhanced Endpoints** - 40+ statistical categories as foundation
- **Legacy Compatibility** - v1 routes redirect to v2 for seamless transition
- **Health Monitoring** - Redis connection status at `/api/redis-health`
- **Error Handling** - Structured responses with development/production modes
- **Response Caching** - Optimized Redis key patterns with batch operations

---

## 📈 Performance Metrics

### **Data Processing Speed**
- **Salary Collection**: 30 teams (1500+ players) in ~3 minutes with concurrency
- **Game Processing**: Parallel game processing with CPU-optimized concurrency
- **Redis Operations**: Pipeline batching reduces connection overhead by 80%
- **Statistical Calculations**: Dynamic baselines ensure responsive accuracy

### **System Reliability**
- **Connection Resilience**: Auto-reconnection handles network interruptions
- **Error Recovery**: Graceful degradation with fallback mechanisms
- **Data Consistency**: Atomic transactions prevent partial updates
- **Cache Efficiency**: Structured Redis keys optimize query performance

---

## 🔧 Quick Start Guide

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- Azure Redis Cache (production) or local Redis (development)

### **Installation & Setup**
```bash
# Clone repository
git clone https://github.com/c-tram/The-Cycle.git
cd The-Cycle

# Install dependencies
cd src/express-backend && npm install
cd ../web-frontend && npm install

# Configure environment
cp src/express-backend/.env.template src/express-backend/.env
# Edit .env with your Redis configuration

# Start development environment
./run-docker.sh dev
```

### **Data Collection Workflow**
```bash
# 1. Collect salary data first (enables true CVR calculations)
cd src/express-backend
node scripts/collectSalaryData_v3.cjs 2025

# 2. Process MLB game data with contract-based CVR
node scripts/pullBoxscoresToRedis_v2.cjs

# 3. Verify data collection
node scripts/queryRedisStats.cjs
```

### **Development Commands**
```bash
# Backend development server
cd src/express-backend && npm run dev    # Port 8080

# Frontend development server  
cd src/web-frontend && npm start         # Port 3001

# Full Docker environment
./run-docker.sh                          # Production mode
./run-docker.sh dev                      # Development mode

# Azure deployment
./run-dev.sh                             # Complete CI/CD pipeline
```

---

## 📋 Environment Configuration

### **Required Environment Variables**
```bash
# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6380
REDIS_PASSWORD=your-password
REDIS_AUTH_MODE=require_auth

# Application Settings
NODE_ENV=production
PORT=8080

# Azure Deployment (for production)
AZURE_SUBSCRIPTION=your-subscription
DOCKER_REGISTRY_SERVICE_CONNECTION=your-service-connection
CONTAINER_REGISTRY=your-registry.azurecr.io
IMAGE_REPOSITORY=thecycle
```

---

## 🤝 Contributing

### **Development Principles**
1. **Statistical Accuracy First** - All calculations must match professional baseball standards
2. **Performance Optimization** - Redis pipelines, parallel processing, efficient algorithms
3. **Error Resilience** - Graceful degradation and comprehensive error handling
4. **Comprehensive Testing** - Every baseball statistic imaginable as the ultimate goal
5. **Professional Standards** - Enterprise-grade code quality and documentation

### **Current Priorities**
- **Statistical Expansion** - Adding new metrics toward exhaustive coverage
- **Dashboard Enhancement** - Season aggregation data for local environment
- **Performance Tuning** - Optimizing concurrent data collection processes
- **Mobile Optimization** - Responsive design improvements

---

## 📄 License & Acknowledgments

**The Cycle** - MLB Analytics Platform
© 2025 Cole Trammell

Built with passion for baseball analytics and powered by:
- **MLB Stats API** - Official MLB statistical data
- **Azure Cloud Services** - Redis Cache and Web Apps
- **React + Material-UI** - Modern web interface
- **Express.js + Redis** - High-performance backend architecture

*"Testing every possible baseball statistic that is imaginable"*
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