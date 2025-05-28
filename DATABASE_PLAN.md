# Database Integration Plan for MLB Dashboard

## Overview
This document outlines the recommended database integration strategy for supporting historical trends (1-day, 7-day, 30-day, season-long) and improving data persistence for the MLB dashboard application.

## Current State
- **Backend**: Node.js/TypeScript with Express
- **Data Sources**: MLB Stats API (real-time)
- **Storage**: JSON files for mock data, no persistent database
- **Frontend**: React with API consumption

## Recommended Database Solutions

### Option 1: PostgreSQL (Recommended)
**Best for**: Production environments, complex analytics, full SQL support

**Advantages:**
- Excellent time-series support with proper indexing
- Advanced analytics functions (window functions, aggregations)
- Strong consistency and ACID compliance
- Great performance for historical data queries
- JSON column support for flexible schemas

**Setup Steps:**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb mlb_dashboard

# Install Node.js dependencies
npm install pg @types/pg
```

**Schema Design:**
```sql
-- Player statistics with time tracking
CREATE TABLE player_stats (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(5) NOT NULL,
    stat_type VARCHAR(50) NOT NULL, -- 'batting_avg', 'home_runs', 'era', etc.
    stat_value DECIMAL(10,3) NOT NULL,
    game_date DATE NOT NULL,
    season_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(player_id, stat_type, game_date),
    INDEX(team_code, game_date),
    INDEX(stat_type, game_date)
);

-- Team statistics aggregated by date
CREATE TABLE team_stats (
    id SERIAL PRIMARY KEY,
    team_code VARCHAR(5) NOT NULL,
    stat_type VARCHAR(50) NOT NULL,
    stat_value DECIMAL(10,3) NOT NULL,
    game_date DATE NOT NULL,
    season_year INTEGER NOT NULL,
    games_played INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(team_code, stat_type, game_date),
    INDEX(stat_type, game_date)
);

-- League-wide statistics by date
CREATE TABLE league_stats (
    id SERIAL PRIMARY KEY,
    league VARCHAR(2) NOT NULL, -- 'AL' or 'NL'
    stat_type VARCHAR(50) NOT NULL,
    stat_value DECIMAL(10,3) NOT NULL,
    game_date DATE NOT NULL,
    season_year INTEGER NOT NULL,
    total_games INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(league, stat_type, game_date),
    INDEX(stat_type, game_date)
);

-- Cache for expensive queries
CREATE TABLE trend_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(cache_key),
    INDEX(expires_at)
);
```

### Option 2: MongoDB (Alternative)
**Best for**: Flexible schemas, rapid development, document-based storage

**Advantages:**
- Flexible document schema
- Built-in aggregation pipeline
- Easy horizontal scaling
- Good for storing varied stat types

**Setup Steps:**
```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Install Node.js dependencies
npm install mongodb @types/mongodb mongoose @types/mongoose
```

### Option 3: SQLite (Development/Small Scale)
**Best for**: Development, testing, small deployments

**Advantages:**
- No separate server required
- Perfect for development and testing
- Easy deployment
- Full SQL support

**Setup Steps:**
```bash
# Install dependencies
npm install sqlite3 @types/sqlite3
```

## Implementation Strategy

### Phase 1: Database Setup and Basic Models
1. **Choose Database**: PostgreSQL recommended for production
2. **Create Models**: Player, Team, League statistics models
3. **Migration System**: Set up database migrations
4. **Connection Pool**: Configure efficient database connections

### Phase 2: Data Collection Service
Create a background service to collect and store historical data:

```typescript
// services/dataCollectionService.ts
class DataCollectionService {
  async collectDailyStats() {
    // Fetch today's stats from MLB API
    // Store in database with current date
    // Update league aggregations
  }

  async backfillHistoricalData() {
    // Collect last 30-90 days of data
    // Useful for initial setup
  }

  async calculateTrends() {
    // Calculate 1-day, 7-day, 30-day trends
    // Store in cache table for fast access
  }
}
```

### Phase 3: API Enhancements
Update existing API endpoints to serve historical data:

```typescript
// New endpoints for trends
app.get('/api/trends/:statType/:period', async (req, res) => {
  const { statType, period } = req.params;
  // Query database for trend data
  // Return formatted trend data
});

app.get('/api/player-history/:playerId/:statType', async (req, res) => {
  // Return player's stat history
});

app.get('/api/team-comparison/:team1/:team2/:period', async (req, res) => {
  // Return comparison data between teams
});
```

### Phase 4: Caching Strategy
Implement intelligent caching for performance:

```typescript
// services/cacheService.ts
class CacheService {
  async getTrendData(key: string, period: string) {
    // Check cache first
    // If expired or missing, recalculate
    // Store in cache with TTL
  }

