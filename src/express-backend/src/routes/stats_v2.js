const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

/**
 * Normalize player name to handle special characters (ñ, é, etc.)
 * This ensures consistent key generation across scraping and API lookups
 */
function normalizePlayerName(name) {
  if (!name) return name;
  
  return name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove other special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// ============================================================================
// ENHANCED STATISTICS API ROUTES
// Professional-grade baseball statistics with comprehensive data coverage
// ============================================================================

// GET /api/stats/summary - Enhanced database summary with detailed metrics
router.get('/summary', async (req, res) => {
  try {
    const { year = '2025' } = req.query;
    
    const [
      playerSeasonKeys,
      teamSeasonKeys,
      playerGameKeys,
      teamGameKeys
    ] = await Promise.all([
      getKeysByPattern(`player:*-${year}:season`),
      getKeysByPattern(`team:*:${year}:season`),
      getKeysByPattern(`player:*-${year}:????-??-??`),
      getKeysByPattern(`team:*:${year}:????-??-??`)
    ]);
    
    // Calculate unique dates and actual games
    const uniqueDates = new Set();
    const uniqueGameIds = new Set();
    
    playerGameKeys.forEach(key => {
      const date = key.split(':').pop();
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        uniqueDates.add(date);
      }
    });
    
    // Calculate actual games by counting team games (each MLB game has 2 teams)
    const actualGames = Math.round(teamGameKeys.length / 2);
    
    res.json({
      year,
      summary: {
        totalPlayers: playerSeasonKeys.length,
        totalTeams: teamSeasonKeys.length,
        totalPlayerGames: playerGameKeys.length,
        totalTeamGames: teamGameKeys.length,
        totalGameDates: uniqueDates.size,
        totalGames: actualGames,
        averagePlayersPerGame: actualGames > 0 ? Math.round(playerGameKeys.length / actualGames) : 0,
        averageGamesPerDay: uniqueDates.size > 0 ? Math.round(actualGames / uniqueDates.size) : 0
      },
      dataStructure: {
        playerSeasonStats: playerSeasonKeys.length,
        teamSeasonStats: teamSeasonKeys.length,
        gameByGameStats: playerGameKeys.length + teamGameKeys.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching stats summary:', err);
    res.status(500).json({ error: 'Failed to fetch stats summary' });
  }
});

// GET /api/stats/leaders - Enhanced statistical leaders with advanced metrics
router.get('/leaders', async (req, res) => {
  try {
    const { 
      category = 'batting', 
      stat = 'avg', 
      team, 
      year = '2025', 
      limit = 10,
      minGames = 10,
      minAtBats = 50,
      minInnings = 10
    } = req.query;
    
    let pattern;
    if (team) {
      pattern = `player:${team.toUpperCase()}-*-${year}:season`;
    } else {
      pattern = `player:*-${year}:season`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const players = await getMultipleKeys(keys);
    
    // Filter players based on minimums and stat availability
    let validPlayers = players.filter(player => {
      // Check if player has the required stat
      let statValue;
      
      if (stat === 'cvr' || stat === 'war') {
        // CVR and WAR are stored at the root level of season stats
        statValue = player.data[stat];
      } else {
        // Traditional stats are in category subobjects
        const stats = player.data[category];
        if (!stats) return false;
        statValue = stats[stat];
      }
      
      if (statValue === undefined || statValue === null) return false;
      
      // Apply minimum thresholds based on category
      if (category === 'batting') {
        return player.data.gameCount >= minGames && 
               (player.data.batting?.atBats || 0) >= minAtBats;
      } else if (category === 'pitching') {
        const ip = parseFloat(player.data.pitching?.inningsPitched) || 0;
        return player.data.gameCount >= minGames && ip >= minInnings;
      } else if (category === 'fielding') {
        return player.data.gameCount >= minGames && 
               (player.data.fielding?.chances || 0) >= 10;
      }
      
      return player.data.gameCount >= minGames;
    });
    
    // Sort by stat (handle special cases)
    const ascendingStats = ['era', 'whip', 'fip'];
    const isAscending = ascendingStats.includes(stat);
    
    validPlayers.sort((a, b) => {
      let aValue, bValue;
      
      if (stat === 'cvr' || stat === 'war') {
        // CVR and WAR are stored at root level
        aValue = parseFloat(a.data[stat]) || 0;
        bValue = parseFloat(b.data[stat]) || 0;
      } else {
        // Traditional stats are in category subobjects
        aValue = parseFloat(a.data[category][stat]) || 0;
        bValue = parseFloat(b.data[category][stat]) || 0;
      }
      
      return isAscending ? aValue - bValue : bValue - aValue;
    });
    
    const leaders = validPlayers.slice(0, parseInt(limit)).map((player, index) => {
      const keyParts = player.key.split(':');
      const playerInfo = keyParts[1].split('-');
      const team = playerInfo[0];
      const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      
      // Get the stat value - handle CVR/WAR vs traditional stats
      let statValue;
      if (stat === 'cvr' || stat === 'war') {
        statValue = player.data[stat];
      } else {
        statValue = player.data[category][stat];
      }
      
      return {
        rank: index + 1,
        player: {
          name,
          team,
          year: playerInfo[playerInfo.length - 1]
        },
        value: statValue,
        games: player.data.gameCount,
        qualifyingStats: getQualifyingStats(player.data[category] || {}, category),
        fullStats: player.data[category] || {},
        cvr: player.data.cvr || 0,  // Always include CVR
        war: player.data.war || 0   // Always include WAR
      };
    });
    
    res.json({
      category,
      stat,
      leaders,
      count: leaders.length,
      filters: { 
        team, 
        year, 
        minGames, 
        minAtBats: category === 'batting' ? minAtBats : undefined,
        minInnings: category === 'pitching' ? minInnings : undefined 
      },
      availableStats: getAvailableStats(category)
    });
  } catch (err) {
    console.error('Error fetching leaders:', err);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
});

// GET /api/stats/advanced/:playerId - Advanced player analytics
router.get('/advanced/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { year = '2025' } = req.query;
    
    // Get season stats
    const seasonKey = `player:${playerId}-${year}:season`;
    const seasonData = await getRedisClient().get(seasonKey);
    const seasonStats = parseRedisData(seasonData);
    
    if (!seasonStats) {
      return res.status(404).json({ error: 'Player season data not found' });
    }
    
    // Get game-by-game data for trends
    const gameKeys = await getKeysByPattern(`player:${playerId}-${year}:????-??-??`);
    const gameData = await getMultipleKeys(gameKeys);
    
    // Calculate advanced metrics
    const advancedAnalytics = calculateAdvancedAnalytics(seasonStats, gameData);
    
    res.json({
      playerId,
      year,
      seasonStats,
      gameCount: seasonStats.gameCount,
      advancedAnalytics,
      trends: calculateTrends(gameData),
      lastUpdated: seasonStats.lastUpdated
    });
  } catch (err) {
    console.error('Error fetching advanced stats:', err);
    res.status(500).json({ error: 'Failed to fetch advanced stats' });
  }
});

// GET /api/stats/splits/:playerId - Situational splits analysis
router.get('/splits/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { year = '2025', splitType = 'all' } = req.query;
    
    // Get all games for the player
    const gameKeys = await getKeysByPattern(`player:${playerId}-${year}:????-??-??`);
    const gameData = await getMultipleKeys(gameKeys);
    
    if (gameData.length === 0) {
      return res.status(404).json({ error: 'No game data found for player' });
    }
    
    // Calculate splits
    const splits = calculateSplits(gameData, splitType);
    
    res.json({
      playerId,
      year,
      splitType,
      splits,
      gameCount: gameData.length
    });
  } catch (err) {
    console.error('Error fetching splits:', err);
    res.status(500).json({ error: 'Failed to fetch splits' });
  }
});

// POST /api/stats/compare/advanced - Advanced player comparison
router.post('/compare/advanced', async (req, res) => {
  try {
    const { players, year = '2025', categories = ['batting', 'pitching'] } = req.body;
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ error: 'Must provide at least 2 players to compare' });
    }
    
    const comparisons = [];
    
    for (const playerId of players) {
      const seasonKey = `player:${playerId}-${year}:season`;
      const seasonData = await getRedisClient().get(seasonKey);
      const seasonStats = parseRedisData(seasonData);
      
      if (seasonStats) {
        // Get game data for advanced calculations
        const gameKeys = await getKeysByPattern(`player:${playerId}-${year}:????-??-??`);
        const gameData = await getMultipleKeys(gameKeys);
        
        comparisons.push({
          playerId,
          seasonStats,
          advancedMetrics: calculateAdvancedAnalytics(seasonStats, gameData),
          gameCount: seasonStats.gameCount,
          consistency: calculateConsistency(gameData)
        });
      }
    }
    
    // Add comparison analytics
    const comparisonAnalytics = generateComparisonAnalytics(comparisons, categories);
    
    res.json({
      year,
      categories,
      comparisons,
      analytics: comparisonAnalytics,
      playerCount: comparisons.length
    });
  } catch (err) {
    console.error('Error in advanced comparison:', err);
    res.status(500).json({ error: 'Failed to perform advanced comparison' });
  }
});

