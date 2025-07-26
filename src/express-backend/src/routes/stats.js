const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// GET /api/stats/summary - Get overall database summary
router.get('/summary', async (req, res) => {
  try {
    const { year = '2025' } = req.query;
    
    const [
      playerKeys,
      teamKeys,
      playerVsTeamKeys,
      teamVsTeamKeys
    ] = await Promise.all([
      getKeysByPattern(`player:*-${year}:average`),
      getKeysByPattern(`team:*:${year}:average`),
      getKeysByPattern(`player-vs-team:*-${year}:vs:*:average`),
      getKeysByPattern(`team-vs-team:*:vs:*:average`)
    ]);
    
    res.json({
      year,
      summary: {
        totalPlayers: playerKeys.length,
        totalTeams: teamKeys.length,
        totalPlayerVsTeamMatchups: playerVsTeamKeys.length,
        totalTeamVsTeamMatchups: teamVsTeamKeys.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching stats summary:', err);
    res.status(500).json({ error: 'Failed to fetch stats summary' });
  }
});

// GET /api/stats/leaders - Get statistical leaders
router.get('/leaders', async (req, res) => {
  try {
    const { category = 'batting', stat, team, year = '2025', limit = 10 } = req.query;
    
    let pattern;
    if (team) {
      pattern = `player:${team.toUpperCase()}-*-${year}:average`;
    } else {
      pattern = `player:*-${year}:average`;
    }
    
    const keys = await getKeysByPattern(pattern);
    const players = await getMultipleKeys(keys);
    
    // Filter and sort based on requested stat
    let validPlayers = players.filter(player => {
      const stats = player.data[category];
      return stats && stats[stat] !== undefined && stats[stat] !== null;
    });
    
    // Sort by stat (descending for most stats, ascending for ERA)
    const isAscending = stat === 'era';
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
        fullStats: player.data[category]
      };
    });
    
    res.json({
      category,
      stat,
      leaders,
      count: leaders.length,
      filters: { team, year }
    });
  } catch (err) {
    console.error('Error fetching leaders:', err);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
});

// GET /api/stats/search - Search players and teams
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all', year = '2025', limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const results = {
      players: [],
      teams: []
    };
    
    const searchTerm = q.toUpperCase().replace(/\s+/g, '_');
    
    // Search players
    if (type === 'all' || type === 'players') {
      const playerPattern = `player:*-${year}:average`;
      const playerKeys = await getKeysByPattern(playerPattern);
      
      const matchingPlayerKeys = playerKeys.filter(key => 
        key.toUpperCase().includes(searchTerm)
      ).slice(0, parseInt(limit));
      
      const players = await getMultipleKeys(matchingPlayerKeys);
      
      results.players = players.map(player => {
        const keyParts = player.key.split(':');
        const playerInfo = keyParts[1].split('-');
        const team = playerInfo[0];
        const name = playerInfo.slice(1, -1).join(' ').replace(/_/g, ' ');
        
        return {
          name,
          team,
          year: playerInfo[playerInfo.length - 1],
          stats: player.data
        };
      });
    }
    
    // Search teams
    if (type === 'all' || type === 'teams') {
      const teamPattern = `team:*:${year}:average`;
      const teamKeys = await getKeysByPattern(teamPattern);
      
      const matchingTeamKeys = teamKeys.filter(key => 
        key.toUpperCase().includes(searchTerm)
      ).slice(0, parseInt(limit));
      
      const teams = await getMultipleKeys(matchingTeamKeys);
      
      results.teams = teams.map(team => {
        const keyParts = team.key.split(':');
        const teamName = keyParts[1];
        
        return {
          team: teamName,
          year: keyParts[2],
          stats: team.data
        };
      });
    }
    
    res.json({
      query: q,
      type,
      results,
      counts: {
        players: results.players.length,
        teams: results.teams.length,
        total: results.players.length + results.teams.length
      }
    });
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// GET /api/stats/compare - Compare players or teams
router.post('/compare', async (req, res) => {
  try {
    const { entities, type = 'players', year = '2025' } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length < 2) {
      return res.status(400).json({ error: 'Must provide at least 2 entities to compare' });
    }
    
    const comparisons = [];
    
    for (const entity of entities) {
      let key;
      if (type === 'players') {
        const { team, name } = entity;
        const formattedName = name.replace(/\s+/g, '_');
        key = `player:${team.toUpperCase()}-${formattedName}-${year}:average`;
      } else if (type === 'teams') {
        const { team } = entity;
        key = `team:${team.toUpperCase()}:${year}:average`;
      }
      
      const client = getRedisClient();
      const data = await client.get(key);
      const stats = parseRedisData(data);
      
      if (stats) {
        comparisons.push({
          entity,
          stats,
          key
        });
      }
    }
    
    res.json({
      type,
      year,
      comparisons,
      count: comparisons.length
    });
  } catch (err) {
    console.error('Error comparing:', err);
    res.status(500).json({ error: 'Failed to compare entities' });
  }
});

module.exports = router;
