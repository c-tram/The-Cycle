// Test different Baseball Savant URLs for pitcher stats
const cheerio = require('cheerio');
const fetch = require('node-fetch');

async function testPitchingUrls() {
  console.log('Testing different Baseball Savant URLs for pitcher stats...');
  
  const teamId = 108; // LAA
  const season = '2025';
  
  const urls = [
    // Current backend URL
    `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&season=${season}`,
    
    // Try different parameters
    `https://baseballsavant.mlb.com/team/${teamId}?all=true&type=pitcher&year=${season}&position=&team_type=pitcher&min=q`,
    
    // Try leaderboard-style URL
    `https://baseballsavant.mlb.com/leaderboard/statcast?type=pitcher&year=${season}&team=${teamId}&min=q`,
    
    // Try team roster page
    `https://baseballsavant.mlb.com/team/${teamId}/${season}?type=pitching`,
  ];

  for (const url of urls) {
    try {
      console.log(`\n=== Testing URL: ${url} ===`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Look for tables with pitching-related content
      $('table').each((index, table) => {
        const $table = $(table);
        const id = $table.attr('id') || '';
        const classes = $table.attr('class') || '';
        
        // Check headers for ERA, WHIP, etc.
        const headers = [];
        $table.find('thead tr th').each((i, th) => {
          headers.push($(th).text().trim());
        });
        
        const hasERA = headers.some(h => h.toLowerCase().includes('era'));
        const hasWHIP = headers.some(h => h.toLowerCase().includes('whip'));
        const hasPitchingStats = headers.some(h => ['ERA', 'WHIP', 'W', 'L', 'SV', 'IP'].includes(h));
        
        if (hasERA || hasWHIP || hasPitchingStats) {
          console.log(`✅ Found pitching table - ID: "${id}", Classes: "${classes}"`);
          console.log(`   Headers: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`);
          
          if (headers.length > 5) {
            console.log('   ERA at index:', headers.indexOf('ERA'));
            console.log('   WHIP at index:', headers.indexOf('WHIP'));
            console.log('   W at index:', headers.findIndex(h => h === 'W'));
            console.log('   SO at index:', headers.findIndex(h => h === 'SO'));
          }
        }
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testPitchingUrls();
