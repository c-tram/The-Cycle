// Debug script to examine MLB Stats API response structure
const fetch = require('node-fetch');

async function debugMLBAPIResponse() {
  console.log('🔍 Debugging MLB Stats API response structure...\n');
  
  const currentYear = new Date().getFullYear();
  
  try {
    // Test Yankees roster first
    console.log('1. Testing Yankees roster endpoint...');
    const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/147/roster?season=${currentYear}`;
    const rosterResponse = await fetch(rosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!rosterResponse.ok) {
      throw new Error(`Roster API failed: ${rosterResponse.status}`);
    }
    
    const rosterData = await rosterResponse.json();
    console.log(`Found ${rosterData.roster?.length || 0} players on roster`);
    
    // Find a pitcher for testing
    const pitcher = rosterData.roster?.find(p => p.position?.abbreviation === 'P');
    if (!pitcher) {
      console.log('❌ No pitchers found on roster');
      return;
    }
    
    console.log(`\n2. Testing pitcher stats for: ${pitcher.person.fullName} (ID: ${pitcher.person.id})`);
    
    // Get pitcher stats
    const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${pitcher.person.id}/stats?stats=season&season=${currentYear}&group=pitching`;
    
    console.log(`Fetching: ${playerStatsUrl}`);
    
    const playerResponse = await fetch(playerStatsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!playerResponse.ok) {
      console.log(`❌ Player stats API failed: ${playerResponse.status}`);
      return;
    }
    
    const playerData = await playerResponse.json();
    console.log('\n📊 Full API Response Structure:');
    console.log(JSON.stringify(playerData, null, 2));
    
    console.log('\n🎯 Available stat groups:');
    if (playerData.stats) {
      playerData.stats.forEach((statGroup, index) => {
        console.log(`  [${index}] Group: "${statGroup.group?.displayName || 'N/A'}", Type: "${statGroup.type?.displayName || 'N/A'}"`);
        console.log(`      Splits: ${statGroup.splits?.length || 0}`);
        if (statGroup.splits?.[0]?.stat) {
          const availableStats = Object.keys(statGroup.splits[0].stat);
          console.log(`      Available stats: ${availableStats.slice(0, 10).join(', ')}${availableStats.length > 10 ? '...' : ''}`);
        }
      });
    }
    
    // Try to find pitching stats
    console.log('\n🔎 Looking for pitching stats...');
    const pitchingGroup = playerData.stats?.find((s) => 
      s.group?.displayName === 'pitching' || 
      s.type?.displayName === 'pitching' ||
      s.group?.displayName?.toLowerCase().includes('pitching') ||
      s.type?.displayName?.toLowerCase().includes('pitching')
    );
    
    if (pitchingGroup) {
      console.log('✅ Found pitching group:');
      console.log(`   Group: ${pitchingGroup.group?.displayName || 'N/A'}`);
      console.log(`   Type: ${pitchingGroup.type?.displayName || 'N/A'}`);
      
      if (pitchingGroup.splits?.[0]?.stat) {
        const stats = pitchingGroup.splits[0].stat;
        console.log('\n📈 Pitching stats found:');
        console.log(`   ERA: ${stats.era}`);
        console.log(`   WHIP: ${stats.whip}`);
        console.log(`   Wins: ${stats.wins}`);
        console.log(`   Strikeouts: ${stats.strikeOuts}`);
        console.log(`   All available stats:`, Object.keys(stats));
      }
    } else {
      console.log('❌ No pitching stats group found');
      console.log('Available groups:', playerData.stats?.map(s => s.group?.displayName || s.type?.displayName));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Full error:', error);
  }
}

debugMLBAPIResponse();
