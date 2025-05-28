"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStandingsFromAPI = fetchStandingsFromAPI;
exports.fetchGamesFromAPI = fetchGamesFromAPI;
const node_fetch_1 = __importDefault(require("node-fetch"));
// MLB Team ID to abbreviation mapping
const TEAM_ABBREVIATIONS = {
    108: 'LAA', // Los Angeles Angels
    109: 'ARI', // Arizona Diamondbacks
    110: 'BAL', // Baltimore Orioles
    111: 'BOS', // Boston Red Sox
    112: 'CHC', // Chicago Cubs
    113: 'CIN', // Cincinnati Reds
    114: 'CLE', // Cleveland Guardians
    115: 'COL', // Colorado Rockies
    116: 'DET', // Detroit Tigers
    117: 'HOU', // Houston Astros
    118: 'KC', // Kansas City Royals
    119: 'LAD', // Los Angeles Dodgers
    120: 'WSH', // Washington Nationals
    121: 'NYM', // New York Mets
    133: 'OAK', // Oakland Athletics
    134: 'PIT', // Pittsburgh Pirates
    135: 'SD', // San Diego Padres
    136: 'SEA', // Seattle Mariners
    137: 'SF', // San Francisco Giants
    138: 'STL', // St. Louis Cardinals
    139: 'TB', // Tampa Bay Rays
    140: 'TEX', // Texas Rangers
    141: 'TOR', // Toronto Blue Jays
    142: 'MIN', // Minnesota Twins
    143: 'PHI', // Philadelphia Phillies
    144: 'ATL', // Atlanta Braves
    145: 'CWS', // Chicago White Sox
    146: 'MIA', // Miami Marlins
    147: 'NYY', // New York Yankees
    158: 'MIL' // Milwaukee Brewers
};
// Division ID mapping for cleaner division names
const DIVISION_NAMES = {
    201: 'American League East',
    202: 'American League Central',
    200: 'American League West',
    204: 'National League East',
    205: 'National League Central',
    203: 'National League West'
};
/**
 * Fetches current MLB standings using the official MLB Stats API
 * @returns Promise containing division standings
 */
async function fetchStandingsFromAPI() {
    try {
        console.log("Fetching standings from MLB Stats API...");
        // Fetch standings for both American League (103) and National League (104)
        const response = await (0, node_fetch_1.default)('https://statsapi.mlb.com/api/v1/standings?leagueId=103,104');
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.records || data.records.length === 0) {
            throw new Error('No standings data received from API');
        }
        const divisionStandings = [];
        // Process each division
        for (const record of data.records) {
            const divisionName = DIVISION_NAMES[record.division.id] || record.division.name;
            const teams = [];
            // Sort teams by games back (ascending) to get proper standings order
            const sortedTeams = record.teamRecords.sort((a, b) => {
                if (a.gamesBack === '-')
                    return -1;
                if (b.gamesBack === '-')
                    return 1;
                return parseFloat(a.gamesBack) - parseFloat(b.gamesBack);
            });
            for (const teamRecord of sortedTeams) {
                // Get last 10 games record
                const last10Record = teamRecord.records?.splitRecords?.find(r => r.type === 'lastTen');
                const last10 = last10Record ? `${last10Record.wins}-${last10Record.losses}` : undefined;
                teams.push({
                    team: teamRecord.team.name,
                    wins: teamRecord.wins,
                    losses: teamRecord.losses,
                    pct: teamRecord.winningPercentage,
                    gb: teamRecord.gamesBack,
                    last10,
                    streak: teamRecord.streak?.streakCode
                });
            }
            if (teams.length > 0) {
                divisionStandings.push({
                    division: divisionName,
                    teams
                });
            }
        }
        console.log(`Successfully fetched standings for ${divisionStandings.length} divisions`);
        return divisionStandings;
    }
    catch (error) {
        console.error('Error fetching standings from API:', error);
        throw error;
    }
}
/**
 * Fetches recent and upcoming games using the MLB Stats API
 * @returns Promise containing game data
 */
async function fetchGamesFromAPI() {
    try {
        console.log("Fetching games from MLB Stats API...");
        // Get today's date and calculate date range
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startDate = yesterday.toISOString().split('T')[0];
        const endDate = tomorrow.toISOString().split('T')[0];
        // Fetch games for the date range
        const response = await (0, node_fetch_1.default)(`https://statsapi.mlb.com/api/v1/schedule?startDate=${startDate}&endDate=${endDate}&sportId=1`);
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        const data = await response.json();
        const recent = [];
        const upcoming = [];
        // Process each date's games
        for (const dateData of data.dates || []) {
            for (const game of dateData.games) {
                // Add null safety checks for required fields
                if (!game.teams?.home?.team?.name || !game.teams?.away?.team?.name || !game.status?.abstractGameState) {
                    console.warn('Skipping game due to missing required data:', game);
                    continue;
                }
                const gameDate = new Date(game.gameDate);
                const abstractGameState = game.status.abstractGameState;
                const gameInfo = {
                    homeTeam: game.teams.home.team.name,
                    homeTeamCode: (TEAM_ABBREVIATIONS[game.teams.home.team.id] || 'UNK').toLowerCase(),
                    awayTeam: game.teams.away.team.name,
                    awayTeamCode: (TEAM_ABBREVIATIONS[game.teams.away.team.id] || 'UNK').toLowerCase(),
                    date: gameDate.toISOString().split('T')[0],
                    status: abstractGameState.toLowerCase()
                };
                // Check if game is completed (has scores)
                if (abstractGameState === 'Final') {
                    gameInfo.homeScore = game.teams.home.score || 0;
                    gameInfo.awayScore = game.teams.away.score || 0;
                    gameInfo.status = 'completed';
                    recent.push(gameInfo);
                }
                else if (abstractGameState === 'Preview' || abstractGameState === 'Live') {
                    // For upcoming games, extract time if available
                    const time = new Date(game.gameDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    gameInfo.time = time;
                    gameInfo.status = abstractGameState === 'Live' ? 'live' : 'scheduled';
                    upcoming.push(gameInfo);
                }
            }
        }
        console.log(`Successfully fetched ${recent.length} recent games and ${upcoming.length} upcoming games`);
        return {
            recent: recent.slice(0, 5), // Limit to 5 recent games
            upcoming: upcoming.slice(0, 5) // Limit to 5 upcoming games
        };
    }
    catch (error) {
        console.error('Error fetching games from API:', error);
        throw error;
    }
}
