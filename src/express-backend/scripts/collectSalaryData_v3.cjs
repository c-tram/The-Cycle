// Professional-grade MLB salary data collection script - TEAM APPROACH
// Scrapes team payroll pages instead of individual players (50x more efficient!)
// Usage: node src/express-backend/scripts/collectSalaryData_v3.cjs

// Load environment variables from .env file
require('dotenv').config();

const Redis = require('ioredis');
const cheerio = require('cheerio');
const https = require('https');

// Simple Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

/**
 * Makes HTTP requests with basic error handling
 */
function makeRequest(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (maxRedirects > 0 && response.headers.location) {
          return resolve(makeRequest(response.headers.location, maxRedirects - 1));
        } else {
          return reject(new Error(`Too many redirects: ${response.statusCode}`));
        }
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP Error: ${response.statusCode}`));
      }

      let data = '';
      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Parse salary string into numeric value - enhanced for arbitration/rookie contracts
 */
function parseSalaryString(salaryText) {
  if (!salaryText || typeof salaryText !== 'string') return 0;
  
  // Clean the text and handle various formats
  let cleaned = salaryText.replace(/[$,\s]/g, '');
  
  // Handle common salary patterns
  if (cleaned.includes('M')) {
    const num = parseFloat(cleaned.replace('M', ''));
    return Math.round(num * 1000000);
  } else if (cleaned.includes('K')) {
    const num = parseFloat(cleaned.replace('K', ''));
    return Math.round(num * 1000);
  } else if (cleaned.includes('million')) {
    const match = cleaned.match(/(\d+\.?\d*)/);
    if (match) {
      return Math.round(parseFloat(match[1]) * 1000000);
    }
  } else if (cleaned.includes('thousand')) {
    const match = cleaned.match(/(\d+\.?\d*)/);
    if (match) {
      return Math.round(parseFloat(match[1]) * 1000);
    }
  } else {
    // Try to extract any number (for cases like "740000" or "1.2M")
    const match = cleaned.match(/(\d+\.?\d*)/);
    if (match) {
      const num = parseFloat(match[1]);
      // If it's a large number (>50000), assume it's already in dollars
      // If it's small (<50), assume it's in millions
      if (num > 50000) {
        return Math.round(num);
      } else if (num > 0.5 && num < 50) {
        return Math.round(num * 1000000); // Assume millions
      }
      return Math.round(num);
    }
  }
  
  return 0;
}

/**
 * Get team city name for Spotrac URLs
 */
function getTeamCity(teamAbbr) {
  const cityMap = {
    'ARI': 'arizona-diamondbacks',
    'AZ': 'arizona-diamondbacks',      // Alternative for Arizona
    'ATL': 'atlanta-braves', 
    'BAL': 'baltimore-orioles',
    'BOS': 'boston-red-sox',
    'CHC': 'chicago-cubs',
    'CWS': 'chicago-white-sox',
    'CIN': 'cincinnati-reds',
    'CLE': 'cleveland-guardians',
    'COL': 'colorado-rockies',
    'DET': 'detroit-tigers',
    'HOU': 'houston-astros',
    'KC': 'kansas-city-royals',
    'LAA': 'los-angeles-angels',
    'LAD': 'los-angeles-dodgers',
    'MIA': 'miami-marlins',
    'MIL': 'milwaukee-brewers',
    'MIN': 'minnesota-twins',
    'NYM': 'new-york-mets',
    'NYY': 'new-york-yankees',
    'OAK': 'athletics',               // Fixed: should be 'athletics' not 'oakland-athletics'
    'ATH': 'athletics',               // Alternative for Oakland Athletics
    'PHI': 'philadelphia-phillies',
    'PIT': 'pittsburgh-pirates',
    'SD': 'san-diego-padres',
    'SF': 'san-francisco-giants',
    'SEA': 'seattle-mariners',
    'STL': 'st-louis-cardinals',
    'TB': 'tampa-bay-rays',
    'TEX': 'texas-rangers',
    'TOR': 'toronto-blue-jays',
    'WAS': 'washington-nationals',
    'WSH': 'washington-nationals'     // Alternative for Washington
  };
  
  return cityMap[teamAbbr] || 'mlb';
}

/**
 * Scrape all player salaries for a team from Spotrac cap page
 * This is the efficient approach - one request gets all team salaries!
 */
async function scrapeTeamPayrollFromSpotrac(team, year) {
  try {
    const teamCity = getTeamCity(team);
    // Use the cap page URL which has the structured table
    const url = `https://www.spotrac.com/mlb/${teamCity}/cap/_/year/${year}`;
    
    console.log(`🔍 Fetching team payroll from: ${url}`);
    
    const html = await makeRequest(url);
    const $ = cheerio.load(html);
    
    console.log(`📄 Page title: ${$('title').text()}`);
    
    const players = [];
    
    // Process both active roster and injured list tables
    const tableSelectors = [
      'table#table_active',          // Active roster table
      'table#table_injured',         // Injured list table  
      'table.dataTable-active',      // DataTable class
      'table.dataTable',             // Generic DataTable
      'table:contains("Payroll Salary")', // Contains salary column
      'table:contains("Player")'     // Contains player column
    ];
    
    for (const selector of tableSelectors) {
      const table = $(selector);
      if (table.length > 0) {
        console.log(`✅ Found table with selector: ${selector} (${table.find('tbody tr').length} rows)`);
        
        // Process this table
        processPayrollTable($, table, team, year, players, url);
      }
    }
    
    if (players.length === 0) {
      console.log(`❌ No salary data found for ${team}`);
      console.log(`📊 Available tables: ${$('table').length}`);
      
      // Debug: show available tables
      $('table').each((i, table) => {
        const tableHtml = $(table).html();
        if (tableHtml && tableHtml.includes('$')) {
          console.log(`   Table ${i} has salary data`);
          const rows = $(table).find('tr').length;
          console.log(`   - ${rows} rows`);
        }
      });
    }
    
    return players;
  } catch (error) {
    console.error(`❌ Error processing ${team} payroll data:`, error.message);
    return [];
  }
}

