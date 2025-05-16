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
      const url = `https://baseballsavant.mlb.com/team/${teamId}`;
      await driver.get(url);
      // Get stat headers from the table head
      const statcastTable = await driver.findElement(By.css('#statcastHitting .table-savant table'));
      const headerRow = await statcastTable.findElement(By.css('thead tr'));
      const headerTds = await headerRow.findElements(By.css('th'));
      // First column is player, second is season, rest are stats
      const statHeaders = [];
      for (let i = 2; i < headerTds.length; i++) {
        statHeaders.push(await headerTds[i].getText());
      }
      // Statcast Hitting Table
      const statcastRows = await driver.findElements(By.css('#statcastHitting .table-savant table tbody tr.statcast-generic'));
      const statcastData = [];
      for (const row of statcastRows) {
        const tds = await row.findElements(By.css('td'));
        // Player name is in the first td, inside a <b> tag
        const playerName = await tds[0].findElement(By.css('b')).getText();
        const season = await tds[1].getText();
        // Collect all stat columns (PA, AB, H, 2B, 3B, HR, BB, SO, BA, OBP, SLG, WOBA, WOBACON, etc.)
        const stats = [];
        for (let i = 2; i < tds.length; i++) {
          stats.push(await tds[i].getText());
        }
        statcastData.push({ name: playerName, season, stats });
      }
      res.json({ statHeaders, players: statcastData });
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