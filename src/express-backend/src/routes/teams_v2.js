const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// ============================================================================
// ENHANCED TEAMS API ROUTES - v2
// Professional-grade team statistics with comprehensive data coverage
// ============================================================================

// GET /api/teams - Enhanced team listing with comprehensive statistics
router.get('/', async (req, res) => {
  try {
    const { year = '2025', league, division, sortBy = 'name' } = req.query;
    
    const pattern = `team:*:${year}:season`;
    const keys = await getKeysByPattern(pattern);
    const teamData = await getMultipleKeys(keys);
    
    if (teamData.length === 0) {
      return res.json({ teams: [], count: 0, year });
    }
    
    let teams = teamData.map(team => {
      const keyParts = team.key.split(':');
      const teamId = keyParts[1];
      
      return {
        id: teamId,
        name: team.data.name || teamId,
        league: team.data.league || 'Unknown',
        division: team.data.division || 'Unknown',
        year,
        gameCount: team.data.gameCount || 0,
        record: team.data.record || { wins: 0, losses: 0 },
        stats: {
          batting: team.data.batting || {},
          pitching: team.data.pitching || {},
          fielding: team.data.fielding || {},
          overall: {
            cvr: team.data.cvr || 0,  // CVR at root level
            war: team.data.war || {   // WAR object at root level
              total: 0,
              batting: 0,
              pitching: 0
            }
          }
        },
        cvr: team.data.cvr || 0,      // Also at top level for easy access
        war: team.data.war || { total: 0, batting: 0, pitching: 0 },
        // Add separate CVR values for batting and pitching
        cvrDetails: team.data.cvrDetails || {
          total: team.data.cvr || 0,
          batting: 0,
          pitching: 0
        },
        standings: {
          winPercentage: calculateWinPercentage(team.data.record),
          runsScored: team.data.batting?.runs || 0,
          runsAllowed: team.data.pitching?.earnedRuns || 0,
          runDifferential: (team.data.batting?.runs || 0) - (team.data.pitching?.earnedRuns || 0),
          pythagoreanWinPct: calculatePythagoreanWinPct(
            team.data.batting?.runs || 0, 
            team.data.pitching?.earnedRuns || 0
          ),
          lastTen: team.data.lastTenGames || { wins: 5, losses: 5 },
          homeRecord: team.data.homeRecord || { wins: 0, losses: 0 },
          awayRecord: team.data.awayRecord || { wins: 0, losses: 0 }
        },
        lastUpdated: team.data.lastUpdated
      };
    });
    
    // Apply filters
    if (league) {
      teams = teams.filter(team => team.league.toLowerCase() === league.toLowerCase());
    }
    
    if (division) {
      teams = teams.filter(team => team.division.toLowerCase() === division.toLowerCase());
    }
    
    // Sort teams
    teams.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'wins':
          return (b.record.wins || 0) - (a.record.wins || 0);
        case 'winPct':
          return b.standings.winPercentage - a.standings.winPercentage;
        case 'runDiff':
          return b.standings.runDifferential - a.standings.runDifferential;
        case 'runs':
          return b.standings.runsScored - a.standings.runsScored;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    res.json({
      teams,
      count: teams.length,
      year,
      filters: { league, division, sortBy },
      available: {
        leagues: [...new Set(teams.map(t => t.league))].filter(l => l !== 'Unknown').sort(),
        divisions: [...new Set(teams.map(t => t.division))].filter(d => d !== 'Unknown').sort()
      }
    });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/standings - League standings with advanced metrics
router.get('/standings', async (req, res) => {
  try {
    const { year = '2025', league, division } = req.query;
    
    const pattern = `team:*:${year}:season`;
    const keys = await getKeysByPattern(pattern);
    const teamData = await getMultipleKeys(keys);
    
    if (teamData.length === 0) {
      return res.json({ standings: [], year });
    }
    
    let standings = teamData.map(team => {
      const keyParts = team.key.split(':');
      const teamId = keyParts[1];
      const record = team.data.record || { wins: 0, losses: 0 };
      const winPct = calculateWinPercentage(record);
      
      return {
        id: teamId,
        name: team.data.name || teamId,
        league: team.data.league || 'Unknown',
        division: team.data.division || 'Unknown',
        wins: record.wins || 0,
        losses: record.losses || 0,
        winPercentage: winPct,
        gamesBack: 0, // Will be calculated later
        runsScored: team.data.batting?.runs || 0,
        runsAllowed: team.data.pitching?.earnedRuns || 0,
        runDifferential: (team.data.batting?.runs || 0) - (team.data.pitching?.earnedRuns || 0),
        streak: team.data.currentStreak || { type: 'W', count: 1 },
        homeRecord: team.data.homeRecord || { wins: 0, losses: 0 },
        awayRecord: team.data.awayRecord || { wins: 0, losses: 0 },
        lastTen: team.data.lastTenGames || { wins: 5, losses: 5 }
      };
    });
    
    // Apply filters
    if (league) {
      standings = standings.filter(team => team.league.toLowerCase() === league.toLowerCase());
    }
    
    if (division) {
      standings = standings.filter(team => team.division.toLowerCase() === division.toLowerCase());
    }
    
    // Sort by win percentage (then by run differential as tiebreaker)
    standings.sort((a, b) => {
      if (Math.abs(a.winPercentage - b.winPercentage) < 0.001) {
        return b.runDifferential - a.runDifferential;
      }
      return b.winPercentage - a.winPercentage;
    });
    
    // Calculate games back
    if (standings.length > 0) {
      const leader = standings[0];
      const leaderGamesAhead = leader.wins - leader.losses;
      
      standings.forEach((team, index) => {
        if (index === 0) {
          team.gamesBack = 0;
        } else {
          const teamGamesAhead = team.wins - team.losses;
          team.gamesBack = (leaderGamesAhead - teamGamesAhead) / 2;
        }
        team.rank = index + 1;
      });
    }
    
    res.json({
      standings,
      year,
      filters: { league, division },
      summary: {
        totalTeams: standings.length,
        averageWinPct: standings.reduce((sum, team) => sum + team.winPercentage, 0) / standings.length,
        highestRunDiff: Math.max(...standings.map(t => t.runDifferential)),
        lowestRunDiff: Math.min(...standings.map(t => t.runDifferential))
      }
    });
  } catch (err) {
    console.error('Error fetching standings:', err);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/teams/:teamId - Comprehensive individual team data
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { year = '2025', includeRoster = 'false' } = req.query;
    
    // Get team season stats
    const teamSeasonKey = `team:${teamId.toUpperCase()}:${year}:season`;
    const teamSeasonData = await getRedisClient().get(teamSeasonKey);
    const teamStats = parseRedisData(teamSeasonData);
    
    if (!teamStats) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const response = {
      id: teamId.toUpperCase(),
      name: teamStats.name || teamId.toUpperCase(),
      league: teamStats.league || 'Unknown',
      division: teamStats.division || 'Unknown',
      year,
      gameCount: teamStats.gameCount || 0,
      record: teamStats.record || { wins: 0, losses: 0 },
      seasonStats: {
        batting: teamStats.batting || {},
        pitching: teamStats.pitching || {},
        fielding: teamStats.fielding || {}
      },
      standings: {
        winPercentage: calculateWinPercentage(teamStats.record),
        runsScored: teamStats.batting?.runs || 0,
        runsAllowed: teamStats.pitching?.earnedRuns || 0,
        runDifferential: (teamStats.batting?.runs || 0) - (teamStats.pitching?.earnedRuns || 0),
        pythagoreanWinPct: calculatePythagoreanWinPct(
          teamStats.batting?.runs || 0, 
          teamStats.pitching?.earnedRuns || 0
        ),
        lastTen: teamStats.lastTenGames || { wins: 5, losses: 5 },
        homeRecord: teamStats.homeRecord || { wins: 0, losses: 0 },
        awayRecord: teamStats.awayRecord || { wins: 0, losses: 0 }
      },
      analytics: {
        offensive: calculateOffensiveAnalytics(teamStats.batting),
        pitching: calculatePitchingAnalytics(teamStats.pitching),
        fielding: calculateFieldingAnalytics(teamStats.fielding),
        overall: {
          rating: calculateOverallTeamRating(teamStats),
          cvr: teamStats.cvr || 0,
          war: teamStats.war || { total: 0, batting: 0, pitching: 0 },
          pythagoreanWinPct: calculatePythagoreanWinPct(
            teamStats.batting?.runs || 0, 
            teamStats.pitching?.earnedRuns || 0
          )
        }
      },
      // Also include CVR and WAR at root level for easy access
      cvr: teamStats.cvr || 0,
      war: teamStats.war || { total: 0, batting: 0, pitching: 0 },
      lastUpdated: teamStats.lastUpdated
    };
    
    // Include roster if requested
    if (includeRoster === 'true') {
      const rosterKeys = await getKeysByPattern(`player:${teamId.toUpperCase()}-*-${year}:season`);
      const rosterData = await getMultipleKeys(rosterKeys);
      
      response.roster = rosterData.map(player => {
        const keyParts = player.key.split(':');
        const playerInfo = keyParts[1].split('-');
        const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
        
        return {
          id: keyParts[1],
          name,
          position: player.data.position || 'Unknown',
          gameCount: player.data.gameCount || 0,
          stats: {
            batting: player.data.batting || {},
            pitching: player.data.pitching || {},
            fielding: player.data.fielding || {}
          },
          contribution: calculatePlayerContribution(player.data)
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
      
      response.rosterSize = response.roster.length;
      response.depthChart = generateDepthChart(response.roster);
    }
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching team data:', err);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
});

// GET /api/teams/:teamId/schedule - Team schedule and game results
router.get('/:teamId/schedule', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { year = '2025', month, limit = 50 } = req.query;
    
    let pattern = `team:${teamId.toUpperCase()}:${year}:????-??-??`;
    
    // If month specified, filter by month
    if (month) {
      const monthPad = month.padStart(2, '0');
      pattern = `team:${teamId.toUpperCase()}:${year}:${year}-${monthPad}-??`;
    }
    
    const gameKeys = await getKeysByPattern(pattern);
    const gameData = await getMultipleKeys(gameKeys);
    
    if (gameData.length === 0) {
      return res.json({ team: teamId.toUpperCase(), year, games: [], count: 0 });
    }
    
    const games = gameData
      .map(game => {
        const date = game.key.split(':').pop();
        const gameInfo = game.data.gameInfo || {};
        const batting = game.data.batting || {};
        const pitching = game.data.pitching || {};
        
        return {
          date,
          gameId: gameInfo.gameId || 'Unknown',
          opponent: gameInfo.opponent || 'Unknown',
          homeAway: gameInfo.homeAway || 'Unknown', 
          result: gameInfo.result || 'Unknown',
          score: {
            team: gameInfo.runsScored || 0,
            opponent: gameInfo.runsAllowed || 0
          },
          stats: {
            batting: batting,
            pitching: pitching,
            fielding: game.data.fielding || {}
          },
          gameInfo: gameInfo,
          performance: evaluateTeamGamePerformance(game.data)
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first
      .slice(0, parseInt(limit));
    
    // Calculate schedule analytics
    const analytics = calculateScheduleAnalytics(games);
    
    res.json({
      team: teamId.toUpperCase(),
      year,
      month,
      games,
      count: games.length,
      analytics,
      filters: { month, limit }
    });
  } catch (err) {
    console.error('Error fetching team schedule:', err);
    res.status(500).json({ error: 'Failed to fetch team schedule' });
  }
});

// GET /api/teams/:teamId/splits - Team situational splits
router.get('/:teamId/splits', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { year = '2025', splitType = 'all' } = req.query;
    
    // Get all team games
    const gameKeys = await getKeysByPattern(`team:${teamId.toUpperCase()}:${year}:????-??-??`);
    const gameData = await getMultipleKeys(gameKeys);
    
    if (gameData.length === 0) {
      return res.status(404).json({ error: 'No game data found for team' });
    }
    
    const splits = calculateTeamSplits(gameData, splitType);
    
    res.json({
      team: teamId.toUpperCase(),
      year,
      splitType,
      splits,
      gameCount: gameData.length,
      insights: generateTeamSplitInsights(splits)
    });
  } catch (err) {
    console.error('Error fetching team splits:', err);
    res.status(500).json({ error: 'Failed to fetch team splits' });
  }
});

// POST /api/teams/compare - Advanced team comparison
router.post('/compare', async (req, res) => {
  try {
    const { teams, year = '2025', categories = ['batting', 'pitching'] } = req.body;
    
    if (!teams || !Array.isArray(teams) || teams.length < 2) {
      return res.status(400).json({ error: 'Must provide at least 2 teams to compare' });
    }
    
    const comparisons = [];
    
    for (const teamId of teams) {
      const teamSeasonKey = `team:${teamId.toUpperCase()}:${year}:season`;
      const teamSeasonData = await getRedisClient().get(teamSeasonKey);
      const teamStats = parseRedisData(teamSeasonData);
      
      if (teamStats) {
        comparisons.push({
          id: teamId.toUpperCase(),
          name: teamStats.name || teamId.toUpperCase(),
          league: teamStats.league || 'Unknown',
          division: teamStats.division || 'Unknown',
          record: teamStats.record || { wins: 0, losses: 0 },
          stats: {
            batting: teamStats.batting || {},
            pitching: teamStats.pitching || {},
            fielding: teamStats.fielding || {}
          },
          analytics: {
            offensive: calculateOffensiveAnalytics(teamStats.batting),
            pitching: calculatePitchingAnalytics(teamStats.pitching),
            fielding: calculateFieldingAnalytics(teamStats.fielding)
          }
        });
      }
    }
    
    // Generate comparison analytics
    const comparisonAnalytics = generateTeamComparisonAnalytics(comparisons, categories);
    
    res.json({
      year,
      categories,
      comparisons,
      analytics: comparisonAnalytics,
      summary: generateTeamComparisonSummary(comparisons),
      teamCount: comparisons.length
    });
  } catch (err) {
    console.error('Error in team comparison:', err);
    res.status(500).json({ error: 'Failed to perform team comparison' });
  }
});

// ============================================================================
// HELPER FUNCTIONS FOR TEAM ANALYTICS
// ============================================================================

function calculateWinPercentage(record) {
  const wins = record?.wins || 0;
  const losses = record?.losses || 0;
  const totalGames = wins + losses;
  
  if (totalGames === 0) return 0;
  return Number((wins / totalGames).toFixed(3));
}

function calculatePythagoreanWinPct(runsScored, runsAllowed) {
  if (!runsScored || !runsAllowed || runsScored <= 0 || runsAllowed <= 0) {
    return 0;
  }
  
  // Pythagorean expectation formula: RS^2 / (RS^2 + RA^2)
  const rsSquared = Math.pow(runsScored, 2);
  const raSquared = Math.pow(runsAllowed, 2);
  
  return Number((rsSquared / (rsSquared + raSquared)).toFixed(3));
}

function calculateOffensiveAnalytics(batting) {
  if (!batting || Object.keys(batting).length === 0) {
    return { rating: 'Unknown', runsPerGame: 0, teamOPS: 0 };
  }
  
  const runsPerGame = batting.runs && batting.gamesPlayed ? batting.runs / batting.gamesPlayed : 0;
  const teamOPS = batting.ops || 0;
  
  let rating = 'Average';
  if (teamOPS >= 0.800) rating = 'Excellent';
  else if (teamOPS >= 0.750) rating = 'Good';
  else if (teamOPS >= 0.700) rating = 'Average';
  else rating = 'Poor';
  
  return {
    rating,
    runsPerGame: Number(runsPerGame.toFixed(2)),
    teamOPS: Number(teamOPS.toFixed(3)),
    powerIndex: batting.homeRuns && batting.atBats ? (batting.homeRuns / batting.atBats * 1000) : 0,
    disciplineIndex: batting.baseOnBalls && batting.atBats ? (batting.baseOnBalls / batting.atBats) : 0
  };
}

function calculatePitchingAnalytics(pitching) {
  if (!pitching || Object.keys(pitching).length === 0) {
    return { rating: 'Unknown', era: 0, whip: 0 };
  }
  
  const era = pitching.era || 0;
  const whip = pitching.whip || 0;
  
  let rating = 'Average';
  if (era <= 3.50 && whip <= 1.20) rating = 'Excellent';
  else if (era <= 4.00 && whip <= 1.30) rating = 'Good';
  else if (era <= 4.50 && whip <= 1.40) rating = 'Average';
  else rating = 'Poor';
  
  return {
    rating,
    era: Number(era.toFixed(2)),
    whip: Number(whip.toFixed(3)),
    strikeoutRate: pitching.kRate || 0,
    walkRate: pitching.bbRate || 0,
    qualityStartPct: 0.6 // Placeholder - would need game-by-game data
  };
}

function calculateFieldingAnalytics(fielding) {
  if (!fielding || Object.keys(fielding).length === 0) {
    return { rating: 'Unknown', fieldingPct: 0, errors: 0 };
  }
  
  const fieldingPct = fielding.fieldingPercentage || 0;
  const errors = fielding.errors || 0;
  
  let rating = 'Average';
  if (fieldingPct >= 0.985) rating = 'Excellent';
  else if (fieldingPct >= 0.980) rating = 'Good';
  else if (fieldingPct >= 0.975) rating = 'Average';
  else rating = 'Poor';
  
  return {
    rating,
    fieldingPct: Number(fieldingPct.toFixed(3)),
    errors,
    errorRate: fielding.chances ? (errors / fielding.chances) : 0
  };
}

function calculateOverallTeamRating(teamStats) {
  const offenseRating = calculateOffensiveAnalytics(teamStats.batting);
  const pitchingRating = calculatePitchingAnalytics(teamStats.pitching);
  const fieldingRating = calculateFieldingAnalytics(teamStats.fielding);
  
  const ratingValues = { 'Excellent': 4, 'Good': 3, 'Average': 2, 'Poor': 1, 'Unknown': 2 };
  
  const avgRating = (
    ratingValues[offenseRating.rating] + 
    ratingValues[pitchingRating.rating] + 
    ratingValues[fieldingRating.rating]
  ) / 3;
  
  if (avgRating >= 3.5) return 'A';
  else if (avgRating >= 3.0) return 'B+';
  else if (avgRating >= 2.5) return 'B';
  else if (avgRating >= 2.0) return 'C+';
  else return 'C';
}

function calculatePlayerContribution(playerData) {
  // Simplified contribution calculation
  let offensive = 0;
  let pitching = 0;
  let fielding = 0;
  
  if (playerData.batting && playerData.batting.atBats > 0) {
    offensive = (playerData.batting.ops || 0) * 100;
  }
  
  if (playerData.pitching && playerData.pitching.inningsPitched > 0) {
    pitching = Math.max(0, 100 - (playerData.pitching.era || 5) * 20);
  }
  
  if (playerData.fielding && playerData.fielding.chances > 0) {
    fielding = (playerData.fielding.fieldingPercentage || 0.950) * 100;
  }
  
  return {
    offensive: Number(offensive.toFixed(1)),
    pitching: Number(pitching.toFixed(1)),
    fielding: Number(fielding.toFixed(1)),
    overall: Number(((offensive + pitching + fielding) / 3).toFixed(1))
  };
}

function generateDepthChart(roster) {
  const positions = {};
  
  roster.forEach(player => {
    const pos = player.position || 'Unknown';
    if (!positions[pos]) positions[pos] = [];
    positions[pos].push({
      name: player.name,
      contribution: player.contribution.overall
    });
  });
  
  // Sort each position by contribution
  Object.keys(positions).forEach(pos => {
    positions[pos].sort((a, b) => b.contribution - a.contribution);
  });
  
  return positions;
}

function evaluateTeamGamePerformance(gameData) {
  let score = 50; // Base score
  
  // Factor in result
  if (gameData.result === 'W') score += 25;
  else if (gameData.result === 'L') score -= 25;
  
  // Factor in run differential
  if (gameData.score) {
    const diff = gameData.score.team - gameData.score.opponent;
    score += Math.min(15, Math.max(-15, diff * 3));
  }
  
  // Factor in offensive performance
  if (gameData.batting) {
    if (gameData.batting.runs >= 7) score += 10;
    if (gameData.batting.hits >= 10) score += 5;
  }
  
  // Factor in pitching performance
  if (gameData.pitching) {
    if (gameData.pitching.earnedRuns <= 2) score += 10;
    if (gameData.pitching.strikeOuts >= 8) score += 5;
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor'
  };
}

function calculateScheduleAnalytics(games) {
  const totalGames = games.length;
  if (totalGames === 0) return {};
  
  const wins = games.filter(g => g.result === 'W').length;
  const losses = games.filter(g => g.result === 'L').length;
  const homeGames = games.filter(g => g.homeAway === 'home');
  const awayGames = games.filter(g => g.homeAway === 'away');
  
  return {
    winPercentage: totalGames > 0 ? wins / totalGames : 0,
    homeRecord: {
      wins: homeGames.filter(g => g.result === 'W').length,
      losses: homeGames.filter(g => g.result === 'L').length
    },
    awayRecord: {
      wins: awayGames.filter(g => g.result === 'W').length,
      losses: awayGames.filter(g => g.result === 'L').length
    },
    averageRunsScored: games.reduce((sum, g) => sum + (g.score?.team || 0), 0) / totalGames,
    averageRunsAllowed: games.reduce((sum, g) => sum + (g.score?.opponent || 0), 0) / totalGames,
    recentForm: games.slice(0, 10).filter(g => g.result === 'W').length // Last 10 games
  };
}

function calculateTeamSplits(gameData, splitType) {
  const splits = {};
  
  // Home/Away splits
  if (splitType === 'homeAway' || splitType === 'all') {
    splits.homeAway = {
      home: aggregateTeamGameStats(gameData.filter(g => g.data.homeAway === 'home')),
      away: aggregateTeamGameStats(gameData.filter(g => g.data.homeAway === 'away'))
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
        splits.monthly[name] = aggregateTeamGameStats(monthGames);
      }
    });
  }
  
  return splits;
}

function aggregateTeamGameStats(games) {
  if (games.length === 0) return null;
  
  const totals = {
    gameCount: games.length,
    wins: games.filter(g => g.data.result === 'W').length,
    losses: games.filter(g => g.data.result === 'L').length,
    batting: {},
    pitching: {}
  };
  
  // Aggregate stats
  games.forEach(game => {
    ['batting', 'pitching'].forEach(category => {
      if (game.data[category]) {
        Object.entries(game.data[category]).forEach(([key, value]) => {
          if (typeof value === 'number') {
            totals[category][key] = (totals[category][key] || 0) + value;
          }
        });
      }
    });
  });
  
  // Calculate win percentage
  totals.winPercentage = totals.gameCount > 0 ? totals.wins / totals.gameCount : 0;
  
  return totals;
}

function generateTeamSplitInsights(splits) {
  const insights = [];
  
  // Home/Away analysis
  if (splits.homeAway) {
    const home = splits.homeAway.home;
    const away = splits.homeAway.away;
    
    if (home && away) {
      const homeDiff = home.winPercentage - away.winPercentage;
      if (Math.abs(homeDiff) > 0.100) {
        insights.push({
          type: 'homeAway',
          message: homeDiff > 0 ? 
            `Strong home field advantage (+${(homeDiff * 100).toFixed(0)} win%)` :
            `Better road team (+${(Math.abs(homeDiff) * 100).toFixed(0)} win% on road)`
        });
      }
    }
  }
  
  return insights;
}

function generateTeamComparisonAnalytics(comparisons, categories) {
  const analytics = {
    leaders: {},
    insights: [],
    recommendations: []
  };
  
  // Find leaders in each category
  categories.forEach(category => {
    if (category === 'batting') {
      const leader = comparisons.reduce((prev, current) => {
        return (current.stats.batting.ops || 0) > (prev.stats.batting.ops || 0) ? current : prev;
      }, comparisons[0]);
      analytics.leaders.offense = leader.name;
    } else if (category === 'pitching') {
      const leader = comparisons.reduce((prev, current) => {
        return (current.stats.pitching.era || 999) < (prev.stats.pitching.era || 999) ? current : prev;
      }, comparisons[0]);
      analytics.leaders.pitching = leader.name;
    }
  });
  
  return analytics;
}

function generateTeamComparisonSummary(comparisons) {
  const bestRecord = comparisons.reduce((prev, current) => {
    const prevWinPct = calculateWinPercentage(prev.record);
    const currentWinPct = calculateWinPercentage(current.record);
    return currentWinPct > prevWinPct ? current : prev;
  }, comparisons[0]);
  
  return {
    bestRecord: bestRecord.name,
    totalTeams: comparisons.length,
    avgWinPct: comparisons.reduce((sum, team) => sum + calculateWinPercentage(team.record), 0) / comparisons.length
  };
}

module.exports = router;
