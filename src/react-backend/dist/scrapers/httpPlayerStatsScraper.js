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
exports.scrapePlayerStats = scrapePlayerStats;
exports.scrapeTrendData = scrapeTrendData;
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
// Add mock data for fallback
const MOCK_PLAYERS = [
    { name: "Aaron Judge", team: "Yankees", position: "RF", avg: ".310", hr: "32", rbi: "74", runs: "65", sb: "8", statDate: new Date().toISOString().split('T')[0] },
    { name: "Gerrit Cole", team: "Yankees", position: "P", era: "2.78", wins: "8", so: "112", whip: "1.02", statDate: new Date().toISOString().split('T')[0] },
    { name: "Shohei Ohtani", team: "Dodgers", position: "DH", avg: ".321", hr: "28", rbi: "68", runs: "71", sb: "12", statDate: new Date().toISOString().split('T')[0] },
    { name: "Mookie Betts", team: "Dodgers", position: "RF", avg: ".302", hr: "18", rbi: "56", runs: "61", sb: "7", statDate: new Date().toISOString().split('T')[0] },
    { name: "Ronald Acuña Jr.", team: "Braves", position: "OF", avg: ".337", hr: "24", rbi: "52", runs: "89", sb: "43", statDate: new Date().toISOString().split('T')[0] },
    { name: "Freddie Freeman", team: "Dodgers", position: "1B", avg: ".318", hr: "15", rbi: "67", runs: "72", sb: "4", statDate: new Date().toISOString().split('T')[0] },
    { name: "Spencer Strider", team: "Braves", position: "P", era: "2.85", wins: "11", so: "198", whip: "0.98", statDate: new Date().toISOString().split('T')[0] },
    { name: "Yordan Alvarez", team: "Astros", position: "DH", avg: ".293", hr: "31", rbi: "88", runs: "64", sb: "2", statDate: new Date().toISOString().split('T')[0] }
];
/**
 * Docker-compatible player stats scraper using HTTP requests instead of browser automation
 * @param teamCode Optional team code to filter results
 * @returns Promise containing player statistics
 */
async function scrapePlayerStats(teamCode) {
    try {
        console.log("Starting HTTP-based player stats scraper...");
        // Try to fetch from MLB Stats API first (official API endpoints)
        const mlbApiData = await fetchFromMLBApi(teamCode);
        if (mlbApiData.length > 0) {
            console.log("Successfully fetched data from MLB Stats API");
            return mlbApiData;
        }
        // Fallback to web scraping with HTTP requests
        console.log("Attempting HTTP-based web scraping...");
        const scrapedData = await scrapeWithHTTP(teamCode);
        if (scrapedData.length > 0) {
            console.log("Successfully scraped data via HTTP");
            return scrapedData;
        }
        // Final fallback to mock data
        console.log("Using mock data as fallback");
        return organizeMockDataByTeam(teamCode);
    }
    catch (error) {
        console.error('Error in HTTP player stats scraper:', error);
        return organizeMockDataByTeam(teamCode);
    }
}
/**
 * Fetch data from MLB's official Stats API
 */
async function fetchFromMLBApi(teamCode) {
    try {
        const currentYear = new Date().getFullYear();
        const currentSeason = currentYear;
        // MLB Stats API endpoints
        const battingUrl = `https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=${currentSeason}&sportId=1&limit=100`;
        const pitchingUrl = `https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=${currentSeason}&sportId=1&limit=100`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
        };
        // Fetch batting stats
        const battingResponse = await (0, node_fetch_1.default)(battingUrl, { headers });
        const battingData = await battingResponse.json();
        // Fetch pitching stats
        const pitchingResponse = await (0, node_fetch_1.default)(pitchingUrl, { headers });
        const pitchingData = await pitchingResponse.json();
        const players = [];
        const today = new Date().toISOString().split('T')[0];
        // Process batting stats
        if (battingData?.stats?.[0]?.splits) {
            for (const split of battingData.stats[0].splits.slice(0, 50)) {
                const player = split.player;
                const team = split.team;
                const stats = split.stat;
                players.push({
                    name: player.fullName || 'Unknown',
                    team: team.name || 'Unknown',
                    position: player.primaryPosition?.abbreviation || '',
                    avg: stats.avg || '0.000',
                    hr: stats.homeRuns?.toString() || '0',
                    rbi: stats.rbi?.toString() || '0',
                    runs: stats.runs?.toString() || '0',
                    sb: stats.stolenBases?.toString() || '0',
                    statDate: today
                });
            }
        }
        // Process pitching stats
        if (pitchingData?.stats?.[0]?.splits) {
            for (const split of pitchingData.stats[0].splits.slice(0, 50)) {
                const player = split.player;
                const team = split.team;
                const stats = split.stat;
                players.push({
                    name: player.fullName || 'Unknown',
                    team: team.name || 'Unknown',
                    position: 'P',
                    era: stats.era || '0.00',
                    wins: stats.wins?.toString() || '0',
                    so: stats.strikeOuts?.toString() || '0',
                    whip: stats.whip || '0.00',
                    statDate: today
                });
            }
        }
        // Organize by team
        return organizePlayersByTeam(players, teamCode);
    }
    catch (error) {
        console.error('Error fetching from MLB Stats API:', error);
        return [];
    }
}
/**
 * Scrape data using HTTP requests and HTML parsing (Docker-compatible)
 */
