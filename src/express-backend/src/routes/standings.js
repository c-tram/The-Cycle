const express = require('express');
const router = express.Router();
const { getRedisClient, parseRedisData, getKeysByPattern, getMultipleKeys } = require('../utils/redis');

// Team to division mapping
const TEAM_DIVISIONS = {
  // AL East
  'TOR': { division: 'AL East', league: 'American League' },
  'NYY': { division: 'AL East', league: 'American League' },
  'BOS': { division: 'AL East', league: 'American League' },
  'TB': { division: 'AL East', league: 'American League' },
  'BAL': { division: 'AL East', league: 'American League' },
  
  // AL Central
  'DET': { division: 'AL Central', league: 'American League' },
  'CLE': { division: 'AL Central', league: 'American League' },
  'KC': { division: 'AL Central', league: 'American League' },
  'MIN': { division: 'AL Central', league: 'American League' },
  'CWS': { division: 'AL Central', league: 'American League' },
  
  // AL West
  'HOU': { division: 'AL West', league: 'American League' },
  'SEA': { division: 'AL West', league: 'American League' },
  'TEX': { division: 'AL West', league: 'American League' },
  'LAA': { division: 'AL West', league: 'American League' },
  'OAK': { division: 'AL West', league: 'American League' },
  
  // NL East
  'NYM': { division: 'NL East', league: 'National League' },
  'PHI': { division: 'NL East', league: 'National League' },
  'MIA': { division: 'NL East', league: 'National League' },
  'ATL': { division: 'NL East', league: 'National League' },
  'WSH': { division: 'NL East', league: 'National League' },
  
  // NL Central
  'MIL': { division: 'NL Central', league: 'National League' },
  'CHC': { division: 'NL Central', league: 'National League' },
  'CIN': { division: 'NL Central', league: 'National League' },
  'STL': { division: 'NL Central', league: 'National League' },
  'PIT': { division: 'NL Central', league: 'National League' },
  
  // NL West
  'LAD': { division: 'NL West', league: 'National League' },
  'SD': { division: 'NL West', league: 'National League' },
  'SF': { division: 'NL West', league: 'National League' },
  'AZ': { division: 'NL West', league: 'National League' },
  'COL': { division: 'NL West', league: 'National League' }
};

// Full team names mapping
const TEAM_NAMES = {
  'TOR': 'Toronto Blue Jays',
  'NYY': 'New York Yankees',
  'BOS': 'Boston Red Sox',
  'TB': 'Tampa Bay Rays',
  'BAL': 'Baltimore Orioles',
  'DET': 'Detroit Tigers',
  'CLE': 'Cleveland Guardians',
  'KC': 'Kansas City Royals',
  'MIN': 'Minnesota Twins',
  'CWS': 'Chicago White Sox',
  'HOU': 'Houston Astros',
  'SEA': 'Seattle Mariners',
  'TEX': 'Texas Rangers',
  'LAA': 'Los Angeles Angels',
  'OAK': 'Oakland Athletics',
  'NYM': 'New York Mets',
  'PHI': 'Philadelphia Phillies',
  'MIA': 'Miami Marlins',
  'ATL': 'Atlanta Braves',
  'WSH': 'Washington Nationals',
  'MIL': 'Milwaukee Brewers',
  'CHC': 'Chicago Cubs',
  'CIN': 'Cincinnati Reds',
  'STL': 'St. Louis Cardinals',
  'PIT': 'Pittsburgh Pirates',
  'LAD': 'Los Angeles Dodgers',
  'SD': 'San Diego Padres',
  'SF': 'San Francisco Giants',
  'AZ': 'Arizona Diamondbacks',
  'COL': 'Colorado Rockies'
};