// GET /api/stats/team/:teamId/advanced - Advanced team analytics
router.get('/team/:teamId/advanced', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { year = '2025' } = req.query;
    
    // Get team season stats
    const teamSeasonKey = `team:${teamId.toUpperCase()}:${year}:season`;
    const teamSeasonData = await getRedisClient().get(teamSeasonKey);
    const teamStats = parseRedisData(teamSeasonData);
    
    if (!teamStats) {
      return res.status(404).json({ error: 'Team data not found' });
    }
    
    // Get all team players
    const playerKeys = await getKeysByPattern(`player:${teamId.toUpperCase()}-*-${year}:season`);
    const playerData = await getMultipleKeys(playerKeys);
    
    // Calculate team advanced metrics
    const teamAnalytics = {
      offense: calculateOffensiveMetrics(teamStats.batting),
      pitching: calculatePitchingMetrics(teamStats.pitching),
      fielding: calculateFieldingMetrics(teamStats.fielding),
      roster: analyzeRoster(playerData),
      balance: calculateTeamBalance(playerData)
    };
    
    res.json({
      teamId: teamId.toUpperCase(),
      year,
      seasonStats: teamStats,
      analytics: teamAnalytics,
      playerCount: playerData.length,
      lastUpdated: teamStats.lastUpdated
    });
  } catch (err) {
    console.error('Error fetching team advanced stats:', err);
    res.status(500).json({ error: 'Failed to fetch team advanced stats' });
  }
});

