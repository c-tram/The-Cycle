// Professional-grade MLB boxscore aggregation script
// Based on comprehensive analysis of MLB Stats API structure
// Usage: node src/express-backend/scripts/pullBoxscoresToRedis_v2.cjs

// Load environment variables from .env file
require('dotenv').config();

const Redis = require('ioredis');
const os = require('os');

// Global fetch variable
let fetch;

// Enhanced Redis connection with robust error handling and reconnection
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {
    servername: process.env.REDIS_HOST,
    checkServerIdentity: () => undefined // Bypass certificate hostname validation for Azure
  } : undefined,
  db: 0,
  maxRetriesPerRequest: 5,
  retryDelayOnFailover: 1000,
  enableReadyCheck: true,
  connectTimeout: 30000,
  lazyConnect: true,
  keepAlive: true,
  family: 4, // Force IPv4
  maxRetriesPerRequest: 3
});

// Add comprehensive error handling for Redis connection
redisClient.on('error', (error) => {
  console.error('🔴 Redis connection error:', error.message);
  if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
    console.log('🔄 Connection reset detected, Redis will auto-reconnect...');
  }
});

redisClient.on('connect', () => {
  console.log('🟢 Redis connected successfully');
});

redisClient.on('reconnecting', (ms) => {
  console.log(`🟡 Redis reconnecting in ${ms}ms...`);
});

redisClient.on('close', () => {
  console.log('🔴 Redis connection closed');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

// ============================================================================
// REDIS CONNECTION HELPERS
// ============================================================================

/**
 * Execute Redis operation with retry logic for connection issues
 */
async function executeRedisOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`⚠️  Redis operation attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry, with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`🔄 Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Check Redis connection health and ensure it's ready
 */
async function ensureRedisConnection() {
  try {
    console.log('🔍 Checking Redis connection health...');
    await executeRedisOperation(() => redisClient.ping());
    console.log('✅ Redis connection healthy and ready');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('💡 Please check your Redis configuration and network connectivity');
    return false;
  }
}

// ============================================================================
// DYNAMIC BASELINE CALCULATIONS FOR ENHANCED WAR/CVR
// ============================================================================

/**
 * Dynamic baseline calculator for more accurate WAR calculations
 */
class DynamicBaselines {
  constructor() {
    this.battingBaselines = null;
    this.pitchingBaselines = null;
    this.lastCalculated = null;
    this.season = null;
    this.fullGamesProcessed = 0; // Track complete MLB games, not individual player records
    this.updateThreshold = 50; // Update baselines every 50 complete MLB games
    this.forceUpdate = true; // Force update on script startup
  }

  async calculateLeagueBaselines(season) {
    console.log('🎯 Calculating dynamic league baselines for enhanced WAR/CVR...');
    
    try {
      // Ensure Redis is ready before large operations
      await executeRedisOperation(() => redisClient.ping());
      console.log('✅ Redis confirmed ready for baseline calculation');
      
      const pattern = `player:*-${season}:season`;
      
      // Use retry wrapper for Redis operations with extended timeout
      console.log('📊 Fetching player keys for baseline calculation...');
      const playerKeys = await executeRedisOperation(() => redisClient.keys(pattern), 5); // More retries for this critical operation
      
      if (playerKeys.length === 0) {
        console.warn('⚠️  No players found for baseline calculation, using default baselines');
        this.battingBaselines = this.getDefaultBaselines().batting;
        this.pitchingBaselines = this.getDefaultBaselines().pitching;
        this.lastCalculated = new Date();
        this.season = season;
        return this.getDefaultBaselines();
      }

      console.log(`📊 Found ${playerKeys.length} players for baseline calculation`);

      // 🚀 REDIS POWERHOUSE: Fetch player data in massive parallel batches for speed
      const batchSize = 500; // Redis can easily handle 500+ keys at once
      const allPlayerStats = [];
      
      for (let i = 0; i < playerKeys.length; i += batchSize) {
        const batch = playerKeys.slice(i, i + batchSize);
        
        // Use retry wrapper for pipeline operations
        const results = await executeRedisOperation(async () => {
          const pipeline = redisClient.pipeline();
          batch.forEach(key => pipeline.get(key));
          return await pipeline.exec();
        });
        
        results.forEach(([err, data]) => {
          if (!err && data) {
            try {
              allPlayerStats.push(JSON.parse(data));
            } catch (parseErr) {
              // Skip invalid data
            }
          }
        });
      }

      // Filter qualified players
      const qualifiedBatters = allPlayerStats.filter(p => 
        p.batting && (p.batting.atBats >= 100 || p.batting.plateAppearances >= 150)
      );
      
      const qualifiedPitchers = allPlayerStats.filter(p => 
        p.pitching && parseInningsPitched(p.pitching.inningsPitched || 0) >= 20
      );

      console.log(`📊 Found ${qualifiedBatters.length} qualified batters, ${qualifiedPitchers.length} qualified pitchers for baselines`);

      this.battingBaselines = this.calculateBattingBaselines(qualifiedBatters);
      this.pitchingBaselines = this.calculatePitchingBaselines(qualifiedPitchers);
      
      this.lastCalculated = new Date();
      this.season = season;
      
      console.log('✅ Dynamic baselines calculated successfully!');
      
      return { batting: this.battingBaselines, pitching: this.pitchingBaselines };
      
    } catch (error) {
      console.error('❌ Error calculating dynamic baselines:', error);
      return this.getDefaultBaselines();
    }
  }

  calculateBattingBaselines(qualifiedBatters) {
    if (qualifiedBatters.length === 0) {
      return this.getDefaultBaselines().batting;
    }

    const stats = { ops: [], obp: [], slg: [], avg: [], homeRunRate: [], stolenBaseRate: [] };

    qualifiedBatters.forEach(player => {
      const b = player.batting;
      if (!b) return;

      const games = b.gamesPlayed || 1;
      if (b.atBats > 0) {
        stats.ops.push(parseFloat(b.ops) || 0);
        stats.obp.push(parseFloat(b.obp) || 0);
        stats.slg.push(parseFloat(b.slg) || 0);
        stats.avg.push(parseFloat(b.avg) || 0);
      }

      if (games > 0) {
        stats.homeRunRate.push((b.homeRuns || 0) / games);
        stats.stolenBaseRate.push((b.stolenBases || 0) / games);
      }
    });

    const calculatePercentiles = (arr) => {
      if (arr.length === 0) return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, avg: 0 };
      const sorted = arr.sort((a, b) => a - b);
      const len = sorted.length;
      return {
        p10: sorted[Math.floor(len * 0.1)],
        p25: sorted[Math.floor(len * 0.25)],
        p50: sorted[Math.floor(len * 0.5)],
        p75: sorted[Math.floor(len * 0.75)],
        p90: sorted[Math.floor(len * 0.9)],
        avg: arr.reduce((sum, val) => sum + val, 0) / len
      };
    };

    return {
      ops: calculatePercentiles(stats.ops),
      obp: calculatePercentiles(stats.obp),
      slg: calculatePercentiles(stats.slg),
      avg: calculatePercentiles(stats.avg),
      homeRunRate: calculatePercentiles(stats.homeRunRate),
      stolenBaseRate: calculatePercentiles(stats.stolenBaseRate)
    };
  }

  calculatePitchingBaselines(qualifiedPitchers) {
    if (qualifiedPitchers.length === 0) {
      return this.getDefaultBaselines().pitching;
    }

    const stats = { era: [], fip: [], whip: [], strikeoutsPer9: [], walksPer9: [] };

    qualifiedPitchers.forEach(player => {
      const p = player.pitching;
      if (!p) return;

      const ip = parseInningsPitched(p.inningsPitched || 0);
      if (ip > 0) {
        stats.era.push(parseFloat(p.era) || 0);
        stats.fip.push(parseFloat(p.fip) || 0);
        stats.whip.push(parseFloat(p.whip) || 0);
        stats.strikeoutsPer9.push(parseFloat(p.strikeoutsPer9Inn) || 0);
        stats.walksPer9.push(parseFloat(p.walksPer9Inn) || 0);
      }
    });

    const calculatePercentiles = (arr, reversed = false) => {
      if (arr.length === 0) return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, avg: 0 };
      const sorted = arr.sort((a, b) => reversed ? b - a : a - b);
      const len = sorted.length;
      return {
        p10: sorted[Math.floor(len * 0.1)],
        p25: sorted[Math.floor(len * 0.25)],
        p50: sorted[Math.floor(len * 0.5)],
        p75: sorted[Math.floor(len * 0.75)],
        p90: sorted[Math.floor(len * 0.9)],
        avg: arr.reduce((sum, val) => sum + val, 0) / len
      };
    };

    return {
      era: calculatePercentiles(stats.era),             // ERA: lower is better, so p10 = best, p90 = worst
      fip: calculatePercentiles(stats.fip),             // FIP: lower is better, so p10 = best, p90 = worst
      whip: calculatePercentiles(stats.whip),           // WHIP: lower is better, so p10 = best, p90 = worst
      strikeoutsPer9: calculatePercentiles(stats.strikeoutsPer9), // K/9: higher is better, so p90 = best, p10 = worst
      walksPer9: calculatePercentiles(stats.walksPer9)   // BB/9: lower is better, so p10 = best, p90 = worst
    };
  }

  getDefaultBaselines() {
    // 2024 MLB baseline approximations
    return {
      batting: {
        ops: { p10: 0.580, p25: 0.650, p50: 0.720, p75: 0.800, p90: 0.900, avg: 0.720 },
        obp: { p10: 0.280, p25: 0.310, p50: 0.340, p75: 0.370, p90: 0.420, avg: 0.340 },
        slg: { p10: 0.300, p25: 0.360, p50: 0.420, p75: 0.480, p90: 0.550, avg: 0.420 },
        avg: { p10: 0.200, p25: 0.240, p50: 0.270, p75: 0.300, p90: 0.330, avg: 0.270 },
        homeRunRate: { p10: 0.02, p25: 0.06, p50: 0.12, p75: 0.20, p90: 0.30, avg: 0.14 },
        stolenBaseRate: { p10: 0.00, p25: 0.02, p50: 0.08, p75: 0.15, p90: 0.25, avg: 0.10 }
      },
      pitching: {
        // 2024 MLB realistic baselines (sorted lowest to highest for rate stats where lower is better)
        era: { p10: 2.50, p25: 3.20, p50: 4.00, p75: 4.80, p90: 5.80, avg: 4.00 },      // p10 = elite, p90 = poor
        fip: { p10: 2.80, p25: 3.40, p50: 4.10, p75: 4.70, p90: 5.50, avg: 4.10 },      // p10 = elite, p90 = poor  
        whip: { p10: 1.00, p25: 1.15, p50: 1.30, p75: 1.45, p90: 1.65, avg: 1.30 },     // p10 = elite, p90 = poor
        strikeoutsPer9: { p10: 5.0, p25: 7.0, p50: 8.5, p75: 10.0, p90: 12.0, avg: 8.5 }, // p90 = elite, p10 = poor
        walksPer9: { p10: 1.5, p25: 2.2, p50: 3.0, p75: 3.8, p90: 5.0, avg: 3.0 }       // p10 = elite, p90 = poor
      }
    };
  }

  async getBaselines(season) {
    const needsRecalculation = !this.battingBaselines || 
                               !this.pitchingBaselines || 
                               this.season !== season ||
                               !this.lastCalculated ||
                               this.forceUpdate ||
                               (this.fullGamesProcessed > 0 && this.fullGamesProcessed % this.updateThreshold === 0) ||
                               (Date.now() - this.lastCalculated.getTime()) > 24 * 60 * 60 * 1000;

    if (needsRecalculation) {
      console.log(`🔄 Updating baselines - Full MLB games processed: ${this.fullGamesProcessed}, Force update: ${this.forceUpdate}`);
      await this.calculateLeagueBaselines(season);
      this.forceUpdate = false; // Reset force update flag after first calculation
    }

    return {
      batting: this.battingBaselines || this.getDefaultBaselines().batting,
      pitching: this.pitchingBaselines || this.getDefaultBaselines().pitching
    };
  }

  // Method to increment full game count - called when a complete MLB game is processed
  incrementFullGameCount() {
    this.fullGamesProcessed++;
    console.log(`📊 Full MLB games processed: ${this.fullGamesProcessed}`);
  }
}

