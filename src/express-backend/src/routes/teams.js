const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// GET /api/teams - Get all teams
router.get('/', async (req, res) => {
  try {
    const { year = '2025' } = req.query;
    
    const pattern = `team:*:${year}:average`;
    const keys = await getKeysByPattern(pattern);
    const teams = await getMultipleKeys(keys);
    
    const formattedTeams = teams.map(team => {
      const keyParts = team.key.split(':');
      const teamName = keyParts[1];
      
      return {
        team: teamName,
        year: keyParts[2],
        stats: team.data
      };
    });
    
    res.json({
      teams: formattedTeams,
      count: formattedTeams.length
    });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:team/:year - Get specific team season stats
router.get('/:team/:year', async (req, res) => {
  try {
    const { team, year } = req.params;
    const teamKey = `team:${team.toUpperCase()}:${year}:average`;
    
    const client = getRedisClient();
    const data = await client.get(teamKey);
    const teamStats = parseRedisData(data);
    
    if (!teamStats) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({
      team: team.toUpperCase(),
      year,
      stats: teamStats
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// GET /api/teams/:team/:year/games - Get team game-by-game stats
router.get('/:team/:year/games', async (req, res) => {
  try {
    const { team, year } = req.params;
    const { startDate, endDate, limit = 20 } = req.query;
    
    let pattern = `team:${team.toUpperCase()}:${year}:????-??-??`;
    
    const keys = await getKeysByPattern(pattern);
    
    // Filter by date range if provided
    let filteredKeys = keys;
    if (startDate || endDate) {
      filteredKeys = keys.filter(key => {
        const datePart = key.split(':').pop();
        if (startDate && datePart < startDate) return false;
        if (endDate && datePart > endDate) return false;
        return true;
      });
    }
    
    // Sort by date (newest first) and limit
    filteredKeys.sort((a, b) => {
      const dateA = a.split(':').pop();
      const dateB = b.split(':').pop();
      return dateB.localeCompare(dateA);
    });
    
    const limitedKeys = filteredKeys.slice(0, parseInt(limit));
    const games = await getMultipleKeys(limitedKeys);
    
    const formattedGames = games.map(game => ({
      date: game.key.split(':').pop(),
      stats: game.data
    }));
    
    res.json({
      team: team.toUpperCase(),
      year,
      games: formattedGames,
      count: formattedGames.length,
      total: filteredKeys.length
    });
  } catch (err) {
    console.error('Error fetching team games:', err);
    res.status(500).json({ error: 'Failed to fetch team games' });
  }
});

// GET /api/teams/:team/:year/vs/:opponent - Get team vs specific opponent stats
router.get('/:team/:year/vs/:opponent', async (req, res) => {
  try {
    const { team, year, opponent } = req.params;
    
    // Get average stats
    const avgKey = `team-vs-team:${team.toUpperCase()}:vs:${opponent.toUpperCase()}:average`;
    
    // Get game-by-game stats
    const gamesPattern = `team-vs-team:${team.toUpperCase()}:vs:${opponent.toUpperCase()}:????-??-??`;
    
    const client = getRedisClient();
    const [avgData, gameKeys] = await Promise.all([
      client.get(avgKey),
      getKeysByPattern(gamesPattern)
    ]);
    
    const averageStats = parseRedisData(avgData);
    const games = await getMultipleKeys(gameKeys);
    
    const formattedGames = games.map(game => ({
      date: game.key.split(':').pop(),
      stats: game.data
    })).sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      team: team.toUpperCase(),
      opponent: opponent.toUpperCase(),
      year,
      averageStats,
      games: formattedGames,
      gameCount: formattedGames.length
    });
  } catch (err) {
    console.error('Error fetching team vs team stats:', err);
    res.status(500).json({ error: 'Failed to fetch team vs team stats' });
  }
});

// GET /api/teams/:team/:year/roster - Get team roster (all players)
router.get('/:team/:year/roster', async (req, res) => {
  try {
    const { team, year } = req.params;
    
    const pattern = `player:${team.toUpperCase()}-*-${year}:average`;
    const keys = await getKeysByPattern(pattern);
    const players = await getMultipleKeys(keys);
    
    const roster = players.map(player => {
      const keyParts = player.key.split(':');
      const playerInfo = keyParts[1].split('-');
      const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      
      return {
        name,
        stats: player.data
      };
    });
    
    res.json({
      team: team.toUpperCase(),
      year,
      roster,
      playerCount: roster.length
    });
  } catch (err) {
    console.error('Error fetching team roster:', err);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});

module.exports = router;