// ============================================================================
// HELPER FUNCTIONS FOR ADVANCED ANALYTICS
// ============================================================================

function getQualifyingStats(stats, category) {
  if (category === 'batting') {
    return {
      atBats: stats.atBats || 0,
      plateAppearances: stats.plateAppearances || 0
    };
  } else if (category === 'pitching') {
    return {
      inningsPitched: stats.inningsPitched || '0.0',
      battersFaced: stats.battersFaced || 0
    };
  } else if (category === 'fielding') {
    return {
      chances: stats.chances || 0,
      games: stats.gamesStarted || 0
    };
  }
  return {};
}

function getAvailableStats(category) {
  const stats = {
    batting: [
      'avg', 'obp', 'slg', 'ops', 'iso', 'babip', 'kRate', 'bbRate',
      'hits', 'homeRuns', 'rbi', 'runs', 'stolenBases', 'atBats',
      'cvr', 'war'  // Added CVR and WAR for batting
    ],
    pitching: [
      'era', 'whip', 'fip', 'strikeoutsPer9Inn', 'walksPer9Inn', 'hitsPer9Inn',
      'strikeOuts', 'wins', 'saves', 'inningsPitched', 'strikeoutWalkRatio',
      'cvr', 'war'  // Added CVR and WAR for pitching
    ],
    fielding: [
      'fieldingPercentage', 'assists', 'putOuts', 'errors', 'chances'
    ]
  };
  
  return stats[category] || [];
}

function calculateAdvancedAnalytics(seasonStats, gameData) {
  const analytics = {};
  
  // Batting advanced metrics
  if (seasonStats.batting && Object.keys(seasonStats.batting).length > 0) {
    const batting = seasonStats.batting;
    analytics.batting = {
      woba: calculateWOBA(batting),
      wrcPlus: calculateWRCPlus(batting),
      powerSpeed: calculatePowerSpeed(batting),
      clutchFactor: calculateClutchFactor(gameData, 'batting')
    };
  }
  
  // Pitching advanced metrics
  if (seasonStats.pitching && Object.keys(seasonStats.pitching).length > 0) {
    const pitching = seasonStats.pitching;
    analytics.pitching = {
      gameScore: calculateAverageGameScore(gameData),
      qualityStarts: calculateQualityStarts(gameData),
      leverage: calculateLeverageIndex(gameData)
    };
  }
  
  return analytics;
}

function calculateWOBA(batting) {
  // Simplified wOBA calculation (weights vary by year)
  const { hits = 0, doubles = 0, triples = 0, homeRuns = 0, baseOnBalls = 0, hitByPitch = 0, atBats = 0, sacFlies = 0 } = batting;
  const singles = hits - doubles - triples - homeRuns;
  const denominator = atBats + baseOnBalls + hitByPitch + sacFlies;
  
  if (denominator === 0) return 0;
  
  // 2025 estimated weights
  const woba = (0.69 * (baseOnBalls + hitByPitch) + 0.89 * singles + 1.27 * doubles + 1.62 * triples + 2.10 * homeRuns) / denominator;
  return Number(woba.toFixed(3));
}

function calculateWRCPlus(batting) {
  // Simplified wRC+ calculation (normally requires league context)
  const woba = calculateWOBA(batting);
  const leagueWOBA = 0.320; // Approximate league average
  const wrcPlus = ((woba - leagueWOBA) / 1.15) + 1.0;
  return Math.round(wrcPlus * 100);
}

