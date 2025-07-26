# MLB API to Redis Data Mapping

## Overview
This document maps the complete MLB Stats API boxscore structure to the Redis aggregation format needed for The Cycle project. Based on analysis of Yankees vs Blue Jays game (777046) from July 22, 2025.

## API Response Structure Mapping

### Team Level Data Extraction
```javascript
// From API response
const teamStats = boxscoreData.teams.away.teamStats; // or home
const battingStats = teamStats.batting;
const pitchingStats = teamStats.pitching;
const fieldingStats = teamStats.fielding;

// Redis Key Structure
const teamKey = `team:${teamId}:${season}:stats`;
```

### Player Data Extraction Pattern
```javascript
// From API response
const players = boxscoreData.teams.away.players; // or home

for (const [playerId, playerData] of Object.entries(players)) {
  const gameStats = playerData.stats;
  const seasonStats = playerData.seasonStats;
  const position = playerData.position;
  const battingOrder = playerData.battingOrder;
  
  // Extract game-specific performance
  const gamePerformance = {
    batting: gameStats.batting || {},
    pitching: gameStats.pitching || {},
    fielding: gameStats.fielding || {}
  };
}
```

## Complete Data Field Mapping

### Batting Statistics
```javascript
const battingMapping = {
  // Direct counting stats (summable)
  gamesPlayed: 'gamesPlayed',
  atBats: 'atBats',
  plateAppearances: 'plateAppearances',
  hits: 'hits',
  runs: 'runs',
  doubles: 'doubles',
  triples: 'triples',
  homeRuns: 'homeRuns',
  rbi: 'rbi',
  totalBases: 'totalBases',
  baseOnBalls: 'baseOnBalls',
  intentionalWalks: 'intentionalWalks',
  hitByPitch: 'hitByPitch',
  strikeOuts: 'strikeOuts',
  sacBunts: 'sacBunts',
  sacFlies: 'sacFlies',
  stolenBases: 'stolenBases',
  caughtStealing: 'caughtStealing',
  groundIntoDoublePlay: 'groundIntoDoublePlay',
  groundIntoTriplePlay: 'groundIntoTriplePlay',
  leftOnBase: 'leftOnBase',
  flyOuts: 'flyOuts',
  groundOuts: 'groundOuts',
  lineOuts: 'lineOuts',
  popOuts: 'popOuts',
  airOuts: 'airOuts',
  catchersInterference: 'catchersInterference',
  pickoffs: 'pickoffs',

  // Rate stats (calculated, not summed)
  // avg: calculate from hits/atBats
  // obp: calculate from (hits + walks + hbp) / (atBats + walks + hbp + sacFlies)
  // slg: calculate from totalBases/atBats
  // ops: calculate from obp + slg
  // stolenBasePercentage: calculate from stolenBases/(stolenBases + caughtStealing)
  // babip: calculate from (hits - homeRuns) / (atBats - strikeOuts - homeRuns + sacFlies)
  // atBatsPerHomeRun: calculate from atBats/homeRuns
  // groundOutsToAirouts: calculate from groundOuts/airOuts
};
```

