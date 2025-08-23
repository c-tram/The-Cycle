// ============================================================================
// MLB SPLITS API ROUTES v2
// ============================================================================
// Mission: Expose exhaustive situational splits with count & pitch analytics
// Goal: "Testing every possible baseball statistic that is imaginable"
//
// These routes provide access to comprehensive split statistics with deep
// count-based and pitch-level analytics as subcategories within each split.
// ============================================================================

const express = require('express');
const { getKeysByPattern, getMultipleKeys } = require('../utils/redis');
const router = express.Router();

// ============================================================================
// AGGREGATION HELPER FUNCTIONS
// ============================================================================

/**
 * Aggregate multiple split data records into cumulative statistics
 */
function aggregateSplitData(dataArray) {
  if (!dataArray || dataArray.length === 0) {
    return null;
  }

  // Initialize aggregated stats structure
  const aggregated = {
    games: [],
    stats: {
      batting: {
        plateAppearances: 0, atBats: 0, hits: 0, runs: 0, rbi: 0,
        homeRuns: 0, doubles: 0, triples: 0, singles: 0,
        walks: 0, strikeouts: 0, hitByPitch: 0,
        sacrificeFlies: 0, sacrificeHits: 0, stolenBases: 0,
        groundedIntoDoublePlay: 0,
        avg: 0, obp: 0, slg: 0, ops: 0
      }
    },
    playCount: 0,
    lastUpdated: null
  };

  // Process each data item
  for (const item of dataArray) {
    if (!item || !item.data) continue;
    
    const data = item.data;
    
    // Add games
    if (data.games && Array.isArray(data.games)) {
      aggregated.games = aggregated.games.concat(data.games);
    }
    
    // Add play count
    if (data.playCount) {
      aggregated.playCount += data.playCount;
    }
    
    // Update last updated timestamp
    if (data.lastUpdated) {
      if (!aggregated.lastUpdated || new Date(data.lastUpdated) > new Date(aggregated.lastUpdated)) {
        aggregated.lastUpdated = data.lastUpdated;
      }
    }
    
    // Aggregate batting statistics
    if (data.stats && data.stats.batting) {
      const srcBatting = data.stats.batting;
      const destBatting = aggregated.stats.batting;
      
      // Sum counting stats
      destBatting.plateAppearances += srcBatting.plateAppearances || 0;
      destBatting.atBats += srcBatting.atBats || 0;
      destBatting.hits += srcBatting.hits || 0;
      destBatting.runs += srcBatting.runs || 0;
      destBatting.rbi += srcBatting.rbi || 0;
      destBatting.homeRuns += srcBatting.homeRuns || 0;
      destBatting.doubles += srcBatting.doubles || 0;
      destBatting.triples += srcBatting.triples || 0;
      destBatting.singles += srcBatting.singles || 0;
      destBatting.walks += srcBatting.walks || 0;
      destBatting.strikeouts += srcBatting.strikeouts || 0;
      destBatting.hitByPitch += srcBatting.hitByPitch || 0;
      destBatting.sacrificeFlies += srcBatting.sacrificeFlies || 0;
      destBatting.sacrificeHits += srcBatting.sacrificeHits || 0;
      destBatting.stolenBases += srcBatting.stolenBases || 0;
      destBatting.groundedIntoDoublePlay += srcBatting.groundedIntoDoublePlay || 0;
    }
  }

  // Calculate derived statistics
  const batting = aggregated.stats.batting;
  if (batting.atBats > 0) {
    batting.avg = parseFloat((batting.hits / batting.atBats).toFixed(3));
    
    // Calculate slugging percentage
    const totalBases = batting.singles + (batting.doubles * 2) + (batting.triples * 3) + (batting.homeRuns * 4);
    batting.slg = parseFloat((totalBases / batting.atBats).toFixed(3));
  }
  
  if (batting.plateAppearances > 0) {
    // Calculate on-base percentage
    const onBaseEvents = batting.hits + batting.walks + batting.hitByPitch;
    batting.obp = parseFloat((onBaseEvents / batting.plateAppearances).toFixed(3));
    
    // Calculate OPS
    batting.ops = parseFloat((batting.obp + batting.slg).toFixed(3));
  }

  // Remove duplicate games
  aggregated.games = [...new Set(aggregated.games)];

  return aggregated;
}

// ============================================================================
// SPLIT CATEGORIES AND ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/splits/home-away/:team/:player/:season
 * Get home vs away performance splits with full analytics
 */
