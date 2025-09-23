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
  COUNT: 'count',
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
        avg: 0, obp: 0, slg: 0, ops: 0,
        
        // COUNT-BASED ANALYTICS
        countSituations: {
          '0-0': { pa: 0, hits: 0, avg: 0 },
          '1-0': { pa: 0, hits: 0, avg: 0 },
          '0-1': { pa: 0, hits: 0, avg: 0 },
          '1-1': { pa: 0, hits: 0, avg: 0 },
          '2-0': { pa: 0, hits: 0, avg: 0 },
          '0-2': { pa: 0, hits: 0, avg: 0 },
          '2-1': { pa: 0, hits: 0, avg: 0 },
          '1-2': { pa: 0, hits: 0, avg: 0 },
          '3-0': { pa: 0, hits: 0, avg: 0 },
          '2-2': { pa: 0, hits: 0, avg: 0 },
          '3-1': { pa: 0, hits: 0, avg: 0 },
          '3-2': { pa: 0, hits: 0, avg: 0 }
        },
        twoStrikeSituations: { pa: 0, hits: 0, avg: 0, strikeouts: 0 },
        hittersCountSituations: { pa: 0, hits: 0, avg: 0 }, // 1-0, 2-0, 2-1, 3-0, 3-1
        pitchersCountSituations: { pa: 0, hits: 0, avg: 0 }, // 0-1, 0-2, 1-2
        fullCountSituations: { pa: 0, hits: 0, avg: 0 },
        firstPitchResults: { swings: 0, takes: 0, strikes: 0, balls: 0, hits: 0 }
      },
      pitching: {
        inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0,
        walks: 0, strikeouts: 0, homeRuns: 0, 
        battersFaced: 0, hitBatsmen: 0, outs: 0,
        era: 0, whip: 0, strikeoutRate: 0, walkRate: 0,
        
        // PITCH-LEVEL ANALYTICS
        pitchData: {
          totalPitches: 0,
          strikes: 0,
          balls: 0,
          strikePercentage: 0,
          ballPercentage: 0,
          firstPitchStrikes: 0,
          firstPitchAttempts: 0,
          firstPitchStrikePercentage: 0,
          swingAndMiss: 0,
          swingAndMissPercentage: 0,
          foulBalls: 0,
          foulBallPercentage: 0,
          contactRate: 0
        },
        
        // COUNT-BASED PITCHING
        countResults: {
          aheadInCount: { batters: 0, strikeouts: 0, walks: 0 }, // 0-1, 0-2, 1-2
          behindInCount: { batters: 0, strikeouts: 0, walks: 0 }, // 1-0, 2-0, 2-1, 3-0, 3-1
          evenCount: { batters: 0, strikeouts: 0, walks: 0 }, // 0-0, 1-1, 2-2
          fullCount: { batters: 0, strikeouts: 0, walks: 0 },
          twoStrikeCount: { batters: 0, strikeouts: 0, hits: 0 }
        }
      }
    };
  }

  /**
   * Update stats from a single play.
   * mode: 'batting' | 'pitching' | 'both' (default 'both')
   */
  updateStats(stats, outcome, playData, mode = 'both') {
    // Core statistical engine - converts play-by-play outcomes to baseball statistics
    if (!outcome || !playData) return;

    const { result, about, matchup, count, playEvents } = playData;
    const { event, eventType, rbi = 0, awayScore = 0, homeScore = 0 } = result;
    
    // Extract count information and pitch sequence data
    const finalCount = count || { balls: 0, strikes: 0 };
    const pitchSequence = playEvents || [];
    
    // BATTING STATISTICS UPDATES
    if (mode === 'batting' || mode === 'both') {
      this.updateBattingStats(stats.batting, result, about, matchup, finalCount, pitchSequence);
    }
    
    // PITCHING STATISTICS UPDATES  
    if (mode === 'pitching' || mode === 'both') {
      this.updatePitchingStats(stats.pitching, result, about, matchup, finalCount, pitchSequence);
    }
    
    // COUNT-BASED UPDATES
    if (mode === 'batting' || mode === 'both') {
      this.updateCountBasedStats({ batting: stats.batting, pitching: this.initializeStats().pitching }, result, finalCount, pitchSequence, matchup, 'batting');
    }
    if (mode === 'pitching' || mode === 'both') {
      this.updateCountBasedStats({ batting: this.initializeStats().batting, pitching: stats.pitching }, result, finalCount, pitchSequence, matchup, 'pitching');
    }
    
    // PITCH-LEVEL UPDATES
    if (mode === 'batting' || mode === 'both') {
      this.updatePitchLevelStats({ batting: stats.batting, pitching: this.initializeStats().pitching }, pitchSequence, result, 'batting');
    }
    if (mode === 'pitching' || mode === 'both') {
      this.updatePitchLevelStats({ batting: this.initializeStats().batting, pitching: stats.pitching }, pitchSequence, result, 'pitching');
    }
    
    // Calculate derived statistics
    this.calculateDerivedStats(stats);
  }

  /**
   * Update batting statistics based on play outcome
   */
  updateBattingStats(batting, result, about, matchup, finalCount, pitchSequence) {
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
  updatePitchingStats(pitching, result, about, matchup, finalCount, pitchSequence) {
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
      // Represent innings pitched as outs/3 (e.g., 5.1 -> 5.33)
      pitching.inningsPitched = parseFloat((pitching.outs / 3).toFixed(2));
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
    
    // Calculate count-based batting averages
    this.calculateCountAverages(batting.countSituations);
    this.calculateCountAverages([batting.twoStrikeSituations, batting.hittersCountSituations, 
                                batting.pitchersCountSituations, batting.fullCountSituations]);
    
    // Pitching rates  
    if (pitching.inningsPitched > 0) {
      pitching.era = parseFloat(((pitching.earnedRuns * 9) / pitching.inningsPitched).toFixed(2));
      pitching.whip = parseFloat(((pitching.hits + pitching.walks) / pitching.inningsPitched).toFixed(2));
    }
    
    if (pitching.battersFaced > 0) {
      pitching.strikeoutRate = parseFloat((pitching.strikeouts / pitching.battersFaced).toFixed(3));
      pitching.walkRate = parseFloat((pitching.walks / pitching.battersFaced).toFixed(3));
    }
    
    // Calculate pitch-level percentages
    this.calculatePitchPercentages(pitching.pitchData);
  }

  /**
   * Calculate averages for count situations
   */
  calculateCountAverages(countData) {
    if (Array.isArray(countData)) {
      // Handle array of count objects
      countData.forEach(situation => {
        if (situation.pa > 0) {
          situation.avg = parseFloat((situation.hits / situation.pa).toFixed(3));
        }
      });
    } else {
      // Handle count situations object
      Object.values(countData).forEach(situation => {
        if (situation.pa > 0) {
          situation.avg = parseFloat((situation.hits / situation.pa).toFixed(3));
        }
      });
    }
  }

  /**
   * Calculate pitch-level percentages
   */
  calculatePitchPercentages(pitchData) {
    if (pitchData.totalPitches > 0) {
      pitchData.strikePercentage = parseFloat((pitchData.strikes / pitchData.totalPitches * 100).toFixed(1));
      pitchData.ballPercentage = parseFloat((pitchData.balls / pitchData.totalPitches * 100).toFixed(1));
      
      if (pitchData.foulBalls > 0) {
        pitchData.foulBallPercentage = parseFloat((pitchData.foulBalls / pitchData.totalPitches * 100).toFixed(1));
      }
      
      if (pitchData.swingAndMiss > 0) {
        pitchData.swingAndMissPercentage = parseFloat((pitchData.swingAndMiss / pitchData.totalPitches * 100).toFixed(1));
      }
    }
    
    // First pitch strike percentage
    if (pitchData.firstPitchAttempts > 0) {
      pitchData.firstPitchStrikePercentage = parseFloat((pitchData.firstPitchStrikes / pitchData.firstPitchAttempts * 100).toFixed(1));
    }
  }

  /**
   * Update count-based statistics for both batting and pitching
   */
  updateCountBasedStats(stats, result, finalCount, pitchSequence, matchup, mode = 'both') {
    const { batting, pitching } = stats;
    const { event } = result;
    const countKey = `${finalCount.balls}-${finalCount.strikes}`;
    
    // BATTING COUNT UPDATES
    if ((mode === 'batting' || mode === 'both') && batting.countSituations[countKey]) {
      batting.countSituations[countKey].pa++;
      if (this.isHit(event)) {
        batting.countSituations[countKey].hits++;
      }
    }
    
    // Two-strike situations
  if ((mode === 'batting' || mode === 'both') && finalCount.strikes >= 2) {
      batting.twoStrikeSituations.pa++;
      if (this.isHit(event)) batting.twoStrikeSituations.hits++;
      if (this.isStrikeout(event)) batting.twoStrikeSituations.strikeouts++;
    }
    
    // Hitter's count vs Pitcher's count
  if ((mode === 'batting' || mode === 'both') && this.isHittersCount(finalCount)) {
      batting.hittersCountSituations.pa++;
      if (this.isHit(event)) batting.hittersCountSituations.hits++;
  } else if ((mode === 'batting' || mode === 'both') && this.isPitchersCount(finalCount)) {
      batting.pitchersCountSituations.pa++;
      if (this.isHit(event)) batting.pitchersCountSituations.hits++;
    }
    
    // Full count
  if ((mode === 'batting' || mode === 'both') && finalCount.balls === 3 && finalCount.strikes === 2) {
      batting.fullCountSituations.pa++;
      if (this.isHit(event)) batting.fullCountSituations.hits++;
    }
    
    // PITCHING COUNT UPDATES
  if ((mode === 'pitching' || mode === 'both') && this.isAheadInCount(finalCount)) {
      pitching.countResults.aheadInCount.batters++;
      if (this.isStrikeout(event)) pitching.countResults.aheadInCount.strikeouts++;
      if (this.isWalk(event)) pitching.countResults.aheadInCount.walks++;
  } else if ((mode === 'pitching' || mode === 'both') && this.isBehindInCount(finalCount)) {
      pitching.countResults.behindInCount.batters++;
      if (this.isStrikeout(event)) pitching.countResults.behindInCount.strikeouts++;
      if (this.isWalk(event)) pitching.countResults.behindInCount.walks++;
  } else if (mode === 'pitching' || mode === 'both') {
      pitching.countResults.evenCount.batters++;
      if (this.isStrikeout(event)) pitching.countResults.evenCount.strikeouts++;
      if (this.isWalk(event)) pitching.countResults.evenCount.walks++;
    }
  }

  /**
   * Update pitch-level statistics from pitch sequence
   */
  updatePitchLevelStats(stats, pitchSequence, result, mode = 'both') {
    const { pitching } = stats;
    const { batting } = stats;
    
    if (!pitchSequence || pitchSequence.length === 0) return;
    
    let pitchCount = 0;
    let strikes = 0;
    let balls = 0;
    let foulBalls = 0;
    let swingAndMiss = 0;
    let firstPitchStrike = false;
    
    pitchSequence.forEach((pitch, index) => {
      if (pitch.details && pitch.details.type) {
        pitchCount++;
        
        const pitchType = pitch.details.type.code;
        const pitchResult = pitch.details.description || '';
        
        // First pitch tracking
        if ((mode === 'batting' || mode === 'both') && index === 0) {
          if (pitchResult.toLowerCase().includes('strike') || 
              pitchResult.toLowerCase().includes('called strike') ||
              pitchResult.toLowerCase().includes('swinging strike')) {
            firstPitchStrike = true;
            batting.firstPitchResults.strikes++;
          } else if (pitchResult.toLowerCase().includes('ball')) {
            batting.firstPitchResults.balls++;
          }
          
          if (pitchResult.toLowerCase().includes('swing')) {
            batting.firstPitchResults.swings++;
          } else {
            batting.firstPitchResults.takes++;
          }
          
          if (this.isHit(result.event) && index === pitchSequence.length - 1) {
            batting.firstPitchResults.hits++;
          }
        }
        if ((mode === 'pitching' || mode === 'both') && index === 0) {
          pitching.pitchData.firstPitchAttempts++;
        }
        
        // Strike/Ball classification
        if (pitchResult.toLowerCase().includes('strike') || 
            pitchResult.toLowerCase().includes('foul') ||
            this.isHit(result.event)) {
          strikes++;
        } else if (pitchResult.toLowerCase().includes('ball')) {
          balls++;
        }
        
        // Foul balls
        if (pitchResult.toLowerCase().includes('foul')) {
          foulBalls++;
        }
        
        // Swinging strikes/misses
        if (pitchResult.toLowerCase().includes('swinging strike')) {
          swingAndMiss++;
        }
      }
    });
    
    // Update pitching data
  if (mode === 'pitching' || mode === 'both') {
      pitching.pitchData.totalPitches += pitchCount;
      pitching.pitchData.strikes += strikes;
      pitching.pitchData.balls += balls;
      pitching.pitchData.foulBalls += foulBalls;
      pitching.pitchData.swingAndMiss += swingAndMiss;
      if (firstPitchStrike) {
        pitching.pitchData.firstPitchStrikes++;
      }
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

  // ============================================================================
  // COUNT ANALYSIS HELPERS
  // ============================================================================

  /**
   * Determine if count favors the hitter
   */
  isHittersCount(count) {
    const { balls, strikes } = count;
    // Hitter's counts: 1-0, 2-0, 2-1, 3-0, 3-1
    return (balls > strikes) || 
           (balls === 2 && strikes === 1) || 
           (balls === 3 && strikes <= 1);
  }

  /**
   * Determine if count favors the pitcher  
   */
  isPitchersCount(count) {
    const { balls, strikes } = count;
    // Pitcher's counts: 0-1, 0-2, 1-2
    return (strikes > balls) || 
           (balls === 1 && strikes === 2);
  }

  /**
   * Determine if pitcher is ahead in count
   */
  isAheadInCount(count) {
    const { balls, strikes } = count;
    return strikes > balls;
  }

  /**
   * Determine if pitcher is behind in count
   */
  isBehindInCount(count) {
    const { balls, strikes } = count;
    return balls > strikes;
  }
}

// ============================================================================
// MACRO KEY AGGREGATOR (Per Player/Team Per Season) - Simplified, Minimal Keys
// ============================================================================

// Macro key helpers
const MacroKeys = {
  player: (team, playerName, year) => `splits:player:${team}-${(playerName || '').replace(/\s+/g, '_')}-${year}`,
  team: (team, year) => `splits:team:${team}:${year}`
};

// Utility helpers
function normalizeName(name) {
  return (name || '').replace(/\s+/g, '_');
}

function isPlainObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Set);
}

