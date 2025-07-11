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
const dataService_1 = require("../services/dataService");
const mlbStatsApiService_1 = require("./mlbStatsApiService");
const teams_1 = require("../constants/teams");
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
 * Handles dynamic content loading limitations via multiple strategies:
 * 1. Try cached data first
 * 2. Use MLB Stats API as primary data source
 * 3. Fall back to web scraping with retry mechanism
 * 4. Use mock data as final fallback
 *
 * @returns Promise containing game data
 */
async function scrapeGames() {
    try {
        console.log("Starting game data collection process...");
        // Try to get cached games data first (main cache)
        const cachedGames = await (0, dataService_1.getCachedData)('games');
        if (cachedGames) {
            console.log("Using cached games data (expires in separate cache entry)");
            return cachedGames;
        }
        // If no cache, try to fetch games using the MLB Stats API
        try {
            console.log("Attempting to fetch games from MLB Stats API (most reliable source)...");
            // Import dynamically to avoid circular dependencies
            const { fetchGamesFromAPI } = await Promise.resolve().then(() => __importStar(require('./mlbStatsApiService')));
            const apiGames = await fetchGamesFromAPI();
            // Convert API game statuses to our specific types
            const formattedGames = {
                recent: apiGames.recent.map(game => ({
                    ...game,
                    status: game.status === 'completed' ? 'completed' :
                        game.status === 'live' ? 'live' : 'scheduled'
                })),
                upcoming: apiGames.upcoming.map(game => ({
                    ...game,
                    status: game.status === 'live' ? 'live' : 'scheduled'
                }))
            };
            if (formattedGames.recent.length > 0 || formattedGames.upcoming.length > 0) {
                console.log(`Successfully retrieved ${formattedGames.recent.length} recent games and ${formattedGames.upcoming.length} upcoming games from API`);
                // Cache the successful result with different expirations based on game type
                // Recent games can be cached longer as they don't change
                (0, dataService_1.cacheData)('games', formattedGames, 120); // Cache combined data for 2 hours
                // Individual caches for component pieces (backup)
                if (formattedGames.recent.length > 0) {
                    (0, dataService_1.cacheData)('recent-games', formattedGames.recent, 240); // Cache for 4 hours (historical data)
                }
                if (formattedGames.upcoming.length > 0) {
                    (0, dataService_1.cacheData)('upcoming-games', formattedGames.upcoming, 60); // Cache for 1 hour (more volatile)
                }
                return formattedGames;
            }
            console.log("No games found from MLB Stats API, falling back to web scraping");
        }
        catch (apiError) {
            console.error('Error fetching games from MLB Stats API:', apiError);
            console.log("Falling back to web scraping due to API error (note: may be limited by dynamic content)");
        }
        // Fallback to web scraping if API fails
        console.log("Starting HTTP-based game scraper as fallback (warning: MLB.com uses dynamic content)...");
        // Create a promise to handle potential timeout for web scraping
        const scrapingWithTimeout = async () => {
            return Promise.race([
                // The actual scraping process
                (async () => {
                    try {
                        // Check for separate caches first
                        const separateCachedRecent = (0, dataService_1.getCachedData)('recent-games');
                        const separateCachedUpcoming = (0, dataService_1.getCachedData)('upcoming-games');
                        // If both caches exist, combine and return
                        if (separateCachedRecent && separateCachedUpcoming) {
                            console.log("Using separately cached recent and upcoming games");
                            return {
                                recent: separateCachedRecent,
                                upcoming: separateCachedUpcoming
                            };
                        }
                        // Otherwise scrape what we need
                        console.log("Scraping recent games...");
                        const recentGames = separateCachedRecent || await scrapeRecentGames();
                        console.log(`Found ${recentGames.length} recent games`);
                        console.log("Scraping upcoming games...");
                        const upcomingGames = separateCachedUpcoming || await scrapeUpcomingGames();
                        console.log(`Found ${upcomingGames.length} upcoming games`);
                        // Cache the combined result
                        const combinedResults = {
                            recent: recentGames,
                            upcoming: upcomingGames
                        };
                        if (recentGames.length > 0 || upcomingGames.length > 0) {
                            (0, dataService_1.cacheData)('games', combinedResults, 120); // Cache for 2 hours
                        }
                        return combinedResults;
                    }
                    catch (error) {
                        console.error("Error in scraping process:", error);
                        throw error;
                    }
                })(),
                // Timeout after 10 seconds to avoid hanging
                new Promise((_, reject) => setTimeout(() => reject(new Error("Web scraping timed out after 10 seconds")), 10000))
            ]);
        };
        try {
            const scrapedGames = await scrapingWithTimeout();
            // Check if we actually got data or need to fall back to mock data
            const needsMockRecent = scrapedGames.recent.length === 0;
            const needsMockUpcoming = scrapedGames.upcoming.length === 0;
            if (needsMockRecent || needsMockUpcoming) {
                console.log(`Using ${needsMockRecent && needsMockUpcoming ? 'all mock data' :
                    needsMockRecent ? 'mock recent games' : 'mock upcoming games'}`);
            }
            return {
                recent: needsMockRecent ? MOCK_GAMES.recent : scrapedGames.recent,
                upcoming: needsMockUpcoming ? MOCK_GAMES.upcoming : scrapedGames.upcoming
            };
        }
        catch (scrapingError) {
            console.error('Error or timeout in web scraping:', scrapingError);
            // Fallback to mock data on error/timeout
            console.log("Returning mock game data due to scraping error/timeout");
            return MOCK_GAMES;
        }
    }
    catch (error) {
        console.error('Error retrieving games data:', error);
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
        // Try to get cached recent games first
        const cachedRecent = await (0, dataService_1.getCachedData)('recent-games');
        if (cachedRecent) {
            console.log("Using cached recent games data");
            return cachedRecent;
        }
        // Navigate to MLB scoreboard page with retry mechanism
        const html = await (0, mlbStatsApiService_1.withRetry)(async () => {
            const response = await (0, node_fetch_1.default)('https://www.mlb.com/scores/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        });
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
                // Remove artificial limit to show all available games
            }
            catch (e) {
                console.error('Error processing game card', e);
            }
        });
        // Cache the successful result for 2 hours (even if empty)
        if (games.length > 0) {
            console.log(`Caching ${games.length} recent games`);
            (0, dataService_1.cacheData)('recent-games', games, 120); // Cache for 2 hours
        }
        else {
            console.log('No recent games found to cache');
        }
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
        // Try to get cached upcoming games first
        const cachedUpcoming = await (0, dataService_1.getCachedData)('upcoming-games');
        if (cachedUpcoming) {
            console.log("Using cached upcoming games data");
            return cachedUpcoming;
        }
        // Navigate to MLB schedule page for today/tomorrow with retry mechanism
        const html = await (0, mlbStatsApiService_1.withRetry)(async () => {
            const response = await (0, node_fetch_1.default)('https://www.mlb.com/schedule/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        });
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
                // Remove artificial limit to show all available games
            }
            catch (e) {
                console.error('Error processing game entry', e);
            }
        });
        // Cache the successful result for 2 hours (even if empty)
        if (games.length > 0) {
            console.log(`Caching ${games.length} upcoming games`);
            (0, dataService_1.cacheData)('upcoming-games', games, 120); // Cache for 2 hours
        }
        else {
            console.log('No upcoming games found to cache');
        }
        return games;
    }
    catch (error) {
        console.error('Error scraping upcoming games:', error);
        return [];
    }
}
// Cache for team codes to avoid repeated lookups
const teamCodeCache = {};
/**
 * Helper function to convert team name to team code
 * Uses caching for efficiency and to handle potential issues in dynamic content
 */