router.get('/home-away/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Get all home and away splits using pattern matching
    const homePattern = `split:home-away:${team}-${playerName}-${season}:home*`;
    const awayPattern = `split:home-away:${team}-${playerName}-${season}:away*`;
    
    const [homeKeys, awayKeys] = await Promise.all([
      getKeysByPattern(homePattern),
      getKeysByPattern(awayPattern)
    ]);
    
    console.log(`🔍 Searching for patterns:`);
    console.log(`   Home: ${homePattern}`);
    console.log(`   Away: ${awayPattern}`);
    console.log(`🏠 Found ${homeKeys.length} home game keys for ${player}:`, homeKeys);
    console.log(`✈️ Found ${awayKeys.length} away game keys for ${player}:`, awayKeys);
    
    // Get data for all keys
    const [homeData, awayData] = await Promise.all([
      getMultipleKeys(homeKeys),
      getMultipleKeys(awayKeys)
    ]);
    
    console.log(`📊 Raw home data:`, homeData.map(d => ({ 
      key: d.key, 
      games: d.data?.games,
      atBats: d.data?.stats?.batting?.atBats,
      hits: d.data?.stats?.batting?.hits,
      lastUpdated: d.data?.lastUpdated
    })));
    console.log(`📊 Raw away data:`, awayData.map(d => ({ 
      key: d.key, 
      games: d.data?.games,
      atBats: d.data?.stats?.batting?.atBats,
      hits: d.data?.stats?.batting?.hits,
      lastUpdated: d.data?.lastUpdated
    })));
    
    // Aggregate all home games
    const aggregatedHomeStats = aggregateSplitData(homeData);
    
    // Aggregate all away games  
    const aggregatedAwayStats = aggregateSplitData(awayData);
    
    console.log(`📊 Home: ${aggregatedHomeStats?.games?.length || 0} games, Away: ${aggregatedAwayStats?.games?.length || 0} games`);
    
    const result = {
      player: player.replace(/-/g, ' '),
      team,
      season,
      splits: {
        home: aggregatedHomeStats,
        away: aggregatedAwayStats
      },
      summary: generateSplitSummary(aggregatedHomeStats, aggregatedAwayStats)
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching home-away splits:', error);
    res.status(500).json({ error: 'Failed to fetch home-away splits' });
  }
});

/**
 * GET /api/v2/splits/venue/:team/:player/:season
 * Get performance splits by venue with full analytics
 */
router.get('/venue/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Find all venue splits for this player using same pattern as search
    const pattern = `split:venue:${team}-${playerName}-${season}:*`;
    const venueKeys = await getKeysByPattern(pattern);
    
    if (venueKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        venues: [],
        message: 'No venue splits found'
      });
    }
    
    const venueData = await getMultipleKeys(venueKeys);
    const venues = {};
    
    // Parse venue data and AGGREGATE by stadium from array format
    for (const item of venueData) {
      if (item && item.data) {
        const venueMatch = item.key.match(/vs:([^:]+):(home|away):(\d+)$/);
        if (venueMatch) {
          const [, stadium, homeAway, gameId] = venueMatch;
          if (!venues[stadium]) venues[stadium] = {};
          if (!venues[stadium][homeAway]) {
            // Initialize structure for this venue/location
            venues[stadium][homeAway] = {
              games: [],
              stats: { batting: {} }
            };
          }
          
          // Aggregate the game data
          const existing = venues[stadium][homeAway];
          const newData = item.data;
          
          // Add games
          if (newData.games) {
            existing.games = existing.games.concat(newData.games);
          }
          
          // Aggregate batting stats
          if (newData.stats && newData.stats.batting) {
            const existingBatting = existing.stats.batting;
            const newBatting = newData.stats.batting;
            
            existingBatting.atBats = (existingBatting.atBats || 0) + (newBatting.atBats || 0);
            existingBatting.hits = (existingBatting.hits || 0) + (newBatting.hits || 0);
            existingBatting.runs = (existingBatting.runs || 0) + (newBatting.runs || 0);
            existingBatting.rbi = (existingBatting.rbi || 0) + (newBatting.rbi || 0);
            existingBatting.doubles = (existingBatting.doubles || 0) + (newBatting.doubles || 0);
            existingBatting.triples = (existingBatting.triples || 0) + (newBatting.triples || 0);
            existingBatting.homeRuns = (existingBatting.homeRuns || 0) + (newBatting.homeRuns || 0);
            existingBatting.walks = (existingBatting.walks || 0) + (newBatting.walks || 0);
            existingBatting.strikeouts = (existingBatting.strikeouts || 0) + (newBatting.strikeouts || 0);
            existingBatting.plateAppearances = (existingBatting.plateAppearances || 0) + (newBatting.plateAppearances || 0);
            
            // Calculate new averages
            if (existingBatting.atBats > 0) {
              existingBatting.avg = (existingBatting.hits / existingBatting.atBats).toFixed(3);
              const totalBases = existingBatting.hits + existingBatting.doubles + (2 * existingBatting.triples) + (3 * existingBatting.homeRuns);
              existingBatting.slg = (totalBases / existingBatting.atBats).toFixed(3);
            }
            
            if (existingBatting.plateAppearances > 0) {
              existingBatting.obp = ((existingBatting.hits + existingBatting.walks) / existingBatting.plateAppearances).toFixed(3);
              existingBatting.ops = (parseFloat(existingBatting.obp || 0) + parseFloat(existingBatting.slg || 0)).toFixed(3);
            }
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      venues,
      totalVenues: Object.keys(venues).length
    });
  } catch (error) {
    console.error('Error fetching venue splits:', error);
    res.status(500).json({ error: 'Failed to fetch venue splits' });
  }
});

/**
 * GET /api/v2/splits/vs-teams/:team/:player/:season
 * Get performance splits against opposing teams
 */
