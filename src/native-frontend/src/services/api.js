import axios from 'axios';

// Base URL - you can change this to your deployed backend URL
const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health endpoints
  getHealth: () => api.get('/health'),
  getRedisHealth: () => api.get('/redis-health'),

  // Player endpoints
  getPlayers: (params = {}) => api.get('/players', { params }),
  getPlayerSeasonStats: (team, player, year) => 
    api.get(`/players/${team}/${player}/${year}`),
  getPlayerGames: (team, player, year, params = {}) => 
    api.get(`/players/${team}/${player}/${year}/games`, { params }),

  // Team endpoints
  getTeams: (params = {}) => api.get('/teams', { params }),
  getTeamSeasonStats: (team, year) => api.get(`/teams/${team}/${year}`),
  getTeamGames: (team, year, params = {}) => 
    api.get(`/teams/${team}/${year}/games`, { params }),
  getTeamRoster: (team, year, params = {}) => 
    api.get(`/teams/${team}/${year}/roster`, { params }),

  // Matchup endpoints
  getPlayerMatchups: (params = {}) => api.get('/matchups/players', { params }),
  getTeamMatchups: (params = {}) => api.get('/matchups/teams', { params }),
  getTeamVsTeamGames: (team1, team2, params = {}) => 
    api.get(`/matchups/teams/${team1}/vs/${team2}/games`, { params }),

  // Stats endpoints
  getStatsSummary: () => api.get('/stats/summary'),
  getLeaders: (params = {}) => api.get('/stats/leaders', { params }),
  searchStats: (params = {}) => api.get('/stats/search', { params }),
};

export default api;
