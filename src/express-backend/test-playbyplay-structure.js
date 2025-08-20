const fetch = require('node-fetch');

async function testPlayByPlayStructure() {
  try {
    const gameId = 776921; // ATL @ CIN
    const url = `https://statsapi.mlb.com/api/v1/game/${gameId}/playByPlay`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('🔍 Examining Play-by-Play Data Structure...\n');
    
    if (data.allPlays && data.allPlays.length > 0) {
      const samplePlay = data.allPlays[0];
      console.log('Sample Play Structure:');
      console.log('- Result:', Object.keys(samplePlay.result || {}));
      console.log('- About:', Object.keys(samplePlay.about || {}));
      console.log('- Matchup:', Object.keys(samplePlay.matchup || {}));
      console.log('- Count available:', !!samplePlay.count);
      console.log('- PlayEvents available:', !!samplePlay.playEvents && samplePlay.playEvents.length > 0);
      
      if (samplePlay.count) {
        console.log('Count data:', samplePlay.count);
      } else {
        console.log('❌ No count data in this play');
      }
      
      if (samplePlay.playEvents && samplePlay.playEvents.length > 0) {
        console.log('\nPlayEvents sample:');
        console.log(JSON.stringify(samplePlay.playEvents.slice(0, 2), null, 2));
      } else {
        console.log('❌ No playEvents data');
      }
      
      // Check multiple plays for count data
      let playsWithCount = 0;
      let playsWithEvents = 0;
      for (let i = 0; i < Math.min(10, data.allPlays.length); i++) {
        if (data.allPlays[i].count) playsWithCount++;
        if (data.allPlays[i].playEvents && data.allPlays[i].playEvents.length > 0) playsWithEvents++;
      }
      
      console.log(`\n📊 Out of first 10 plays:`);
      console.log(`- ${playsWithCount} have count data`);
      console.log(`- ${playsWithEvents} have playEvents data`);
      
      // Look at the actual structure of playEvents
      if (data.allPlays[0].playEvents && data.allPlays[0].playEvents[0]) {
        console.log('\n🎯 PlayEvent structure:');
        console.log(Object.keys(data.allPlays[0].playEvents[0]));
        
        if (data.allPlays[0].playEvents[0].count) {
          console.log('Count in playEvent:', data.allPlays[0].playEvents[0].count);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testPlayByPlayStructure();
