// Test script to check team averages error handling
const API_BASE = 'http://localhost:3000/api';

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.log('Fetch not available in this Node.js version, using curl fallback');
  process.exit(1);
}

// Teams list - same as frontend
const TEAMS = [
  { code: 'nyy', name: 'New York Yankees' },
  { code: 'bos', name: 'Boston Red Sox' },
  { code: 'tor', name: 'Toronto Blue Jays' },
  { code: 'bal', name: 'Baltimore Orioles' },
  { code: 'tb', name: 'Tampa Bay Rays' },
  { code: 'cle', name: 'Cleveland Guardians' },
  { code: 'min', name: 'Minnesota Twins' },
  { code: 'kc', name: 'Kansas City Royals' },
  { code: 'det', name: 'Detroit Tigers' },
  { code: 'cws', name: 'Chicago White Sox' },
  // Add invalid team to test error handling
  { code: 'invalid', name: 'Invalid Team' }
];

async function testTeamAverages() {
  console.log('Testing team averages error handling...\n');
  
  const allData = {};
  const errors = [];
  
  // Simulate the frontend's fetchAllTeamsData logic
  const promises = TEAMS.map(async (teamInfo) => {
    try {
      console.log(`Fetching data for ${teamInfo.name} (${teamInfo.code})...`);
      
      const response = await fetch(`${API_BASE}/roster?team=${teamInfo.code}&period=season`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }
      
      const teamData = await response.json();
      
      if (teamData && teamData.length > 0 && teamData[0].players) {
        allData[teamInfo.code] = teamData[0].players;
        console.log(`✓ ${teamInfo.name}: ${teamData[0].players.length} players loaded`);
      } else {
        allData[teamInfo.code] = [];
        console.log(`⚠ ${teamInfo.name}: No players data`);
      }
    } catch (err) {
      console.log(`✗ ${teamInfo.name}: ${err.message}`);
      allData[teamInfo.code] = [];
      errors.push({ team: teamInfo.name, error: err.message });
    }
  });
  
  await Promise.all(promises);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Teams with data: ${Object.keys(allData).filter(code => allData[code].length > 0).length}`);
  console.log(`Teams with no data: ${Object.keys(allData).filter(code => allData[code].length === 0).length}`);
  console.log(`Errors encountered: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(error => {
      console.log(`${error.team}: ${error.error}`);
    });
  }
  
  console.log('\n=== TESTING TEAM AVERAGES CALCULATION ===');
  
  // Test the calculation logic like frontend does
  Object.keys(allData).forEach(teamCode => {
    const teamInfo = TEAMS.find(t => t.code === teamCode);
    const players = allData[teamCode];
    
    if (players.length === 0) {
      console.log(`${teamInfo.name}: No data - would show .000 averages`);
    } else {
      // Calculate averages like frontend
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
      
      console.log(`${teamInfo.name}: AVG=${teamAvg.avg}, HR=${teamAvg.hr}, RBI=${teamAvg.rbi}, R=${teamAvg.runs}`);
    }
  });
}

// Run the test
testTeamAverages().catch(console.error);
