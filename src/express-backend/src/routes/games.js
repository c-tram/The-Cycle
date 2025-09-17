const express = require('express');
const router = express.Router();
const { getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// GET /api/v2/games/recent - Get recent games for scoreboard
router.get('/recent', async (req, res) => {
  try {
    const { date, limit = 15 } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`🎮 Fetching recent games for date: ${targetDate}`);
    
    // Get all team games for the specified date (including game IDs in the key)
    const teamGamePattern = `team:*:2025:${targetDate}*`;
    const teamGameKeys = await getKeysByPattern(teamGamePattern);
    
    if (!teamGameKeys || teamGameKeys.length === 0) {
      console.log(`📅 No games found for ${targetDate}`);
      return res.json({ 
        games: [], 
        count: 0, 
        date: targetDate,
        message: 'No games found for this date'
      });
    }
    
    // Get the game data
    const teamGames = await getMultipleKeys(teamGameKeys);
    
    // Group games by gameId to avoid duplicates (since we get both home/away team records)
    const gameMap = new Map();
    
    teamGames.forEach(game => {
      if (!game || !game.data || !game.data.gameInfo) return;
      
      const gameId = game.data.gameInfo.gameId;
      if (!gameId) return;
      
      const gameInfo = game.data.gameInfo;
      const teamCode = game.key.split(':')[1]; // Extract team from key: team:WSH:2025:2025-05-10-777980
      const isHome = gameInfo.homeAway === 'home';
      
      if (!gameMap.has(gameId)) {
        gameMap.set(gameId, {
          id: gameId,
          gameDate: gameInfo.date || gameInfo.officialDate,
          scheduledTime: gameInfo.startLocal || gameInfo.startUtc,
          gameTime: gameInfo.startLocal || gameInfo.startUtc,
          status: gameInfo.result ? 'Final' : 'Scheduled',
          inning: gameInfo.inning || null,
          homeTeam: {
            id: isHome ? teamCode : gameInfo.opponent,
            name: isHome ? teamCode : gameInfo.opponent,
            abbreviation: isHome ? teamCode : gameInfo.opponent
          },
          awayTeam: {
            id: !isHome ? teamCode : gameInfo.opponent,
            name: !isHome ? teamCode : gameInfo.opponent,
            abbreviation: !isHome ? teamCode : gameInfo.opponent
          },
          homeScore: null,
          awayScore: null,
          venue: gameInfo.venue
        });
      }
      
      const existingGame = gameMap.get(gameId);
      
      // Add scores based on team
      if (isHome) {
        existingGame.homeScore = gameInfo.runsScored || 0;
        existingGame.awayScore = gameInfo.runsAllowed || 0;
      } else {
        existingGame.awayScore = gameInfo.runsScored || 0;
        existingGame.homeScore = gameInfo.runsAllowed || 0;
      }
    });
    
    // Convert map to array and sort by game time
    let games = Array.from(gameMap.values());
    
    // Sort by scheduled time
    games.sort((a, b) => {
      const timeA = a.scheduledTime || '00:00';
      const timeB = b.scheduledTime || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    // Apply limit
    if (limit && !isNaN(limit)) {
      games = games.slice(0, parseInt(limit));
    }
    
    console.log(`⚾ Found ${games.length} games for ${targetDate}`);
    
    res.json({
      games,
      count: games.length,
      date: targetDate,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching recent games:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent games',
      details: error.message 
    });
  }
});

// GET /api/v2/games/live - Get currently live games
router.get('/live', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's games first (including game IDs in the key)
    const teamGamePattern = `team:*:2025:${today}*`;
    const teamGameKeys = await getKeysByPattern(teamGamePattern);
    
    if (!teamGameKeys || teamGameKeys.length === 0) {
      return res.json({ 
        games: [], 
        count: 0,
        message: 'No live games found'
      });
    }
    
    const teamGames = await getMultipleKeys(teamGameKeys);
    const gameMap = new Map();
    
    teamGames.forEach(game => {
      if (!game || !game.data || !game.data.gameInfo) return;
      
      const gameId = game.data.gameInfo.gameId;
      const status = game.data.gameInfo.result ? 'Final' : 'In Progress';
      
      // Only include games that are currently live (you could enhance this logic)
      if (status !== 'In Progress') {
        return;
      }
      
      if (!gameMap.has(gameId)) {
        const gameInfo = game.data.gameInfo;
        const teamCode = game.key.split(':')[1]; // Extract team from key
        const isHome = gameInfo.homeAway === 'home';
        
        gameMap.set(gameId, {
          id: gameId,
          status: status,
          inning: gameInfo.inning,
          homeTeam: {
            id: isHome ? teamCode : gameInfo.opponent,
            name: isHome ? teamCode : gameInfo.opponent,
            abbreviation: isHome ? teamCode : gameInfo.opponent
          },
          awayTeam: {
            id: !isHome ? teamCode : gameInfo.opponent,
            name: !isHome ? teamCode : gameInfo.opponent,
            abbreviation: !isHome ? teamCode : gameInfo.opponent
          },
          homeScore: isHome ? (gameInfo.runsScored || 0) : (gameInfo.runsAllowed || 0),
          awayScore: !isHome ? (gameInfo.runsScored || 0) : (gameInfo.runsAllowed || 0)
        });
      }
    });
    
    const liveGames = Array.from(gameMap.values());
    
    res.json({
      games: liveGames,
      count: liveGames.length,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching live games:', error);
    res.status(500).json({ 
      error: 'Failed to fetch live games',
      details: error.message 
    });
  }
});

// GET /api/v2/games/schedule/:date - Get games for specific date
router.get('/schedule/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { limit = 50 } = req.query;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    console.log(`📅 Fetching schedule for date: ${date}`);
    
    const teamGamePattern = `team:*:2025:${date}`;
    const teamGameKeys = await getKeysByPattern(teamGamePattern);
    
    if (!teamGameKeys || teamGameKeys.length === 0) {
      return res.json({ 
        games: [], 
        count: 0, 
        date,
        message: `No games scheduled for ${date}`
      });
    }
    
    const teamGames = await getMultipleKeys(teamGameKeys);
    const gameMap = new Map();
    
    teamGames.forEach(game => {
      if (!game || !game.data || !game.data.gameInfo) return;
      
      const gameId = game.data.gameInfo.gameId || game.data.gameInfo.gamePk;
      if (!gameId) return;
      
      if (!gameMap.has(gameId)) {
        const gameInfo = game.data.gameInfo;
        const teamCode = game.key.split(':')[1]; // Extract team from key
        const isHome = gameInfo.homeAway === 'home';
        
        gameMap.set(gameId, {
          id: gameId,
          gameDate: gameInfo.date || gameInfo.officialDate,
          scheduledTime: gameInfo.startLocal || gameInfo.startUtc,
          status: gameInfo.result ? 'Final' : 'Scheduled',
          homeTeam: {
            id: isHome ? teamCode : gameInfo.opponent,
            name: isHome ? teamCode : gameInfo.opponent,
            abbreviation: isHome ? teamCode : gameInfo.opponent
          },
          awayTeam: {
            id: !isHome ? teamCode : gameInfo.opponent,
            name: !isHome ? teamCode : gameInfo.opponent,
            abbreviation: !isHome ? teamCode : gameInfo.opponent
          },
          homeScore: isHome ? (gameInfo.runsScored || 0) : (gameInfo.runsAllowed || 0),
          awayScore: !isHome ? (gameInfo.runsScored || 0) : (gameInfo.runsAllowed || 0),
          venue: gameInfo.venue
        });
      }
    });
    
    let games = Array.from(gameMap.values());
    games.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
    
    if (limit && !isNaN(limit)) {
      games = games.slice(0, parseInt(limit));
    }
    
    res.json({
      games,
      count: games.length,
      date,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({ 
      error: 'Failed to fetch schedule',
      details: error.message 
    });
  }
});

// GET /api/v2/games/range - Get games for a date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Both startDate and endDate are required (YYYY-MM-DD format)' 
      });
    }
    
    // Validate date formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    console.log(`📅 Fetching games from ${startDate} to ${endDate}`);
    
    const allGames = [];
    const gameMap = new Map();
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Ensure we don't query too many days to avoid performance issues
    const daysDiff = Math.ceil((endDateObj - currentDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({ 
        error: 'Date range too large. Maximum 90 days allowed.' 
      });
    }
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        const teamGamePattern = `team:*:2025:${dateStr}*`;
        const teamGameKeys = await getKeysByPattern(teamGamePattern);
        
        if (teamGameKeys && teamGameKeys.length > 0) {
          const teamGames = await getMultipleKeys(teamGameKeys);
          
          teamGames.forEach(game => {
            if (!game || !game.data || !game.data.gameInfo) return;
            
            const gameId = game.data.gameInfo.gameId || game.data.gameInfo.gamePk;
            if (!gameId) return;
            
            const gameInfo = game.data.gameInfo;
            const teamCode = game.key.split(':')[1]; // Extract team from key
            const isHome = gameInfo.homeAway === 'home';
            
            if (!gameMap.has(gameId)) {
              gameMap.set(gameId, {
                id: gameId,
                gameDate: gameInfo.date || gameInfo.officialDate || dateStr,
                scheduledTime: gameInfo.startLocal || gameInfo.startUtc,
                gameTime: gameInfo.startLocal || gameInfo.startUtc,
                status: gameInfo.result ? 'Final' : 'Scheduled',
                inning: gameInfo.inning || null,
                homeTeam: {
                  id: isHome ? teamCode : gameInfo.opponent,
                  name: isHome ? teamCode : gameInfo.opponent,
                  abbreviation: isHome ? teamCode : gameInfo.opponent
                },
                awayTeam: {
                  id: !isHome ? teamCode : gameInfo.opponent,
                  name: !isHome ? teamCode : gameInfo.opponent,
                  abbreviation: !isHome ? teamCode : gameInfo.opponent
                },
                homeScore: null,
                awayScore: null,
                venue: gameInfo.venue
              });
            }
            
            const existingGame = gameMap.get(gameId);
            
            // Add scores based on team
            if (isHome) {
              existingGame.homeScore = gameInfo.runsScored || 0;
              existingGame.awayScore = gameInfo.runsAllowed || 0;
            } else {
              existingGame.awayScore = gameInfo.runsScored || 0;
              existingGame.homeScore = gameInfo.runsAllowed || 0;
            }
          });
        }
      } catch (dayError) {
        console.log(`No games found for ${dateStr}`);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Convert map to array and sort by date and time
    let games = Array.from(gameMap.values());
    
    games.sort((a, b) => {
      const dateTimeA = new Date(a.gameDate + ' ' + (a.scheduledTime || '00:00'));
      const dateTimeB = new Date(b.gameDate + ' ' + (b.scheduledTime || '00:00'));
      return dateTimeB - dateTimeA; // Most recent first
    });
    
    // Apply limit
    if (limit && !isNaN(limit)) {
      games = games.slice(0, parseInt(limit));
    }
    
    console.log(`⚾ Found ${games.length} games from ${startDate} to ${endDate}`);
    
    res.json({
      games,
      count: games.length,
      startDate,
      endDate,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching games range:', error);
    res.status(500).json({ 
      error: 'Failed to fetch games for date range',
      details: error.message 
    });
  }
});

module.exports = router;
