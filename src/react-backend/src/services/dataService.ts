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
 * General-purpose function to retrieve data from a JSON file
 */
export function retrieveData<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  }
  
  return null;
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
