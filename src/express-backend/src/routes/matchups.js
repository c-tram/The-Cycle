const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// GET /api/matchups/players - Get all player vs team matchups
router.get('/players', async (req, res) => {
  try {
    const { team, opponent, year = '2025', limit = 50 } = req.query;
    
    let pattern;
    if (team && opponent) {
      pattern = `player-vs-team:${team.toUpperCase()}-*-${year}:vs:${opponent.toUpperCase()}:average`;
    } else if (team) {
      pattern = `player-vs-team:${team.toUpperCase()}-*-${year}:vs:*:average`;
    } else if (opponent) {
      pattern = `player-vs-team:*-${year}:vs:${opponent.toUpperCase()}:average`;
    } else {
      pattern = `player-vs-team:*-${year}:vs:*:average`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));
    const matchups = await getMultipleKeys(limitedKeys);
    
    const formattedMatchups = matchups.map(matchup => {
      const keyParts = matchup.key.split(':');
      const playerTeamInfo = keyParts[1].split('-');
      const team = playerTeamInfo[0];
      const name = playerTeamInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
      const opponent = keyParts[3];
      
      return {
        player: {
          team,
          name,
          year: playerTeamInfo[playerTeamInfo.length - 1]
        },
        opponent,
        stats: matchup.data
      };
    });
    
    res.json({
      matchups: formattedMatchups,
      count: formattedMatchups.length,
      total: keys.length
    });
  } catch (err) {
    console.error('Error fetching player matchups:', err);
    res.status(500).json({ error: 'Failed to fetch player matchups' });
  }
});

// GET /api/matchups/teams - Get all team vs team matchups
router.get('/teams', async (req, res) => {
  try {
    const { team, opponent, year = '2025', limit = 50 } = req.query;
    
    let pattern;
    if (team && opponent) {
      pattern = `team-vs-team:${team.toUpperCase()}:vs:${opponent.toUpperCase()}:average`;
    } else if (team) {
      pattern = `team-vs-team:${team.toUpperCase()}:vs:*:average`;
    } else if (opponent) {
      pattern = `team-vs-team:*:vs:${opponent.toUpperCase()}:average`;
    } else {
      pattern = `team-vs-team:*:vs:*:average`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));
    const matchups = await getMultipleKeys(limitedKeys);
    
    const formattedMatchups = matchups.map(matchup => {
      const keyParts = matchup.key.split(':');
      const team = keyParts[1];
      const opponent = keyParts[3];
      
      return {
        team,
        opponent,
        stats: matchup.data
      };
    });
    
    res.json({
      matchups: formattedMatchups,
      count: formattedMatchups.length,
      total: keys.length
    });
  } catch (err) {
    console.error('Error fetching team matchups:', err);
    res.status(500).json({ error: 'Failed to fetch team matchups' });
  }
});

// GET /api/matchups/players/:team/:name/:year/vs/:opponent/games - Get specific player vs team game history
router.get('/players/:team/:name/:year/vs/:opponent/games', async (req, res) => {
  try {
    const { team, name, year, opponent } = req.params;
    const { limit = 10 } = req.query;
    const formattedName = name.replace(/\s+/g, '_');
    
    const pattern = `player-vs-team:${team.toUpperCase()}-${formattedName}-${year}:vs:${opponent.toUpperCase()}:????-??-??-*`;
    const keys = await getKeysByPattern(pattern);
    
    // Sort by date (newest first) and limit
    keys.sort((a, b) => {
      const dateA = a.split(':').pop();
      const dateB = b.split(':').pop();
      return dateB.localeCompare(dateA);
    });
    
    const limitedKeys = keys.slice(0, parseInt(limit));
    const games = await getMultipleKeys(limitedKeys);
    
    const formattedGames = games.map(game => ({
      date: game.key.split(':').pop(),
      stats: game.data
    }));
    
    res.json({
      player: {
        team: team.toUpperCase(),
        name: name.replace(/_/g, ' '),
        year
      },
      opponent: opponent.toUpperCase(),
      games: formattedGames,
      count: formattedGames.length
    });
  } catch (err) {
    console.error('Error fetching player vs team games:', err);
    res.status(500).json({ error: 'Failed to fetch player vs team games' });
  }
});

// GET /api/matchups/teams/:team/vs/:opponent/games - Get specific team vs team game history
router.get('/teams/:team/vs/:opponent/games', async (req, res) => {
  try {
    const { team, opponent } = req.params;
    const { year = '2025', limit = 10 } = req.query;
    
    const pattern = `team-vs-team:${team.toUpperCase()}:vs:${opponent.toUpperCase()}:????-??-??-*`;
    const keys = await getKeysByPattern(pattern);
    
    // Sort by date (newest first) and limit
    keys.sort((a, b) => {
      const dateA = a.split(':').pop();
      const dateB = b.split(':').pop();
      return dateB.localeCompare(dateA);
    });
    
    const limitedKeys = keys.slice(0, parseInt(limit));
    const games = await getMultipleKeys(limitedKeys);
    
    const formattedGames = games.map(game => ({
      date: game.key.split(':').pop(),
      stats: game.data
    }));
    
    res.json({
      team: team.toUpperCase(),
      opponent: opponent.toUpperCase(),
      year,
      games: formattedGames,
      count: formattedGames.length
    });
  } catch (err) {
    console.error('Error fetching team vs team games:', err);
    res.status(500).json({ error: 'Failed to fetch team vs team games' });
  }
});

module.exports = router;