/**
 * Process a single payroll table (active or injured)
 */
function processPayrollTable($, payrollTable, team, year, players, url) {
    
    // Process each row in the table body (skip header)
    payrollTable.find('tbody tr').each((rowIndex, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 6) return; // Skip rows without enough columns
      
      // Check if this is an injured player (IL, disabled list, etc.)
      const rowText = $row.text().toLowerCase();
      const isInjuredPlayer = rowText.includes('il') || 
                             rowText.includes('disabled') || 
                             rowText.includes('injured') ||
                             rowText.includes('60-day') ||
                             rowText.includes('15-day') ||
                             $row.hasClass('injured') ||
                             $row.hasClass('il') ||
                             $row.find('.injured').length > 0;
      
      try {
        // Based on your HTML structure:
        // Column 0: Player name (inside <a> tag)
        // Column 5: Payroll Salary (data-sort attribute has numeric value)
        
        // Extract player name from first column
        let playerName = null;
        const playerCell = $(cells[0]);
        const playerLink = playerCell.find('a');
        
        if (playerLink.length > 0) {
          playerName = playerLink.text().trim();
        } else {
          // Fallback to cell text, remove the hidden sort span
          const hiddenSpan = playerCell.find('span.d-none');
          if (hiddenSpan.length > 0) {
            hiddenSpan.remove();
          }
          playerName = playerCell.text().trim();
        }
        
        // Clean up player name
        if (playerName) {
          playerName = playerName
            .replace(/^\d+\.?\s*/, '') // Remove leading numbers
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Extract salary from multiple possible columns
        let salary = null;
        
        // Try multiple salary columns in order of preference
        const salaryColumns = [5, 4, 3, 6, 7]; // Column 5 is "Payroll Salary", but check others too
        
        for (const colIndex of salaryColumns) {
          if (colIndex < cells.length) {
            const salaryCell = $(cells[colIndex]);
            
            // First try data-sort attribute (most reliable)
            const salaryValue = salaryCell.attr('data-sort');
            if (salaryValue && !isNaN(parseInt(salaryValue)) && parseInt(salaryValue) > 0) {
              salary = parseInt(salaryValue);
              console.log(`   💰 Found salary in column ${colIndex} (data-sort): $${salary.toLocaleString()}`);
              break;
            }
            
            // Then try parsing text content
            const salaryText = salaryCell.text().trim();
            if (salaryText && (salaryText.includes('$') || salaryText.includes('M') || salaryText.includes('K'))) {
              const parsedSalary = parseSalaryString(salaryText);
              if (parsedSalary > 0) {
                salary = parsedSalary;
                console.log(`   💰 Found salary in column ${colIndex} (text): "${salaryText}" = $${salary.toLocaleString()}`);
                break;
              }
            }
          }
        }
        
        // If still no salary found, debug all columns
        if (!salary) {
          console.log(`   🔍 DEBUG - No salary found for ${playerName}, checking all columns:`);
          cells.each((i, cell) => {
            const cellText = $(cell).text().trim().substring(0, 30);
            const dataSort = $(cell).attr('data-sort');
            console.log(`     Column ${i}: "${cellText}" (data-sort: ${dataSort})`);
          });
        }
        
        // Validate and store the data (include injured players)
        if (playerName && 
            playerName.length > 2 && 
            salary && 
            salary > 0 && 
            salary < 100000000 && // Reasonable max salary
            !playerName.toLowerCase().includes('player') &&
            !playerName.toLowerCase().includes('total')) {
          
          const statusNote = isInjuredPlayer ? ' (Injured List)' : '';
          console.log(`   ✅ Found: ${playerName}${statusNote} - $${salary.toLocaleString()}`);
          
          players.push({
            player: playerName,
            team: team,
            year: year,
            salary: salary,
            status: isInjuredPlayer ? 'injured' : 'active',
            source: 'spotrac-cap',
            sourceUrl: url,
            scrapedAt: new Date().toISOString()
          });
        } else {
          console.log(`   ⚠️  Skipped row ${rowIndex}: name="${playerName}", salary=${salary}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing row ${rowIndex}: ${error.message}`);
      }
    });
    
    console.log(`✅ Scraped ${players.length} players from ${team} payroll`);
    
    if (players.length === 0) {
      console.log(`🔍 DEBUG: No players found. Let's inspect the table structure...`);
      
      // Debug the table structure
      payrollTable.find('tbody tr').first().find('td').each((i, cell) => {
        const cellText = $(cell).text().trim().substring(0, 50);
        const dataSort = $(cell).attr('data-sort');
        console.log(`   Column ${i}: "${cellText}" (data-sort: ${dataSort})`);
      });
    }
    
    return players;
    
  }


/**
 * Get teams that already have salary data to avoid re-scraping
 */
async function getTeamsWithSalaryData(year) {
  try {
    console.log(`🔍 Checking which teams already have salary data for ${year}...`);
    
    const salaryKeys = await redisClient.keys(`salary:*-${year}`);
    const teamsWithData = new Set();
    
    for (const key of salaryKeys) {
      // Extract team from key: "salary:HOU-Jose_Altuve-2025"
      const keyParts = key.split(':')[1].split('-');
      if (keyParts.length >= 3) {
        const team = keyParts[0];
        teamsWithData.add(team);
      }
    }
    
    const teamList = Array.from(teamsWithData).sort();
    console.log(`💾 Teams with existing salary data (${teamList.length}): ${teamList.join(', ')}`);
    console.log(`📊 Total salary records found: ${salaryKeys.length}`);
    
    return teamList;
    
  } catch (error) {
    console.error('❌ Error checking existing salary data:', error);
    return [];
  }
}

/**
 * Get all unique teams from Redis player data
 */
async function getAllTeamsFromRedis(year) {
  try {
    console.log(`🔍 Finding unique teams for ${year}...`);
    
    const keys = await redisClient.keys(`player:*-${year}:season`);
    const teams = new Set();
    
    for (const key of keys) {
      // Extract team from key: "player:HOU-Jose_Altuve-2025:season"
      const keyParts = key.split(':')[1].split('-');
      if (keyParts.length >= 3) {
        const team = keyParts[0];
        teams.add(team);
      }
    }
    
    const teamList = Array.from(teams).sort();
    console.log(`📊 Found ${teamList.length} teams: ${teamList.join(', ')}`);
    
    return teamList;
    
  } catch (error) {
    console.error('❌ Error getting teams from Redis:', error);
    return [];
  }
}

/**
 * Normalize player names for matching (remove accents, hyphens, case, etc)
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[-']/g, '') // Remove hyphens and apostrophes
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase();
}

/**
 * Store salary data in Redis using The Cycle's key structure
 * Also updates player season and team season keys with salary
 */
async function storeSalaryData(playerName, team, year, salaryData, dryRun = false) {
  try {
    if (dryRun) {
      console.log(`🧪 DRY RUN: Would store salary data for ${playerName}`);
      return true;
    }

    // Use The Cycle's key structure: salary:TEAM-Player_Name-YEAR
    const playerKey = `${team}-${playerName.replace(/\s+/g, '_')}-${year}`;
    const salaryKey = `salary:${playerKey}`;

    // Store the salary data (legacy key)
    await redisClient.set(salaryKey, JSON.stringify(salaryData));
    console.log(`✅ Successfully stored: ${salaryKey}`);

    // --- Update player season key with salary ---
    // Find the correct player season key (handle accent/hyphen issues)
    const playerSeasonKeys = await redisClient.keys(`player:${team}-*-${year}:season`);
    let matchedPlayerKey = null;
    let normalizedTarget = normalizeName(playerName);
    for (const key of playerSeasonKeys) {
      // Extract player name from key
      const keyParts = key.split(':')[1].split('-');
      if (keyParts.length >= 3) {
        const keyName = keyParts.slice(1, -1).join('-').replace(/_/g, ' ');
        if (normalizeName(keyName) === normalizedTarget) {
          matchedPlayerKey = key;
          break;
        }
      }
    }
    if (matchedPlayerKey) {
      const playerSeasonRaw = await redisClient.get(matchedPlayerKey);
      if (playerSeasonRaw) {
        let playerSeason = {};
        try { playerSeason = JSON.parse(playerSeasonRaw); } catch {}
        playerSeason.salary = salaryData.salary;
        await redisClient.set(matchedPlayerKey, JSON.stringify(playerSeason));
        console.log(`💸 Updated player season key with salary: ${matchedPlayerKey}`);
      }
    } else {
      console.log(`⚠️  Could not find player season key for ${playerName} (${team})`);
    }

    // --- Update team season key with total salary ---
    const teamSeasonKey = `team:${team}:${year}:season`;
    let teamSeasonRaw = await redisClient.get(teamSeasonKey);
    let teamSeason = {};
    if (teamSeasonRaw) {
      try { teamSeason = JSON.parse(teamSeasonRaw); } catch {}
    }
    // Sum up all player salaries for this team/year
    const allPlayerKeys = await redisClient.keys(`player:${team}-*-${year}:season`);
    let totalSalary = 0;
    for (const key of allPlayerKeys) {
      const raw = await redisClient.get(key);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          if (obj.salary && typeof obj.salary === 'number') {
            totalSalary += obj.salary;
          }
        } catch {}
      }
    }
    teamSeason.salary = totalSalary;
    await redisClient.set(teamSeasonKey, JSON.stringify(teamSeason));
    console.log(`💰 Updated team season key with total salary: ${teamSeasonKey} = $${totalSalary.toLocaleString()}`);

    return true;
  } catch (error) {
    console.error(`❌ Error storing salary data for ${playerName}:`, error.message);
    return false;
  }
}

