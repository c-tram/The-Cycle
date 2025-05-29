/**
 * Test file for verifying the caching mechanisms in the MLB Statcast analytics pipeline
 */

import { cacheData, getCachedData } from '../services/dataService';
import { scrapeGames } from '../scrapers/gamesScraper';

// Simple test to verify cache functionality
async function testCaching() {
  console.log("Testing MLB Statcast caching mechanisms...");

  // Clear any existing cache first
  try {
    console.log("Step 1: Getting games data (first run - should scrape fresh data)");
    const firstRunStart = Date.now();
    const firstRunResult = await scrapeGames();
    const firstRunTime = Date.now() - firstRunStart;
    
    console.log(`First run completed in ${firstRunTime}ms`);
    console.log(`Retrieved ${firstRunResult.recent.length} recent games and ${firstRunResult.upcoming.length} upcoming games`);
    
    // Wait a second to ensure timestamp differences
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("\nStep 2: Getting games data again (should use cache)");
    const secondRunStart = Date.now();
    const secondRunResult = await scrapeGames();
    const secondRunTime = Date.now() - secondRunStart;
    
    console.log(`Second run completed in ${secondRunTime}ms`);
    console.log(`Retrieved ${secondRunResult.recent.length} recent games and ${secondRunResult.upcoming.length} upcoming games`);
    
    // Validate that second run was significantly faster (cached)
    if (secondRunTime < firstRunTime / 2) {
      console.log("\n✅ SUCCESS: Second run was much faster, indicating cache was used");
    } else {
      console.log("\n⚠️ WARNING: Second run wasn't significantly faster, cache may not be working as expected");
    }
    
    // Check individual component caches
    console.log("\nStep 3: Checking component caches");
    const recentGamesCache = getCachedData('recent-games');
    const upcomingGamesCache = getCachedData('upcoming-games');
    
    console.log(`Recent games cache exists: ${recentGamesCache !== null}`);
    console.log(`Upcoming games cache exists: ${upcomingGamesCache !== null}`);
    
  } catch (error) {
    console.error("Error during cache testing:", error);
  }
}

// Run the test
testCaching();
