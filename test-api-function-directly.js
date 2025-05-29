// Test the fetchTeamRosterFromAPI function directly
const fetch = require('node-fetch');

const TEAM_ID_MAP = {
  ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
  hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
  nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
  tex: 140, tor: 141, was: 120, wsh: 120, cws: 145, chw: 145
};

const TEAMS = [
  { code: 'nyy', name: 'New York Yankees' },
  { code: 'bos', name: 'Boston Red Sox' }
  // ... other teams
];

async function fetchTeamRosterFromAPI(teamAbbr, period, statType) {
  try {
    const teamId = TEAM_ID_MAP[teamAbbr.toLowerCase()];
    if (!teamId) {
      throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
    }

    const currentYear = new Date().getFullYear();
    console.log(`🔍 Fetching ${statType} stats for ${teamAbbr.toUpperCase()} (${teamId}) via MLB Stats API...`);

    // Get team roster
    const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
    console.log(`📋 Fetching roster from: ${rosterUrl}`);
    const rosterResponse = await fetch(rosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!rosterResponse.ok) {
      throw new Error(`Roster API failed: ${rosterResponse.status} - ${rosterResponse.statusText}`);
    }

    const rosterData = await rosterResponse.json();
    console.log(`📋 Roster data received, ${rosterData.roster?.length || 0} players found`);
    
    if (!rosterData.roster || rosterData.roster.length === 0) {
      throw new Error('No roster data found');
    }

    const players = [];
    
    // Process each player on the roster
    for (const player of rosterData.roster) {
      const playerId = player.person.id;
      const playerName = player.person.fullName;
      const position = player.position.abbreviation;
      
      console.log(`🔍 Processing player: ${playerName} (${position})`);
      
      // Skip players based on stat type and position
      if (statType === 'pitching' && position !== 'P') {
        console.log(`   ⏭️  Skipping ${playerName} - not a pitcher`);
        continue;
      }
      if (statType === 'hitting' && position === 'P') {
        console.log(`   ⏭️  Skipping ${playerName} - is a pitcher`);
        continue;
      }

      try {
        // Get player season stats
        const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
        
        console.log(`   📊 Fetching stats from: ${playerStatsUrl}`);
        
        const playerResponse = await fetch(playerStatsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          
          console.log(`   📊 Stats response structure:`, {
            statsCount: playerData.stats?.length || 0,
            statsTypes: playerData.stats?.map(s => ({
              group: s.group?.displayName,
              type: s.type?.displayName,
              splitsCount: s.splits?.length || 0
            })) || []
          });
          
          // Find the correct stat group
          const statGroup = playerData.stats?.find((s) => 
            s.group?.displayName === statType || s.type?.displayName === statType
          );

          if (statGroup?.splits?.[0]?.stat) {
            const stats = statGroup.splits[0].stat;
            console.log(`   ✅ Found stats for ${playerName}:`, statType === 'pitching' ? 
              `ERA=${stats.era}, WHIP=${stats.whip}, W=${stats.wins}, SO=${stats.strikeOuts}` :
              `AVG=${stats.avg}, HR=${stats.homeRuns}, RBI=${stats.rbi}`);
            
            if (statType === 'hitting') {
              players.push({
                name: playerName,
                team: teamAbbr.toUpperCase(),
                position: position,
                avg: stats.avg || '.000',
                hr: stats.homeRuns?.toString() || '0',
                rbi: stats.rbi?.toString() || '0',
                runs: stats.runs?.toString() || '0',
                sb: stats.stolenBases?.toString() || '0',
                obp: stats.obp || '.000',
                slg: stats.slg || '.000',
                ops: stats.ops || '.000',
                season: currentYear.toString(),
                statType: 'hitting'
              });
            } else {
              players.push({
                name: playerName,
                team: teamAbbr.toUpperCase(),
                position: position,
                era: stats.era || '0.00',
                whip: stats.whip || '0.00',
                wins: stats.wins?.toString() || '0',
                so: stats.strikeOuts?.toString() || '0',
                season: currentYear.toString(),
                statType: 'pitching'
              });
            }
          } else {
            console.log(`   ❌ No valid stat group found for ${playerName}`);
          }
        } else {
          console.log(`   ❌ Player stats API failed for ${playerName}: ${playerResponse.status}`);
        }
      } catch (playerError) {
        console.warn(`   ⚠️  Failed to get stats for ${playerName}:`, playerError.message);
        // Continue with other players
      }
      
      // Only process first 3 players to avoid too much output
      if (players.length >= 3) break;
    }

    console.log(`\n🎯 Successfully fetched ${players.length} ${statType} players for ${teamAbbr.toUpperCase()}`);
    
    return [{
      teamName: TEAMS.find(t => t.code === teamAbbr)?.name || teamAbbr.toUpperCase(),
      teamCode: teamAbbr.toUpperCase(),
      players: players
    }];

  } catch (error) {
    console.error(`❌ Error fetching team roster via API for ${teamAbbr}:`, error.message);
    throw error;
  }
}

// Test the function
async function testFunction() {
  try {
    console.log('🧪 Testing fetchTeamRosterFromAPI function directly...\n');
    const result = await fetchTeamRosterFromAPI('nyy', 'season', 'pitching');
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Full error:', error);
  }
}

testFunction().catch(console.error);
