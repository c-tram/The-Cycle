// Test MLB Stats API for team statistics
const fetch = require('node-fetch');

// MLB Team ID to abbreviation mapping (from existing code)
const TEAM_ABBREVIATIONS = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC', 113: 'CIN', 
  114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU', 118: 'KC', 119: 'LAD',
  120: 'WSH', 121: 'NYM', 133: 'OAK', 134: 'PIT', 135: 'SD', 136: 'SEA',
  137: 'SF', 138: 'STL', 139: 'TB', 140: 'TEX', 141: 'TOR', 142: 'MIN',
  143: 'PHI', 144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL'
};

// Reverse mapping: abbreviation to team ID
const TEAM_IDS = {};
Object.entries(TEAM_ABBREVIATIONS).forEach(([id, abbr]) => {
  TEAM_IDS[abbr.toLowerCase()] = parseInt(id);
});

async function testMLBStatsAPI() {
  console.log('🔍 Testing MLB Stats API for team statistics...\n');
  
  try {
    const currentYear = new Date().getFullYear();
    const testTeam = 'nyy'; // Test with Yankees
    const teamId = TEAM_IDS[testTeam];
    
    console.log(`Testing with ${testTeam.toUpperCase()} (Team ID: ${teamId})\n`);
    
    // Test team stats endpoint
    const teamStatsUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=season&group=hitting,pitching&season=${currentYear}`;
    console.log('Team Stats URL:', teamStatsUrl);
    
    const response = await fetch(teamStatsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 TEAM STATS DATA STRUCTURE:');
      console.log('Stats groups available:', data.stats?.map(s => s.group?.displayName || s.type?.displayName));
      
      // Look for hitting stats
      const hittingStats = data.stats?.find(s => s.group?.displayName === 'hitting' || s.type?.displayName === 'hitting');
      if (hittingStats && hittingStats.splits?.[0]) {
        console.log('\n⚾ HITTING STATS SAMPLE:');
        const stats = hittingStats.splits[0].stat;
        console.log('Available hitting stats:', Object.keys(stats).slice(0, 10));
        console.log('Sample values:');
        console.log('  Batting Avg:', stats.avg);
        console.log('  Home Runs:', stats.homeRuns);
        console.log('  RBIs:', stats.rbi);
        console.log('  Runs:', stats.runs);
      }
      
      // Look for pitching stats
      const pitchingStats = data.stats?.find(s => s.group?.displayName === 'pitching' || s.type?.displayName === 'pitching');
      if (pitchingStats && pitchingStats.splits?.[0]) {
        console.log('\n🏆 PITCHING STATS SAMPLE:');
        const stats = pitchingStats.splits[0].stat;
        console.log('Available pitching stats:', Object.keys(stats).slice(0, 10));
        console.log('Sample values:');
        console.log('  ERA:', stats.era);
        console.log('  WHIP:', stats.whip);
        console.log('  Wins:', stats.wins);
        console.log('  Strikeouts:', stats.strikeOuts);
      }
    } else {
      console.log('Team stats API failed, trying alternative endpoints...');
      
      // Try roster endpoint to get player stats
      const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
      console.log('\n🔄 TRYING ROSTER ENDPOINT:', rosterUrl);
      
      const rosterResponse = await fetch(rosterUrl);
      console.log('Roster response status:', rosterResponse.status);
      
      if (rosterResponse.ok) {
        const rosterData = await rosterResponse.json();
        console.log('Roster structure:', Object.keys(rosterData));
        console.log('Number of players:', rosterData.roster?.length);
        
        if (rosterData.roster?.length > 0) {
          console.log('Sample player:', rosterData.roster[0].person.fullName);
          
          // Try to get individual player stats
          const playerId = rosterData.roster[0].person.id;
          const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}`;
          console.log('\n👤 TRYING PLAYER STATS:', playerStatsUrl);
          
          const playerResponse = await fetch(playerStatsUrl);
          if (playerResponse.ok) {
            const playerData = await playerResponse.json();
            console.log('Player stats structure:', playerData.stats?.map(s => s.type?.displayName));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing MLB Stats API:', error.message);
  }
}

testMLBStatsAPI();
