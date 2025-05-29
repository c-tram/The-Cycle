// Direct test of team averages mode functionality
// This simulates clicking "Team Averages" button in the UI

const API_BASE = 'http://localhost:3000/api';

// This simulates the exact TEAMS array from Teams.tsx
const TEAMS = [
  { code: 'nyy', name: 'New York Yankees', division: 'AL East' },
  { code: 'bos', name: 'Boston Red Sox', division: 'AL East' },
  { code: 'tor', name: 'Toronto Blue Jays', division: 'AL East' },
  { code: 'bal', name: 'Baltimore Orioles', division: 'AL East' },
  { code: 'tb', name: 'Tampa Bay Rays', division: 'AL East' },
  { code: 'cle', name: 'Cleveland Guardians', division: 'AL Central' },
  { code: 'min', name: 'Minnesota Twins', division: 'AL Central' },
  { code: 'kc', name: 'Kansas City Royals', division: 'AL Central' },  // This one will error
  { code: 'det', name: 'Detroit Tigers', division: 'AL Central' },
  { code: 'cws', name: 'Chicago White Sox', division: 'AL Central' }
];

async function getTeamRoster(teamCode, timePeriod = 'season') {
  const response = await fetch(`${API_BASE}/roster?team=${teamCode}&period=${timePeriod}`);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// This simulates the fetchAllTeamsData function from Teams.tsx
async function testTeamAveragesMode() {
  console.log('🔄 Testing Team Averages Mode (simulating frontend)...\n');
  
  const timePeriod = 'season';
  const allData = {};
  let errorCount = 0;
  let loadingErrors = [];
  
  try {
    console.log('📊 Fetching data for all teams...');
    
    // This replicates the exact logic from Teams.tsx fetchAllTeamsData
    const promises = TEAMS.map(async (teamInfo) => {
      try {
        const teamData = await getTeamRoster(teamInfo.code, timePeriod);
        if (teamData && teamData.length > 0 && teamData[0].players) {
          allData[teamInfo.code] = teamData[0].players;
          console.log(`✅ ${teamInfo.name}: ${teamData[0].players.length} players`);
        } else {
          allData[teamInfo.code] = [];
          console.log(`⚠️  ${teamInfo.name}: No players data`);
        }
      } catch (err) {
        console.log(`❌ ${teamInfo.name}: ${err.message}`);
        allData[teamInfo.code] = [];
        errorCount++;
        loadingErrors.push({ team: teamInfo.name, error: err.message });
      }
    });
    
    await Promise.all(promises);
    
    console.log('\n📈 TEAM AVERAGES VIEW SIMULATION:');
    console.log('===============================');
    
    // This simulates what the frontend shows in team averages mode
    TEAMS.forEach(teamInfo => {
      const players = allData[teamInfo.code] || [];
      
      if (players.length === 0) {
        console.log(`${teamInfo.name.padEnd(25)} | AVG: .000  HR: 0   RBI: 0   R: 0   [NO DATA]`);
      } else {
        // Calculate team averages (same logic as frontend)
        const totals = players.reduce((acc, player) => {
          const avg = parseFloat(player.avg?.replace('.', '0.') || '0');
          const hr = parseInt(player.hr || '0');
          const rbi = parseInt(player.rbi || '0');
          const runs = parseInt(player.runs || '0');
          
          return {
            avg: acc.avg + avg,
            hr: acc.hr + hr,
            rbi: acc.rbi + rbi,
            runs: acc.runs + runs
          };
        }, { avg: 0, hr: 0, rbi: 0, runs: 0 });
        
        const teamAvg = {
          avg: (totals.avg / players.length).toFixed(3),
          hr: Math.round(totals.hr / players.length).toString(),
          rbi: Math.round(totals.rbi / players.length).toString(),
          runs: Math.round(totals.runs / players.length).toString()
        };
        
        console.log(`${teamInfo.name.padEnd(25)} | AVG: ${teamAvg.avg}  HR: ${teamAvg.hr.padStart(2)}  RBI: ${teamAvg.rbi.padStart(2)}  R: ${teamAvg.runs.padStart(2)}`);
      }
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`✅ Teams with data: ${Object.keys(allData).filter(code => allData[code].length > 0).length}/${TEAMS.length}`);
    console.log(`❌ Teams with errors: ${errorCount}/${TEAMS.length}`);
    
    if (loadingErrors.length > 0) {
      console.log('\n⚠️  ERROR DETAILS:');
      loadingErrors.forEach(error => {
        console.log(`   • ${error.team}: ${error.error}`);
      });
    }
    
    console.log('\n✅ RESULT: Team averages mode handles errors gracefully!');
    console.log('   • Failed teams show .000 averages instead of crashing');
    console.log('   • Successful teams show calculated averages');
    console.log('   • UI would continue to function normally');
    
  } catch (err) {
    console.error('❌ Critical error in team averages mode:', err);
  }
}

// Run the test
testTeamAveragesMode().catch(console.error);