router.get('/vs-teams/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Find all team matchup splits (including game ID at end)
    const pattern = `split:player-team:${team}-${playerName}-${season}:vs:*`;
    const teamKeys = await getKeysByPattern(pattern);
    
    if (teamKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        opponents: [],
        message: 'No team matchup splits found'
      });
    }
    
    const teamData = await getMultipleKeys(teamKeys);
    const opponents = {};
    
    // Parse team matchup data from array format and AGGREGATE multiple games
    for (const item of teamData) {
      if (item && item.data) {
        const teamMatch = item.key.match(/vs:([^:]+):(home|away):(\d+)$/);
        if (teamMatch) {
          const [, opponent, homeAway, gameId] = teamMatch;
          if (!opponents[opponent]) opponents[opponent] = {};
          if (!opponents[opponent][homeAway]) {
            // Initialize structure for this opponent/location
            opponents[opponent][homeAway] = {
              games: [],
              stats: { batting: {} }
            };
          }
          
          // Aggregate the game data
          const existing = opponents[opponent][homeAway];
          const newData = item.data;
          
          // Add games
          if (newData.games) {
            existing.games = existing.games.concat(newData.games);
          }
          
          // Aggregate batting stats
          if (newData.stats && newData.stats.batting) {
            const existingBatting = existing.stats.batting;
            const newBatting = newData.stats.batting;
            
            existingBatting.atBats = (existingBatting.atBats || 0) + (newBatting.atBats || 0);
            existingBatting.hits = (existingBatting.hits || 0) + (newBatting.hits || 0);
            existingBatting.runs = (existingBatting.runs || 0) + (newBatting.runs || 0);
            existingBatting.rbi = (existingBatting.rbi || 0) + (newBatting.rbi || 0);
            existingBatting.doubles = (existingBatting.doubles || 0) + (newBatting.doubles || 0);
            existingBatting.triples = (existingBatting.triples || 0) + (newBatting.triples || 0);
            existingBatting.homeRuns = (existingBatting.homeRuns || 0) + (newBatting.homeRuns || 0);
            existingBatting.walks = (existingBatting.walks || 0) + (newBatting.walks || 0);
            existingBatting.strikeouts = (existingBatting.strikeouts || 0) + (newBatting.strikeouts || 0);
            existingBatting.plateAppearances = (existingBatting.plateAppearances || 0) + (newBatting.plateAppearances || 0);
            
            // Calculate new averages
            if (existingBatting.atBats > 0) {
              existingBatting.avg = (existingBatting.hits / existingBatting.atBats).toFixed(3);
              const totalBases = existingBatting.hits + existingBatting.doubles + (2 * existingBatting.triples) + (3 * existingBatting.homeRuns);
              existingBatting.slg = (totalBases / existingBatting.atBats).toFixed(3);
            }
            
            if (existingBatting.plateAppearances > 0) {
              existingBatting.obp = ((existingBatting.hits + existingBatting.walks) / existingBatting.plateAppearances).toFixed(3);
              existingBatting.ops = (parseFloat(existingBatting.obp || 0) + parseFloat(existingBatting.slg || 0)).toFixed(3);
            }
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      opponents,
      totalOpponents: Object.keys(opponents).length
    });
  } catch (error) {
    console.error('Error fetching team matchup splits:', error);
    res.status(500).json({ error: 'Failed to fetch team matchup splits' });
  }
});

/**
 * GET /api/v2/splits/vs-pitcher/:team/:player/:season/:opponent/:pitcher
 * Get specific batter vs pitcher matchup with deep analytics
 */