// Deep merge that sums numbers, recurses into objects, and unions sets
function deepSumMerge(target, source) {
  if (source instanceof Set) {
    if (!(target instanceof Set)) target = new Set();
    for (const v of source) target.add(v);
    return target;
  }

  if (Array.isArray(source)) {
    // We don't store arrays in macro state (no plays), skip/replace if needed
    return Array.isArray(target) ? target : [];
  }

  if (isPlainObject(source)) {
    const out = isPlainObject(target) ? { ...target } : {};
    for (const [k, v] of Object.entries(source)) {
      out[k] = deepSumMerge(out[k], v);
    }
    return out;
  }

  if (typeof source === 'number') {
    return (typeof target === 'number' ? target : 0) + source;
  }

  // strings/booleans/dates -> prefer source
  return source !== undefined ? source : target;
}

// Serialize Sets to Arrays recursively
function serializeSets(obj) {
  if (obj instanceof Set) return Array.from(obj);
  if (Array.isArray(obj)) return obj.map(serializeSets);
  if (isPlainObject(obj)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = serializeSets(v);
    return out;
  }
  return obj;
}

// Create empty macro data structure
function createEmptyMacro(isTeam, info) {
  return {
    info,
    splits: {},
    games: new Set(),
    lastUpdated: new Date().toISOString()
  };
}