async function scrapeWithHTTP(teamCode) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        // Fetch batting leaders
        const battingPlayers = await scrapeBattingLeadersHTTP(headers);
        // Fetch pitching leaders  
        const pitchingPlayers = await scrapePitchingLeadersHTTP(headers);
        const allPlayers = [...battingPlayers, ...pitchingPlayers];
        if (allPlayers.length === 0) {
            return [];
        }
        return organizePlayersByTeam(allPlayers, teamCode);
    }
    catch (error) {
        console.error('Error in HTTP scraping:', error);
        return [];
    }
}
/**
 * Scrape batting leaders using HTTP requests
 */
async function scrapeBattingLeadersHTTP(headers) {
    try {
        const url = 'https://www.mlb.com/stats/';
        const response = await (0, node_fetch_1.default)(url, { headers, timeout: 10000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const players = [];
        const today = new Date().toISOString().split('T')[0];
        // Look for stats table rows
        $('table tbody tr').each((index, element) => {
            if (index >= 50)
                return false; // Limit to top 50
            const $row = $(element);
            const cells = $row.find('td');
            if (cells.length >= 10) {
                const nameCell = cells.eq(0);
                const teamCell = cells.eq(1);
                const name = nameCell.find('a').text().trim() || nameCell.text().trim();
                const team = teamCell.find('span').text().trim() || teamCell.text().trim();
                if (name && team) {
                    const avg = cells.eq(3).text().trim();
                    const hr = cells.eq(6).text().trim();
                    const rbi = cells.eq(7).text().trim();
                    const runs = cells.eq(5).text().trim();
                    const sb = cells.eq(9).text().trim();
                    players.push({
                        name,
                        team: cleanTeamName(team),
                        avg: avg || '0.000',
                        hr: hr || '0',
                        rbi: rbi || '0',
                        runs: runs || '0',
                        sb: sb || '0',
                        statDate: today
                    });
                }
            }
        });
        return players;
    }
    catch (error) {
        console.error('Error scraping batting leaders via HTTP:', error);
        return [];
    }
}
/**
 * Scrape pitching leaders using HTTP requests
 */
async function scrapePitchingLeadersHTTP(headers) {
    try {
        const url = 'https://www.mlb.com/stats/pitching';
        const response = await (0, node_fetch_1.default)(url, { headers, timeout: 10000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const players = [];
        const today = new Date().toISOString().split('T')[0];
        // Look for stats table rows
        $('table tbody tr').each((index, element) => {
            if (index >= 50)
                return false; // Limit to top 50
            const $row = $(element);
            const cells = $row.find('td');
            if (cells.length >= 10) {
                const nameCell = cells.eq(0);
                const teamCell = cells.eq(1);
                const name = nameCell.find('a').text().trim() || nameCell.text().trim();
                const team = teamCell.find('span').text().trim() || teamCell.text().trim();
                if (name && team) {
                    const era = cells.eq(3).text().trim();
                    const wins = cells.eq(4).text().trim();
                    const so = cells.eq(8).text().trim();
                    const whip = cells.eq(9).text().trim();
                    players.push({
                        name,
                        team: cleanTeamName(team),
                        position: 'P',
                        era: era || '0.00',
                        wins: wins || '0',
                        so: so || '0',
                        whip: whip || '0.00',
                        statDate: today
                    });
                }
            }
        });
        return players;
    }
    catch (error) {
        console.error('Error scraping pitching leaders via HTTP:', error);
        return [];
    }
}
/**
 * Organize players by team
 */
function organizePlayersByTeam(players, teamCode) {
    const teamMap = new Map();
    for (const player of players) {
        const teamName = player.team;
        if (!teamMap.has(teamName)) {
            const teamCodeValue = getTeamCodeFromName(teamName);
            teamMap.set(teamName, {
                teamName,
                teamCode: teamCodeValue,
                players: []
            });
        }
        teamMap.get(teamName).players.push(player);
    }
    let results = Array.from(teamMap.values());
    // Filter by team if requested
    if (teamCode) {
        results = results.filter(team => team.teamCode === teamCode.toLowerCase());
    }
    return results;
}
/**
 * Clean and normalize team names
 */
function cleanTeamName(teamName) {
    // Remove common abbreviations and clean up team names
    return teamName
        .replace(/\s*(NYY|LAD|BOS|ATL|HOU|etc\.)\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Scrapes trend data for a specific stat category over time
 * @param statCategory The stat category to retrieve trend data for
 * @returns Promise containing trend data by month/week
 */
async function scrapeTrendData(statCategory) {
    // This function would collect data over time
    // For now, returning mock data as historical data scraping is complex
    // In a real implementation, you'd query a database of previously scraped stats
    const mockData = {
        'Batting Average': [0.268, 0.265, 0.271, 0.275, 0.269, 0.263, 0.267],
        'Home Runs': [1.15, 1.23, 1.27, 1.34, 1.29, 1.21, 1.18],
        'RBIs': [4.05, 4.18, 4.32, 4.48, 4.37, 4.25, 4.12],
        'OPS': [0.725, 0.736, 0.745, 0.758, 0.751, 0.733, 0.726],
        'ERA': [3.95, 4.02, 3.98, 3.92, 4.05, 4.14, 4.10],
        'Strikeouts': [8.8, 8.9, 9.1, 9.3, 9.2, 9.0, 8.9],
        'WHIP': [1.27, 1.25, 1.22, 1.21, 1.23, 1.26, 1.28],
        'Exit Velocity': [88.6, 88.9, 89.2, 89.4, 89.1, 88.8, 88.7],
        'Launch Angle': [12.2, 12.4, 12.7, 12.9, 12.6, 12.3, 12.2],
        'Sprint Speed': [27.0, 26.9, 26.8, 26.7, 26.8, 26.9, 27.1]
    };
    // Return the corresponding trend data or a default
    return { [statCategory]: mockData[statCategory] || [0, 0, 0, 0, 0, 0, 0] };
}
/**
 * Helper function to convert team name to team code
 */
function getTeamCodeFromName(teamName) {
    // Short team names that map to codes
    const shortTeamCodeMap = {
        'Yankees': 'nyy',
        'Red Sox': 'bos',
        'Blue Jays': 'tor',
        'Orioles': 'bal',
        'Rays': 'tb',
        'Guardians': 'cle',
        'Twins': 'min',
        'Royals': 'kc',
        'Tigers': 'det',
        'White Sox': 'cws',
        'Astros': 'hou',
        'Mariners': 'sea',
        'Rangers': 'tex',
        'Angels': 'laa',
        'Athletics': 'oak',
        'Braves': 'atl',
        'Phillies': 'phi',
        'Mets': 'nym',
        'Marlins': 'mia',
        'Nationals': 'wsh',
        'Brewers': 'mil',
        'Cubs': 'chc',
        'Cardinals': 'stl',
        'Reds': 'cin',
        'Pirates': 'pit',
        'Dodgers': 'lad',
        'Padres': 'sd',
        'Giants': 'sf',
        'Diamondbacks': 'ari',
        'Rockies': 'col'
    };
    // Find the team code by looking for the team name
    for (const [key, value] of Object.entries(shortTeamCodeMap)) {
        if (teamName.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    // Default to empty string if not found
    return '';
}
/**
 * Helper function to organize mock data by team
 */
function organizeMockDataByTeam(teamCode) {
    const teamMap = new Map();
    for (const player of MOCK_PLAYERS) {
        if (!teamMap.has(player.team)) {
            const teamCodeValue = getTeamCodeFromName(player.team);
            teamMap.set(player.team, {
                teamName: player.team,
                teamCode: teamCodeValue,
                players: []
            });
        }
        teamMap.get(player.team).players.push(player);
    }
    let results = Array.from(teamMap.values());
    // Filter by team if requested
    if (teamCode) {
        results = results.filter(team => team.teamCode === teamCode.toLowerCase());
    }
    return results;
}