function getTeamCodeFromName(teamName) {
    // Fast path: check in-memory cache first
    if (teamCodeCache[teamName]) {
        return teamCodeCache[teamName];
    }
    // Convert full team names to codes using TEAM_ID_MAP mapping
    const teamFullNameToCode = Object.entries(teams_1.TEAM_ID_MAP).reduce((acc, [code, _]) => {
        switch (code) {
            case 'nyy':
                acc['New York Yankees'] = code;
                break;
            case 'bos':
                acc['Boston Red Sox'] = code;
                break;
            case 'tb':
                acc['Tampa Bay Rays'] = code;
                break;
            case 'tor':
                acc['Toronto Blue Jays'] = code;
                break;
            case 'bal':
                acc['Baltimore Orioles'] = code;
                break;
            case 'cle':
                acc['Cleveland Guardians'] = code;
                acc['Cleveland Indians'] = code; // Handle legacy name
                break;
            case 'min':
                acc['Minnesota Twins'] = code;
                break;
            case 'cws':
                acc['Chicago White Sox'] = code;
                break;
            case 'kc':
                acc['Kansas City Royals'] = code;
                break;
            case 'det':
                acc['Detroit Tigers'] = code;
                break;
            case 'hou':
                acc['Houston Astros'] = code;
                break;
            case 'sea':
                acc['Seattle Mariners'] = code;
                break;
            case 'tex':
                acc['Texas Rangers'] = code;
                break;
            case 'laa':
                acc['Los Angeles Angels'] = code;
                break;
            case 'oak':
                acc['Oakland Athletics'] = code;
                break;
            case 'atl':
                acc['Atlanta Braves'] = code;
                break;
            case 'nym':
                acc['New York Mets'] = code;
                break;
            case 'phi':
                acc['Philadelphia Phillies'] = code;
                break;
            case 'mia':
                acc['Miami Marlins'] = code;
                break;
            case 'wsh':
                acc['Washington Nationals'] = code;
                break;
            case 'chc':
                acc['Chicago Cubs'] = code;
                break;
            case 'stl':
                acc['St. Louis Cardinals'] = code;
                break;
            case 'mil':
                acc['Milwaukee Brewers'] = code;
                break;
            case 'cin':
                acc['Cincinnati Reds'] = code;
                break;
            case 'pit':
                acc['Pittsburgh Pirates'] = code;
                break;
            case 'lad':
                acc['Los Angeles Dodgers'] = code;
                break;
            case 'sd':
                acc['San Diego Padres'] = code;
                break;
            case 'sf':
                acc['San Francisco Giants'] = code;
                break;
            case 'ari':
                acc['Arizona Diamondbacks'] = code;
                break;
            case 'col':
                acc['Colorado Rockies'] = code;
                break;
        }
        return acc;
    }, {});
    // Handle case variations (MLB.com sometimes has inconsistent casing)
    const normalizedTeamName = teamName.trim();
    const code = teamFullNameToCode[normalizedTeamName] ||
        teamFullNameToCode[normalizedTeamName.toLowerCase()] ||
        normalizedTeamName.toLowerCase().replace(/\s+/g, '').substring(0, 3);
    // Cache the result for future lookups
    teamCodeCache[teamName] = code;
    return code;
}
