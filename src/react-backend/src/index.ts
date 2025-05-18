import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Builder, By } from 'selenium-webdriver';

const app = express();
const port = process.env.PORT || 3000;

// Use absolute path for static files (works in Docker and locally)
app.use(express.static(path.join(__dirname, '../public')));

// Map team abbreviations to Baseball Savant team IDs
const TEAM_ID_MAP: Record<string, number> = {
  ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
  hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
  nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
  tex: 140, tor: 141, was: 120, wsh: 120
};

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

// Serve index.html for all non-API routes (for React Router support)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});