import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { cacheData, getCachedData } from '../services/dataService';
import { withRetry } from './mlbStatsApiService';
import { TEAM_ID_MAP } from '../constants/teams';

// Add mock data for when scraping fails
const MOCK_GAMES = {
  recent: [
    { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', homeScore: 5, awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', awayScore: 3, date: new Date().toISOString().split('T')[0], status: 'completed' as const },
    { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', homeScore: 2, awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', awayScore: 1, date: new Date().toISOString().split('T')[0], status: 'completed' as const },
    { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', homeScore: 7, awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', awayScore: 4, date: new Date().toISOString().split('T')[0], status: 'completed' as const },
  ],
  upcoming: [
    { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', date: new Date().toISOString().split('T')[0], time: '7:05 PM', status: 'scheduled' as const },
    { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', date: new Date().toISOString().split('T')[0], time: '10:10 PM', status: 'scheduled' as const },
    { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', date: new Date().toISOString().split('T')[0], time: '8:15 PM', status: 'scheduled' as const },
  ]
};

interface Game {
  homeTeam: string;
  homeTeamCode: string;
  awayTeam: string;
  awayTeamCode: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  status: 'completed' | 'scheduled' | 'live';
}

/**
 * Scrapes recent and upcoming MLB games using HTTP requests and cheerio
 * Handles dynamic content loading limitations via multiple strategies:
 * 1. Try cached data first
 * 2. Use MLB Stats API as primary data source
 * 3. Fall back to web scraping with retry mechanism
 * 4. Use mock data as final fallback
 * 
 * @returns Promise containing game data
 */
export async function scrapeGames(): Promise<{ recent: Game[], upcoming: Game[] }> {
  try {
    console.log("Starting game data collection process...");

    // Try to get cached games data first (main cache)
    const cachedGames = getCachedData<{ recent: Game[], upcoming: Game[] }>('games');
    if (cachedGames) {
      console.log("Using cached games data (expires in separate cache entry)");
      return cachedGames;
    }
    
    // If no cache, try to fetch games using the MLB Stats API
    try {
      console.log("Attempting to fetch games from MLB Stats API (most reliable source)...");
      // Import dynamically to avoid circular dependencies
      const { fetchGamesFromAPI } = await import('./mlbStatsApiService');
      const apiGames = await fetchGamesFromAPI();
      
      // Convert API game statuses to our specific types
      const formattedGames = {
        recent: apiGames.recent.map(game => ({
          ...game,
          status: game.status === 'completed' ? 'completed' : 
                  game.status === 'live' ? 'live' : 'scheduled'
        } as Game)),
        upcoming: apiGames.upcoming.map(game => ({
          ...game,
          status: game.status === 'live' ? 'live' : 'scheduled'
        } as Game))
      };
      
      if (formattedGames.recent.length > 0 || formattedGames.upcoming.length > 0) {
        console.log(`Successfully retrieved ${formattedGames.recent.length} recent games and ${formattedGames.upcoming.length} upcoming games from API`);
        
        // Cache the successful result with different expirations based on game type
        // Recent games can be cached longer as they don't change
        cacheData('games', formattedGames, 120); // Cache combined data for 2 hours
        
        // Individual caches for component pieces (backup)
        if (formattedGames.recent.length > 0) {
          cacheData('recent-games', formattedGames.recent, 240); // Cache for 4 hours (historical data)
        }
        if (formattedGames.upcoming.length > 0) {
          cacheData('upcoming-games', formattedGames.upcoming, 60); // Cache for 1 hour (more volatile)
        }
        
        return formattedGames;
      }
      console.log("No games found from MLB Stats API, falling back to web scraping");
    } catch (apiError) {
      console.error('Error fetching games from MLB Stats API:', apiError);
      console.log("Falling back to web scraping due to API error (note: may be limited by dynamic content)");
    }
    
    // Fallback to web scraping if API fails
    console.log("Starting HTTP-based game scraper as fallback (warning: MLB.com uses dynamic content)...");
    
    // Create a promise to handle potential timeout for web scraping
    const scrapingWithTimeout = async () => {
      return Promise.race([
        // The actual scraping process
        (async () => {
          try {
            // Check for separate caches first
            const separateCachedRecent = getCachedData<Game[]>('recent-games');
            const separateCachedUpcoming = getCachedData<Game[]>('upcoming-games');
            
            // If both caches exist, combine and return
            if (separateCachedRecent && separateCachedUpcoming) {
              console.log("Using separately cached recent and upcoming games");
              return { 
                recent: separateCachedRecent,
                upcoming: separateCachedUpcoming
              };
            }
            
            // Otherwise scrape what we need
            console.log("Scraping recent games...");
            const recentGames = separateCachedRecent || await scrapeRecentGames();
            console.log(`Found ${recentGames.length} recent games`);
            
            console.log("Scraping upcoming games...");
            const upcomingGames = separateCachedUpcoming || await scrapeUpcomingGames();
            console.log(`Found ${upcomingGames.length} upcoming games`);
            
            // Cache the combined result
            const combinedResults = {
              recent: recentGames,
              upcoming: upcomingGames
            };
            
            if (recentGames.length > 0 || upcomingGames.length > 0) {
              cacheData('games', combinedResults, 120); // Cache for 2 hours
            }
            
            return combinedResults;
          } catch (error) {
            console.error("Error in scraping process:", error);
            throw error;
          }
        })(),
        
        // Timeout after 10 seconds to avoid hanging
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Web scraping timed out after 10 seconds")), 10000)
        )
      ]);
    };
    
    try {
      const scrapedGames = await scrapingWithTimeout() as { recent: Game[], upcoming: Game[] };
      
      // Check if we actually got data or need to fall back to mock data
      const needsMockRecent = scrapedGames.recent.length === 0;
      const needsMockUpcoming = scrapedGames.upcoming.length === 0;
      
      if (needsMockRecent || needsMockUpcoming) {
        console.log(`Using ${needsMockRecent && needsMockUpcoming ? 'all mock data' : 
          needsMockRecent ? 'mock recent games' : 'mock upcoming games'}`);
      }
      
      return { 
        recent: needsMockRecent ? MOCK_GAMES.recent : scrapedGames.recent,
        upcoming: needsMockUpcoming ? MOCK_GAMES.upcoming : scrapedGames.upcoming
      };
    } catch (scrapingError) {
      console.error('Error or timeout in web scraping:', scrapingError);
      // Fallback to mock data on error/timeout
      console.log("Returning mock game data due to scraping error/timeout");
      return MOCK_GAMES;
    }
  } catch (error) {
    console.error('Error retrieving games data:', error);
    // Fallback to mock data on error
    console.log("Returning mock game data due to error");
    return MOCK_GAMES;
  }
}

/**
 * Scrapes completed games from MLB scoreboard using HTTP
 */
async function scrapeRecentGames(): Promise<Game[]> {
  try {
    // Try to get cached recent games first
    const cachedRecent = getCachedData<Game[]>('recent-games');
    if (cachedRecent) {
      console.log("Using cached recent games data");
      return cachedRecent;
    }

    // Navigate to MLB scoreboard page with retry mechanism
    const html = await withRetry(async () => {
      const response = await fetch('https://www.mlb.com/scores/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.text();
    });
    const $ = cheerio.load(html);

    const games: Game[] = [];
    
    // Look for game cards
    const gameCards = $('.EventCard, .schedule-item, .p-schedule__game');
    
    gameCards.each((i, card) => {
      try {
        // Get status
        let status: 'completed' | 'scheduled' | 'live' = 'scheduled';
        let statusText = '';
        
        const statusElem = $(card).find('.EventCard-statusText, .schedule-status, .p-schedule__status');
        statusText = statusElem.text().trim().toLowerCase();
        
        if (statusText.includes('final')) status = 'completed';
        else if (statusText.match(/top|bottom|\d+(st|nd|rd|th)/i)) status = 'live';
        
        // Only completed games
        if (status !== 'completed') return;
        
        // Get team names
        const teamElems = $(card).find('.EventCard-matchupTeamName, .schedule-team__name, .p-schedule__team-name');
        if (teamElems.length !== 2) return;
        
        const awayTeam = $(teamElems[0]).text().trim();
        const homeTeam = $(teamElems[1]).text().trim();
        
        if (!awayTeam || !homeTeam) return;
        
        // Get scores
        let awayScore: number | undefined, homeScore: number | undefined;
        const scoreElems = $(card).find('.EventCard-score, .schedule-score, .p-schedule__score');
        if (scoreElems.length === 2) {
          awayScore = parseInt($(scoreElems[0]).text().trim(), 10);
          homeScore = parseInt($(scoreElems[1]).text().trim(), 10);
        }
        
        // Get date (from status or fallback to yesterday)
        let date = new Date();
        if (statusText.match(/yesterday/i)) {
          date.setDate(date.getDate() - 1);
        }
        const dateStr = date.toISOString().split('T')[0];
        
        if (awayScore !== undefined && homeScore !== undefined && !isNaN(awayScore) && !isNaN(homeScore)) {
          games.push({
            awayTeam,
            homeTeam,
            awayTeamCode: getTeamCodeFromName(awayTeam),
            homeTeamCode: getTeamCodeFromName(homeTeam),
            awayScore,
            homeScore,
            date: dateStr,
            status
          });
        }
        
        if (games.length >= 5) return false; // Break out of each loop
      } catch (e) {
        console.error('Error processing game card', e);
      }
    });
    
    // Cache the successful result for 2 hours (even if empty)
    if (games.length > 0) {
      console.log(`Caching ${games.length} recent games`);
      cacheData('recent-games', games, 120); // Cache for 2 hours
    } else {
      console.log('No recent games found to cache');
    }
    
    return games;
  } catch (error) {
    console.error('Error scraping recent games:', error);
    return [];
  }
}

/**
 * Scrapes upcoming games from MLB schedule using HTTP
 */
async function scrapeUpcomingGames(): Promise<Game[]> {
  try {
    // Try to get cached upcoming games first
    const cachedUpcoming = getCachedData<Game[]>('upcoming-games');
    if (cachedUpcoming) {
      console.log("Using cached upcoming games data");
      return cachedUpcoming;
    }
    
    // Navigate to MLB schedule page for today/tomorrow with retry mechanism
    const html = await withRetry(async () => {
      const response = await fetch('https://www.mlb.com/schedule/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.text();
    });
    const $ = cheerio.load(html);

    const games: Game[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Try multiple selectors for robustness
    const gameEntries = $('.schedule-item, .p-schedule__game, .EventCard');
    
    gameEntries.each((i, entry) => {
      try {
        // Get team names
        let awayTeam = '', homeTeam = '';
        
        const teamElems = $(entry).find('.schedule-team__name, .p-schedule__team-name, .EventCard-matchupTeamName');
        if (teamElems.length === 2) {
          awayTeam = $(teamElems[0]).text().trim();
          homeTeam = $(teamElems[1]).text().trim();
        } else {
          // Fallback for alternate markup
          const teams = $(entry).text();
          const parts = teams.split(' at ');
          if (parts.length === 2) {
            awayTeam = parts[0].trim();
            homeTeam = parts[1].trim();
          }
        }
        
        if (!awayTeam || !homeTeam) return;
        
        // Get game time
        let time = '';
        const timeElem = $(entry).find('.schedule-time, .p-schedule__time, .EventCard-statusText');
        time = timeElem.text().trim();
        
        games.push({
          awayTeam,
          homeTeam,
          awayTeamCode: getTeamCodeFromName(awayTeam),
          homeTeamCode: getTeamCodeFromName(homeTeam),
          date: todayStr,
          time,
          status: 'scheduled'
        });
        
        if (games.length >= 5) return false; // Break out of each loop
      } catch (e) {
        console.error('Error processing game entry', e);
      }
    });
    
    // Cache the successful result for 2 hours (even if empty)
    if (games.length > 0) {
      console.log(`Caching ${games.length} upcoming games`);
      cacheData('upcoming-games', games, 120); // Cache for 2 hours
    } else {
      console.log('No upcoming games found to cache');
    }
    
    return games;
  } catch (error) {
    console.error('Error scraping upcoming games:', error);
    return [];
  }
}

// Cache for team codes to avoid repeated lookups
const teamCodeCache: { [key: string]: string } = {};

/**
 * Helper function to convert team name to team code
 * Uses caching for efficiency and to handle potential issues in dynamic content
 */
function getTeamCodeFromName(teamName: string): string {
  // Fast path: check in-memory cache first
  if (teamCodeCache[teamName]) {
    return teamCodeCache[teamName];
  }

  // Convert full team names to codes using TEAM_ID_MAP mapping
  const teamFullNameToCode = Object.entries(TEAM_ID_MAP).reduce((acc, [code, _]) => {
    switch (code) {
      case 'nyy': acc['New York Yankees'] = code; break;
      case 'bos': acc['Boston Red Sox'] = code; break;
      case 'tb': acc['Tampa Bay Rays'] = code; break;
      case 'tor': acc['Toronto Blue Jays'] = code; break;
      case 'bal': acc['Baltimore Orioles'] = code; break;
      case 'cle': 
        acc['Cleveland Guardians'] = code;
        acc['Cleveland Indians'] = code; // Handle legacy name
        break;
      case 'min': acc['Minnesota Twins'] = code; break;
      case 'cws': acc['Chicago White Sox'] = code; break;
      case 'kc': acc['Kansas City Royals'] = code; break;
      case 'det': acc['Detroit Tigers'] = code; break;
      case 'hou': acc['Houston Astros'] = code; break;
      case 'sea': acc['Seattle Mariners'] = code; break;
      case 'tex': acc['Texas Rangers'] = code; break;
      case 'laa': acc['Los Angeles Angels'] = code; break;
      case 'oak': acc['Oakland Athletics'] = code; break;
      case 'atl': acc['Atlanta Braves'] = code; break;
      case 'nym': acc['New York Mets'] = code; break;
      case 'phi': acc['Philadelphia Phillies'] = code; break;
      case 'mia': acc['Miami Marlins'] = code; break;
      case 'wsh': acc['Washington Nationals'] = code; break;
      case 'chc': acc['Chicago Cubs'] = code; break;
      case 'stl': acc['St. Louis Cardinals'] = code; break;
      case 'mil': acc['Milwaukee Brewers'] = code; break;
      case 'cin': acc['Cincinnati Reds'] = code; break;
      case 'pit': acc['Pittsburgh Pirates'] = code; break;
      case 'lad': acc['Los Angeles Dodgers'] = code; break;
      case 'sd': acc['San Diego Padres'] = code; break;
      case 'sf': acc['San Francisco Giants'] = code; break;
      case 'ari': acc['Arizona Diamondbacks'] = code; break;
      case 'col': acc['Colorado Rockies'] = code; break;
    }
    return acc;
  }, {} as Record<string, string>);

  // Handle case variations (MLB.com sometimes has inconsistent casing)
  const normalizedTeamName = teamName.trim();
  const code = teamFullNameToCode[normalizedTeamName] || 
              teamFullNameToCode[normalizedTeamName.toLowerCase()] || 
              normalizedTeamName.toLowerCase().replace(/\s+/g, '').substring(0, 3);

  // Cache the result for future lookups
  teamCodeCache[teamName] = code;

  return code;
}