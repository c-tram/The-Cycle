const express = require('express');
const router = express.Router();

// GET /api/v2/mlb-live/schedule/:date - Proxy MLB Stats API
router.get('/schedule/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    console.log(`🔴 Fetching live MLB games for date: ${date}`);
    
    // Import fetch dynamically since we're in a CommonJS environment
    const fetch = (await import('node-fetch')).default;
    
    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore,team,game(content(summary))`;
    
    const response = await fetch(mlbApiUrl);
    const data = await response.json();
    
    if (data.dates && data.dates.length > 0) {
      const games = data.dates[0].games.map(game => ({
        id: game.gamePk,
        gameDate: game.gameDate,
        gameTime: new Date(game.gameDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        scheduledTime: new Date(game.gameDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        status: game.status.detailedState,
        statusCode: game.status.statusCode,
        inning: game.linescore && game.linescore.currentInning ? 
          `${game.linescore.currentInningOrdinal || ''} ${game.linescore.inningHalf || ''}`.trim() : null,
        homeTeam: {
          id: game.teams.home.team.id,
          name: game.teams.home.team.name,
          abbreviation: game.teams.home.team.abbreviation
        },
        awayTeam: {
          id: game.teams.away.team.id,
          name: game.teams.away.team.name,
          abbreviation: game.teams.away.team.abbreviation
        },
        homeScore: game.teams.home.score || 0,
        awayScore: game.teams.away.score || 0,
        venue: game.venue?.name,
        isLive: game.status.statusCode === 'I' || game.status.statusCode === 'IR',
        isFinal: game.status.statusCode === 'F' || game.status.statusCode === 'O',
        mlbGameData: game
      }));
      
      console.log(`⚾ Found ${games.length} live MLB games for ${date}`);
      
      res.json({
        games,
        count: games.length,
        date,
        source: 'MLB Stats API',
        lastUpdated: new Date().toISOString()
      });
    } else {
      console.log(`📅 No games scheduled for ${date}`);
      res.json({
        games: [],
        count: 0,
        date,
        message: `No games scheduled for ${date}`,
        source: 'MLB Stats API',
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error fetching live MLB games:', error);
    res.status(500).json({ 
      error: 'Failed to fetch live MLB games',
      details: error.message,
      source: 'MLB Stats API'
    });
  }
});

// GET /api/v2/mlb-live/boxscore/:gameId - Get detailed boxscore with player stats
router.get('/boxscore/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    console.log(`🏆 Fetching detailed boxscore for game: ${gameId}`);
    
    // Import fetch dynamically
    const fetch = (await import('node-fetch')).default;
    
    // Get detailed boxscore with player stats and play-by-play
    const mlbApiUrl = `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`;
    
    const response = await fetch(mlbApiUrl);
    const data = await response.json();
    
    if (data.gameData && data.liveData) {
      const gameData = data.gameData;
      const liveData = data.liveData;
      
      // Extract batting stats
      const battingStats = {
        away: extractBattingStats(liveData.boxscore?.teams?.away),
        home: extractBattingStats(liveData.boxscore?.teams?.home)
      };
      
      // Extract pitching stats  
      const pitchingStats = {
        away: extractPitchingStats(liveData.boxscore?.teams?.away),
        home: extractPitchingStats(liveData.boxscore?.teams?.home)
      };
      
      // Extract play-by-play
      const playByPlay = liveData.plays?.allPlays?.map(play => ({
        inning: play.about?.inning,
        halfInning: play.about?.halfInning,
        description: play.result?.description,
        playType: play.result?.type,
        rbi: play.result?.rbi,
        awayScore: play.result?.awayScore,
        homeScore: play.result?.homeScore,
        batter: play.matchup?.batter?.fullName,
        pitcher: play.matchup?.pitcher?.fullName,
        count: play.count
      })) || [];
      
      res.json({
        gameId: gameData.game.pk,
        status: gameData.status.detailedState,
        teams: {
          away: {
            id: gameData.teams.away.id,
            name: gameData.teams.away.name,
            abbreviation: gameData.teams.away.abbreviation
          },
          home: {
            id: gameData.teams.home.id,
            name: gameData.teams.home.name,
            abbreviation: gameData.teams.home.abbreviation
          }
        },
        battingStats,
        pitchingStats,
        playByPlay,
        linescore: liveData.linescore
      });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    console.error('Error fetching detailed boxscore:', error);
    res.status(500).json({ 
      error: 'Failed to fetch detailed boxscore',
      details: error.message 
    });
  }
});

// Helper function to extract batting stats
function extractBattingStats(teamBoxscore) {
  if (!teamBoxscore?.players) return [];
  
  return Object.values(teamBoxscore.players)
    .filter(player => player.stats?.batting)
    .map(player => ({
      playerId: player.person.id,
      name: player.person.fullName,
      position: player.position?.abbreviation,
      battingOrder: player.battingOrder,
      stats: {
        atBats: player.stats.batting.atBats || 0,
        runs: player.stats.batting.runs || 0,
        hits: player.stats.batting.hits || 0,
        rbi: player.stats.batting.rbi || 0,
        baseOnBalls: player.stats.batting.baseOnBalls || 0,
        strikeOuts: player.stats.batting.strikeOuts || 0,
        leftOnBase: player.stats.batting.leftOnBase || 0,
        avg: player.seasonStats?.batting?.avg || '.000'
      }
    }));
}

// Helper function to extract pitching stats
function extractPitchingStats(teamBoxscore) {
  if (!teamBoxscore?.players) return [];
  
  return Object.values(teamBoxscore.players)
    .filter(player => player.stats?.pitching)
    .map(player => ({
      playerId: player.person.id,
      name: player.person.fullName,
      stats: {
        inningsPitched: player.stats.pitching.inningsPitched || '0.0',
        hits: player.stats.pitching.hits || 0,
        runs: player.stats.pitching.runs || 0,
        earnedRuns: player.stats.pitching.earnedRuns || 0,
        baseOnBalls: player.stats.pitching.baseOnBalls || 0,
        strikeOuts: player.stats.pitching.strikeOuts || 0,
        pitchCount: player.stats.pitching.numberOfPitches || 0,
        era: player.seasonStats?.pitching?.era || '0.00'
      }
    }));
}

// GET /api/v2/mlb-live/today - Get today's live games
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  req.params.date = today;
  return router.handle(req, res, () => {});
});

module.exports = router;
