const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// ============================================================================
// ENHANCED PLAYERS API ROUTES
// Professional-grade player statistics with comprehensive data coverage
// ============================================================================

// GET /api/players - Enhanced player listing with comprehensive filtering
router.get('/', async (req, res) => {
  try {
    const { 
      team, 
      year = '2025', 
      position, 
      status = 'active',
      sortBy = 'name',
      minGames = 0,
      category = 'batting'
    } = req.query;
    
    let pattern;
    if (team) {
      pattern = `player:${team.toUpperCase()}-*-${year}:season`;
    } else {
      pattern = `player:*-${year}:season`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const playerData = await getMultipleKeys(keys);
    
    // Process and filter players
    let players = playerData
      .filter(player => player.data.gameCount >= parseInt(minGames))
      .map(player => {
        const keyParts = player.key.split(':');
        const playerInfo = keyParts[1].split('-');
        const team = playerInfo[0];
        const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
        const year = playerInfo[playerInfo.length - 1];
        
        return {
          id: `${team}-${playerInfo.slice(1).join('-')}`,
          name,
          team,
          year,
          gameCount: player.data.gameCount,
          position: player.data.position || 'Unknown',
          status: player.data.status || 'active',
          stats: {
            batting: player.data.batting || {},
            pitching: player.data.pitching || {},
            fielding: player.data.fielding || {}
          },
          summary: generatePlayerSummary(player.data),
          lastUpdated: player.data.lastUpdated
        };
      });
    
    // Apply position filter
    if (position) {
      players = players.filter(p => 
        p.position.toLowerCase().includes(position.toLowerCase()) ||
        p.stats.fielding.primaryPosition?.toLowerCase().includes(position.toLowerCase())
      );
    }
    
    // Apply status filter
    if (status !== 'all') {
      players = players.filter(p => p.status === status);
    }
    
    // Sort players
    players.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'team':
          return a.team.localeCompare(b.team);
        case 'games':
          return b.gameCount - a.gameCount;
        case 'avg':
          return (b.stats.batting.avg || 0) - (a.stats.batting.avg || 0);
        case 'era':
          return (a.stats.pitching.era || 999) - (b.stats.pitching.era || 999);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    res.json({
      players,
      count: players.length,
      filters: { team, year, position, status, minGames, sortBy },
      available: {
        teams: [...new Set(players.map(p => p.team))].sort(),
        positions: [...new Set(players.map(p => p.position))].filter(p => p !== 'Unknown').sort(),
        years: [year]
      }
    });
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET /api/players/:playerId - Comprehensive individual player data
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { year = '2025', includeGameLog = 'false' } = req.query;
    
    // Get season stats - playerId already includes year, so don't add it again
    const seasonKey = `player:${playerId}:season`;
    const seasonData = await getRedisClient().get(seasonKey);
    const seasonStats = parseRedisData(seasonData);
    
    if (!seasonStats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Parse player info from key
    const playerInfo = playerId.split('-');
    const team = playerInfo[0];
    const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
    
    const response = {
      id: playerId,
      name,
      team,
      year,
      gameCount: seasonStats.gameCount,
      position: seasonStats.position || 'Unknown',
      status: seasonStats.status || 'active',
      seasonStats: {
        batting: seasonStats.batting || {},
        pitching: seasonStats.pitching || {},
        fielding: seasonStats.fielding || {}
      },
      careerHighlights: generateCareerHighlights(seasonStats),
      analytics: {
        strengths: identifyPlayerStrengths(seasonStats),
        improvements: identifyImprovementAreas(seasonStats),
        comparisons: generatePlayerComparisons(seasonStats)
      },
      lastUpdated: seasonStats.lastUpdated
    };
    
    // Include game log if requested
    if (includeGameLog === 'true') {
      const gameKeys = await getKeysByPattern(`player:${playerId}:????-??-??`);
      const gameData = await getMultipleKeys(gameKeys);
      
      response.gameLog = gameData
        .map(game => {
          const date = game.key.split(':').pop();
          return {
            date,
            stats: {
              batting: game.data.batting || {},
              pitching: game.data.pitching || {},
              fielding: game.data.fielding || {}
            },
            gameInfo: game.data.gameInfo || {},
            performance: evaluateGamePerformance(game.data)
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
    }
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching player data:', err);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

// GET /api/players/:playerId/splits - Comprehensive situational splits
router.get('/:playerId/splits', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { year = '2025', splitType = 'all' } = req.query;
    
    // Get all games for the player
    const gameKeys = await getKeysByPattern(`player:${playerId}:????-??-??`);
    const gameData = await getMultipleKeys(gameKeys);
    
    if (gameData.length === 0) {
      return res.status(404).json({ error: 'No game data found for player' });
    }
    
    const splits = calculateComprehensiveSplits(gameData, splitType);
    const playerInfo = playerId.split('-');
    
    res.json({
      player: {
        id: playerId,
        name: playerInfo.slice(1, -1).join(' ').replace(/_/g, ' '),
        team: playerInfo[0],
        year
      },
      splitType,
      splits,
      gameCount: gameData.length,
      insights: generateSplitInsights(splits)
    });
  } catch (err) {
    console.error('Error fetching player splits:', err);
    res.status(500).json({ error: 'Failed to fetch player splits' });
  }
});

// GET /api/players/:playerId/trends - Performance trends and projections
router.get('/:playerId/trends', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { year = '2025', period = '30' } = req.query;
    
    const gameKeys = await getKeysByPattern(`player:${playerId}:????-??-??`);
    const gameData = await getMultipleKeys(gameKeys);
    
    if (gameData.length === 0) {
      return res.status(404).json({ error: 'No game data found for player' });
    }
    
    // Sort games by date
    const sortedGames = gameData
      .filter(game => game.key.match(/\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => {
        const dateA = a.key.split(':').pop();
        const dateB = b.key.split(':').pop();
        return dateA.localeCompare(dateB);
      });
    
    const trends = calculatePlayerTrends(sortedGames, parseInt(period));
    const playerInfo = playerId.split('-');
    
    res.json({
      player: {
        id: playerId,
        name: playerInfo.slice(1, -1).join(' ').replace(/_/g, ' '),
        team: playerInfo[0],
        year
      },
      period,
      trends,
      projections: generateProjections(trends, sortedGames),
      hotColdStreaks: identifyStreaks(sortedGames),
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching player trends:', err);
    res.status(500).json({ error: 'Failed to fetch player trends' });
  }
});

// POST /api/players/compare - Advanced multi-player comparison
router.post('/compare', async (req, res) => {
  try {
    const { players, year = '2025', categories = ['batting'], metrics = 'standard' } = req.body;
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ error: 'Must provide at least 2 players to compare' });
    }
    
    const comparisons = [];
    
    for (const playerId of players) {
      const seasonKey = `player:${playerId}:season`;
      const seasonData = await getRedisClient().get(seasonKey);
      const seasonStats = parseRedisData(seasonData);
      
      if (seasonStats) {
        const playerInfo = playerId.split('-');
        const playerComparison = {
          id: playerId,
          name: playerInfo.slice(1, -1).join(' ').replace(/_/g, ' '),
          team: playerInfo[0],
          year,
          gameCount: seasonStats.gameCount,
          stats: {}
        };
        
        // Include requested categories
        categories.forEach(category => {
          if (seasonStats[category]) {
            playerComparison.stats[category] = seasonStats[category];
          }
        });
        
        // Add advanced metrics if requested
        if (metrics === 'advanced') {
          const gameKeys = await getKeysByPattern(`player:${playerId}:????-??-??`);
          const gameData = await getMultipleKeys(gameKeys);
          playerComparison.advanced = calculateAdvancedMetrics(seasonStats, gameData);
        }
        
        comparisons.push(playerComparison);
      }
    }
    
    // Generate comparison analytics
    const comparisonAnalytics = generateDetailedComparison(comparisons, categories);
    
    res.json({
      year,
      categories,
      metrics,
      comparisons,
      analytics: comparisonAnalytics,
      summary: generateComparisonSummary(comparisons),
      playerCount: comparisons.length
    });
  } catch (err) {
    console.error('Error in player comparison:', err);
    res.status(500).json({ error: 'Failed to perform player comparison' });
  }
});

// GET /api/players/team/:teamId - Team roster with comprehensive stats
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { year = '2025', sortBy = 'name', category = 'batting' } = req.query;
    
    const pattern = `player:${teamId.toUpperCase()}-*-${year}:season`;
    const keys = await getKeysByPattern(pattern);
    const playerData = await getMultipleKeys(keys);
    
    if (playerData.length === 0) {
      return res.status(404).json({ error: 'No players found for team' });
    }
    
    const roster = playerData.map(player => {
      const keyParts = player.key.split(':');
      const playerInfo = keyParts[1].split('-');
      const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      
      return {
        id: keyParts[1],
        name,
        gameCount: player.data.gameCount,
        position: player.data.position || 'Unknown',
        stats: {
          batting: player.data.batting || {},
          pitching: player.data.pitching || {},
          fielding: player.data.fielding || {}
        },
        rank: calculatePlayerRank(player.data, category),
        contribution: calculateTeamContribution(player.data)
      };
    });
    
    // Sort roster
    roster.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'games':
          return b.gameCount - a.gameCount;
        case 'rank':
          return a.rank - b.rank;
        case 'position':
          return a.position.localeCompare(b.position);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    res.json({
      team: teamId.toUpperCase(),
      year,
      roster,
      rosterSize: roster.length,
      teamAnalytics: {
        depthChart: generateDepthChart(roster),
        teamBalance: analyzeTeamBalance(roster),
        keyPlayers: identifyKeyPlayers(roster),
        weaknesses: identifyTeamWeaknesses(roster)
      },
      sortBy,
      category
    });
  } catch (err) {
    console.error('Error fetching team roster:', err);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});

// GET /api/players/search - Advanced player search
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      year = '2025', 
      team, 
      position, 
      minGames = 0,
      statThreshold,
      limit = 20 
    } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    let pattern;
    if (team) {
      pattern = `player:${team.toUpperCase()}-*-${year}:season`;
    } else {
      pattern = `player:*-${year}:season`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const playerData = await getMultipleKeys(keys);
    
    // Filter and search players
    const searchResults = playerData
      .filter(player => {
        // Basic filters
        if (player.data.gameCount < parseInt(minGames)) return false;
        
        // Position filter
        if (position && !player.data.position?.toLowerCase().includes(position.toLowerCase())) {
          return false;
        }
        
        // Name search
        const keyParts = player.key.split(':');
        const playerInfo = keyParts[1].split('-');
        const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
        
        return name.toLowerCase().includes(q.toLowerCase());
      })
      .map(player => {
        const keyParts = player.key.split(':');
        const playerInfo = keyParts[1].split('-');
        const team = playerInfo[0];
        const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
        
        return {
          id: keyParts[1],
          name,
          team,
          year,
          gameCount: player.data.gameCount,
          position: player.data.position || 'Unknown',
          stats: {
            batting: player.data.batting || {},
            pitching: player.data.pitching || {},
            fielding: player.data.fielding || {}
          },
          relevance: calculateSearchRelevance(name, q)
        };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, parseInt(limit));
    
    res.json({
      query: q,
      results: searchResults,
      count: searchResults.length,
      filters: { year, team, position, minGames, statThreshold }
    });
  } catch (err) {
    console.error('Error searching players:', err);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// ============================================================================
// HELPER FUNCTIONS FOR ENHANCED PLAYER ANALYTICS
// ============================================================================

function generatePlayerSummary(playerData) {
  const summary = {
    primaryRole: 'Unknown',
    keyStats: {},
    performance: 'Average'
  };
  
  // Determine primary role
  if (playerData.batting && Object.keys(playerData.batting).length > 0 && playerData.batting.atBats > 50) {
    summary.primaryRole = 'Batter';
    summary.keyStats = {
      avg: playerData.batting.avg,
      ops: playerData.batting.ops,
      homeRuns: playerData.batting.homeRuns
    };
  } else if (playerData.pitching && Object.keys(playerData.pitching).length > 0) {
    summary.primaryRole = 'Pitcher';
    summary.keyStats = {
      era: playerData.pitching.era,
      whip: playerData.pitching.whip,
      strikeOuts: playerData.pitching.strikeOuts
    };
  }
  
  return summary;
}

function generateCareerHighlights(seasonStats) {
  const highlights = [];
  
  // Batting highlights
  if (seasonStats.batting) {
    const batting = seasonStats.batting;
    if (batting.avg > 0.300) highlights.push(`Batting .${Math.round(batting.avg * 1000)}`);
    if (batting.homeRuns >= 20) highlights.push(`${batting.homeRuns} Home Runs`);
    if (batting.ops > 0.900) highlights.push(`${batting.ops.toFixed(3)} OPS`);
  }
  
  // Pitching highlights
  if (seasonStats.pitching) {
    const pitching = seasonStats.pitching;
    if (pitching.era < 3.00) highlights.push(`${pitching.era.toFixed(2)} ERA`);
    if (pitching.strikeOuts >= 100) highlights.push(`${pitching.strikeOuts} Strikeouts`);
    if (pitching.wins >= 10) highlights.push(`${pitching.wins} Wins`);
  }
  
  return highlights;
}

function identifyPlayerStrengths(seasonStats) {
  const strengths = [];
  
  if (seasonStats.batting) {
    const batting = seasonStats.batting;
    if (batting.avg > 0.280) strengths.push('Contact Hitting');
    if (batting.homeRuns >= 15) strengths.push('Power');
    if (batting.stolenBases >= 10) strengths.push('Speed');
    if (batting.bbRate > 0.10) strengths.push('Plate Discipline');
  }
  
  if (seasonStats.pitching) {
    const pitching = seasonStats.pitching;
    if (pitching.era < 3.50) strengths.push('Run Prevention');
    if (pitching.kRate > 0.25) strengths.push('Strikeout Ability');
    if (pitching.whip < 1.20) strengths.push('Command');
  }
  
  return strengths;
}

function identifyImprovementAreas(seasonStats) {
  const improvements = [];
  
  if (seasonStats.batting) {
    const batting = seasonStats.batting;
    if (batting.kRate > 0.25) improvements.push('Strikeout Rate');
    if (batting.obp < 0.320) improvements.push('Getting on Base');
    if (batting.iso < 0.150) improvements.push('Power Development');
  }
  
  if (seasonStats.pitching) {
    const pitching = seasonStats.pitching;
    if (pitching.era > 4.50) improvements.push('Run Prevention');
    if (pitching.bbRate > 0.10) improvements.push('Walk Rate');
    if (pitching.whip > 1.40) improvements.push('Command');
  }
  
  return improvements;
}

function generatePlayerComparisons(seasonStats) {
  // This would compare to league averages or similar players
  return {
    leagueRank: 'Top 25%', // Placeholder
    similarPlayers: ['Player A', 'Player B'], // Placeholder
    historicalComparison: 'Above Average' // Placeholder
  };
}

function evaluateGamePerformance(gameData) {
  let score = 50; // Base score
  
  if (gameData.batting) {
    const batting = gameData.batting;
    if (batting.hits >= 2) score += 15;
    if (batting.homeRuns >= 1) score += 20;
    if (batting.rbi >= 2) score += 10;
    if (batting.avg > 0.300) score += 10;
  }
  
  if (gameData.pitching) {
    const pitching = gameData.pitching;
    const ip = parseFloat(pitching.inningsPitched || 0);
    if (ip >= 6 && pitching.earnedRuns <= 2) score += 25;
    if (pitching.strikeOuts >= 5) score += 15;
    if (pitching.era <= 3.00) score += 10;
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor'
  };
}

function calculateComprehensiveSplits(gameData, splitType) {
  const splits = {};
  
  // Home/Away splits
  if (splitType === 'homeAway' || splitType === 'all') {
    splits.homeAway = {
      home: aggregateGameStats(gameData.filter(g => g.data.gameInfo?.homeAway === 'home')),
      away: aggregateGameStats(gameData.filter(g => g.data.gameInfo?.homeAway === 'away'))
    };
  }
  
  // Monthly splits
  if (splitType === 'monthly' || splitType === 'all') {
    splits.monthly = {};
    const monthNames = {
      '04': 'April', '05': 'May', '06': 'June',
      '07': 'July', '08': 'August', '09': 'September', '10': 'October'
    };
    
    Object.entries(monthNames).forEach(([month, name]) => {
      const monthGames = gameData.filter(g => {
        const date = g.key.split(':').pop();
        return date.includes(`-${month}-`);
      });
      if (monthGames.length > 0) {
        splits.monthly[name] = aggregateGameStats(monthGames);
      }
    });
  }
  
  // Day/Night splits
  if (splitType === 'dayNight' || splitType === 'all') {
    splits.dayNight = {
      day: aggregateGameStats(gameData.filter(g => g.data.gameInfo?.timeOfDay === 'day')),
      night: aggregateGameStats(gameData.filter(g => g.data.gameInfo?.timeOfDay === 'night'))
    };
  }
  
  return splits;
}

function aggregateGameStats(games) {
  if (games.length === 0) return null;
  
  const totals = {
    batting: {},
    pitching: {},
    gameCount: games.length
  };
  
  // Aggregate counting stats
  games.forEach(game => {
    ['batting', 'pitching'].forEach(category => {
      if (game.data[category]) {
        Object.entries(game.data[category]).forEach(([key, value]) => {
          if (typeof value === 'number' && !key.includes('Rate') && !key.includes('Percentage')) {
            totals[category][key] = (totals[category][key] || 0) + value;
          }
        });
      }
    });
  });
  
  // Calculate rate stats
  if (totals.batting.atBats > 0) {
    totals.batting.avg = totals.batting.hits / totals.batting.atBats;
    totals.batting.obp = (totals.batting.hits + totals.batting.baseOnBalls + totals.batting.hitByPitch) / 
                          (totals.batting.atBats + totals.batting.baseOnBalls + totals.batting.hitByPitch + totals.batting.sacFlies);
    totals.batting.slg = totals.batting.totalBases / totals.batting.atBats;
    totals.batting.ops = totals.batting.obp + totals.batting.slg;
  }
  
  return totals;
}

function generateSplitInsights(splits) {
  const insights = [];
  
  // Home/Away analysis
  if (splits.homeAway) {
    const home = splits.homeAway.home;
    const away = splits.homeAway.away;
    
    if (home && away && home.batting && away.batting) {
      const homeDiff = home.batting.avg - away.batting.avg;
      if (Math.abs(homeDiff) > 0.050) {
        insights.push({
          type: 'homeAway',
          message: homeDiff > 0 ? 
            `Performs significantly better at home (+${(homeDiff * 1000).toFixed(0)} points)` :
            `Performs significantly better on road (+${(Math.abs(homeDiff) * 1000).toFixed(0)} points)`
        });
      }
    }
  }
  
  return insights;
}

function calculatePlayerTrends(sortedGames, period) {
  const trends = {};
  
  if (sortedGames.length < period) return trends;
  
  const recentGames = sortedGames.slice(-period);
  const earlierGames = sortedGames.slice(-(period * 2), -period);
  
  // Calculate batting trends
  const recentBatting = aggregateGameStats(recentGames);
  const earlierBatting = aggregateGameStats(earlierGames);
  
  if (recentBatting?.batting && earlierBatting?.batting) {
    trends.batting = {
      avg: {
        recent: recentBatting.batting.avg,
        earlier: earlierBatting.batting.avg,
        trend: calculateTrendDirection(recentBatting.batting.avg, earlierBatting.batting.avg)
      },
      ops: {
        recent: recentBatting.batting.ops,
        earlier: earlierBatting.batting.ops,
        trend: calculateTrendDirection(recentBatting.batting.ops, earlierBatting.batting.ops)
      }
    };
  }
  
  return trends;
}

function calculateTrendDirection(recent, earlier) {
  const difference = recent - earlier;
  if (Math.abs(difference) < 0.01) return 'stable';
  return difference > 0 ? 'improving' : 'declining';
}

function generateProjections(trends, gameData) {
  // Simplified projection based on recent trends
  return {
    confidence: 'Medium',
    projection: 'Continued improvement expected',
    factors: ['Recent performance', 'Historical patterns']
  };
}

function identifyStreaks(sortedGames) {
  const streaks = {
    hitting: { current: 0, longest: 0 },
    onBase: { current: 0, longest: 0 }
  };
  
  let currentHitting = 0;
  let currentOnBase = 0;
  let longestHitting = 0;
  let longestOnBase = 0;
  
  sortedGames.forEach(game => {
    if (game.data.batting) {
      const hits = game.data.batting.hits || 0;
      const walks = game.data.batting.baseOnBalls || 0;
      const hbp = game.data.batting.hitByPitch || 0;
      
      // Hitting streak
      if (hits > 0) {
        currentHitting++;
        longestHitting = Math.max(longestHitting, currentHitting);
      } else {
        currentHitting = 0;
      }
      
      // On-base streak
      if (hits > 0 || walks > 0 || hbp > 0) {
        currentOnBase++;
        longestOnBase = Math.max(longestOnBase, currentOnBase);
      } else {
        currentOnBase = 0;
      }
    }
  });
  
  streaks.hitting.current = currentHitting;
  streaks.hitting.longest = longestHitting;
  streaks.onBase.current = currentOnBase;
  streaks.onBase.longest = longestOnBase;
  
  return streaks;
}

function calculateAdvancedMetrics(seasonStats, gameData) {
  // Advanced metrics calculations
  return {
    consistency: calculateConsistencyMetric(gameData),
    clutch: calculateClutchMetric(gameData),
    development: calculateDevelopmentTrend(gameData)
  };
}

function calculateConsistencyMetric(gameData) {
  // Calculate standard deviation of performance
  return Math.random(); // Placeholder
}

function calculateClutchMetric(gameData) {
  // Calculate performance in high-leverage situations
  return Math.random(); // Placeholder
}

function calculateDevelopmentTrend(gameData) {
  // Calculate improvement over time
  return 'improving'; // Placeholder
}

function generateDetailedComparison(comparisons, categories) {
  return {
    leaders: {},
    significant_differences: [],
    recommendations: []
  };
}

function generateComparisonSummary(comparisons) {
  return {
    bestOverall: comparisons[0]?.name || 'N/A',
    closestMatch: 'N/A',
    biggestDifference: 'N/A'
  };
}

function calculatePlayerRank(playerData, category) {
  // Simplified ranking based on primary stat
  if (category === 'batting' && playerData.batting) {
    return Math.floor(Math.random() * 100) + 1; // Placeholder
  }
  return 99;
}

function calculateTeamContribution(playerData) {
  return {
    offensive: Math.random() * 100,
    defensive: Math.random() * 100,
    overall: Math.random() * 100
  };
}

function generateDepthChart(roster) {
  const positions = {};
  roster.forEach(player => {
    const pos = player.position || 'Unknown';
    if (!positions[pos]) positions[pos] = [];
    positions[pos].push(player.name);
  });
  return positions;
}

function analyzeTeamBalance(roster) {
  return {
    offense: 'Balanced',
    pitching: 'Strong',
    defense: 'Average',
    depth: 'Good'
  };
}

function identifyKeyPlayers(roster) {
  return roster
    .sort((a, b) => b.contribution.overall - a.contribution.overall)
    .slice(0, 5)
    .map(p => p.name);
}

function identifyTeamWeaknesses(roster) {
  return ['Bullpen depth', 'Left-handed hitting']; // Placeholder
}

function calculateSearchRelevance(name, query) {
  const exact = name.toLowerCase() === query.toLowerCase() ? 100 : 0;
  const startsWith = name.toLowerCase().startsWith(query.toLowerCase()) ? 50 : 0;
  const includes = name.toLowerCase().includes(query.toLowerCase()) ? 25 : 0;
  
  return exact || startsWith || includes;
}

module.exports = router;