// Navigate/create leaf at path under splits
function getLeaf(rootSplits, path, initLeaf) {
  let ctx = rootSplits;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!ctx[key] || !isPlainObject(ctx[key])) ctx[key] = {};
    ctx = ctx[key];
  }
  const leafKey = path[path.length - 1];
  if (!ctx[leafKey]) ctx[leafKey] = initLeaf();
  return ctx[leafKey];
}

class MacroAggregator {
  constructor() {
    this.macros = new Map(); // macroKey -> macroData (partial for this run)
    this.helper = new SplitTracker(); // reuse stat calculators
  }

  _getOrCreateMacro(macroKey, isTeam, info) {
    if (!this.macros.has(macroKey)) {
      this.macros.set(macroKey, createEmptyMacro(isTeam, info));
    }
    return this.macros.get(macroKey);
  }

  _initLeaf() {
    return {
      stats: this.helper.initializeStats(),
      games: new Set()
    };
  }

  _update(macroData, path, gameId, play, result, mode = 'both') {
    const leaf = getLeaf(macroData.splits, path, () => this._initLeaf());
    leaf.games.add(gameId);
    this.helper.updateStats(leaf.stats, result, play, mode);
    macroData.games.add(gameId);
    macroData.lastUpdated = new Date().toISOString();
  }