  async invalidateCache(pattern: string) {
    // Clear related cache entries when new data arrives
  }
}
```

## Data Collection Schedule

### Real-time Updates
- **Live Games**: Every 5 minutes during games
- **Game Completion**: Immediate stats update
- **Daily Aggregation**: End of day (2 AM ET)

### Batch Processing
- **Trend Calculation**: Every hour for recent periods
- **Season Aggregation**: Daily
- **Historical Backfill**: Weekly for data validation

## Query Optimization

### Indexing Strategy
```sql
-- Time-based queries (most common)
CREATE INDEX idx_stats_date_type ON player_stats(game_date, stat_type);
CREATE INDEX idx_team_stats_date ON team_stats(team_code, game_date);

-- Player performance queries
CREATE INDEX idx_player_stats_recent ON player_stats(player_id, game_date DESC) 
WHERE game_date >= CURRENT_DATE - INTERVAL '30 days';

-- League trend queries
CREATE INDEX idx_league_trends ON league_stats(league, stat_type, game_date DESC);
```

### Example Queries
```sql
-- 7-day batting average trend for a player
SELECT game_date, stat_value 
FROM player_stats 
WHERE player_id = ? 
  AND stat_type = 'batting_avg' 
  AND game_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY game_date;

-- Team comparison over 30 days
SELECT 
  team_code,
  AVG(stat_value) as avg_stat,
  COUNT(*) as games
FROM team_stats 
WHERE team_code IN (?, ?) 
  AND stat_type = ?
  AND game_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY team_code;

-- League leaders with trends
WITH recent_stats AS (
  SELECT 
    player_id,
    player_name,
    team_code,
    AVG(stat_value) as current_avg,
    AVG(stat_value) - LAG(AVG(stat_value)) OVER (
      PARTITION BY player_id 
      ORDER BY DATE_TRUNC('week', game_date)
    ) as weekly_change
  FROM player_stats 
  WHERE stat_type = 'batting_avg'
    AND game_date >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY player_id, player_name, team_code, DATE_TRUNC('week', game_date)
)
SELECT * FROM recent_stats 
ORDER BY current_avg DESC 
LIMIT 10;
```

## Implementation Timeline

### Week 1: Database Setup
- [ ] Choose and install database
- [ ] Create schema and migrations
- [ ] Set up connection pooling
- [ ] Create basic models

### Week 2: Data Collection
- [ ] Build data collection service
- [ ] Implement MLB API integration
- [ ] Create background job system
- [ ] Test data storage

### Week 3: API Integration
- [ ] Update existing endpoints
- [ ] Add new trend endpoints
- [ ] Implement caching layer
- [ ] Add error handling

### Week 4: Frontend Integration
- [ ] Update API calls to use historical data
- [ ] Enhance trend visualizations
- [ ] Add loading states for historical queries
- [ ] Test performance

## Monitoring and Maintenance

### Data Quality
- Daily data validation checks
- Automated alerts for missing data
- Backup and recovery procedures

### Performance Monitoring
- Query performance tracking
- Cache hit rate monitoring
- Database connection monitoring

### Scaling Considerations
- Read replicas for analytics queries
- Partitioning by date for large tables
- Archive old data (>2 years)

## Cost Estimation

### Development Time
- Database setup: 1-2 days
- Data collection service: 3-4 days
- API enhancements: 2-3 days
- Frontend integration: 2-3 days
- Testing and optimization: 2-3 days

**Total: 10-15 days**

### Infrastructure Costs (Monthly)
- PostgreSQL managed service: $20-50
- Additional storage: $5-10
- Backup storage: $5
- Monitoring tools: $10-20

**Total: $40-85/month**

## Next Steps

1. **Decision**: Choose database solution (PostgreSQL recommended)
2. **Proof of Concept**: Implement basic data collection for one stat type
3. **Schema Refinement**: Test with real data and optimize
4. **Gradual Migration**: Implement feature by feature
5. **Performance Testing**: Load test with historical data

## Additional Recommendations

### Data Sources
- Primary: MLB Stats API
- Backup: ESPN or other sports APIs
- Historical: Baseball Reference for backfill

### Error Handling
- Graceful degradation when database is unavailable
- Fallback to cached data
- User notifications for stale data

### Security
- Database connection encryption
- API rate limiting
- Input validation and sanitization

This database integration will significantly enhance the dashboard's capabilities, providing rich historical context and enabling advanced analytics features.
