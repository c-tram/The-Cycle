import express from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch';
import schedule from 'node-schedule';
import { scrapeStandings } from './scrapers/standingsScraper';
import { scrapePlayerStats, scrapeTrendData } from './scrapers/httpPlayerStatsScraper';
import { scrapeGames } from './scrapers/gamesScraper';
import { fetchStandingsFromAPI, fetchGamesFromAPI } from './scrapers/mlbStatsApiService';
import { storeData, retrieveData, calculateDailyTrends } from './services/dataService';
import playersRouter from './routes/v1/players';
import boxScoresRouter from './routes/v2/boxScores';
import { TEAM_ID_MAP, TEAM_NAME_MAP } from './constants/teams';
import redisCache from './services/redisCache';
import comprehensiveMLBDataService from './services/comprehensiveMLBDataService';
import comprehensiveDataScheduler from './services/comprehensiveDataScheduler';
import comprehensiveRouter from './routes/comprehensive';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 80;

// Enable CORS with proper configuration for both development and production
const allowedOrigins = [
  'http://localhost:5173',    // React frontend (Vite)
  'http://127.0.0.1:5173',
  'http://localhost:8080',    // Flutter web frontend (primary)
  'http://127.0.0.1:8080',
  'http://localhost:3001',    // Flutter web frontend (alternate port)
  'http://127.0.0.1:3001',
  'http://localhost:5173',    // Add Docker Compose frontend
  'http://frontend:5173',     // Add Docker Compose service name
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    // Accept requests from Docker Compose frontend container
    if (allowedOrigins.includes(origin) || origin?.startsWith('http://frontend:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`⬅️ ${req.method} ${req.path} - started`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // 304 Not Modified is a successful response, not an error
    const statusIcon = (status >= 200 && status < 400) ? '✅' : '❌';
    console.log(`${statusIcon} ${req.method} ${req.path} - ${status} - ${duration}ms`);
  });
  next();
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const errorResponse: Record<string, any> = {
    error: 'Internal server error',
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  res.status(500).json(errorResponse);
});

// Health check endpoint with Redis status
app.get('/api/health', async (req, res) => {
  try {
    const redisStatus = await redisCache.ping();
    const isLocalHost = !process.env.REDIS_HOST || 
                       process.env.REDIS_HOST === 'localhost' || 
                       process.env.REDIS_HOST === '127.0.0.1';
    const cacheType = isLocalHost ? 'in-memory' : 'redis';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      redis: {
        status: redisStatus ? 'connected' : 'disconnected',
        cacheType: cacheType,
        configured: !isLocalHost,
        config: {
          host: process.env.REDIS_HOST || 'not set',
          port: process.env.REDIS_PORT || 'not set',
          tls: process.env.REDIS_TLS || 'not set',
          authMode: process.env.REDIS_AUTH_MODE || 'not set',
          passwordConfigured: !!process.env.REDIS_PASSWORD
        }
      }
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      redis: {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }
    });
  }
});

// Team name mapping is imported from ./constants/teams

interface PlayerStats {
  name: string;
  team: string;
  position: string;
  avg?: string;
  hr?: string;
  rbi?: string;
  runs?: string;
  sb?: string;
  obp?: string;
  slg?: string;
  ops?: string;
  era?: string;
  whip?: string;
  wins?: string;
  losses?: string;
  saves?: string;
  strikeouts?: string;
  season: string;
  statType: 'hitting' | 'pitching';
}

interface TeamRoster {
  teamName: string;
  teamCode: string;
  players: PlayerStats[];
}

// Use absolute path for static files
app.use(express.static(path.join(__dirname, '../public')));

// Parse JSON bodies for POST requests
app.use(express.json());

// Add timeout handler to all routes BEFORE mounting routers
const ROUTE_TIMEOUT = 90000;
app.use((req, res, next) => {
  res.setTimeout(ROUTE_TIMEOUT, () => {
    res.status(408).json({ error: 'Request timeout', timeoutMs: ROUTE_TIMEOUT });
  });
  next();
});

// Mount v1 API routes
app.use('/api/v1/players', playersRouter);

