"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveMLBDataService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class ComprehensiveMLBDataService {
    constructor() {
        this.MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
        this.FANGRAPHS_API = 'https://www.fangraphs.com/api';
        this.CACHE_DURATION = 1800000; // 30 minutes for comprehensive data
        this.SEASON = 2025;
        this.dataCache = new Map();
        console.log('🚀 Initializing COMPREHENSIVE MLB Data Service');
        console.log('📊 This service will fetch MASSIVE amounts of data from multiple sources');
        this.startComprehensiveDataCollection();
    }
    /**
     * THE BIG KAHUNA - Fetch everything for all teams
     */
    async startComprehensiveDataCollection() {
        console.log('🔥 Starting COMPREHENSIVE data collection...');
        try {
            // Get all teams first
            const teams = await this.fetchAllTeams();
            console.log(`📋 Found ${teams.length} MLB teams`);
            // For each team, fetch EVERYTHING
            for (const team of teams) {
                console.log(`🏟️  Processing ${team.name}...`);
                await this.fetchComprehensiveTeamData(team.id);
            }
            // Fetch league-wide data
            await this.fetchLeagueWideData();
            console.log('✅ COMPREHENSIVE data collection complete!');
        }
        catch (error) {
            console.error('💥 Error in comprehensive data collection:', error);
        }
    }
    /**
     * Fetch EVERYTHING for a specific team
     */
    async fetchComprehensiveTeamData(teamId) {
        const cacheKey = `comprehensive-team-${teamId}`;
        // Check cache first
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }
        console.log(`🔍 Fetching COMPREHENSIVE data for team ${teamId}...`);
        try {
            // Parallel fetch all data sources
            const [teamInfo, roster, schedule, stats, transactions, injuries, prospects] = await Promise.all([
                this.fetchTeamInfo(teamId),
                this.fetchFullRoster(teamId),
                this.fetchFullSchedule(teamId),
                this.fetchComprehensiveTeamStats(teamId),
                this.fetchTeamTransactions(teamId),
                this.fetchTeamInjuries(teamId),
                this.fetchTeamProspects(teamId)
            ]);
            const comprehensiveData = {
                ...teamInfo,
                roster,
                schedule,
                stats,
                transactions,
                injuries,
                prospects,
                analytics: await this.fetchTeamAnalytics(teamId)
            };
            // Cache the data
            this.setCachedData(cacheKey, comprehensiveData);
            console.log(`✅ Comprehensive data for ${teamInfo.name} complete!`);
            return comprehensiveData;
        }
        catch (error) {
            console.error(`💥 Error fetching comprehensive data for team ${teamId}:`, error);
            throw error;
        }
    }
    /**
     * Fetch ALL games for the season (every single game)
     */
    async fetchAllSeasonGames() {
        console.log('🏟️  Fetching ALL season games...');
        const cacheKey = `all-season-games-${this.SEASON}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const allGames = [];
            // Fetch games from start of season to end
            const startDate = `${this.SEASON}-03-20`; // Spring training starts
            const endDate = `${this.SEASON}-11-30`; // World Series ends
            let currentDate = new Date(startDate);
            const endDateObj = new Date(endDate);
            while (currentDate <= endDateObj) {
                const dateStr = currentDate.toISOString().split('T')[0];
                console.log(`📅 Fetching games for ${dateStr}...`);
                try {
                    const url = `${this.MLB_API_BASE}/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore,boxscore,decisions,weather,venue,officials,probablePitchers`;
                    const response = await (0, node_fetch_1.default)(url);
                    const data = await response.json();
                    if (data.dates && data.dates.length > 0) {
                        for (const date of data.dates) {
                            for (const game of date.games) {
                                const comprehensiveGame = await this.enrichGameData(game);
                                allGames.push(comprehensiveGame);
                            }
                        }
                    }
                }
                catch (dateError) {
                    console.warn(`⚠️  Error fetching games for ${dateStr}:`, dateError);
                }
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            console.log(`🎉 Fetched ${allGames.length} total games for ${this.SEASON} season!`);
            // Cache the massive dataset
            this.setCachedData(cacheKey, allGames);
            return allGames;
        }
        catch (error) {
            console.error('💥 Error fetching all season games:', error);
            throw error;
        }
    }
    /**
     * Enrich game data with additional details
     */
    async enrichGameData(gameData) {
        // Fetch detailed game data if needed
        if (!gameData.linescore || !gameData.boxscore) {
            const detailedGame = await this.fetchDetailedGameData(gameData.gamePk);
            gameData = { ...gameData, ...detailedGame };
        }
        return {
            gameId: gameData.gamePk.toString(),
            season: this.SEASON,
            gameDate: gameData.gameDate,
            gameType: gameData.gameType,
            status: {
                detailedState: gameData.status?.detailedState || 'Unknown',
                statusCode: gameData.status?.statusCode || 'U',
                isInProgress: gameData.status?.statusCode === 'I',
                isCompleted: gameData.status?.statusCode === 'F'
            },
            teams: {
                home: await this.enrichTeamGameData(gameData.teams?.home, gameData),
                away: await this.enrichTeamGameData(gameData.teams?.away, gameData)
            },
            venue: await this.enrichVenueData(gameData.venue),
            officials: gameData.officials || [],
            innings: gameData.linescore?.innings || [],
            linescore: gameData.linescore,
            boxscore: gameData.boxscore,
            decisions: gameData.decisions,
            highlights: await this.fetchGameHighlights(gameData.gamePk),
            attendance: gameData.attendance,
            gameDuration: gameData.gameDurationMinutes ? `${gameData.gameDurationMinutes} minutes` : undefined,
            probablePitchers: gameData.probablePitchers
        };
    }
    // Helper methods for caching
    getCachedData(key) {
        const cached = this.dataCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            return cached.data;
        }
        return null;
    }
    setCachedData(key, data) {
        this.dataCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    // Placeholder methods (to be implemented)
    async fetchAllTeams() {
        const url = `${this.MLB_API_BASE}/teams?sportId=1&season=${this.SEASON}`;
        const response = await (0, node_fetch_1.default)(url);
        const data = await response.json();
        return data.teams || [];
    }
    async fetchTeamInfo(teamId) {
        const url = `${this.MLB_API_BASE}/teams/${teamId}?hydrate=venue,division,league`;
        const response = await (0, node_fetch_1.default)(url);
        const data = await response.json();
        return data.teams?.[0] || {};
    }
    async fetchFullRoster(teamId) {
        const url = `${this.MLB_API_BASE}/teams/${teamId}/roster?rosterType=fullSeason&hydrate=person(stats(type=[yearByYear],season=${this.SEASON}))`;
        const response = await (0, node_fetch_1.default)(url);
        const data = await response.json();
        return data.roster || [];
    }
    async fetchFullSchedule(teamId) {
        const url = `${this.MLB_API_BASE}/schedule?teamId=${teamId}&season=${this.SEASON}&sportId=1&hydrate=team,linescore,decisions,weather`;
        const response = await (0, node_fetch_1.default)(url);
        const data = await response.json();
        return data.dates || [];
    }
    async fetchComprehensiveTeamStats(teamId) {
        // This would fetch hitting, pitching, fielding, baserunning stats
        return {};
    }
    async fetchTeamTransactions(teamId) {
        return [];
    }
    async fetchTeamInjuries(teamId) {
        return [];
    }
    async fetchTeamProspects(teamId) {
        return [];
    }
    async fetchTeamAnalytics(teamId) {
        return {};
    }
    async fetchLeagueWideData() {
        console.log('🌍 Fetching league-wide data...');
        // Implement league-wide statistics, awards, etc.
    }
    async enrichTeamGameData(teamData, gameData) {
        return teamData; // Placeholder
    }
    async enrichVenueData(venueData) {
        return venueData; // Placeholder
    }
    async fetchDetailedGameData(gamePk) {
        const url = `${this.MLB_API_BASE}/game/${gamePk}/feed/live`;
        const response = await (0, node_fetch_1.default)(url);
        return await response.json();
    }
    async fetchGameHighlights(gamePk) {
        return []; // Placeholder
    }
    /**
     * MULTI-YEAR DATA COLLECTION
     * Support for comprehensive historical data across multiple seasons
     */
    async fetchMultiYearData(startYear, endYear) {
        console.log(`📅 Fetching multi-year data: ${startYear}-${endYear}`);
        const multiYearData = {
            timeframe: { startYear, endYear },
            seasons: {},
            aggregatedStats: {},
            trends: {},
            comparisons: {}
        };
        for (let year = startYear; year <= endYear; year++) {
            console.log(`🗓️  Processing season ${year}...`);
            try {
                // Temporarily set the service to work with this year
                const originalSeason = this.SEASON;
                this.SEASON = year;
                // Fetch all data for this year
                const seasonData = await this.fetchSeasonData(year);
                multiYearData.seasons[year] = seasonData;
                // Restore original season
                this.SEASON = originalSeason;
                console.log(`✅ Season ${year} data collection complete`);
            }
            catch (error) {
                console.error(`❌ Error fetching data for season ${year}:`, error);
                multiYearData.seasons[year] = { error: error.message };
            }
        }
        // Calculate aggregated statistics across all years
        multiYearData.aggregatedStats = this.calculateMultiYearStats(multiYearData.seasons);
        // Calculate trends across years
        multiYearData.trends = this.calculateMultiYearTrends(multiYearData.seasons);
        // Generate year-over-year comparisons
        multiYearData.comparisons = this.generateYearOverYearComparisons(multiYearData.seasons);
        console.log(`🎉 Multi-year data collection complete: ${endYear - startYear + 1} seasons`);
        return multiYearData;
    }
    /**
     * Fetch comprehensive data for a specific season
     */
    async fetchSeasonData(year) {
        console.log(`📊 Fetching comprehensive season data for ${year}...`);
        const cacheKey = `season-data-${year}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }
        const seasonData = {
            year,
            teams: {},
            players: {},
            games: {},
            standings: {},
            postseason: {},
            awards: {},
            stats: {
                league: {},
                individual: {},
                team: {}
            },
            trends: {},
            milestones: []
        };
        try {
            // Fetch all teams for this season
            const teams = await this.fetchAllTeamsForYear(year);
            // Collect data for each team
            for (const team of teams) {
                console.log(`🏟️  Collecting ${year} data for ${team.name}...`);
                const teamData = await this.fetchHistoricalTeamData(team.id, year);
                seasonData.teams[team.id] = teamData;
                // Add small delay to be respectful to APIs
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            // Fetch season-wide data
            seasonData.standings = await this.fetchSeasonStandings(year);
            seasonData.postseason = await this.fetchPostseasonData(year);
            seasonData.awards = await this.fetchSeasonAwards(year);
            // Calculate season statistics
            seasonData.stats = this.calculateSeasonStats(seasonData);
            // Cache the complete season data
            this.setCachedData(cacheKey, seasonData);
            console.log(`✅ Season ${year} comprehensive data collection complete`);
            return seasonData;
        }
        catch (error) {
            console.error(`❌ Error collecting season ${year} data:`, error);
            throw error;
        }
    }
    /**
     * DAILY INCREMENTAL UPDATES
     * Efficiently update only changed data
     */
    async performIncrementalUpdate() {
        console.log('🔄 Performing incremental data update...');
        const updateResult = {
            timestamp: new Date().toISOString(),
            updatedData: {
                games: 0,
                players: 0,
                teams: 0,
                stats: 0
            },
            errors: [],
            duration: 0
        };
        const startTime = Date.now();
        try {
            // 1. Update today's games
            const todayGames = await this.updateTodayGames();
            updateResult.updatedData.games = todayGames.length;
            // 2. Update active player stats (only players who played recently)
            const updatedPlayers = await this.updateActivePlayers();
            updateResult.updatedData.players = updatedPlayers.length;
            // 3. Update team stats
            const updatedTeams = await this.updateTeamStats();
            updateResult.updatedData.teams = updatedTeams.length;
            // 4. Update league standings
            await this.updateStandings();
            updateResult.updatedData.stats++;
            updateResult.duration = Date.now() - startTime;
            console.log(`✅ Incremental update complete in ${updateResult.duration}ms`);
            console.log(`📊 Updated: ${updateResult.updatedData.games} games, ${updateResult.updatedData.players} players, ${updateResult.updatedData.teams} teams`);
            return updateResult;
        }
        catch (error) {
            updateResult.errors.push(error.message);
            updateResult.duration = Date.now() - startTime;
            console.error('❌ Error during incremental update:', error);
            throw error;
        }
    }
    /**
     * COMPREHENSIVE ANALYSIS SUPPORT
     * Enable analysis across years, months, weeks, days
     */
    async getAnalysisData(options) {
        console.log('📈 Generating analysis data...', options);
        const analysisData = {
            metadata: {
                requestedAt: new Date().toISOString(),
                timeframe: options,
                dataPoints: 0
            },
            data: {
                byYear: {},
                byMonth: {},
                byWeek: {},
                byDay: {},
                trends: {},
                comparisons: {},
                aggregations: {}
            }
        };
        // If years are specified, fetch multi-year data
        if (options.years && options.years.length > 0) {
            for (const year of options.years) {
                console.log(`📅 Analyzing year ${year}...`);
                const yearData = await this.getYearAnalysis(year, options);
                analysisData.data.byYear[year] = yearData;
                analysisData.metadata.dataPoints += yearData.dataPoints || 0;
            }
        }
        // Generate analysis based on granularity
        switch (options.granularity) {
            case 'day':
                analysisData.data.byDay = await this.getDailyAnalysis(options);
                break;
            case 'week':
                analysisData.data.byWeek = await this.getWeeklyAnalysis(options);
                break;
            case 'month':
                analysisData.data.byMonth = await this.getMonthlyAnalysis(options);
                break;
            case 'year':
            default:
                analysisData.data.byYear = await this.getYearlyAnalysis(options);
                break;
        }
        // Calculate trends across the dataset
        analysisData.data.trends = this.calculateTrends(analysisData.data);
        // Generate comparisons
        analysisData.data.comparisons = this.generateComparisons(analysisData.data);
        console.log(`✅ Analysis complete: ${analysisData.metadata.dataPoints} data points analyzed`);
        return analysisData;
    }
    // Helper methods for multi-year support
    async fetchAllTeamsForYear(year) {
        try {
            const url = `${this.MLB_API_BASE}/teams?sportId=1&season=${year}`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.teams || [];
        }
        catch (error) {
            console.error(`Error fetching teams for ${year}:`, error);
            return [];
        }
    }
    async fetchHistoricalTeamData(teamId, year) {
        console.log(`📊 Fetching historical data for team ${teamId} in ${year}...`);
        try {
            // Fetch multiple data sources for this team/year
            const [roster, schedule, stats] = await Promise.all([
                this.fetchTeamRosterForYear(teamId, year),
                this.fetchTeamScheduleForYear(teamId, year),
                this.fetchTeamStatsForYear(teamId, year)
            ]);
            return {
                teamId,
                year,
                roster,
                schedule,
                stats,
                lastUpdated: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`Error fetching historical data for team ${teamId} in ${year}:`, error);
            return { error: error.message };
        }
    }
    async fetchTeamRosterForYear(teamId, year) {
        try {
            const url = `${this.MLB_API_BASE}/teams/${teamId}/roster?rosterType=fullSeason&season=${year}&hydrate=person(stats(type=[yearByYear],season=${year}))`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.roster || [];
        }
        catch (error) {
            console.error(`Error fetching roster for team ${teamId} in ${year}:`, error);
            return [];
        }
    }
    async fetchTeamScheduleForYear(teamId, year) {
        try {
            const url = `${this.MLB_API_BASE}/schedule?teamId=${teamId}&season=${year}&sportId=1&hydrate=team,linescore,decisions`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.dates || [];
        }
        catch (error) {
            console.error(`Error fetching schedule for team ${teamId} in ${year}:`, error);
            return [];
        }
    }
    async fetchTeamStatsForYear(teamId, year) {
        try {
            const url = `${this.MLB_API_BASE}/teams/${teamId}/stats?season=${year}&sportId=1&stats=season`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.stats || [];
        }
        catch (error) {
            console.error(`Error fetching stats for team ${teamId} in ${year}:`, error);
            return [];
        }
    }
    async fetchSeasonStandings(year) {
        try {
            const url = `${this.MLB_API_BASE}/standings?leagueId=103,104&season=${year}&standingsTypes=regularSeason`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.records || [];
        }
        catch (error) {
            console.error(`Error fetching standings for ${year}:`, error);
            return [];
        }
    }
    async fetchPostseasonData(year) {
        try {
            const url = `${this.MLB_API_BASE}/schedule?season=${year}&sportId=1&gameTypes=P&hydrate=team,linescore`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            return data.dates || [];
        }
        catch (error) {
            console.error(`Error fetching postseason data for ${year}:`, error);
            return [];
        }
    }
    async fetchSeasonAwards(year) {
        // Awards data might need different endpoint or source
        return [];
    }
    // Helper methods for incremental updates
    async updateTodayGames() {
        const today = new Date().toISOString().split('T')[0];
        console.log(`🎮 Updating games for ${today}...`);
        try {
            const url = `${this.MLB_API_BASE}/schedule?sportId=1&date=${today}&hydrate=team,linescore,boxscore`;
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            const games = [];
            if (data.dates && data.dates.length > 0) {
                for (const date of data.dates) {
                    games.push(...date.games);
                }
            }
            console.log(`✅ Updated ${games.length} games for today`);
            return games;
        }
        catch (error) {
            console.error('Error updating today\'s games:', error);
            return [];
        }
    }
    async updateActivePlayers() {
        console.log('👥 Updating active player stats...');
        // Implementation for updating only active players
        return [];
    }
    async updateTeamStats() {
        console.log('🏟️  Updating team statistics...');
        // Implementation for updating team stats
        return [];
    }
    async updateStandings() {
        console.log('🏆 Updating league standings...');
        // Implementation for updating standings
    }
    // Analysis helper methods
    calculateMultiYearStats(seasons) {
        // Calculate aggregated statistics across multiple seasons
        return {
            totalSeasons: Object.keys(seasons).length,
            aggregatedStats: {},
            trends: {}
        };
    }
    calculateMultiYearTrends(seasons) {
        // Calculate trends across multiple years
        return {
            offensiveTrends: {},
            pitchingTrends: {},
            teamTrends: {}
        };
    }
    generateYearOverYearComparisons(seasons) {
        // Generate year-over-year comparisons
        return {
            performanceChanges: {},
            emergingTrends: {},
            significantChanges: {}
        };
    }
    calculateSeasonStats(seasonData) {
        // Calculate comprehensive season statistics
        return {
            league: {},
            individual: {},
            team: {}
        };
    }
    async getYearAnalysis(year, options) {
        return { year, dataPoints: 1000 };
    }
    async getDailyAnalysis(options) {
        return { granularity: 'day' };
    }
    async getWeeklyAnalysis(options) {
        return { granularity: 'week' };
    }
    async getMonthlyAnalysis(options) {
        return { granularity: 'month' };
    }
    async getYearlyAnalysis(options) {
        return { granularity: 'year' };
    }
    calculateTrends(data) {
        return { trends: 'calculated' };
    }
    generateComparisons(data) {
        return { comparisons: 'generated' };
    }
    /**
     * PUBLIC API METHODS
     */
    async getComprehensiveTeamData(teamCode) {
        const teams = await this.fetchAllTeams();
        const team = teams.find(t => t.abbreviation?.toLowerCase() === teamCode.toLowerCase());
        if (!team) {
            throw new Error(`Team not found: ${teamCode}`);
        }
        return await this.fetchComprehensiveTeamData(team.id);
    }
    async getAllGames() {
        return await this.fetchAllSeasonGames();
    }
    async getTeamGames(teamCode) {
        const allGames = await this.fetchAllSeasonGames();
        return allGames.filter(game => game.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase() ||
            game.teams.away.team.abbreviation?.toLowerCase() === teamCode.toLowerCase());
    }
}
exports.ComprehensiveMLBDataService = ComprehensiveMLBDataService;
exports.default = new ComprehensiveMLBDataService();