### Pitching Statistics
```javascript
const pitchingMapping = {
  // Direct counting stats (summable)
  gamesPlayed: 'gamesPlayed',
  gamesStarted: 'gamesStarted',
  wins: 'wins',
  losses: 'losses',
  saves: 'saves',
  saveOpportunities: 'saveOpportunities',
  holds: 'holds',
  blownSaves: 'blownSaves',
  completeGames: 'completeGames',
  shutouts: 'shutouts',
  inningsPitched: 'inningsPitched', // Special handling for fractional innings
  hits: 'hits',
  runs: 'runs',
  earnedRuns: 'earnedRuns',
  homeRuns: 'homeRuns',
  baseOnBalls: 'baseOnBalls',
  intentionalWalks: 'intentionalWalks',
  strikeOuts: 'strikeOuts',
  hitByPitch: 'hitByPitch',
  atBats: 'atBats',
  battersFaced: 'battersFaced',
  outs: 'outs',
  doubles: 'doubles',
  triples: 'triples',
  flyOuts: 'flyOuts',
  groundOuts: 'groundOuts',
  airOuts: 'airOuts',
  lineOuts: 'lineOuts',
  popOuts: 'popOuts',
  numberOfPitches: 'numberOfPitches',
  pitchesThrown: 'pitchesThrown',
  balls: 'balls',
  strikes: 'strikes',
  hitBatsmen: 'hitBatsmen',
  balks: 'balks',
  wildPitches: 'wildPitches',
  pickoffs: 'pickoffs',
  inheritedRunners: 'inheritedRunners',
  inheritedRunnersScored: 'inheritedRunnersScored',
  gamesFinished: 'gamesFinished',
  caughtStealing: 'caughtStealing',
  stolenBases: 'stolenBases',
  sacBunts: 'sacBunts',
  sacFlies: 'sacFlies',
  catchersInterference: 'catchersInterference',
  passedBall: 'passedBall',

  // Rate stats (calculated, not summed)
  // era: calculate from (earnedRuns * 9) / inningsPitched
  // whip: calculate from (baseOnBalls + hits) / inningsPitched
  // obp: calculate from opponent on-base percentage
  // strikePercentage: calculate from strikes / pitchesThrown
  // strikeoutWalkRatio: calculate from strikeOuts / baseOnBalls
  // strikeoutsPer9Inn: calculate from (strikeOuts * 9) / inningsPitched
  // walksPer9Inn: calculate from (baseOnBalls * 9) / inningsPitched
  // hitsPer9Inn: calculate from (hits * 9) / inningsPitched
  // runsScoredPer9: calculate from (runs * 9) / inningsPitched
  // homeRunsPer9: calculate from (homeRuns * 9) / inningsPitched
  // pitchesPerInning: calculate from pitchesThrown / inningsPitched
  // groundOutsToAirouts: calculate from groundOuts / airOuts
  // stolenBasePercentage: calculate from stolenBases / (stolenBases + caughtStealing)
  // winPercentage: calculate from wins / (wins + losses)
};
```

### Fielding Statistics
```javascript
const fieldingMapping = {
  // Direct counting stats (summable)
  gamesStarted: 'gamesStarted',
  assists: 'assists',
  putOuts: 'putOuts',
  errors: 'errors',
  chances: 'chances',
  passedBall: 'passedBall',
  pickoffs: 'pickoffs',
  caughtStealing: 'caughtStealing',
  stolenBases: 'stolenBases',

  // Rate stats (calculated, not summed)
  // fielding: calculate from (putOuts + assists) / chances
  // stolenBasePercentage: calculate from caughtStealing / (caughtStealing + stolenBases)
};
```

## Data Transformation Functions

### Innings Pitched Special Handling
```javascript
function parseInningsPitched(ipString) {
  // Convert "5.1" to 5.33, "5.2" to 5.67, "5.0" to 5.0
  if (!ipString || ipString === "0.0") return 0;
  
  const parts = ipString.split('.');
  const innings = parseInt(parts[0]) || 0;
  const outs = parseInt(parts[1]) || 0;
  
  return innings + (outs / 3);
}

function aggregateInningsPitched(ipArray) {
  const totalOuts = ipArray.reduce((sum, ip) => {
    const parsed = parseInningsPitched(ip.toString());
    return sum + (Math.floor(parsed) * 3 + ((parsed % 1) * 3));
  }, 0);
  
  const innings = Math.floor(totalOuts / 3);
  const remainingOuts = totalOuts % 3;
  
  return `${innings}.${remainingOuts}`;
}
```