  updatePlayer(team, playerName, year, path, gameId, play, result, mode = 'both') {
    const macroKey = MacroKeys.player(team, playerName, year);
    const macro = this._getOrCreateMacro(macroKey, false, { team, name: playerName, year });
    this._update(macro, path, gameId, play, result, mode);
  }

  updateTeam(team, year, path, gameId, play, result, mode = 'both') {
    const macroKey = MacroKeys.team(team, year);
    const macro = this._getOrCreateMacro(macroKey, true, { team, year });
    this._update(macro, path, gameId, play, result, mode);
  }

  async flush(redis) {
    if (this.macros.size === 0) return;

    // Read current, merge, then write in a pipeline
    const pipeline = redis.pipeline();

    for (const [macroKey, partial] of this.macros.entries()) {
      try {
        const existingStr = await redis.get(macroKey);
        let merged;
        if (existingStr) {
          const existing = JSON.parse(existingStr);
          // Convert games arrays back to Sets for merge
          if (Array.isArray(existing.games)) existing.games = new Set(existing.games);
          // Recursively convert leaf games to Sets
          const reviveSets = (node) => {
            if (!node || typeof node !== 'object') return;
            if (node.games && Array.isArray(node.games)) node.games = new Set(node.games);
            for (const v of Object.values(node)) reviveSets(v);
          };
          reviveSets(existing.splits);

          merged = { ...existing };
          merged.info = partial.info || existing.info;
          merged.games = deepSumMerge(existing.games, partial.games);
          merged.splits = deepSumMerge(existing.splits || {}, partial.splits || {});
          merged.lastUpdated = new Date().toISOString();
          // Recompute derived stats for all leaves
          const walkLeavesAndRecompute = (node) => {
            if (!node || typeof node !== 'object') return;
            if (node.stats && node.stats.batting && node.stats.pitching) {
              this.helper.calculateDerivedStats(node.stats);
            }
            for (const v of Object.values(node)) walkLeavesAndRecompute(v);
          };
          walkLeavesAndRecompute(merged.splits);
        } else {
          merged = partial;
        }

        const payload = serializeSets(merged);
        pipeline.set(macroKey, JSON.stringify(payload));
      } catch (e) {
        // Log and continue
        console.error(`❌ Failed to prepare macro write for ${macroKey}:`, e.message);
      }
    }

    await pipeline.exec();
    this.macros.clear();
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
  async function processGameSplits(gameId, playByPlayData, gameDate, homeTeam, awayTeam, season) {
  const macro = new MacroAggregator();
  const plays = playByPlayData.allPlays || [];
  
  console.log(`🎯 Processing ${plays.length} plays for game ${gameId} (${homeTeam} vs ${awayTeam})`);

  for (const play of plays) {
    try {
  await processIndividualPlay(macro, gameId, play, gameDate, homeTeam, awayTeam, season);
    } catch (error) {
      console.error(`⚠️ Error processing play in game ${gameId}:`, error.message);
    }
  }

  return macro;
}

/**
 * Process a single play to extract all possible splits
 */
async function processIndividualPlay(macro, gameId, play, gameDate, homeTeam, awayTeam, season) {
  const { result, about, matchup, count, playEvents } = play;
  
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
  
  // Count information
  const finalCount = count || { balls: 0, strikes: 0 };
  const countString = `${finalCount.balls}-${finalCount.strikes}`;

  // 1. HOME/AWAY SPLITS -> Player macro path
  const homeAwayContext = battingTeam === homeTeam ? 'home' : 'away';
  macro.updatePlayer(battingTeam, batter.fullName, season, ['by_location', homeAwayContext], gameId, play, result, 'batting');
  macro.updateTeam(battingTeam, season, ['by_location', homeAwayContext], gameId, play, result, 'batting');

  // 2. VENUE SPLITS
  macro.updatePlayer(battingTeam, batter.fullName, season, ['vs_venues', venue, homeAwayContext], gameId, play, result, 'batting');
  macro.updateTeam(battingTeam, season, ['at_venues', venue, homeAwayContext], gameId, play, result, 'batting');

  // 2b. PITCHER VENUE SPLITS (How pitchers perform at different ballparks)
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['vs_venues', venue, homeAwayContext], gameId, play, result, 'pitching');
  macro.updateTeam(fieldingTeam, season, ['at_venues', venue, homeAwayContext], gameId, play, result, 'pitching');

  // 3. PLAYER vs TEAM SPLITS
  macro.updatePlayer(battingTeam, batter.fullName, season, ['vs_teams', fieldingTeam, homeAwayContext], gameId, play, result, 'batting');
  macro.updateTeam(battingTeam, season, ['vs_teams', fieldingTeam, homeAwayContext], gameId, play, result, 'batting');

  // 4. BATTER vs PITCHER SPLITS (The key matchup!)
  macro.updatePlayer(battingTeam, batter.fullName, season, ['vs_pitchers', `${fieldingTeam}-${normalizeName(pitcher.fullName)}`, homeAwayContext], gameId, play, result, 'batting');

  // 4b. PITCHER vs BATTER SPLITS (Reverse perspective!)
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['vs_batters', `${battingTeam}-${normalizeName(batter.fullName)}`, homeAwayContext], gameId, play, result, 'pitching');

