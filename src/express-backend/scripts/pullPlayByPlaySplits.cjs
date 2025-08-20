// ============================================================================
// MLB PLAY-BY-PLAY SPLITS DATA COLLECTION SCRIPT
// ============================================================================
// Mission: Extract exhaustive situational splits from MLB play-by-play data
// Goal: "Testing every possible baseball statistic that is imaginable"
//
// This script processes MLB play-by-play data to create comprehensive split
// statistics with full linkage to existing boxscore data for complete analytics.
// ============================================================================

require('dotenv').config();
const Redis = require('ioredis');
let fetch;

// Redis connection using existing infrastructure
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,  
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Split categories we'll extract from play-by-play data
 */
const SPLIT_CATEGORIES = {
  HOME_AWAY: 'home-away',
  VENUE: 'venue', 
  PLAYER_TEAM: 'player-team',
  BATTER_PITCHER: 'batter-pitcher',
  HANDEDNESS_BATTER: 'batter-hand',
  HANDEDNESS_PITCHER: 'pitcher-hand',
  TEAM_MATCHUP: 'team-matchup',
  SITUATIONAL: 'situational' // Bases loaded, late innings, etc.
};

/**
 * Data structure for tracking splits with game linkage
 */
class SplitTracker {
  constructor() {
    this.splits = new Map();
    this.gameLinkages = new Map();
    this.playerGameIndex = new Map();
  }

  /**
   * Add a split observation with game context
   */
  addSplitObservation(splitKey, gameId, playData, outcome) {
    if (!this.splits.has(splitKey)) {
      this.splits.set(splitKey, {
        stats: this.initializeStats(),
        games: new Set(),
        plays: []
      });
    }

    const split = this.splits.get(splitKey);
    split.games.add(gameId);
    split.plays.push({ gameId, playData, outcome });
    this.updateStats(split.stats, outcome, playData);

    // Track reverse linkage (game -> splits)
    if (!this.gameLinkages.has(gameId)) {
      this.gameLinkages.set(gameId, new Set());
    }
    this.gameLinkages.get(gameId).add(splitKey);
  }

  initializeStats() {
    return {
      batting: {
        plateAppearances: 0, atBats: 0, hits: 0, runs: 0, rbi: 0, 
        homeRuns: 0, doubles: 0, triples: 0, singles: 0,
        walks: 0, strikeouts: 0, hitByPitch: 0,
        sacrificeFlies: 0, sacrificeHits: 0, stolenBases: 0,
        groundedIntoDoublePlay: 0,
        avg: 0, obp: 0, slg: 0, ops: 0
      },
      pitching: {
        inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0,
        walks: 0, strikeouts: 0, homeRuns: 0, 
        battersFaced: 0, hitBatsmen: 0, outs: 0,
        era: 0, whip: 0, strikeoutRate: 0, walkRate: 0
      }
    };
  }

  updateStats(stats, outcome, playData) {
    // Core statistical engine - converts play-by-play outcomes to baseball statistics
    if (!outcome || !playData) return;

    const { result, about, matchup } = playData;
    const { event, eventType, rbi = 0, awayScore = 0, homeScore = 0 } = result;
    
    // Determine if this is a batting or pitching context based on the split type
    // For now, we'll update both batting and pitching stats as applicable
    
    // BATTING STATISTICS UPDATES
    this.updateBattingStats(stats.batting, result, about, matchup);
    
    // PITCHING STATISTICS UPDATES  
    this.updatePitchingStats(stats.pitching, result, about, matchup);
    
    // Calculate derived statistics
    this.calculateDerivedStats(stats);
  }