// GET /api/standings - Get current league standings
router.get('/', async (req, res) => {
  try {
    const { year = '2025' } = req.query;
    
    // Test Redis connection first
    const client = getRedisClient();
    try {
      await client.ping();
      console.log('✅ Redis connection verified for standings');
    } catch (redisErr) {
      console.error('❌ Redis connection failed for standings:', redisErr);
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        details: 'Redis cache is not accessible'
      });
    }
    
    // Get team standings from Redis (we'll calculate standings from team stats)
    const pattern = `team:*:${year}:average`;
    const keys = await getKeysByPattern(pattern);
    
    if (!keys || keys.length === 0) {
      return res.status(404).json({ 
        error: 'No team data found for the specified year',
        year: year,
        pattern: pattern
      });
    }
    
    const teams = await getMultipleKeys(keys);
    
    if (!teams || teams.length === 0) {
      return res.status(404).json({ error: 'No team data found for the specified year' });
    }
    
    // Process teams and calculate standings
    const processedTeams = teams.map(team => {
      const keyParts = team.key.split(':');
      const teamCode = keyParts[1];
      const stats = team.data;
      
      // Calculate basic standings metrics
      const wins = Math.round(stats.wins || 0);
      const losses = Math.round(stats.losses || 0);
      const gamesPlayed = wins + losses;
      const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) : 0;
      
      return {
        teamCode,
        teamName: TEAM_NAMES[teamCode] || teamCode,
        division: TEAM_DIVISIONS[teamCode]?.division || 'Unknown',
        league: TEAM_DIVISIONS[teamCode]?.league || 'Unknown',
        wins,
        losses,
        winPct: parseFloat(winPct.toFixed(3)),
        runsScored: Math.round(stats.runsScored || 0),
        runsAllowed: Math.round(stats.runsAllowed || 0),
        runDiff: Math.round((stats.runsScored || 0) - (stats.runsAllowed || 0)),
        homeRecord: `${Math.round(stats.homeWins || 0)}-${Math.round(stats.homeLosses || 0)}`,
        awayRecord: `${Math.round(stats.awayWins || 0)}-${Math.round(stats.awayLosses || 0)}`,
        lastTen: `${Math.round(stats.last10Wins || 0)}-${Math.round(stats.last10Losses || 0)}`,
        streak: stats.currentStreak || 'N/A'
      };
    });
    
    // Group teams by division and calculate games behind
    const divisions = {};
    
    processedTeams.forEach(team => {
      if (!divisions[team.division]) {
        divisions[team.division] = [];
      }
      divisions[team.division].push(team);
    });
    
    // Sort each division by win percentage and calculate games behind
    Object.keys(divisions).forEach(divisionName => {
      const divisionTeams = divisions[divisionName];
      
      // Sort by win percentage (descending)
      divisionTeams.sort((a, b) => b.winPct - a.winPct);
      
      // Calculate games behind
      const leader = divisionTeams[0];
      divisionTeams.forEach(team => {
        if (team === leader) {
          team.gamesBehind = '—';
        } else {
          const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
          team.gamesBehind = gb > 0 ? gb.toFixed(1) : '—';
        }
      });
    });
    
    // Calculate wild card standings for each league
    const alTeams = processedTeams.filter(t => t.league === 'American League');
    const nlTeams = processedTeams.filter(t => t.league === 'National League');
    
    // For wild card, exclude division leaders and sort by win percentage
    const calculateWildCard = (leagueTeams) => {
      // Get division leaders
      const divisionLeaders = Object.keys(divisions)
        .filter(div => leagueTeams.some(t => t.division === div))
        .map(div => divisions[div][0]);
      
      // Get non-division leaders
      const wildCardTeams = leagueTeams.filter(team => 
        !divisionLeaders.some(leader => leader.teamCode === team.teamCode)
      );
      
      // Sort by win percentage
      wildCardTeams.sort((a, b) => b.winPct - a.winPct);
      
      // Calculate wild card games behind (relative to best non-division leader)
      if (wildCardTeams.length > 0) {
        const wcLeader = wildCardTeams[0];
        wildCardTeams.forEach(team => {
          if (team === wcLeader) {
            team.wildCardGB = '—';
          } else {
            const wcgb = ((wcLeader.wins - team.wins) + (team.losses - wcLeader.losses)) / 2;
            team.wildCardGB = wcgb > 0 ? wcgb.toFixed(1) : '—';
          }
        });
      }
      
      return wildCardTeams;
    };
    
    const alWildCard = calculateWildCard(alTeams);
    const nlWildCard = calculateWildCard(nlTeams);
    
    res.json({
      year: parseInt(year),
      lastUpdated: new Date().toISOString(),
      divisions: divisions,
      wildCard: {
        'American League': alWildCard.slice(0, 10), // Top 10 for wild card race
        'National League': nlWildCard.slice(0, 10)
      },
      totalTeams: processedTeams.length
    });
    
  } catch (err) {
    console.error('Error fetching standings:', err);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/standings/test - Test route with mock data (doesn't require Redis)
router.get('/test', async (req, res) => {
  try {
    // Mock standings data for testing
    const mockStandings = {
      year: 2025,
      lastUpdated: new Date().toISOString(),
      divisions: {
        'AL East': [
          {
            teamCode: 'TOR',
            teamName: 'Toronto Blue Jays',
            division: 'AL East',
            league: 'American League',
            wins: 62,
            losses: 42,
            winPct: 0.596,
            gamesBehind: '—',
            runsScored: 491,
            runsAllowed: 448,
            runDiff: 43,
            homeRecord: '37-17',
            awayRecord: '25-25',
            lastTen: '7-3',
            streak: 'W3'
          },
          {
            teamCode: 'NYY',
            teamName: 'New York Yankees',
            division: 'AL East',
            league: 'American League',
            wins: 56,
            losses: 48,
            winPct: 0.538,
            gamesBehind: '6.0',
            runsScored: 539,
            runsAllowed: 445,
            runDiff: 94,
            homeRecord: '30-21',
            awayRecord: '26-27',
            lastTen: '3-7',
            streak: 'L3'
          }
        ]
      },
      wildCard: {
        'American League': [],
        'National League': []
      },
      totalTeams: 2
    };
    
    res.json(mockStandings);
    
  } catch (err) {
    console.error('Error in test standings:', err);
    res.status(500).json({ error: 'Failed to fetch test standings' });
  }
});

// GET /api/standings/division/:division - Get specific division standings
router.get('/division/:division', async (req, res) => {
  try {
    const { division } = req.params;
    const { year = '2025' } = req.query;
    
    // Get all standings first
    const standingsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/standings?year=${year}`);
    const standingsData = await standingsResponse.json();
    
    if (!standingsData.divisions[division]) {
      return res.status(404).json({ error: 'Division not found' });
    }
    
    res.json({
      division,
      year: parseInt(year),
      teams: standingsData.divisions[division],
      lastUpdated: standingsData.lastUpdated
    });
    
  } catch (err) {
    console.error('Error fetching division standings:', err);
    res.status(500).json({ error: 'Failed to fetch division standings' });
  }
});

// GET /api/standings/wildcard/:league - Get wild card standings for a league
router.get('/wildcard/:league', async (req, res) => {
  try {
    const { league } = req.params;
    const { year = '2025' } = req.query;
    
    const leagueName = league === 'al' ? 'American League' : 
                      league === 'nl' ? 'National League' : 
                      league;
    
    // Get all standings first
    const standingsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/standings?year=${year}`);
    const standingsData = await standingsResponse.json();
    
    if (!standingsData.wildCard[leagueName]) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    res.json({
      league: leagueName,
      year: parseInt(year),
      teams: standingsData.wildCard[leagueName],
      lastUpdated: standingsData.lastUpdated
    });
    
  } catch (err) {
    console.error('Error fetching wild card standings:', err);
    res.status(500).json({ error: 'Failed to fetch wild card standings' });
  }
});

module.exports = router;