function calculatePowerSpeed(batting) {
  const { homeRuns = 0, stolenBases = 0 } = batting;
  if (homeRuns === 0 && stolenBases === 0) return 0;
  return Number((2 * homeRuns * stolenBases) / (homeRuns + stolenBases)).toFixed(1);
}

function calculateTrends(gameData) {
  if (gameData.length < 5) return null;
  
  // Sort by date
  const sortedGames = gameData
    .filter(game => game.key.match(/\d{4}-\d{2}-\d{2}$/))
    .sort((a, b) => {
      const dateA = a.key.split(':').pop();
      const dateB = b.key.split(':').pop();
      return dateA.localeCompare(dateB);
    });
  
  const recentGames = sortedGames.slice(-10); // Last 10 games
  const trends = {};
  
  // Calculate batting trends
  if (recentGames.some(g => g.data.batting && Object.keys(g.data.batting).length > 0)) {
    const battingTrend = recentGames.map(g => g.data.batting.avg || 0);
    trends.batting = {
      avgTrend: calculateTrendDirection(battingTrend),
      hot: battingTrend.slice(-5).every(avg => avg > 0.250),
      slump: battingTrend.slice(-5).every(avg => avg < 0.200)
    };
  }
  
  return trends;
}

function calculateTrendDirection(values) {
  if (values.length < 3) return 'stable';
  
  const recent = values.slice(-3);
  const earlier = values.slice(-6, -3);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  const difference = recentAvg - earlierAvg;
  
  if (difference > 0.05) return 'improving';
  if (difference < -0.05) return 'declining';
  return 'stable';
}

function calculateSplits(gameData, splitType) {
  const splits = {};
  
  if (splitType === 'homeAway' || splitType === 'all') {
    splits.homeAway = {
      home: aggregateGames(gameData.filter(g => g.data.gameInfo?.homeAway === 'home')),
      away: aggregateGames(gameData.filter(g => g.data.gameInfo?.homeAway === 'away'))
    };
  }
  
  if (splitType === 'monthly' || splitType === 'all') {
    splits.monthly = {};
    const months = ['04', '05', '06', '07', '08', '09', '10'];
    months.forEach(month => {
      const monthGames = gameData.filter(g => {
        const date = g.key.split(':').pop();
        return date.includes(`-${month}-`);
      });
      if (monthGames.length > 0) {
        splits.monthly[month] = aggregateGames(monthGames);
      }
    });
  }
  
  return splits;
}

function aggregateGames(games) {
  if (games.length === 0) return null;
  
  const battingTotals = {};
  const pitchingTotals = {};
  
  games.forEach(game => {
    if (game.data.batting) {
      Object.entries(game.data.batting).forEach(([key, value]) => {
        if (typeof value === 'number') {
          battingTotals[key] = (battingTotals[key] || 0) + value;
        }
      });
    }
    
    if (game.data.pitching) {
      Object.entries(game.data.pitching).forEach(([key, value]) => {
        if (typeof value === 'number') {
          pitchingTotals[key] = (pitchingTotals[key] || 0) + value;
        }
      });
    }
  });
  
  return {
    batting: Object.keys(battingTotals).length > 0 ? calculateBattingStats(battingTotals) : {},
    pitching: Object.keys(pitchingTotals).length > 0 ? calculatePitchingStats(pitchingTotals) : {},
    gameCount: games.length
  };
}

// Import calculation functions from the main script
function calculateBattingStats(stats) {
  // This would be imported from the main script
  // For now, returning simplified version
  return stats;
}

function calculatePitchingStats(stats) {
  // This would be imported from the main script
  // For now, returning simplified version
  return stats;
}

function calculateClutchFactor(gameData, category) {
  // Simplified clutch calculation
  return Math.random() * 2; // Placeholder
}

function calculateAverageGameScore(gameData) {
  // Placeholder for game score calculation
  return 50 + Math.random() * 50;
}

function calculateQualityStarts(gameData) {
  // Count starts with 6+ IP and 3 or fewer ER
  return gameData.filter(g => {
    const ip = parseFloat(g.data.pitching?.inningsPitched || 0);
    const er = g.data.pitching?.earnedRuns || 0;
    return ip >= 6 && er <= 3;
  }).length;
}

function calculateLeverageIndex(gameData) {
  // Placeholder for leverage index
  return 1.0 + Math.random();
}

