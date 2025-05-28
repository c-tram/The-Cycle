"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
const standingsScraper_1 = require("./scrapers/standingsScraper");
const httpPlayerStatsScraper_1 = require("./scrapers/httpPlayerStatsScraper");
const gamesScraper_1 = require("./scrapers/gamesScraper");
const mlbStatsApiService_1 = require("./scrapers/mlbStatsApiService");
const dataService_1 = require("./services/dataService");
const node_schedule_1 = __importDefault(require("node-schedule"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Enable CORS
app.use((0, cors_1.default)());
// Use absolute path for static files (works in Docker and locally)
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Cache data for performance
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = {};
// Helper function to check if cache is valid
function isCacheValid(key) {
    const entry = cache[key];
    if (!entry)
        return false;
    const now = Date.now();
    return now - entry.timestamp < CACHE_TTL;
}
// Map team abbreviations to Baseball Savant team IDs
const TEAM_ID_MAP = {
    ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
    hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
    nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
    tex: 140, tor: 141, was: 120, wsh: 120
};
// API route for standings
app.get('/api/standings', (req, res) => {
    (async () => {
        try {
            const cacheKey = 'standings';
            // Check cache first
            if (isCacheValid(cacheKey)) {
                return res.json(cache[cacheKey].data);
            }
            try {
                // Fetch fresh data from MLB Stats API
                const standings = await (0, mlbStatsApiService_1.fetchStandingsFromAPI)();
                // Store in cache
                cache[cacheKey] = {
                    data: standings,
                    timestamp: Date.now()
                };
                res.json(standings);
            }
            catch (apiErr) {
                console.error('Error fetching standings from API, falling back to scraper:', apiErr);
                try {
                    // Fallback to web scraping if API fails
                    const standings = await (0, standingsScraper_1.scrapeStandings)();
                    cache[cacheKey] = {
                        data: standings,
                        timestamp: Date.now()
                    };
                    res.json(standings);
                }
                catch (scrapeErr) {
                    console.error('Error scraping standings, using mock data:', scrapeErr);
                    // If both API and scraper fail, return mock data
                    const mockData = require('./scrapers/standingsScraper').MOCK_STANDINGS;
                    res.json(mockData);
                }
            }
        }
        catch (err) {
            console.error('Error in /api/standings:', err);
            res.status(500).json({ error: err.message });
        }
    })();
});
// API route for trends data
app.get('/api/trends', (req, res) => {
    (async () => {
        try {
            const statCategory = req.query.stat || 'Batting Average';
            const cacheKey = `trends-${statCategory}`;
            // Check cache first
            if (isCacheValid(cacheKey)) {
                return res.json(cache[cacheKey].data);
            }
            // Fetch fresh data
            const trendsData = await (0, httpPlayerStatsScraper_1.scrapeTrendData)(statCategory);
            // Store in cache
            cache[cacheKey] = {
                data: trendsData,
                timestamp: Date.now()
            };
            res.json(trendsData);
        }
        catch (err) {
            console.error('Error in /api/trends:', err);
            res.status(500).json({ error: err.message });
        }
    })();
});
// API route for games (recent and upcoming)
app.get('/api/games', (req, res) => {
    (async () => {
        try {
            const cacheKey = 'games';
            // Check cache first (shorter TTL for games)
            if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 30 * 60 * 1000)) { // 30 minutes
                return res.json(cache[cacheKey].data);
            }
            try {
                // Fetch fresh data from MLB Stats API
                const gamesData = await (0, mlbStatsApiService_1.fetchGamesFromAPI)();
                // Store in cache
                cache[cacheKey] = {
                    data: gamesData,
                    timestamp: Date.now()
                };
                res.json(gamesData);
            }
            catch (apiErr) {
                console.error('Error fetching games from API, falling back to scraper:', apiErr);
                try {
                    // Fallback to web scraping if API fails
                    const gamesData = await (0, gamesScraper_1.scrapeGames)();
                    cache[cacheKey] = {
                        data: gamesData,
                        timestamp: Date.now()
                    };
                    res.json(gamesData);
                }
                catch (scrapeErr) {
                    console.error('Error scraping games, using mock data:', scrapeErr);
                    // If both fail, return basic mock data
                    const mockGamesData = {
                        recent: [
                            { homeTeam: "New York Yankees", homeTeamCode: "nyy", homeScore: 5, awayTeam: "Boston Red Sox", awayTeamCode: "bos", awayScore: 3, date: "2025-05-27", status: "completed" }
                        ],
                        upcoming: [
                            { homeTeam: "Los Angeles Dodgers", homeTeamCode: "lad", awayTeam: "San Francisco Giants", awayTeamCode: "sf", date: "2025-05-28", time: "7:05 PM", status: "scheduled" }
                        ]
                    };
                    res.json(mockGamesData);
                }
            }
        }
        catch (err) {
            console.error('Error in /api/games:', err);
            res.status(500).json({ error: err.message });
        }
    })();
});
// Example: /api/roster?team=nyy
app.get('/api/roster', (req, res) => {
    (async () => {
        const teamAbbr = req.query.team?.toLowerCase() || 'nyy';
        const statType = req.query.type?.toLowerCase() || 'hitting';
        const season = req.query.season || '2025';
        const teamId = TEAM_ID_MAP[teamAbbr];
        if (!teamId) {
            res.status(400).json({ error: 'Invalid or unsupported team abbreviation.' });
            return;
        }
        try {
            // Use HTTP-based scraping for roster data instead of Selenium
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            };
            // Fetch from Baseball Savant team page
            let url = `https://baseballsavant.mlb.com/team/${teamId}`;
            if (statType === 'pitching') {
                url = `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&season=${season}`;
            }
            else if (statType === 'hitting') {
                url = `https://baseballsavant.mlb.com/team/${teamId}?season=${season}`;
            }
            const response = await (0, node_fetch_1.default)(url, { headers, timeout: 15000 });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Parse the statcast table
            const tableId = statType === 'pitching' ? '#statcastPitching' : '#statcastHitting';
            const table = $(`${tableId} .table-savant table`);
            if (table.length === 0) {
                // Fallback to mock data if table not found
                const mockData = {
                    statHeaders: statType === 'pitching' ?
                        ['ERA', 'WHIP', 'K/9', 'BB/9', 'FIP'] :
                        ['AVG', 'OBP', 'SLG', 'OPS', 'wOBA'],
                    players: [
                        {
                            name: 'Sample Player',
                            season: season,
                            stats: statType === 'pitching' ?
                                ['3.25', '1.15', '9.2', '2.8', '3.45'] :
                                ['.285', '.350', '.475', '.825', '.340']
                        }
                    ]
                };
                res.json(mockData);
                return;
            }
            // Extract headers
            const statHeaders = [];
            table.find('thead tr th').each((i, element) => {
                if (i >= 2) { // Skip first two columns (name, season)
                    const headerText = $(element).text().trim();
                    if (headerText) {
                        statHeaders.push(headerText);
                    }
                }
            });
            // Extract player data
            const statcastData = [];
            table.find('tbody tr.statcast-generic').each((i, row) => {
                const $row = $(row);
                const cells = $row.find('td');
                if (cells.length >= 3) {
                    const playerName = cells.eq(0).find('b').text().trim() || cells.eq(0).text().trim();
                    const seasonVal = cells.eq(1).text().trim();
                    const stats = [];
                    for (let j = 2; j < cells.length; j++) {
                        stats.push(cells.eq(j).text().trim());
                    }
                    if (playerName) {
                        statcastData.push({
                            name: playerName,
                            season: seasonVal,
                            stats: stats
                        });
                    }
                }
            });
            if (statcastData.length === 0) {
                res.status(404).json({ error: `No data found for ${statType} in season: ${season}.` });
                return;
            }
            res.json({ statHeaders, players: statcastData });
        }
        catch (err) {
            console.error('Error fetching roster data:', err);
            res.status(500).json({ error: err.message });
        }
    })();
});
// Schedule daily data updates
node_schedule_1.default.scheduleJob('0 5 * * *', async () => {
    console.log('Running scheduled data update...');
    try {
        // Fetch all player stats
        const allStats = await (0, httpPlayerStatsScraper_1.scrapePlayerStats)();
        // Store the raw data
        (0, dataService_1.storeData)('player-stats.json', allStats);
        // Calculate and store trends
        await (0, dataService_1.calculateDailyTrends)(allStats);
        // Update standings
        const standings = await (0, standingsScraper_1.scrapeStandings)();
        (0, dataService_1.storeData)('standings.json', standings);
        // Update games
        const games = await (0, gamesScraper_1.scrapeGames)();
        (0, dataService_1.storeData)('games.json', games);
        console.log('Daily data update completed successfully');
    }
    catch (err) {
        console.error('Error during scheduled data update:', err);
    }
});
// Serve index.html for non-API routes (for React Router support)
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public', 'index.html'));
});
// Fallback route for any non-API paths
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path_1.default.join(__dirname, '../public', 'index.html'));
    }
    else {
        next();
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoints available at:`);
    console.log(` - /api/roster`);
    console.log(` - /api/standings`);
    console.log(` - /api/trends`);
    console.log(` - /api/games`);
});