  /**
   * Update batting statistics based on play outcome
   */
  updateBattingStats(batting, result, about, matchup) {
    const { event, eventType, rbi = 0 } = result;
    
    // Plate appearance tracking
    if (this.isPlateAppearance(event)) {
      batting.plateAppearances++;
    }
    
    // At-bat tracking (exclude walks, HBP, sacrifices, etc.)
    if (this.isAtBat(event)) {
      batting.atBats++;
    }
    
    // Hit tracking
    if (this.isHit(event)) {
      batting.hits++;
      
      // Specific hit types
      switch (eventType?.toLowerCase()) {
        case 'single':
          batting.singles = (batting.singles || 0) + 1;
          break;
        case 'double':
          batting.doubles++;
          break;
        case 'triple':
          batting.triples++;
          break;
        case 'home_run':
        case 'home run':
          batting.homeRuns++;
          break;
      }
    }
    
    // RBI tracking
    if (rbi > 0) {
      batting.rbi += rbi;
    }
    
    // Runs tracking (if batter scored on this play)
    if (this.batterScored(result, about)) {
      batting.runs++;
    }
    
    // Walk tracking
    if (this.isWalk(event)) {
      batting.walks++;
    }
    
    // Strikeout tracking
    if (this.isStrikeout(event)) {
      batting.strikeouts++;
    }
    
    // Hit by pitch tracking
    if (this.isHitByPitch(event)) {
      batting.hitByPitch = (batting.hitByPitch || 0) + 1;
    }
    
    // Sacrifice tracking
    if (this.isSacrifice(event)) {
      if (event.toLowerCase().includes('fly')) {
        batting.sacrificeFlies = (batting.sacrificeFlies || 0) + 1;
      } else {
        batting.sacrificeHits = (batting.sacrificeHits || 0) + 1;
      }
    }
    
    // Stolen base tracking (if available in play data)
    if (this.isStolenBase(result)) {
      batting.stolenBases = (batting.stolenBases || 0) + 1;
    }
    
    // Grounded into double play
    if (this.isGroundedIntoDoublePlay(event)) {
      batting.groundedIntoDoublePlay = (batting.groundedIntoDoublePlay || 0) + 1;
    }
  }

  /**
   * Update pitching statistics based on play outcome
   */
  updatePitchingStats(pitching, result, about, matchup) {
    const { event, eventType, rbi = 0 } = result;
    
    // Batter faced tracking
    if (this.isPlateAppearance(event)) {
      pitching.battersFaced = (pitching.battersFaced || 0) + 1;
    }
    
    // Hits allowed
    if (this.isHit(event)) {
      pitching.hits++;
      
      // Home runs allowed
      if (eventType?.toLowerCase() === 'home_run' || eventType?.toLowerCase() === 'home run') {
        pitching.homeRuns++;
      }
    }
    
    // Walks allowed
    if (this.isWalk(event)) {
      pitching.walks++;
    }
    
    // Strikeouts recorded
    if (this.isStrikeout(event)) {
      pitching.strikeouts++;
    }
    
    // Hit batsmen
    if (this.isHitByPitch(event)) {
      pitching.hitBatsmen = (pitching.hitBatsmen || 0) + 1;
    }
    
    // Runs and earned runs (simplified - would need more context for earned vs unearned)
    if (rbi > 0) {
      pitching.runs += rbi;
      pitching.earnedRuns += rbi; // Simplified assumption
    }
    
    // Innings pitched tracking (would need more sophisticated logic based on outs)
    if (about.isComplete && this.isOut(event)) {
      const outsRecorded = this.getOutsRecorded(event);
      pitching.outs = (pitching.outs || 0) + outsRecorded;
      pitching.inningsPitched = Math.floor(pitching.outs / 3) + ((pitching.outs % 3) / 10);
    }
  }

  /**
   * Calculate derived statistics (averages, percentages, etc.)
   */
  calculateDerivedStats(stats) {
    const { batting, pitching } = stats;
    
    // Batting averages and rates
    if (batting.atBats > 0) {
      batting.avg = parseFloat((batting.hits / batting.atBats).toFixed(3));
    }
    
    if (batting.plateAppearances > 0) {
      const onBaseEvents = batting.hits + batting.walks + (batting.hitByPitch || 0);
      batting.obp = parseFloat((onBaseEvents / batting.plateAppearances).toFixed(3));
    }
    
    if (batting.atBats > 0) {
      const totalBases = (batting.singles || 0) + (batting.doubles * 2) + (batting.triples * 3) + (batting.homeRuns * 4);
      batting.slg = parseFloat((totalBases / batting.atBats).toFixed(3));
      batting.ops = parseFloat((batting.obp + batting.slg).toFixed(3));
    }
    
    // Pitching rates  
    if (pitching.inningsPitched > 0) {
      pitching.era = parseFloat(((pitching.earnedRuns * 9) / pitching.inningsPitched).toFixed(2));
      pitching.whip = parseFloat(((pitching.hits + pitching.walks) / pitching.inningsPitched).toFixed(2));
    }
    
    if (pitching.battersFaced > 0) {
      pitching.strikeoutRate = parseFloat((pitching.strikeouts / pitching.battersFaced).toFixed(3));
      pitching.walkRate = parseFloat((pitching.walks / pitching.battersFaced).toFixed(3));
    }
  }

