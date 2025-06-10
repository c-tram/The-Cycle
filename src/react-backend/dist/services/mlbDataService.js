"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlbDataService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const dataService_1 = require("./dataService");
class MLBDataService {
    constructor() {
        this.playerRegistry = {};
        this.teamRegistry = {};
        this.CACHE_DURATION = 3600000; // 1 hour in milliseconds
        this.MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
        this.initializationPromise = null;
        // Start initialization immediately
        this.initializationPromise = this.initialize();
    }
    async initialize() {
        console.log('Initializing MLB Data Service...');
        try {
            await this.loadCachedData();
            // If no cached data or cache is old, refresh from API
            const oldestAllowedUpdate = Date.now() - this.CACHE_DURATION;
            const needsRefresh = Object.keys(this.playerRegistry).length === 0 ||
                Object.values(this.playerRegistry).some(player => player.lastUpdated < oldestAllowedUpdate);
            if (needsRefresh) {
                console.log('Player data needs refresh, fetching from MLB API...');
                await this.refreshPlayerRegistry();
            }
            else {
                console.log(`Using cached data for ${Object.keys(this.playerRegistry).length} players`);
            }
            // Schedule regular refresh
            setInterval(() => {
                this.refreshPlayerRegistry().catch(error => {
                    console.error('Error in scheduled refresh:', error);
                });
            }, this.CACHE_DURATION);
        }
        catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }
    async loadCachedData() {
        console.log('Loading cached data...');
        const cachedPlayers = await (0, dataService_1.retrieveData)('player-registry.json');
        const cachedTeams = await (0, dataService_1.retrieveData)('team-registry.json');
        if (cachedPlayers) {
            this.playerRegistry = cachedPlayers;
            console.log(`Loaded ${Object.keys(this.playerRegistry).length} players from cache`);
        }
        if (cachedTeams) {
            this.teamRegistry = cachedTeams;
            console.log(`Loaded ${Object.keys(this.teamRegistry).length} teams from cache`);
        }
    }
    async saveCachedData() {
        console.log('Saving data to cache...');
        await (0, dataService_1.storeData)('player-registry.json', this.playerRegistry);
        await (0, dataService_1.storeData)('team-registry.json', this.teamRegistry);
        console.log('Cache updated successfully');
    }
    async refreshPlayerRegistry() {
        console.log('Refreshing player registry from MLB API...');
        try {
            const statsResponse = await (0, node_fetch_1.default)(`${this.MLB_API_BASE}/sports/1/players?season=2025&gameType=R`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (!statsResponse.ok) {
                throw new Error(`MLB Stats API failed: ${statsResponse.status}`);
            }
            const statsData = await statsResponse.json();
            console.log(`Retrieved ${statsData.people?.length || 0} players from MLB API`);
            // Create new registry to prevent stale data
            const newRegistry = {};
            // Process each player from the API
            for (const player of statsData.people || []) {
                const playerId = player.id.toString();
                newRegistry[playerId] = {
                    metadata: {
                        id: playerId,
                        name: player.fullName,
                        position: player.primaryPosition.abbreviation,
                        team: player.currentTeam?.name || 'Free Agent',
                        teamId: player.currentTeam?.id || 0,
                        jerseyNumber: player.primaryNumber,
                        birthDate: player.birthDate,
                        height: player.height,
                        weight: player.weight,
                        batsThrows: `${player.batSide?.code || '-'}/${player.pitchHand?.code || '-'}`
                    },
                    stats: {},
                    lastUpdated: Date.now()
                };
                // If player is on a team, update team registry
                if (player.currentTeam?.id) {
                    const teamId = player.currentTeam.id.toString();
                    if (!this.teamRegistry[teamId]) {
                        this.teamRegistry[teamId] = {
                            roster: [],
                            stats: {},
                            lastUpdated: Date.now()
                        };
                    }
                    if (!this.teamRegistry[teamId].roster.includes(playerId)) {
                        this.teamRegistry[teamId].roster.push(playerId);
                    }
                }
            }
            // Only update registry after successful processing
            this.playerRegistry = newRegistry;
            console.log(`Player registry updated with ${Object.keys(this.playerRegistry).length} players`);
            await this.saveCachedData();
        }
        catch (error) {
            console.error('Error refreshing player registry:', error);
            throw error;
        }
    }
    // Enhanced search method with fuzzy matching and initialization handling
    async searchPlayers(query) {
        try {
            // Wait for initialization if it hasn't completed
            if (this.initializationPromise) {
                await this.initializationPromise;
            }
            console.log(`Searching for players matching "${query}"...`);
            const searchTerm = query.toLowerCase();
            // Refresh data if empty (backup check)
            if (Object.keys(this.playerRegistry).length === 0) {
                console.log('Player registry is empty, refreshing data...');
                await this.refreshPlayerRegistry();
            }
            const results = Object.values(this.playerRegistry)
                .filter(player => {
                const metadata = player.metadata;
                return (metadata.name.toLowerCase().includes(searchTerm) ||
                    metadata.team.toLowerCase().includes(searchTerm) ||
                    metadata.position.toLowerCase() === searchTerm ||
                    metadata.jerseyNumber === searchTerm);
            })
                .map(player => player.metadata);
            // Sort results by relevance
            results.sort((a, b) => {
                const aNameMatch = a.name.toLowerCase().includes(searchTerm);
                const bNameMatch = b.name.toLowerCase().includes(searchTerm);
                if (aNameMatch && !bNameMatch)
                    return -1;
                if (!aNameMatch && bNameMatch)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            console.log(`Found ${results.length} matching players`);
            return results;
        }
        catch (error) {
            console.error('Error searching players:', error);
            throw error;
        }
    }
    async getPlayersByTeam(teamId) {
        const team = this.teamRegistry[teamId];
        if (!team || Date.now() - team.lastUpdated > this.CACHE_DURATION) {
            await this.refreshTeamRoster(teamId);
        }
        return team.roster
            .map(id => this.playerRegistry[id]?.metadata)
            .filter(Boolean); // Remove any undefined entries
    }
    async getPlayersByPosition(position) {
        const normalizedPosition = position.toUpperCase();
        return Object.values(this.playerRegistry)
            .filter(player => player.metadata.position.toUpperCase() === normalizedPosition)
            .map(player => player.metadata);
    }
    async refreshTeamRoster(teamId) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.MLB_API_BASE}/teams/${teamId}/roster?season=2025`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch roster: ${response.status}`);
            }
            const data = await response.json();
            this.teamRegistry[teamId] = {
                roster: data.roster.map((p) => p.person.id.toString()),
                stats: {},
                lastUpdated: Date.now()
            };
            await this.saveCachedData();
        }
        catch (error) {
            console.error(`Error refreshing roster for team ${teamId}:`, error);
            throw error;
        }
    }
    async getPlayerStats(playerId) {
        const player = this.playerRegistry[playerId];
        if (!player) {
            throw new Error('Player not found');
        }
        if (!player.stats?.hitting ||
            !player.stats?.pitching ||
            Date.now() - player.lastUpdated > this.CACHE_DURATION) {
            // Fetch fresh stats
            const [hittingStats, pitchingStats] = await Promise.all([
                this.fetchPlayerStats(playerId, 'hitting'),
                this.fetchPlayerStats(playerId, 'pitching')
            ]);
            player.stats = {
                hitting: hittingStats,
                pitching: pitchingStats
            };
            player.lastUpdated = Date.now();
            await this.saveCachedData();
        }
        return player.stats;
    }
    async fetchPlayerStats(playerId, type) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.MLB_API_BASE}/people/${playerId}/stats?stats=season&group=${type}&season=2025`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${type} stats: ${response.status}`);
            }
            const data = await response.json();
            return data.stats?.[0]?.splits?.[0]?.stat || null;
        }
        catch (error) {
            console.error(`Error fetching ${type} stats for player ${playerId}:`, error);
            return null;
        }
    }
}
// Create and export singleton instance
exports.mlbDataService = new MLBDataService();
