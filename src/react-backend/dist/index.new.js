"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Enable CORS
app.use((0, cors_1.default)());
// Use absolute path for static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
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
            res.json(apiData);
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
// Function to fetch team roster using MLB Stats API
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
                            so: stats.strikeOuts?.toString() || '0',
                            season: currentYear.toString(),
                            statType: 'pitching'
                        });
                    }
                }
            }
            console.log(`Successfully fetched ${players.length} ${statType} players across all teams`);
            return [{
                    teamName: 'All Teams',
                    teamCode: 'ALL',
                    players: players
                }];
        }
        throw new Error(`Not implemented: fetching individual team rosters`);
    }
    catch (error) {
        console.error(`Error fetching team roster via API for ${teamAbbr}:`, error.message);
        throw error;
    }
}
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoints:`);
    console.log(` - /api/roster`);
});