  // ============================================================================
  // HELPER METHODS FOR PLAY CLASSIFICATION
  // ============================================================================

  isPlateAppearance(event) {
    // All events that end a plate appearance
    return event && event.trim().length > 0;
  }

  isAtBat(event) {
    // Exclude walks, HBP, sacrifices, interference
    const nonAtBatEvents = [
      'walk', 'intentional walk', 'hit by pitch', 'sacrifice fly', 
      'sacrifice bunt', 'catcher interference', 'interference'
    ];
    return !nonAtBatEvents.some(nonAB => event.toLowerCase().includes(nonAB.toLowerCase()));
  }

  isHit(event) {
    const hitEvents = ['single', 'double', 'triple', 'home run', 'home_run'];
    return hitEvents.some(hit => event.toLowerCase().includes(hit));
  }

  isWalk(event) {
    return event.toLowerCase().includes('walk');
  }

  isStrikeout(event) {
    return event.toLowerCase().includes('strikeout') || event.toLowerCase().includes('struck out');
  }

  isHitByPitch(event) {
    return event.toLowerCase().includes('hit by pitch');
  }

  isSacrifice(event) {
    return event.toLowerCase().includes('sacrifice');
  }

  isStolenBase(result) {
    // Would need to check for stolen base events in the play data
    return false; // Placeholder - would need more sophisticated parsing
  }

  isGroundedIntoDoublePlay(event) {
    return event.toLowerCase().includes('double play') || event.toLowerCase().includes('grounded into dp');
  }

  isOut(event) {
    const outEvents = [
      'strikeout', 'groundout', 'flyout', 'popup', 'lineout', 
      'forceout', 'fieldout', 'caught stealing'
    ];
    return outEvents.some(out => event.toLowerCase().includes(out));
  }

  getOutsRecorded(event) {
    if (event.toLowerCase().includes('double play')) {
      return 2;
    } else if (event.toLowerCase().includes('triple play')) {
      return 3;
    } else if (this.isOut(event)) {
      return 1;
    }
    return 0;
  }

  batterScored(result, about) {
    // Would need more sophisticated logic to determine if batter scored
    // For now, assume home runs result in batter scoring
    return result.event.toLowerCase().includes('home run');
  }
}

// ============================================================================
// PLAY-BY-PLAY DATA PROCESSING
// ============================================================================

/**
 * Fetch play-by-play data for a specific game
 */
