const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// GET /api/players - Get all players with optional filters
router.get('/', async (req, res) => {
  try {
    const { team, year = '2025', limit = 50 } = req.query;
    
    let pattern;
    if (team) {
      pattern = `player:${team.toUpperCase()}-*-${year}:average`;
    } else {
      pattern = `player:*-${year}:average`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));
    const players = await getMultipleKeys(limitedKeys);
    
    // Format response
    const formattedPlayers = players.map(player => {
      const keyParts = player.key.split(':');
      const playerInfo = keyParts[1].split('-');
      const team = playerInfo[0];
      const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      
      return {
        team,
        name,
        year: playerInfo[playerInfo.length - 1],
        stats: player.data,
        key: player.key
      };
    });
    
    res.json({
      players: formattedPlayers,
      count: formattedPlayers.length,
      total: keys.length
    });
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET /api/players/:team/:name/:year - Get specific player season stats
router.get('/:team/:name/:year', async (req, res) => {
  try {
    const { team, name, year } = req.params;
    const formattedName = name.replace(/\s+/g, '_');
    const playerKey = `player:${team.toUpperCase()}-${formattedName}-${year}:average`;
    
    const client = getRedisClient();
    const data = await client.get(playerKey);
    const playerStats = parseRedisData(data);
    
    if (!playerStats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      team: team.toUpperCase(),
      name: name.replace(/_/g, ' '),
      year,
      stats: playerStats
    });
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// GET /api/players/:team/:name/:year/games - Get player game-by-game stats
router.get('/:team/:name/:year/games', async (req, res) => {
  try {
    const { team, name, year } = req.params;
    const { startDate, endDate, limit = 20 } = req.query;
    const formattedName = name.replace(/\s+/g, '_');
    
    let pattern = `player:${team.toUpperCase()}-${formattedName}-${year}:????-??-??`;
    
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
      opponent: game.data.opponent,
      homeAway: game.data.homeAway,
      stats: game.data
    }));
    
    res.json({
      player: {
        team: team.toUpperCase(),
        name: name.replace(/_/g, ' '),
        year
      },
      games: formattedGames,
      count: formattedGames.length,
      total: filteredKeys.length
    });
  } catch (err) {
    console.error('Error fetching player games:', err);
    res.status(500).json({ error: 'Failed to fetch player games' });
  }
});

// GET /api/players/:team/:name/:year/vs/:opponent - Get player vs specific team stats
router.get('/:team/:name/:year/vs/:opponent', async (req, res) => {
  try {
    const { team, name, year, opponent } = req.params;
    const formattedName = name.replace(/\s+/g, '_');
    
    // Get average stats
    const avgKey = `player-vs-team:${team.toUpperCase()}-${formattedName}-${year}:vs:${opponent.toUpperCase()}:average`;
    
    // Get game-by-game stats
    const gamesPattern = `player-vs-team:${team.toUpperCase()}-${formattedName}-${year}:vs:${opponent.toUpperCase()}:????-??-??`;
    
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
      player: {
        team: team.toUpperCase(),
        name: name.replace(/_/g, ' '),
        year
      },
      opponent: opponent.toUpperCase(),
      averageStats,
      games: formattedGames,
      gameCount: formattedGames.length
    });
  } catch (err) {
    console.error('Error fetching player vs team stats:', err);
    res.status(500).json({ error: 'Failed to fetch player vs team stats' });
  }
});

module.exports = router;
