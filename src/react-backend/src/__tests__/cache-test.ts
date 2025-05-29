/**
 * Test file for verifying the caching mechanisms in the MLB Statcast analytics pipeline
 */

import { getCachedData } from '../services/dataService';
import { scrapeGames } from '../scrapers/gamesScraper';

// Proper Jest test suite
describe('MLB Statcast Cache Functionality', () => {
  
  // Test case for verifying cache mechanism
  test('should cache game data on first run and use cache on second run', async () => {
    // Execute first run and measure performance
    const firstRunStart = Date.now();
    const firstRunResult = await scrapeGames();
    const firstRunTime = Date.now() - firstRunStart;
    
    // Verify we got data from first run
    expect(firstRunResult).toBeDefined();
    expect(firstRunResult.recent).toBeInstanceOf(Array);
    expect(firstRunResult.upcoming).toBeInstanceOf(Array);
    
    // Wait to ensure timestamp differences
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Execute second run and measure performance
    const secondRunStart = Date.now();
    const secondRunResult = await scrapeGames();
    const secondRunTime = Date.now() - secondRunStart;
    
    // Verify second run also returns valid data
    expect(secondRunResult).toBeDefined();
    expect(secondRunResult.recent).toBeInstanceOf(Array);
    expect(secondRunResult.upcoming).toBeInstanceOf(Array);
    
    // Check that recent and upcoming games are equal between runs
    expect(secondRunResult.recent.length).toBe(firstRunResult.recent.length);
    expect(secondRunResult.upcoming.length).toBe(firstRunResult.upcoming.length);
    
    // Expect the second run to be faster, indicating cache was used
    // Note: This may be flaky in CI environments but should work locally
    expect(secondRunTime).toBeLessThan(firstRunTime);
  });

  // Test for verifying component caches
  test('should create separate caches for components', async () => {
    // Run scrapeGames first to populate caches
    await scrapeGames();
    
    // Check if component caches exist
    const recentGamesCache = getCachedData('recent-games');
    const upcomingGamesCache = getCachedData('upcoming-games');
    
    // Verify caches exist and contain data
    expect(recentGamesCache).toBeTruthy();
    expect(upcomingGamesCache).toBeTruthy();
    
    // If caches exist, verify they contain arrays
    if (recentGamesCache) {
      expect(Array.isArray(recentGamesCache)).toBe(true);
    }
    
    if (upcomingGamesCache) {
      expect(Array.isArray(upcomingGamesCache)).toBe(true);
    }
  });
});
