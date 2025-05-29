/**
 * Test file for validating dynamic content handling in MLB Statcast pipeline
 */

import { scrapeGames } from '../scrapers/gamesScraper';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Proper Jest test suite for dynamic content handling
describe('MLB Statcast Dynamic Content Handling', () => {

  // Test for detecting dynamic content on MLB.com
  test('should detect dynamic content on MLB.com', async () => {
    // Fetch the MLB stats page
    const response = await fetch('https://www.mlb.com/stats/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    
    expect(response.status).toBe(200);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Check for dynamic content indicators
    const scriptTags = $('script');
    const hasReact = html.includes('react') || html.includes('React');
    const hasAjax = html.includes('ajax') || html.includes('fetch') || html.includes('XMLHttpRequest');
    const dynamicLoading = hasReact || hasAjax;
    
    // Assertions for dynamic content detection
    expect(scriptTags.length).toBeGreaterThan(0);
    expect(dynamicLoading).toBe(true);
    
    // Either React or AJAX/fetch should be detected
    expect(hasReact || hasAjax).toBe(true);
  });
  
  // Test for scraper's ability to handle dynamic content
  test('should retrieve game data despite dynamic content limitations', async () => {
    // Run the games scraper
    const games = await scrapeGames();
    
    // Verify we received valid game data
    expect(games).toBeDefined();
    expect(games.recent).toBeInstanceOf(Array);
    expect(games.upcoming).toBeInstanceOf(Array);
    
    // Should have at least some game data (or mock data if nothing else)
    expect(games.recent.length).toBeGreaterThan(0);
    expect(games.upcoming.length).toBeGreaterThan(0);
    
    // Check that game objects have the expected structure
    if (games.recent.length > 0) {
      const firstGame = games.recent[0];
      expect(firstGame).toHaveProperty('homeTeam');
      expect(firstGame).toHaveProperty('awayTeam');
      expect(firstGame).toHaveProperty('date');
      expect(firstGame).toHaveProperty('status');
    }
    
    // Check the structure of upcoming games too
    if (games.upcoming.length > 0) {
      const firstUpcoming = games.upcoming[0];
      expect(firstUpcoming).toHaveProperty('homeTeam');
      expect(firstUpcoming).toHaveProperty('awayTeam');
      expect(firstUpcoming).toHaveProperty('date');
      expect(firstUpcoming).toHaveProperty('status');
    }
  });
});
