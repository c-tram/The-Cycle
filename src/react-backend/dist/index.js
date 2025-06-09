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
const teams_1 = require("./constants/teams");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Enable CORS with proper configuration
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
        const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
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
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Use absolute path for static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Mount v1 API routes
app.use('/api/v1/players', players_1.default);
// Add timeout handler to all routes
const ROUTE_TIMEOUT = 30000; // 30 seconds
app.use((req, res, next) => {
    res.setTimeout(ROUTE_TIMEOUT, () => {
        res.status(408).json({ error: 'Request timeout', timeoutMs: ROUTE_TIMEOUT });
    });
    next();
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
            // Try fetching via MLB Stats API first
            const apiData = await fetchTeamRosterFromAPI(teamAbbr, period, statType);
            console.log(`✅ Successfully fetched data via MLB Stats API: ${apiData[0]?.players?.length || 0} players`);
            // Format response to match frontend expectations
            if (apiData && apiData[0]) {
                res.json({
                    name: apiData[0].teamName,
                    code: apiData[0].teamCode,
                    players: apiData[0].players.map(player => ({
                        name: player.name,
                        position: player.position,
                        team: player.team,
                        stats: {
                            hitting: player.statType === 'hitting' ? {
                                avg: player.avg,
                                hr: player.hr,
                                rbi: player.rbi,
                                runs: player.runs,
                                sb: player.sb,
                                obp: player.obp,
                                slg: player.slg,
                                ops: player.ops
                            } : undefined,
                            pitching: player.statType === 'pitching' ? {
                                era: player.era,
                                whip: player.whip,
                                wins: player.wins,
                                losses: player.losses,
                                saves: player.saves,
                                strikeouts: player.strikeouts
                            } : undefined
                        }
                    }))
                });
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
            // Try MLB Stats API first
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
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoints:`);
    console.log(` - /api/roster`);
    console.log(` - /api/games`);
    console.log(` - /api/standings`);
    console.log(` - /api/trends`);
});