// Mount v2 API routes
app.use('/api/v2/boxScores', boxScoresRouter);

// Mount comprehensive data routes for massive analytics
app.use('/api/comprehensive', comprehensiveRouter);
console.log('✅ Comprehensive routes mounted at /api/comprehensive');

// Debug route to test basic app functionality
app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Basic Express routing is working!',
    timestamp: new Date().toISOString()
  });
});

// Comprehensive data scheduler is automatically initialized in constructor
console.log('✅ Comprehensive data scheduler initialized with automatic jobs');

// Add a simple test endpoint for comprehensive data
app.get('/api/comprehensive-test', async (req, res) => {
  try {
    console.log('🧪 Testing comprehensive service...');
    const allGames = await comprehensiveMLBDataService.getAllGames();
    res.json({
      success: true,
      message: 'Comprehensive service is working!',
      totalGames: allGames.length,
      sampleGame: allGames[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Comprehensive service test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Comprehensive service test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Example: /api/roster?team=nyy&statType=hitting&period=season
app.get('/api/roster', async (req, res) => {
  try {
    const teamAbbr = (req.query.team as string)?.toLowerCase() || 'nyy';
    const requestedStatType = (req.query.statType as string)?.toLowerCase() || 'hitting';
    const season = (req.query.season as string) || '2025';
    const period = (req.query.period as string)?.toLowerCase() || 'season';
    const statType = requestedStatType === 'batting' ? 'hitting' : requestedStatType;
    const cacheKey = `player-stats-${teamAbbr}-${statType}-${period}.json`;
    // Try Redis cache first
    const cachedRoster = await redisCache.getCachedData(cacheKey);
    if (cachedRoster) {
      console.log(`[API] Serving /api/roster for ${teamAbbr} from Redis cache`);
      return res.json(cachedRoster);
    }
    // Fetch fresh data if not cached
    console.log(`[API] No cache for /api/roster (${teamAbbr}), fetching from API`);
    const rosterData = await fetchTeamRosterFromAPI(teamAbbr, period, statType as 'hitting' | 'pitching');
    await redisCache.cacheData(cacheKey, rosterData);
    return res.json(rosterData);
  } catch (err) {
    console.error('Error in /api/roster:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to fetch team roster using MLB Stats API or cache
async function fetchTeamRosterFromAPI(teamAbbr: string, period: string, statType: 'hitting' | 'pitching'): Promise<TeamRoster[]> {
  try {
    // First check if we have cached data
    const cacheKey = `player-stats-${teamAbbr}-${statType}.json`;
    const cachedData = retrieveData<PlayerStats[]>(cacheKey);
    if (cachedData && cachedData.length > 0) {
      return [{
        teamName: TEAM_NAME_MAP[teamAbbr.toUpperCase()] || 'Unknown',
        teamCode: teamAbbr.toUpperCase(),
        players: cachedData
      }];
    }

    // Special case for 'all' - fetch stats for all teams using the MLB stats endpoint
    if (teamAbbr.toLowerCase() === 'all') {
      console.log(`Fetching ${statType} stats for all teams via MLB Stats API...`);
      const currentYear = new Date().getFullYear();
      const statsUrl = `https://statsapi.mlb.com/api/v1/stats?stats=season&group=${statType}&season=${currentYear}&sportId=1&limit=500`;
      console.log(`📊 Fetching stats from: ${statsUrl}`);
      
      const statsResponse = await fetch(statsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!statsResponse.ok) {
        throw new Error(`Stats API failed: ${statsResponse.status} - ${statsResponse.statusText}`);
      }
      
      const statsData = await statsResponse.json();
      const players: PlayerStats[] = [];
      
      if (statsData.stats?.[0]?.splits) {
        for (const split of statsData.stats[0].splits) {
          const playerName = split.player?.fullName;
          const playerTeam = split.team?.name;
          const position = split.player?.primaryPosition?.abbreviation || (statType === 'pitching' ? 'P' : '');
          const stats = split.stat;
          
          if (!playerName || !playerTeam || !stats) continue;
          
          if (statType === 'hitting') {
            players.push({
              name: playerName,
              team: playerTeam,
              position: position,
              avg: stats.avg || '.000',
              hr: stats.homeRuns?.toString() || '0',
              rbi: stats.rbi?.toString() || '0',
              runs: stats.runs?.toString() || '0',
              sb: stats.stolenBases?.toString() || '0',
              obp: stats.obp || '.000',
              slg: stats.slg || '.000',
              ops: stats.ops || '.000',
              season: currentYear.toString(),
              statType: 'hitting'
            });
          } else {
            players.push({
              name: playerName,
              team: playerTeam,
              position: position,
              era: stats.era || '0.00',
              whip: stats.whip || '0.00',
              wins: stats.wins?.toString() || '0',
              losses: stats.losses?.toString() || '0',
              saves: stats.saves?.toString() || '0',
              strikeouts: stats.strikeOuts?.toString() || '0',
              season: currentYear.toString(),
              statType: 'pitching'
            });
          }
        }
      }
      
      // Cache the full dataset
      storeData('player-stats.json', players);
      
      return [{
        teamName: 'All Teams',
        teamCode: 'ALL',
        players: players
      }];
    } else {
      // For individual teams, try to fetch directly first
      const currentYear = new Date().getFullYear();
      const teamId = TEAM_ID_MAP[teamAbbr.toLowerCase()];

      if (!teamId) {
        throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
      }

      console.log(`Fetching roster for team ID ${teamId}...`);
      const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
      const rosterResponse = await fetch(rosterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!rosterResponse.ok) {
        throw new Error(`Roster API failed: ${rosterResponse.status} - ${rosterResponse.statusText}`);
      }

      const rosterData = await rosterResponse.json();
      const players: PlayerStats[] = [];

      // Process each player on the roster
      for (const player of rosterData.roster || []) {
        const playerId = player.person.id;
        const playerName = player.person.fullName;
        const position = player.position.abbreviation;

        // Skip players based on stat type
        if (statType === 'pitching' && position !== 'P') continue;
        if (statType === 'hitting' && position === 'P') continue;

        // Get player stats
        const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
        const playerStatsResponse = await fetch(playerStatsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (playerStatsResponse.ok) {
          const playerData = await playerStatsResponse.json();
          const stats = playerData.stats?.[0]?.splits?.[0]?.stat;

          if (stats) {
            players.push({
              name: playerName,
              team: rosterData.roster[0]?.team?.name || 'Unknown',
              position: position,
              avg: stats.avg || '.000',
              hr: stats.homeRuns?.toString() || '0',
              rbi: stats.rbi?.toString() || '0',
              runs: stats.runs?.toString() || '0',
              sb: stats.stolenBases?.toString() || '0',
              obp: stats.obp || '.000',
              slg: stats.slg || '.000',
              ops: stats.ops || '.000',
              era: stats.era || '0.00',
              whip: stats.whip || '0.00',
              wins: stats.wins?.toString() || '0',
              losses: stats.losses?.toString() || '0',
              saves: stats.saves?.toString() || '0',
              strikeouts: stats.strikeOuts?.toString() || '0',
              season: currentYear.toString(),
              statType: statType
            });
          }
        }
      }

      // Cache and return the team data
      storeData(`player-stats-${teamAbbr}.json`, players);

      if (players.length === 0) {
        // Fallback to cached data
        const cachedStats = retrieveData<PlayerStats[]>(`player-stats-${teamAbbr}.json`) || [];
        if (cachedStats.length === 0) {
          throw new Error(`No ${statType} stats found for team: ${teamAbbr}`);
        }
        players.push(...cachedStats);
      }

      // Filter by stat type
      const teamData = players.filter(player => 
        statType === player.statType
      );

      if (teamData.length === 0) {
        throw new Error(`No ${statType} stats found for team: ${teamAbbr}`);
      }

      // Further filter by stat type
      const filteredData = teamData.filter(player => 
        (statType === 'hitting' && player.position !== 'P') || 
        (statType === 'pitching' && player.position === 'P')
      );

      return [{
        teamName: filteredData[0].team,
        teamCode: teamAbbr.toUpperCase(),
        players: filteredData
      }];
    }
  } catch (error: any) {
    console.error('Error in fetchTeamRosterFromAPI:', error);
    throw error;
  }
}

// Get recent and upcoming games
app.get('/api/games', async (req, res) => {
  try {
    // Try Redis cache first
    const cachedGames = await redisCache.getCachedData('games');
    if (cachedGames) {
      console.log('[API] Serving /api/games from Redis cache');
      return res.json(cachedGames);
    }
    // Fetch fresh data if not cached
    console.log('[API] No cache for /api/games, fetching from API');
    const games = await scrapeGames();
    await redisCache.cacheData('games', games);
    return res.json(games);
  } catch (err) {
    console.error('Error in /api/games:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: /api/standings
app.get('/api/standings', async (req, res) => {
  try {
    // Try Redis cache first
    const cachedStandings = await redisCache.getCachedData('standings.json');
    if (cachedStandings) {
      console.log('[API] Serving /api/standings from Redis cache');
      return res.json(cachedStandings);
    }
    // Fetch fresh data if not cached
    console.log('[API] No cache for /api/standings, fetching from API');
    const apiStandings = await fetchStandingsFromAPI();
    if (apiStandings.length > 0) {
      await redisCache.cacheData('standings.json', apiStandings);
      return res.json(apiStandings);
    }
    res.status(404).json({ error: 'No standings data found' });
  } catch (err) {
    console.error('Error in /api/standings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trend data for a specific stat category
app.get('/api/trends', async (req, res) => {
  try {
    const statCategory = req.query.stat as string;
    const cacheKey = `trend-${statCategory}`;
    // Try Redis cache first
    const cachedTrend = await redisCache.getCachedData(cacheKey);
    if (cachedTrend) {
      console.log(`[API] Serving /api/trends for ${statCategory} from Redis cache`);
      return res.json(cachedTrend);
    }
    // Fetch fresh data if not cached
    console.log(`[API] No cache for /api/trends (${statCategory}), fetching from API`);
    let trendData;
    try {
      trendData = await scrapeTrendData(statCategory);
    } catch (error) {
      console.error('Error fetching trend data:', error);
      trendData = {
        [statCategory]: Array(30).fill(0).map(() => Math.random())
      };
    }
    await redisCache.cacheData(cacheKey, trendData);
    res.json(trendData);
  } catch (err) {
    console.error('Error in /api/trends:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redis health check endpoint
app.get('/api/health/redis', async (req, res) => {
  try {
    // Check Redis connection
    const isRedisConnected = await redisCache.ping();
    res.json({ redis: 'connected' });
  } catch (err) {
    console.error('Redis health check error:', err);
    res.status(500).json({ 
      redis: 'not connected', 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// On startup, pre-warm cache for key endpoints if not already cached
(async () => {
  try {
    // Standings
    const cachedStandings = await redisCache.getCachedData('standings.json');
    if (!cachedStandings) {
      console.log('[Startup] No cached standings, fetching from API...');
      const apiStandings = await fetchStandingsFromAPI();
      if (apiStandings.length > 0) {
        await redisCache.cacheData('standings.json', apiStandings);
        console.log('[Startup] Cached fresh standings data');
      }
    } else {
      console.log('[Startup] Standings already cached');
    }

    // Games
    const cachedGames = await redisCache.getCachedData('games');
    if (!cachedGames) {
      console.log('[Startup] No cached games, fetching from API...');
      const games = await scrapeGames();
      await redisCache.cacheData('games', games);
      console.log('[Startup] Cached fresh games data');
    } else {
      console.log('[Startup] Games already cached');
    }

    // You can add similar logic for roster/trends if desired
  } catch (err) {
    console.error('[Startup] Error pre-warming cache:', err);
  }
})();

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API endpoints:`);
  console.log(` - /api/roster`);
  console.log(` - /api/games`);
  console.log(` - /api/standings`);
  console.log(` - /api/trends`);
  console.log(` - /api/health/redis`);
});
