// Test the MLB API for batting stats directly
const fetch = require('node-fetch');

// Map team abbreviations to Baseball Savant team IDs
const TEAM_ID_MAP = {
  ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
  hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
  nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
  tex: 140, tor: 141, was: 120, wsh: 120, cws: 145, chw: 145
};

const TEAMS = [
  { code: 'nyy', name: 'New York Yankees' },
  { code: 'lad', name: 'Los Angeles Dodgers' },
];

async function testBattingStatsAPI() {
  console.log('🔨 Testing MLB API for batting stats directly...\n');
  
  const teamAbbr = 'nyy';
  const statType = 'hitting';
  
  try {
    const teamId = TEAM_ID_MAP[teamAbbr.toLowerCase()];
    if (!teamId) {
      throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
    }

    const currentYear = new Date().getFullYear();
    console.log(`Fetching ${statType} stats for ${teamAbbr.toUpperCase()} (${teamId}) via MLB Stats API...`);

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
    let processedCount = 0;
    let hitterCount = 0;
    
    // Process each player on the roster
    for (const player of rosterData.roster) {
      const playerId = player.person.id;
      const playerName = player.person.fullName;
      const position = player.position.abbreviation;
      
      console.log(`Processing ${playerName} (${position})`);
      
      // Skip pitchers for hitting stats
      if (statType === 'hitting' && position === 'P') {
        console.log(`  ⏭️ Skipping pitcher ${playerName}`);
        continue;
      }
      
      hitterCount++;
      processedCount++;

      try {
        // Get player season stats
        const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
        console.log(`  🔍 Fetching stats from: ${playerStatsUrl}`);
        
        const playerResponse = await fetch(playerStatsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          console.log(`  📊 Player data received for ${playerName}`);
          
          // Debug: show the structure
          if (processedCount <= 3) {
            console.log(`  🔍 Data structure for ${playerName}:`, JSON.stringify(playerData, null, 2));
          }
          
          // Find the correct stat group
          const statGroup = playerData.stats?.find((s) => 
            s.group?.displayName === statType || s.type?.displayName === statType || s.group?.displayName === 'hitting'
          );

          console.log(`  🔍 Found stat group:`, statGroup ? 'YES' : 'NO');
          if (statGroup) {
            console.log(`  🔍 Stat group type:`, statGroup.type?.displayName, 'group:', statGroup.group?.displayName);
            console.log(`  🔍 Splits length:`, statGroup.splits?.length);
          }

          if (statGroup?.splits?.[0]?.stat) {
            const stats = statGroup.splits[0].stat;
            console.log(`  📊 Found stats for ${playerName}: AVG=${stats.avg}, HR=${stats.homeRuns}, RBI=${stats.rbi}`);
            
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
            console.log(`  ⚠️ No stats found for ${playerName}`);
          }
        } else {
          console.log(`  ❌ Failed to fetch stats for ${playerName}: ${playerResponse.status}`);
        }
      } catch (playerError) {
        console.warn(`  ❌ Failed to get stats for ${playerName}:`, playerError.message);
      }

      // Test only first 5 hitters to avoid rate limiting
      if (hitterCount >= 5) {
        console.log('🛑 Limiting to first 5 hitters for testing...');
        break;
      }
    }

    console.log(`\n✅ Successfully fetched ${players.length} ${statType} players for ${teamAbbr.toUpperCase()}`);
    console.log(`📊 Sample players:`);
    players.slice(0, 3).forEach(player => {
      console.log(`  - ${player.name}: AVG=${player.avg}, HR=${player.hr}, RBI=${player.rbi}`);
    });
    
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

testBattingStatsAPI().catch(console.error);