/**
 * Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to collect salary data using efficient team-based approach
 */
async function collectAllSalaryDataEfficient(year = 2025, dryRun = false) {
  console.log(`🚀 Starting EFFICIENT salary data collection for ${year}`);
  console.log(`🧪 Dry run mode: ${dryRun ? 'Yes (no data will be stored)' : 'No (will store to Redis)'}`);
  console.log(`🎯 Strategy: Team payroll scraping (30 teams vs 1500+ individual requests)`);
  
  try {
    // Get all teams from Redis
    const allTeams = await getAllTeamsFromRedis(year);
    
    if (allTeams.length === 0) {
      console.log('❌ No teams found. Exiting...');
      return;
    }
    
    // Check which teams already have salary data
    const teamsWithSalaryData = await getTeamsWithSalaryData(year);
    
    // Filter out teams that already have salary data (unless it's a dry run)
    let teamsToProcess;
    if (dryRun) {
      // In dry run mode, limit to first 2 teams for testing
      teamsToProcess = allTeams.slice(0, 2);
      console.log(`🧪 DRY RUN: Testing with first 2 teams only (${teamsToProcess.join(', ')})`);
    } else {
      // Filter out teams that already have data
      teamsToProcess = allTeams.filter(team => !teamsWithSalaryData.includes(team));
      
      if (teamsToProcess.length === 0) {
        console.log('🎉 All teams already have salary data! Nothing to scrape.');
        console.log(`✅ Complete teams (${teamsWithSalaryData.length}): ${teamsWithSalaryData.join(', ')}`);
        return;
      }
      
      console.log(`\n📋 PROCESSING PLAN:`);
      console.log(`   🎯 Teams to scrape (${teamsToProcess.length}): ${teamsToProcess.join(', ')}`);
      console.log(`   ✅ Teams already done (${teamsWithSalaryData.length}): ${teamsWithSalaryData.join(', ')}`);
      console.log(`   📊 Progress: ${teamsWithSalaryData.length}/${allTeams.length} teams complete\n`);
    }
    
    let totalCollected = 0;
    let totalFailed = 0;
    let requestCount = 0;
    
    // Concurrent team processing - start a new team every 3 seconds
    console.log(`\n🚀 MULTITHREADED PROCESSING: Starting teams with 3-second intervals...`);
    
    const teamPromises = [];
    const teamResults = [];
    
    for (let teamIndex = 0; teamIndex < teamsToProcess.length; teamIndex++) {
      const team = teamsToProcess[teamIndex];
      const startDelay = teamIndex * 3000; // 3 seconds between team starts
      
      console.log(`📅 Team ${teamIndex + 1}/${teamsToProcess.length}: ${team} will start in ${startDelay/1000}s`);
      
      // Create a promise for each team that starts after a delay
      const teamPromise = new Promise(async (resolve) => {
        try {
          // Wait for the staggered start time
          await sleep(startDelay);
          
          const progress = `[Team ${teamIndex + 1}/${teamsToProcess.length}]`;
          console.log(`\n🏃‍♂️ ${progress} Starting ${team} processing...`);
          
          // Scrape team payroll data
          let teamPayrollData;
          try {
            teamPayrollData = await scrapeTeamPayrollFromSpotrac(team, year);
            console.log(`${progress} ✅ Found payroll data for ${teamPayrollData.length} players on ${team}`);
          } catch (error) {
            if (error.message.includes('403') || error.message.includes('forbidden')) {
              console.log(`${progress} 🚫 Spotrac blocked access (403 error) for ${team}`);
              return resolve({ team, success: 0, failed: 1, requests: 1, error: '403 blocked' });
            } else {
              console.error(`${progress} ❌ Error scraping ${team}:`, error.message);
              return resolve({ team, success: 0, failed: 1, requests: 1, error: error.message });
            }
          }
          
          if (teamPayrollData.length === 0) {
            console.log(`${progress} ❌ No payroll data found for ${team}`);
            return resolve({ team, success: 0, failed: 1, requests: 1, error: 'No data found' });
          }
          
          // Small delay before processing to appear more natural
          const processingDelay = 500 + Math.random() * 1000; // 0.5-1.5s random delay
          await sleep(processingDelay);
          
          // Process all players for this team concurrently
          const playerPromises = teamPayrollData.map(async (playerData) => {
            try {
              const stored = await storeSalaryData(
                playerData.player, 
                playerData.team, 
                playerData.year, 
                playerData, 
                dryRun
              );
              
              if (stored) {
                if (dryRun) {
                  console.log(`   🧪 ${team}: Would store ${playerData.player}: $${playerData.salary.toLocaleString()}`);
                } else {
                  console.log(`   ✅ ${team}: Stored ${playerData.player}: $${playerData.salary.toLocaleString()}`);
                }
                return { success: true, player: playerData.player };
              } else {
                return { success: false, player: playerData.player, error: 'Store failed' };
              }
            } catch (error) {
              console.error(`   ❌ ${team}: Error storing ${playerData.player}:`, error.message);
              return { success: false, player: playerData.player, error: error.message };
            }
          });
          
          // Wait for all players in this team to complete
          const playerResults = await Promise.all(playerPromises);
          
          const teamSuccesses = playerResults.filter(r => r.success).length;
          const teamFailures = playerResults.filter(r => !r.success).length;
          
          console.log(`${progress} 🏁 ${team} completed: ${teamSuccesses} stored, ${teamFailures} failed`);
          
          resolve({ 
            team, 
            success: teamSuccesses, 
            failed: teamFailures, 
            requests: 1,
            playerCount: teamPayrollData.length
          });
          
        } catch (error) {
          console.error(`❌ Fatal error processing team ${team}:`, error.message);
          resolve({ team, success: 0, failed: 1, requests: 1, error: error.message });
        }
      });
      
      teamPromises.push(teamPromise);
    }
    
    console.log(`\n⏳ All ${teamsToProcess.length} teams queued. Processing will complete as teams finish...`);
    
    // Wait for all teams to complete
    const allResults = await Promise.all(teamPromises);
    
    // Aggregate results
    for (const result of allResults) {
      totalCollected += result.success;
      totalFailed += result.failed;
      requestCount += result.requests;
      teamResults.push(result);
    }
    
    // Display final results
    console.log(`\n${'='.repeat(100)}`);
    console.log(`🎊 MULTITHREADED SALARY COLLECTION COMPLETE!`);
    console.log(`${'='.repeat(100)}`);
    
    // Show team-by-team results
    teamResults.forEach(result => {
      const status = result.error ? `❌ ${result.error}` : `✅ ${result.success} players`;
      console.log(`   ${result.team}: ${status}`);
    });
    
    console.log(`\n📊 FINAL STATISTICS:`);
    console.log(`   ✅ ${dryRun ? 'Would collect' : 'Collected'}: ${totalCollected} players`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   � Teams processed: ${teamsToProcess.length}/${allTeams.length}`);
    console.log(`   ⚡ Total processing time: ~${Math.max(teamsToProcess.length * 3, 30)}s (vs ~${teamsToProcess.length * 6}s sequential)`);
    console.log(`   🌐 Total requests made: ${requestCount} (vs ${totalCollected + totalFailed} individual requests)`);
    console.log(`   📈 Efficiency gain: ~${Math.round((totalCollected + totalFailed) / requestCount)}x fewer requests!`);
    
    if (!dryRun) {
      // Get updated count of teams with salary data
      const finalTeamsWithData = await getTeamsWithSalaryData(year);
      const totalProgress = finalTeamsWithData.length;
      console.log(`   🏆 Total teams complete: ${totalProgress}/${allTeams.length} (${Math.round(totalProgress/allTeams.length*100)}%)`);
      
      if (totalProgress === allTeams.length) {
        console.log(`   🎊 ALL TEAMS COMPLETE! Salary data collection finished.`);
      } else {
        const remaining = allTeams.filter(team => !finalTeamsWithData.includes(team));
        console.log(`   🔄 Teams still needed: ${remaining.join(', ')}`);
      }
    }
    
    if (dryRun) {
      console.log(`\n🧪 DRY RUN COMPLETE - No data was actually stored to Redis`);
      console.log(`   To run for real: node scripts/collectSalaryData_v3.cjs ${year}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error in salary collection:', error);
  } finally {
    await redisClient.quit();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

if (require.main === module) {
  const year = process.argv[2] ? parseInt(process.argv[2]) : 2025;
  const dryRun = process.argv[3] === 'dry-run';
  
  console.log(`📋 Arguments parsed:`);
  console.log(`   Year: ${year}`);
  console.log(`   Dry run: ${dryRun}`);
  
  collectAllSalaryDataEfficient(year, dryRun).catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  collectAllSalaryDataEfficient,
  scrapeTeamPayrollFromSpotrac,
  getAllTeamsFromRedis,
  storeSalaryData
};
