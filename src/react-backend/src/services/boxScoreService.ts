/**
 * Box Score Service - Comprehensive game-by-game player performance tracking
 * 
 * This service handles:
 * 1. Discovering games from MLB scores page
 * 2. Scraping detailed box score data for each game
 * 3. Storing game-by-game player statistics
 * 4. Building performance trends and matchup data
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { cacheData, getCachedData } from './dataService';
import redisCache from './redisCache';

// Types for box score data
export interface GameInfo {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'final' | 'postponed';
  inning?: string;
}

export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  team: string;
  gameId: string;
  date: string;
  opponent: string;
  isHome: boolean;
  
  // Batting stats (if applicable)
  battingStats?: {
    atBats: number;
    runs: number;
    hits: number;
    rbi: number;
    walks: number;
    strikeouts: number;
    avg: number;
    obp: number;
    slg: number;
    ops: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    stolenBases: number;
    caughtStealing: number;
    hitByPitch: number;
    sacrifices: number;
    groundIntoDoublePlay: number;
    leftOnBase: number;
  };
  
  // Pitching stats (if applicable)
  pitchingStats?: {
    inningsPitched: number;
    hits: number;
    runs: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    homeRuns: number;
    era: number;
    whip: number;
    pitchCount: number;
    strikes: number;
    balls: number;
    firstPitchStrikes: number;
    swingingStrikes: number;
    calledStrikes: number;
    groundBalls: number;
    flyBalls: number;
    popUps: number;
    lineOuts: number;
  };
  
  // Fielding stats (if applicable)
  fieldingStats?: {
    position: string;
    innings: number;
    putOuts: number;
    assists: number;
    errors: number;
    chances: number;
    fieldingPercentage: number;
    doublePlays: number;
    triplePlays: number;
    passedBalls?: number; // for catchers
    stolenBasesAllowed?: number; // for catchers
    caughtStealing?: number; // for catchers
  };
}

export interface BoxScore {
  gameInfo: GameInfo;
  homeTeamStats: PlayerGameStats[];
  awayTeamStats: PlayerGameStats[];
  gameEvents: GameEvent[];
}

export interface GameEvent {
  inning: number;
  topBottom: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
  description: string;
  batter: string;
  pitcher: string;
  result: string;
  timestamp?: string;
}

export interface PlayerTrend {
  playerId: string;
  playerName: string;
  team?: string;
  timeframe?: string; // 'last7', 'last14', 'last30', 'season'
  
  battingTrends?: {
    games: number;
    avg: number;
    obp: number;
    slg: number;
    ops: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    hits: number;
    atBats: number;
    strikeouts: number;
    walks: number;
    hotStreak?: number; // consecutive games with hit
    coldStreak?: number; // consecutive games without hit
  };
  
  pitchingTrends?: {
    games: number;
    era: number;
    whip: number;
    strikeouts: number;
    walks: number;
    inningsPitched: number;
    qualityStarts: number;
    wins: number;
    losses: number;
    saves: number;
    blownSaves: number;
  };
  
  // Extended trend analysis fields
  recentForm?: {
    last7: any;
    last14: any;
    last30: any;
    season: any;
  };
  rollingAverages?: any[];
  trends?: {
    batting: any;
    pitching: any;
  };
  hotZones?: any;
  lastUpdated?: string;
}

export interface MatchupData {
  batter: string;
  pitcher: string;
  matchupHistory: {
    atBats: number;
    hits: number;
    homeRuns: number;
    strikeouts: number;
    walks: number;
    avg: number;
    ops: number;
    lastFaced: string;
  };
}

class BoxScoreService {
  private readonly CACHE_PREFIX = 'boxscore:';
  private readonly TRENDS_CACHE_PREFIX = 'player-trends:';
  private readonly MATCHUP_CACHE_PREFIX = 'matchup:';

  /**
   * Discover all MLB games for a specific date
   */
  async discoverGames(date: string): Promise<GameInfo[]> {
    const cacheKey = `${this.CACHE_PREFIX}games:${date}`;
    
    try {
      // Check cache first
      const cachedGames = await getCachedData<GameInfo[]>(cacheKey);
      if (cachedGames && Array.isArray(cachedGames)) {
        console.log(`Found ${cachedGames.length} cached games for ${date}`);
        return cachedGames;
      }

      console.log(`Discovering MLB games for ${date}...`);
      
      // Format date for MLB.com URL (YYYY/MM/DD)
      const formattedDate = date.replace(/-/g, '/');
      const scoresUrl = `https://www.mlb.com/scores/${formattedDate}`;
      
      console.log(`Fetching scores from: ${scoresUrl}`);
      const response = await fetch(scoresUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const games: GameInfo[] = [];

      // Parse game elements from the scores page
      $('.EventCard, .GameCard, .scoreboard-game').each((index, element) => {
        const gameElement = $(element);
        
        // Extract game ID from gameday link or data attribute
        let gameId = '';
        
        // Try multiple selector patterns
        const gamedayLink = gameElement.find('a[href*="/gameday/"], a[href*="/game/"]').attr('href');
        const dataGamePk = gameElement.attr('data-gamepk') || gameElement.attr('data-game-pk');
        
        if (gamedayLink) {
          const gameIdMatch = gamedayLink.match(/gameday\/(\d+)|game\/(\d+)/);
          if (gameIdMatch) {
            gameId = gameIdMatch[1] || gameIdMatch[2];
          }
        } else if (dataGamePk) {
          gameId = dataGamePk;
        }

        if (gameId) {
          // Find team names
          const teamElements = gameElement.find('.EventCard-matchupTeamName, .TeamName, .team-name');
          let homeTeam = '';
          let awayTeam = '';
          
          if (teamElements.length >= 2) {
            awayTeam = $(teamElements[0]).text().trim();
            homeTeam = $(teamElements[1]).text().trim();
          }
          
          // Find scores
          const scoreElements = gameElement.find('.EventCard-score, .TeamScore, .team-score');
          let homeScore = 0;
          let awayScore = 0;
          
          if (scoreElements.length >= 2) {
            awayScore = parseInt($(scoreElements[0]).text().trim()) || 0;
            homeScore = parseInt($(scoreElements[1]).text().trim()) || 0;
          }
          
          // Check game status
          const statusElement = gameElement.find('.EventCard-statusText, .GameStatus, .game-status');
          let status: 'scheduled' | 'live' | 'final' | 'postponed' = 'scheduled';
          const statusText = statusElement.text().trim().toLowerCase();
          
          if (statusText.includes('final')) {
            status = 'final';
          } else if (statusText.includes('live') || statusText.includes('top') || statusText.includes('bottom') || statusText.match(/\d+(st|nd|rd|th)/)) {
            status = 'live';
          } else if (statusText.includes('postponed') || statusText.includes('suspended')) {
            status = 'postponed';
          }
          
          // Extract current inning if game is live
          let inning;
          if (status === 'live') {
            inning = statusText;
          }

          if (homeTeam && awayTeam) {
            games.push({
              gameId,
              date,
              homeTeam,
              awayTeam,
              homeScore,
              awayScore,
              status,
              ...(inning && { inning })
            });
          }
        }
      });

      console.log(`Discovered ${games.length} games for ${date}`);
      
      // Cache for 24 hours
      if (games.length > 0) {
        await cacheData(cacheKey, games, 1440);
      }
      
      return games;
    } catch (error) {
      console.error(`Error discovering games for ${date}:`, error);
      return [];
    }
  }

  /**
   * Scrape detailed box score for a specific game
   */
  async scrapeBoxScore(gameId: string): Promise<BoxScore | null> {
    const cacheKey = `${this.CACHE_PREFIX}${gameId}`;
    
    try {
      // Check cache first
      const cachedBoxScore = await getCachedData<BoxScore>(cacheKey);
      if (cachedBoxScore && typeof cachedBoxScore === 'object') {
        console.log(`Found cached box score for game ${gameId}`);
        return cachedBoxScore as BoxScore;
      }

      console.log(`Scraping box score for game ${gameId}...`);
      
      // Try multiple URL patterns as MLB.com structure may vary
      const boxScoreUrls = [
        `https://www.mlb.com/gameday/${gameId}/box`,
        `https://www.mlb.com/gameday/${gameId}`,
        `https://www.mlb.com/game/${gameId}/box`
      ];
      
      let html = '';
      let response;
      let foundValidPage = false;
      
      for (const url of boxScoreUrls) {
        try {
          console.log(`Trying URL: ${url}`);
          response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            html = await response.text();
            foundValidPage = html.includes('box score') || html.includes('boxscore') || html.includes('stats');
            if (foundValidPage) {
              break;
            }
          }
        } catch (innerError) {
          console.log(`Error fetching ${url}: ${innerError}`);
          continue;
        }
      }
      
      if (!foundValidPage || !html) {
        throw new Error(`Could not find valid box score page for game ${gameId}`);
      }
      
      const $ = cheerio.load(html);

      // Extract game info
      const gameDate = $('meta[property="og:title"]').attr('content')?.match(/(\d{1,2}\/\d{1,2}\/\d{4})/) || 
                      $('.GameDayMatchup-dateTime').text().trim().match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      
      const formattedDate = gameDate ? 
        this.formatDate(gameDate[1]) : 
        new Date().toISOString().split('T')[0];

      // Get team names
      let homeTeam = $('.home-team-name, .TeamName--home, .home-team').first().text().trim();
      let awayTeam = $('.away-team-name, .TeamName--away, .away-team').first().text().trim();
      
      if (!homeTeam || !awayTeam) {
        const teamNames = $('.TeamMatchup-team').map((i, el) => $(el).text().trim()).get();
        if (teamNames.length >= 2) {
          awayTeam = teamNames[0];
          homeTeam = teamNames[1];
        }
      }
      
      // Get team scores
      const homeScoreText = $('.home-team-score, .TeamScore--home, .home-score').first().text().trim();
      const awayScoreText = $('.away-team-score, .TeamScore--away, .away-score').first().text().trim();
      const homeScore = parseInt(homeScoreText) || 0;
      const awayScore = parseInt(awayScoreText) || 0;
      
      // Determine game status
      let status: 'scheduled' | 'live' | 'final' | 'postponed' = 'scheduled';
      const statusText = $('.game-status, .GameStatus, .status-text').first().text().trim().toLowerCase();
      
      if (statusText.includes('final')) {
        status = 'final';
      } else if (statusText.includes('live') || statusText.includes('top') || statusText.includes('bottom') || statusText.match(/\d+(st|nd|rd|th)/)) {
        status = 'live';
      } else if (statusText.includes('postponed')) {
        status = 'postponed';
      }
      
      const gameInfo: GameInfo = {
        gameId,
        date: formattedDate,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        status
      };

      // Extract player stats
      const homeTeamStats: PlayerGameStats[] = [];
      const awayTeamStats: PlayerGameStats[] = [];
      const gameEvents: GameEvent[] = [];

      // Process batting stats tables
      this.processBattingStats($, gameInfo, homeTeamStats, awayTeamStats);
      
      // Process pitching stats tables
      this.processPitchingStats($, gameInfo, homeTeamStats, awayTeamStats);
      
      // Process fielding stats if available
      this.processFieldingStats($, gameInfo, homeTeamStats, awayTeamStats);
      
      // Process game events and play-by-play if available
      this.processGameEvents($, gameEvents);
      
      const boxScore: BoxScore = {
        gameInfo,
        homeTeamStats,
        awayTeamStats,
        gameEvents
      };

      // Cache for 7 days (games don't change once final)
      if (status === 'final') {
        await cacheData(cacheKey, boxScore, 10080); // 7 days
      } else {
        // For live games, cache for a shorter period
        await cacheData(cacheKey, boxScore, 10); // 10 minutes
      }
      
      return boxScore;
    } catch (error) {
      console.error(`Error scraping box score for game ${gameId}:`, error);
      return null;
    }
  }
  
  /**
   * Process batting stats from the box score page
   */
  private processBattingStats(
    $: cheerio.CheerioAPI, 
    gameInfo: GameInfo,
    homeTeamStats: PlayerGameStats[],
    awayTeamStats: PlayerGameStats[]
  ): void {
    // Process home team batting
    $('.home-batting, .BoxScore-homeTeamBatters, .home-team-batting, [data-home-batting]')
      .find('tbody tr')
      .each((index, element) => {
        const playerStat = this.extractBattingStats($, element, gameInfo, gameInfo.awayTeam, true);
        if (playerStat) {
          homeTeamStats.push(playerStat);
        }
      });
      
    // Process away team batting
    $('.away-batting, .BoxScore-awayTeamBatters, .away-team-batting, [data-away-batting]')
      .find('tbody tr')
      .each((index, element) => {
        const playerStat = this.extractBattingStats($, element, gameInfo, gameInfo.homeTeam, false);
        if (playerStat) {
          awayTeamStats.push(playerStat);
        }
      });
  }
  
  /**
   * Extract batting stats from a table row
   */
  private extractBattingStats(
    $: cheerio.CheerioAPI, 
    row: any,
    gameInfo: GameInfo,
    opponent: string,
    isHome: boolean
  ): PlayerGameStats | null {
    const $row = $(row);
    
    // Skip header rows or summary rows
    if ($row.find('th').length > 0 || $row.hasClass('summary') || $row.hasClass('total')) {
      return null;
    }
    
    // Get player details
    const playerLink = $row.find('a[href*="/player/"]').attr('href') || '';
    const playerIdMatch = playerLink.match(/player\/(\d+)\//);
    const playerId = playerIdMatch ? playerIdMatch[1] : `unknown-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const playerName = $row.find('.batter-name, .PlayerName, .player-name, a').first().text().trim();
    
    if (!playerName) {
      return null;
    }
    
    // Get all stat cells
    const cells = $row.find('td');
    
    // Get position
    const posText = $row.find('.position, .pos, td:nth-child(2)').text().trim();
    
    // Extract batting statistics with fallbacks for different HTML structures
    const stats: PlayerGameStats = {
      playerId,
      playerName,
      team: isHome ? gameInfo.homeTeam : gameInfo.awayTeam,
      gameId: gameInfo.gameId,
      date: gameInfo.date,
      opponent,
      isHome,
      battingStats: {
        atBats: this.extractNumericStat($, cells, ['ab', 'AB', 'at-bats']),
        runs: this.extractNumericStat($, cells, ['r', 'R', 'runs']),
        hits: this.extractNumericStat($, cells, ['h', 'H', 'hits']),
        rbi: this.extractNumericStat($, cells, ['rbi', 'RBI']),
        walks: this.extractNumericStat($, cells, ['bb', 'BB', 'walks']),
        strikeouts: this.extractNumericStat($, cells, ['so', 'SO', 'K', 'strikeouts']),
        avg: this.extractFloatStat($, cells, ['avg', 'AVG', 'batting-average']) || 0,
        obp: this.extractFloatStat($, cells, ['obp', 'OBP', 'on-base-pct']) || 0,
        slg: this.extractFloatStat($, cells, ['slg', 'SLG', 'slugging-pct']) || 0,
        ops: this.extractFloatStat($, cells, ['ops', 'OPS']) || 0,
        doubles: this.extractNumericStat($, cells, ['2b', '2B', 'doubles']),
        triples: this.extractNumericStat($, cells, ['3b', '3B', 'triples']),
        homeRuns: this.extractNumericStat($, cells, ['hr', 'HR', 'home-runs']),
        stolenBases: this.extractNumericStat($, cells, ['sb', 'SB', 'stolen-bases']),
        caughtStealing: this.extractNumericStat($, cells, ['cs', 'CS', 'caught-stealing']),
        hitByPitch: this.extractNumericStat($, cells, ['hbp', 'HBP']),
        sacrifices: this.extractNumericStat($, cells, ['sac', 'SAC']),
        groundIntoDoublePlay: this.extractNumericStat($, cells, ['gidp', 'GIDP', 'gdp', 'GDP']),
        leftOnBase: this.extractNumericStat($, cells, ['lob', 'LOB'])
      }
    };
    
    return stats;
  }
  
  /**
   * Process pitching stats from the box score page
   */
  private processPitchingStats(
    $: cheerio.CheerioAPI, 
    gameInfo: GameInfo,
    homeTeamStats: PlayerGameStats[],
    awayTeamStats: PlayerGameStats[]
  ): void {
    // Process home team pitching
    $('.home-pitching, .BoxScore-homeTeamPitchers, .home-team-pitching, [data-home-pitching]')
      .find('tbody tr')
      .each((index, element) => {
        const playerStat = this.extractPitchingStats($, element, gameInfo, gameInfo.awayTeam, true);
        if (playerStat) {
          // Check if player already exists in the array (e.g., they also had batting stats)
          const existingPlayerIndex = homeTeamStats.findIndex(p => p.playerId === playerStat.playerId);
          if (existingPlayerIndex >= 0) {
            homeTeamStats[existingPlayerIndex].pitchingStats = playerStat.pitchingStats;
          } else {
            homeTeamStats.push(playerStat);
          }
        }
      });
      
    // Process away team pitching
    $('.away-pitching, .BoxScore-awayTeamPitchers, .away-team-pitching, [data-away-pitching]')
      .find('tbody tr')
      .each((index, element) => {
        const playerStat = this.extractPitchingStats($, element, gameInfo, gameInfo.homeTeam, false);
        if (playerStat) {
          // Check if player already exists in the array
          const existingPlayerIndex = awayTeamStats.findIndex(p => p.playerId === playerStat.playerId);
          if (existingPlayerIndex >= 0) {
            awayTeamStats[existingPlayerIndex].pitchingStats = playerStat.pitchingStats;
          } else {
            awayTeamStats.push(playerStat);
          }
        }
      });
  }
  
  /**
   * Extract pitching stats from a table row
   */
  private extractPitchingStats(
    $: cheerio.CheerioAPI, 
    row: Element,
    gameInfo: GameInfo,
    opponent: string,
    isHome: boolean
  ): PlayerGameStats | null {
    const $row = $(row);
    
    // Skip header rows or summary rows
    if ($row.find('th').length > 0 || $row.hasClass('summary') || $row.hasClass('total')) {
      return null;
    }
    
    // Get player details
    const playerLink = $row.find('a[href*="/player/"]').attr('href') || '';
    const playerIdMatch = playerLink.match(/player\/(\d+)\//);
    const playerId = playerIdMatch ? playerIdMatch[1] : `unknown-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const playerName = $row.find('.pitcher-name, .PlayerName, .player-name, a').first().text().trim();
    
    if (!playerName) {
      return null;
    }
    
    // Get all stat cells
    const cells = $row.find('td');
    
    // Extract innings pitched (may be fractional)
    const ipCell = cells.filter((i, el) => {
      const cellText = $(el).text().toLowerCase();
      return cellText.includes('ip') || cellText.includes('innings') || 
             $(el).hasClass('ip') || $(el).hasClass('innings-pitched');
    }).first();
    
    let inningsPitched = 0;
    if (ipCell.length) {
      const ipText = ipCell.text().trim();
      if (ipText.includes('.')) {
        // Handle formats like "6.2" meaning 6 2/3 innings
        const [full, partial] = ipText.split('.');
        inningsPitched = parseInt(full) + (parseInt(partial) / 3);
      } else {
        inningsPitched = parseInt(ipText) || 0;
      }
    }
    
    // Extract pitching statistics
    const stats: PlayerGameStats = {
      playerId,
      playerName,
      team: isHome ? gameInfo.homeTeam : gameInfo.awayTeam,
      gameId: gameInfo.gameId,
      date: gameInfo.date,
      opponent,
      isHome,
      pitchingStats: {
        inningsPitched,
        hits: this.extractNumericStat($, cells, ['h', 'H', 'hits']),
        runs: this.extractNumericStat($, cells, ['r', 'R', 'runs']),
        earnedRuns: this.extractNumericStat($, cells, ['er', 'ER', 'earned-runs']),
        walks: this.extractNumericStat($, cells, ['bb', 'BB', 'walks']),
        strikeouts: this.extractNumericStat($, cells, ['so', 'SO', 'K', 'strikeouts']),
        homeRuns: this.extractNumericStat($, cells, ['hr', 'HR', 'home-runs']),
        era: this.extractFloatStat($, cells, ['era', 'ERA']) || 0,
        whip: this.extractFloatStat($, cells, ['whip', 'WHIP']) || 0,
        pitchCount: this.extractNumericStat($, cells, ['pc', 'np', 'pitches', 'pitch-count']),
        strikes: this.extractNumericStat($, cells, ['st', 'strikes']),
        balls: 0, // Calculate below if pitch count and strikes are available
        firstPitchStrikes: this.extractNumericStat($, cells, ['1st', 'first-pitch']),
        swingingStrikes: this.extractNumericStat($, cells, ['swinging', 'sw']),
        calledStrikes: this.extractNumericStat($, cells, ['called', 'cl']),
        groundBalls: this.extractNumericStat($, cells, ['gb', 'ground']),
        flyBalls: this.extractNumericStat($, cells, ['fb', 'fly']),
        popUps: this.extractNumericStat($, cells, ['po', 'pop']),
        lineOuts: this.extractNumericStat($, cells, ['lo', 'line'])
      }
    };
    
    // Calculate balls if we have pitch count and strikes
    if (stats.pitchingStats && stats.pitchingStats.pitchCount > 0 && stats.pitchingStats.strikes > 0) {
      stats.pitchingStats.balls = stats.pitchingStats.pitchCount - stats.pitchingStats.strikes;
    }
    
    return stats;
  }
  
  /**
   * Process fielding stats from the box score page
   */
  private processFieldingStats(
    $: cheerio.CheerioAPI, 
    gameInfo: GameInfo,
    homeTeamStats: PlayerGameStats[],
    awayTeamStats: PlayerGameStats[]
  ): void {
    // Fielding stats are less commonly available in box scores,
    // but we'll implement basic processing if they're present
    
    // Process home team fielding
    $('.home-fielding, .BoxScore-homeTeamFielding, .home-team-fielding, [data-home-fielding]')
      .find('tbody tr')
      .each((index, element) => {
        this.extractFieldingStats($, element, gameInfo, homeTeamStats);
      });
      
    // Process away team fielding
    $('.away-fielding, .BoxScore-awayTeamFielding, .away-team-fielding, [data-away-fielding]')
      .find('tbody tr')
      .each((index, element) => {
        this.extractFieldingStats($, element, gameInfo, awayTeamStats);
      });
  }
  
  /**
   * Extract fielding stats from a table row
   */
  private extractFieldingStats(
    $: cheerio.CheerioAPI, 
    row: Element,
    gameInfo: GameInfo,
    teamStats: PlayerGameStats[]
  ): void {
    const $row = $(row);
    
    // Skip header rows or summary rows
    if ($row.find('th').length > 0 || $row.hasClass('summary') || $row.hasClass('total')) {
      return;
    }
    
    // Get player details
    const playerLink = $row.find('a[href*="/player/"]').attr('href') || '';
    const playerIdMatch = playerLink.match(/player\/(\d+)\//);
    const playerId = playerIdMatch ? playerIdMatch[1] : '';
    
    if (!playerId) {
      const playerName = $row.find('.player-name, .PlayerName, a').first().text().trim();
      if (!playerName) return;
      
      // Try to find player by name
      const existingPlayer = teamStats.find(p => p.playerName === playerName);
      if (!existingPlayer) return;
    }
    
    // Get all stat cells
    const cells = $row.find('td');
    
    // Get position
    const posText = $row.find('.position, .pos, td:nth-child(2)').text().trim();
    const position = posText || 'Unknown';
    
    // Extract fielding stats
    const fieldingStats = {
      position,
      innings: 9, // Default to full game if not specified
      putOuts: this.extractNumericStat($, cells, ['po', 'PO', 'putouts']),
      assists: this.extractNumericStat($, cells, ['a', 'A', 'assists']),
      errors: this.extractNumericStat($, cells, ['e', 'E', 'errors']),
      chances: 0, // Will calculate below
      fieldingPercentage: 0, // Will calculate below
      doublePlays: this.extractNumericStat($, cells, ['dp', 'DP', 'double-plays']),
      triplePlays: this.extractNumericStat($, cells, ['tp', 'TP', 'triple-plays']),
    };
    
    // Add catcher-specific stats if applicable
    if (position === 'C') {
      Object.assign(fieldingStats, {
        passedBalls: this.extractNumericStat($, cells, ['pb', 'PB', 'passed-balls']),
        stolenBasesAllowed: this.extractNumericStat($, cells, ['sba', 'SBA', 'stolen-bases']),
        caughtStealing: this.extractNumericStat($, cells, ['cs', 'CS', 'caught-stealing'])
      });
    }
    
    // Calculate fielding chances and percentage
    fieldingStats.chances = fieldingStats.putOuts + fieldingStats.assists + fieldingStats.errors;
    if (fieldingStats.chances > 0) {
      fieldingStats.fieldingPercentage = (fieldingStats.putOuts + fieldingStats.assists) / fieldingStats.chances;
    }
    
    // Find matching player in team stats and add fielding stats
    if (playerId) {
      const existingPlayerIndex = teamStats.findIndex(p => p.playerId === playerId);
      if (existingPlayerIndex >= 0) {
        teamStats[existingPlayerIndex].fieldingStats = fieldingStats;
      }
    } else {
      // Fallback to name matching
      const playerName = $row.find('.player-name, .PlayerName, a').first().text().trim();
      const existingPlayerIndex = teamStats.findIndex(p => p.playerName === playerName);
      if (existingPlayerIndex >= 0) {
        teamStats[existingPlayerIndex].fieldingStats = fieldingStats;
      }
    }
  }
  
  /**
   * Process game events and play-by-play
   */
  private processGameEvents(
    $: cheerio.CheerioAPI, 
    gameEvents: GameEvent[]
  ): void {
    // Play-by-play events - this varies greatly by MLB.com page structure
    // and may require more specific implementation
    $('.play-by-play, .PlayByPlay, .game-events, [data-play-by-play]')
      .find('tbody tr, .event-row')
      .each((index, element) => {
        const $row = $(element);
        
        // Skip header rows
        if ($row.find('th').length > 0) return;
        
        // Extract event details
        const inningText = $row.find('.inning, .play-inning').text().trim();
        const inningMatch = inningText.match(/(\d+)/);
        const inning = inningMatch ? parseInt(inningMatch[1]) : 0;
        
        const topBottom = inningText.toLowerCase().includes('top') ? 'top' : 'bottom';
        
        const outsText = $row.find('.outs, .play-outs').text().trim();
        const outsMatch = outsText.match(/(\d+)/);
        const outs = outsMatch ? parseInt(outsMatch[1]) : 0;
        
        const pitcherName = $row.find('.pitcher, .play-pitcher').text().trim();
        const batterName = $row.find('.batter, .play-batter').text().trim();
        const description = $row.find('.description, .play-description').text().trim();
        const result = $row.find('.result, .play-result').text().trim();
        
        const countText = $row.find('.count, .play-count').text().trim();
        const countMatch = countText.match(/(\d+)-(\d+)/);
        const balls = countMatch ? parseInt(countMatch[1]) : 0;
        const strikes = countMatch ? parseInt(countMatch[2]) : 0;
        
        const timestamp = $row.find('.timestamp, .play-time').text().trim();
        
        if (inning > 0 && (description || result)) {
          gameEvents.push({
            inning,
            topBottom,
            outs,
            balls,
            strikes,
            batter: batterName,
            pitcher: pitcherName,
            description,
            result,
            ...(timestamp && { timestamp })
          });
        }
      });
  }
  
  /**
   * Helper function to extract numeric stat from table cells
   */
  private extractNumericStat(
    $: cheerio.CheerioAPI, 
    cells: cheerio.Cheerio<Element>,
    statIdentifiers: string[]
  ): number {
    // First try classes and data attributes
    for (const id of statIdentifiers) {
      const cell = cells.filter((i, el) => {
        return $(el).hasClass(id) || 
               $(el).attr('data-stat') === id ||
               $(el).attr('data-col') === id;
      });
      
      if (cell.length) {
        const value = parseInt(cell.text().trim());
        if (!isNaN(value)) return value;
      }
    }
    
    // Try header-based column matching
    const headers = $('thead th');
    for (const id of statIdentifiers) {
      let foundValue = 0;
      headers.each((colIndex, header) => {
        if ($(header).text().trim().toLowerCase() === id.toLowerCase()) {
          const value = parseInt($(cells[colIndex]).text().trim());
          if (!isNaN(value)) {
            foundValue = value;
          }
        }
      });
      if (foundValue !== 0) return foundValue;
    }
    
    return 0;
  }
  
  /**
   * Helper function to extract float stat from table cells
   */
  private extractFloatStat(
    $: cheerio.CheerioAPI, 
    cells: cheerio.Cheerio<Element>,
    statIdentifiers: string[]
  ): number | null {
    // First try classes and data attributes
    for (const id of statIdentifiers) {
      const cell = cells.filter((i, el) => {
        return $(el).hasClass(id) || 
               $(el).attr('data-stat') === id ||
               $(el).attr('data-col') === id;
      });
      
      if (cell.length) {
        const value = parseFloat(cell.text().trim());
        if (!isNaN(value)) return value;
      }
    }
    
    // Try header-based column matching
    const headers = $('thead th');
    for (const id of statIdentifiers) {
      let foundValue: number | null = null;
      headers.each((colIndex, header) => {
        if ($(header).text().trim().toLowerCase() === id.toLowerCase()) {
          const value = parseFloat($(cells[colIndex]).text().trim());
          if (!isNaN(value)) {
            foundValue = value;
          }
        }
      });
      if (foundValue !== null) return foundValue;
    }
    
    return null;
  }
  
  /**
   * Format date string to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    // Handle common MLB.com date formats
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date().toISOString().split('T')[0];
    
    let month = parseInt(parts[0]);
    let day = parseInt(parts[1]);
    let year = parseInt(parts[2]);
    
    // Ensure proper formatting with leading zeros
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    
    return `${year}-${monthStr}-${dayStr}`;
  }
}

export default new BoxScoreService();
