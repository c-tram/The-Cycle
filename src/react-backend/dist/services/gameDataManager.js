"use strict";
/**
 * Game Data Manager - Handles storage and retrieval of box score data
 *
 * This service manages:
 * 1. Storing box score data in structured format
 * 2. Querying player performance over time
 * 3. Building matchup matrices
 * 4. Calculating performance trends
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataService_1 = require("./dataService");
class GameDataManager {
    constructor() {
        this.DATA_DIR = path_1.default.join(__dirname, '../../data/games');
        this.PLAYER_DATA_DIR = path_1.default.join(this.DATA_DIR, 'players');
        this.MATCHUP_DATA_DIR = path_1.default.join(this.DATA_DIR, 'matchups');
        this.TEAM_DATA_DIR = path_1.default.join(this.DATA_DIR, 'teams');
        this.ensureDirectoriesExist();
        this.gameData = this.loadGameData();
    }
    /**
     * Ensure all necessary directories exist
     */
    ensureDirectoriesExist() {
        const dirs = [this.DATA_DIR, this.PLAYER_DATA_DIR, this.MATCHUP_DATA_DIR, this.TEAM_DATA_DIR];
        dirs.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            }
        });
    }
    /**
     * Load game data from storage
     */
    loadGameData() {
        const dataPath = path_1.default.join(this.DATA_DIR, 'gameData.json');
        if (fs_1.default.existsSync(dataPath)) {
            try {
                const rawData = fs_1.default.readFileSync(dataPath, 'utf8');
                return JSON.parse(rawData);
            }
            catch (error) {
                console.error('Error loading game data:', error);
            }
        }
        return {
            games: {},
            playerGames: {},
            teamGames: {},
            dateGames: {},
            matchups: {},
            lastUpdated: new Date().toISOString()
        };
    }
    /**
     * Save game data to storage
     */
    saveGameData() {
        const dataPath = path_1.default.join(this.DATA_DIR, 'gameData.json');
        this.gameData.lastUpdated = new Date().toISOString();
        try {
            fs_1.default.writeFileSync(dataPath, JSON.stringify(this.gameData, null, 2));
            console.log('Game data saved successfully');
        }
        catch (error) {
            console.error('Error saving game data:', error);
        }
    }
    /**
     * Store a complete box score
     */
    async storeBoxScore(boxScore) {
        const gameId = boxScore.gameInfo.gameId;
        // Store the complete box score
        this.gameData.games[gameId] = boxScore;
        // Index by date
        const date = boxScore.gameInfo.date;
        if (!this.gameData.dateGames[date]) {
            this.gameData.dateGames[date] = [];
        }
        // Check if game already exists in date index
        const existingGameIndex = this.gameData.dateGames[date].findIndex(g => g.gameId === gameId);
        if (existingGameIndex === -1) {
            this.gameData.dateGames[date].push(boxScore.gameInfo);
        }
        else {
            this.gameData.dateGames[date][existingGameIndex] = boxScore.gameInfo;
        }
        // Index by team
        const homeTeam = boxScore.gameInfo.homeTeam;
        const awayTeam = boxScore.gameInfo.awayTeam;
        [homeTeam, awayTeam].forEach(team => {
            if (!this.gameData.teamGames[team]) {
                this.gameData.teamGames[team] = [];
            }
            const existingTeamGameIndex = this.gameData.teamGames[team].findIndex(g => g.gameId === gameId);
            if (existingTeamGameIndex === -1) {
                this.gameData.teamGames[team].push(boxScore.gameInfo);
            }
        });
        // Store individual player game stats
        const allPlayerStats = [...boxScore.homeTeamStats, ...boxScore.awayTeamStats];
        for (const playerStats of allPlayerStats) {
            if (!this.gameData.playerGames[playerStats.playerId]) {
                this.gameData.playerGames[playerStats.playerId] = [];
            }
            // Check if this game's stats already exist for this player
            const existingStatIndex = this.gameData.playerGames[playerStats.playerId]
                .findIndex(g => g.gameId === gameId);
            if (existingStatIndex === -1) {
                this.gameData.playerGames[playerStats.playerId].push(playerStats);
            }
            else {
                this.gameData.playerGames[playerStats.playerId][existingStatIndex] = playerStats;
            }
            // Sort player games by date (most recent first)
            this.gameData.playerGames[playerStats.playerId].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        // Save to disk
        this.saveGameData();
        // Also cache in Redis for quick access
        await (0, dataService_1.cacheData)(`boxscore:${gameId}`, boxScore, 10080); // 7 days
        console.log(`Stored box score for game ${gameId} (${homeTeam} vs ${awayTeam})`);
    }
    /**
     * Get player's game log for a specific timeframe
     */
    getPlayerGameLog(playerId, timeframe) {
        const playerGames = this.gameData.playerGames[playerId] || [];
        if (!timeframe) {
            return playerGames;
        }
        const now = new Date();
        let cutoffDate;
        switch (timeframe) {
            case 'last7':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last14':
                cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case 'last30':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'season':
                cutoffDate = new Date(now.getFullYear(), 2, 1); // March 1st
                break;
            default:
                return playerGames;
        }
        return playerGames.filter(game => new Date(game.date) >= cutoffDate);
    }
    /**
     * Get player performance vs specific team
     */
    getPlayerVsTeam(playerId, opponentTeam) {
        const playerGames = this.gameData.playerGames[playerId] || [];
        return playerGames.filter(game => game.opponent === opponentTeam);
    }
    /**
     * Get head-to-head matchup history
     */
    getBatterVsPitcherHistory(batterId, pitcherId) {
        // This would require cross-referencing games where both players participated
        // and the batter faced the pitcher - more complex logic needed
        const batterGames = this.gameData.playerGames[batterId] || [];
        const pitcherGames = this.gameData.playerGames[pitcherId] || [];
        // Find games where both players participated
        const commonGameIds = new Set(batterGames.map(g => g.gameId).filter(gameId => pitcherGames.some(pg => pg.gameId === gameId)));
        return batterGames.filter(game => commonGameIds.has(game.gameId));
    }
    /**
     * Calculate player's rolling averages
     */
    calculateRollingAverages(playerId, window = 10) {
        const playerGames = this.gameData.playerGames[playerId] || [];
        const battingGames = playerGames.filter(g => g.battingStats);
        if (battingGames.length < window) {
            return [];
        }
        const rollingAverages = [];
        for (let i = window - 1; i < battingGames.length; i++) {
            const windowGames = battingGames.slice(i - window + 1, i + 1);
            const totals = windowGames.reduce((acc, game) => {
                const stats = game.battingStats;
                return {
                    atBats: acc.atBats + stats.atBats,
                    hits: acc.hits + stats.hits,
                    homeRuns: acc.homeRuns + stats.homeRuns,
                    rbi: acc.rbi + stats.rbi,
                    runs: acc.runs + stats.runs,
                    walks: acc.walks + stats.walks,
                    strikeouts: acc.strikeouts + stats.strikeouts
                };
            }, { atBats: 0, hits: 0, homeRuns: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0 });
            rollingAverages.push({
                endDate: windowGames[window - 1].date,
                avg: totals.atBats > 0 ? totals.hits / totals.atBats : 0,
                homeRunRate: totals.atBats > 0 ? totals.homeRuns / totals.atBats : 0,
                strikeoutRate: totals.atBats > 0 ? totals.strikeouts / totals.atBats : 0,
                walkRate: totals.atBats > 0 ? totals.walks / totals.atBats : 0,
                rbiPerGame: totals.rbi / window,
                runsPerGame: totals.runs / window
            });
        }
        return rollingAverages;
    }
    /**
     * Get team's recent games
     */
    getTeamGames(teamCode, timeframe) {
        const teamGames = this.gameData.teamGames[teamCode] || [];
        if (!timeframe) {
            return teamGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const now = new Date();
        let cutoffDate;
        switch (timeframe) {
            case 'last7':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last14':
                cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case 'last30':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return teamGames;
        }
        return teamGames
            .filter(game => new Date(game.date) >= cutoffDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    /**
     * Get games for a specific date range
     */
    getGamesByDateRange(startDate, endDate) {
        const games = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        Object.keys(this.gameData.dateGames).forEach(date => {
            const gameDate = new Date(date);
            if (gameDate >= start && gameDate <= end) {
                games.push(...this.gameData.dateGames[date]);
            }
        });
        return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    /**
     * Get performance trends for a player
     */
    getPlayerTrends(playerId, timeframe = 'last30') {
        const games = this.getPlayerGameLog(playerId, timeframe);
        const battingGames = games.filter(g => g.battingStats);
        const pitchingGames = games.filter(g => g.pitchingStats);
        let battingTrends = null;
        let pitchingTrends = null;
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
                    strikeouts: acc.strikeouts + stats.strikeouts,
                    doubles: acc.doubles + stats.doubles,
                    triples: acc.triples + stats.triples
                };
            }, { games: 0, atBats: 0, hits: 0, homeRuns: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, doubles: 0, triples: 0 });
            const totalBases = totals.hits + totals.doubles + (totals.triples * 2) + (totals.homeRuns * 3);
            const plateAppearances = totals.atBats + totals.walks;
            battingTrends = {
                games: totals.games,
                avg: totals.atBats > 0 ? totals.hits / totals.atBats : 0,
                obp: plateAppearances > 0 ? (totals.hits + totals.walks) / plateAppearances : 0,
                slg: totals.atBats > 0 ? totalBases / totals.atBats : 0,
                ops: 0, // Will be calculated below
                homeRuns: totals.homeRuns,
                rbi: totals.rbi,
                runs: totals.runs,
                strikeoutRate: totals.atBats > 0 ? totals.strikeouts / totals.atBats : 0,
                walkRate: totals.atBats > 0 ? totals.walks / totals.atBats : 0
            };
            battingTrends.ops = battingTrends.obp + battingTrends.slg;
        }
        if (pitchingGames.length > 0) {
            const totals = pitchingGames.reduce((acc, game) => {
                const stats = game.pitchingStats;
                return {
                    games: acc.games + 1,
                    inningsPitched: acc.inningsPitched + stats.inningsPitched,
                    hits: acc.hits + stats.hits,
                    runs: acc.runs + stats.runs,
                    earnedRuns: acc.earnedRuns + stats.earnedRuns,
                    walks: acc.walks + stats.walks,
                    strikeouts: acc.strikeouts + stats.strikeouts,
                    homeRuns: acc.homeRuns + stats.homeRuns
                };
            }, { games: 0, inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0, homeRuns: 0 });
            pitchingTrends = {
                games: totals.games,
                era: totals.inningsPitched > 0 ? (totals.earnedRuns * 9) / totals.inningsPitched : 0,
                whip: totals.inningsPitched > 0 ? (totals.hits + totals.walks) / totals.inningsPitched : 0,
                strikeoutRate: totals.inningsPitched > 0 ? (totals.strikeouts * 9) / totals.inningsPitched : 0,
                walkRate: totals.inningsPitched > 0 ? (totals.walks * 9) / totals.inningsPitched : 0,
                homeRunRate: totals.inningsPitched > 0 ? (totals.homeRuns * 9) / totals.inningsPitched : 0
            };
        }
        return {
            playerId,
            timeframe,
            battingTrends,
            pitchingTrends
        };
    }
    /**
     * Get comprehensive player stats summary
     */
    getPlayerSummary(playerId) {
        const playerGames = this.gameData.playerGames[playerId] || [];
        if (playerGames.length === 0) {
            return null;
        }
        const playerName = playerGames[0].playerName;
        const team = playerGames[0].team;
        return {
            playerId,
            playerName,
            team,
            totalGames: playerGames.length,
            trends: {
                last7: this.getPlayerTrends(playerId, 'last7'),
                last14: this.getPlayerTrends(playerId, 'last14'),
                last30: this.getPlayerTrends(playerId, 'last30'),
                season: this.getPlayerTrends(playerId, 'season')
            },
            rollingAverages: this.calculateRollingAverages(playerId),
            recentGames: playerGames.slice(0, 10) // Last 10 games
        };
    }
    /**
     * Get data freshness info
     */
    getDataInfo() {
        const totalGames = Object.keys(this.gameData.games).length;
        const totalPlayers = Object.keys(this.gameData.playerGames).length;
        const totalTeams = Object.keys(this.gameData.teamGames).length;
        // Find most recent game date
        let mostRecentDate = '';
        Object.values(this.gameData.games).forEach(game => {
            if (game.gameInfo.date > mostRecentDate) {
                mostRecentDate = game.gameInfo.date;
            }
        });
        return {
            totalGames,
            totalPlayers,
            totalTeams,
            mostRecentGameDate: mostRecentDate,
            lastUpdated: this.gameData.lastUpdated,
            dataDirectories: {
                main: this.DATA_DIR,
                players: this.PLAYER_DATA_DIR,
                matchups: this.MATCHUP_DATA_DIR,
                teams: this.TEAM_DATA_DIR
            }
        };
    }
    /**
     * Generate matchup matrix between batters and pitchers
     * This creates a matrix of matchup data between batters and pitchers based on historical data
     *
     * @param teamCode - Optional filter by team code
     * @param opponentTeam - Optional filter by opponent team
     * @returns A matrix of batter vs pitcher matchup data
     */
    getMatchupMatrix(teamCode, opponentTeam) {
        const matchupMatrix = {};
        const games = this.getAllGames();
        // Filter games if team or opponent specified
        const filteredGames = games.filter(game => {
            if (teamCode && opponentTeam) {
                return ((game.gameInfo.homeTeam === teamCode && game.gameInfo.awayTeam === opponentTeam) ||
                    (game.gameInfo.awayTeam === teamCode && game.gameInfo.homeTeam === opponentTeam));
            }
            else if (teamCode) {
                return game.gameInfo.homeTeam === teamCode || game.gameInfo.awayTeam === teamCode;
            }
            else if (opponentTeam) {
                return game.gameInfo.homeTeam === opponentTeam || game.gameInfo.awayTeam === opponentTeam;
            }
            return true;
        });
        // Process each game to extract batter vs pitcher matchups
        filteredGames.forEach(game => {
            const homeBatters = game.homeTeamStats.filter(player => player.battingStats);
            const awayBatters = game.awayTeamStats.filter(player => player.battingStats);
            const homePitchers = game.homeTeamStats.filter(player => player.pitchingStats);
            const awayPitchers = game.awayTeamStats.filter(player => player.pitchingStats);
            // Process home batters vs away pitchers
            this.processMatchups(homeBatters, awayPitchers, game.gameInfo.date, matchupMatrix);
            // Process away batters vs home pitchers
            this.processMatchups(awayBatters, homePitchers, game.gameInfo.date, matchupMatrix);
        });
        return matchupMatrix;
    }
    /**
     * Process matchups between batters and pitchers
     *
     * @param batters - List of batters
     * @param pitchers - List of pitchers
     * @param gameDate - Date of the game
     * @param matrix - Matchup matrix to be updated
     */
    processMatchups(batters, pitchers, gameDate, matrix) {
        // For each game, we need to infer the matchups between batters and pitchers
        // This is an approximation since we don't have exact at-bat level data
        batters.forEach(batter => {
            // Skip batters without batting stats
            const batterStats = batter.battingStats;
            if (!batterStats)
                return;
            pitchers.forEach(pitcher => {
                // Skip pitchers without pitching stats
                const pitcherStats = pitcher.pitchingStats;
                if (!pitcherStats)
                    return;
                // We need to estimate batters faced since it's not in the pitchingStats interface
                // Use a calculation of total outs + hits + walks as an approximation
                const estimatedBattersFaced = Math.round(pitcherStats.inningsPitched * 3) +
                    pitcherStats.hits +
                    pitcherStats.walks;
                // Skip if the pitcher didn't face any batters
                if (estimatedBattersFaced === 0)
                    return;
                const matchupKey = `${batter.playerId}-${pitcher.playerId}`;
                // Initialize if this matchup doesn't exist yet
                if (!matrix[matchupKey]) {
                    matrix[matchupKey] = {
                        batter: batter.playerId,
                        pitcher: pitcher.playerId,
                        matchupHistory: {
                            atBats: 0,
                            hits: 0,
                            homeRuns: 0,
                            strikeouts: 0,
                            walks: 0,
                            avg: 0,
                            ops: 0,
                            lastFaced: gameDate
                        }
                    };
                }
                // Update last faced date if this game is more recent
                if (gameDate > matrix[matchupKey].matchupHistory.lastFaced) {
                    matrix[matchupKey].matchupHistory.lastFaced = gameDate;
                }
                // Estimate number of at-bats this batter had against this pitcher
                // This is an approximation based on the proportion of the pitcher's total batters faced
                const totalAtBats = batterStats.atBats;
                const pitcherBattersFaced = estimatedBattersFaced;
                const totalTeamAtBats = batters.reduce((sum, b) => sum + (b.battingStats?.atBats || 0), 0);
                if (totalTeamAtBats === 0 || pitcherBattersFaced === 0)
                    return;
                // Estimate the proportion of this batter's at-bats against this pitcher
                const estimatedAtBats = Math.round((totalAtBats / totalTeamAtBats) * pitcherBattersFaced);
                if (estimatedAtBats === 0)
                    return;
                const matchup = matrix[matchupKey].matchupHistory;
                // Update matchup history with estimated stats
                const batAvg = batterStats.avg || 0;
                const estimatedHits = Math.round(batAvg * estimatedAtBats);
                // Update matchup statistics
                matchup.atBats += estimatedAtBats;
                matchup.hits += estimatedHits;
                // Estimate other stats proportionally
                const hrPct = totalAtBats > 0 ? (batterStats.homeRuns || 0) / totalAtBats : 0;
                const soPct = totalAtBats > 0 ? (batterStats.strikeouts || 0) / totalAtBats : 0;
                const bbPct = totalAtBats > 0 ? (batterStats.walks || 0) / totalAtBats : 0;
                matchup.homeRuns += Math.round(hrPct * estimatedAtBats);
                matchup.strikeouts += Math.round(soPct * estimatedAtBats);
                matchup.walks += Math.round(bbPct * estimatedAtBats);
                // Recalculate batting average
                matchup.avg = matchup.atBats > 0 ? matchup.hits / matchup.atBats : 0;
                // Estimate OPS (simplified)
                const slg = totalAtBats > 0 ?
                    ((batterStats.hits || 0) + (batterStats.doubles || 0) +
                        2 * (batterStats.triples || 0) + 3 * (batterStats.homeRuns || 0)) / totalAtBats : 0;
                const obp = (totalAtBats + (batterStats.walks || 0)) > 0 ?
                    ((batterStats.hits || 0) + (batterStats.walks || 0)) /
                        (totalAtBats + (batterStats.walks || 0)) : 0;
                matchup.ops = obp + slg;
            });
        });
    }
    /**
     * Get all games from storage
     */
    getAllGames() {
        return Object.values(this.gameData.games);
    }
    /**
     * Generate comprehensive player trend analysis over multiple timeframes
     * This includes rolling averages, comparison to season stats, and recent performance indicators
     *
     * @param playerId - The player ID to analyze
     * @returns PlayerTrend object with detailed trend analysis
     */
    getPlayerTrendAnalysis(playerId) {
        // Get player data over different timeframes for comparison
        const allData = this.getPlayerGameLog(playerId);
        const last7Data = this.getPlayerGameLog(playerId, 'last7');
        const last14Data = this.getPlayerGameLog(playerId, 'last14');
        const last30Data = this.getPlayerGameLog(playerId, 'last30');
        const seasonData = this.getPlayerGameLog(playerId, 'season');
        // Set team if player data exists
        const team = allData.length > 0 ? allData[0].team : '';
        // Calculate trending values (is player trending up or down)
        const trend = {
            playerId,
            playerName: allData.length > 0 ? allData[0].playerName : '',
            team,
            recentForm: {
                last7: this.getPlayerTrends(playerId, 'last7'),
                last14: this.getPlayerTrends(playerId, 'last14'),
                last30: this.getPlayerTrends(playerId, 'last30'),
                season: this.getPlayerTrends(playerId, 'season')
            },
            rollingAverages: this.calculateRollingAverages(playerId, 10),
            trends: {
                batting: this.calculateBattingTrends(last7Data, last30Data),
                pitching: this.calculatePitchingTrends(last7Data, last30Data)
            },
            hotZones: this.calculateHotZones(playerId),
            lastUpdated: new Date().toISOString()
        };
        return trend;
    }
    /**
     * Calculate if a player's batting performance is trending up or down
     */
    calculateBattingTrends(recentGames, olderGames) {
        const recentBattingGames = recentGames.filter(g => g.battingStats);
        const olderBattingGames = olderGames.filter(g => g.battingStats);
        if (recentBattingGames.length === 0 || olderBattingGames.length === 0) {
            return null;
        }
        // Calculate recent average stats
        const recentStats = recentBattingGames.reduce((acc, game) => {
            const stats = game.battingStats;
            acc.games++;
            acc.atBats += stats.atBats;
            acc.hits += stats.hits;
            acc.homeRuns += stats.homeRuns || 0;
            acc.walks += stats.walks || 0;
            acc.strikeouts += stats.strikeouts || 0;
            return acc;
        }, { games: 0, atBats: 0, hits: 0, homeRuns: 0, walks: 0, strikeouts: 0 });
        // Calculate older average stats
        const olderStats = olderBattingGames.reduce((acc, game) => {
            const stats = game.battingStats;
            acc.games++;
            acc.atBats += stats.atBats;
            acc.hits += stats.hits;
            acc.homeRuns += stats.homeRuns || 0;
            acc.walks += stats.walks || 0;
            acc.strikeouts += stats.strikeouts || 0;
            return acc;
        }, { games: 0, atBats: 0, hits: 0, homeRuns: 0, walks: 0, strikeouts: 0 });
        // Calculate averages and determine trends
        const recentAvg = recentStats.atBats > 0 ? recentStats.hits / recentStats.atBats : 0;
        const olderAvg = olderStats.atBats > 0 ? olderStats.hits / olderStats.atBats : 0;
        const recentHrRate = recentStats.atBats > 0 ? recentStats.homeRuns / recentStats.atBats : 0;
        const olderHrRate = olderStats.atBats > 0 ? olderStats.homeRuns / olderStats.atBats : 0;
        const recentKRate = recentStats.atBats > 0 ? recentStats.strikeouts / recentStats.atBats : 0;
        const olderKRate = olderStats.atBats > 0 ? olderStats.strikeouts / olderStats.atBats : 0;
        return {
            avg: {
                trend: this.calculateTrendDirection(recentAvg, olderAvg),
                recent: recentAvg,
                overall: olderAvg
            },
            homeRuns: {
                trend: this.calculateTrendDirection(recentHrRate, olderHrRate),
                recent: recentHrRate,
                overall: olderHrRate
            },
            strikeoutRate: {
                trend: this.calculateTrendDirection(olderKRate, recentKRate), // Reversed: lower K-rate is better
                recent: recentKRate,
                overall: olderKRate
            }
        };
    }
    /**
     * Calculate if a player's pitching performance is trending up or down
     */
    calculatePitchingTrends(recentGames, olderGames) {
        const recentPitchingGames = recentGames.filter(g => g.pitchingStats);
        const olderPitchingGames = olderGames.filter(g => g.pitchingStats);
        if (recentPitchingGames.length === 0 || olderPitchingGames.length === 0) {
            return null;
        }
        // Calculate recent average stats
        const recentStats = recentPitchingGames.reduce((acc, game) => {
            const stats = game.pitchingStats;
            acc.games++;
            acc.inningsPitched += stats.inningsPitched;
            acc.earnedRuns += stats.earnedRuns;
            acc.strikeouts += stats.strikeouts;
            acc.walks += stats.walks;
            acc.hits += stats.hits;
            return acc;
        }, { games: 0, inningsPitched: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hits: 0 });
        // Calculate older average stats
        const olderStats = olderPitchingGames.reduce((acc, game) => {
            const stats = game.pitchingStats;
            acc.games++;
            acc.inningsPitched += stats.inningsPitched;
            acc.earnedRuns += stats.earnedRuns;
            acc.strikeouts += stats.strikeouts;
            acc.walks += stats.walks;
            acc.hits += stats.hits;
            return acc;
        }, { games: 0, inningsPitched: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hits: 0 });
        // Calculate metrics and determine trends
        const recentERA = recentStats.inningsPitched > 0 ? (recentStats.earnedRuns * 9) / recentStats.inningsPitched : 0;
        const olderERA = olderStats.inningsPitched > 0 ? (olderStats.earnedRuns * 9) / olderStats.inningsPitched : 0;
        const recentWHIP = recentStats.inningsPitched > 0 ? (recentStats.hits + recentStats.walks) / recentStats.inningsPitched : 0;
        const olderWHIP = olderStats.inningsPitched > 0 ? (olderStats.hits + olderStats.walks) / olderStats.inningsPitched : 0;
        const recentK9 = recentStats.inningsPitched > 0 ? (recentStats.strikeouts * 9) / recentStats.inningsPitched : 0;
        const olderK9 = olderStats.inningsPitched > 0 ? (olderStats.strikeouts * 9) / olderStats.inningsPitched : 0;
        return {
            era: {
                trend: this.calculateTrendDirection(olderERA, recentERA), // Reversed: lower ERA is better
                recent: recentERA,
                overall: olderERA
            },
            whip: {
                trend: this.calculateTrendDirection(olderWHIP, recentWHIP), // Reversed: lower WHIP is better
                recent: recentWHIP,
                overall: olderWHIP
            },
            strikeoutsPerNine: {
                trend: this.calculateTrendDirection(recentK9, olderK9),
                recent: recentK9,
                overall: olderK9
            }
        };
    }
    /**
     * Calculate trend direction based on two values
     * Returns: 'up' | 'down' | 'stable'
     */
    calculateTrendDirection(recent, overall) {
        const difference = recent - overall;
        const percentChange = overall !== 0 ? (difference / overall) * 100 : 0;
        if (Math.abs(percentChange) < 5) {
            return 'stable';
        }
        return percentChange > 0 ? 'up' : 'down';
    }
    /**
     * Calculate player's hot zones (parts of strike zone where player performs best)
     * This is a placeholder - in a real implementation, this would use pitch-by-pitch data
     */
    calculateHotZones(playerId) {
        // Placeholder for hot zone calculation
        // In a real implementation, this would analyze detailed pitch data
        return {
            zones: [
                [0.280, 0.310, 0.265],
                [0.305, 0.345, 0.290],
                [0.275, 0.295, 0.260]
            ],
            strongestZone: 'middle-inside',
            weakestZone: 'low-outside'
        };
    }
    /**
     * Get comprehensive player vs opponent analysis
     * This combines player trends, matchups, and team performance data
     *
     * @param playerId Player to analyze
     * @param opponentTeam Opposing team
     * @returns Analysis object with player trends, matchups, and team data
     */
    getPlayerVsOpponentAnalysis(playerId, opponentTeam) {
        // Get basic player info
        const playerGames = this.gameData.playerGames[playerId] || [];
        if (playerGames.length === 0) {
            return { error: 'Player not found' };
        }
        const playerName = playerGames[0].playerName;
        const playerTeam = playerGames[0].team;
        // Get matchups against pitchers on the opposing team
        const allMatchups = this.getMatchupMatrix(playerTeam, opponentTeam);
        // Filter matchups to only those involving this player
        const playerMatchups = Object.values(allMatchups).filter(matchup => matchup.batter === playerId || matchup.pitcher === playerId);
        // Get historical performance vs this team
        const vsTeamGames = this.getPlayerVsTeam(playerId, opponentTeam);
        // Get overall player trend analysis
        const trendAnalysis = this.getPlayerTrendAnalysis(playerId);
        // Calculate team vs team stats
        const teamVsTeam = this.calculateTeamVsTeam(playerTeam, opponentTeam);
        // Determine if player has a history of success against this opponent
        const vsTeamSuccess = this.calculateSuccessMetric(vsTeamGames, playerId, opponentTeam);
        return {
            player: {
                id: playerId,
                name: playerName,
                team: playerTeam,
            },
            opponent: {
                team: opponentTeam,
            },
            vsTeam: {
                games: vsTeamGames.length,
                battingStats: this.aggregateBattingStats(vsTeamGames),
                pitchingStats: this.aggregatePitchingStats(vsTeamGames),
                successMetric: vsTeamSuccess
            },
            matchups: playerMatchups,
            trends: trendAnalysis,
            teamVsTeam,
            lastUpdated: new Date().toISOString()
        };
    }
    /**
     * Calculate team vs team performance metrics
     */
    calculateTeamVsTeam(team1, team2) {
        // Find all games between these teams
        const games = Object.values(this.gameData.games).filter(game => (game.gameInfo.homeTeam === team1 && game.gameInfo.awayTeam === team2) ||
            (game.gameInfo.homeTeam === team2 && game.gameInfo.awayTeam === team1));
        if (games.length === 0) {
            return { games: 0 };
        }
        // Calculate win/loss record
        const team1Wins = games.filter(game => (game.gameInfo.homeTeam === team1 && game.gameInfo.homeScore > game.gameInfo.awayScore) ||
            (game.gameInfo.awayTeam === team1 && game.gameInfo.awayScore > game.gameInfo.homeScore)).length;
        const team2Wins = games.filter(game => (game.gameInfo.homeTeam === team2 && game.gameInfo.homeScore > game.gameInfo.awayScore) ||
            (game.gameInfo.awayTeam === team2 && game.gameInfo.awayScore > game.gameInfo.homeScore)).length;
        // Calculate avg runs scored
        const team1RunsScored = games.reduce((sum, game) => {
            if (game.gameInfo.homeTeam === team1) {
                return sum + game.gameInfo.homeScore;
            }
            else {
                return sum + game.gameInfo.awayScore;
            }
        }, 0);
        const team2RunsScored = games.reduce((sum, game) => {
            if (game.gameInfo.homeTeam === team2) {
                return sum + game.gameInfo.homeScore;
            }
            else {
                return sum + game.gameInfo.awayScore;
            }
        }, 0);
        return {
            games: games.length,
            record: {
                [team1]: team1Wins,
                [team2]: team2Wins
            },
            runsPerGame: {
                [team1]: team1RunsScored / games.length,
                [team2]: team2RunsScored / games.length
            },
            lastGame: games.sort((a, b) => new Date(b.gameInfo.date).getTime() - new Date(a.gameInfo.date).getTime())[0].gameInfo
        };
    }
    /**
     * Calculate a success metric for a player vs a team
     */
    calculateSuccessMetric(games, playerId, opponentTeam) {
        if (games.length === 0)
            return 0;
        const battingGames = games.filter(g => g.battingStats);
        const pitchingGames = games.filter(g => g.pitchingStats);
        let successMetric = 0;
        if (battingGames.length > 0) {
            const totalBatAvg = battingGames.reduce((sum, game) => {
                return sum + ((game.battingStats?.avg || 0) - 0.250);
            }, 0) / battingGames.length;
            successMetric += totalBatAvg * 100;
        }
        if (pitchingGames.length > 0) {
            const totalERADiff = pitchingGames.reduce((sum, game) => {
                return sum + (4.00 - (game.pitchingStats?.era || 4.00));
            }, 0) / pitchingGames.length;
            successMetric += totalERADiff * 25;
        }
        return Math.min(100, Math.max(-100, successMetric));
    }
    /**
     * Aggregate batting stats across multiple games
     */
    aggregateBattingStats(games) {
        const battingGames = games.filter(g => g.battingStats);
        if (battingGames.length === 0)
            return null;
        return battingGames.reduce((acc, game) => {
            const stats = game.battingStats;
            return {
                games: acc.games + 1,
                atBats: acc.atBats + stats.atBats,
                hits: acc.hits + (stats.hits || 0),
                homeRuns: acc.homeRuns + (stats.homeRuns || 0),
                rbi: acc.rbi + (stats.rbi || 0),
                walks: acc.walks + (stats.walks || 0),
                strikeouts: acc.strikeouts + (stats.strikeouts || 0)
            };
        }, { games: 0, atBats: 0, hits: 0, homeRuns: 0, rbi: 0, walks: 0, strikeouts: 0 });
    }
    /**
     * Aggregate pitching stats across multiple games
     */
    aggregatePitchingStats(games) {
        const pitchingGames = games.filter(g => g.pitchingStats);
        if (pitchingGames.length === 0)
            return null;
        return pitchingGames.reduce((acc, game) => {
            const stats = game.pitchingStats;
            return {
                games: acc.games + 1,
                inningsPitched: acc.inningsPitched + stats.inningsPitched,
                hits: acc.hits + stats.hits,
                runs: acc.runs + stats.runs,
                earnedRuns: acc.earnedRuns + stats.earnedRuns,
                walks: acc.walks + stats.walks,
                strikeouts: acc.strikeouts + stats.strikeouts
            };
        }, { games: 0, inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0 });
    }
}
exports.default = new GameDataManager();
