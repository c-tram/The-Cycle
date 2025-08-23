const express = require('express');
const { getKeysByPattern, getMultipleKeys } = require('../utils/redis');
const router = express.Router();

/**
 * GET /api/v2/splits/discover
 * Discover all available splits data across all players
 */
router.get('/discover', async (req, res) => {
  try {
    console.log('🔍 Discovering all available splits data...');
    
    // Get all split keys
    const allSplitKeys = await getKeysByPattern('split:*');
    console.log(`📊 Found ${allSplitKeys.length} total split keys`);
    
    // Analyze the data structure
    const analysis = {
      totalKeys: allSplitKeys.length,
      splitTypes: {},
      players: {},
      teams: new Set(),
      seasons: new Set(),
      sampleKeys: allSplitKeys.slice(0, 20)
    };
    
    // Parse each key to extract information
    allSplitKeys.forEach(key => {
      const parts = key.split(':');
      const splitType = parts[1];
      
      // Count split types
      analysis.splitTypes[splitType] = (analysis.splitTypes[splitType] || 0) + 1;
      
      // Extract player info
      if (parts[2] && parts[2].includes('-')) {
        const playerParts = parts[2].split('-');
        if (playerParts.length >= 3) {
          const team = playerParts[0];
          const playerName = playerParts.slice(1, -1).join('-');
          const season = playerParts[playerParts.length - 1];
          
          analysis.teams.add(team);
          analysis.seasons.add(season);
          
          const playerId = `${team}-${playerName}`;
          if (!analysis.players[playerId]) {
            analysis.players[playerId] = {
              team,
              name: playerName.replace(/_/g, ' '),
              season,
              splitTypes: new Set(),
              keyCount: 0
            };
          }
          analysis.players[playerId].splitTypes.add(splitType);
          analysis.players[playerId].keyCount++;
        }
      }
    });
    
    // Convert sets to arrays and get top players by split count
    analysis.teams = Array.from(analysis.teams).sort();
    analysis.seasons = Array.from(analysis.seasons).sort();
    
    const playerArray = Object.entries(analysis.players).map(([id, data]) => ({
      id,
      ...data,
      splitTypes: Array.from(data.splitTypes)
    })).sort((a, b) => b.keyCount - a.keyCount);
    
    analysis.topPlayers = playerArray.slice(0, 100); // Increased from 50 to 100
    analysis.allPlayers = playerArray; // Include ALL players for search
    analysis.uniquePlayers = playerArray.length;
    
    console.log(`✅ Analysis complete: ${analysis.uniquePlayers} players, ${analysis.teams.length} teams, ${Object.keys(analysis.splitTypes).length} split types`);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalSplitKeys: analysis.totalKeys,
        uniquePlayers: analysis.uniquePlayers,
        teams: analysis.teams.length,
        splitTypes: Object.keys(analysis.splitTypes).length
      },
      splitTypes: analysis.splitTypes,
      teams: analysis.teams,
      seasons: analysis.seasons,
      topPlayers: analysis.topPlayers,
      sampleKeys: analysis.sampleKeys
    });
    
  } catch (error) {
    console.error('Error discovering splits data:', error);
    res.status(500).json({ error: 'Failed to discover splits data', details: error.message });
  }
});

module.exports = router;
