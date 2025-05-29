// API base URL (default to localhost for development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

/**
 * Get team roster/stats
 */
export async function getTeamRoster(teamCode: string, timePeriod: string = 'season', statType: 'hitting' | 'pitching' = 'hitting'): Promise<TeamStats[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/roster?team=${teamCode}&period=${timePeriod}&statType=${statType}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching team roster:', error);
    throw error;
  }
}

/**
 * Get current MLB standings
 */
export async function getStandings(): Promise<Division[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/standings`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/trends?stat=${encodeURIComponent(statCategory)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
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
    const response = await fetch(`${API_BASE_URL}/games`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}
