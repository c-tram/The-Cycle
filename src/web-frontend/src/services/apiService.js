// Professional Baseball Analytics API Service
// Leveraging enhanced v2 endpoints for comprehensive statistics

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Reduced from 30000 to 10000ms
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} (${response.status})`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// ENHANCED STATISTICS API (v2)
// ============================================================================

export const statsApi = {
  // Database summary with enhanced metrics
  getSummary: async (year = '2025') => {
    const response = await apiClient.get(`/v2/stats/summary?year=${year}`);
    return response.data;
  },

  // Statistical leaders with proper qualifications
  getLeaders: async (params = {}) => {
    const {
      category = 'batting',
      stat = 'avg',
      team,
      year = '2025',
      limit = 10,
      minGames = 10,
      minAtBats = 50,
      minInnings = 10
    } = params;

    const queryParams = new URLSearchParams({
      category,
      stat,
      year,
      limit: limit.toString(),
      minGames: minGames.toString(),
      ...(category === 'batting' && { minAtBats: minAtBats.toString() }),
      ...(category === 'pitching' && { minInnings: minInnings.toString() }),
      ...(team && { team })
    });

    const response = await apiClient.get(`/v2/stats/leaders?${queryParams}`);
    return response.data;
  },

  // Advanced player analytics
  getAdvancedPlayerStats: async (playerId, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/advanced/${playerId}?year=${year}`);
    return response.data;
  },

  // Player situational splits
  getPlayerSplits: async (playerId, params = {}) => {
    const { year = '2025', splitType = 'all' } = params;
    const response = await apiClient.get(`/v2/stats/splits/${playerId}?year=${year}&splitType=${splitType}`);
    return response.data;
  },

  // Advanced multi-player comparison
  comparePlayersAdvanced: async (players, params = {}) => {
    const { year = '2025', categories = ['batting', 'pitching'] } = params;
    const response = await apiClient.post('/v2/stats/compare/advanced', {
      players,
      year,
      categories
    });
    return response.data;
  },

  // Advanced team analytics
  getTeamAdvanced: async (teamId, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/team/${teamId}/advanced?year=${year}`);
    return response.data;
  },

  // Enhanced CVR (Cycle Value Rating) API
  getCVR: async (playerA, playerB, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/cvr/${encodeURIComponent(playerA)}/${encodeURIComponent(playerB)}?year=${year}`);
    return response.data;
  },

  // Individual player CVR
  getPlayerCVR: async (team, player, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/cvr/${team}/${encodeURIComponent(player)}/${year}`);
    return response.data;
  },

  // Salary data API
  getSalary: async (team, player, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/salary/${team}/${encodeURIComponent(player)}/${year}`);
    return response.data;
  },

  // Get all salaries for a team
  getTeamSalaries: async (team, year = '2025') => {
    const response = await apiClient.get(`/v2/stats/salary/team/${team}/${year}`);
    return response.data;
  },

  // Get all salaries for the year (league-wide)
  getAllSalaries: async (year = '2025') => {
    const response = await apiClient.get(`/v2/stats/salary/all/${year}`);
    return response.data;
  }
};

// ============================================================================
// GAMES API (v2) - Live Scores and Schedules
// ============================================================================

export const gamesApi = {
  // Get recent games for scoreboard
  getRecentGames: async (params = {}) => {
    const { date, limit = 15 } = params;
    const queryParams = new URLSearchParams();
    
    if (date) queryParams.append('date', date);
    if (limit) queryParams.append('limit', limit.toString());
    
    const response = await apiClient.get(`/v2/games/recent?${queryParams}`);
    return response.data;
  },

  // Get currently live games
  getLiveGames: async () => {
    const response = await apiClient.get(`/v2/games/live`);
    return response.data;
  },

  // Get games for specific date
  getSchedule: async (date, limit = 50) => {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    const response = await apiClient.get(`/v2/games/schedule/${date}?${queryParams}`);
    return response.data;
  },

  // Get games for date range
  getGamesRange: async (startDate, endDate, limit = 50) => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      limit: limit.toString()
    });
    
    const response = await apiClient.get(`/v2/games/range?${queryParams}`);
    return response.data;
  }
};

// ============================================================================
// ENHANCED PLAYERS API (v2)
// ============================================================================

