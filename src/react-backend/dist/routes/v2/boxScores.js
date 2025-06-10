"use strict";
/**
 * Box Score API Routes - Advanced player performance and matchup analysis
 *
 * These endpoints provide:
 * 1. Game-by-game player statistics
 * 2. Performance trends and rolling averages
 * 3. Player vs team/pitcher matchup data
 * 4. Advanced analytics and insights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const boxScoreService_1 = __importDefault(require("../services/boxScoreService"));
const gameDataManager_1 = __importDefault(require("../services/gameDataManager"));
const router = express_1.default.Router();
/**
 * GET /api/v2/games/discover/:date
 * Discover all games for a specific date
 */
router.get('/games/discover/:date', async (req, res) => {
    try {
        const { date } = req.params;
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
        const games = await boxScoreService_1.default.discoverGames(date);
        res.json({
            date,
            totalGames: games.length,
            games
        });
    }
    catch (error) {
        console.error('Error discovering games:', error);
        res.status(500).json({ error: 'Failed to discover games' });
    }
});
/**
 * GET /api/v2/games/boxscore/:gameId
 * Get detailed box score for a specific game
 */
router.get('/games/boxscore/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        if (!gameId || !/^\d+$/.test(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const boxScore = await boxScoreService_1.default.scrapeBoxScore(gameId);
        if (!boxScore) {
            return res.status(404).json({ error: 'Box score not found' });
        }
        res.json(boxScore);
    }
    catch (error) {
        console.error('Error fetching box score:', error);
        res.status(500).json({ error: 'Failed to fetch box score' });
    }
});
/**
 * GET /api/v2/players/:playerId/gamelog
 * Get player's game-by-game statistics
 */
router.get('/players/:playerId/gamelog', async (req, res) => {
    try {
        const { playerId } = req.params;
        const { timeframe, limit } = req.query;
        let gameLog = gameDataManager_1.default.getPlayerGameLog(playerId, timeframe);
        if (limit && !isNaN(Number(limit))) {
            gameLog = gameLog.slice(0, Number(limit));
        }
        res.json({
            playerId,
            timeframe: timeframe || 'all',
            totalGames: gameLog.length,
            gameLog
        });
    }
    catch (error) {
        console.error('Error fetching player game log:', error);
        res.status(500).json({ error: 'Failed to fetch player game log' });
    }
});
/**
 * GET /api/v2/players/:playerId/trends
 * Get player performance trends
 */
router.get('/players/:playerId/trends', async (req, res) => {
    try {
        const { playerId } = req.params;
        const { timeframe = 'last30' } = req.query;
        const trends = gameDataManager_1.default.getPlayerTrends(playerId, timeframe);
        res.json({
            playerId,
            timeframe,
            ...trends
        });
    }
    catch (error) {
        console.error('Error fetching player trends:', error);
        res.status(500).json({ error: 'Failed to fetch player trends' });
    }
});
/**
 * GET /api/v2/players/:playerId/rolling-averages
 * Get player's rolling averages
 */
router.get('/players/:playerId/rolling-averages', async (req, res) => {
    try {
        const { playerId } = req.params;
        const { window = 10 } = req.query;
        const windowSize = Math.max(1, Math.min(50, Number(window))); // Limit between 1-50 games
        const rollingAverages = gameDataManager_1.default.calculateRollingAverages(playerId, windowSize);
        res.json({
            playerId,
            window: windowSize,
            data: rollingAverages
        });
    }
    catch (error) {
        console.error('Error fetching rolling averages:', error);
        res.status(500).json({ error: 'Failed to fetch rolling averages' });
    }
});
/**
 * GET /api/v2/players/:playerId/vs-team/:teamCode
 * Get player performance against specific team
 */
router.get('/players/:playerId/vs-team/:teamCode', async (req, res) => {
    try {
        const { playerId, teamCode } = req.params;
        const vsTeamStats = gameDataManager_1.default.getPlayerVsTeam(playerId, teamCode.toUpperCase());
        // Calculate aggregate stats
        const battingGames = vsTeamStats.filter(g => g.battingStats);
        let aggregateStats = null;
        if (battingGames.length > 0) {
            const totals = battingGames.reduce((acc, game) => {
                const stats = game.battingStats;
                return {
                    games: acc.games + 1,
                    atBats: acc.atBats + stats.atBats,
                    hits: acc.hits + stats.hits,
                    homeRuns: acc.homeRuns + stats.homeRuns,
                    rbi: acc.rbi + stats.rbi,
                    runs: acc.runs + stats.runs,
                    walks: acc.walks + stats.walks,
                    strikeouts: acc.strikeouts + stats.strikeouts
                };
            }, { games: 0, atBats: 0, hits: 0, homeRuns: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0 });
            aggregateStats = {
                games: totals.games,
                avg: totals.atBats > 0 ? totals.hits / totals.atBats : 0,
                homeRuns: totals.homeRuns,
                rbi: totals.rbi,
                runs: totals.runs,
                strikeoutRate: totals.atBats > 0 ? totals.strikeouts / totals.atBats : 0,
                walkRate: totals.atBats > 0 ? totals.walks / totals.atBats : 0
            };
        }
        res.json({
            playerId,
            vsTeam: teamCode.toUpperCase(),
            totalGames: vsTeamStats.length,
            aggregateStats,
            gameLog: vsTeamStats
        });
    }
    catch (error) {
        console.error('Error fetching player vs team stats:', error);
        res.status(500).json({ error: 'Failed to fetch player vs team stats' });
    }
});
/**
 * GET /api/v2/matchups/:batterId/vs/:pitcherId
 * Get head-to-head batter vs pitcher matchup data
 */
