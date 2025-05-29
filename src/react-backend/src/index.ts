import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { scrapeStandings } from './scrapers/standingsScraper';
import { scrapePlayerStats, scrapeTrendData } from './scrapers/httpPlayerStatsScraper';
import { scrapeGames } from './scrapers/gamesScraper';
import { fetchStandingsFromAPI, fetchGamesFromAPI } from './scrapers/mlbStatsApiService';
import { storeData, retrieveData, calculateDailyTrends } from './services/dataService';
import schedule from 'node-schedule';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Use absolute path for static files (works in Docker and locally)
app.use(express.static(path.join(__dirname, '../public')));

// Cache data for performance
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<any>> = {};

// Helper function to check if cache is valid
function isCacheValid(key: string): boolean {
  const entry = cache[key];
  if (!entry) return false;
  
  const now = Date.now();
  return now - entry.timestamp < CACHE_TTL;
}

// Map team abbreviations to Baseball Savant team IDs
const TEAM_ID_MAP: Record<string, number> = {
  ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
  hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
  nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
  tex: 140, tor: 141, was: 120, wsh: 120, cws: 145, chw: 145  // Chicago White Sox
};

// Team names mapping
const TEAMS = [
  { code: 'nyy', name: 'New York Yankees' },
  { code: 'bos', name: 'Boston Red Sox' },
  { code: 'tor', name: 'Toronto Blue Jays' },
  { code: 'bal', name: 'Baltimore Orioles' },
  { code: 'tb', name: 'Tampa Bay Rays' },
  { code: 'cle', name: 'Cleveland Guardians' },
  { code: 'min', name: 'Minnesota Twins' },
  { code: 'kc', name: 'Kansas City Royals' },
  { code: 'det', name: 'Detroit Tigers' },
  { code: 'cws', name: 'Chicago White Sox' },
  { code: 'hou', name: 'Houston Astros' },
  { code: 'sea', name: 'Seattle Mariners' },
  { code: 'tex', name: 'Texas Rangers' },
  { code: 'laa', name: 'Los Angeles Angels' },
  { code: 'oak', name: 'Oakland Athletics' },
  { code: 'atl', name: 'Atlanta Braves' },
  { code: 'phi', name: 'Philadelphia Phillies' },
  { code: 'nym', name: 'New York Mets' },
  { code: 'mia', name: 'Miami Marlins' },
  { code: 'wsh', name: 'Washington Nationals' },
  { code: 'mil', name: 'Milwaukee Brewers' },
  { code: 'chc', name: 'Chicago Cubs' },
  { code: 'stl', name: 'St. Louis Cardinals' },
  { code: 'cin', name: 'Cincinnati Reds' },
  { code: 'pit', name: 'Pittsburgh Pirates' },
  { code: 'lad', name: 'Los Angeles Dodgers' },
  { code: 'sd', name: 'San Diego Padres' },
  { code: 'sf', name: 'San Francisco Giants' },
  { code: 'ari', name: 'Arizona Diamondbacks' },
  { code: 'col', name: 'Colorado Rockies' }
];

