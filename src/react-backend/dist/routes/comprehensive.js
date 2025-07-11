"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comprehensiveMLBDataService_1 = __importDefault(require("../services/comprehensiveMLBDataService"));
const comprehensiveDataScheduler_1 = __importDefault(require("../services/comprehensiveDataScheduler"));
const router = (0, express_1.Router)();
console.log('🚀 COMPREHENSIVE ROUTER: Router created and routes being defined...');
/**
 * COMPREHENSIVE MLB DATA ROUTES
 *
 * These routes provide MASSIVE amounts of data for advanced analytics
 */
/**
 * GET /api/comprehensive/games
 * Returns ALL games for the season (instead of just 5 recent/upcoming)
 */
router.get('/games', async (req, res) => {
    try {
        console.log('🔥 Fetching ALL season games...');
        const allGames = await comprehensiveMLBDataService_1.default.getAllGames();
        console.log(`✅ Returning ${allGames.length} games for comprehensive analytics`);
        res.json({
            success: true,
            totalGames: allGames.length,
            season: 2025,
            data: allGames,
            analytics: {
                gamesCompleted: allGames.filter(g => g.status.isCompleted).length,
                gamesUpcoming: allGames.filter(g => !g.status.isCompleted && !g.status.isInProgress).length,
                gamesInProgress: allGames.filter(g => g.status.isInProgress).length
            }
        });
    }
    catch (error) {
        console.error('💥 Error fetching comprehensive games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comprehensive games data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/comprehensive/team/:teamCode/games
 * Returns ALL games for a specific team (massive dataset for team analytics)
 */
router.get('/team/:teamCode/games', async (req, res) => {
    try {
        const { teamCode } = req.params;
        console.log(`🏟️  Fetching ALL games for team: ${teamCode}...`);
        const teamGames = await comprehensiveMLBDataService_1.default.getTeamGames(teamCode);
        console.log(`✅ Returning ${teamGames.length} games for ${teamCode.toUpperCase()}`);
        res.json({
            success: true,
            team: teamCode.toUpperCase(),
            totalGames: teamGames.length,
            season: 2025,
            data: teamGames,
            analytics: {
                homeGames: teamGames.filter(g => g.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase()).length,
                awayGames: teamGames.filter(g => g.teams.away.team.abbreviation?.toLowerCase() === teamCode.toLowerCase()).length,
                wins: teamGames.filter(g => {
                    if (!g.status.isCompleted)
                        return false;
                    const isHome = g.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase();
                    const homeScore = g.teams.home.score || 0;
                    const awayScore = g.teams.away.score || 0;
                    return isHome ? homeScore > awayScore : awayScore > homeScore;
                }).length,
                losses: teamGames.filter(g => {
                    if (!g.status.isCompleted)
                        return false;
                    const isHome = g.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase();
                    const homeScore = g.teams.home.score || 0;
                    const awayScore = g.teams.away.score || 0;
                    return isHome ? homeScore < awayScore : awayScore < homeScore;
                }).length
            }
        });
    }
    catch (error) {
        console.error(`💥 Error fetching comprehensive team games for ${req.params.teamCode}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comprehensive team games data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/comprehensive/team/:teamCode
 * Returns EVERYTHING about a team (roster, stats, analytics, projections, etc.)
 */
router.get('/team/:teamCode', async (req, res) => {
    try {
        const { teamCode } = req.params;
        console.log(`🔍 Fetching COMPREHENSIVE data for team: ${teamCode}...`);
        const teamData = await comprehensiveMLBDataService_1.default.getComprehensiveTeamData(teamCode);
        console.log(`✅ Returning comprehensive data for ${teamData.name}`);
        res.json({
            success: true,
            team: teamCode.toUpperCase(),
            data: teamData,
            dataPoints: {
                totalPlayers: teamData.roster?.active?.length || 0,
                totalGames: teamData.schedule?.season?.length || 0,
                analytics: Object.keys(teamData.analytics || {}).length
            }
        });
    }
    catch (error) {
        console.error(`💥 Error fetching comprehensive team data for ${req.params.teamCode}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comprehensive team data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/comprehensive/analytics/team/:teamCode
 * Returns advanced analytics data for interactive charts
 */
router.get('/analytics/team/:teamCode', async (req, res) => {
    try {
        const { teamCode } = req.params;
        console.log(`📊 Generating analytics for team: ${teamCode}...`);
        // Get team games for analytics processing
        const teamGames = await comprehensiveMLBDataService_1.default.getTeamGames(teamCode);
        // Process games for chart data
        const completedGames = teamGames.filter(g => g.status.isCompleted);
        // Generate win/loss data over time
        const winLossData = completedGames.map((game, index) => {
            const isHome = game.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase();
            const homeScore = game.teams.home.score || 0;
            const awayScore = game.teams.away.score || 0;
            const won = isHome ? homeScore > awayScore : awayScore > homeScore;
            // Calculate running win percentage
            const gamesPlayed = index + 1;
            const wins = completedGames.slice(0, gamesPlayed).filter((g, i) => {
                const isHomeGame = g.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase();
                const homeScoreGame = g.teams.home.score || 0;
                const awayScoreGame = g.teams.away.score || 0;
                return isHomeGame ? homeScoreGame > awayScoreGame : awayScoreGame > homeScoreGame;
            }).length;
            return {
                date: game.gameDate,
                gameNumber: gamesPlayed,
                won,
                winPercentage: (wins / gamesPlayed) * 100,
                runsScored: isHome ? homeScore : awayScore,
                runsAllowed: isHome ? awayScore : homeScore
            };
        });
        // Generate runs data
        const runsData = winLossData.map(game => ({
            date: game.date,
            runsScored: game.runsScored,
            runsAllowed: game.runsAllowed,
            runDifferential: game.runsScored - game.runsAllowed
        }));
        // Generate momentum data (last 10 games rolling average)
        const momentumData = winLossData.map((game, index) => {
            const start = Math.max(0, index - 9);
            const last10Games = winLossData.slice(start, index + 1);
            const wins = last10Games.filter(g => g.won).length;
            const momentum = (wins / last10Games.length) * 100;
            return {
                date: game.date,
                momentum: momentum,
                trend: momentum > 60 ? 'hot' : momentum < 40 ? 'cold' : 'neutral'
            };
        });
        console.log(`✅ Generated analytics for ${teamCode.toUpperCase()} - ${completedGames.length} games processed`);
        res.json({
            success: true,
            team: teamCode.toUpperCase(),
            analytics: {
                winLoss: winLossData,
                runs: runsData,
                momentum: momentumData,
                summary: {
                    totalGames: completedGames.length,
                    wins: winLossData.filter(g => g.won).length,
                    losses: winLossData.filter(g => !g.won).length,
                    currentWinPercentage: winLossData.length > 0 ? winLossData[winLossData.length - 1].winPercentage : 0,
                    currentMomentum: momentumData.length > 0 ? momentumData[momentumData.length - 1].momentum : 0,
                    totalRunsScored: runsData.reduce((sum, g) => sum + g.runsScored, 0),
                    totalRunsAllowed: runsData.reduce((sum, g) => sum + g.runsAllowed, 0),
                    runDifferential: runsData.reduce((sum, g) => sum + g.runDifferential, 0)
                }
            }
        });
    }
    catch (error) {
        console.error(`💥 Error generating analytics for ${req.params.teamCode}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate team analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/comprehensive/status
 * Get status of comprehensive data service
 */
router.get('/status', async (req, res) => {
    try {
        res.json({
            success: true,
            service: 'Comprehensive MLB Data Service',
            status: 'active',
            features: [
                'Full season game data (162+ games per team)',
                'Complete team analytics and advanced metrics',
                'Interactive chart data generation',
                'Real-time comprehensive statistics',
                'Advanced player and team insights'
            ],
            dataVolume: {
                estimatedGamesPerSeason: '2,430+ MLB games',
                estimatedTeams: '30 MLB teams',
                estimatedPlayers: '750+ active players',
                dataPoints: 'Millions of statistical data points'
            },
            endpoints: {
                allGames: '/api/comprehensive/games',
                teamGames: '/api/comprehensive/team/:teamCode/games',
                teamData: '/api/comprehensive/team/:teamCode',
                teamAnalytics: '/api/comprehensive/analytics/team/:teamCode',
                schedulerStatus: '/api/comprehensive/scheduler/status',
                historicalCollection: '/api/comprehensive/scheduler/historical',
                dailyUpdate: '/api/comprehensive/scheduler/daily-update',
                enableAnalysis: '/api/comprehensive/scheduler/enable-analysis',
                multiYearData: '/api/comprehensive/multi-year/:startYear/:endYear',
                analysisData: '/api/comprehensive/analysis-data'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get service status'
        });
    }
});
/**
 * COMPREHENSIVE DATA SCHEDULER ENDPOINTS
 * These routes manage the automated 10-year historical data collection system
 */
/**
 * GET /api/comprehensive/scheduler/status
 * Get comprehensive data scheduler status and job information
 */
router.get('/scheduler/status', async (req, res) => {
    try {
        console.log('📊 Getting comprehensive data scheduler status...');
        const status = await comprehensiveDataScheduler_1.default.getSchedulerStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get scheduler status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/comprehensive/scheduler/historical
 * Start 10-year historical data collection (2015-2025)
 */
router.post('/scheduler/historical', async (req, res) => {
    try {
        console.log('🚀 Starting 10-year historical data collection...');
        const jobId = await comprehensiveDataScheduler_1.default.startHistoricalDataCollection();
        res.json({
            success: true,
            message: '10-year historical data collection started',
            jobId,
            estimatedDuration: '6-12 hours',
            dataYears: '2015-2025',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error starting historical collection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start historical data collection',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/comprehensive/scheduler/daily-update
 * Execute daily comprehensive update manually
 */
router.post('/scheduler/daily-update', async (req, res) => {
    try {
        console.log('🌅 Executing manual daily comprehensive update...');
        const jobId = await comprehensiveDataScheduler_1.default.executeDailyUpdate();
        res.json({
            success: true,
            message: 'Daily comprehensive update started',
            jobId,
            estimatedDuration: '5-15 minutes',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error executing daily update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute daily update',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/comprehensive/scheduler/enable-analysis
 * Enable comprehensive analysis capabilities
 */
router.post('/scheduler/enable-analysis', async (req, res) => {
    try {
        console.log('🧮 Enabling comprehensive analysis capabilities...');
        await comprehensiveDataScheduler_1.default.enableAnalysisCapabilities();
        res.json({
            success: true,
            message: 'Analysis capabilities enabled',
            features: [
                'Year-over-year analysis',
                'Seasonal trend tracking',
                'Player development analysis',
                'Team performance metrics',
                'League-wide analytics',
                'Predictive modeling',
                'Historical comparisons'
            ],
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error enabling analysis capabilities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enable analysis capabilities',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Simple test route to verify router is working
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Comprehensive router is working!',
        timestamp: new Date().toISOString()
    });
});
console.log('✅ COMPREHENSIVE ROUTER: All routes defined, exporting router...');
exports.default = router;
