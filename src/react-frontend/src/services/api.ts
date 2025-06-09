import { APICache } from './cache';

// API base URL (default to localhost for development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Default timeout for API requests
const DEFAULT_TIMEOUT = 60000; // 60 seconds

// Retry configuration 
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API requests with timeout and retries
async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout = DEFAULT_TIMEOUT,
  retries = RETRY_ATTEMPTS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    
    if (retries > 0 && error.name !== 'AbortError') {
      const retryCount = RETRY_ATTEMPTS - retries;
      const exponentialDelay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying request to ${url}, attempt ${retryCount + 1}/${RETRY_ATTEMPTS}, waiting ${exponentialDelay}ms...`);
      await delay(exponentialDelay);
      return fetchWithTimeout(url, options, timeout, retries - 1);
    }

    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Interface definitions for API responses
export interface TeamStanding {
  team: string;
  wins: number;
  losses: number;
  pct: string;
  gb: string;
  last10?: string;
  streak?: string;
}

export interface Division {
  division: string;
  teams: TeamStanding[];
}

export interface Player {
  name: string;
  team?: string;
  position?: string;
  avg?: string;
  hr?: string;
  rbi?: string;
  runs?: string;
  sb?: string;
  obp?: string;
  slg?: string;
  ops?: string;
  era?: string;
  wins?: string;
  so?: string;
  whip?: string;
  statDate?: string;
  statType?: 'hitting' | 'pitching';
  stats?: string[]; // For compatibility with existing code
}

export interface TeamStats {
  teamName: string;
  teamCode: string;
  players: Player[];
}

export interface Game {
  homeTeam: string;
  homeTeamCode: string;
  awayTeam: string;
  awayTeamCode: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  status: 'completed' | 'scheduled' | 'live';
}

export interface GamesData {
  recent: Game[];
  upcoming: Game[];
}

export interface TrendData {
  [category: string]: number[];
}

export interface PlayerMetadata {
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
  playerType: 'pitcher' | 'hitter';  // Add player type
}

/**
 * Get current MLB standings with error handling and caching
 */
export async function getStandings(): Promise<Division[]> {
  const cacheKey = 'standings';
  const cached = APICache.get<Division[]>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/standings`);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid standings data format');
    }
    
    // Cache for 5 minutes
    APICache.set(cacheKey, data, { expiresIn: 5 * 60 * 1000 });
    
    return data;
  } catch (error) {
    console.error('Error fetching standings:', error);
    throw error;
  }
}

/**
 * Get trend data for a specific stat category
 */
export async function getTrends(statCategory: string): Promise<TrendData> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/trends?stat=${encodeURIComponent(statCategory)}`);
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trends:', error);
    throw error;
  }
}

/**
 * Get recent and upcoming games
 */
export async function getGames(): Promise<GamesData> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/games`);
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

/**
 * Search for players with proper error handling
 */
export async function searchPlayers(query: string): Promise<PlayerMetadata[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/v1/players?search=${encodeURIComponent(query)}`,
      {},
      30000, // 30 second timeout for search
      3 // 3 retries
    );
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error('Unexpected response format:', data);
      throw new Error('Invalid response format');
    }
    
    return data;
  } catch (error) {
    console.error('Error searching players:', error);
    throw error;
  }
}

/**
 * Get player stats with proper error handling and caching
 */
export async function getPlayerStats(playerId: string): Promise<any> {
  const cacheKey = `player-stats-${playerId}`;
  const cached = APICache.get<any>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/v1/players/${playerId}`);
    const data = await response.json();
    
    // Cache for 5 minutes
    APICache.set(cacheKey, data, { expiresIn: 5 * 60 * 1000 });
    
    return data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
}

/**
 * Get team roster/stats with caching
 */
export async function getTeamRoster(teamCode: string, timePeriod: string = 'season', statType: 'hitting' | 'pitching' = 'hitting'): Promise<TeamStats[]> {
  const cacheKey = `team-roster-${teamCode}-${timePeriod}-${statType}`;
  const cached = APICache.get<TeamStats[]>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  try {
    console.log(`Fetching roster for ${teamCode}, ${statType}, ${timePeriod}`);
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/roster?team=${teamCode}&period=${timePeriod}&statType=${statType}`,
      {}, 
      30000, // 30 second timeout
      2 // 2 retries
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(typeof data === 'object' && data?.error ? data.error : 'Invalid response format');
    }
    
    if (data.length === 0) {
      throw new Error('No data received from server');
    }

    const teamData = data[0];
    const formattedData = [{
      teamName: teamData.teamName,
      teamCode: teamData.teamCode,
      players: teamData.players.map((player: any) => ({
        name: player.name,
        position: player.position,
        team: player.team,
        avg: player.avg,
        hr: player.hr,
        rbi: player.rbi,
        runs: player.runs,
        sb: player.sb,
        obp: player.obp,
        slg: player.slg,
        ops: player.ops,
        era: player.era,
        whip: player.whip,
        wins: player.wins,
        so: player.so
      }))
    }];
    
    // Cache with dynamic expiration
    const cacheTime = ((period: string) => {
      switch (period) {
        case 'season': return 30 * 60 * 1000; // 30 minutes for season stats
        case '30day': return 15 * 60 * 1000;  // 15 minutes for monthly stats
        case '7day': return 5 * 60 * 1000;    // 5 minutes for weekly stats
        case '1day': return 2 * 60 * 1000;    // 2 minutes for daily stats
        default: return 5 * 60 * 1000;
      }
    })(timePeriod);

    APICache.set(cacheKey, formattedData, { expiresIn: cacheTime });
    
    return formattedData;
  } catch (error) {
    console.error('Error fetching team roster:', error);
    throw error;
  }
}
