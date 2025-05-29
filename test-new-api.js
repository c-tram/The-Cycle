// Comprehensive MLB API test for team player stats
const fetch = require('node-fetch');

async function testTeamPlayerStats() {
  try {
    console.log('🔍 Testing MLB API for team player statistics...\n');
    
    const currentYear = new Date().getFullYear();
    const testTeam = 'nyy'; // Yankees
    const teamId = 147; // Yankees team ID
    
    console.log(`Testing with ${testTeam.toUpperCase()} (Team ID: ${teamId}), Season: ${currentYear}\n`);
    
    // Get team roster first
    console.log('📋 STEP 1: Getting team roster...');
    const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
    console.log('Roster URL:', rosterUrl);
    
    const rosterResponse = await fetch(rosterUrl);
    console.log('Roster status:', rosterResponse.status);
    
    if (!rosterResponse.ok) {
      throw new Error(`Roster API failed: ${rosterResponse.status}`);
    }
    
    const rosterData = await rosterResponse.json();
    console.log(`Found ${rosterData.roster?.length || 0} players on roster\n`);
    
    if (!rosterData.roster || rosterData.roster.length === 0) {
      throw new Error('No roster data found');
    }
    
    // Test with first few players to understand stats structure
    console.log('📊 STEP 2: Testing player stats API...');
    const testPlayers = rosterData.roster.slice(0, 5); // Test first 5 players
    
    for (const player of testPlayers) {
      const playerId = player.person.id;
      const playerName = player.person.fullName;
      const position = player.position.abbreviation;
      
      console.log(`\n👤 Testing ${playerName} (${position}) - ID: ${playerId}`);
      
      // Get player season stats
      const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=hitting,pitching`;
      
      const playerResponse = await fetch(playerStatsUrl);
      console.log(`  Stats status: ${playerResponse.status}`);
      
      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        
        if (playerData.stats && playerData.stats.length > 0) {
          playerData.stats.forEach(statGroup => {
            const groupName = statGroup.group?.displayName || statGroup.type?.displayName;
            console.log(`  📈 ${groupName} stats available:`, statGroup.splits?.length > 0 ? 'YES' : 'NO');
            
            if (statGroup.splits && statGroup.splits.length > 0) {
              const stats = statGroup.splits[0].stat;
              
              if (groupName === 'hitting') {
                console.log(`    Batting Avg: ${stats.avg || 'N/A'}`);
                console.log(`    Home Runs: ${stats.homeRuns || 'N/A'}`);
                console.log(`    RBIs: ${stats.rbi || 'N/A'}`);
                console.log(`    Runs: ${stats.runs || 'N/A'}`);
              } else if (groupName === 'pitching') {
                console.log(`    ERA: ${stats.era || 'N/A'}`);
                console.log(`    WHIP: ${stats.whip || 'N/A'}`);
                console.log(`    Wins: ${stats.wins || 'N/A'}`);
                console.log(`    Strikeouts: ${stats.strikeOuts || 'N/A'}`);
              }
            }
          });
        } else {
          console.log('    No stats data found for this player');
        }
      } else {
        console.log(`    Stats API failed for ${playerName}`);
      }
    }
    
    console.log('\n✅ API test completed successfully!');
    console.log('\n🔧 RECOMMENDED APPROACH:');
    console.log('1. Use roster API to get all players for a team');
    console.log('2. For each player, call stats API with hitting/pitching groups');
    console.log('3. Filter by position (P for pitchers, others for hitters)');
    console.log('4. Extract the specific stats needed (ERA, WHIP, etc.)');
    
  } catch (error) {
    console.error('❌ Error testing MLB API:', error.message);
  }
}

testTeamPlayerStats();