### Rate Statistic Calculations
```javascript
function calculateBattingRates(countingStats) {
  const { hits, atBats, baseOnBalls, hitByPitch, sacFlies, totalBases, 
          homeRuns, strikeOuts, stolenBases, caughtStealing, groundOuts, airOuts } = countingStats;
  
  return {
    avg: atBats > 0 ? hits / atBats : 0,
    obp: (atBats + baseOnBalls + hitByPitch + sacFlies) > 0 
      ? (hits + baseOnBalls + hitByPitch) / (atBats + baseOnBalls + hitByPitch + sacFlies) : 0,
    slg: atBats > 0 ? totalBases / atBats : 0,
    ops: function() { return this.obp + this.slg; },
    stolenBasePercentage: (stolenBases + caughtStealing) > 0 
      ? stolenBases / (stolenBases + caughtStealing) : 0,
    babip: (atBats - strikeOuts - homeRuns + sacFlies) > 0 
      ? (hits - homeRuns) / (atBats - strikeOuts - homeRuns + sacFlies) : 0,
    atBatsPerHomeRun: homeRuns > 0 ? atBats / homeRuns : 0,
    groundOutsToAirouts: airOuts > 0 ? groundOuts / airOuts : 0
  };
}

function calculatePitchingRates(countingStats) {
  const { earnedRuns, inningsPitched, baseOnBalls, hits, strikeOuts, 
          pitchesThrown, strikes, wins, losses, runs, homeRuns } = countingStats;
  
  const ip = parseInningsPitched(inningsPitched.toString());
  
  return {
    era: ip > 0 ? (earnedRuns * 9) / ip : 0,
    whip: ip > 0 ? (baseOnBalls + hits) / ip : 0,
    strikePercentage: pitchesThrown > 0 ? strikes / pitchesThrown : 0,
    strikeoutWalkRatio: baseOnBalls > 0 ? strikeOuts / baseOnBalls : 0,
    strikeoutsPer9Inn: ip > 0 ? (strikeOuts * 9) / ip : 0,
    walksPer9Inn: ip > 0 ? (baseOnBalls * 9) / ip : 0,
    hitsPer9Inn: ip > 0 ? (hits * 9) / ip : 0,
    runsScoredPer9: ip > 0 ? (runs * 9) / ip : 0,
    homeRunsPer9: ip > 0 ? (homeRuns * 9) / ip : 0,
    pitchesPerInning: ip > 0 ? pitchesThrown / ip : 0,
    winPercentage: (wins + losses) > 0 ? wins / (wins + losses) : 0
  };
}
```

## Redis Storage Structure

### Player Season Stats
```javascript
const playerStatsKey = `player:${playerId}:${season}:stats`;
const playerStatsData = {
  // Counting stats (direct summation)
  batting: {
    gamesPlayed: total_games,
    atBats: total_at_bats,
    hits: total_hits,
    // ... all counting stats
  },
  
  // Calculated rates (computed from counting stats)
  rates: {
    avg: hits / atBats,
    obp: calculated_obp,
    slg: calculated_slg,
    // ... all rate stats
  },
  
  // Situational splits
  splits: {
    vsLHP: { /* same structure as above */ },
    vsRHP: { /* same structure as above */ },
    risp: { /* same structure as above */ },
    clutch: { /* same structure as above */ },
    home: { /* same structure as above */ },
    away: { /* same structure as above */ }
  },
  
  // Game log for recalculation
  games: [
    {
      gameId: "777046",
      date: "2025-07-22",
      opponent: "TOR",
      stats: { /* game-specific stats */ }
    }
  ]
};
```

### Team Season Stats
```javascript
const teamStatsKey = `team:${teamId}:${season}:stats`;
const teamStatsData = {
  batting: { /* aggregated team batting */ },
  pitching: { /* aggregated team pitching */ },
  fielding: { /* aggregated team fielding */ },
  
  // Team-specific metrics
  teamStats: {
    wins: total_wins,
    losses: total_losses,
    winPercentage: wins / (wins + losses),
    runsScored: total_runs_scored,
    runsAllowed: total_runs_allowed,
    runDifferential: runsScored - runsAllowed
  }
};
```

## Implementation Notes

### 1. Data Validation
```javascript
function validateApiData(playerData) {
  const required = ['person', 'stats'];
  const missing = required.filter(field => !playerData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate numeric fields
  const stats = playerData.stats.batting || {};
  Object.entries(stats).forEach(([key, value]) => {
    if (typeof value === 'string' && !isNaN(value)) {
      stats[key] = Number(value);
    }
  });
  
  return playerData;
}
```

### 2. Error Handling
```javascript
function safeStatExtraction(stats, field, defaultValue = 0) {
  try {
    const value = stats[field];
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'string' && value.includes('.---')) return defaultValue;
    return Number(value) || defaultValue;
  } catch (error) {
    console.warn(`Error extracting ${field}:`, error);
    return defaultValue;
  }
}
```

### 3. Performance Optimization
```javascript
// Batch process multiple games
async function processGamesBatch(gameIds) {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < gameIds.length; i += batchSize) {
    const batch = gameIds.slice(i, i + batchSize);
    const batchPromises = batch.map(gameId => processGame(gameId));
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

// Redis pipeline for bulk operations
function bulkUpdateRedis(updates) {
  const pipeline = redis.pipeline();
  
  updates.forEach(({ key, data }) => {
    pipeline.hset(key, data);
  });
  
  return pipeline.exec();
}
```

This mapping provides the complete transformation from MLB API format to the Redis aggregation structure needed for professional-grade baseball statistics in The Cycle project.