router.get('/vs-pitcher/:team/:player/:season/:opponent/:pitcher', async (req, res) => {
  try {
    const { team, player, season, opponent, pitcher } = req.params;
    const playerName = player.replace(/-/g, '_');
    const pitcherName = pitcher.replace(/-/g, '_');
    
    // Get both home and away matchup data using patterns to match game IDs
    const homePattern = `split:batter-pitcher:${team}-${playerName}-${season}:vs:${opponent}-${pitcherName}:home:*`;
    const awayPattern = `split:batter-pitcher:${team}-${playerName}-${season}:vs:${opponent}-${pitcherName}:away:*`;
    
    const [homeKeys, awayKeys] = await Promise.all([
      getKeysByPattern(homePattern),
      getKeysByPattern(awayPattern)
    ]);
    
    const [homeData, awayData] = await Promise.all([
      homeKeys.length > 0 ? getMultipleKeys(homeKeys) : [],
      awayKeys.length > 0 ? getMultipleKeys(awayKeys) : []
    ]);
    
    const result = {
      matchup: {
        batter: player.replace(/-/g, ' '),
        batterTeam: team,
        pitcher: pitcher.replace(/-/g, ' '),
        pitcherTeam: opponent,
        season
      },
      splits: {
        home: homeData.length > 0 ? aggregateSplitData(homeData) : null,
        away: awayData.length > 0 ? aggregateSplitData(awayData) : null
      },
      summary: generateMatchupSummary(
        homeData.length > 0 ? aggregateSplitData(homeData) : null, 
        awayData.length > 0 ? aggregateSplitData(awayData) : null
      )
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching batter-pitcher matchup:', error);
    res.status(500).json({ error: 'Failed to fetch batter-pitcher matchup' });
  }
});

/**
 * GET /api/v2/splits/handedness/:team/:player/:season
 * Get performance splits based on pitcher handedness
 */
router.get('/handedness/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Get splits against left and right handed pitchers (including game ID at end)
    const pattern = `split:batter-hand:${team}-${playerName}-${season}:vs:*`;
    const handKeys = await getKeysByPattern(pattern);
    
    if (handKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        handedness: {},
        message: 'No handedness splits found'
      });
    }
    
    const handData = await getMultipleKeys(handKeys);
    const handedness = {};
    
    // Parse handedness data and AGGREGATE multiple games
    for (const item of handData) {
      if (item && item.data) {
        const handMatch = item.key.match(/vs:([LRU]):(home|away):(\d+)$/);
        if (handMatch) {
          const [, hand, homeAway, gameId] = handMatch;
          const handType = hand === 'L' ? 'left' : hand === 'R' ? 'right' : 'unknown';
          if (!handedness[handType]) handedness[handType] = {};
          if (!handedness[handType][homeAway]) {
            // Initialize structure for this handedness/location
            handedness[handType][homeAway] = {
              games: [],
              stats: { batting: {} }
            };
          }
          
          // Aggregate the game data
          const existing = handedness[handType][homeAway];
          const newData = item.data;
          
          // Add games
          if (newData.games) {
            existing.games = existing.games.concat(newData.games);
          }
          
          // Aggregate batting stats
          if (newData.stats && newData.stats.batting) {
            const existingBatting = existing.stats.batting;
            const newBatting = newData.stats.batting;
            
            existingBatting.atBats = (existingBatting.atBats || 0) + (newBatting.atBats || 0);
            existingBatting.hits = (existingBatting.hits || 0) + (newBatting.hits || 0);
            existingBatting.runs = (existingBatting.runs || 0) + (newBatting.runs || 0);
            existingBatting.rbi = (existingBatting.rbi || 0) + (newBatting.rbi || 0);
            existingBatting.homeRuns = (existingBatting.homeRuns || 0) + (newBatting.homeRuns || 0);
            existingBatting.walks = (existingBatting.walks || 0) + (newBatting.walks || 0);
            existingBatting.strikeouts = (existingBatting.strikeouts || 0) + (newBatting.strikeouts || 0);
            existingBatting.plateAppearances = (existingBatting.plateAppearances || 0) + (newBatting.plateAppearances || 0);
            
            // Calculate averages
            if (existingBatting.atBats > 0) {
              existingBatting.avg = (existingBatting.hits / existingBatting.atBats).toFixed(3);
            }
            if (existingBatting.plateAppearances > 0) {
              existingBatting.obp = ((existingBatting.hits + existingBatting.walks) / existingBatting.plateAppearances).toFixed(3);
              existingBatting.ops = (parseFloat(existingBatting.obp || 0) + parseFloat(existingBatting.slg || 0)).toFixed(3);
            }
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      handedness,
      summary: generateHandednessSummary(handedness)
    });
  } catch (error) {
    console.error('Error fetching handedness splits:', error);
    res.status(500).json({ error: 'Failed to fetch handedness splits' });
  }
});

/**
 * GET /api/v2/splits/handedness-vs-team/:team/:player/:season/:opponent
 * Get handedness splits for a player against a specific team
 */
router.get('/handedness-vs-team/:team/:player/:season/:opponent', async (req, res) => {
  try {
    const { team, player, season, opponent } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Get splits against specific team's left and right handed pitchers
    const pattern = `split:batter-hand-vs-team:${team}-${playerName}-${season}:vs:${opponent}:*`;
    const handKeys = await getKeysByPattern(pattern);
    
    if (handKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        opponent,
        season,
        handedness: {},
        message: `No handedness splits found against ${opponent}`
      });
    }
    
    const handData = await getMultipleKeys(handKeys);
    const handedness = {};
    
    // Parse team-specific handedness data
    for (const item of handData) {
      if (item && item.data) {
        const handMatch = item.key.match(/:vs:[A-Z]{2,3}:([LRU]):(home|away):(\d+)$/);
        if (handMatch) {
          const [, hand, homeAway, gameId] = handMatch;
          const handType = hand === 'L' ? 'left' : hand === 'R' ? 'right' : 'unknown';
          if (!handedness[handType]) handedness[handType] = {};
          if (!handedness[handType][homeAway]) {
            handedness[handType][homeAway] = {
              games: [],
              stats: { batting: {} }
            };
          }
          
          // Aggregate the game data
          const existing = handedness[handType][homeAway];
          const newData = item.data;
          
          // Add games
          if (newData.games) {
            existing.games = existing.games.concat(newData.games);
          }
          
          // Aggregate batting stats
          if (newData.stats && newData.stats.batting) {
            const existingBatting = existing.stats.batting;
            const newBatting = newData.stats.batting;
            
            existingBatting.atBats = (existingBatting.atBats || 0) + (newBatting.atBats || 0);
            existingBatting.hits = (existingBatting.hits || 0) + (newBatting.hits || 0);
            existingBatting.runs = (existingBatting.runs || 0) + (newBatting.runs || 0);
            existingBatting.rbi = (existingBatting.rbi || 0) + (newBatting.rbi || 0);
            existingBatting.homeRuns = (existingBatting.homeRuns || 0) + (newBatting.homeRuns || 0);
            existingBatting.walks = (existingBatting.walks || 0) + (newBatting.walks || 0);
            existingBatting.strikeouts = (existingBatting.strikeouts || 0) + (newBatting.strikeouts || 0);
            existingBatting.plateAppearances = (existingBatting.plateAppearances || 0) + (newBatting.plateAppearances || 0);
            
            // Calculate averages
            if (existingBatting.atBats > 0) {
              existingBatting.avg = (existingBatting.hits / existingBatting.atBats).toFixed(3);
            }
            if (existingBatting.plateAppearances > 0) {
              existingBatting.obp = ((existingBatting.hits + existingBatting.walks) / existingBatting.plateAppearances).toFixed(3);
              existingBatting.ops = (parseFloat(existingBatting.obp || 0) + parseFloat(existingBatting.slg || 0)).toFixed(3);
            }
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      opponent,
      season,
      handedness,
      summary: generateHandednessSummary(handedness, `vs ${opponent}`)
    });
  } catch (error) {
    console.error('Error fetching team-specific handedness splits:', error);
    res.status(500).json({ error: 'Failed to fetch team-specific handedness splits' });
  }
});

