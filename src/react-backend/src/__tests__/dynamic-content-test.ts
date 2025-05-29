/**
 * Test file for validating dynamic content handling in MLB Statcast pipeline
 */

import { scrapeGames } from '../scrapers/gamesScraper';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testDynamicContentHandling() {
  console.log("Testing MLB Statcast dynamic content handling...");
  
  // Step 1: Verify dynamic content detection
  try {
    console.log("\nStep 1: Checking MLB.com for dynamic content features...");
    const response = await fetch('https://www.mlb.com/stats/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Check for dynamic content indicators
    const scriptTags = $('script');
    const hasReact = html.includes('react') || html.includes('React');
    const hasAjax = html.includes('ajax') || html.includes('fetch') || html.includes('XMLHttpRequest');
    const dynamicLoading = hasReact || hasAjax;
    
    console.log(`Script tags found: ${scriptTags.length}`);
    console.log(`Uses React: ${hasReact ? 'YES' : 'NO'}`);
    console.log(`Uses AJAX/Fetch: ${hasAjax ? 'YES' : 'NO'}`);
    console.log(`Dynamic content loading detected: ${dynamicLoading ? 'YES' : 'NO'}`);
    
    if (dynamicLoading) {
      console.log("✅ Correctly identified dynamic content on MLB.com");
    } else {
      console.log("⚠️ Failed to detect dynamic content on MLB.com (unexpected)");
    }
    
    // Step 2: Test our scraper's handling of dynamic content
    console.log("\nStep 2: Testing scraper's handling of dynamic content...");
    console.log("Running scrapeGames() function...");
    
    const games = await scrapeGames();
    
    // Check if we got actual data (API first approach worked)
    if (games && games.recent && games.recent.length > 0) {
      console.log(`✅ Successfully retrieved games despite dynamic content: ${games.recent.length} recent games found`);
      
      // Show first game as proof
      console.log("\nSample game data (first recent game):");
      console.log(JSON.stringify(games.recent[0], null, 2));
    } else {
      console.log("⚠️ Failed to retrieve games data (unexpected)");
    }
    
  } catch (error) {
    console.error("Error testing dynamic content handling:", error);
  }
}

// Run the test
testDynamicContentHandling();