// API route for standings
app.get('/api/standings', (req, res) => {
  (async () => {
    try {
      const cacheKey = 'standings';
      
      // Check cache first
      if (isCacheValid(cacheKey)) {
        return res.json(cache[cacheKey].data);
      }
      
      try {
        // Fetch fresh data from MLB Stats API
        const standings = await fetchStandingsFromAPI();
        
        // Store in cache
        cache[cacheKey] = {
          data: standings,
          timestamp: Date.now()
        };
        
        res.json(standings);
      } catch (apiErr) {
        console.error('Error fetching standings from API, falling back to scraper:', apiErr);
        try {
          // Fallback to web scraping if API fails
          const standings = await scrapeStandings();
          
          cache[cacheKey] = {
            data: standings,
            timestamp: Date.now()
          };
          
          res.json(standings);
        } catch (scrapeErr) {
          console.error('Error scraping standings, using mock data:', scrapeErr);
          // If both API and scraper fail, return mock data
          const mockData = require('./scrapers/standingsScraper').MOCK_STANDINGS;
          res.json(mockData);
        }
      }
    } catch (err: any) {
      console.error('Error in /api/standings:', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

// API route for trends data
app.get('/api/trends', (req, res) => {
  (async () => {
    try {
      const statCategory = req.query.stat as string || 'Batting Average';
      const cacheKey = `trends-${statCategory}`;
      
      // Check cache first
      if (isCacheValid(cacheKey)) {
        return res.json(cache[cacheKey].data);
      }
      
      // Fetch fresh data
      const trendsData = await scrapeTrendData(statCategory);
      
      // Store in cache
      cache[cacheKey] = {
        data: trendsData,
        timestamp: Date.now()
      };
      
      res.json(trendsData);
    } catch (err: any) {
      console.error('Error in /api/trends:', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

// API route for games (recent and upcoming)
app.get('/api/games', (req, res) => {
  (async () => {
    try {
      const cacheKey = 'games';
      
      // Check cache first (shorter TTL for games)
      if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 30 * 60 * 1000)) { // 30 minutes
        return res.json(cache[cacheKey].data);
      }
      
      try {
        // Fetch fresh data from MLB Stats API
        const gamesData = await fetchGamesFromAPI();
        
        // Store in cache
        cache[cacheKey] = {
          data: gamesData,
          timestamp: Date.now()
        };
        
        res.json(gamesData);
      } catch (apiErr) {
        console.error('Error fetching games from API, falling back to scraper:', apiErr);
        try {
          // Fallback to web scraping if API fails
          const gamesData = await scrapeGames();
          
          cache[cacheKey] = {
            data: gamesData,
            timestamp: Date.now()
          };
          
          res.json(gamesData);
        } catch (scrapeErr) {
          console.error('Error scraping games, using mock data:', scrapeErr);
          // If both fail, return basic mock data
          const mockGamesData = {
            recent: [
              { homeTeam: "New York Yankees", homeTeamCode: "nyy", homeScore: 5, awayTeam: "Boston Red Sox", awayTeamCode: "bos", awayScore: 3, date: "2025-05-27", status: "completed" }
            ],
            upcoming: [
              { homeTeam: "Los Angeles Dodgers", homeTeamCode: "lad", awayTeam: "San Francisco Giants", awayTeamCode: "sf", date: "2025-05-28", time: "7:05 PM", status: "scheduled" }
            ]
          };
          res.json(mockGamesData);
        }
      }
    } catch (err: any) {
      console.error('Error in /api/games:', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

// Example: /api/roster?team=nyy&statType=hitting&period=season
app.get('/api/roster', (req, res) => {
  (async () => {
    const teamAbbr = (req.query.team as string)?.toLowerCase() || 'nyy';
    const requestedStatType = (req.query.statType as string)?.toLowerCase() || 'hitting';
    const season = (req.query.season as string) || '2025';
    const period = (req.query.period as string)?.toLowerCase() || 'season';
    
    // Normalize statType - 'batting' should be treated as 'hitting' for MLB API
    const statType = requestedStatType === 'batting' ? 'hitting' : requestedStatType;
    
    const teamId = TEAM_ID_MAP[teamAbbr];
    
    console.log(`API Request - Team: ${teamAbbr}, RequestedStatType: ${requestedStatType}, NormalizedStatType: ${statType}, Period: ${period}, TeamId: ${teamId}`);
    
    if (!teamId) {
      console.error(`Invalid team abbreviation: ${teamAbbr}`);
      res.status(400).json({ error: `Invalid or unsupported team abbreviation: ${teamAbbr}` });
      return;
    }

    try {
      // First try the new MLB Stats API approach for more reliable data
      console.log(`Attempting to fetch data via MLB Stats API for ${teamAbbr.toUpperCase()}...`);
      
      try {
        const apiData = await fetchTeamRosterFromAPI(teamAbbr, period, statType as 'hitting' | 'pitching');
        console.log(`✅ Successfully fetched data via MLB Stats API for ${teamAbbr.toUpperCase()}`);
        console.log(`✅ API Data sample:`, apiData[0]?.players?.slice(0, 2));
        res.json(apiData);
        return;
      } catch (apiError: any) {
        console.error(`❌ MLB Stats API failed for ${teamAbbr}:`, apiError.message);
        console.error(`❌ Full API error:`, apiError);
        console.log(`🔄 Falling back to Baseball Savant scraping...`);
        // Continue to fallback scraping method
      }

      // Fallback to original Baseball Savant scraping method
      console.log(`Falling back to Baseball Savant scraping for ${teamAbbr.toUpperCase()}...`);
      // Use HTTP-based scraping for roster data instead of Selenium
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };

      // Build URL based on time period
      let url = `https://baseballsavant.mlb.com/team/${teamId}`;
      const urlParams = new URLSearchParams();
      
      // Add time period parameter
      const currentDate = new Date();
      if (period === '1day') {
        const yesterday = new Date(currentDate);
        yesterday.setDate(currentDate.getDate() - 1);
        urlParams.append('startDate', yesterday.toISOString().split('T')[0]);
        urlParams.append('endDate', currentDate.toISOString().split('T')[0]);
      } else if (period === '7day') {
        const weekAgo = new Date(currentDate);
        weekAgo.setDate(currentDate.getDate() - 7);
        urlParams.append('startDate', weekAgo.toISOString().split('T')[0]);
        urlParams.append('endDate', currentDate.toISOString().split('T')[0]);
      } else if (period === '30day') {
        const monthAgo = new Date(currentDate);
        monthAgo.setDate(currentDate.getDate() - 30);
        urlParams.append('startDate', monthAgo.toISOString().split('T')[0]);
        urlParams.append('endDate', currentDate.toISOString().split('T')[0]);
      } else {
        // season - use full season
        urlParams.append('season', season);
      }
      
      if (statType === 'pitching') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&${urlParams.toString()}`;
      } else if (statType === 'hitting') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?${urlParams.toString()}`;
      }

      console.log(`Fetching data from URL: ${url}`);

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        console.warn(`Baseball Savant returned ${response.status} for team ${teamAbbr}.`);
        res.status(response.status).json({ 
          error: `Data not available for ${TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase()} (${period}). Please try a different time period or team.`,
          team: teamAbbr,
          period: period,
          httpStatus: response.status
        });
        return;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Parse the statcast table
      const tableId = statType === 'pitching' ? '#statcastPitching' : '#statcastHitting';
      const table = $(`${tableId} .table-savant table`);
      
      if (table.length === 0) {
        // No table found - data not available
        res.status(404).json({ 
          error: `Statistical data not available for ${TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase()} (${period}, ${statType}). The team may not have played during this period or data may not be updated yet.`,
          team: teamAbbr,
          period: period,
          statType: statType
        });
        return;
      }

      console.log(`Found table for ${statType}, extracting player data...`);

      // Extract headers
      const statHeaders: string[] = [];
      table.find('thead tr th').each((i, element) => {
        if (i >= 2) { // Skip first two columns (name, season)
          const headerText = $(element).text().trim();
          if (headerText) {
            statHeaders.push(headerText);
          }
        }
      });

      console.log(`Headers found: ${statHeaders.join(', ')}`);

      // Extract player data - be more selective about which rows to include
      const statcastData: any[] = [];
      const playerNames = new Set(); // Track unique player names to avoid duplicates
      
      table.find('tbody tr').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        // More strict filtering: check if row has proper structure and is not a header or summary row
        if (cells.length >= 8) { // Ensure minimum number of stat columns
          const playerName = cells.eq(0).find('b').text().trim() || cells.eq(0).text().trim();
          const seasonVal = cells.eq(1).text().trim();
          
          // Skip rows without proper player names or that look like headers/summaries
          if (!playerName || 
              playerName.toLowerCase().includes('total') || 
              playerName.toLowerCase().includes('average') ||
              playerName.toLowerCase().includes('team') ||
              playerName.length < 3 ||
              /^\d+$/.test(playerName) || // Skip numeric-only "names"
              /^[A-Z]{2,}$/.test(playerName) || // Skip all-caps abbreviations
              seasonVal === '' || 
              seasonVal === '-' ||
              playerNames.has(playerName)) { // Skip duplicates
            return; // Skip this row
          }
          
          const stats: string[] = [];
          for (let j = 2; j < Math.min(cells.length, 15); j++) { // Limit to reasonable number of columns
            const statValue = cells.eq(j).text().trim();
            stats.push(statValue);
          }
          
          // Only add if we have a reasonable number of stats and valid season
          if (stats.length >= 8 && seasonVal.match(/^\d{4}$/)) {
            playerNames.add(playerName); // Track this player name
            statcastData.push({
              name: playerName,
              season: seasonVal,
              stats: stats
            });
            console.log(`Added player: ${playerName} with ${stats.length} stats: [${stats.slice(0, 5).join(', ')}...]`);
          }
        }
      });

      console.log(`Total unique players extracted: ${statcastData.length}`);

      if (statcastData.length === 0) {
        res.status(404).json({ 
          error: `No ${statType} data found for ${TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase()} in season: ${season}.`,
          team: teamAbbr,
          period: period,
          statType: statType
        });
        return;
      }

      // Map the stats array to meaningful property names
      const mappedPlayers = statcastData.map(player => {
        const stats = player.stats || [];
        
        console.log(`Mapping stats for ${player.name}: [${stats.slice(0, 8).join(', ')}...]`);
        
        // For hitting stats (default), map common stats
        if (statType === 'hitting') {
          return {
            name: player.name,
            team: teamAbbr.toUpperCase(),
            position: 'N/A', // Baseball Savant doesn't provide position in this table
            avg: stats[0] || '.000',    // Batting average (usually first stat column)
            hr: stats[1] || '0',        // Home runs  
            rbi: stats[2] || '0',       // RBIs
            runs: stats[3] || '0',      // Runs
            sb: stats[4] || '0',        // Stolen bases
            obp: stats[5] || '.000',    // On-base percentage
            slg: stats[6] || '.000',    // Slugging percentage
            ops: stats[7] || '.000',    // OPS
            season: player.season,
            statType: 'hitting'
          };
        } else {
          // For pitching stats - correct column mapping for Baseball Savant table structure
          // Table structure: Player(0), Season(1), Team(2), G(3), GS(4), W(5), L(6), SV(7), IP(8), H(9), ER(10), HR(11), BB(12), SO(13), ERA(14), WHIP(15), ...
          // stats array starts from column 2, so: stats[0]=Team, stats[1]=G, stats[2]=GS, stats[3]=W, etc.
          return {
            name: player.name,
            team: teamAbbr.toUpperCase(),
            position: 'P',
            era: stats[12] || '0.00',   // ERA is at column 14, so stats[12] (14-2)
            whip: stats[13] || '0.00',  // WHIP is at column 15, so stats[13] (15-2)
            wins: stats[3] || '0',      // Wins is at column 5, so stats[3] (5-2)
            so: stats[11] || '0',       // Strikeouts is at column 13, so stats[11] (13-2)
            season: player.season,
            statType: 'pitching'
          };
        }
      });

      // Format response to match frontend expectations
      const formattedResponse = [{
        teamName: TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase(),
        teamCode: teamAbbr.toUpperCase(),
        players: mappedPlayers
      }];

      res.json(formattedResponse);
      
    } catch (err: any) {
      console.error(`Error fetching roster data for team ${teamAbbr} (${teamId}):`, err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        teamAbbr,
        teamId,
        period,
        statType
      });
      
      res.status(500).json({ 
        error: `Unable to fetch roster data for ${TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase()}. Please try again later or contact support if the issue persists.`,
        team: teamAbbr,
        period: period,
        details: err.message
      });
    }
  })();
});

// New function to fetch team roster using MLB Stats API - more reliable than scraping
async function fetchTeamRosterFromAPI(teamAbbr: string, period: string, statType: 'hitting' | 'pitching') {
  try {
    const teamId = TEAM_ID_MAP[teamAbbr.toLowerCase()];
    if (!teamId) {
      throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
    }

    const currentYear = new Date().getFullYear();
    console.log(`Fetching ${statType} stats for ${teamAbbr.toUpperCase()} (${teamId}) via MLB Stats API...`);

    // Get team roster
    const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
    console.log(`📋 Fetching roster from: ${rosterUrl}`);
    const rosterResponse = await fetch(rosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!rosterResponse.ok) {
      throw new Error(`Roster API failed: ${rosterResponse.status} - ${rosterResponse.statusText}`);
    }

    const rosterData = await rosterResponse.json();
    console.log(`📋 Roster data received, ${rosterData.roster?.length || 0} players found`);
    
    if (!rosterData.roster || rosterData.roster.length === 0) {
      throw new Error('No roster data found');
    }

    const players = [];
    
    // Process each player on the roster
    for (const player of rosterData.roster) {
      const playerId = player.person.id;
      const playerName = player.person.fullName;
      const position = player.position.abbreviation;
      
      // Skip players based on stat type and position
      if (statType === 'pitching' && position !== 'P') continue;
      if (statType === 'hitting' && position === 'P') continue;

      try {
        // Get player season stats
        const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
        
        const playerResponse = await fetch(playerStatsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          
          // Find the correct stat group
          const statGroup = playerData.stats?.find((s: any) => 
            s.group?.displayName === statType || s.type?.displayName === statType
          );

          if (statGroup?.splits?.[0]?.stat) {
            const stats = statGroup.splits[0].stat;
            console.log(`📊 Found stats for ${playerName}:`, statType === 'pitching' ? 
              `ERA=${stats.era}, WHIP=${stats.whip}, W=${stats.wins}, SO=${stats.strikeOuts}` :
              `AVG=${stats.avg}, HR=${stats.homeRuns}, RBI=${stats.rbi}`);
            
            if (statType === 'hitting') {
              players.push({
                name: playerName,
                team: teamAbbr.toUpperCase(),
                position: position,
                avg: stats.avg || '.000',
                hr: stats.homeRuns?.toString() || '0',
                rbi: stats.rbi?.toString() || '0',
                runs: stats.runs?.toString() || '0',
                sb: stats.stolenBases?.toString() || '0',
                obp: stats.obp || '.000',
                slg: stats.slg || '.000',
                ops: stats.ops || '.000',
                season: currentYear.toString(),
                statType: 'hitting'
              });
            } else {
              players.push({
                name: playerName,
                team: teamAbbr.toUpperCase(),
                position: position,
                era: stats.era || '0.00',
                whip: stats.whip || '0.00',
                wins: stats.wins?.toString() || '0',
                so: stats.strikeOuts?.toString() || '0',
                season: currentYear.toString(),
                statType: 'pitching'
              });
            }
          }
        }
      } catch (playerError: any) {
        console.warn(`Failed to get stats for ${playerName}:`, playerError.message);
        // Continue with other players
      }
    }

    console.log(`Successfully fetched ${players.length} ${statType} players for ${teamAbbr.toUpperCase()}`);
    
    return [{
      teamName: TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase(),
      teamCode: teamAbbr.toUpperCase(),
      players: players
    }];

  } catch (error: any) {
    console.error(`Error fetching team roster via API for ${teamAbbr}:`, error.message);
    throw error;
  }
}

// Schedule daily data updates
schedule.scheduleJob('0 5 * * *', async () => { // Run at 5:00 AM every day
  console.log('Running scheduled data update...');
  
  try {
    // Fetch all player stats
    const allStats = await scrapePlayerStats();
    
    // Store the raw data
    storeData('player-stats.json', allStats);
    
    // Calculate and store trends
    await calculateDailyTrends(allStats);
    
    // Update standings
    const standings = await scrapeStandings();
    storeData('standings.json', standings);
    
    // Update games
    const games = await scrapeGames();
    storeData('games.json', games);
    
    console.log('Daily data update completed successfully');
  } catch (err) {
    console.error('Error during scheduled data update:', err);
  }
});

// Serve index.html for non-API routes (for React Router support)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Fallback route for any non-API paths
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API endpoints available at:`);
  console.log(` - /api/roster`);
  console.log(` - /api/standings`);
  console.log(` - /api/trends`);
  console.log(` - /api/games`);
});