/**
 * GET /api/v2/splits/counts/:team/:player/:season
 * Get count situation splits for a player
 */
router.get('/counts/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Get all count situation splits
    const pattern = `split:count:${team}-${playerName}-${season}:*`;
    const countKeys = await getKeysByPattern(pattern);
    
    if (countKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        counts: {},
        message: 'No count splits found'
      });
    }
    
    const countData = await getMultipleKeys(countKeys);
    const counts = {};
    
    // Parse count data and aggregate by count situation
    for (const item of countData) {
      if (item && item.data) {
        const countMatch = item.key.match(/vs:(\d-\d):(home|away):(\d+)$/);
        if (countMatch) {
          const [, count, homeAway, gameId] = countMatch;
          if (!counts[count]) counts[count] = {};
          if (!counts[count][homeAway]) {
            counts[count][homeAway] = {
              games: [],
              stats: { batting: {} }
            };
          }
          
          // Aggregate the game data (similar to other splits)
          const existing = counts[count][homeAway];
          const newData = item.data;
          
          if (newData.games) {
            existing.games = existing.games.concat(newData.games);
          }
          
          // Aggregate batting stats
          if (newData.stats && newData.stats.batting) {
            const existingBatting = existing.stats.batting;
            const newBatting = newData.stats.batting;
            
            existingBatting.atBats = (existingBatting.atBats || 0) + (newBatting.atBats || 0);
            existingBatting.hits = (existingBatting.hits || 0) + (newBatting.hits || 0);
            existingBatting.runs = (existingBatting.runs || 0) + (newBatting.runs || 0);
            existingBatting.rbi = (existingBatting.rbi || 0) + (newBatting.rbi || 0);
            existingBatting.homeRuns = (existingBatting.homeRuns || 0) + (newBatting.homeRuns || 0);
            existingBatting.walks = (existingBatting.walks || 0) + (newBatting.walks || 0);
            existingBatting.strikeouts = (existingBatting.strikeouts || 0) + (newBatting.strikeouts || 0);
            existingBatting.plateAppearances = (existingBatting.plateAppearances || 0) + (newBatting.plateAppearances || 0);
            
            // Calculate averages
            if (existingBatting.atBats > 0) {
              existingBatting.avg = (existingBatting.hits / existingBatting.atBats).toFixed(3);
            }
            if (existingBatting.plateAppearances > 0) {
              existingBatting.obp = ((existingBatting.hits + existingBatting.walks) / existingBatting.plateAppearances).toFixed(3);
            }
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      counts,
      totalCounts: Object.keys(counts).length
    });
  } catch (error) {
    console.error('Error fetching count splits:', error);
    res.status(500).json({ error: 'Failed to fetch count splits' });
  }
});

// ============================================================================
// COMPOUND COUNT SPLITS - Ultimate Granularity!
// ============================================================================

/**
 * GET /api/v2/splits/counts-vs-team/:team/:player/:season/:opponent
 * Get count splits for a player against a specific team
 */
