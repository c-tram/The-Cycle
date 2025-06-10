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
}
exports.default = new GameDataManager();
