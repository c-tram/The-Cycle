"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeData = storeData;
exports.retrieveData = retrieveData;
exports.storeTrendData = storeTrendData;
exports.getTrendData = getTrendData;
exports.calculateDailyTrends = calculateDailyTrends;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Define the directory where data will be stored
const DATA_DIR = path_1.default.join(__dirname, '../../data');
// Ensure data directory exists
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
/**
 * General-purpose function to store data in a JSON file
 */
function storeData(filename, data) {
    const filePath = path_1.default.join(DATA_DIR, filename);
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
/**
 * General-purpose function to retrieve data from a JSON file
 */
function retrieveData(filename) {
    const filePath = path_1.default.join(DATA_DIR, filename);
    if (fs_1.default.existsSync(filePath)) {
        const data = fs_1.default.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    return null;
}
/**
 * Creates or appends data to a trend file, storing historical data
 * @param category The type of data being stored (e.g., 'batting-avg', 'era')
 * @param date The date of the data point
 * @param value The value to store
 */
function storeTrendData(category, date, value) {
    const filename = `trend-${category}.json`;
    const filePath = path_1.default.join(DATA_DIR, filename);
    let data = {};
    // Read existing data if available
    if (fs_1.default.existsSync(filePath)) {
        const existingData = fs_1.default.readFileSync(filePath, 'utf8');
        data = JSON.parse(existingData);
    }
    // Add or update the entry for this date
    data[date] = value;
    // Write back to the file
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
/**
 * Retrieves trend data for a category
 * @param category The type of data to retrieve (e.g., 'batting-avg', 'era')
 * @param limit Number of most recent data points to retrieve
 * @returns Array of values in chronological order
 */
function getTrendData(category, limit = 7) {
    const filename = `trend-${category}.json`;
    const filePath = path_1.default.join(DATA_DIR, filename);
    if (!fs_1.default.existsSync(filePath)) {
        // Return empty array if no data exists
        return Array(limit).fill(0);
    }
    const data = fs_1.default.readFileSync(filePath, 'utf8');
    const trendData = JSON.parse(data);
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
async function calculateDailyTrends(playerStatsData) {
    // Calculate league-wide batting average
    const allBattingAvgs = [];
    // Calculate league-wide ERA
    const allERAs = [];
    // ... other stat calculations
    // Extract all batting averages from player data
    playerStatsData.forEach((team) => {
        team.players.forEach((player) => {
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
