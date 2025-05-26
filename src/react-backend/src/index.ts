import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Builder, By } from 'selenium-webdriver';
import { scrapeStandings } from './scrapers/standingsScraper';
import { scrapePlayerStats, scrapeTrendData } from './scrapers/playerStatsScraper';
import { scrapeGames } from './scrapers/gamesScraper';
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
        // Fetch fresh data
        const standings = await scrapeStandings();
        
        // Store in cache
        cache[cacheKey] = {
          data: standings,
          timestamp: Date.now()
        };
        
        res.json(standings);
      } catch (scrapeErr) {
        console.error('Error scraping standings, using mock data:', scrapeErr);
        // If the scraper fails, return the mock data from the scraper
        const mockData = require('./scrapers/standingsScraper').MOCK_STANDINGS;
        res.json(mockData);
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
      
      // Fetch fresh data
      const gamesData = await scrapeGames();
      
      // Store in cache
      cache[cacheKey] = {
        data: gamesData,
        timestamp: Date.now()
      };
      
      res.json(gamesData);
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
    let driver;
    try {
      const chrome = require('selenium-webdriver/chrome');
      const chromePath = '/usr/bin/chromium';
      const chromeDriverPath = '/usr/bin/chromedriver';
      const options = new chrome.Options()
        .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage')
        .setChromeBinaryPath(chromePath);
      const service = new chrome.ServiceBuilder(chromeDriverPath);
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(service)
        .build();
      // Scrape the Baseball Savant team page for the given team
      let url = `https://baseballsavant.mlb.com/team/${teamId}`;
      if (statType === 'pitching') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&season=${season}`;
      } else if (statType === 'hitting') {
        url = `https://baseballsavant.mlb.com/team/${teamId}?season=${season}`;
      }
      await driver.get(url);
      try {
        const tableId = statType === 'pitching' ? '#statcastPitching' : '#statcastHitting';
        await driver.sleep(2000);
        const statcastTable = await driver.findElement(By.css(`${tableId} .table-savant table`));
        const headerRow = await statcastTable.findElement(By.css('thead tr'));
        const headerTds = await headerRow.findElements(By.css('th'));
        const statHeaders = [];
        for (let i = 2; i < headerTds.length; i++) {
          statHeaders.push(await headerTds[i].getText());
        }
        const statcastRows = await statcastTable.findElements(By.css('tbody tr.statcast-generic'));
        const statcastData = [];
        for (const row of statcastRows) {
          const tds = await row.findElements(By.css('td'));
          const playerName = await tds[0].findElement(By.css('b')).getText();
          const seasonVal = await tds[1].getText();
          const stats = [];
          for (let i = 2; i < tds.length; i++) {
            stats.push(await tds[i].getText());
          }
          statcastData.push({ name: playerName, season: seasonVal, stats });
        }
        if (statcastData.length === 0) {
          res.status(404).json({ error: `No data found for ${statType} in season: ${season}.` });
          return;
        }
        res.json({ statHeaders, players: statcastData });
      } catch (err) {
        let errorMsg = '';
        if (err instanceof Error) {
          errorMsg = err.message;
        } else {
          errorMsg = String(err);
        }
        res.status(404).json({ error: `No data found for ${statType} in season: ${season}. Error: ${errorMsg}` });
        return;
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      if (driver) await driver.quit();
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