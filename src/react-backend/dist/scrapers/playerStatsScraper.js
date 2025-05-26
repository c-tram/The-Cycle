"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePlayerStats = scrapePlayerStats;
exports.scrapeTrendData = scrapeTrendData;
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = __importDefault(require("selenium-webdriver/chrome"));
// Add mock data for fallback
const MOCK_PLAYERS = [
    { name: "Aaron Judge", team: "Yankees", position: "RF", avg: ".310", hr: "32", rbi: "74", runs: "65", sb: "8", statDate: new Date().toISOString().split('T')[0] },
    { name: "Gerrit Cole", team: "Yankees", position: "P", era: "2.78", wins: "8", so: "112", whip: "1.02", statDate: new Date().toISOString().split('T')[0] },
    { name: "Shohei Ohtani", team: "Dodgers", position: "DH", avg: ".321", hr: "28", rbi: "68", runs: "71", sb: "12", statDate: new Date().toISOString().split('T')[0] },
    { name: "Mookie Betts", team: "Dodgers", position: "RF", avg: ".302", hr: "18", rbi: "56", runs: "61", sb: "7", statDate: new Date().toISOString().split('T')[0] },
];
/**
 * Scrapes player statistics for a specific team or all teams
 * @param teamCode Optional team code to filter results
 * @returns Promise containing player statistics
 */
async function scrapePlayerStats(teamCode) {
    let driver = null;
    try {
        console.log("Starting player stats scraper...");
        // Set up headless Chrome for scraping
        const options = new chrome_1.default.Options();
        options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
        driver = await new selenium_webdriver_1.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        // First, scrape batting leaders
        console.log("Scraping batting leaders...");
        const battingStats = await scrapeBattingLeaders(driver);
        // Then, scrape pitching leaders
        console.log("Scraping pitching leaders...");
        const pitchingStats = await scrapePitchingLeaders(driver);
        // Combine and organize by team
        const allStats = [...battingStats, ...pitchingStats];
        // If no stats were scraped, use mock data
        if (allStats.length === 0) {
            console.log("No player stats found, using mock data");
            return organizeMockDataByTeam(teamCode);
        }
        // Group by team
        const teamMap = new Map();
        // Today's date for the stat snapshot
        const today = new Date().toISOString().split('T')[0];
        for (const stat of allStats) {
            if (!teamMap.has(stat.team)) {
                const teamCode = getTeamCodeFromName(stat.team);
                teamMap.set(stat.team, {
                    teamName: stat.team,
                    teamCode,
                    players: []
                });
            }
            // Add stat date to each player
            stat.statDate = today;
            // Add to team's players
            teamMap.get(stat.team).players.push(stat);
        }
        // Convert map to array
        let results = Array.from(teamMap.values());
        // Filter by team if requested
        if (teamCode) {
            results = results.filter(team => team.teamCode === teamCode.toLowerCase());
        }
        if (results.length === 0) {
            console.log("No results after filtering, using mock data");
            return organizeMockDataByTeam(teamCode);
        }
        return results;
    }
    catch (error) {
        console.error('Error scraping player stats:', error);
        return organizeMockDataByTeam(teamCode);
    }
    finally {
        if (driver) {
            try {
                await driver.quit();
            }
            catch (e) {
                console.error('Error closing WebDriver:', e);
            }
        }
    }
}
/**
 * Scrapes batting leaders from MLB stats
 */
async function scrapeBattingLeaders(driver) {
    try {
        // Navigate to MLB batting leaders page
        await driver.get('https://www.mlb.com/stats/');
        // Wait for stats table to load
        await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('.bui-table')), 10000);
        // Find all player rows
        const playerRows = await driver.findElements(selenium_webdriver_1.By.css('.bui-table tbody tr'));
        const players = [];
        // Process each player row
        for (const row of playerRows) {
            const cells = await row.findElements(selenium_webdriver_1.By.css('td'));
            if (cells.length >= 10) {
                // Get player name
                const nameEl = await cells[0].findElement(selenium_webdriver_1.By.css('a'));
                const name = await nameEl.getText();
                // Get team
                const teamEl = await cells[1].findElement(selenium_webdriver_1.By.css('span'));
                const team = await teamEl.getText();
                // Get stats
                const avg = await cells[3].getText();
                const hr = await cells[6].getText();
                const rbi = await cells[7].getText();
                const runs = await cells[5].getText();
                const sb = await cells[9].getText();
                players.push({
                    name,
                    team,
                    avg,
                    hr,
                    rbi,
                    runs,
                    sb,
                    statDate: '' // Will be set in parent function
                });
            }
            // Limit to top 50 players
            if (players.length >= 50)
                break;
        }
        return players;
    }
    catch (error) {
        console.error('Error scraping batting leaders:', error);
        return [];
    }
}
/**
 * Scrapes pitching leaders from MLB stats
 */
