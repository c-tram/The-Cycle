// Test the new MLB Stats API implementation
const fetch = require('node-fetch');

async function testNewImplementation() {
  console.log('🧪 Testing new MLB Stats API implementation...\n');
  
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // Test pitching stats for Yankees
    console.log('🏆 Testing Pitching Stats for Yankees...');
    const pitchingResponse = await fetch(`${baseUrl}/roster?team=nyy&period=season&statType=pitching`);
    
    if (!pitchingResponse.ok) {
      throw new Error(`Pitching API failed: ${pitchingResponse.status}`);
    }
    
    const pitchingData = await pitchingResponse.json();
    console.log(`Found ${pitchingData[0]?.players?.length || 0} pitchers`);
    
    if (pitchingData[0]?.players?.length > 0) {
      console.log('\nSample Pitching Stats:');
      const topPitchers = pitchingData[0].players.slice(0, 3);
      topPitchers.forEach(p => {
        console.log(`  ${p.name}: ERA=${p.era}, WHIP=${p.whip}, W=${p.wins}, SO=${p.so}`);
      });
      
      // Check if values look realistic
      const eras = topPitchers.map(p => parseFloat(p.era)).filter(era => !isNaN(era));
      const whips = topPitchers.map(p => parseFloat(p.whip)).filter(whip => !isNaN(whip));
      
      console.log('\n📊 Data Quality Check:');
      console.log(`  Average ERA: ${(eras.reduce((a,b) => a+b, 0) / eras.length).toFixed(2)}`);
      console.log(`  Average WHIP: ${(whips.reduce((a,b) => a+b, 0) / whips.length).toFixed(2)}`);
      
      if (eras.every(era => era >= 0 && era <= 10) && whips.every(whip => whip >= 0 && whip <= 3)) {
        console.log('  ✅ Pitching stats look realistic!');
      } else {
        console.log('  ❌ Some pitching stats look unrealistic');
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test hitting stats for comparison
    console.log('⚾ Testing Hitting Stats for Yankees...');
    const hittingResponse = await fetch(`${baseUrl}/roster?team=nyy&period=season&statType=hitting`);
    
    if (!hittingResponse.ok) {
      throw new Error(`Hitting API failed: ${hittingResponse.status}`);
    }
    
    const hittingData = await hittingResponse.json();
    console.log(`Found ${hittingData[0]?.players?.length || 0} hitters`);
    
    if (hittingData[0]?.players?.length > 0) {
      console.log('\nSample Hitting Stats:');
      const topHitters = hittingData[0].players.slice(0, 3);
      topHitters.forEach(p => {
        console.log(`  ${p.name}: AVG=${p.avg}, HR=${p.hr}, RBI=${p.rbi}, R=${p.runs}`);
      });
    }
    
    console.log('\n✅ New implementation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewImplementation();