function calculateConsistency(gameData) {
  // Calculate statistical consistency across games
  if (gameData.length < 5) return null;
  
  const avgValues = gameData.map(g => g.data.batting?.avg || 0);
  const mean = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
  const variance = avgValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgValues.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean: Number(mean.toFixed(3)),
    standardDeviation: Number(stdDev.toFixed(3)),
    coefficientOfVariation: mean > 0 ? Number((stdDev / mean).toFixed(3)) : null
  };
}

function generateComparisonAnalytics(comparisons, categories) {
  // Generate insights from player comparisons
  return {
    bestInCategory: {},
    significantDifferences: [],
    recommendations: []
  };
}

function calculateOffensiveMetrics(batting) {
  return {
    runsPerGame: batting.runs / (batting.gamesPlayed || 1),
    teamOPS: batting.ops || 0,
    powerIndex: (batting.homeRuns + batting.doubles) / (batting.atBats || 1) * 1000
  };
}

function calculatePitchingMetrics(pitching) {
  return {
    qualityStartPercentage: 0.6, // Placeholder
    bullpenERA: pitching.era || 0,
    strikeoutRate: pitching.kRate || 0
  };
}

function calculateFieldingMetrics(fielding) {
  return {
    teamFieldingPercentage: fielding.fieldingPercentage || 0,
    defensiveEfficiency: 0.7, // Placeholder
    errorRate: fielding.errors / (fielding.chances || 1)
  };
}

function analyzeRoster(playerData) {
  return {
    totalPlayers: playerData.length,
    battingDepth: playerData.filter(p => p.data.batting?.atBats > 50).length,
    pitchingDepth: playerData.filter(p => p.data.pitching?.inningsPitched > 10).length
  };
}

function calculateTeamBalance(playerData) {
  return {
    offensiveBalance: 'balanced', // Placeholder
    pitchingDepth: 'strong', // Placeholder
    overallRating: 'A-' // Placeholder
  };
}

// ============================================================================
// SALARY DATA API ROUTES
// ============================================================================

