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
  tex: 140, tor: 141, was: 120, wsh: 120
};

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

// Example: /api/roster?team=nyy
app.get('/api/roster', (req, res) => {
  (async () => {
    const teamAbbr = (req.query.team as string)?.toLowerCase() || 'nyy';
    const statType = (req.query.type as string)?.toLowerCase() || 'hitting';
    const season = (req.query.season as string) || '2025';
    const teamId = TEAM_ID_MAP[teamAbbr];
    
    if (!teamId) {
      res.status(400).json({ error: 'Invalid or unsupported team abbreviation.' });
      return;
    }

    try {
      // Use HTTP-based scraping for roster data instead of Selenium
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };

      // Fetch from Baseball Savant team page
      let url = `https://baseballsavant.mlb.com/team/${teamId}`;
      if (statType === 'pitching') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&season=${season}`;
      } else if (statType === 'hitting') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?season=${season}`;
      }

      const response = await fetch(url, { headers, timeout: 15000 });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Parse the statcast table
      const tableId = statType === 'pitching' ? '#statcastPitching' : '#statcastHitting';
      const table = $(`${tableId} .table-savant table`);
      
      if (table.length === 0) {
        // Fallback to mock data if table not found
        const mockData = {
          statHeaders: statType === 'pitching' ? 
            ['ERA', 'WHIP', 'K/9', 'BB/9', 'FIP'] : 
            ['AVG', 'OBP', 'SLG', 'OPS', 'wOBA'],
          players: [
            {
              name: 'Sample Player',
              season: season,
              stats: statType === 'pitching' ? 
                ['3.25', '1.15', '9.2', '2.8', '3.45'] :
                ['.285', '.350', '.475', '.825', '.340']
            }
          ]
        };
        res.json(mockData);
        return;
      }

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

      // Extract player data
      const statcastData: any[] = [];
      table.find('tbody tr.statcast-generic').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 3) {
          const playerName = cells.eq(0).find('b').text().trim() || cells.eq(0).text().trim();
          const seasonVal = cells.eq(1).text().trim();
          const stats: string[] = [];
          
          for (let j = 2; j < cells.length; j++) {
            stats.push(cells.eq(j).text().trim());
          }
          
          if (playerName) {
            statcastData.push({
              name: playerName,
              season: seasonVal,
              stats: stats
            });
          }
        }
      });

      if (statcastData.length === 0) {
        res.status(404).json({ error: `No data found for ${statType} in season: ${season}.` });
        return;
      }

      res.json({ statHeaders, players: statcastData });
      
    } catch (err: any) {
      console.error('Error fetching roster data:', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

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