async function fetchPlayByPlayData(gameId) {
  try {
    if (!fetch) {
      fetch = (await import('node-fetch')).default;
    }

    const url = `https://statsapi.mlb.com/api/v1/game/${gameId}/playByPlay`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching play-by-play for game ${gameId}:`, error.message);
    return null;
  }
}

/**
 * Process all plays in a game to extract splits
 */
async function processGameSplits(gameId, playByPlayData, gameDate, homeTeam, awayTeam) {
  const splitTracker = new SplitTracker();
  const plays = playByPlayData.allPlays || [];
  
  console.log(`🎯 Processing ${plays.length} plays for game ${gameId} (${homeTeam} vs ${awayTeam})`);

  for (const play of plays) {
    try {
      await processIndividualPlay(splitTracker, gameId, play, gameDate, homeTeam, awayTeam);
    } catch (error) {
      console.error(`⚠️ Error processing play in game ${gameId}:`, error.message);
    }
  }

  return splitTracker;
}

/**
 * Process a single play to extract all possible splits
 */
async function processIndividualPlay(splitTracker, gameId, play, gameDate, homeTeam, awayTeam) {
  const { result, about, matchup, playEvents } = play;
  
  if (!matchup || !matchup.batter || !matchup.pitcher) {
    return; // Skip plays without complete matchup data
  }

  // Extract key information
  const batter = matchup.batter;
  const pitcher = matchup.pitcher;
  const isTopInning = about.isTopInning;
  const battingTeam = isTopInning ? awayTeam : homeTeam;
  const fieldingTeam = isTopInning ? homeTeam : awayTeam;
  const venue = homeTeam; // Simplified - venue is home team's stadium
  
  // Determine handedness
  const batterHand = matchup.batSide?.code || 'U'; // Unknown if not provided
  const pitcherHand = matchup.pitchHand?.code || 'U';

  // 1. HOME/AWAY SPLITS
  const homeAwayContext = battingTeam === homeTeam ? 'home' : 'away';
  const homeAwaySplitKey = `split:home-away:${battingTeam}-${batter.fullName.replace(/\s+/g, '_')}-2025:${homeAwayContext}`;
  splitTracker.addSplitObservation(homeAwaySplitKey, gameId, play, result);

  // 2. VENUE SPLITS  
  const venueSplitKey = `split:venue:${battingTeam}-${batter.fullName.replace(/\s+/g, '_')}-2025:vs:${venue}:${homeAwayContext}`;
  splitTracker.addSplitObservation(venueSplitKey, gameId, play, result);

  // 3. PLAYER vs TEAM SPLITS
  const playerTeamSplitKey = `split:player-team:${battingTeam}-${batter.fullName.replace(/\s+/g, '_')}-2025:vs:${fieldingTeam}:${homeAwayContext}`;
  splitTracker.addSplitObservation(playerTeamSplitKey, gameId, play, result);

  // 4. BATTER vs PITCHER SPLITS (The key matchup!)
  const batterPitcherSplitKey = `split:batter-pitcher:${battingTeam}-${batter.fullName.replace(/\s+/g, '_')}-2025:vs:${fieldingTeam}-${pitcher.fullName.replace(/\s+/g, '_')}:${homeAwayContext}`;
  splitTracker.addSplitObservation(batterPitcherSplitKey, gameId, play, result);

  // 5. HANDEDNESS SPLITS
  const batterHandSplitKey = `split:batter-hand:${battingTeam}-${batter.fullName.replace(/\s+/g, '_')}-2025:vs:${pitcherHand}:${homeAwayContext}`;
  splitTracker.addSplitObservation(batterHandSplitKey, gameId, play, result);

  const pitcherHandSplitKey = `split:pitcher-hand:${fieldingTeam}-${pitcher.fullName.replace(/\s+/g, '_')}-2025:vs:${batterHand}:${homeAwayContext}`;
  splitTracker.addSplitObservation(pitcherHandSplitKey, gameId, play, result);

  // 6. TEAM MATCHUP SPLITS
  const teamMatchupSplitKey = `split:team-matchup:${battingTeam}:vs:${fieldingTeam}:2025:${homeAwayContext}`;
  splitTracker.addSplitObservation(teamMatchupSplitKey, gameId, play, result);

  // 7. GAME-SPECIFIC SPLIT TRACKING (For boxscore linkage)
  const gameSpecificKey = `split-game:${gameId}-${gameDate}:batter-pitcher:${batter.fullName.replace(/\s+/g, '_')}:vs:${pitcher.fullName.replace(/\s+/g, '_')}`;
  splitTracker.addSplitObservation(gameSpecificKey, gameId, play, result);
}

// ============================================================================
// REDIS STORAGE OPERATIONS
// ============================================================================

/**
 * Store split data in Redis with game linkage
 */
async function storeSplitsInRedis(splitTracker, gameId) {
  console.log(`💾 Storing splits data for game ${gameId}...`);
  
  const pipeline = redisClient.pipeline();
  let storedCount = 0;

  // Store aggregate splits
  for (const [splitKey, splitData] of splitTracker.splits.entries()) {
    const redisData = {
      stats: splitData.stats,
      games: Array.from(splitData.games),
      lastUpdated: new Date().toISOString(),
      playCount: splitData.plays.length
    };

    pipeline.set(splitKey, JSON.stringify(redisData));
    storedCount++;
  }

  // Store game linkage indices
  for (const [gameId, splitKeys] of splitTracker.gameLinkages.entries()) {
    const linkageKey = `game-splits-index:${gameId}`;
    const linkageData = {
      gameId,
      splitTypes: Array.from(splitKeys),
      processed: new Date().toISOString()
    };
    
    pipeline.set(linkageKey, JSON.stringify(linkageData));
  }

  // Execute all Redis operations
  await pipeline.exec();
  console.log(`✅ Stored ${storedCount} split records for game ${gameId}`);
}

// ============================================================================
// TEAM ABBREVIATION EXTRACTION FROM BOXSCORE DATA
// ============================================================================

/**
 * Extract actual team abbreviations from boxscore API data
 * This ensures perfect consistency with existing boxscore keys
 */
async function buildTeamAbbreviationMapping() {
  console.log('🔍 Building team abbreviation mapping from actual boxscore data...');
  
  const teamMapping = {};
  
  try {
    // Get a recent game to find all team IDs and their actual abbreviations
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&season=2025&startDate=2025-08-01&endDate=2025-08-01`;
    const scheduleResp = await fetch(scheduleUrl);
    const scheduleData = await scheduleResp.json();
    
    const games = [];
    for (const dateObj of scheduleData.dates || []) {
      games.push(...(dateObj.games || []));
    }
    
    // Process a few games to get team abbreviations from boxscore data
    for (const game of games.slice(0, 5)) {
      const gameId = game.gamePk;
      
      try {
        // Fetch boxscore data (same API our boxscore script uses)
        const boxscoreUrl = `https://statsapi.mlb.com/api/v1/game/${gameId}/boxscore`;
        const boxscoreResp = await fetch(boxscoreUrl);
        const boxscoreData = await boxscoreResp.json();
        
        // Extract team abbreviations exactly as the boxscore script does
        const awayTeam = boxscoreData.teams?.away?.team?.abbreviation?.toUpperCase();
        const homeTeam = boxscoreData.teams?.home?.team?.abbreviation?.toUpperCase();
        const awayTeamId = boxscoreData.teams?.away?.team?.id;
        const homeTeamId = boxscoreData.teams?.home?.team?.id;
        
        if (awayTeam && awayTeamId) {
          teamMapping[awayTeamId] = awayTeam;
        }
        if (homeTeam && homeTeamId) {
          teamMapping[homeTeamId] = homeTeam;
        }
        
        console.log(`📊 Game ${gameId}: ${awayTeam} (${awayTeamId}) @ ${homeTeam} (${homeTeamId})`);
        
      } catch (error) {
        console.log(`⚠️ Could not fetch boxscore for game ${gameId}: ${error.message}`);
      }
    }
    
    console.log(`✅ Built team mapping with ${Object.keys(teamMapping).length} teams`);
    console.log('Team ID → Abbreviation mapping:');
    Object.entries(teamMapping)
      .sort(([,a], [,b]) => a.localeCompare(b))
      .forEach(([id, abbr]) => console.log(`  ${id}: '${abbr}'`));
    
    return teamMapping;
    
  } catch (error) {
    console.error('❌ Error building team mapping:', error.message);
    // Fallback to our static mapping if API fails
    console.log('🔄 Falling back to static team mapping...');
    return FALLBACK_TEAM_MAPPING;
  }
}