// GET /api/v2/stats/salary/:team/:player/:year - Get salary data for a specific player
router.get('/salary/:team/:player/:year', async (req, res) => {
  try {
    const { team, player, year } = req.params;
    
    // Try both original player name and normalized version for better matching
    const originalPlayerKey = player.replace(/\s+/g, '_');
    const normalizedPlayerKey = normalizePlayerName(player).replace(/\s+/g, '_');
    
    const possibleKeys = [
      `salary:${team}-${originalPlayerKey}-${year}`,
      `salary:${team}-${normalizedPlayerKey}-${year}`
    ];
    
    console.log(`🔍 Looking for salary data with keys:`, possibleKeys);
    
    const redisClient = getRedisClient();
    let salaryData = null;
    let usedKey = null;
    
    // Try each possible key until we find data
    for (const key of possibleKeys) {
      salaryData = await redisClient.get(key);
      if (salaryData) {
        usedKey = key;
        console.log(`✅ Found salary data with key: ${key}`);
        break;
      }
    }
    
    if (!salaryData) {
      // Also try a pattern search as last resort
      console.log(`🔍 Trying pattern search for player: ${player}`);
      const searchPattern = `salary:${team}-*${normalizedPlayerKey.split('_')[0]}*-${year}`;
      const matchingKeys = await getKeysByPattern(searchPattern);
      
      if (matchingKeys.length > 0) {
        usedKey = matchingKeys[0];
        salaryData = await redisClient.get(usedKey);
        console.log(`✅ Found salary data via pattern search: ${usedKey}`);
      }
    }
    
    if (!salaryData) {
      console.log(`❌ No salary data found for ${player} on ${team}`);
      return res.status(404).json({
        success: false,
        error: 'Salary data not found',
        searchedKeys: possibleKeys,
        player: player,
        normalizedPlayer: normalizePlayerName(player)
      });
    }
    
    const parsedData = parseRedisData(salaryData);
    
    res.json({
      success: true,
      data: parsedData,
      metadata: {
        key: usedKey,
        lastUpdated: parsedData.scrapedAt,
        source: parsedData.source,
        originalPlayer: player,
        normalizedPlayer: normalizePlayerName(player)
      }
    });
    
  } catch (error) {
    console.error('Error fetching salary data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch salary data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v2/stats/salary/team/:team/:year - Get all salary data for a team
router.get('/salary/team/:team/:year', async (req, res) => {
  try {
    const { team, year } = req.params;
    
    // Get all salary keys for the team
    const salaryKeys = await getKeysByPattern(`salary:${team}-*-${year}`);
    
    if (salaryKeys.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: `No salary data found for ${team} in ${year}`
      });
    }
    
    const salaryData = await getMultipleKeys(salaryKeys);
    
    // Transform data and add metadata
    const processedData = salaryData
      .filter(item => item.data)
      .map(item => ({
        ...item.data,
        redisKey: item.key
      }))
      .sort((a, b) => (b.salary || 0) - (a.salary || 0)); // Sort by salary descending
    
    res.json({
      success: true,
      data: processedData,
      count: processedData.length,
      metadata: {
        team,
        year,
        totalSalaries: processedData.length,
        totalPayroll: processedData.reduce((sum, player) => sum + (player.salary || 0), 0),
        averageSalary: processedData.length > 0 ? 
          processedData.reduce((sum, player) => sum + (player.salary || 0), 0) / processedData.length : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching team salary data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team salary data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v2/stats/salary/all/:year - Get all salary data for a year
router.get('/salary/all/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { limit = 50, minSalary, maxSalary, team } = req.query;
    
    // Build pattern based on filters
    let pattern = `salary:*-${year}`;
    if (team) {
      pattern = `salary:${team}-*-${year}`;
    }
    
    const salaryKeys = await getKeysByPattern(pattern);
    
    if (salaryKeys.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: `No salary data found for ${year}`
      });
    }
    
    const salaryData = await getMultipleKeys(salaryKeys);
    
    // Filter and process data
    let processedData = salaryData
      .filter(item => item.data)
      .map(item => ({
        ...item.data,
        redisKey: item.key
      }));
    
    // Apply salary filters
    if (minSalary) {
      processedData = processedData.filter(player => player.salary >= parseInt(minSalary));
    }
    if (maxSalary) {
      processedData = processedData.filter(player => player.salary <= parseInt(maxSalary));
    }
    
    // Sort by salary descending
    processedData.sort((a, b) => (b.salary || 0) - (a.salary || 0));
    
    // Apply limit
    const limitedData = processedData.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedData,
      count: limitedData.length,
      totalCount: processedData.length,
      metadata: {
        year,
        totalPlayers: processedData.length,
        totalPayroll: processedData.reduce((sum, player) => sum + (player.salary || 0), 0),
        averageSalary: processedData.length > 0 ? 
          processedData.reduce((sum, player) => sum + (player.salary || 0), 0) / processedData.length : 0,
        filters: { minSalary, maxSalary, team, limit }
      }
    });
    
  } catch (error) {
    console.error('Error fetching all salary data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch salary data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v2/stats/cvr/:team/:player/:year - Calculate individual Cycle Value Rating
router.get('/cvr/:team/:player/:year', async (req, res) => {
  try {
    const { team, player, year } = req.params;
    
    // Normalize player name
    const normalizedPlayer = normalizePlayerName(player.replace(/_/g, ' '));
    const playerKey = `player:${team}-${normalizedPlayer.replace(/\s+/g, '_')}-${year}:season`;
    const salaryKey = `salary:${team}-${normalizedPlayer.replace(/\s+/g, '_')}-${year}`;
    
    console.log(`Fetching CVR data for: ${playerKey} and ${salaryKey}`);
    
    // Get player stats and salary data
    const [playerData, salaryData] = await Promise.all([
      getRedisClient().hgetall(playerKey),
      getRedisClient().hgetall(salaryKey)
    ]);
    
    if (!playerData || Object.keys(playerData).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        playerKey,
        salaryKey
      });
    }
    
    if (!salaryData || Object.keys(salaryData).length === 0 || !salaryData.salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary data not found',
        playerKey,
        salaryKey,
        debug: { playerData: Object.keys(playerData), salaryData }
      });
    }
    
    const salary = parseInt(salaryData.salary);
    if (!salary || salary <= 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid salary data',
        salary: salaryData.salary
      });
    }
    
    // Parse player stats
    const stats = parseRedisData(playerData);
    
    // Determine player type and calculate performance score
    const isPitcher = stats.pitching && stats.pitching.gamesPlayed > 0;
    let performanceScore = 0;
    
    if (isPitcher) {
      // Pitching performance (ERA, WHIP, K/9, etc.)
      const era = parseFloat(stats.pitching.era) || 5.00;
      const whip = parseFloat(stats.pitching.whip) || 1.50;
      const strikeoutsPer9 = parseFloat(stats.pitching.strikeoutsPer9) || 6.0;
      const wins = parseInt(stats.pitching.wins) || 0;
      
      // ERA performance (lower is better, league average ~4.00)
      const eraScore = Math.max(0, 100 - ((era - 2.00) * 25));
      
      // WHIP performance (lower is better, league average ~1.30)
      const whipScore = Math.max(0, 100 - ((whip - 0.90) * 125));
      
      // Strikeout rate (higher is better)
      const strikeoutScore = Math.min(100, (strikeoutsPer9 / 12.0) * 100);
      
      // Wins bonus
      const winScore = Math.min(25, wins * 2);
      
      performanceScore = (eraScore * 0.3 + whipScore * 0.3 + strikeoutScore * 0.3 + winScore * 0.1);
    } else {
      // Batting performance (BA, OBP, SLG, HR, RBI, etc.)
      const battingAverage = parseFloat(stats.batting.battingAverage) || 0.200;
      const onBasePercentage = parseFloat(stats.batting.onBasePercentage) || 0.250;
      const sluggingPercentage = parseFloat(stats.batting.sluggingPercentage) || 0.300;
      const homeRuns = parseInt(stats.batting.homeRuns) || 0;
      const rbi = parseInt(stats.batting.rbi) || 0;
      
      // Batting average (league average ~.260)
      const baScore = Math.min(100, ((battingAverage - 0.150) / 0.250) * 100);
      
      // OBP (league average ~.320)
      const obpScore = Math.min(100, ((onBasePercentage - 0.200) / 0.300) * 100);
      
      // SLG (league average ~.420)
      const slgScore = Math.min(100, ((sluggingPercentage - 0.200) / 0.400) * 100);
      
      // Power numbers
      const hrScore = Math.min(50, homeRuns * 1.5);
      const rbiScore = Math.min(50, rbi * 0.5);
      
      performanceScore = (baScore * 0.2 + obpScore * 0.25 + slgScore * 0.25 + hrScore * 0.15 + rbiScore * 0.15);
    }
    
    // Determine salary type and calculate CVR
    let salaryType = 'contract';
    let salaryMultiplier = 1.0;
    let adjustedLeagueAverage = 4500000; // MLB average salary
    
    if (salary <= 750000) {
      salaryType = 'minimum';
      adjustedLeagueAverage = 740000;
      salaryMultiplier = 1.5;
    } else if (salary <= 1000000) {
      salaryType = 'rookie';
      adjustedLeagueAverage = 900000;
      salaryMultiplier = 1.3;
    } else if (salary <= 3000000) {
      salaryType = 'arbitration';
      adjustedLeagueAverage = 2000000;
      salaryMultiplier = 1.2;
    } else if (salary <= 10000000) {
      salaryType = 'contract';
      adjustedLeagueAverage = 4500000;
      salaryMultiplier = 1.0;
    } else if (salary <= 25000000) {
      salaryType = 'premium';
      adjustedLeagueAverage = 15000000;
      salaryMultiplier = 0.95;
    } else {
      salaryType = 'superstar';
      adjustedLeagueAverage = 30000000;
      salaryMultiplier = 0.9;
    }
    
    // Calculate CVR: (Performance / 50) * salaryMultiplier / (salary / adjustedLeagueAverage)
    const performanceRatio = Math.max(0.1, performanceScore / 50);
    const salaryRatio = salary / adjustedLeagueAverage;
    const cvr = (performanceRatio * salaryMultiplier / salaryRatio) * 100;
    
    // Get CVR tier
    let tier, color, emoji;
    if (cvr >= 150) {
      tier = 'Elite Value';
      color = '#00C851';
      emoji = '💎';
    } else if (cvr >= 125) {
      tier = 'Great Value';
      color = '#4CAF50';
      emoji = '🔥';
    } else if (cvr >= 100) {
      tier = 'Good Value';
      color = '#8BC34A';
      emoji = '👍';
    } else if (cvr >= 75) {
      tier = 'Fair Value';
      color = '#FFC107';
      emoji = '👌';
    } else if (cvr >= 50) {
      tier = 'Below Average';
      color = '#FF9800';
      emoji = '👎';
    } else {
      tier = 'Poor Value';
      color = '#F44336';
      emoji = '💸';
    }
    
    res.json({
      success: true,
      data: {
        player: {
          name: normalizedPlayer,
          team,
          year
        },
        cvr: {
          value: Math.round(cvr * 10) / 10,
          tier,
          color,
          emoji
        },
        breakdown: {
          performanceScore: Math.round(performanceScore * 10) / 10,
          salaryType,
          salaryMultiplier,
          salary: salary,
          salaryFormatted: salary >= 1000000 ? `$${(salary/1000000).toFixed(1)}M` : `$${(salary/1000).toFixed(0)}K`,
          isPitcher
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('Error calculating individual CVR:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error calculating CVR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v2/stats/cvr/:playerA/:playerB - Calculate Cycle Value Rating between two players
router.get('/cvr/:playerA/:playerB', async (req, res) => {
  try {
    const { playerA, playerB } = req.params;
    const { year = '2025' } = req.query;
    
    // Parse player keys (format: "TEAM-Player_Name")
    const parsePlayerKey = (key) => {
      const parts = key.split('-');
      return {
        team: parts[0],
        name: parts.slice(1).join('-').replace(/_/g, ' ')
      };
    };
    
    const player1 = parsePlayerKey(playerA);
    const player2 = parsePlayerKey(playerB);
    
    // Get salary and stats data for both players
    const [salary1, salary2, stats1, stats2] = await Promise.all([
      getRedisClient().get(`salary:${player1.team}-${player1.name.replace(/\s+/g, '_')}-${year}`),
      getRedisClient().get(`salary:${player2.team}-${player2.name.replace(/\s+/g, '_')}-${year}`),
      getRedisClient().get(`player:${player1.team}-${player1.name.replace(/\s+/g, '_')}-${year}:season`),
      getRedisClient().get(`player:${player2.team}-${player2.name.replace(/\s+/g, '_')}-${year}:season`)
    ]);
    
    if (!salary1 || !salary2) {
      return res.status(404).json({
        success: false,
        error: 'Salary data not found for one or both players',
        missing: {
          player1: !salary1,
          player2: !salary2
        }
      });
    }
    
    if (!stats1 || !stats2) {
      return res.status(404).json({
        success: false,
        error: 'Stats data not found for one or both players',
        missing: {
          player1: !stats1,
          player2: !stats2
        }
      });
    }
    
    const salaryData1 = parseRedisData(salary1);
    const salaryData2 = parseRedisData(salary2);
    const statsData1 = parseRedisData(stats1);
    const statsData2 = parseRedisData(stats2);
    
    // Calculate statistical similarity (simplified version)
    let similarity = 0;
    const comparisons = [];
    
    // Determine player type and calculate similarity
    if (statsData1.pitching && statsData2.pitching) {
      // Pitcher comparison
      const era1 = statsData1.pitching.era || 0;
      const era2 = statsData2.pitching.era || 0;
      const whip1 = statsData1.pitching.whip || 0;
      const whip2 = statsData2.pitching.whip || 0;
      
      const eraSim = Math.max(0, 100 - Math.abs(era1 - era2) * 20);
      const whipSim = Math.max(0, 100 - Math.abs(whip1 - whip2) * 80);
      
      similarity = (eraSim + whipSim) / 2;
      
      comparisons.push(
        { stat: 'ERA', player1: era1, player2: era2, similarity: eraSim },
        { stat: 'WHIP', player1: whip1, player2: whip2, similarity: whipSim }
      );
      
    } else if (statsData1.batting && statsData2.batting) {
      // Batter comparison
      const avg1 = statsData1.batting.hits && statsData1.batting.atBats ? 
        statsData1.batting.hits / statsData1.batting.atBats : 0;
      const avg2 = statsData2.batting.hits && statsData2.batting.atBats ? 
        statsData2.batting.hits / statsData2.batting.atBats : 0;
      const hr1 = statsData1.batting.homeRuns || 0;
      const hr2 = statsData2.batting.homeRuns || 0;
      
      const avgSim = Math.max(0, 100 - Math.abs(avg1 - avg2) * 300);
      const hrSim = Math.max(0, 100 - Math.abs(hr1 - hr2) * 2);
      
      similarity = (avgSim + hrSim) / 2;
      
      comparisons.push(
        { stat: 'AVG', player1: avg1.toFixed(3), player2: avg2.toFixed(3), similarity: avgSim },
        { stat: 'HR', player1: hr1, player2: hr2, similarity: hrSim }
      );
    }
    
    // Calculate CVR
    const higherSalary = Math.max(salaryData1.salary, salaryData2.salary);
    const lowerSalary = Math.min(salaryData1.salary, salaryData2.salary);
    const salaryRatio = lowerSalary > 0 ? higherSalary / lowerSalary : 1;
    
    // Player with lower salary gets better CVR if similar performance
    const player1IsBetter = salaryData1.salary < salaryData2.salary;
    const cvr = similarity > 50 ? (similarity / salaryRatio) * 100 : similarity;
    
    const result = {
      success: true,
      data: {
        players: {
          player1: { ...player1, salary: salaryData1.salary },
          player2: { ...player2, salary: salaryData2.salary }
        },
        similarity: Math.round(similarity),
        salaryRatio: salaryRatio.toFixed(2),
        cvr: Math.round(cvr),
        betterValue: player1IsBetter ? player1.name : player2.name,
        comparisons,
        analysis: {
          similarPerformance: similarity > 70,
          significantSalaryDifference: salaryRatio > 1.5,
          valueOpportunity: similarity > 70 && salaryRatio > 1.5
        }
      },
      metadata: {
        year,
        calculatedAt: new Date().toISOString(),
        algorithm: 'Cycle Value Rating v1.0'
      }
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Error calculating CVR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate Cycle Value Rating',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