// Global baseline calculator instance
const dynamicBaselines = new DynamicBaselines();

// ============================================================================
// PARALLEL PROCESSING UTILITIES
// ============================================================================

/**
 * Process games in parallel batches for faster execution
 * Enhanced to leverage Redis's massive throughput capabilities
 */
async function processGamesInParallel(games, batchSize = 16) {
  // 🚀 REDIS POWERHOUSE: Increase concurrency since Redis can handle massive load
  const maxConcurrency = Math.min(batchSize, Math.max(8, Math.floor(os.cpus().length * 1.5)));
  console.log(`🚀 REDIS POWERHOUSE: Processing ${games.length} games with ${maxConcurrency} parallel workers (Redis optimized)`);
  
  const results = [];
  
  for (let i = 0; i < games.length; i += maxConcurrency) {
    const batch = games.slice(i, i + maxConcurrency);
    console.log(`📦 Processing batch ${Math.floor(i/maxConcurrency) + 1}/${Math.ceil(games.length/maxConcurrency)} (${batch.length} games)`);
    
    // 🚀 Process games in parallel - Redis can handle this load easily
    const batchPromises = batch.map(game => processGame(game));
    const batchResults = await Promise.all(batchPromises);
    
    // 🚀 Store all games in parallel too - Redis pipelines make this blazing fast
    const storePromises = batchResults
      .filter(gameResult => gameResult)
      .map(gameResult => storeGameData(gameResult, gameResult.season || '2025'));
    
    await Promise.all(storePromises);
    
    // Store all valid results
    for (const gameResult of batchResults) {
      if (gameResult) {
        results.push(gameResult);
      }
    }
    
    // Minimal pause - Redis can handle sustained high throughput
    if (i + maxConcurrency < games.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// ============================================================================
// PROFESSIONAL BASEBALL STATISTICS CALCULATIONS
// ============================================================================

/**
 * Parse innings pitched string to decimal format
 * "5.1" -> 5.33, "5.2" -> 5.67, "6.0" -> 6.0
 * FIXED: Proper handling of outs in innings pitched
 */
function parseInningsPitched(ipString) {
  if (!ipString || ipString === "0.0" || ipString === 0) return 0;
  
  const str = ipString.toString();
  const parts = str.split('.');
  const innings = parseInt(parts[0]) || 0;
  const outs = parseInt(parts[1]) || 0;
  
  // Validate outs (should be 0, 1, or 2 only)
  if (outs > 2) {
    console.warn(`⚠️  Invalid outs in IP: ${ipString} - outs should be 0-2, got ${outs}`);
    return innings; // Just return whole innings if invalid
  }
  
  return innings + (outs / 3);
}

/**
 * Convert decimal innings back to IP string format
 * 5.33 -> "5.1", 5.67 -> "5.2", 6.0 -> "6.0"
 */
function formatInningsPitched(decimalIP) {
  if (!decimalIP || decimalIP === 0) return "0.0";
  
  const wholeInnings = Math.floor(decimalIP);
  const fractionalPart = decimalIP - wholeInnings;
  
  // Convert fractional part back to outs (0, 1, or 2)
  let outs = Math.round(fractionalPart * 3);
  
  // Handle rounding edge case
  if (outs >= 3) {
    return `${wholeInnings + 1}.0`;
  }
  
  return `${wholeInnings}.${outs}`;
}

/**
 * Aggregate innings pitched across multiple games - FIXED
 */
function aggregateInningsPitched(ipArray) {
  const totalOuts = ipArray.reduce((sum, ip) => {
    const parsed = parseInningsPitched(ip);
    const wholeInnings = Math.floor(parsed);
    const fractionalOuts = Math.round((parsed - wholeInnings) * 3);
    return sum + (wholeInnings * 3) + fractionalOuts;
  }, 0);
  
  const innings = Math.floor(totalOuts / 3);
  const remainingOuts = totalOuts % 3;
  
  return `${innings}.${remainingOuts}`;
}

// ============================================================================
// WAR (Wins Above Replacement) CALCULATIONS
// ============================================================================

/**
 * Calculate enhanced WAR for position players using dynamic baselines
 * Based on offensive and defensive contributions with league-adjusted performance
 */
async function calculateHitterWAR(stats, season = '2025') {
  if (!stats || !stats.batting) {
    console.log('❌ calculateHitterWAR: No stats or batting data');
    return 0;
  }
  
  const batting = stats.batting;
  const games = parseInt(batting.gamesPlayed) || 0;
  const pa = parseInt(batting.plateAppearances) || 0;
  const atBats = parseInt(batting.atBats) || 0;
  
  console.log('🔍 calculateHitterWAR input:', { games, pa, atBats, obp: batting.obp, slg: batting.slg });
  
  // With dynamic baselines, we can calculate WAR for any amount of playing time
  // The baselines will automatically adjust for league context and sample sizes
  
  // Get dynamic baselines for more accurate evaluation
  const baselines = await dynamicBaselines.getBaselines(season);
  const battingBaselines = baselines.batting;
  
  // Player stats
  const obp = parseFloat(batting.obp) || 0;
  const slg = parseFloat(batting.slg) || 0;
  const ops = obp + slg;
  const avg = parseFloat(batting.avg) || 0;
  const hr = parseInt(batting.homeRuns) || 0;
  const sb = parseInt(batting.stolenBases) || 0;
  
  let totalWAR = 0;
  
  // Percentile-based WAR calculation using dynamic baselines - FIXED SCALE FACTORS
  const calculatePercentileWAR = (value, baseline, scaleFactor = 1.0) => {
    if (value >= baseline.p90) return 1.5 * scaleFactor;        // Elite (90th percentile+)
    if (value >= baseline.p75) return 1.0 * scaleFactor;        // Very good (75th-90th)
    if (value >= baseline.p50) return 0.5 * scaleFactor;        // Above average (50th-75th)
    if (value >= baseline.p25) return 0.0 * scaleFactor;        // Average (25th-50th)
    if (value >= baseline.p10) return -0.3 * scaleFactor;       // Below average (10th-25th)
    return -0.6 * scaleFactor;                                  // Poor (below 10th)
  };
  
  // Primary offensive components with dynamic scaling - REDUCED SCALE FACTORS
  totalWAR += calculatePercentileWAR(ops, battingBaselines.ops, 0.5);      // OPS reduced from 1.5
  totalWAR += calculatePercentileWAR(obp, battingBaselines.obp, 0.4);      // OBP reduced from 1.0
  totalWAR += calculatePercentileWAR(slg, battingBaselines.slg, 0.3);      // SLG reduced from 0.8
  totalWAR += calculatePercentileWAR(avg, battingBaselines.avg, 0.2);      // Contact reduced from 0.4
  
  // Rate-based components - REDUCED IMPACT
  if (games > 0) {
    const hrRate = hr / games;
    const sbRate = sb / games;
    
    totalWAR += calculatePercentileWAR(hrRate, battingBaselines.homeRunRate, 0.2);  // Reduced from 0.5
    totalWAR += calculatePercentileWAR(sbRate, battingBaselines.stolenBaseRate, 0.1); // Reduced from 0.3
  }
  
  // Playing time adjustment - SIGNIFICANTLY REDUCED
  if (games >= 140) totalWAR += 0.3;        // Full season bonus (reduced from 0.8)
  else if (games >= 120) totalWAR += 0.2;   // Mostly full season (reduced from 0.4)
  else if (games >= 100) totalWAR += 0.1;   // Partial season
  else if (games >= 80) totalWAR -= 0.0;    // Limited time (reduced penalty)
  else totalWAR -= 0.1;                     // Part-time player (reduced from -0.3)
  
  // Simple defensive adjustment (would need positional data for full calculation)
  const fieldingWAR = 0; // Placeholder - would need detailed fielding metrics
  
  // Total WAR
  const finalWAR = totalWAR + fieldingWAR;
  
  console.log('✅ calculateHitterWAR result:', { games, ops, hr, sb, totalWAR, finalWAR });
  
  return Math.max(-2.0, Math.min(5.0, finalWAR)); // REALISTIC CAP: -2 to 5 WAR (reduced from -3 to 10)
}

/**
 * Calculate enhanced WAR for pitchers using dynamic baselines
 * Based on ERA, FIP, innings pitched, and other key metrics with league adjustments
 */
async function calculatePitcherWAR(stats, season = '2025') {
  if (!stats || !stats.pitching) {
    console.log('❌ calculatePitcherWAR: No stats or pitching data');
    return 0;
  }
  
  const pitching = stats.pitching;
  const ip = parseInningsPitched(pitching.inningsPitched || "0.0");
  
  console.log('🔍 calculatePitcherWAR input:', { ip, era: pitching.era, whip: pitching.whip, inningsPitched: pitching.inningsPitched });
  
  // With dynamic baselines, we can calculate WAR for any amount of innings
  // The baselines will automatically adjust for league context and sample sizes
  
  // Get dynamic baselines for more accurate evaluation
  const baselines = await dynamicBaselines.getBaselines(season);
  const pitchingBaselines = baselines.pitching;
  
  const era = parseFloat(pitching.era) || 999;
  const fip = parseFloat(pitching.fip) || era;
  const whip = parseFloat(pitching.whip) || 999;
  const k9 = parseFloat(pitching.strikeoutsPer9Inn) || 0;
  const bb9 = parseFloat(pitching.walksPer9Inn) || 0;
  const saves = parseInt(pitching.saves) || 0;
  const holds = parseInt(pitching.holds) || 0;
  
  let totalWAR = 0;
  
  // Percentile-based WAR calculation for pitchers (for rate stats where lower is better)
  const calculatePercentileWARReversed = (value, baseline, scaleFactor = 1.0) => {
    // For ERA, WHIP, BB/9: lower values are better
    // p10 = best performance (lowest values), p90 = worst performance (highest values)
    if (value <= baseline.p10) return 1.5 * scaleFactor;        // Elite (best 10%)
    if (value <= baseline.p25) return 1.0 * scaleFactor;        // Very good (10th-25th percentile)
    if (value <= baseline.p50) return 0.5 * scaleFactor;        // Above average (25th-50th)
    if (value <= baseline.p75) return 0.0 * scaleFactor;        // Average (50th-75th)
    if (value <= baseline.p90) return -0.3 * scaleFactor;       // Below average (75th-90th)
    return -0.6 * scaleFactor;                                  // Poor (worst 10%)
  };
  
  const calculatePercentileWAR = (value, baseline, scaleFactor = 1.0) => {
    // For K/9: higher values are better
    // p90 = best performance (highest values), p10 = worst performance (lowest values)
    if (value >= baseline.p90) return 1.5 * scaleFactor;        // Elite (best 10%)
    if (value >= baseline.p75) return 1.0 * scaleFactor;        // Very good (75th-90th)
    if (value >= baseline.p50) return 0.5 * scaleFactor;        // Above average (50th-75th)
    if (value >= baseline.p25) return 0.0 * scaleFactor;        // Average (25th-50th)
    if (value >= baseline.p10) return -0.3 * scaleFactor;       // Below average (10th-25th)
    return -0.6 * scaleFactor;                                  // Poor (worst 10%)
  };
  
  // Primary pitching components using dynamic baselines - FIXED SCALE FACTORS
  totalWAR += calculatePercentileWARReversed(Math.min(era, fip), pitchingBaselines.era, 0.6); // ERA/FIP reduced from 1.8
  totalWAR += calculatePercentileWARReversed(whip, pitchingBaselines.whip, 0.4);               // WHIP reduced from 1.2
  totalWAR += calculatePercentileWAR(k9, pitchingBaselines.strikeoutsPer9, 0.3);               // K9 reduced from 1.0
  totalWAR += calculatePercentileWARReversed(bb9, pitchingBaselines.walksPer9, 0.2);           // BB9 reduced from 0.8
  
  // Innings pitched bonus (durability/workload) - SIGNIFICANTLY REDUCED
  if (ip >= 200) totalWAR += 0.4;           // Ace workload (reduced from 1.2)
  else if (ip >= 180) totalWAR += 0.3;      // #1/#2 starter (reduced from 1.0)
  else if (ip >= 160) totalWAR += 0.2;      // Solid starter (reduced from 0.7)
  else if (ip >= 140) totalWAR += 0.1;      // Mid-rotation (reduced from 0.4)
  else if (ip >= 120) totalWAR += 0.0;      // Back-end starter (reduced from 0.1)
  else if (ip >= 80) totalWAR += 0.0;       // Swingman/long reliever
  else if (ip >= 50) totalWAR -= 0.0;       // Setup/closer (reduced penalty)
  else totalWAR -= 0.1;                     // Limited role (reduced penalty)
  
  // Role adjustment - REDUCED BONUSES
  if (saves >= 20) totalWAR += 0.1;          // Elite closer (reduced from 0.3)
  else if (saves >= 10) totalWAR += 0.05;    // Good closer (reduced from 0.2)
  else if (holds >= 15) totalWAR += 0.05;    // Elite setup (reduced from 0.1)
  
  console.log('✅ calculatePitcherWAR result:', { ip, era, whip, k9, bb9, totalWAR });
  
  return Math.max(-2.0, Math.min(5.0, totalWAR)); // REALISTIC CAP: -2 to 5 WAR (reduced from -3 to 10)
}

// ============================================================================
// CVR (CYCLE VALUE RATING) CALCULATIONS
// ============================================================================

/**
 * Calculate player value score for CVR (0-100)
 */
function calculatePlayerValueScore(stats) {
  if (!stats) return 0;
  
  // For pitchers
  if (stats.pitching) {
    const pitching = stats.pitching;
    const ip = parseInningsPitched(pitching.inningsPitched || "0.0");
    const gamesStarted = parseInt(pitching.gamesStarted) || 0;
    const gamesPlayed = parseInt(pitching.gamesPlayed) || 0;
    
    const isPitcher = ip >= 2 || gamesStarted > 0 || gamesPlayed > 0;
    
    if (isPitcher && ip >= 2) {
      const era = parseFloat(pitching.era) || 999;
      const whip = parseFloat(pitching.whip) || 999;
      const wins = pitching.wins || 0;
      const strikeouts = pitching.strikeOuts || 0;
      const k9 = ip > 0 ? (strikeouts * 9) / ip : 0;
      
      let score = 10; // Base points
      
      // ERA contribution (0-25 points)
      if (era <= 2.00) score += 25;
      else if (era <= 2.50) score += 20;
      else if (era <= 3.00) score += 16;
      else if (era <= 3.50) score += 12;
      else if (era <= 4.00) score += 8;
      else if (era <= 4.50) score += 4;
      
      // WHIP contribution (0-20 points)
      if (whip <= 0.90) score += 20;
      else if (whip <= 1.00) score += 17;
      else if (whip <= 1.15) score += 14;
      else if (whip <= 1.30) score += 10;
      else if (whip <= 1.45) score += 6;
      else if (whip <= 1.60) score += 3;
      
      // K/9 contribution (0-20 points)
      if (k9 >= 11.0) score += 20;
      else if (k9 >= 10.0) score += 17;
      else if (k9 >= 8.5) score += 14;
      else if (k9 >= 7.5) score += 10;
      else if (k9 >= 6.5) score += 6;
      else if (k9 >= 5.5) score += 3;
      
      // Wins and innings (0-25 points)
      const winRate = ip > 0 ? wins / (ip / 6) : 0;
      const ipBonus = Math.min(12, ip / 15);
      const winBonus = Math.min(13, winRate * 6);
      score += ipBonus + winBonus;
      
      return Math.min(100, score);
    }
  }
  
  // For hitters
  if (stats.batting) {
    const batting = stats.batting;
    const avg = parseFloat(batting.avg || batting.battingAverage) || 0;
    const obp = parseFloat(batting.obp || batting.onBasePercentage) || 0;
    const slg = parseFloat(batting.slg || batting.sluggingPercentage) || 0;
    const atBats = parseInt(batting.atBats) || 0;
    const games = batting.gamesPlayed || Math.floor(atBats / 3.5) || 1;
    
    if (atBats < 50) return 0; // Need minimum at-bats
    
    const hrs = (batting.homeRuns || 0) / Math.max(games, 1);
    const rbis = (batting.rbi || 0) / Math.max(games, 1);
    const runs = (batting.runs || 0) / Math.max(games, 1);
    
    let score = 15; // Base points for hitters
    
    // Batting average (0-30 points)
    if (avg >= 0.320) score += 30;
    else if (avg >= 0.300) score += 26;
    else if (avg >= 0.280) score += 22;
    else if (avg >= 0.260) score += 18;
    else if (avg >= 0.240) score += 14;
    else if (avg >= 0.220) score += 8;
    
    // OBP (0-30 points)
    if (obp >= 0.420) score += 30;
    else if (obp >= 0.400) score += 26;
    else if (obp >= 0.370) score += 22;
    else if (obp >= 0.340) score += 18;
    else if (obp >= 0.320) score += 14;
    else if (obp >= 0.300) score += 8;
    
    // SLG (0-25 points)
    if (slg >= 0.600) score += 25;
    else if (slg >= 0.550) score += 22;
    else if (slg >= 0.480) score += 18;
    else if (slg >= 0.420) score += 14;
    else if (slg >= 0.380) score += 10;
    else if (slg >= 0.350) score += 6;
    
    // Production per game (0-25 points)
    const productionPerGame = hrs + (rbis * 0.8) + (runs * 0.6);
    if (productionPerGame >= 2.5) score += 25;
    else if (productionPerGame >= 2.0) score += 21;
    else if (productionPerGame >= 1.5) score += 17;
    else if (productionPerGame >= 1.0) score += 13;
    else if (productionPerGame >= 0.7) score += 9;
    else if (productionPerGame >= 0.4) score += 5;
    
    return Math.min(100, score);
  }
  
  return 0;
}

/**
 * Calculate salary tier multiplier
 */
function getSalaryTier(salary) {
  if (salary >= 35000000) return 1.4; // Ultra-mega contracts
  if (salary >= 25000000) return 1.3; // Superstar contracts
  if (salary >= 15000000) return 1.2; // Star contracts
  if (salary >= 8000000) return 1.1;  // Above average
  if (salary >= 3000000) return 1.0;  // Average MLB salary
  if (salary >= 1000000) return 0.95; // Below average
  return 0.9; // Minimum/rookie contracts
}

/**
 * Estimate salary based on player performance (for CVR calculation)
 * This is a simplified estimation - in production you'd use real salary data
 */
function estimatePlayerSalary(stats, war) {
  const baseMinimum = 740000; // MLB minimum salary
  const baseAverage = 4500000; // MLB average salary
  
  // Use WAR as primary salary indicator
  if (war >= 6) return 35000000; // Superstar
  if (war >= 4) return 25000000; // Star
  if (war >= 2.5) return 15000000; // Very good
  if (war >= 1.5) return 8000000; // Above average
  if (war >= 0.5) return baseAverage; // Average
  if (war >= 0) return 2000000; // Below average
  return baseMinimum; // Replacement level
}

/**
 * Calculate CVR (Cycle Value Rating)
 */
function calculatePlayerCVR(stats, war) {
  const valueScore = calculatePlayerValueScore(stats);
  if (valueScore <= 0) return null;
  
  // Estimate salary for CVR calculation
  const estimatedSalary = estimatePlayerSalary(stats, war);
  const salaryTier = getSalaryTier(estimatedSalary);
  
  // Apply WAR multiplier
  let warMultiplier = 1.0;
  if (war >= 6) warMultiplier = 1.8;
  else if (war >= 4) warMultiplier = 1.5;
  else if (war >= 2.5) warMultiplier = 1.3;
  else if (war >= 1.5) warMultiplier = 1.15;
  else if (war >= 0.5) warMultiplier = 1.0;
  else if (war >= -0.5) warMultiplier = 0.9;
  else if (war >= -1.5) warMultiplier = 0.75;
  else warMultiplier = 0.5;
  
  const adjustedValueScore = valueScore * warMultiplier;
  
  // Calculate CVR (0-2 scale where 1.0 = average)
  const normalizedValueScore = adjustedValueScore / 50;
  const normalizedSalaryTier = salaryTier / 1.0;
  const cvr = normalizedValueScore / normalizedSalaryTier;
  
  return Math.round(cvr * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate team-level CVR
 */
function calculateTeamCVR(teamStats, teamWAR, estimatedPayroll) {
  // Calculate team performance score based on wins, run differential, etc.
  const wins = teamStats.record?.wins || 0;
  const losses = teamStats.record?.losses || 0;
  const totalGames = wins + losses;
  
  if (totalGames === 0) return null;
  
  const winPct = wins / totalGames;
  const runsScored = teamStats.batting?.runs || 0;
  const runsAllowed = teamStats.pitching?.runs || 0;
  const runDiff = runsScored - runsAllowed;
  
  // Team performance score (0-100)
  let teamScore = 50; // Base score
  
  // Win percentage component (most important)
  if (winPct >= 0.650) teamScore += 30;      // Elite (.650+ = 105+ wins)
  else if (winPct >= 0.600) teamScore += 25; // Excellent (.600+ = 97+ wins)
  else if (winPct >= 0.550) teamScore += 20; // Very good (.550+ = 89+ wins)
  else if (winPct >= 0.500) teamScore += 10; // Above average (.500+ = 81+ wins)
  else if (winPct >= 0.450) teamScore += 0;  // Average (.450+ = 73+ wins)
  else if (winPct >= 0.400) teamScore -= 10; // Below average (.400+ = 65+ wins)
  else teamScore -= 20;                      // Poor (under .400)
  
  // Run differential component
  if (totalGames > 0) {
    const runDiffPerGame = runDiff / totalGames;
    if (runDiffPerGame >= 2.0) teamScore += 20;      // Elite run differential
    else if (runDiffPerGame >= 1.0) teamScore += 15; // Very good
    else if (runDiffPerGame >= 0.5) teamScore += 10; // Good
    else if (runDiffPerGame >= 0) teamScore += 5;    // Slightly positive
    else if (runDiffPerGame >= -0.5) teamScore += 0; // Slightly negative
    else if (runDiffPerGame >= -1.0) teamScore -= 5; // Poor
    else teamScore -= 10;                            // Very poor
  }
  
  // Apply WAR multiplier
  let warMultiplier = 1.0;
  if (teamWAR >= 30) warMultiplier = 1.3;      // Elite team
  else if (teamWAR >= 20) warMultiplier = 1.2; // Very good team
  else if (teamWAR >= 10) warMultiplier = 1.1; // Above average
  else if (teamWAR >= 0) warMultiplier = 1.0;  // Average
  else warMultiplier = 0.9;                    // Below average
  
  const adjustedTeamScore = teamScore * warMultiplier;
  
  // Calculate payroll tier (team version)
  let payrollTier = 1.0; // League average
  if (estimatedPayroll >= 250000000) payrollTier = 1.4;      // Luxury tax heavy spenders
  else if (estimatedPayroll >= 200000000) payrollTier = 1.3; // High payroll
  else if (estimatedPayroll >= 150000000) payrollTier = 1.2; // Above average
  else if (estimatedPayroll >= 100000000) payrollTier = 1.0; // Average
  else if (estimatedPayroll >= 80000000) payrollTier = 0.9;  // Below average
  else payrollTier = 0.8;                                    // Low payroll
  
  // Calculate team CVR (0-2 scale)
  const normalizedTeamScore = adjustedTeamScore / 50; // Convert to 0-2 scale
  const normalizedPayrollTier = payrollTier / 1.0;
  const teamCVR = normalizedTeamScore / normalizedPayrollTier;
  
  return Math.round(teamCVR * 100) / 100;
}

/**
 * Calculate team batting CVR (focused on offensive production vs. investment)
 */
function calculateTeamBattingCVR(battingStats, battingWAR, estimatedOffensivePayroll) {
  if (!battingStats || !battingStats.runs) return null;
  
  // Calculate offensive performance score
  let offensiveScore = 50; // Base score
  
  // Key offensive metrics
  const ops = battingStats.ops || 0;
  const runs = battingStats.runs || 0;
  const homeRuns = battingStats.homeRuns || 0;
  const gamesPlayed = battingStats.gamesPlayed || 162;
  const runsPerGame = runs / gamesPlayed;
  
  // OPS component (primary offensive metric)
  if (ops >= 0.850) offensiveScore += 25;      // Elite offense
  else if (ops >= 0.800) offensiveScore += 20; // Excellent
  else if (ops >= 0.750) offensiveScore += 15; // Very good
  else if (ops >= 0.720) offensiveScore += 10; // Above average
  else if (ops >= 0.700) offensiveScore += 5;  // Average
  else if (ops >= 0.680) offensiveScore += 0;  // Below average
  else offensiveScore -= 10;                   // Poor
  
  // Runs per game component
  if (runsPerGame >= 5.5) offensiveScore += 15;
  else if (runsPerGame >= 5.0) offensiveScore += 10;
  else if (runsPerGame >= 4.5) offensiveScore += 5;
  else if (runsPerGame >= 4.0) offensiveScore += 0;
  else offensiveScore -= 10;
  
  // WAR adjustment for batting
  const warMultiplier = battingWAR >= 20 ? 1.3 : battingWAR >= 15 ? 1.2 : battingWAR >= 10 ? 1.1 : battingWAR >= 5 ? 1.0 : 0.9;
  const adjustedOffensiveScore = offensiveScore * warMultiplier;
  
  // Calculate payroll tier for offensive spending (typically 60% of team payroll)
  const offensivePayroll = estimatedOffensivePayroll * 0.6;
  let payrollTier = 1.0;
  if (offensivePayroll >= 150000000) payrollTier = 1.4;
  else if (offensivePayroll >= 120000000) payrollTier = 1.3;
  else if (offensivePayroll >= 90000000) payrollTier = 1.2;
  else if (offensivePayroll >= 60000000) payrollTier = 1.0;
  else if (offensivePayroll >= 45000000) payrollTier = 0.9;
  else payrollTier = 0.8;
  
  const normalizedOffensiveScore = adjustedOffensiveScore / 50;
  const normalizedPayrollTier = payrollTier / 1.0;
  const battingCVR = normalizedOffensiveScore / normalizedPayrollTier;
  
  return Math.round(battingCVR * 100) / 100;
}

/**
 * Calculate team pitching CVR (focused on run prevention vs. investment)
 */
function calculateTeamPitchingCVR(pitchingStats, pitchingWAR, estimatedPitchingPayroll) {
  if (!pitchingStats) return null;
  
  // Calculate pitching performance score
  let pitchingScore = 50; // Base score
  
  // Key pitching metrics
  const era = pitchingStats.era || 5.00;
  const whip = pitchingStats.whip || 1.50;
  const fip = pitchingStats.fip || era; // Use ERA if FIP not available
  const saves = pitchingStats.saves || 0;
  
  // ERA component (primary pitching metric)
  if (era <= 3.20) pitchingScore += 25;      // Elite pitching
  else if (era <= 3.50) pitchingScore += 20; // Excellent
  else if (era <= 3.80) pitchingScore += 15; // Very good
  else if (era <= 4.00) pitchingScore += 10; // Above average
  else if (era <= 4.20) pitchingScore += 5;  // Average
  else if (era <= 4.50) pitchingScore += 0;  // Below average
  else pitchingScore -= 10;                  // Poor
  
  // WHIP component
  if (whip <= 1.10) pitchingScore += 15;
  else if (whip <= 1.20) pitchingScore += 10;
  else if (whip <= 1.30) pitchingScore += 5;
  else if (whip <= 1.40) pitchingScore += 0;
  else pitchingScore -= 10;
  
  // WAR adjustment for pitching
  const warMultiplier = pitchingWAR >= 20 ? 1.3 : pitchingWAR >= 15 ? 1.2 : pitchingWAR >= 10 ? 1.1 : pitchingWAR >= 5 ? 1.0 : 0.9;
  const adjustedPitchingScore = pitchingScore * warMultiplier;
  
  // Calculate payroll tier for pitching spending (typically 40% of team payroll)
  const pitchingPayroll = estimatedPitchingPayroll * 0.4;
  let payrollTier = 1.0;
  if (pitchingPayroll >= 100000000) payrollTier = 1.4;
  else if (pitchingPayroll >= 80000000) payrollTier = 1.3;
  else if (pitchingPayroll >= 60000000) payrollTier = 1.2;
  else if (pitchingPayroll >= 40000000) payrollTier = 1.0;
  else if (pitchingPayroll >= 30000000) payrollTier = 0.9;
  else payrollTier = 0.8;
  
  const normalizedPitchingScore = adjustedPitchingScore / 50;
  const normalizedPayrollTier = payrollTier / 1.0;
  const pitchingCVR = normalizedPitchingScore / normalizedPayrollTier;
  
  return Math.round(pitchingCVR * 100) / 100;
}

/**
 * Classify player type based on their actual usage patterns
 * This is the core function that determines if a player is a batter, pitcher, or two-way player
 */
function classifyPlayerType(battingStats, pitchingStats) {
  const pitchingIP = parseInningsPitched(pitchingStats.inningsPitched || "0.0");
  
  // 🐛 DEBUG: Let's see what's happening with pitcher classification
  if (pitchingIP > 0) {
    console.log(`🔍 PITCHER DEBUG: IP=${pitchingIP}, inningsPitched=${pitchingStats.inningsPitched}`);
  }
  
  // Key thresholds for classification - LOWERED thresholds to catch more players
  const hasSignificantBatting = (battingStats.atBats || 0) >= 1; // At least 1 at-bat to be a batter
  const hasSignificantPitching = pitchingIP >= 0.1; // At least 0.1 innings pitched to be a pitcher
  
  // Two-way player (very rare but possible - like Shohei Ohtani)
  if (hasSignificantBatting && hasSignificantPitching) {
    console.log(`🔍 Two-way player found: Batting AB=${battingStats.atBats}, Pitching IP=${pitchingIP}`);
    return 'Two-Way Player';
  }
  
  // Primary pitcher - only if they actually pitched
  if (hasSignificantPitching) {
    console.log(`🔍 Pitcher classified: IP=${pitchingIP}`);
    return 'Pitcher';
  }
  
  // Primary batter (position player) - only if they actually batted
  if (hasSignificantBatting) {
    return 'Batter';
  }
  
  // If player has no meaningful stats, return null (they won't be stored)
  return null;
}

/**
 * Calculate complete batting statistics from counting stats
 */
function calculateBattingStats(countingStats) {
  const {
    hits = 0, atBats = 0, baseOnBalls = 0, hitByPitch = 0, sacFlies = 0,
    totalBases = 0, homeRuns = 0, strikeOuts = 0, stolenBases = 0,
    caughtStealing = 0, groundOuts = 0, airOuts = 0, flyOuts = 0,
    plateAppearances = 0, runs = 0, doubles = 0, triples = 0, rbi = 0
  } = countingStats;

  // Derived plate appearances if not provided
  const pa = plateAppearances || (atBats + baseOnBalls + hitByPitch + sacFlies);
  
  // Rate statistics (proper calculations)
  const avg = atBats > 0 ? hits / atBats : 0;
  const obp = (atBats + baseOnBalls + hitByPitch + sacFlies) > 0 
    ? (hits + baseOnBalls + hitByPitch) / (atBats + baseOnBalls + hitByPitch + sacFlies) : 0;
  const slg = atBats > 0 ? totalBases / atBats : 0;
  const ops = obp + slg;
  
  // Advanced metrics
  const iso = slg - avg; // Isolated Power
  const babip = (atBats - strikeOuts - homeRuns + sacFlies) > 0 
    ? (hits - homeRuns) / (atBats - strikeOuts - homeRuns + sacFlies) : 0;
  const kRate = pa > 0 ? strikeOuts / pa : 0;
  const bbRate = pa > 0 ? baseOnBalls / pa : 0;
  const stolenBasePercentage = (stolenBases + caughtStealing) > 0 
    ? stolenBases / (stolenBases + caughtStealing) : 0;
  const atBatsPerHomeRun = homeRuns > 0 ? atBats / homeRuns : null;
  const groundOutsToAirouts = (airOuts + flyOuts) > 0 ? groundOuts / (airOuts + flyOuts) : 0;

  // Additional advanced sabermetrics
  const contactRate = pa > 0 ? (pa - strikeOuts) / pa : 0;
  const powerSpeed = homeRuns > 0 && stolenBases > 0 ? 2 * (homeRuns * stolenBases) / (homeRuns + stolenBases) : 0;
  const extraBaseHits = (doubles || 0) + (triples || 0) + (homeRuns || 0);
  const extraBaseHitRate = hits > 0 ? extraBaseHits / hits : 0;
  const walkToStrikeoutRatio = strikeOuts > 0 ? baseOnBalls / strikeOuts : baseOnBalls > 0 ? 999 : 0;
  const reachOnErrorRate = 0; // Would need more detailed data
  const clutchHitting = 0; // Would need situational data
  const hitStreaks = 0; // Would need game-by-game data
  
  // Simplified wOBA calculation (would need league constants for full accuracy)
  const wOBA_weights = { bb: 0.69, hbp: 0.72, single: 0.89, double: 1.27, triple: 1.62, hr: 2.10 };
  const singles = hits - doubles - triples - homeRuns;
  const wOBA = pa > 0 ? (
    (baseOnBalls * wOBA_weights.bb) +
    (hitByPitch * wOBA_weights.hbp) +
    (singles * wOBA_weights.single) +
    (doubles * wOBA_weights.double) +
    (triples * wOBA_weights.triple) +
    (homeRuns * wOBA_weights.hr)
  ) / pa : 0;

  return {
    // Counting stats
    ...countingStats,
    plateAppearances: pa,
    
    // Traditional rates
    avg: Number(avg.toFixed(3)),
    obp: Number(obp.toFixed(3)),
    slg: Number(slg.toFixed(3)),
    ops: Number(ops.toFixed(3)),
    
    // Advanced power metrics
    iso: Number(iso.toFixed(3)),
    extraBaseHits,
    extraBaseHitRate: Number(extraBaseHitRate.toFixed(3)),
    atBatsPerHomeRun: atBatsPerHomeRun ? Number(atBatsPerHomeRun.toFixed(2)) : null,
    powerSpeed: Number(powerSpeed.toFixed(1)),
    
    // Plate discipline
    kRate: Number(kRate.toFixed(3)),
    bbRate: Number(bbRate.toFixed(3)),
    contactRate: Number(contactRate.toFixed(3)),
    walkToStrikeoutRatio: Number(walkToStrikeoutRatio.toFixed(2)),
    
    // Batted ball metrics
    babip: Number(babip.toFixed(3)),
    groundOutsToAirouts: Number(groundOutsToAirouts.toFixed(2)),
    
    // Speed metrics
    stolenBasePercentage: Number(stolenBasePercentage.toFixed(3)),
    
    // Advanced sabermetrics
    wOBA: Number(wOBA.toFixed(3)),
    
    // Situational metrics (placeholders for future enhancement)
    clutchHitting,
    hitStreaks,
    reachOnErrorRate
  };
}

/**
 * Calculate complete pitching statistics from counting stats
 */
function calculatePitchingStats(countingStats) {
  const {
    earnedRuns = 0, inningsPitched = 0, baseOnBalls = 0, hits = 0,
    strikeOuts = 0, pitchesThrown = 0, strikes = 0, wins = 0, losses = 0,
    runs = 0, homeRuns = 0, battersFaced = 0, groundOuts = 0, airOuts = 0,
    flyOuts = 0, inheritedRunners = 0, inheritedRunnersScored = 0
  } = countingStats;

  const ip = parseInningsPitched(inningsPitched);
  
  // Rate statistics
  const era = ip > 0 ? (earnedRuns * 9) / ip : 0;
  const whip = ip > 0 ? (baseOnBalls + hits) / ip : 0;
  const strikePercentage = pitchesThrown > 0 ? strikes / pitchesThrown : 0;
  const strikeoutWalkRatio = baseOnBalls > 0 ? strikeOuts / baseOnBalls : strikeOuts > 0 ? 999 : 0;
  const strikeoutsPer9Inn = ip > 0 ? (strikeOuts * 9) / ip : 0;
  const walksPer9Inn = ip > 0 ? (baseOnBalls * 9) / ip : 0;
  const hitsPer9Inn = ip > 0 ? (hits * 9) / ip : 0;
  const runsScoredPer9 = ip > 0 ? (runs * 9) / ip : 0;
  const homeRunsPer9 = ip > 0 ? (homeRuns * 9) / ip : 0;
  const pitchesPerInning = ip > 0 ? pitchesThrown / ip : 0;
  const winPercentage = (wins + losses) > 0 ? wins / (wins + losses) : 0;
  const groundOutsToAirouts = (airOuts + flyOuts) > 0 ? groundOuts / (airOuts + flyOuts) : 0;
  
  // FIP calculation (Fielding Independent Pitching)
  const fipConstant = 3.20; // MLB average varies by year, using approximate
  const fip = ip > 0 ? (((13 * homeRuns) + (3 * (baseOnBalls + countingStats.hitByPitch || 0)) - (2 * strikeOuts)) / ip) + fipConstant : 0;

  // Additional advanced pitching metrics
  const xFip = ip > 0 ? (((13 * 0.11 * flyOuts) + (3 * (baseOnBalls + countingStats.hitByPitch || 0)) - (2 * strikeOuts)) / ip) + fipConstant : 0; // xFIP using league avg HR/FB
  
  // Fixed BABIP calculation for pitchers
  const battedBalls = battersFaced - strikeOuts - baseOnBalls - (countingStats.hitByPitch || 0);
  const babip = battedBalls > 0 ? (hits - homeRuns) / (battedBalls - homeRuns) : 0;
  
  // Fixed LOB% calculation - proper strand rate
  const baseRunners = hits + baseOnBalls + (countingStats.hitByPitch || 0);
  const leftOnBasePercentage = baseRunners > 0 ? ((baseRunners - runs) / baseRunners) * 100 : 0;
  
  const outs = Math.floor(ip) * 3 + ((ip % 1) * 10);
  const gameScore = ip >= 4 ? 50 + outs + (2 * strikeOuts) - (2 * hits) - (4 * earnedRuns) - (2 * runs - earnedRuns) - baseOnBalls : 0; // Game Score calculation
  const qualityStart = ip >= 6 && earnedRuns <= 3 ? 1 : 0;
  const pitchesPerBatter = battersFaced > 0 ? pitchesThrown / battersFaced : 0;
  const firstPitchStrike = 0; // Would need pitch-by-pitch data
  const swingingStrike = 0; // Would need pitch-by-pitch data
  
  // Relief pitcher specific metrics
  const holds = 0; // Would need game situation data
  const blownSaves = 0; // Would need save situation data
  const saves = countingStats.saves || 0; // Use actual saves data
  const savePercentage = (saves + blownSaves) > 0 ? saves / (saves + blownSaves) : 0;

  return {
    // Counting stats
    ...countingStats,
    inningsPitched: ip > 0 ? formatInningsPitched(ip) : "0.0", // Use proper formatting function
    
    // Traditional rate stats
    era: Number(era.toFixed(2)),
    whip: Number(whip.toFixed(2)),
    winPercentage: Number(winPercentage.toFixed(3)),
    
    // Strikeout metrics
    strikeoutWalkRatio: Number(strikeoutWalkRatio.toFixed(2)),
    strikeoutsPer9Inn: Number(strikeoutsPer9Inn.toFixed(1)),
    walksPer9Inn: Number(walksPer9Inn.toFixed(1)),
    hitsPer9Inn: Number(hitsPer9Inn.toFixed(1)),
    homeRunsPer9: Number(homeRunsPer9.toFixed(1)),
    
    // Advanced sabermetrics
    fip: Number(fip.toFixed(2)),
    xFip: Number(xFip.toFixed(2)),
    babip: Number(babip.toFixed(3)),
    leftOnBasePercentage: Number(leftOnBasePercentage.toFixed(1)), // Fixed LOB%
    
    // Efficiency metrics
    pitchesPerInning: Number(pitchesPerInning.toFixed(1)),
    pitchesPerBatter: Number(pitchesPerBatter.toFixed(1)),
    strikePercentage: Number(strikePercentage.toFixed(3)),
    
    // Batted ball metrics
    groundOutsToAirouts: Number(groundOutsToAirouts.toFixed(2)),
    
    // Game performance
    runsScoredPer9: Number(runsScoredPer9.toFixed(2)),
    gameScore: Number(gameScore.toFixed(0)),
    qualityStart,
    
    // Relief metrics
    holds,
    saves,
    blownSaves,
    savePercentage: Number(savePercentage.toFixed(3)),
    
    // Advanced pitch metrics (placeholders)
    firstPitchStrike,
    swingingStrike
  };
}

/**
 * Calculate fielding statistics
 */
function calculateFieldingStats(countingStats) {
  const {
    assists = 0, putOuts = 0, errors = 0, chances = 0,
    caughtStealing = 0, stolenBases = 0, doublePlays = 0
  } = countingStats;

  const totalChances = chances > 0 ? chances : (putOuts + assists + errors);
  const fieldingPercentage = totalChances > 0 ? (putOuts + assists) / totalChances : 0;
  const caughtStealingPercentage = (caughtStealing + stolenBases) > 0 
    ? caughtStealing / (caughtStealing + stolenBases) : 0;

  return {
    ...countingStats,
    chances: totalChances,
    fieldingPercentage: Number(fieldingPercentage.toFixed(3)),
    caughtStealingPercentage: Number(caughtStealingPercentage.toFixed(3)),
    doublePlays // Ensure double plays are included
  };
}

/**
 * Extract and validate statistics from MLB API player data
 */
function extractPlayerStats(playerData, gameInfo) {
  const stats = {};

  // Extract batting stats ONLY if player actually batted
  if (playerData.stats?.batting) {
    const batting = playerData.stats.batting;
    const atBats = safeNumber(batting.atBats);
    const plateAppearances = safeNumber(batting.plateAppearances);
    
    // Only include batting stats if player actually batted
    if (atBats > 0 || plateAppearances > 0) {
      stats.batting = {
        gamesPlayed: 1,
        atBats,
        plateAppearances,
        hits: safeNumber(batting.hits),
        runs: safeNumber(batting.runs),
        doubles: safeNumber(batting.doubles),
        triples: safeNumber(batting.triples),
        homeRuns: safeNumber(batting.homeRuns),
        rbi: safeNumber(batting.rbi),
        totalBases: safeNumber(batting.totalBases),
        baseOnBalls: safeNumber(batting.baseOnBalls),
        intentionalWalks: safeNumber(batting.intentionalWalks),
        hitByPitch: safeNumber(batting.hitByPitch),
        strikeOuts: safeNumber(batting.strikeOuts),
        sacBunts: safeNumber(batting.sacBunts),
        sacFlies: safeNumber(batting.sacFlies),
        stolenBases: safeNumber(batting.stolenBases),
        caughtStealing: safeNumber(batting.caughtStealing),
        groundIntoDoublePlay: safeNumber(batting.groundIntoDoublePlay),
        groundIntoTriplePlay: safeNumber(batting.groundIntoTriplePlay),
        leftOnBase: safeNumber(batting.leftOnBase),
        flyOuts: safeNumber(batting.flyOuts),
        groundOuts: safeNumber(batting.groundOuts),
        lineOuts: safeNumber(batting.lineOuts),
        popOuts: safeNumber(batting.popOuts),
        airOuts: safeNumber(batting.airOuts),
        catchersInterference: safeNumber(batting.catchersInterference),
        pickoffs: safeNumber(batting.pickoffs)
      };
    }
  }

  // Extract pitching stats ONLY if player actually pitched
  if (playerData.stats?.pitching) {
    const pitching = playerData.stats.pitching;
    const inningsPitched = pitching.inningsPitched || "0.0";
    const battersFaced = safeNumber(pitching.battersFaced);
    const outs = safeNumber(pitching.outs);
    
    // Only include pitching stats if player actually pitched
    if (parseInningsPitched(inningsPitched) > 0 || battersFaced > 0 || outs > 0) {
      stats.pitching = {
        gamesPlayed: 1,
        gamesStarted: safeNumber(pitching.gamesStarted),
        wins: safeNumber(pitching.wins),
        losses: safeNumber(pitching.losses),
        saves: safeNumber(pitching.saves),
        saveOpportunities: safeNumber(pitching.saveOpportunities),
        holds: safeNumber(pitching.holds),
        blownSaves: safeNumber(pitching.blownSaves),
        completeGames: safeNumber(pitching.completeGames),
        shutouts: safeNumber(pitching.shutouts),
        inningsPitched,
        hits: safeNumber(pitching.hits),
        runs: safeNumber(pitching.runs),
        earnedRuns: safeNumber(pitching.earnedRuns),
        homeRuns: safeNumber(pitching.homeRuns),
        baseOnBalls: safeNumber(pitching.baseOnBalls),
        intentionalWalks: safeNumber(pitching.intentionalWalks),
        strikeOuts: safeNumber(pitching.strikeOuts),
        hitByPitch: safeNumber(pitching.hitByPitch),
        atBats: safeNumber(pitching.atBats),
        battersFaced,
        outs,
        doubles: safeNumber(pitching.doubles),
        triples: safeNumber(pitching.triples),
        flyOuts: safeNumber(pitching.flyOuts),
        groundOuts: safeNumber(pitching.groundOuts),
        airOuts: safeNumber(pitching.airOuts),
        lineOuts: safeNumber(pitching.lineOuts),
        popOuts: safeNumber(pitching.popOuts),
        numberOfPitches: safeNumber(pitching.numberOfPitches),
        pitchesThrown: safeNumber(pitching.pitchesThrown),
        balls: safeNumber(pitching.balls),
        strikes: safeNumber(pitching.strikes),
        hitBatsmen: safeNumber(pitching.hitBatsmen),
        balks: safeNumber(pitching.balks),
        wildPitches: safeNumber(pitching.wildPitches),
        pickoffs: safeNumber(pitching.pickoffs),
        inheritedRunners: safeNumber(pitching.inheritedRunners),
        inheritedRunnersScored: safeNumber(pitching.inheritedRunnersScored),
        gamesFinished: safeNumber(pitching.gamesFinished),
        caughtStealing: safeNumber(pitching.caughtStealing),
        stolenBases: safeNumber(pitching.stolenBases),
        sacBunts: safeNumber(pitching.sacBunts),
        sacFlies: safeNumber(pitching.sacFlies),
        catchersInterference: safeNumber(pitching.catchersInterference),
        passedBall: safeNumber(pitching.passedBall)
      };
    }
  }

  // Extract fielding stats ONLY if player actually fielded
  if (playerData.stats?.fielding) {
    const fielding = playerData.stats.fielding;
    const chances = safeNumber(fielding.chances);
    const assists = safeNumber(fielding.assists);
    const putOuts = safeNumber(fielding.putOuts);
    
    // Only include fielding stats if player actually fielded
    if (chances > 0 || assists > 0 || putOuts > 0) {
      stats.fielding = {
        gamesStarted: safeNumber(fielding.gamesStarted),
        assists,
        putOuts,
        errors: safeNumber(fielding.errors),
        chances,
        passedBall: safeNumber(fielding.passedBall),
        pickoffs: safeNumber(fielding.pickoffs),
        caughtStealing: safeNumber(fielding.caughtStealing),
        stolenBases: safeNumber(fielding.stolenBases)
      };
    }
  }

  // Add game context
  stats.gameInfo = {
    gameId: gameInfo.gameId,
    date: gameInfo.date,
    opponent: gameInfo.opponent,
    homeAway: gameInfo.homeAway,
    battingOrder: playerData.battingOrder || null,
    position: playerData.position?.abbreviation || null
  };

  return stats;
}

/**
 * Safely convert to number with fallback
 */
function safeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'string' && value.includes('.---')) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Aggregate counting stats across multiple games
 */
function aggregateCountingStats(gamesStats, statType) {
  const totals = {};
  const ipValues = [];
  
  gamesStats.forEach(gameStats => {
    const stats = gameStats[statType];
    if (!stats) return;

    Object.entries(stats).forEach(([key, value]) => {
      if (key === 'inningsPitched') {
        ipValues.push(value);
      } else if (typeof value === 'number') {
        totals[key] = (totals[key] || 0) + value;
      } else if (key === 'gamesPlayed' && value === 1) {
        // Only count games where player actually played
        totals[key] = (totals[key] || 0) + 1;
      }
    });
  });

  // Handle innings pitched aggregation
  if (ipValues.length > 0) {
    totals.inningsPitched = aggregateInningsPitched(ipValues);
  }

  return totals;
}

// ============================================================================
// MAIN PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process a single game and extract all player/team data
 */
async function processGame(gameData) {
  const gameId = gameData.gamePk;
  const date = gameData.gameDate ? gameData.gameDate.split('T')[0] : '';
  const awayTeam = gameData.teams?.away?.team?.abbreviation?.toUpperCase() || 'AWAY';
  const homeTeam = gameData.teams?.home?.team?.abbreviation?.toUpperCase() || 'HOME';

  console.log(`🎮 Processing game ${gameId}: ${awayTeam} @ ${homeTeam} (${date})`);

  try {
    // Fetch boxscore data
    const boxscoreUrl = `https://statsapi.mlb.com/api/v1/game/${gameId}/boxscore`;
    const response = await fetch(boxscoreUrl);
    const boxscoreData = await response.json();

    const gameResults = {
      gameId,
      date,
      teams: { away: awayTeam, home: homeTeam },
      players: [],
      teamStats: {}
    };

    // Determine game winner for team records
    const awayScore = boxscoreData.teams?.away?.teamStats?.batting?.runs || 0;
    const homeScore = boxscoreData.teams?.home?.teamStats?.batting?.runs || 0;
    const awayWon = awayScore > homeScore;
    const homeWon = homeScore > awayScore;

    // Process both teams
    for (const side of ['away', 'home']) {
      const team = side === 'away' ? awayTeam : homeTeam;
      const opponent = side === 'away' ? homeTeam : awayTeam;
      const teamData = boxscoreData.teams?.[side];

      if (!teamData) continue;

      // Determine team result
      const teamWon = (side === 'away' && awayWon) || (side === 'home' && homeWon);
      const result = teamWon ? 'W' : 'L';

      const gameInfo = {
        gameId,
        date,
        opponent,
        homeAway: side,
        result,
        runsScored: side === 'away' ? awayScore : homeScore,
        runsAllowed: side === 'away' ? homeScore : awayScore
      };

      // Process individual players
      const players = teamData.players || {};
      for (const [playerId, playerData] of Object.entries(players)) {
        const playerName = playerData.person?.fullName?.replace(/\s+/g, '_') || `Player_${playerId}`;
        
        const stats = extractPlayerStats(playerData, gameInfo);
        
        gameResults.players.push({
          playerId,
          playerName,
          team,
          stats
        });
      }

      // Extract team-level stats
      const teamStats = teamData.teamStats || {};
      gameResults.teamStats[team] = {
        batting: teamStats.batting || {},
        pitching: teamStats.pitching || {},
        fielding: teamStats.fielding || {},
        gameInfo
      };
    }

    return gameResults;

  } catch (error) {
    console.error(`❌ Error processing game ${gameId}:`, error.message);
    return null;
  }
}

/**
 * Store game data in Redis with proper key structure
 */
async function storeGameData(gameData, season) {
  const { gameId, date, players, teamStats } = gameData;
  
  try {
    // 🚀 REDIS POWERHOUSE: Use pipeline for ALL operations in this game
    const pipeline = redisClient.pipeline();
    const seasonUpdatePromises = [];
    
    // Batch all player game data writes
    for (const player of players) {
      const { playerId, playerName, team, stats } = player;
      
      // Check if player has meaningful stats before storing
      const playerType = classifyPlayerType(stats.batting || {}, stats.pitching || {});
      if (playerType === null) {
        console.log(`⚠️  Skipping ${playerName} - no meaningful stats in this game`);
        continue; // Skip players with no meaningful stats
      }
      
      const playerGameKey = `player:${team}-${playerName}-${season}:${date}`;
      const playerSeasonKey = `player:${team}-${playerName}-${season}:season`;
      
      // Add to pipeline instead of individual writes
      pipeline.set(playerGameKey, JSON.stringify(stats));
      
      // Queue season update (these need to be sequential due to aggregation logic)
      seasonUpdatePromises.push(() => updatePlayerSeasonStats(playerSeasonKey, stats, team, playerName, season));
    }

    // Batch all team game data writes
    for (const [team, stats] of Object.entries(teamStats)) {
      const teamGameKey = `team:${team}:${season}:${date}`;
      const teamSeasonKey = `team:${team}:${season}:season`;
      
      // Add to pipeline instead of individual writes
      pipeline.set(teamGameKey, JSON.stringify(stats));
      
      // Queue team season update
      seasonUpdatePromises.push(() => updateTeamSeasonStats(teamSeasonKey, stats, team));
    }

    // 🚀 Execute all game data writes in one atomic operation with retry logic
    await executeRedisOperation(() => pipeline.exec());
    
    // 🚀 Process season updates in parallel (they don't depend on each other within a game)
    await Promise.all(seasonUpdatePromises.map(updateFn => updateFn()));

    // 📊 Increment full game count for baseline tracking (one complete MLB game processed)
    dynamicBaselines.incrementFullGameCount();

  } catch (error) {
    console.error(`❌ Error storing game ${gameId}:`, error.message);
    throw error;
  }
}

/**
 * Update or create season statistics for a player incrementally
 */
async function updatePlayerSeasonStats(playerSeasonKey, gameStats, team, playerName, season = '2025') {
  try {
    // Get existing season stats or create new ones with retry logic
    const existingData = await executeRedisOperation(() => redisClient.get(playerSeasonKey));
    let seasonStats;
    
    if (existingData) {
      seasonStats = JSON.parse(existingData);
    } else {
      // Initialize new player season stats with proper nested structure
      seasonStats = {
        gameCount: 0,
        batting: {
          gamesPlayed: 0,
          atBats: 0,
          plateAppearances: 0,
          hits: 0,
          runs: 0,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          rbi: 0,
          totalBases: 0,
          baseOnBalls: 0,
          hitByPitch: 0,
          sacFlies: 0,
          strikeOuts: 0,
          stolenBases: 0,
          caughtStealing: 0,
          groundIntoDoublePlay: 0
        },
        pitching: {
          gamesPlayed: 0,
          gamesStarted: 0,
          wins: 0,
          losses: 0,
          saves: 0,
          inningsPitched: "0.0",
          hits: 0,
          runs: 0,
          earnedRuns: 0,
          homeRuns: 0,
          baseOnBalls: 0,
          strikeOuts: 0,
          hitByPitch: 0,
          battersFaced: 0
        },
        fielding: {
          gamesStarted: 0,
          assists: 0,
          putOuts: 0,
          errors: 0,
          chances: 0
        },
        position: gameStats.gameInfo?.position || 'Unknown',
        status: 'active',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Extract stats from nested structure
    const batting = gameStats.batting || {};
    const pitching = gameStats.pitching || {};
    const fielding = gameStats.fielding || {};
    
    // Update game count
    seasonStats.gameCount += 1;
    
    // Aggregate batting stats ONLY if player actually batted in this game
    if (Object.keys(batting).length > 0 && (batting.atBats > 0 || batting.plateAppearances > 0)) {
      seasonStats.batting.gamesPlayed += batting.gamesPlayed || 1;
      seasonStats.batting.atBats += batting.atBats || 0;
      seasonStats.batting.plateAppearances += batting.plateAppearances || 0;
      seasonStats.batting.hits += batting.hits || 0;
      seasonStats.batting.runs += batting.runs || 0;
      seasonStats.batting.doubles += batting.doubles || 0;
      seasonStats.batting.triples += batting.triples || 0;
      seasonStats.batting.homeRuns += batting.homeRuns || 0;
      seasonStats.batting.rbi += batting.rbi || 0;
      seasonStats.batting.totalBases += batting.totalBases || 0;
      seasonStats.batting.baseOnBalls += batting.baseOnBalls || 0;
      seasonStats.batting.hitByPitch += batting.hitByPitch || 0;
      seasonStats.batting.sacFlies += batting.sacFlies || 0;
      seasonStats.batting.strikeOuts += batting.strikeOuts || 0;
      seasonStats.batting.stolenBases += batting.stolenBases || 0;
      seasonStats.batting.caughtStealing += batting.caughtStealing || 0;
      seasonStats.batting.groundIntoDoublePlay += batting.groundIntoDoublePlay || 0;
    }
    
    // Aggregate pitching stats ONLY if player actually pitched in this game
    if (Object.keys(pitching).length > 0 && 
        (parseInningsPitched(pitching.inningsPitched || "0.0") > 0 || 
         pitching.battersFaced > 0 || 
         pitching.outs > 0)) {
      seasonStats.pitching.gamesPlayed += pitching.gamesPlayed || 1;
      seasonStats.pitching.gamesStarted += pitching.gamesStarted || 0;
      seasonStats.pitching.wins += pitching.wins || 0;
      seasonStats.pitching.losses += pitching.losses || 0;
      seasonStats.pitching.saves += pitching.saves || 0;
      seasonStats.pitching.hits += pitching.hits || 0;
      seasonStats.pitching.runs += pitching.runs || 0;
      seasonStats.pitching.earnedRuns += pitching.earnedRuns || 0;
      seasonStats.pitching.homeRuns += pitching.homeRuns || 0;
      seasonStats.pitching.baseOnBalls += pitching.baseOnBalls || 0;
      seasonStats.pitching.strikeOuts += pitching.strikeOuts || 0;
      seasonStats.pitching.hitByPitch += pitching.hitByPitch || 0;
      seasonStats.pitching.battersFaced += pitching.battersFaced || 0;
      
      // Handle innings pitched aggregation
      if (pitching.inningsPitched && pitching.inningsPitched !== "0.0") {
        seasonStats.pitching.inningsPitched = aggregateInningsPitched([seasonStats.pitching.inningsPitched, pitching.inningsPitched]);
      }
    }
    
    // Aggregate fielding stats ONLY if player actually fielded in this game
    if (Object.keys(fielding).length > 0 && 
        (fielding.chances > 0 || fielding.assists > 0 || fielding.putOuts > 0)) {
      seasonStats.fielding.gamesStarted += fielding.gamesStarted || 0;
      seasonStats.fielding.assists += fielding.assists || 0;
      seasonStats.fielding.putOuts += fielding.putOuts || 0;
      seasonStats.fielding.errors += fielding.errors || 0;
      seasonStats.fielding.chances += fielding.chances || 0;
      seasonStats.fielding.doublePlays += fielding.doublePlays || 0;
    }
    
    // Update position if provided
    if (gameStats.gameInfo?.position) {
      seasonStats.position = gameStats.gameInfo.position;
    }
    
    // Calculate rate stats using professional formulas
    seasonStats.batting = calculateBattingStats(seasonStats.batting);
    seasonStats.pitching = calculatePitchingStats(seasonStats.pitching);
    seasonStats.fielding = calculateFieldingStats(seasonStats.fielding);
    
    // Classify player type based on accumulated season statistics
    const playerType = classifyPlayerType(seasonStats.batting, seasonStats.pitching);
    
    // Only store players who have meaningful stats (not null classification)
    if (playerType === null) {
      console.log(`⚠️  Skipping player ${playerName} - no meaningful batting or pitching stats`);
      return; // Don't store players with no meaningful stats
    }
    
    // Calculate WAR and CVR - NEW ADDITIONS
    let war = 0;
    console.log(`🔍 WAR Debug for ${playerName} (${playerType}):`, {
      gameCount: seasonStats.gameCount,
      battingPA: seasonStats.batting?.plateAppearances,
      battingAB: seasonStats.batting?.atBats,
      battingGP: seasonStats.batting?.gamesPlayed,
      battingOBP: seasonStats.batting?.obp,
      battingSLG: seasonStats.batting?.slg,
      battingOPS: (parseFloat(seasonStats.batting?.obp) || 0) + (parseFloat(seasonStats.batting?.slg) || 0),
      pitchingIP: seasonStats.pitching?.inningsPitched,
      pitchingBF: seasonStats.pitching?.battersFaced,
      pitchingGP: seasonStats.pitching?.gamesPlayed,
      pitchingERA: seasonStats.pitching?.era,
      pitchingWHIP: seasonStats.pitching?.whip
    });
    
    if (playerType === 'Pitcher' || playerType === 'Two-Way Player') {
      console.log(`🎯 About to calculate Pitcher WAR for ${playerName}`);
      const pitcherWAR = await calculatePitcherWAR(seasonStats, season);
      console.log(`⚾ Pitcher WAR for ${playerName}: ${pitcherWAR}`);
      war += pitcherWAR;
    }
    if (playerType === 'Batter' || playerType === 'Two-Way Player') {
      console.log(`🎯 About to calculate Hitter WAR for ${playerName}`);
      const hitterWAR = await calculateHitterWAR(seasonStats, season);
      console.log(`🏏 Hitter WAR for ${playerName}: ${hitterWAR}`);
      war += hitterWAR;
    }
    
    // For two-way players, use the higher WAR component
    if (playerType === 'Two-Way Player') {
      const pitcherWAR = await calculatePitcherWAR(seasonStats, season);
      const hitterWAR = await calculateHitterWAR(seasonStats, season);
      war = Math.max(pitcherWAR, hitterWAR) + (Math.min(pitcherWAR, hitterWAR) * 0.3); // Primary role + 30% of secondary
      console.log(`🔄 Two-way player ${playerName} - Pitcher: ${pitcherWAR}, Hitter: ${hitterWAR}, Combined: ${war}`);
    }
    
    // Calculate CVR
    const cvr = calculatePlayerCVR(seasonStats, war);
    
    // Add advanced metrics to season stats
    seasonStats.war = Math.round(war * 10) / 10; // Round to 1 decimal
    seasonStats.cvr = cvr;
    
    // Add performance grades
    seasonStats.performance = {
      warGrade: war >= 6 ? 'Elite' : war >= 4 ? 'Star' : war >= 2.5 ? 'Very Good' : war >= 1.5 ? 'Above Average' : war >= 0.5 ? 'Average' : war >= 0 ? 'Below Average' : 'Poor',
      cvrGrade: cvr >= 1.8 ? 'Elite Value' : cvr >= 1.5 ? 'Excellent Value' : cvr >= 1.2 ? 'Good Value' : cvr >= 0.8 ? 'Fair Value' : cvr >= 0.5 ? 'Below Average' : 'Poor Value',
      estimatedSalary: estimatePlayerSalary(seasonStats, war)
    };
    
    console.log(`📊 ${playerName} - WAR: ${war.toFixed(1)}, CVR: ${cvr ? cvr.toFixed(2) : 'N/A'}, Type: ${playerType}`);
    
    seasonStats.playerType = playerType;
    
    // Only store players who have meaningful stats (not null classification)
    if (playerType === null) {
      console.log(`⚠️  Skipping player ${playerName} - no meaningful batting or pitching stats`);
      return; // Don't store players with no meaningful stats
    }
    
    seasonStats.playerType = playerType;
    
    // Update timestamp
    seasonStats.lastUpdated = new Date().toISOString();
    
    // Store updated season stats with retry logic
    await executeRedisOperation(() => redisClient.set(playerSeasonKey, JSON.stringify(seasonStats)));
    
  } catch (error) {
    console.error(`❌ Error updating player season stats for ${playerSeasonKey}:`, error.message);
  }
}

/**
 * Update or create season statistics for a team incrementally
 */
async function updateTeamSeasonStats(teamSeasonKey, gameStats, team) {
  try {
    // Extract year from teamSeasonKey (format: team:TEAM:YEAR:season)
    const teamSeasonParts = teamSeasonKey.split(':');
    const year = teamSeasonParts[2]; // Extract year from key
    
    // Get existing season stats or create new ones
    const existingData = await redisClient.get(teamSeasonKey);
    let seasonStats;
    
    if (existingData) {
      seasonStats = JSON.parse(existingData);
    } else {
      // Initialize new team season stats with proper nested structure
      seasonStats = {
        gameCount: 0,
        record: { wins: 0, losses: 0 },
        batting: {
          runs: 0,
          hits: 0,
          homeRuns: 0,
          rbi: 0,
          atBats: 0,
          baseOnBalls: 0,
          strikeOuts: 0,
          totalBases: 0,
          plateAppearances: 0,
          doubles: 0,
          triples: 0
        },
        pitching: {
          earnedRuns: 0,
          wins: 0,
          losses: 0,
          saves: 0,
          inningsPitched: "0.0",
          hits: 0,
          baseOnBalls: 0,
          strikeOuts: 0,
          homeRuns: 0
        },
        fielding: {
          errors: 0,
          assists: 0,
          putOuts: 0,
          chances: 0,
          doublePlays: 0
        },
        name: `Team ${team}`,
        league: 'Unknown',
        division: 'Unknown',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Extract stats from nested structure
    const batting = gameStats.batting || {};
    const pitching = gameStats.pitching || {};
    const fielding = gameStats.fielding || {};
    
    // Add this game's stats to season totals
    seasonStats.gameCount += 1;
    
    // Batting stats (from gameStats.batting)
    seasonStats.batting.runs += batting.runs || 0;
    seasonStats.batting.hits += batting.hits || 0;
    seasonStats.batting.homeRuns += batting.homeRuns || 0;
    seasonStats.batting.rbi += batting.rbi || 0;
    seasonStats.batting.atBats += batting.atBats || 0;
    seasonStats.batting.baseOnBalls += batting.baseOnBalls || 0;
    seasonStats.batting.strikeOuts += batting.strikeOuts || 0;
    seasonStats.batting.totalBases += batting.totalBases || 0;
    seasonStats.batting.plateAppearances += batting.plateAppearances || 0;
    seasonStats.batting.doubles += batting.doubles || 0;
    seasonStats.batting.triples += batting.triples || 0;
    
    // Pitching stats (from gameStats.pitching)
    seasonStats.pitching.earnedRuns += pitching.earnedRuns || 0;
    seasonStats.pitching.hits += pitching.hits || 0;
    seasonStats.pitching.baseOnBalls += pitching.baseOnBalls || 0;
    seasonStats.pitching.strikeOuts += pitching.strikeOuts || 0;
    seasonStats.pitching.homeRuns += pitching.homeRuns || 0;
    seasonStats.pitching.saves += pitching.saves || 0;
    
    // Handle innings pitched aggregation
    if (pitching.inningsPitched && pitching.inningsPitched !== "0.0") {
      const currentIP = parseInningsPitched(pitching.inningsPitched);
      const existingIP = parseInningsPitched(seasonStats.pitching.inningsPitched);
      seasonStats.pitching.inningsPitched = aggregateInningsPitched([seasonStats.pitching.inningsPitched, pitching.inningsPitched]);
    }
    
    // Fielding stats (from gameStats.fielding)
    seasonStats.fielding.errors += fielding.errors || 0;
    seasonStats.fielding.assists += fielding.assists || 0;
    seasonStats.fielding.putOuts += fielding.putOuts || 0;
    seasonStats.fielding.chances += fielding.chances || 0;
    seasonStats.fielding.doublePlays += fielding.doublePlays || 0;
    
    // Update wins/losses based on game result
    if (gameStats.gameInfo?.result === 'W') {
      seasonStats.record.wins += 1;
      seasonStats.pitching.wins += 1;
    } else if (gameStats.gameInfo?.result === 'L') {
      seasonStats.record.losses += 1;
      seasonStats.pitching.losses += 1;
    }
    
    // Calculate rate stats using professional formulas
    seasonStats.batting = calculateBattingStats(seasonStats.batting);
    seasonStats.pitching = calculatePitchingStats(seasonStats.pitching);
    seasonStats.fielding = calculateFieldingStats(seasonStats.fielding);
    
    // Calculate team-level WAR and CVR by summing individual player values (CORRECT APPROACH)
    let teamTotalWAR = 0;
    let teamBattingWAR = 0;
    let teamPitchingWAR = 0;
    
    // Get all players for this team to sum their individual WARs and CVRs
    const teamPlayerKeys = await redisClient.keys(`player:${team}-*-${year}:season`);
    let totalTeamCVR = 0;
    let totalBattingCVR = 0;
    let totalPitchingCVR = 0;
    let playerCount = 0;
    
    // Sum individual player CVRs and WARs
    for (const playerKey of teamPlayerKeys) {
      try {
        const playerData = await redisClient.get(playerKey);
        if (playerData) {
          const playerStats = JSON.parse(playerData);
          const playerCVR = playerStats.cvr || 0;
          const playerWAR = playerStats.war || 0;
          
          if (playerCVR !== 0 || playerWAR !== 0) {
            totalTeamCVR += playerCVR;
            teamTotalWAR += playerWAR;
            playerCount++;
            
            // Determine if this is primarily a batter or pitcher based on their stats
            const hasBattingStats = playerStats.batting && (playerStats.batting.atBats > 0 || playerStats.batting.hits > 0);
            const hasPitchingStats = playerStats.pitching && playerStats.pitching.inningsPitched && parseFloat(playerStats.pitching.inningsPitched) > 0;
            
            // Assign CVR and WAR to batting or pitching based on primary role
            if (hasBattingStats && hasPitchingStats) {
              // Two-way player: split CVR and WAR proportionally based on games/usage
              const battingGames = playerStats.batting?.gamesPlayed || 0;
              const pitchingAppearances = playerStats.pitching?.appearances || 0;
              const totalAppearances = battingGames + pitchingAppearances;
              
              if (totalAppearances > 0) {
                const battingPortion = battingGames / totalAppearances;
                const pitchingPortion = pitchingAppearances / totalAppearances;
                totalBattingCVR += playerCVR * battingPortion;
                totalPitchingCVR += playerCVR * pitchingPortion;
                teamBattingWAR += playerWAR * battingPortion;
                teamPitchingWAR += playerWAR * pitchingPortion;
              } else {
                // Default split for two-way players
                totalBattingCVR += playerCVR * 0.6;
                totalPitchingCVR += playerCVR * 0.4;
                teamBattingWAR += playerWAR * 0.6;
                teamPitchingWAR += playerWAR * 0.4;
              }
            } else if (hasBattingStats) {
              // Primarily a batter
              totalBattingCVR += playerCVR;
              teamBattingWAR += playerWAR;
            } else if (hasPitchingStats) {
              // Primarily a pitcher
              totalPitchingCVR += playerCVR;
              teamPitchingWAR += playerWAR;
            } else {
              // Default to batting if unclear
              totalBattingCVR += playerCVR;
              teamBattingWAR += playerWAR;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error reading player CVR from ${playerKey}:`, error.message);
      }
    }
    
    // Round the totals
    totalTeamCVR = Math.round(totalTeamCVR * 100) / 100;
    totalBattingCVR = Math.round(totalBattingCVR * 100) / 100;
    totalPitchingCVR = Math.round(totalPitchingCVR * 100) / 100;
    
    // Add advanced team metrics
    seasonStats.war = {
      total: Math.round(teamTotalWAR * 10) / 10,
      batting: Math.round(teamBattingWAR * 10) / 10,
      pitching: Math.round(teamPitchingWAR * 10) / 10
    };
    
    // Store CVR as sum of individual player CVRs
    seasonStats.cvr = totalTeamCVR; // Total sum of all player CVRs
    seasonStats.cvrDetails = {
      total: totalTeamCVR,
      batting: totalBattingCVR,
      pitching: totalPitchingCVR
    };
    
    // Add team performance grades
    seasonStats.performance = {
      warGrade: teamTotalWAR >= 30 ? 'Elite' : teamTotalWAR >= 20 ? 'Very Good' : teamTotalWAR >= 10 ? 'Above Average' : teamTotalWAR >= 0 ? 'Average' : 'Poor',
      cvrGrade: totalTeamCVR >= 15 ? 'Elite Value' : totalTeamCVR >= 10 ? 'Excellent Value' : totalTeamCVR >= 5 ? 'Good Value' : totalTeamCVR >= 0 ? 'Fair Value' : 'Poor Value',
      projectedWins: Math.round(81 + (teamTotalWAR - 18) * 2), // Rough WAR-to-wins conversion
      playerCount // Number of players contributing to CVR
    };
    
    console.log(`🏟️  ${team} - Team WAR: ${teamTotalWAR.toFixed(1)} (Batting: ${teamBattingWAR.toFixed(1)}, Pitching: ${teamPitchingWAR.toFixed(1)}), CVR: ${totalTeamCVR.toFixed(2)} (${playerCount} players, Batting: ${totalBattingCVR.toFixed(2)}, Pitching: ${totalPitchingCVR.toFixed(2)})`);
    
    // Update timestamp
    seasonStats.lastUpdated = new Date().toISOString();
    
    // Store updated season stats with retry logic
    await executeRedisOperation(() => redisClient.set(teamSeasonKey, JSON.stringify(seasonStats)));
    
  } catch (error) {
    console.error(`❌ Error updating team season stats for ${teamSeasonKey}:`, error.message);
  }
}

/**
 * Aggregate season statistics for all players and teams
 */
async function aggregateSeasonStats(season) {
  console.log(`📊 Aggregating season statistics for ${season}...`);

  try {
    // Get all player game keys
    const playerGameKeys = await redisClient.keys(`player:*-${season}:????-??-??`);
    const teamGameKeys = await redisClient.keys(`team:*:${season}:????-??-??`);

    console.log(`📈 Found ${playerGameKeys.length} player games and ${teamGameKeys.length} team games`);

    // Group by player
    const playerGames = {};
    for (const key of playerGameKeys) {
      const parts = key.split(':');
      const playerKey = parts[1]; // team-name-year
      const date = parts[2];
      
      if (!playerGames[playerKey]) {
        playerGames[playerKey] = [];
      }
      
      try {
        const gameData = await redisClient.get(key);
        if (gameData) {
          playerGames[playerKey].push(JSON.parse(gameData));
        }
      } catch (error) {
        console.error(`❌ Error reading player game ${key}:`, error.message);
      }
    }

    // Aggregate player season stats
    const pipeline = redisClient.pipeline();
    
    for (const [playerKey, games] of Object.entries(playerGames)) {
      // Aggregate counting stats
      const battingTotals = aggregateCountingStats(games, 'batting');
      const pitchingTotals = aggregateCountingStats(games, 'pitching');
      const fieldingTotals = aggregateCountingStats(games, 'fielding');

      // Calculate season rate stats
      const seasonStats = {
        batting: Object.keys(battingTotals).length > 0 ? calculateBattingStats(battingTotals) : {},
        pitching: Object.keys(pitchingTotals).length > 0 ? calculatePitchingStats(pitchingTotals) : {},
        fielding: Object.keys(fieldingTotals).length > 0 ? calculateFieldingStats(fieldingTotals) : {},
        gameCount: games.length,
        lastUpdated: new Date().toISOString()
      };

      // Store season stats with correct key format expected by API routes
      const playerSeasonKey = `player:${playerKey}:season`;  // Format: player:TEAM-PlayerName-YEAR:season
      pipeline.set(playerSeasonKey, JSON.stringify(seasonStats));
    }

    // Group team games and aggregate
    const teamGames = {};
    for (const key of teamGameKeys) {
      const parts = key.split(':');
      const teamKey = `${parts[1]}:${parts[2]}`; // team:year
      
      if (!teamGames[teamKey]) {
        teamGames[teamKey] = [];
      }
      
      try {
        const gameData = await redisClient.get(key);
        if (gameData) {
          teamGames[teamKey].push(JSON.parse(gameData));
        }
      } catch (error) {
        console.error(`❌ Error reading team game ${key}:`, error.message);
      }
    }

    // Aggregate team season stats
    for (const [teamKey, games] of Object.entries(teamGames)) {
      const battingTotals = aggregateCountingStats(games, 'batting');
      const pitchingTotals = aggregateCountingStats(games, 'pitching');
      const fieldingTotals = aggregateCountingStats(games, 'fielding');

      // Calculate wins/losses from game results
      const wins = games.filter(game => game.gameInfo.result === 'W').length;
      const losses = games.filter(game => game.gameInfo.result === 'L').length;
      
      // Extract team code from teamKey (format: "TEAMCODE:YEAR")
      const [teamCode, year] = teamKey.split(':');

      const teamSeasonStats = {
        ...calculateBattingStats(battingTotals),
        ...calculatePitchingStats(pitchingTotals),
        ...calculateFieldingStats(fieldingTotals),
        wins,
        losses,
        games: games.length,
        winPct: games.length > 0 ? wins / games.length : 0,
        runsScored: battingTotals.runs || 0,
        runsAllowed: pitchingTotals.runs || 0,
        runDiff: (battingTotals.runs || 0) - (pitchingTotals.runs || 0),
        homeWins: games.filter(g => g.gameInfo.homeAway === 'home' && g.gameInfo.result === 'W').length,
        homeLosses: games.filter(g => g.gameInfo.homeAway === 'home' && g.gameInfo.result === 'L').length,
        awayWins: games.filter(g => g.gameInfo.homeAway === 'away' && g.gameInfo.result === 'W').length,
        awayLosses: games.filter(g => g.gameInfo.homeAway === 'away' && g.gameInfo.result === 'L').length,
        last10Wins: games.slice(-10).filter(g => g.gameInfo.result === 'W').length,
        last10Losses: games.slice(-10).filter(g => g.gameInfo.result === 'L').length,
        gameCount: games.length,
        lastUpdated: new Date().toISOString()
      };
      
      // Calculate team WAR and CVR by summing individual player values
      try {
        const playerKeys = await redisClient.keys(`player:${teamCode}-*-${year}:season`);
        let teamTotalWAR = 0;
        let teamTotalCVR = 0;
        let playerCount = 0;
        let battingWAR = 0;
        let pitchingWAR = 0;
        
        for (const playerKey of playerKeys) {
          try {
            const playerData = await redisClient.get(playerKey);
            if (playerData) {
              const player = JSON.parse(playerData);
              if (player.war && typeof player.war === 'number') {
                teamTotalWAR += player.war;
                playerCount++;
                
                // Classify player contribution by position/role
                if (player.batting && player.batting.atBats > 0) {
                  battingWAR += player.war;
                } else if (player.pitching && player.pitching.inningsPitched > 0) {
                  pitchingWAR += player.war;
                }
              }
              if (player.cvr && typeof player.cvr === 'number') {
                teamTotalCVR += player.cvr;
              }
            }
          } catch (playerError) {
            console.log(`⚠️ Error reading player data ${playerKey}:`, playerError.message);
          }
        }
        
        // Use total sum of CVRs for the team (not average)
        const totalTeamCVR = teamTotalCVR; // This is already the sum
        
        // Add aggregated team metrics (only if they don't already exist from updateTeamSeasonStats)
        if (!teamSeasonStats.war) {
          teamSeasonStats.war = {
            total: Math.round(teamTotalWAR * 10) / 10,
            batting: Math.round(battingWAR * 10) / 10,
            pitching: Math.round(pitchingWAR * 10) / 10
          };
          console.log(`📊 Team ${teamCode}: WAR=${teamTotalWAR.toFixed(1)} (${playerCount} players), CVR=${totalTeamCVR.toFixed(2)} (sum of individual player CVRs)`);
        } else {
          console.log(`📊 Team ${teamCode}: Using existing WAR=${teamSeasonStats.war.total} (from incremental updates), CVR=${totalTeamCVR.toFixed(2)} (${playerCount} players)`);
        }
        
        if (!teamSeasonStats.cvr) {
          teamSeasonStats.cvr = Math.round(totalTeamCVR * 100) / 100;
        }
      } catch (aggregationError) {
        console.log(`⚠️ Error aggregating team stats for ${teamCode}:`, aggregationError.message);
        // Fallback to old calculation method with dynamic baselines
        const teamBattingWAR = await calculateHitterWAR({ batting: teamSeasonStats.batting }, season);
        const teamPitchingWAR = await calculatePitcherWAR({ pitching: teamSeasonStats.pitching }, season);
        const teamTotalWAR = teamBattingWAR + teamPitchingWAR;
        
        teamSeasonStats.war = {
          total: Math.round(teamTotalWAR * 10) / 10,
          batting: Math.round(teamBattingWAR * 10) / 10,
          pitching: Math.round(teamPitchingWAR * 10) / 10
        };
        
        const estimatedPayroll = 150000000;
        teamSeasonStats.cvr = calculateTeamCVR(teamSeasonStats, teamTotalWAR, estimatedPayroll);
      }

      // Store with correct key format expected by API routes
      const teamSeasonKey = `team:${teamKey}:season`;  // Format: team:TEAMCODE:YEAR:season
      pipeline.set(teamSeasonKey, JSON.stringify(teamSeasonStats));
    }

    await pipeline.exec();
    console.log(`✅ Aggregated stats for ${Object.keys(playerGames).length} players and ${Object.keys(teamGames).length} teams`);
    
  } catch (error) {
    console.error('❌ Error in aggregation:', error.message);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main function to pull boxscores and aggregate statistics
 */
async function pullBoxscoresToRedis(season, startDate, endDate) {
  // Initialize fetch
  if (!fetch) {
    fetch = (await import('node-fetch')).default;
  }
  
  // Ensure Redis connection is healthy before starting
  const redisHealthy = await ensureRedisConnection();
  if (!redisHealthy) {
    throw new Error('Redis connection failed - cannot proceed with data processing');
  }
  
  const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
  
  console.log(`🔍 Fetching games for ${season} season from ${startDate} to ${endDate}...`);
  
  try {
    // Fetch schedule with gameType filter for regular season games only
    const scheduleUrl = `${MLB_API_BASE}/schedule?sportId=1&gameType=R&season=${season}&hydrate=team,game(content(editorial(recap)))&startDate=${startDate}&endDate=${endDate}`;
    const scheduleResp = await fetch(scheduleUrl);
    const scheduleData = await scheduleResp.json();
    
    const allGames = [];
    for (const dateObj of scheduleData.dates || []) {
      allGames.push(...(dateObj.games || []));
    }
    
    // Filter completed regular season games only (exclude spring training, exhibitions, all-star)
    const completedGames = allGames.filter(game => {
      const isCompleted = game.status?.abstractGameState === 'Final' || game.status?.codedGameState === 'F';
      const isRegularSeason = game.gameType === 'R';
      // Note: sportId might be undefined, but since we're already filtering by sportId=1 in the API call, we can skip this check
      
      // Debug logging for first few games
      if (allGames.indexOf(game) < 5) {
        console.log(`🔍 Game ${game.gamePk}: Status=${game.status?.abstractGameState}/${game.status?.codedGameState}, Type=${game.gameType}, Sport=${game.sportId}`);
      }
      
      return isCompleted && isRegularSeason; // Removed sportId check since API already filters
    });
    
    console.log(`📊 Found ${allGames.length} total games, ${completedGames.length} completed regular season games to process`);
    
    // Debug: Show breakdown of game statuses and types
    const statusBreakdown = {};
    const typeBreakdown = {};
    allGames.forEach(game => {
      const status = game.status?.abstractGameState || 'Unknown';
      const type = game.gameType || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });
    
    console.log(`🔍 Game status breakdown:`, statusBreakdown);
    console.log(`🔍 Game type breakdown:`, typeBreakdown);
    
    // Process games using enhanced parallel processing
    const processedResults = await processGamesInParallel(completedGames, 8);
    
    console.log(`\n✅ Successfully processed ${processedResults.length} games with enhanced parallel processing and dynamic WAR baselines`);
    console.log(`\n🎉 Complete! Processed ${processedResults.length} games with professional-grade statistics (season stats updated incrementally)`);
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    throw error;
  } finally {
    if (redisClient) {
      redisClient.disconnect();
    }
  }
}

// Run the script with proper MLB season date range
if (require.main === module) {
  const season = process.argv[2] || '2025';
  // Full MLB season: Opening Day (late March) through current date (or full season)
  const startDate = process.argv[3] || '2025-08-14';  // Opening Day 2025
  const endDate = process.argv[4] || '2025-08-14';    // Current date (adjust to completed games)
  
  console.log(`🏁 Starting MLB data pull for ${season} season`);
  console.log(`📅 Date range: ${startDate} to ${endDate}`);
  console.log(`🔧 This will pull the ENTIRE MLB regular season data (excluding spring training)...`);
  
  pullBoxscoresToRedis(season, startDate, endDate)
    .then(() => {
      console.log('\n� Successfully completed data processing!');
      console.log('📊 Enhanced WAR calculations with dynamic baselines are now available');
      
      // Graceful Redis shutdown
      redisClient.disconnect();
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error in main process:', error);
      
      // Graceful Redis shutdown on error
      redisClient.disconnect();
      process.exit(1);
    });
}

// Add graceful shutdown handlers for connection cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  redisClient.disconnect();
  process.exit(0);
});

module.exports = { pullBoxscoresToRedis };