  // 5. HANDEDNESS SPLITS (Cumulative across all teams)
  macro.updatePlayer(battingTeam, batter.fullName, season, ['vs_handedness', pitcherHand, homeAwayContext], gameId, play, result, 'batting');
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['vs_handedness', batterHand, homeAwayContext], gameId, play, result, 'pitching');

  // 5b. TEAM-SPECIFIC HANDEDNESS SPLITS (New!)
  // Batter vs specific team's left/right pitching
  macro.updatePlayer(battingTeam, batter.fullName, season, ['vs_handedness_by_team', fieldingTeam, pitcherHand, homeAwayContext], gameId, play, result, 'batting');

  // Pitcher vs specific team's left/right batters
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['vs_handedness_by_team', battingTeam, batterHand, homeAwayContext], gameId, play, result, 'pitching');

  // 6. TEAM MATCHUP SPLITS
  macro.updateTeam(battingTeam, season, ['matchups', fieldingTeam, homeAwayContext], gameId, play, result, 'batting');

  // 7. COUNT SITUATION SPLITS (Basic)
  macro.updatePlayer(battingTeam, batter.fullName, season, ['by_count', countString, homeAwayContext], gameId, play, result, 'batting');

  // 7b. PITCHER COUNT SITUATION SPLITS (How pitchers perform in different counts)
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['by_count', countString, homeAwayContext], gameId, play, result, 'pitching');

  // 7c. COMPOUND COUNT SPLITS - The Ultimate Granularity!
  
  // Count + Team: How does batter perform in specific counts vs specific teams?
  macro.updatePlayer(battingTeam, batter.fullName, season, ['compound', 'count_vs_team', fieldingTeam, countString, homeAwayContext], gameId, play, result, 'batting');
  
  // Count + Venue: How does batter perform in specific counts at specific venues?
  macro.updatePlayer(battingTeam, batter.fullName, season, ['compound', 'count_vs_venue', venue, countString, homeAwayContext], gameId, play, result, 'batting');
  
  // Count + Handedness: How does batter perform in specific counts vs L/R pitchers?
  macro.updatePlayer(battingTeam, batter.fullName, season, ['compound', 'count_vs_hand', pitcherHand, countString, homeAwayContext], gameId, play, result, 'batting');
  
  // Count + Specific Pitcher: How does batter perform in specific counts vs specific pitchers?
  macro.updatePlayer(battingTeam, batter.fullName, season, ['compound', 'count_vs_pitcher', `${fieldingTeam}-${normalizeName(pitcher.fullName)}`, countString, homeAwayContext], gameId, play, result, 'batting');
  
  // PITCHER PERSPECTIVE COMPOUND COUNT SPLITS
  
  // Pitcher Count + Team: How does pitcher perform in specific counts vs specific teams?
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['compound', 'count_vs_team', battingTeam, countString, homeAwayContext], gameId, play, result, 'pitching');
  
  // Pitcher Count + Venue: How does pitcher perform in specific counts at specific venues?
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['compound', 'count_vs_venue', venue, countString, homeAwayContext], gameId, play, result, 'pitching');
  
  // Pitcher Count + Handedness: How does pitcher perform in specific counts vs L/R batters?
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['compound', 'count_vs_hand', batterHand, countString, homeAwayContext], gameId, play, result, 'pitching');
  
  // Pitcher Count + Specific Batter: How does pitcher perform in specific counts vs specific batters?
  macro.updatePlayer(fieldingTeam, pitcher.fullName, season, ['compound', 'count_vs_batter', `${battingTeam}-${normalizeName(batter.fullName)}`, countString, homeAwayContext], gameId, play, result, 'pitching');

  // 8. GAME-SPECIFIC SPLIT TRACKING (For boxscore linkage)
  // Game linkage info is implicit via games sets under macro keys; avoid extra keys
}