async function scrapePitchingLeaders(driver) {
    try {
        // Navigate to MLB pitching leaders page
        await driver.get('https://www.mlb.com/stats/pitching');
        // Wait for stats table to load
        await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('.bui-table')), 10000);
        // Find all player rows
        const playerRows = await driver.findElements(selenium_webdriver_1.By.css('.bui-table tbody tr'));
        const players = [];
        // Process each player row
        for (const row of playerRows) {
            const cells = await row.findElements(selenium_webdriver_1.By.css('td'));
            if (cells.length >= 10) {
                // Get player name
                const nameEl = await cells[0].findElement(selenium_webdriver_1.By.css('a'));
                const name = await nameEl.getText();
                // Get team
                const teamEl = await cells[1].findElement(selenium_webdriver_1.By.css('span'));
                const team = await teamEl.getText();
                // Get stats
                const era = await cells[3].getText();
                const wins = await cells[4].getText();
                const so = await cells[8].getText();
                const whip = await cells[9].getText();
                players.push({
                    name,
                    team,
                    position: 'P',
                    era,
                    wins,
                    so,
                    whip,
                    statDate: '' // Will be set in parent function
                });
            }
            // Limit to top 50 players
            if (players.length >= 50)
                break;
        }
        return players;
    }
    catch (error) {
        console.error('Error scraping pitching leaders:', error);
        return [];
    }
}
/**
 * Scrapes trend data for a specific stat category over time
 * @param statCategory The stat category to retrieve trend data for
 * @returns Promise containing trend data by month/week
 */
async function scrapeTrendData(statCategory) {
    // This function would collect data over time
    // For now, returning mock data as historical data scraping is complex
    // In a real implementation, you'd query a database of previously scraped stats
    const mockData = {
        'Batting Average': [0.268, 0.265, 0.271, 0.275, 0.269, 0.263, 0.267],
        'Home Runs': [1.15, 1.23, 1.27, 1.34, 1.29, 1.21, 1.18],
        'RBIs': [4.05, 4.18, 4.32, 4.48, 4.37, 4.25, 4.12],
        'OPS': [0.725, 0.736, 0.745, 0.758, 0.751, 0.733, 0.726],
        'ERA': [3.95, 4.02, 3.98, 3.92, 4.05, 4.14, 4.10],
        'Strikeouts': [8.8, 8.9, 9.1, 9.3, 9.2, 9.0, 8.9],
        'WHIP': [1.27, 1.25, 1.22, 1.21, 1.23, 1.26, 1.28],
        'Exit Velocity': [88.6, 88.9, 89.2, 89.4, 89.1, 88.8, 88.7],
        'Launch Angle': [12.2, 12.4, 12.7, 12.9, 12.6, 12.3, 12.2],
        'Sprint Speed': [27.0, 26.9, 26.8, 26.7, 26.8, 26.9, 27.1]
    };
    // Return the corresponding trend data or a default
    return { [statCategory]: mockData[statCategory] || [0, 0, 0, 0, 0, 0, 0] };
}
/**
 * Helper function to convert team name to team code
 */
function getTeamCodeFromName(teamName) {
    const teamMapping = {
        'Yankees': 'nyy',
        'Red Sox': 'bos',
        'Blue Jays': 'tor',
        'Orioles': 'bal',
        'Rays': 'tb',
        'Guardians': 'cle',
        'Twins': 'min',
        'Royals': 'kc',
        'Tigers': 'det',
        'White Sox': 'cws',
        'Astros': 'hou',
        'Mariners': 'sea',
        'Rangers': 'tex',
        'Angels': 'laa',
        'Athletics': 'oak',
        'Braves': 'atl',
        'Phillies': 'phi',
        'Mets': 'nym',
        'Marlins': 'mia',
        'Nationals': 'wsh',
        'Brewers': 'mil',
        'Cubs': 'chc',
        'Cardinals': 'stl',
        'Reds': 'cin',
        'Pirates': 'pit',
        'Dodgers': 'lad',
        'Padres': 'sd',
        'Giants': 'sf',
        'Diamondbacks': 'ari',
        'Rockies': 'col'
    };
    // Find the team code by looking for the team name
    for (const [key, value] of Object.entries(teamMapping)) {
        if (teamName.includes(key)) {
            return value;
        }
    }
    // Default to empty string if not found
    return '';
}
/**
 * Helper function to organize mock data by team
 */
function organizeMockDataByTeam(teamCode) {
    const teamMap = new Map();
    for (const player of MOCK_PLAYERS) {
        if (!teamMap.has(player.team)) {
            const teamCodeValue = getTeamCodeFromName(player.team);
            teamMap.set(player.team, {
                teamName: player.team,
                teamCode: teamCodeValue,
                players: []
            });
        }
        teamMap.get(player.team).players.push(player);
    }
    let results = Array.from(teamMap.values());
    // Filter by team if requested
    if (teamCode) {
        results = results.filter(team => team.teamCode === teamCode.toLowerCase());
    }
    return results;
}