export const playersApi = {
  // Enhanced player listing with comprehensive filtering
  getPlayers: async (params = {}) => {
    const {
      team,
      year = '2025',
      position,
      status = 'active',
      sortBy = 'name',
      sortOrder = 'desc', // Add sortOrder parameter
      minGames = 0,
      category = 'batting',
      playerType = 'all', // Add playerType filtering
      startDate, // Add date range support
      endDate,   // Add date range support
      dateRange,  // Add date range support
      limit // Add limit parameter
    } = params;

    const queryParams = new URLSearchParams({
      year,
      status,
      sortBy,
      sortOrder, // Add sortOrder to query
      minGames: minGames.toString(),
      category,
      playerType,
      ...(team && { team }),
      ...(position && { position }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(dateRange && { dateRange }),
      ...(limit && { limit: limit.toString() }) // Add limit to query
    });

    const response = await apiClient.get(`/v2/players?${queryParams}`);
    return response.data;
  },

  // Comprehensive individual player data
  getPlayer: async (team, playerName, year = '2025') => {
    const playerId = `${team}-${playerName}-${year}`;
    const response = await apiClient.get(`/v2/players/${playerId}`);
    return response.data;
  },

  // Player game log
  getPlayerGames: async (team, playerName, year = '2025') => {
    const playerId = `${team}-${playerName}-${year}`;
    const response = await apiClient.get(`/v2/players/${playerId}/games`);
    return response.data;
  },

  // Player vs team matchups
  getPlayerVsTeam: async (team, playerName, year, opponent) => {
    const playerId = `${team}-${playerName}-${year}`;
    const response = await apiClient.get(`/v2/players/${playerId}/vs/${opponent}`);
    return response.data;
  },

  // Legacy method
  getPlayerById: async (playerId, params = {}) => {
    const { year = '2025', includeGameLog = 'false' } = params;
    const response = await apiClient.get(`/v2/players/${playerId}?year=${year}&includeGameLog=${includeGameLog}`);
    return response.data;
  },

  // Player situational splits
  getPlayerSplits: async (team, playerName, year = '2025', splitType = 'all') => {
    const playerId = `${team}-${playerName}-${year}`;
    const response = await apiClient.get(`/v2/players/${playerId}/splits?splitType=${splitType}`);
    return response.data;
  },

  // Performance trends and projections
  getPlayerTrends: async (playerId, params = {}) => {
    const { year = '2025', period = '30' } = params;
    const response = await apiClient.get(`/v2/players/${playerId}/trends?year=${year}&period=${period}`);
    return response.data;
  },

  // Advanced multi-player comparison
  comparePlayers: async (players, params = {}) => {
    const { year = '2025', categories = ['batting'], metrics = 'advanced' } = params;
    const response = await apiClient.post('/v2/players/compare', {
      players,
      year,
      categories,
      metrics
    });
    return response.data;
  },

  // Team roster with comprehensive stats
  getTeamRoster: async (teamId, params = {}) => {
    const { year = '2025', sortBy = 'name', category = 'batting' } = params;
    const response = await apiClient.get(`/v2/players/team/${teamId}?year=${year}&sortBy=${sortBy}&category=${category}`);
    return response.data;
  },

  // Advanced player search
  searchPlayers: async (query, params = {}) => {
    const {
      year = '2025',
      team,
      position,
      minGames = 0,
      statThreshold,
      limit = 20
    } = params;

    const queryParams = new URLSearchParams({
      q: query,
      year,
      minGames: minGames.toString(),
      limit: limit.toString(),
      ...(team && { team }),
      ...(position && { position }),
      ...(statThreshold && { statThreshold })
    });

    const response = await apiClient.get(`/v2/players/search?${queryParams}`);
    return response.data;
  }
};

// ============================================================================
// ENHANCED TEAMS API (v2)
// ============================================================================

export const teamsApi = {
  // Enhanced team listing with comprehensive statistics
  getTeams: async (params = {}) => {
    const { year = '2025', league, division, sortBy = 'name' } = params;
    const queryParams = new URLSearchParams({
      year,
      sortBy,
      ...(league && { league }),
      ...(division && { division })
    });

    const response = await apiClient.get(`/v2/teams?${queryParams}`);
    return response.data;
  },

  // Comprehensive individual team data
  getTeam: async (teamId, params = {}) => {
    const { year = '2025', includeRoster = 'false' } = params;
    const response = await apiClient.get(`/v2/teams/${teamId}?year=${year}&includeRoster=${includeRoster}`);
    return response.data;
  },

  // Team schedule and game results
  getTeamSchedule: async (teamId, params = {}) => {
    const { year = '2025', month, limit = 50 } = params;
    const queryParams = new URLSearchParams({
      year,
      limit: limit.toString(),
      ...(month && { month })
    });

    const response = await apiClient.get(`/v2/teams/${teamId}/schedule?${queryParams}`);
    return response.data;
  },

  // Team situational splits
  getTeamSplits: async (teamId, params = {}) => {
    const { year = '2025', splitType = 'all' } = params;
    const response = await apiClient.get(`/v2/teams/${teamId}/splits?year=${year}&splitType=${splitType}`);
    return response.data;
  },

  // League standings with advanced metrics
  getStandings: async (params = {}) => {
    const { year = '2025', league, division } = params;
    const queryParams = new URLSearchParams({
      year,
      ...(league && { league }),
      ...(division && { division })
    });

    const response = await apiClient.get(`/standings?${queryParams}`);
    return response.data;
  },

  // Advanced team comparison
  compareTeams: async (teams, params = {}) => {
    const { year = '2025', categories = ['batting', 'pitching'] } = params;
    const response = await apiClient.post('/v2/teams/compare', {
      teams,
      year,
      categories
    });
    return response.data;
  }
};

// ============================================================================
// LEGACY API SUPPORT (v1)
// ============================================================================

export const legacyApi = {
  // Legacy endpoints for backward compatibility
  getStats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  },

  getPlayers: async () => {
    const response = await apiClient.get('/players');
    return response.data;
  },

  getTeams: async () => {
    const response = await apiClient.get('/teams');
    return response.data;
  }
};