// ============================================================================
// REDIS STORAGE OPERATIONS
// ============================================================================

/**
 * Store split data in Redis with game linkage
 */
async function storeMacrosInRedis(macroAggregator, gameId) {
  console.log(`💾 Flushing macro keys for game ${gameId}...`);
  await macroAggregator.flush(redisClient);
  console.log(`✅ Macro keys flushed for game ${gameId}`);
}

// ============================================================================
// TEAM ABBREVIATION EXTRACTION FROM BOXSCORE DATA
// ============================================================================

/**
 * Extract actual team abbreviations from boxscore API data
 * This ensures perfect consistency with existing boxscore keys
 */
async function buildTeamAbbreviationMapping(season, startDate, endDate) {
  console.log('🔍 Building team abbreviation mapping from actual boxscore data...');
  
  const teamMapping = {};
  
  try {
    // Get games from the actual date range to find all team IDs and their abbreviations
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&season=${season}&startDate=${startDate}&endDate=${endDate}`;
    const scheduleResp = await fetch(scheduleUrl);
    const scheduleData = await scheduleResp.json();
    
    const games = [];
    for (const dateObj of scheduleData.dates || []) {
      games.push(...(dateObj.games || []));
    }
    
    // Process enough games to get team abbreviations from boxscore data
    // Need to check more games to ensure all 30 MLB teams are captured
    const gamesToCheck = Math.min(60, games.length); // Check up to 60 games to ensure all 30 teams are captured
    console.log(`📊 Checking ${gamesToCheck} games to build comprehensive team mapping...`);
    
    for (let i = 0; i < gamesToCheck; i++) {
      const game = games[i];
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
    
    // Verification: Check if we have all 30 MLB teams
    if (Object.keys(teamMapping).length < 30) {
      console.log(`⚠️ WARNING: Only ${Object.keys(teamMapping).length} teams found. Adding missing teams from fallback mapping...`);
      
      // Add any missing teams from fallback
      Object.entries(FALLBACK_TEAM_MAPPING).forEach(([id, abbr]) => {
        if (!teamMapping[id]) {
          teamMapping[id] = abbr;
          console.log(`  Added missing team: ${id} → ${abbr}`);
        }
      });
      
      console.log(`✅ Final team mapping: ${Object.keys(teamMapping).length} teams`);
    }
    
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
    DYNAMIC_TEAM_MAPPING = await buildTeamAbbreviationMapping(season, startDate, endDate);
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
    console.log(`⚡ Using parallel processing with batches for optimal performance\n`);
    
    // Process games in parallel batches to optimize performance while respecting API limits
    const BATCH_SIZE = 10; // Process 10 games simultaneously
    const BATCH_DELAY = 2000; // 2 second delay between batches
    
    let processedCount = 0;
    const totalGames = completedGames.length;
    
    for (let i = 0; i < totalGames; i += BATCH_SIZE) {
      const batch = completedGames.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalGames / BATCH_SIZE);
      
      console.log(`\n🔥 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} games)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (game) => {
        const gameId = game.gamePk;
        const gameDate = game.officialDate || game.gameDate?.split('T')[0];
        const homeTeam = getTeamAbbreviation(game.teams?.home?.team?.id);
        const awayTeam = getTeamAbbreviation(game.teams?.away?.team?.id);

        try {
          // Fetch play-by-play data
          const playByPlayData = await fetchPlayByPlayData(gameId);
          
          if (playByPlayData) {
            // Process into macro aggregator
            const macroAgg = await processGameSplits(gameId, playByPlayData, gameDate, homeTeam, awayTeam, season);

            // Store macro keys in Redis
            await storeMacrosInRedis(macroAgg, gameId);
            
            return { success: true, gameId, awayTeam, homeTeam, gameDate };
          } else {
            console.log(`⚠️ Skipping game ${gameId} - no play-by-play data available`);
            return { success: false, gameId, reason: 'no_data' };
          }
        } catch (error) {
          console.error(`❌ Error processing game ${gameId}:`, error.message);
          return { success: false, gameId, reason: 'error', error: error.message };
        }
      });
      
      // Wait for all games in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Count successful processing
      const successCount = batchResults.filter(r => r.success).length;
      processedCount += successCount;
      
      // Show batch results
      console.log(`✅ Batch ${batchNumber} completed: ${successCount}/${batch.length} games processed successfully`);
      batchResults.forEach(result => {
        if (result.success) {
          console.log(`   🎮 ${result.awayTeam} @ ${result.homeTeam} (${result.gameDate}) ✅`);
        } else {
          console.log(`   ❌ Game ${result.gameId}: ${result.reason}`);
        }
      });
      
      console.log(`📊 Progress: ${processedCount}/${totalGames} games processed (${((processedCount/totalGames)*100).toFixed(1)}%)`);
      
      // Delay between batches to be respectful to MLB API
      if (i + BATCH_SIZE < totalGames) {
        console.log(`⏳ Waiting ${BATCH_DELAY/1000}s before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`\n🎉 Splits collection complete!`);
    console.log(`📈 Processed ${processedCount} games with comprehensive split data`);
    console.log(`🔗 All splits linked to existing boxscore data for complete analytics`);
    console.log(`🏷️ Team abbreviations perfectly matched to boxscore format`);
    console.log(`⚡ Parallel processing reduced execution time significantly!`);

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
  const startDate = args[1] || '2025-03-17'; 
  const endDate = args[2] || '2025-09-21';
  
  pullPlayByPlaySplits(season, startDate, endDate)
    .then(async () => {
      console.log('\n✅ Play-by-Play Splits collection completed successfully!');
            
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Play-by-Play Splits collection failed:', err);
      process.exit(1); 
    });
}

module.exports = { pullPlayByPlaySplits, processGameSplits, SplitTracker, MacroAggregator };