router.get('/counts-vs-team/:team/:player/:season/:opponent', async (req, res) => {
  try {
    const { team, player, season, opponent } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    const pattern = `split:count-vs-team:${team}-${playerName}-${season}:vs:${opponent}:*`;
    const countKeys = await getKeysByPattern(pattern);
    
    if (countKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        opponent,
        season,
        counts: {},
        message: `No count splits found vs ${opponent}`
      });
    }
    
    const countData = await getMultipleKeys(countKeys);
    const counts = {};
    
    for (const item of countData) {
      if (item && item.data) {
        const countMatch = item.key.match(/:vs:[A-Z]{2,3}:(\d-\d):(home|away):(\d+)$/);
        if (countMatch) {
          const [, countSit, homeAway, gameId] = countMatch;
          if (!counts[countSit]) counts[countSit] = {};
          if (!counts[countSit][homeAway]) {
            counts[countSit][homeAway] = { games: [], stats: { batting: {} } };
          }
          
          // Aggregate data
          if (item.data.games) {
            counts[countSit][homeAway].games = counts[countSit][homeAway].games.concat(item.data.games);
          }
          // Add batting stat aggregation here...
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      opponent,
      season,
      counts
    });
  } catch (error) {
    console.error('Error fetching count vs team splits:', error);
    res.status(500).json({ error: 'Failed to fetch count vs team splits' });
  }
});

/**
 * GET /api/v2/splits/counts-vs-venue/:team/:player/:season/:venue
 * Get count splits for a player at a specific venue
 */
router.get('/counts-vs-venue/:team/:player/:season/:venue', async (req, res) => {
  try {
    const { team, player, season, venue } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    const pattern = `split:count-vs-venue:${team}-${playerName}-${season}:vs:${venue}:*`;
    const countKeys = await getKeysByPattern(pattern);
    
    if (countKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        venue,
        season,
        counts: {},
        message: `No count splits found at ${venue}`
      });
    }
    
    const countData = await getMultipleKeys(countKeys);
    const counts = {};
    
    for (const item of countData) {
      if (item && item.data) {
        const countMatch = item.key.match(/:vs:[^:]+:(\d-\d):(home|away):(\d+)$/);
        if (countMatch) {
          const [, countSit, homeAway, gameId] = countMatch;
          if (!counts[countSit]) counts[countSit] = {};
          if (!counts[countSit][homeAway]) {
            counts[countSit][homeAway] = { games: [], stats: { batting: {} } };
          }
          
          if (item.data.games) {
            counts[countSit][homeAway].games = counts[countSit][homeAway].games.concat(item.data.games);
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      venue,
      season,
      counts
    });
  } catch (error) {
    console.error('Error fetching count vs venue splits:', error);
    res.status(500).json({ error: 'Failed to fetch count vs venue splits' });
  }
});

/**
 * GET /api/v2/splits/counts-vs-handedness/:team/:player/:season/:handedness
 * Get count splits for a player vs L/R pitchers
 */
router.get('/counts-vs-handedness/:team/:player/:season/:handedness', async (req, res) => {
  try {
    const { team, player, season, handedness } = req.params;
    const playerName = player.replace(/-/g, '_');
    const hand = handedness.toUpperCase(); // L or R
    
    const pattern = `split:count-vs-hand:${team}-${playerName}-${season}:vs:${hand}:*`;
    const countKeys = await getKeysByPattern(pattern);
    
    if (countKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        handedness,
        season,
        counts: {},
        message: `No count splits found vs ${handedness} pitchers`
      });
    }
    
    const countData = await getMultipleKeys(countKeys);
    const counts = {};
    
    for (const item of countData) {
      if (item && item.data) {
        const countMatch = item.key.match(/:vs:[LRU]:(\d-\d):(home|away):(\d+)$/);
        if (countMatch) {
          const [, countSit, homeAway, gameId] = countMatch;
          if (!counts[countSit]) counts[countSit] = {};
          if (!counts[countSit][homeAway]) {
            counts[countSit][homeAway] = { games: [], stats: { batting: {} } };
          }
          
          if (item.data.games) {
            counts[countSit][homeAway].games = counts[countSit][homeAway].games.concat(item.data.games);
          }
        }
      }
    }
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      handedness,
      season,
      counts
    });
  } catch (error) {
    console.error('Error fetching count vs handedness splits:', error);
    res.status(500).json({ error: 'Failed to fetch count vs handedness splits' });
  }
});

/**
 * GET /api/v2/splits/team-matchup/:homeTeam/:awayTeam/:season
 * Get team vs team performance splits
 */
router.get('/team-matchup/:homeTeam/:awayTeam/:season', async (req, res) => {
  try {
    const { homeTeam, awayTeam, season } = req.params;
    
    // Get both perspectives of the team matchup
    const homeKey = `split:team-matchup:${homeTeam}:vs:${awayTeam}:${season}:home`;
    const awayKey = `split:team-matchup:${awayTeam}:vs:${homeTeam}:${season}:away`;
    
    const [homeData, awayData] = await Promise.all([
      getMultipleKeys([homeKey]),
      getMultipleKeys([awayKey])
    ]);
    
    res.json({
      matchup: {
        homeTeam,
        awayTeam,
        season
      },
      splits: {
        homeTeamAtHome: homeData.length > 0 ? homeData[0].data : null,
        awayTeamOnRoad: awayData.length > 0 ? awayData[0].data : null
      },
      summary: generateTeamMatchupSummary(
        homeData.length > 0 ? homeData[0].data : null, 
        awayData.length > 0 ? awayData[0].data : null
      )
    });
  } catch (error) {
    console.error('Error fetching team matchup splits:', error);
    res.status(500).json({ error: 'Failed to fetch team matchup splits' });
  }
});

