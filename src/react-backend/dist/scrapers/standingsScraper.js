"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_STANDINGS = void 0;
exports.scrapeStandings = scrapeStandings;
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
// Mock data for fallback
exports.MOCK_STANDINGS = [
    {
        division: 'American League East',
        teams: [
            { team: 'New York Yankees', wins: 92, losses: 70, pct: '.568', gb: '-', last10: '7-3', streak: 'W4' },
            { team: 'Baltimore Orioles', wins: 89, losses: 73, pct: '.549', gb: '3.0', last10: '5-5', streak: 'W1' },
            { team: 'Boston Red Sox', wins: 87, losses: 75, pct: '.537', gb: '5.0', last10: '6-4', streak: 'L1' },
            { team: 'Toronto Blue Jays', wins: 85, losses: 77, pct: '.525', gb: '7.0', last10: '4-6', streak: 'L2' },
            { team: 'Tampa Bay Rays', wins: 80, losses: 82, pct: '.494', gb: '12.0', last10: '5-5', streak: 'W2' }
        ]
    },
    {
        division: 'American League Central',
        teams: [
            { team: 'Cleveland Guardians', wins: 95, losses: 67, pct: '.586', gb: '-', last10: '6-4', streak: 'W2' },
            { team: 'Minnesota Twins', wins: 87, losses: 75, pct: '.537', gb: '8.0', last10: '5-5', streak: 'L1' },
            { team: 'Kansas City Royals', wins: 76, losses: 86, pct: '.469', gb: '19.0', last10: '4-6', streak: 'W1' },
            { team: 'Detroit Tigers', wins: 75, losses: 87, pct: '.463', gb: '20.0', last10: '5-5', streak: 'L3' },
            { team: 'Chicago White Sox', wins: 65, losses: 97, pct: '.401', gb: '30.0', last10: '3-7', streak: 'L5' }
        ]
    },
    {
        division: 'American League West',
        teams: [
            { team: 'Houston Astros', wins: 90, losses: 72, pct: '.556', gb: '-', last10: '7-3', streak: 'W3' },
            { team: 'Seattle Mariners', wins: 88, losses: 74, pct: '.543', gb: '2.0', last10: '6-4', streak: 'W2' },
            { team: 'Texas Rangers', wins: 86, losses: 76, pct: '.531', gb: '4.0', last10: '5-5', streak: 'L1' },
            { team: 'Los Angeles Angels', wins: 73, losses: 89, pct: '.451', gb: '17.0', last10: '3-7', streak: 'L4' },
            { team: 'Oakland Athletics', wins: 66, losses: 96, pct: '.407', gb: '24.0', last10: '4-6', streak: 'L2' }
        ]
    },
    {
        division: 'National League East',
        teams: [
            { team: 'Atlanta Braves', wins: 96, losses: 66, pct: '.593', gb: '-', last10: '8-2', streak: 'W4' },
            { team: 'Philadelphia Phillies', wins: 90, losses: 72, pct: '.556', gb: '6.0', last10: '6-4', streak: 'W2' },
            { team: 'New York Mets', wins: 84, losses: 78, pct: '.519', gb: '12.0', last10: '5-5', streak: 'L1' },
            { team: 'Miami Marlins', wins: 71, losses: 91, pct: '.438', gb: '25.0', last10: '4-6', streak: 'W1' },
            { team: 'Washington Nationals', wins: 65, losses: 97, pct: '.401', gb: '31.0', last10: '3-7', streak: 'L6' }
        ]
    },
    {
        division: 'National League Central',
        teams: [
            { team: 'Milwaukee Brewers', wins: 93, losses: 69, pct: '.574', gb: '-', last10: '6-4', streak: 'W2' },
            { team: 'Chicago Cubs', wins: 83, losses: 79, pct: '.512', gb: '10.0', last10: '5-5', streak: 'L2' },
            { team: 'St. Louis Cardinals', wins: 81, losses: 81, pct: '.500', gb: '12.0', last10: '4-6', streak: 'L1' },
            { team: 'Cincinnati Reds', wins: 78, losses: 84, pct: '.481', gb: '15.0', last10: '5-5', streak: 'W2' },
            { team: 'Pittsburgh Pirates', wins: 74, losses: 88, pct: '.457', gb: '19.0', last10: '3-7', streak: 'L3' }
        ]
    },
    {
        division: 'National League West',
        teams: [
            { team: 'Los Angeles Dodgers', wins: 98, losses: 64, pct: '.605', gb: '-', last10: '7-3', streak: 'W5' },
            { team: 'San Diego Padres', wins: 89, losses: 73, pct: '.549', gb: '9.0', last10: '6-4', streak: 'W1' },
            { team: 'Arizona Diamondbacks', wins: 84, losses: 78, pct: '.519', gb: '14.0', last10: '5-5', streak: 'L2' },
            { team: 'San Francisco Giants', wins: 79, losses: 83, pct: '.488', gb: '19.0', last10: '4-6', streak: 'W1' },
            { team: 'Colorado Rockies', wins: 65, losses: 97, pct: '.401', gb: '33.0', last10: '2-8', streak: 'L7' }
        ]
    }
];
/**
 * Scrapes current MLB standings data using HTTP requests and cheerio
 * @returns Promise containing division standings
 */
