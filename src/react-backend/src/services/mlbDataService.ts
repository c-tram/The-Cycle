import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storeData, retrieveData } from './dataService';

interface PlayerMetadata {
  id: string;
  name: string;
  position: string;
  team: string;
  teamId: number;
  jerseyNumber?: string;
  birthDate?: string;
  height?: string;
  weight?: string;
  batsThrows?: string;
}

interface PlayerDataMap {
  [playerId: string]: {
    metadata: PlayerMetadata;
    stats?: {
      hitting?: any;
      pitching?: any;
    };
    lastUpdated: number;
  }
}

interface TeamDataMap {
  [teamId: string]: {
    roster: string[];  // Array of player IDs
    stats: any;
    lastUpdated: number;
  }
}

class MLBDataService {
  private playerRegistry: PlayerDataMap = {};
  private teamRegistry: TeamDataMap = {};
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  private readonly MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
  private initializationPromise: Promise<void> | null = null;
  
  constructor() {
    // Start initialization immediately
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
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
      } else {
        console.log(`Using cached data for ${Object.keys(this.playerRegistry).length} players`);
      }

      // Schedule regular refresh
      setInterval(() => {
        this.refreshPlayerRegistry().catch(error => {
          console.error('Error in scheduled refresh:', error);
        });
      }, this.CACHE_DURATION);
      
    } catch (error) {
      console.error('Error during initialization:', error);
      throw error;
    }
  }

  private async loadCachedData() {
    console.log('Loading cached data...');
    const cachedPlayers = await retrieveData<PlayerDataMap>('player-registry.json');
    const cachedTeams = await retrieveData<TeamDataMap>('team-registry.json');
    
    if (cachedPlayers) {
      this.playerRegistry = cachedPlayers;
      console.log(`Loaded ${Object.keys(this.playerRegistry).length} players from cache`);
    }
    if (cachedTeams) {
      this.teamRegistry = cachedTeams;
      console.log(`Loaded ${Object.keys(this.teamRegistry).length} teams from cache`);
    }
  }

  private async saveCachedData() {
    console.log('Saving data to cache...');
    await storeData('player-registry.json', this.playerRegistry);
    await storeData('team-registry.json', this.teamRegistry);
    console.log('Cache updated successfully');
  }

  async refreshPlayerRegistry(): Promise<void> {
    console.log('Refreshing player registry from MLB API...');
    try {
      const statsResponse = await fetch(`${this.MLB_API_BASE}/sports/1/players?season=2025&gameType=R`, {
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
      const newRegistry: PlayerDataMap = {};
      
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
    } catch (error) {
      console.error('Error refreshing player registry:', error);
      throw error;
    }
  }

  // Enhanced search method with fuzzy matching and initialization handling
  async searchPlayers(query: string): Promise<PlayerMetadata[]> {
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
          return (
            metadata.name.toLowerCase().includes(searchTerm) ||
            metadata.team.toLowerCase().includes(searchTerm) ||
            metadata.position.toLowerCase() === searchTerm ||
            metadata.jerseyNumber === searchTerm
          );
        })
        .map(player => player.metadata);

      // Sort results by relevance
      results.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(searchTerm);
        const bNameMatch = b.name.toLowerCase().includes(searchTerm);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log(`Found ${results.length} matching players`);
      return results;
    } catch (error) {
      console.error('Error searching players:', error);
      throw error;
    }
  }

  async getPlayersByTeam(teamId: string): Promise<PlayerMetadata[]> {
    const team = this.teamRegistry[teamId];
    if (!team || Date.now() - team.lastUpdated > this.CACHE_DURATION) {
      await this.refreshTeamRoster(teamId);
    }
    return team.roster
      .map(id => this.playerRegistry[id]?.metadata)
      .filter(Boolean); // Remove any undefined entries
  }

  async getPlayersByPosition(position: string): Promise<PlayerMetadata[]> {
    const normalizedPosition = position.toUpperCase();
    return Object.values(this.playerRegistry)
      .filter(player => player.metadata.position.toUpperCase() === normalizedPosition)
      .map(player => player.metadata);
  }

  private async refreshTeamRoster(teamId: string): Promise<void> {
    try {
      const response = await fetch(`${this.MLB_API_BASE}/teams/${teamId}/roster?season=2025`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch roster: ${response.status}`);
      }

      const data = await response.json();
      this.teamRegistry[teamId] = {
        roster: data.roster.map((p: any) => p.person.id.toString()),
        stats: {},
        lastUpdated: Date.now()
      };

      await this.saveCachedData();
    } catch (error) {
      console.error(`Error refreshing roster for team ${teamId}:`, error);
      throw error;
    }
  }

  async getPlayerStats(playerId: string): Promise<any> {
    const player = this.playerRegistry[playerId];
    if (!player) {
      throw new Error('Player not found');
    }

    if (
      !player.stats?.hitting ||
      !player.stats?.pitching ||
      Date.now() - player.lastUpdated > this.CACHE_DURATION
    ) {
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

  private async fetchPlayerStats(playerId: string, type: 'hitting' | 'pitching'): Promise<any> {
    try {
      const response = await fetch(
        `${this.MLB_API_BASE}/people/${playerId}/stats?stats=season&group=${type}&season=2025`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} stats: ${response.status}`);
      }

      const data = await response.json();
      return data.stats?.[0]?.splits?.[0]?.stat || null;
    } catch (error) {
      console.error(`Error fetching ${type} stats for player ${playerId}:`, error);
      return null;
    }
  }
}

// Create and export singleton instance
export const mlbDataService = new MLBDataService();