router.get('/matchups/:batterId/vs/:pitcherId', async (req, res) => {
    try {
        const { batterId, pitcherId } = req.params;
        const matchupHistory = gameDataManager_1.default.getBatterVsPitcherHistory(batterId, pitcherId);
        // Calculate matchup stats
        let matchupStats = null;
        const battingGames = matchupHistory.filter(g => g.battingStats);
        if (battingGames.length > 0) {
            const totals = battingGames.reduce((acc, game) => {
                const stats = game.battingStats;
                return {
                    atBats: acc.atBats + stats.atBats,
                    hits: acc.hits + stats.hits,
                    homeRuns: acc.homeRuns + stats.homeRuns,
                    rbi: acc.rbi + stats.rbi,
                    walks: acc.walks + stats.walks,
                    strikeouts: acc.strikeouts + stats.strikeouts
                };
            }, { atBats: 0, hits: 0, homeRuns: 0, rbi: 0, walks: 0, strikeouts: 0 });
            matchupStats = {
                encounters: battingGames.length,
                atBats: totals.atBats,
                hits: totals.hits,
                avg: totals.atBats > 0 ? totals.hits / totals.atBats : 0,
                homeRuns: totals.homeRuns,
                rbi: totals.rbi,
                walks: totals.walks,
                strikeouts: totals.strikeouts,
                lastFaced: battingGames[0]?.date || 'Unknown'
            };
        }
        res.json({
            batter: batterId,
            pitcher: pitcherId,
            matchupStats,
            gameHistory: matchupHistory
        });
    }
    catch (error) {
        console.error('Error fetching matchup data:', error);
        res.status(500).json({ error: 'Failed to fetch matchup data' });
    }
});
/**
 * GET /api/v2/players/:playerId/summary
 * Get comprehensive player statistics summary
 */
router.get('/players/:playerId/summary', async (req, res) => {
    try {
        const { playerId } = req.params;
        const summary = gameDataManager_1.default.getPlayerSummary(playerId);
        if (!summary) {
            return res.status(404).json({ error: 'Player data not found' });
        }
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching player summary:', error);
        res.status(500).json({ error: 'Failed to fetch player summary' });
    }
});
/**
 * GET /api/v2/teams/:teamCode/games
 * Get team's recent games
 */
router.get('/teams/:teamCode/games', async (req, res) => {
    try {
        const { teamCode } = req.params;
        const { timeframe, limit } = req.query;
        let teamGames = gameDataManager_1.default.getTeamGames(teamCode.toUpperCase(), timeframe);
        if (limit && !isNaN(Number(limit))) {
            teamGames = teamGames.slice(0, Number(limit));
        }
        res.json({
            team: teamCode.toUpperCase(),
            timeframe: timeframe || 'all',
            totalGames: teamGames.length,
            games: teamGames
        });
    }
    catch (error) {
        console.error('Error fetching team games:', error);
        res.status(500).json({ error: 'Failed to fetch team games' });
    }
});
/**
 * GET /api/v2/games/date-range
 * Get games within a date range
 */
router.get('/games/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Both startDate and endDate are required' });
        }
        // Validate date formats
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
        const games = gameDataManager_1.default.getGamesByDateRange(startDate, endDate);
        res.json({
            startDate,
            endDate,
            totalGames: games.length,
            games
        });
    }
    catch (error) {
        console.error('Error fetching games by date range:', error);
        res.status(500).json({ error: 'Failed to fetch games by date range' });
    }
});
/**
 * GET /api/v2/data/info
 * Get information about the data freshness and coverage
 */
router.get('/data/info', async (req, res) => {
    try {
        const dataInfo = gameDataManager_1.default.getDataInfo();
        res.json(dataInfo);
    }
    catch (error) {
        console.error('Error fetching data info:', error);
        res.status(500).json({ error: 'Failed to fetch data info' });
    }
});
/**
 * POST /api/v2/games/bulk-scrape
 * Initiate bulk scraping of games for a date range
 */
router.post('/games/bulk-scrape', async (req, res) => {
    try {
        const { startDate, endDate, forceRefresh = false } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Both startDate and endDate are required' });
        }
        // Basic implementation for now - can be enhanced with job queue later
        const gameCount = await estimateGameCount(startDate, endDate);
        res.json({
            message: 'Bulk scraping initiated',
            startDate,
            endDate,
            forceRefresh,
            estimatedGames: gameCount,
            status: 'queued',
            note: 'This will be implemented with proper job queue system'
        });
    }
    catch (error) {
        console.error('Error initiating bulk scrape:', error);
        res.status(500).json({ error: 'Failed to initiate bulk scrape' });
    }
});
// Helper function to estimate game count
async function estimateGameCount(startDate, endDate) {
    // Rough estimate: ~15 games per day during regular season
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days * 15);
}
exports.default = router;
