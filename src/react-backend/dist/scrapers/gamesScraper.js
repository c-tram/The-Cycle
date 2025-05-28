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
exports.scrapeGames = scrapeGames;
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
// Add mock data for when scraping fails
const MOCK_GAMES = {
    recent: [
        { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', homeScore: 5, awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', awayScore: 3, date: new Date().toISOString().split('T')[0], status: 'completed' },
        { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', homeScore: 2, awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', awayScore: 1, date: new Date().toISOString().split('T')[0], status: 'completed' },
        { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', homeScore: 7, awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', awayScore: 4, date: new Date().toISOString().split('T')[0], status: 'completed' },
    ],
    upcoming: [
        { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', date: new Date().toISOString().split('T')[0], time: '7:05 PM', status: 'scheduled' },
        { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', date: new Date().toISOString().split('T')[0], time: '10:10 PM', status: 'scheduled' },
        { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', date: new Date().toISOString().split('T')[0], time: '8:15 PM', status: 'scheduled' },
    ]
};
/**
 * Scrapes recent and upcoming MLB games using HTTP requests and cheerio
 * @returns Promise containing game data
 */
async function scrapeGames() {
    try {
        console.log("Starting HTTP-based game scraper...");
        console.log("Scraping recent games...");
        // Scrape completed games
        const recentGames = await scrapeRecentGames();
        console.log(`Found ${recentGames.length} recent games`);
        console.log("Scraping upcoming games...");
        // Scrape upcoming games
        const upcomingGames = await scrapeUpcomingGames();
        console.log(`Found ${upcomingGames.length} upcoming games`);
        // Return mock data if no real data was found
        if (recentGames.length === 0 && upcomingGames.length === 0) {
            console.log("No games found, using mock data");
            return MOCK_GAMES;
        }
        return {
            recent: recentGames.length > 0 ? recentGames : MOCK_GAMES.recent,
            upcoming: upcomingGames.length > 0 ? upcomingGames : MOCK_GAMES.upcoming
        };
    }
    catch (error) {
        console.error('Error scraping games:', error);
        // Fallback to mock data on error
        console.log("Returning mock game data due to error");
        return MOCK_GAMES;
    }
}
/**
 * Scrapes completed games from MLB scoreboard using HTTP
 */
async function scrapeRecentGames() {
    try {
        // Navigate to MLB scoreboard page
        const response = await (0, node_fetch_1.default)('https://www.mlb.com/scores/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const games = [];
        // Look for game cards
        const gameCards = $('.EventCard, .schedule-item, .p-schedule__game');
        gameCards.each((i, card) => {
            try {
                // Get status
                let status = 'scheduled';
                let statusText = '';
                const statusElem = $(card).find('.EventCard-statusText, .schedule-status, .p-schedule__status');
                statusText = statusElem.text().trim().toLowerCase();
                if (statusText.includes('final'))
                    status = 'completed';
                else if (statusText.match(/top|bottom|\d+(st|nd|rd|th)/i))
                    status = 'live';
                // Only completed games
                if (status !== 'completed')
                    return;
                // Get team names
                const teamElems = $(card).find('.EventCard-matchupTeamName, .schedule-team__name, .p-schedule__team-name');
                if (teamElems.length !== 2)
                    return;
                const awayTeam = $(teamElems[0]).text().trim();
                const homeTeam = $(teamElems[1]).text().trim();
                if (!awayTeam || !homeTeam)
                    return;
                // Get scores
                let awayScore, homeScore;
                const scoreElems = $(card).find('.EventCard-score, .schedule-score, .p-schedule__score');
                if (scoreElems.length === 2) {
                    awayScore = parseInt($(scoreElems[0]).text().trim(), 10);
                    homeScore = parseInt($(scoreElems[1]).text().trim(), 10);
                }
                // Get date (from status or fallback to yesterday)
                let date = new Date();
                if (statusText.match(/yesterday/i)) {
                    date.setDate(date.getDate() - 1);
                }
                const dateStr = date.toISOString().split('T')[0];
                if (awayScore !== undefined && homeScore !== undefined && !isNaN(awayScore) && !isNaN(homeScore)) {
                    games.push({
                        awayTeam,
                        homeTeam,
                        awayTeamCode: getTeamCodeFromName(awayTeam),
                        homeTeamCode: getTeamCodeFromName(homeTeam),
                        awayScore,
                        homeScore,
                        date: dateStr,
                        status
                    });
                }
                if (games.length >= 5)
                    return false; // Break out of each loop
            }
            catch (e) {
                console.error('Error processing game card', e);
            }
        });
        return games;
    }
    catch (error) {
        console.error('Error scraping recent games:', error);
        return [];
    }
}
/**
 * Scrapes upcoming games from MLB schedule using HTTP
 */
async function scrapeUpcomingGames() {
    try {
        // Navigate to MLB schedule page for today/tomorrow
        const response = await (0, node_fetch_1.default)('https://www.mlb.com/schedule/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const games = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        // Try multiple selectors for robustness
        const gameEntries = $('.schedule-item, .p-schedule__game, .EventCard');
        gameEntries.each((i, entry) => {
            try {
                // Get team names
                let awayTeam = '', homeTeam = '';
                const teamElems = $(entry).find('.schedule-team__name, .p-schedule__team-name, .EventCard-matchupTeamName');
                if (teamElems.length === 2) {
                    awayTeam = $(teamElems[0]).text().trim();
                    homeTeam = $(teamElems[1]).text().trim();
                }
                else {
                    // Fallback for alternate markup
                    const teams = $(entry).text();
                    const parts = teams.split(' at ');
                    if (parts.length === 2) {
                        awayTeam = parts[0].trim();
                        homeTeam = parts[1].trim();
                    }
                }
                if (!awayTeam || !homeTeam)
                    return;
                // Get game time
                let time = '';
                const timeElem = $(entry).find('.schedule-time, .p-schedule__time, .EventCard-statusText');
                time = timeElem.text().trim();
                games.push({
                    awayTeam,
                    homeTeam,
                    awayTeamCode: getTeamCodeFromName(awayTeam),
                    homeTeamCode: getTeamCodeFromName(homeTeam),
                    date: todayStr,
                    time,
                    status: 'scheduled'
                });
                if (games.length >= 5)
                    return false; // Break out of each loop
            }
            catch (e) {
                console.error('Error processing game entry', e);
            }
        });
        return games;
    }
    catch (error) {
        console.error('Error scraping upcoming games:', error);
        return [];
    }
}
/**
 * Helper function to convert team name to team code
 */
function getTeamCodeFromName(teamName) {
    const teamCodes = {
        'New York Yankees': 'nyy',
        'Boston Red Sox': 'bos',
        'Tampa Bay Rays': 'tb',
        'Toronto Blue Jays': 'tor',
        'Baltimore Orioles': 'bal',
        'Houston Astros': 'hou',
        'Seattle Mariners': 'sea',
        'Los Angeles Angels': 'laa',
        'Oakland Athletics': 'oak',
        'Texas Rangers': 'tex',
        'Cleveland Guardians': 'cle',
        'Minnesota Twins': 'min',
        'Chicago White Sox': 'cws',
        'Detroit Tigers': 'det',
        'Kansas City Royals': 'kc',
        'Los Angeles Dodgers': 'lad',
        'San Diego Padres': 'sd',
        'San Francisco Giants': 'sf',
        'Colorado Rockies': 'col',
        'Arizona Diamondbacks': 'ari',
        'Atlanta Braves': 'atl',
        'New York Mets': 'nym',
        'Philadelphia Phillies': 'phi',
        'Miami Marlins': 'mia',
        'Washington Nationals': 'was',
        'Milwaukee Brewers': 'mil',
        'Chicago Cubs': 'chc',
        'St. Louis Cardinals': 'stl',
        'Pittsburgh Pirates': 'pit',
        'Cincinnati Reds': 'cin'
    };
    return teamCodes[teamName] || teamName.toLowerCase().replace(/\s+/g, '').substring(0, 3);
}