// ============================================================================
// PITCHER PERSPECTIVE ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/splits/pitcher-vs-batter/:team/:pitcher/:season/:opponent/:batter
 * Get how a pitcher performs against a specific batter
 */
router.get('/pitcher-vs-batter/:team/:pitcher/:season/:opponent/:batter', async (req, res) => {
  try {
    const { team, pitcher, season, opponent, batter } = req.params;
    const pitcherName = pitcher.replace(/-/g, '_');
    const batterName = batter.replace(/-/g, '_');
    
    const pattern = `split:pitcher-batter:${team}-${pitcherName}-${season}:vs:${opponent}-${batterName}:*`;
    const keys = await getKeysByPattern(pattern);
    
    if (keys.length === 0) {
      return res.json({
        pitcher: pitcher.replace(/-/g, ' '),
        team,
        season,
        opponent,
        batter: batter.replace(/-/g, ' '),
        matchup: {},
        message: 'No matchup data found'
      });
    }
    
    const data = await getMultipleKeys(keys);
    const matchup = { home: null, away: null };
    
    for (const item of data) {
      if (item && item.data) {
        const homeAwayMatch = item.key.match(/(home|away):(\d+)$/);
        if (homeAwayMatch) {
          const [, homeAway] = homeAwayMatch;
          matchup[homeAway] = item.data;
        }
      }
    }
    
    res.json({
      pitcher: pitcher.replace(/-/g, ' '),
      team,
      season,
      opponent,
      batter: batter.replace(/-/g, ' '),
      matchup
    });
  } catch (error) {
    console.error('Error fetching pitcher vs batter data:', error);
    res.status(500).json({ error: 'Failed to fetch pitcher vs batter data' });
  }
});

/**
 * GET /api/v2/splits/search/:team/:player/:season
 * Search all available splits for a player
 */