// ============================================================================
// SPLITS API (v2)
// ============================================================================

export const splitsApi = {
  // Search for available splits for a player
  searchPlayerSplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/search/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get home/away splits
  getHomeAwaySplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/home-away/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get vs-teams splits
  getVsTeamsSplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/vs-teams/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get venue splits
  getVenueSplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/venue/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get handedness splits
  getHandednessSplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/handedness/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get count situation splits
  getCountSplits: async (team, player, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/counts/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get compound count-vs-team splits
  getCountsVsTeamSplits: async (team, player, opponent, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/counts-vs-team/${team}/${playerName}/${season}/${opponent}`);
    return response.data;
  },

  // Get compound count-vs-venue splits
  getCountsVsVenueSplits: async (team, player, venue, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/counts-vs-venue/${team}/${playerName}/${season}/${venue}`);
    return response.data;
  },

  // Get compound count-vs-handedness splits
  getCountsVsHandednessSplits: async (team, player, handedness, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/counts-vs-handedness/${team}/${playerName}/${season}/${handedness}`);
    return response.data;
  },

  // Get compound handedness-vs-team splits
  getHandednessVsTeamSplits: async (team, player, opponent, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/handedness-vs-team/${team}/${playerName}/${season}/${opponent}`);
    return response.data;
  },

  // Get vs-pitcher splits
  getVsPitcherSplits: async (team, player, opponent, pitcher, season = '2025') => {
    const playerName = player.replace(/\s+/g, '-');
    const response = await apiClient.get(`/v2/splits/vs-pitcher/${team}/${playerName}/${season}/${opponent}/${pitcher}`);
    return response.data;
  },

  // Get pitcher-vs-batter splits (for pitcher perspective)
  getPitcherVsBatterSplits: async (team, pitcher, opponent, batter, season = '2025') => {
    const response = await apiClient.get(`/v2/splits/pitcher-vs-batter/${team}/${pitcher}/${season}/${opponent}/${batter}`);
    return response.data;
  },

  // Get unique players for autocomplete from actual split data
  getAvailablePlayers: async (season = '2025') => {
    // Use Redis keys to find actual players with split data
    const response = await apiClient.get(`/v2/splits/players/available-players?season=${season}`);
    return response.data;
  },

  // Search all splits for a player
  searchPlayerSplits: async (team, playerName, season = '2025') => {
    const response = await apiClient.get(`/v2/splits/search/${team}/${playerName}/${season}`);
    return response.data;
  },

  // Get team abbreviations
  getTeamAbbreviations: async () => {
    const teams = ['HOU', 'LAD', 'NYY', 'ATL', 'TB', 'CLE', 'SEA', 'TEX', 'MIN', 'KC', 
                   'CWS', 'DET', 'OAK', 'LAA', 'TOR', 'BAL', 'BOS', 'PHI', 'NYM', 'MIA',
                   'WSH', 'STL', 'MIL', 'CHC', 'CIN', 'PIT', 'AZ', 'SD', 'SF', 'COL'];
    return teams;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const apiUtils = {
  // Format player ID for API calls
  formatPlayerId: (team, firstName, lastName, year = '2025') => {
    const formattedName = `${firstName}_${lastName}`.replace(/\s+/g, '_').toUpperCase();
    return `${team.toUpperCase()}-${formattedName}-${year}`;
  },

  // Parse player ID to components
  parsePlayerId: (playerId) => {
    const parts = playerId.split('-');
    if (parts.length >= 3) {
      const team = parts[0];
      const year = parts[parts.length - 1];
      const nameParts = parts.slice(1, -1);
      const name = nameParts.join(' ').replace(/_/g, ' ');
      return { team, name, year };
    }
    return null;
  },

  // Format statistical values for display
  formatStat: (value, type = 'decimal', decimals = 3) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'decimal':
        return Number(value).toFixed(decimals);
      case 'integer':
        return Math.round(value);
      case 'era':
        return Number(value).toFixed(2);
      case 'avg':
        return value >= 1 ? '1.000' : Number(value).toFixed(3).substring(1);
      default:
        return value.toString();
    }
  },

  // Get team color for UI
  getTeamColor: (teamId) => {
    const teamColors = {
      'NYY': '#132448',
      'BOS': '#BD3039',
      'TOR': '#134A8E',
      'TB': '#092C5C',
      'BAL': '#DF4601',
      'HOU': '#002D62',
      'LAA': '#BA0021',
      'OAK': '#003831',
      'SEA': '#0C2C56',
      'TEX': '#003278',
      'ATL': '#CE1141',
      'WSH': '#AB0003',
      'NYM': '#002D72',
      'PHI': '#E81828',
      'MIA': '#00A3E0',
      'CHC': '#0E3386',
      'MIL': '#12284B',
      'STL': '#C41E3A',
      'CIN': '#C6011F',
      'PIT': '#FDB827',
      'LAD': '#005A9C',
      'SD': '#2F241D',
      'SF': '#FD5A1E',
      'COL': '#C4CED4',
      'ARI': '#A71930'
    };
    return teamColors[teamId?.toUpperCase()] || '#666666';
  },

  // Statistical category configurations
  getStatCategories: () => ({
    batting: {
      basic: ['avg', 'obp', 'slg', 'ops', 'hits', 'homeRuns', 'rbi', 'runs'],
      advanced: ['iso', 'babip', 'woba', 'wrcPlus', 'kRate', 'bbRate'],
      counting: ['atBats', 'plateAppearances', 'doubles', 'triples', 'stolenBases']
    },
    pitching: {
      basic: ['era', 'whip', 'wins', 'saves', 'strikeOuts', 'inningsPitched'],
      advanced: ['fip', 'strikeoutsPer9Inn', 'walksPer9Inn', 'hitsPer9Inn', 'strikeoutWalkRatio'],
      counting: ['battersFaced', 'hits', 'earnedRuns', 'baseOnBalls', 'hitByPitch']
    },
    fielding: {
      basic: ['fieldingPercentage', 'assists', 'putOuts', 'errors'],
      advanced: ['chances', 'range', 'zone'],
      counting: ['games', 'innings', 'doublePlays']
    }
  })
};

// Health check function
export const healthCheck = async () => {
  try {
    const [health, redisHealth] = await Promise.all([
      apiClient.get('/health'),
      apiClient.get('/redis-health')
    ]);
    
    return {
      api: health.data,
      redis: redisHealth.data,
      status: 'healthy'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

export default {
  statsApi,
  playersApi,
  teamsApi,
  splitsApi,
  legacyApi,
  apiUtils,
  healthCheck
};
