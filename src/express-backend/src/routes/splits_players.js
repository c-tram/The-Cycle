const express = require('express');
const { getKeysByPattern, getMultipleKeys } = require('../utils/redis');
const router = express.Router();

/**
 * GET /api/v2/splits/available-players
 * Get all players with splits data
 */
router.get('/available-players', async (req, res) => {
  try {
    console.log('🔍 Getting all players with splits data...');
    
    // Get all split keys and extract unique players
    const allSplitKeys = await getKeysByPattern('split:*');
    const players = new Map();
    
    allSplitKeys.forEach(key => {
      const parts = key.split(':');
      if (parts[2] && parts[2].includes('-')) {
        const playerParts = parts[2].split('-');
        if (playerParts.length >= 3) {
          const team = playerParts[0];
          const playerName = playerParts.slice(1, -1).join('-');
          const season = playerParts[playerParts.length - 1];
          
          const playerId = `${team}-${playerName}-${season}`;
          if (!players.has(playerId)) {
            players.set(playerId, {
              id: playerId,
              team,
              name: playerName.replace(/_/g, ' '),
              season,
              keyCount: 0
            });
          }
          players.get(playerId).keyCount++;
        }
      }
    });
    
    const playerArray = Array.from(players.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Found ${playerArray.length} players with splits data`);
    
    res.json({
      success: true,
      count: playerArray.length,
      players: playerArray
    });
    
  } catch (error) {
    console.error('Error getting available players:', error);
    res.status(500).json({ error: 'Failed to get available players' });
  }
});

/**
 * GET /api/v2/splits/vs-pitcher/:team/:player/:season
 * Get batter vs pitcher matchups
 */
router.get('/vs-pitcher/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Find all batter-pitcher matchup splits
    const pattern = `split:batter-pitcher:${team}-${playerName}-${season}:vs:*`;
    const matchupKeys = await getKeysByPattern(pattern);
    
    if (matchupKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        matchups: {},
        totalMatchups: 0
      });
    }
    
    const matchupData = await getMultipleKeys(matchupKeys);
    const matchups = {};
    
    // Parse matchup data
    for (const item of matchupData) {
      if (item && item.data) {
        const matchup = item.key.match(/vs:([^:]+)-([^:]+):([^:]+)$/);
        if (matchup) {
          const [, pitcherTeam, pitcherName, homeAway] = matchup;
          const pitcherId = `${pitcherTeam}-${pitcherName}`;
          
          if (!matchups[pitcherId]) {
            matchups[pitcherId] = {
              pitcher: pitcherName.replace(/_/g, ' '),
              pitcherTeam: pitcherTeam,
              home: null,
              away: null
            };
          }
          matchups[pitcherId][homeAway] = item.data;
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      matchups,
      totalMatchups: Object.keys(matchups).length
    });
    
  } catch (error) {
    console.error('Error fetching batter-pitcher matchups:', error);
    res.status(500).json({ error: 'Failed to fetch batter-pitcher matchups' });
  }
});

module.exports = router;