router.get('/search/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Search for all split types for this player
    const patterns = [
      `split:home-away:${team}-${playerName}-${season}:*`,
      `split:venue:${team}-${playerName}-${season}:*`,
      `split:player-team:${team}-${playerName}-${season}:*`,
      `split:batter-pitcher:${team}-${playerName}-${season}:*`,
      `split:batter-hand:${team}-${playerName}-${season}:*`,
      `split:count:${team}-${playerName}-${season}:*`
    ];
    
    const allKeys = [];
    for (const pattern of patterns) {
      const keys = await getKeysByPattern(pattern);
      allKeys.push(...keys);
    }
    
    if (allKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        availableSplits: [],
        totalSplits: 0,
        message: 'No splits found for this player'
      });
    }
    
    // Categorize the splits
    const splitCategories = {
      homeAway: [],
      venues: [],
      opponents: [],
      matchups: [],
      handedness: [],
      counts: []
    };
    
    allKeys.forEach(key => {
      if (key.includes('home-away')) splitCategories.homeAway.push(key);
      else if (key.includes('venue')) splitCategories.venues.push(key);
      else if (key.includes('player-team')) splitCategories.opponents.push(key);
      else if (key.includes('batter-pitcher')) splitCategories.matchups.push(key);
      else if (key.includes('batter-hand')) splitCategories.handedness.push(key);
      else if (key.includes('count')) splitCategories.counts.push(key);
    });
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      availableSplits: splitCategories,
      totalSplits: allKeys.length,
      summary: {
        homeAway: splitCategories.homeAway.length,
        venues: splitCategories.venues.length,
        opponents: splitCategories.opponents.length,
        matchups: splitCategories.matchups.length,
        handedness: splitCategories.handedness.length,
        counts: splitCategories.counts.length
      }
    });
  } catch (error) {
    console.error('Error searching splits:', error);
    res.status(500).json({ error: 'Failed to search splits' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate summary comparing home vs away performance
 */
function generateSplitSummary(homeData, awayData) {
  try {
    if (!homeData && !awayData) return null;
    
    // Data is already parsed objects from Redis, no need to JSON.parse
    const summary = {
      preferred: null,
      homeAdvantage: null,
      countAnalysis: {}
    };
    
    // Compare basic stats
    if (homeData?.stats?.batting && awayData?.stats?.batting) {
      const homeOPS = homeData.stats.batting.ops || 0;
      const awayOPS = awayData.stats.batting.ops || 0;
      
      summary.preferred = homeOPS > awayOPS ? 'home' : 'away';
      summary.homeAdvantage = homeOPS - awayOPS;
      
      // Count-based analysis
      summary.countAnalysis = {
        home: {
          twoStrike: homeData.stats.batting.twoStrikeSituations?.avg || 0,
          hittersCount: homeData.stats.batting.hittersCountSituations?.avg || 0,
          fullCount: homeData.stats.batting.fullCountSituations?.avg || 0
        },
        away: {
          twoStrike: awayData.stats.batting.twoStrikeSituations?.avg || 0,
          hittersCount: awayData.stats.batting.hittersCountSituations?.avg || 0,
          fullCount: awayData.stats.batting.fullCountSituations?.avg || 0
        }
      };
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating split summary:', error);
    return null;
  }
}

/**
 * Generate matchup summary for batter vs pitcher
 */
function generateMatchupSummary(homeDataStr, awayDataStr) {
  try {
    const homeData = homeDataStr ? JSON.parse(homeDataStr) : null;
    const awayData = awayDataStr ? JSON.parse(awayDataStr) : null;
    
    if (!homeData && !awayData) return null;
    
    // Combine data for overall matchup stats
    let totalPA = 0, totalHits = 0, totalHR = 0;
    
    if (homeData?.stats?.batting) {
      totalPA += homeData.stats.batting.plateAppearances || 0;
      totalHits += homeData.stats.batting.hits || 0;
      totalHR += homeData.stats.batting.homeRuns || 0;
    }
    
    if (awayData?.stats?.batting) {
      totalPA += awayData.stats.batting.plateAppearances || 0;
      totalHits += awayData.stats.batting.hits || 0;
      totalHR += awayData.stats.batting.homeRuns || 0;
    }
    
    return {
      overall: {
        plateAppearances: totalPA,
        hits: totalHits,
        homeRuns: totalHR,
        battingAverage: totalPA > 0 ? (totalHits / totalPA).toFixed(3) : 0
      },
      dominance: totalPA > 5 ? (totalHits / totalPA < 0.200 ? 'pitcher' : totalHits / totalPA > 0.350 ? 'batter' : 'even') : 'insufficient_data'
    };
  } catch (error) {
    console.error('Error generating matchup summary:', error);
    return null;
  }
}

/**
 * Generate handedness performance summary
 */
function generateHandednessSummary(handedness, context = '') {
  try {
    const summary = { preferred: null, analysis: {} };
    
    // Calculate combined stats for each handedness
    ['left', 'right'].forEach(hand => {
      if (handedness[hand]) {
        let totalPA = 0, totalHits = 0;
        
        ['home', 'away'].forEach(location => {
          if (handedness[hand][location]?.stats?.batting) {
            totalPA += handedness[hand][location].stats.batting.plateAppearances || 0;
            totalHits += handedness[hand][location].stats.batting.hits || 0;
          }
        });
        
        summary.analysis[hand] = {
          plateAppearances: totalPA,
          battingAverage: totalPA > 0 ? (totalHits / totalPA).toFixed(3) : 0
        };
      }
    });
    
    // Determine preference
    const leftAvg = parseFloat(summary.analysis.left?.battingAverage || 0);
    const rightAvg = parseFloat(summary.analysis.right?.battingAverage || 0);
    
    if (leftAvg > 0 && rightAvg > 0) {
      summary.preferred = leftAvg > rightAvg ? 'left' : 'right';
      summary.advantage = Math.abs(leftAvg - rightAvg).toFixed(3);
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating handedness summary:', error);
    return null;
  }
}

/**
 * Generate team matchup summary
 */
function generateTeamMatchupSummary(homeDataStr, awayDataStr) {
  try {
    const homeData = homeDataStr ? JSON.parse(homeDataStr) : null;
    const awayData = awayDataStr ? JSON.parse(awayDataStr) : null;
    
    if (!homeData && !awayData) return null;
    
    return {
      homeTeamStats: homeData?.stats || null,
      awayTeamStats: awayData?.stats || null,
      gamesPlayed: {
        home: homeData?.games?.length || 0,
        away: awayData?.games?.length || 0,
        total: (homeData?.games?.length || 0) + (awayData?.games?.length || 0)
      }
    };
  } catch (error) {
    console.error('Error generating team matchup summary:', error);
    return null;
  }
}

/**
 * GET /api/v2/splits/counts/:team/:player/:season
 * Get performance splits by count situation with analytics
 */
router.get('/counts/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const playerName = player.replace(/-/g, '_');
    
    // Since count data isn't stored as separate splits, we'll extract it from home/away data
    // This is a simplified implementation - in a full system, count data would be stored separately
    const homePattern = `split:home-away:${team}-${playerName}-${season}:home*`;
    const awayPattern = `split:home-away:${team}-${playerName}-${season}:away*`;
    
    const [homeKeys, awayKeys] = await Promise.all([
      getKeysByPattern(homePattern),
      getKeysByPattern(awayPattern)
    ]);
    
    if (homeKeys.length === 0 && awayKeys.length === 0) {
      return res.json({
        player: player.replace(/-/g, ' '),
        team,
        season,
        counts: {},
        message: 'No count data found'
      });
    }
    
    // For now, return mock count data structure until we have real count-specific storage
    const counts = {
      '0-0': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '1-0': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '2-0': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '3-0': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '0-1': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '1-1': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '2-1': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '3-1': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '0-2': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '1-2': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '2-2': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      },
      '3-2': {
        home: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } },
        away: { games: [], stats: { batting: { atBats: 0, hits: 0, avg: '.000' } } }
      }
    };
    
    res.json({
      player: player.replace(/-/g, ' '),
      team,
      season,
      counts,
      totalCounts: Object.keys(counts).length,
      message: 'Count analytics endpoint ready - real count data implementation needed'
    });
    
  } catch (error) {
    console.error('Error fetching count splits:', error);
    res.status(500).json({ error: 'Failed to fetch count splits' });
  }
});

module.exports = router;
