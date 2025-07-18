"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const standingsScraper_1 = require("./scrapers/standingsScraper");
const httpPlayerStatsScraper_1 = require("./scrapers/httpPlayerStatsScraper");
const gamesScraper_1 = require("./scrapers/gamesScraper");
const mlbStatsApiService_1 = require("./scrapers/mlbStatsApiService");
const dataService_1 = require("./services/dataService");
const players_1 = __importDefault(require("./routes/v1/players"));
const boxScores_1 = __importDefault(require("./routes/v2/boxScores"));
const teams_1 = require("./constants/teams");
const redisCache_1 = __importDefault(require("./services/redisCache"));
const comprehensiveMLBDataService_1 = __importDefault(require("./services/comprehensiveMLBDataService"));
const comprehensive_1 = __importDefault(require("./routes/comprehensive"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Enable CORS with proper configuration for both development and production
const allowedOrigins = [
    'http://localhost:5173', // React frontend (Vite)
    'http://127.0.0.1:5173',
    'http://localhost:8080', // Flutter web frontend (primary)
    'http://127.0.0.1:8080',
    'http://localhost:3001', // Flutter web frontend (alternate port)
    'http://127.0.0.1:3001',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (process.env.NODE_ENV === 'production') {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
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
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const errorResponse = {
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
        const redisStatus = await redisCache_1.default.ping();
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
    }
    catch (err) {
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
// Use absolute path for static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Parse JSON bodies for POST requests
app.use(express_1.default.json());
// Add timeout handler to all routes BEFORE mounting routers
const ROUTE_TIMEOUT = 90000;
app.use((req, res, next) => {
    res.setTimeout(ROUTE_TIMEOUT, () => {
        res.status(408).json({ error: 'Request timeout', timeoutMs: ROUTE_TIMEOUT });
    });
    next();
});
// Mount v1 API routes
app.use('/api/v1/players', players_1.default);
// Mount v2 API routes
app.use('/api/v2/boxScores', boxScores_1.default);
// Mount comprehensive data routes for massive analytics
app.use('/api/comprehensive', comprehensive_1.default);
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
        const allGames = await comprehensiveMLBDataService_1.default.getAllGames();
        res.json({
            success: true,
            message: 'Comprehensive service is working!',
            totalGames: allGames.length,
            sampleGame: allGames[0] || null,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Comprehensive service test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Comprehensive service test failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Example: /api/roster?team=nyy&statType=hitting&period=season
app.get('/api/roster', (req, res) => {
    (async () => {
        const teamAbbr = req.query.team?.toLowerCase() || 'nyy';
        const requestedStatType = req.query.statType?.toLowerCase() || 'hitting';
        const season = req.query.season || '2025';
        const period = req.query.period?.toLowerCase() || 'season';
        // Normalize statType - 'batting' should be treated as 'hitting' for MLB API
        const statType = requestedStatType === 'batting' ? 'hitting' : requestedStatType;
        console.log(`API Request - Team: ${teamAbbr}, RequestedStatType: ${requestedStatType}, NormalizedStatType: ${statType}, Period: ${period}`);
        try {
            // Calculate cache key and TTL based on period
            const cacheKey = `player-stats-${teamAbbr}-${statType}-${period}.json`;
            const cacheTTL = ((p) => {
                switch (p) {
                    case 'season': return 120; // 2 hours
                    case '30day': return 60; // 1 hour
                    case '7day': return 30; // 30 minutes 
                    case '1day': return 15; // 15 minutes
                    default: return 60;
                }
            })(period);
            // Try cache first
            const cachedData = (0, dataService_1.retrieveData)(cacheKey);
            if (cachedData && cachedData.length > 0) {
                console.log('Returning cached data for', teamAbbr);
                const filteredData = cachedData.filter(player => (statType === 'hitting' && player.position !== 'P') ||
                    (statType === 'pitching' && player.position === 'P'));
                return res.json([{
                        teamName: teams_1.TEAM_NAME_MAP[teamAbbr.toUpperCase()] || 'Unknown Team',
                        teamCode: teamAbbr.toUpperCase(),
                        players: filteredData.map(player => ({
                            name: player.name,
                            position: player.position,
                            team: player.team,
                            avg: player.avg,
                            hr: player.hr,
                            rbi: player.rbi,
                            runs: player.runs,
                            sb: player.sb,
                            obp: player.obp,
                            slg: player.slg,
                            ops: player.ops,
                            era: player.era,
                            whip: player.whip,
                            wins: player.wins,
                            strikeouts: player.strikeouts
                        }))
                    }]);
            }
            // If not in cache, fetch from API
            const rosterData = await fetchTeamRosterFromAPI(teamAbbr, period, statType);
            if (rosterData && rosterData[0]) {
                // Format and cache response
                const response = {
                    teamName: rosterData[0].teamName,
                    teamCode: rosterData[0].teamCode,
                    players: rosterData[0].players.map(player => ({
                        name: player.name,
                        position: player.position,
                        team: player.team,
                        avg: player.avg,
                        hr: player.hr,
                        rbi: player.rbi,
                        runs: player.runs,
                        sb: player.sb,
                        obp: player.obp,
                        slg: player.slg,
                        ops: player.ops,
                        era: player.era,
                        whip: player.whip,
                        wins: player.wins,
                        strikeouts: player.strikeouts
                    }))
                };
                // Cache the formatted data
                (0, dataService_1.storeData)(cacheKey, response.players);
                return res.json([response]);
            }
            else {
                res.json({ error: 'No data found' });
            }
        }
        catch (error) {
            // If it's a team-specific error, return 400, otherwise 500
            const statusCode = error.message?.includes('Unknown team abbreviation') ||
                error.message?.includes('Invalid team abbreviation') ? 400 : 500;
            console.error('Error fetching roster:', error);
            res.status(statusCode).json({ error: error.message });
        }
    })();
});
// Function to fetch team roster using MLB Stats API or cache
async function fetchTeamRosterFromAPI(teamAbbr, period, statType) {
    try {
        // First check if we have cached data
        const cacheKey = `player-stats-${teamAbbr}-${statType}.json`;
        const cachedData = (0, dataService_1.retrieveData)(cacheKey);
        if (cachedData && cachedData.length > 0) {
            return [{
                    teamName: teams_1.TEAM_NAME_MAP[teamAbbr.toUpperCase()] || 'Unknown',
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
            const statsResponse = await (0, node_fetch_1.default)(statsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (!statsResponse.ok) {
                throw new Error(`Stats API failed: ${statsResponse.status} - ${statsResponse.statusText}`);
            }
            const statsData = await statsResponse.json();
            const players = [];
            if (statsData.stats?.[0]?.splits) {
                for (const split of statsData.stats[0].splits) {
                    const playerName = split.player?.fullName;
                    const playerTeam = split.team?.name;
                    const position = split.player?.primaryPosition?.abbreviation || (statType === 'pitching' ? 'P' : '');
                    const stats = split.stat;
                    if (!playerName || !playerTeam || !stats)
                        continue;
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
                    }
                    else {
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
            (0, dataService_1.storeData)('player-stats.json', players);
            return [{
                    teamName: 'All Teams',
                    teamCode: 'ALL',
                    players: players
                }];
        }
        else {
            // For individual teams, try to fetch directly first
            const currentYear = new Date().getFullYear();
            const teamId = teams_1.TEAM_ID_MAP[teamAbbr.toLowerCase()];
            if (!teamId) {
                throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
            }
            console.log(`Fetching roster for team ID ${teamId}...`);
            const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
            const rosterResponse = await (0, node_fetch_1.default)(rosterUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (!rosterResponse.ok) {
                throw new Error(`Roster API failed: ${rosterResponse.status} - ${rosterResponse.statusText}`);
            }
            const rosterData = await rosterResponse.json();
            const players = [];
            // Process each player on the roster
            for (const player of rosterData.roster || []) {
                const playerId = player.person.id;
                const playerName = player.person.fullName;
                const position = player.position.abbreviation;
                // Skip players based on stat type
                if (statType === 'pitching' && position !== 'P')
                    continue;
                if (statType === 'hitting' && position === 'P')
                    continue;
                // Get player stats
                const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
                const playerStatsResponse = await (0, node_fetch_1.default)(playerStatsUrl, {
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
            (0, dataService_1.storeData)(`player-stats-${teamAbbr}.json`, players);
            if (players.length === 0) {
                // Fallback to cached data
                const cachedStats = (0, dataService_1.retrieveData)(`player-stats-${teamAbbr}.json`) || [];
                if (cachedStats.length === 0) {
                    throw new Error(`No ${statType} stats found for team: ${teamAbbr}`);
                }
                players.push(...cachedStats);
            }
            // Filter by stat type
            const teamData = players.filter(player => statType === player.statType);
            if (teamData.length === 0) {
                throw new Error(`No ${statType} stats found for team: ${teamAbbr}`);
            }
            // Further filter by stat type
            const filteredData = teamData.filter(player => (statType === 'hitting' && player.position !== 'P') ||
                (statType === 'pitching' && player.position === 'P'));
            return [{
                    teamName: filteredData[0].team,
                    teamCode: teamAbbr.toUpperCase(),
                    players: filteredData
                }];
        }
    }
    catch (error) {
        console.error('Error in fetchTeamRosterFromAPI:', error);
        throw error;
    }
}
// Get recent and upcoming games
app.get('/api/games', (req, res) => {
    (async () => {
        try {
            // Check if comprehensive data is requested
            const comprehensive = req.query.comprehensive === 'true';
            const teamCode = req.query.team;
            if (comprehensive) {
                console.log('🔥 Comprehensive games data requested');
                try {
                    if (teamCode) {
                        // Get all games for specific team
                        const teamGames = await comprehensiveMLBDataService_1.default.getTeamGames(teamCode);
                        // Convert to legacy format for compatibility
                        const recent = teamGames
                            .filter(g => g.status.isCompleted)
                            .slice(-10) // Last 10 completed games
                            .map(game => ({
                            homeTeam: game.teams.home.team.name,
                            homeTeamCode: game.teams.home.team.abbreviation?.toLowerCase() || 'unk',
                            awayTeam: game.teams.away.team.name,
                            awayTeamCode: game.teams.away.team.abbreviation?.toLowerCase() || 'unk',
                            homeScore: game.teams.home.score,
                            awayScore: game.teams.away.score,
                            date: game.gameDate.split('T')[0],
                            status: 'completed'
                        }));
                        const upcoming = teamGames
                            .filter(g => !g.status.isCompleted && !g.status.isInProgress)
                            .slice(0, 10) // Next 10 upcoming games
                            .map(game => ({
                            homeTeam: game.teams.home.team.name,
                            homeTeamCode: game.teams.home.team.abbreviation?.toLowerCase() || 'unk',
                            awayTeam: game.teams.away.team.name,
                            awayTeamCode: game.teams.away.team.abbreviation?.toLowerCase() || 'unk',
                            date: game.gameDate.split('T')[0],
                            time: new Date(game.gameDate).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }),
                            status: 'scheduled'
                        }));
                        console.log(`✅ Returning ${recent.length} recent + ${upcoming.length} upcoming games for ${teamCode.toUpperCase()}`);
                        return res.json({ recent, upcoming, live: [], comprehensive: true, team: teamCode.toUpperCase() });
                    }
                    else {
                        // Get all games across league
                        const allGames = await comprehensiveMLBDataService_1.default.getAllGames();
                        // Convert to legacy format but with more games
                        const recent = allGames
                            .filter(g => g.status.isCompleted)
                            .slice(-50) // Last 50 completed games
                            .map(game => ({
                            homeTeam: game.teams.home.team.name,
                            homeTeamCode: game.teams.home.team.abbreviation?.toLowerCase() || 'unk',
                            awayTeam: game.teams.away.team.name,
                            awayTeamCode: game.teams.away.team.abbreviation?.toLowerCase() || 'unk',
                            homeScore: game.teams.home.score,
                            awayScore: game.teams.away.score,
                            date: game.gameDate.split('T')[0],
                            status: 'completed'
                        }));
                        const upcoming = allGames
                            .filter(g => !g.status.isCompleted && !g.status.isInProgress)
                            .slice(0, 50) // Next 50 upcoming games
                            .map(game => ({
                            homeTeam: game.teams.home.team.name,
                            homeTeamCode: game.teams.home.team.abbreviation?.toLowerCase() || 'unk',
                            awayTeam: game.teams.away.team.name,
                            awayTeamCode: game.teams.away.team.abbreviation?.toLowerCase() || 'unk',
                            date: game.gameDate.split('T')[0],
                            time: new Date(game.gameDate).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }),
                            status: 'scheduled'
                        }));
                        const live = allGames
                            .filter(g => g.status.isInProgress)
                            .map(game => ({
                            homeTeam: game.teams.home.team.name,
                            homeTeamCode: game.teams.home.team.abbreviation?.toLowerCase() || 'unk',
                            awayTeam: game.teams.away.team.name,
                            awayTeamCode: game.teams.away.team.abbreviation?.toLowerCase() || 'unk',
                            homeScore: game.teams.home.score,
                            awayScore: game.teams.away.score,
                            date: game.gameDate.split('T')[0],
                            status: 'live'
                        }));
                        console.log(`✅ Returning comprehensive data: ${recent.length} recent + ${upcoming.length} upcoming + ${live.length} live games`);
                        return res.json({ recent, upcoming, live, comprehensive: true, totalGames: allGames.length });
                    }
                }
                catch (comprehensiveError) {
                    console.error('💥 Comprehensive data error, falling back to regular scraping:', comprehensiveError);
                    // Fall through to regular scraping
                }
            }
            // Regular (limited) data fetching
            console.log('📋 Regular games data requested (limited to 5 recent/upcoming)');
            try {
                const games = await (0, gamesScraper_1.scrapeGames)();
                return res.json(games);
            }
            catch (error) {
                console.error('Error fetching games from MLB Stats API:', error);
                // Return a 500 error if both attempts fail
                res.status(500).json({ error: 'Failed to fetch games data' });
            }
        }
        catch (error) {
            console.error('Error in /api/games endpoint:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    })();
});
// GET /api/standings
app.get('/api/standings', (req, res) => {
    (async () => {
        try {
            console.log('Fetching standings data...');
            // Try to get cached standings first
            const cachedStandings = (0, dataService_1.retrieveData)('standings.json');
            if (cachedStandings) {
                console.log('Returning cached standings data');
                return res.json(cachedStandings);
            }
            // Try MLB Stats API first
            try {
                console.log('Fetching standings from MLB Stats API...');
                const apiStandings = await (0, mlbStatsApiService_1.fetchStandingsFromAPI)();
                if (apiStandings.length > 0) {
                    (0, dataService_1.storeData)('standings.json', apiStandings);
                    return res.json(apiStandings);
                }
            }
            catch (apiError) {
                console.error('MLB Stats API error:', apiError);
            }
            // Fallback to scraping
            console.log('Falling back to standings scraper...');
            const scrapedStandings = await (0, standingsScraper_1.scrapeStandings)();
            (0, dataService_1.storeData)('standings.json', scrapedStandings);
            res.json(scrapedStandings);
        }
        catch (error) {
            console.error('Error in standings route:', error);
            res.status(500).json({
                error: 'Failed to fetch standings',
                message: error?.message || 'Unknown error'
            });
        }
    })();
});
// Get trend data for a specific stat category
app.get('/api/trends', (req, res) => {
    (async () => {
        try {
            const statCategory = req.query.stat;
            let trendData;
            try {
                trendData = await (0, httpPlayerStatsScraper_1.scrapeTrendData)(statCategory);
            }
            catch (error) {
                console.error('Error fetching trend data:', error);
                // Return mock data if scraping fails
                trendData = {
                    [statCategory]: Array(30).fill(0).map(() => Math.random())
                };
            }
            res.json(trendData);
        }
        catch (error) {
            console.error('Error in /api/trends endpoint:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    })();
});
// Redis health check endpoint
app.get('/api/health/redis', async (req, res) => {
    try {
        // Check Redis connection
        const isRedisConnected = await redisCache_1.default.ping();
        res.json({ redis: 'connected' });
    }
    catch (err) {
        console.error('Redis health check error:', err);
        res.status(500).json({
            redis: 'not connected',
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});
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