async function scrapeStandings() {
    try {
        console.log("Starting HTTP-based standings scraper...");
        // Try to fetch from MLB standings page
        const response = await (0, node_fetch_1.default)('https://www.mlb.com/standings', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const allDivisionStandings = [];
        // Try to find standings tables
        const standingsTables = $('.standings-table');
        console.log(`Found ${standingsTables.length} division tables`);
        if (standingsTables.length === 0) {
            console.log("No division tables found, using mock data");
            return exports.MOCK_STANDINGS;
        }
        // Process each division table
        standingsTables.each((i, table) => {
            try {
                // Get division name
                const divisionElement = $(table).find('.standings-table-wrapper__headline');
                const divisionName = divisionElement.text().trim();
                if (!divisionName) {
                    return; // Skip if no division name found
                }
                // Find all team rows
                const teamRows = $(table).find('tbody tr');
                const divisionTeams = [];
                // Process each team
                teamRows.each((j, row) => {
                    try {
                        const cells = $(row).find('td');
                        if (cells.length >= 5) {
                            // Get team name
                            const teamNameEl = $(cells[0]).find('.standings-table-team__name a');
                            let teamName = teamNameEl.text().trim();
                            // Fallback if the specific selector doesn't work
                            if (!teamName) {
                                teamName = $(cells[0]).text().trim();
                            }
                            if (!teamName)
                                return; // Skip if no team name
                            // Get W-L record and other stats
                            const wins = parseInt($(cells[1]).text().trim(), 10);
                            const losses = parseInt($(cells[2]).text().trim(), 10);
                            const pct = $(cells[3]).text().trim();
                            const gb = $(cells[4]).text().trim();
                            let last10 = '';
                            let streak = '';
                            // Some standings tables include L10 and Streak
                            if (cells.length > 7) {
                                last10 = $(cells[6]).text().trim();
                                streak = $(cells[7]).text().trim();
                            }
                            if (!isNaN(wins) && !isNaN(losses)) {
                                divisionTeams.push({
                                    team: teamName,
                                    wins,
                                    losses,
                                    pct,
                                    gb,
                                    ...(last10 ? { last10 } : {}),
                                    ...(streak ? { streak } : {})
                                });
                            }
                        }
                    }
                    catch (rowError) {
                        console.error('Error processing team row:', rowError);
                    }
                });
                if (divisionTeams.length > 0) {
                    allDivisionStandings.push({
                        division: divisionName,
                        teams: divisionTeams
                    });
                }
            }
            catch (tableError) {
                console.error('Error processing division table:', tableError);
            }
        });
        // If no valid data was scraped, return mock data
        if (allDivisionStandings.length === 0) {
            console.log("No valid standings data scraped, using mock data");
            return exports.MOCK_STANDINGS;
        }
        console.log(`Successfully scraped ${allDivisionStandings.length} divisions`);
        return allDivisionStandings;
    }
    catch (error) {
        console.error('Error scraping standings:', error);
        console.log("Returning mock standings data due to error");
        return exports.MOCK_STANDINGS;
    }
}
