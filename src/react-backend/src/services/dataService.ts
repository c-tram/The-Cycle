import fs from 'fs';
import path from 'path';

// Define the directory where data will be stored
const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * General-purpose function to store data in a JSON file
 */
export function storeData<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * General-purpose function to retrieve data from a JSON file with expiration check
 */
export function retrieveData<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const cacheData = JSON.parse(fileContent);
      
      // Check if cache has expired
      if (cacheData.expires && Date.now() < cacheData.expires) {
        return cacheData.data as T;
      } else {
        console.log(`Cache expired for ${filename}`);
        return null;
      }
    } catch (error) {
      console.error(`Error reading cache file ${filename}:`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * Store bulk team data efficiently
 */
export function storeBulkTeamData(teams: any[], statType: string): void {
  // Store individual team data
  teams.forEach(team => {
    const teamCode = team.teamCode.toLowerCase();
    storeData(`player-stats-${teamCode}-${statType}.json`, team.players);
  });
  
  // Store consolidated data
  storeData('player-stats.json', teams.flatMap(t => t.players));
}

/**
 * Creates or appends data to a trend file, storing historical data
 * @param category The type of data being stored (e.g., 'batting-avg', 'era')
 * @param date The date of the data point
 * @param value The value to store
 */
export function storeTrendData(category: string, date: string, value: number): void {
  const filename = `trend-${category}.json`;
  const filePath = path.join(DATA_DIR, filename);
  
  let data: Record<string, number> = {};
  
  // Read existing data if available
  if (fs.existsSync(filePath)) {
    const existingData = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(existingData);
  }
  
  // Add or update the entry for this date
  data[date] = value;
  
  // Write back to the file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Retrieves trend data for a category
 * @param category The type of data to retrieve (e.g., 'batting-avg', 'era')
 * @param limit Number of most recent data points to retrieve
 * @returns Array of values in chronological order
 */
export function getTrendData(category: string, limit: number = 7): number[] {
  const filename = `trend-${category}.json`;
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    // Return empty array if no data exists
    return Array(limit).fill(0);
  }
  
  const data = fs.readFileSync(filePath, 'utf8');
  const trendData = JSON.parse(data) as Record<string, number>;
  
  // Sort dates chronologically
  const sortedDates = Object.keys(trendData).sort();
  
  // Get the most recent 'limit' entries
  const recentDates = sortedDates.slice(-limit);
  
  // Return the values for those dates
  return recentDates.map(date => trendData[date]);
}

/**
 * This function will be scheduled to run daily to calculate and store trend data
 */
export async function calculateDailyTrends(playerStatsData: any): Promise<void> {
  // Calculate league-wide batting average
  const allBattingAvgs: number[] = [];
  // Calculate league-wide ERA
  const allERAs: number[] = [];
  // ... other stat calculations
  
  // Extract all batting averages from player data
  playerStatsData.forEach((team: any) => {
    team.players.forEach((player: any) => {
      if (player.avg) {
        const avg = parseFloat(player.avg);
        if (!isNaN(avg)) {
          allBattingAvgs.push(avg);
        }
      }
      if (player.era) {
        const era = parseFloat(player.era);
        if (!isNaN(era)) {
          allERAs.push(era);
        }
      }
    });
  });
  
  // Calculate averages
  const today = new Date().toISOString().split('T')[0];
  
  // Batting Average
  if (allBattingAvgs.length > 0) {
    const avgBA = allBattingAvgs.reduce((sum, val) => sum + val, 0) / allBattingAvgs.length;
    storeTrendData('batting-avg', today, avgBA);
  }
  
  // ERA
  if (allERAs.length > 0) {
    const avgERA = allERAs.reduce((sum, val) => sum + val, 0) / allERAs.length;
    storeTrendData('era', today, avgERA);
  }
  
  // ... calculate other trends
}

/**
 * Caches data with expiration time support
 * @param key The cache key
 * @param data The data to cache
 * @param expirationMinutes Minutes until the cache expires
 */
export function cacheData<T>(key: string, data: T, expirationMinutes: number = 60): void {
  const cacheItem = {
    data,
    expires: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
  };
  
  storeData(`cache-${key}.json`, cacheItem);
}

/**
 * Retrieves cached data if it hasn't expired
 * @param key The cache key
 * @returns The cached data or null if expired or not found
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cacheItem = retrieveData<{ data: T; expires: string }>(`cache-${key}.json`);
    
    if (!cacheItem) return null;
    
    // Check if cache has expired
    const expiresDate = new Date(cacheItem.expires);
    if (expiresDate < new Date()) {
      console.log(`Cache for ${key} has expired`);
      return null;
    }
    
    console.log(`Using cached data for ${key} (expires ${formatTimeRemaining(expiresDate)})`);
    return cacheItem.data;
  } catch (error) {
    console.error(`Error retrieving cache for ${key}:`, error);
    return null;
  }
}

/**
 * Format time remaining until expiration in a human-readable way
 */
function formatTimeRemaining(expiresDate: Date): string {
  const diff = expiresDate.getTime() - Date.now();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 60) {
    return `in ${minutes} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `in ${hours} hours`;
}
