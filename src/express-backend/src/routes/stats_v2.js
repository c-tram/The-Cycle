const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

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
      const stats = player.data[category];
      if (!stats || stats[stat] === undefined || stats[stat] === null) return false;
      
      // Apply minimum thresholds based on category
      if (category === 'batting') {
        return player.data.gameCount >= minGames && 
               (stats.atBats || 0) >= minAtBats;
      } else if (category === 'pitching') {
        const ip = parseFloat(stats.inningsPitched) || 0;
        return player.data.gameCount >= minGames && ip >= minInnings;
      } else if (category === 'fielding') {
        return player.data.gameCount >= minGames && 
               (stats.chances || 0) >= 10;
      }
      
      return player.data.gameCount >= minGames;
    });
    
    // Sort by stat (handle special cases)
    const ascendingStats = ['era', 'whip', 'fip'];
    const isAscending = ascendingStats.includes(stat);
    
    validPlayers.sort((a, b) => {
      const aValue = parseFloat(a.data[category][stat]) || 0;
      const bValue = parseFloat(b.data[category][stat]) || 0;
      return isAscending ? aValue - bValue : bValue - aValue;
    });
    
    const leaders = validPlayers.slice(0, parseInt(limit)).map((player, index) => {
      const keyParts = player.key.split(':');
      const playerInfo = keyParts[1].split('-');
      const team = playerInfo[0];
      const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      
      return {
        rank: index + 1,
        player: {
          name,
          team,
          year: playerInfo[playerInfo.length - 1]
        },
        value: player.data[category][stat],
        games: player.data.gameCount,
        qualifyingStats: getQualifyingStats(player.data[category], category),
        fullStats: player.data[category]
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
      'hits', 'homeRuns', 'rbi', 'runs', 'stolenBases', 'atBats'
    ],
    pitching: [
      'era', 'whip', 'fip', 'strikeoutsPer9Inn', 'walksPer9Inn', 'hitsPer9Inn',
      'strikeOuts', 'wins', 'saves', 'inningsPitched', 'strikeoutWalkRatio'
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

module.exports = router;
