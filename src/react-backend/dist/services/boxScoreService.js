"use strict";
/**
 * Box Score Service - Comprehensive game-by-game player performance tracking
 *
 * This service handles:
 * 1. Discovering games from MLB scores page
 * 2. Scraping detailed box score data for each game
 * 3. Storing game-by-game player statistics
 * 4. Building performance trends and matchup data
 */
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
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
const dataService_1 = require("./dataService");
class BoxScoreService {
    constructor() {
        this.CACHE_PREFIX = 'boxscore:';
        this.GAMES_CACHE_PREFIX = 'games:';
        this.TRENDS_CACHE_PREFIX = 'trends:';
        this.MATCHUP_CACHE_PREFIX = 'matchup:';
    }
    /**
     * Discover all games for a given date
     */
    async discoverGames(date) {
        const cacheKey = `${this.GAMES_CACHE_PREFIX}${date}`;
        try {
            // Check cache first
            const cachedGames = await (0, dataService_1.getCachedData)(cacheKey);
            if (cachedGames) {
                console.log(`Found ${cachedGames.length} cached games for ${date}`);
                return cachedGames;
            }
            console.log(`Discovering games for ${date}...`);
            // Fetch the scores page for the specific date
            const scoresUrl = `https://www.mlb.com/scores/${date}`;
            const response = await (0, node_fetch_1.default)(scoresUrl, {
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
            // Parse game elements from the scores page
            // This will need to be refined based on actual MLB.com structure
            $('.scores-row').each((index, element) => {
                const gameElement = $(element);
                // Extract game ID from gameday link
                const gamedayLink = gameElement.find('a[href*="/gameday/"]').attr('href');
                const gameIdMatch = gamedayLink?.match(/gameday\/(\d+)/);
                const gameId = gameIdMatch ? gameIdMatch[1] : '';
                if (gameId) {
                    const homeTeam = gameElement.find('.home-team').text().trim();
                    const awayTeam = gameElement.find('.away-team').text().trim();
                    const homeScore = parseInt(gameElement.find('.home-score').text().trim()) || 0;
                    const awayScore = parseInt(gameElement.find('.away-score').text().trim()) || 0;
                    const status = gameElement.find('.game-status').text().toLowerCase().includes('final') ? 'final' : 'scheduled';
                    games.push({
                        gameId,
                        date,
                        homeTeam,
                        awayTeam,
                        homeScore,
                        awayScore,
                        status
                    });
                }
            });
            console.log(`Discovered ${games.length} games for ${date}`);
            // Cache for 24 hours
            await (0, dataService_1.cacheData)(cacheKey, games, 1440);
            return games;
        }
        catch (error) {
            console.error(`Error discovering games for ${date}:`, error);
            return [];
        }
    }
    /**
     * Scrape detailed box score for a specific game
     */
    async scrapeBoxScore(gameId) {
        const cacheKey = `${this.CACHE_PREFIX}${gameId}`;
        try {
            // Check cache first
            const cachedBoxScore = await (0, dataService_1.getCachedData)(cacheKey);
            if (cachedBoxScore) {
                console.log(`Found cached box score for game ${gameId}`);
                return cachedBoxScore;
            }
            console.log(`Scraping box score for game ${gameId}...`);
            const boxScoreUrl = `https://www.mlb.com/gameday/${gameId}`;
            const response = await (0, node_fetch_1.default)(boxScoreUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Extract game info
            const gameInfo = {
                gameId,
                date: '', // Will be extracted from page
                homeTeam: '',
                awayTeam: '',
                homeScore: 0,
                awayScore: 0,
                status: 'scheduled'
            };
            // Extract detailed player stats
            const homeTeamStats = [];
            const awayTeamStats = [];
            const gameEvents = [];
            // Parse batting stats table
            $('#home-batting tbody tr').each((index, element) => {
                const row = $(element);
                const playerName = row.find('.player-name').text().trim();
                if (playerName) {
                    const stats = {
                        playerId: '', // Will need to extract from player link
                        playerName,
                        team: gameInfo.homeTeam,
                        gameId,
                        date: gameInfo.date,
                        opponent: gameInfo.awayTeam,
                        isHome: true,
                        battingStats: {
                            atBats: parseInt(row.find('.ab').text()) || 0,
                            runs: parseInt(row.find('.r').text()) || 0,
                            hits: parseInt(row.find('.h').text()) || 0,
                            rbi: parseInt(row.find('.rbi').text()) || 0,
                            walks: parseInt(row.find('.bb').text()) || 0,
                            strikeouts: parseInt(row.find('.so').text()) || 0,
                            avg: parseFloat(row.find('.avg').text()) || 0,
                            obp: parseFloat(row.find('.obp').text()) || 0,
                            slg: parseFloat(row.find('.slg').text()) || 0,
                            ops: parseFloat(row.find('.ops').text()) || 0,
                            doubles: parseInt(row.find('.2b').text()) || 0,
                            triples: parseInt(row.find('.3b').text()) || 0,
                            homeRuns: parseInt(row.find('.hr').text()) || 0,
                            stolenBases: parseInt(row.find('.sb').text()) || 0,
                            caughtStealing: parseInt(row.find('.cs').text()) || 0,
                            hitByPitch: parseInt(row.find('.hbp').text()) || 0,
                            sacrifices: parseInt(row.find('.sac').text()) || 0,
                            groundIntoDoublePlay: parseInt(row.find('.gidp').text()) || 0,
                            leftOnBase: parseInt(row.find('.lob').text()) || 0
                        }
                    };
                    homeTeamStats.push(stats);
                }
            });
            // Similar parsing for away team and pitching stats...
            const boxScore = {
                gameInfo,
                homeTeamStats,
                awayTeamStats,
                gameEvents
            };
            // Cache for 7 days (games don't change once final)
            await (0, dataService_1.cacheData)(cacheKey, boxScore, 10080);
            return boxScore;
        }
        catch (error) {
            console.error(`Error scraping box score for game ${gameId}:`, error);
            return null;
        }
    }
    /**
     * Calculate player trends over specified timeframe
     */
    async calculatePlayerTrends(playerId, timeframe = 'last7') {
        const cacheKey = `${this.TRENDS_CACHE_PREFIX}${playerId}:${timeframe}`;
        try {
            // Check cache first
            const cachedTrends = await (0, dataService_1.getCachedData)(cacheKey);
            if (cachedTrends) {
                return cachedTrends;
            }
            // Get player's recent games
            const recentGames = await this.getPlayerRecentGames(playerId, timeframe);
            if (recentGames.length === 0) {
                return null;
            }
            // Calculate batting trends
            const battingGames = recentGames.filter(g => g.battingStats);
            let battingTrends = undefined;
            if (battingGames.length > 0) {
                const totalStats = battingGames.reduce((acc, game) => {
                    const stats = game.battingStats;
                    return {
                        atBats: acc.atBats + stats.atBats,
                        hits: acc.hits + stats.hits,
                        runs: acc.runs + stats.runs,
                        rbi: acc.rbi + stats.rbi,
                        homeRuns: acc.homeRuns + stats.homeRuns,
                        walks: acc.walks + stats.walks,
                        strikeouts: acc.strikeouts + stats.strikeouts
                    };
                }, { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 });
                battingTrends = {
                    games: battingGames.length,
                    avg: totalStats.atBats > 0 ? totalStats.hits / totalStats.atBats : 0,
                    obp: 0, // Calculate based on hits + walks + hbp / (atBats + walks + hbp + sf)
                    slg: 0, // Calculate based on total bases / atBats
                    ops: 0, // obp + slg
                    homeRuns: totalStats.homeRuns,
                    rbi: totalStats.rbi,
                    runs: totalStats.runs,
                    hits: totalStats.hits,
                    atBats: totalStats.atBats,
                    strikeouts: totalStats.strikeouts,
                    walks: totalStats.walks,
                    hotStreak: this.calculateHittingStreak(battingGames, true),
                    coldStreak: this.calculateHittingStreak(battingGames, false)
                };
            }
            const playerTrend = {
                playerId,
                playerName: recentGames[0].playerName,
                team: recentGames[0].team,
                timeframe,
                battingTrends
            };
            // Cache for 1 hour
            await (0, dataService_1.cacheData)(cacheKey, playerTrend, 60);
            return playerTrend;
        }
        catch (error) {
            console.error(`Error calculating trends for player ${playerId}:`, error);
            return null;
        }
    }
    /**
     * Get batter vs pitcher matchup data
     */
    async getMatchupData(batterId, pitcherId) {
        const cacheKey = `${this.MATCHUP_CACHE_PREFIX}${batterId}:${pitcherId}`;
        try {
            const cachedMatchup = await (0, dataService_1.getCachedData)(cacheKey);
            if (cachedMatchup) {
                return cachedMatchup;
            }
            // Get all games where these two players faced each other
            const matchupGames = await this.getMatchupHistory(batterId, pitcherId);
            if (matchupGames.length === 0) {
                return null;
            }
            // Calculate matchup statistics
            const totals = matchupGames.reduce((acc, game) => {
                const stats = game.battingStats;
                return {
                    atBats: acc.atBats + stats.atBats,
                    hits: acc.hits + stats.hits,
                    homeRuns: acc.homeRuns + stats.homeRuns,
                    strikeouts: acc.strikeouts + stats.strikeouts,
                    walks: acc.walks + stats.walks
                };
            }, { atBats: 0, hits: 0, homeRuns: 0, strikeouts: 0, walks: 0 });
            const matchupData = {
                batter: batterId,
                pitcher: pitcherId,
                matchupHistory: {
                    atBats: totals.atBats,
                    hits: totals.hits,
                    homeRuns: totals.homeRuns,
                    strikeouts: totals.strikeouts,
                    walks: totals.walks,
                    avg: totals.atBats > 0 ? totals.hits / totals.atBats : 0,
                    ops: 0, // Calculate OPS
                    lastFaced: matchupGames[0].date
                }
            };
            // Cache for 24 hours
            await (0, dataService_1.cacheData)(cacheKey, matchupData, 1440);
            return matchupData;
        }
        catch (error) {
            console.error(`Error getting matchup data for ${batterId} vs ${pitcherId}:`, error);
            return null;
        }
    }
    /**
     * Helper method to get player's recent games
     */
    async getPlayerRecentGames(playerId, timeframe) {
        // This would query your database/cache for the player's recent games
        // Implementation depends on how you store the scraped data
        return [];
    }
    /**
     * Helper method to get matchup history between batter and pitcher
     */
    async getMatchupHistory(batterId, pitcherId) {
        // This would query your database/cache for historical matchups
        return [];
    }
    /**
     * Calculate hitting streak (consecutive games with/without hit)
     */
    calculateHittingStreak(games, withHit) {
        let streak = 0;
        for (const game of games.reverse()) { // Start from most recent
            if (game.battingStats) {
                const hasHit = game.battingStats.hits > 0;
                if (hasHit === withHit) {
                    streak++;
                }
                else {
                    break;
                }
            }
        }
        return streak;
    }
}
exports.default = new BoxScoreService();