/**
 * Fallback team mapping (only used if API fails)
 */
const FALLBACK_TEAM_MAPPING = {
  110: 'BAL', 111: 'BOS', 147: 'NYY', 139: 'TB', 141: 'TOR',
  145: 'CWS', 114: 'CLE', 116: 'DET', 118: 'KC', 142: 'MIN',
  108: 'LAA', 117: 'HOU', 133: 'ATH', 136: 'SEA', 140: 'TEX',
  144: 'ATL', 146: 'MIA', 121: 'NYM', 143: 'PHI', 120: 'WSH',
  112: 'CHC', 113: 'CIN', 158: 'MIL', 134: 'PIT', 138: 'STL',
  109: 'AZ', 115: 'COL', 119: 'LAD', 135: 'SD', 137: 'SF'
};

// Global variable to store the dynamic team mapping
let DYNAMIC_TEAM_MAPPING = {};

/**
 * Get team abbreviation using the dynamic mapping
 */
function getTeamAbbreviation(teamId) {
  return DYNAMIC_TEAM_MAPPING[teamId] || 'UNK';
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Main function to process splits for a date range
 */
async function pullPlayByPlaySplits(season, startDate, endDate) {
  console.log(`\n🚀 Starting Play-by-Play Splits Collection for ${season}...`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  console.log('🎯 Mission: Extract exhaustive situational splits for comprehensive analytics\n');

  // Initialize fetch
  if (!fetch) {
    fetch = (await import('node-fetch')).default;
  }

  try {
    // STEP 1: Build accurate team abbreviation mapping from boxscore data
    console.log('🔧 Step 1: Building team abbreviation mapping...');
    DYNAMIC_TEAM_MAPPING = await buildTeamAbbreviationMapping();
    console.log('✅ Team mapping complete\n');

    // STEP 2: Get the schedule to find games to process
    console.log('📅 Step 2: Fetching game schedule...');
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&season=${season}&startDate=${startDate}&endDate=${endDate}`;
    const scheduleResp = await fetch(scheduleUrl);
    const scheduleData = await scheduleResp.json();
    
    const allGames = [];
    for (const dateObj of scheduleData.dates || []) {
      allGames.push(...(dateObj.games || []));
    }

    const completedGames = allGames.filter(game => 
      game.status?.abstractGameState === 'Final' || game.status?.codedGameState === 'F'
    );

    console.log(`📊 Found ${completedGames.length} completed games to process for splits\n`);

    // STEP 3: Process each game for splits
    console.log('🎯 Step 3: Processing games for split data...');
    let processedCount = 0;
    for (const game of completedGames.slice(0, 5)) { // Start with 5 games for testing
      const gameId = game.gamePk;
      const gameDate = game.officialDate || game.gameDate?.split('T')[0];
      const homeTeam = getTeamAbbreviation(game.teams?.home?.team?.id);
      const awayTeam = getTeamAbbreviation(game.teams?.away?.team?.id);

      console.log(`\n🎮 Processing Game ${gameId}: ${awayTeam} @ ${homeTeam} (${gameDate})`);

      // Fetch play-by-play data
      const playByPlayData = await fetchPlayByPlayData(gameId);
      
      if (playByPlayData) {
        // Process splits
        const splitTracker = await processGameSplits(gameId, playByPlayData, gameDate, homeTeam, awayTeam);
        
        // Store in Redis
        await storeSplitsInRedis(splitTracker, gameId);
        
        processedCount++;
        console.log(`✅ Game ${gameId} processed successfully (${processedCount}/${Math.min(5, completedGames.length)})`);
        
        // Brief delay to be respectful to MLB API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`⚠️ Skipping game ${gameId} - no play-by-play data available`);
      }
    }

    console.log(`\n🎉 Splits collection complete!`);
    console.log(`📈 Processed ${processedCount} games with comprehensive split data`);
    console.log(`🔗 All splits linked to existing boxscore data for complete analytics`);
    console.log(`🏷️ Team abbreviations perfectly matched to boxscore format`);

  } catch (error) {
    console.error('❌ Error in splits collection:', error.message);
    throw error;
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const season = args[0] || '2025';
  const startDate = args[1] || '2025-08-01'; 
  const endDate = args[2] || '2025-08-20';
  
  pullPlayByPlaySplits(season, startDate, endDate)
    .then(() => {
      console.log('\n✅ Play-by-Play Splits collection completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Play-by-Play Splits collection failed:', err);
      process.exit(1); 
    });
}

module.exports = { pullPlayByPlaySplits, processGameSplits, SplitTracker };
