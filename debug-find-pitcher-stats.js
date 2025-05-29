// Find the correct Baseball Savant URL for actual pitcher statistics
const cheerio = require('cheerio');
const fetch = require('node-fetch');

async function findPitcherStats() {
  console.log('Searching for actual pitcher statistics on Baseball Savant...');
  
  const teamId = 108; // LAA
  const season = '2025';
  
  // Try different URL patterns that might show actual pitcher stats
  const urls = [
    // Try removing nav=pitching to see if that changes the view
    `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&season=${season}`,
    
    // Try with nav=hitting to see the difference
    `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=hitting&season=${season}`,
    
    // Try team leaderboard approach
    `https://baseballsavant.mlb.com/leaderboard/team?season=${season}&team=${teamId}&min=q`,
    
    // Try the team overview page
    `https://baseballsavant.mlb.com/team/${teamId}?season=${season}`,
    
    // Try individual pitcher stats (this might show what we need)
    `https://baseballsavant.mlb.com/leaderboard/statcast?type=pitcher&year=${season}&team=${teamId}&min=q&min_pitches=100`,
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
      
      // Look for tables
      let foundPitchingTable = false;
      $('table').each((tableIndex, table) => {
        const $table = $(table);
        
        // Get headers
        const headers = [];
        $table.find('thead tr th').each((i, th) => {
          headers.push($(th).text().trim());
        });
        
        // Check if this looks like pitcher stats (ERA, WHIP, IP, etc.)
        const pitchingKeywords = ['ERA', 'WHIP', 'IP', 'W', 'L', 'SV', 'K/9', 'BB/9', 'FIP'];
        const foundPitchingKeywords = headers.filter(h => pitchingKeywords.some(keyword => h.includes(keyword)));
        
        if (foundPitchingKeywords.length >= 2) {
          foundPitchingTable = true;
          console.log(`✅ Found pitcher stats table!`);
          console.log(`   Table ID: "${$table.attr('id') || 'none'}"`);
          console.log(`   Table Classes: "${$table.attr('class') || 'none'}"`);
          console.log(`   Headers (${headers.length}): ${headers.join(', ')}`);
          
          // Show where key stats are located
          console.log(`   ERA at index: ${headers.indexOf('ERA')}`);
          console.log(`   WHIP at index: ${headers.indexOf('WHIP')}`);
          console.log(`   W at index: ${headers.indexOf('W')}`);
          console.log(`   L at index: ${headers.indexOf('L')}`);
          console.log(`   IP at index: ${headers.indexOf('IP')}`);
          
          // Show sample data if available
          const firstRow = $table.find('tbody tr:first-child');
          if (firstRow.length > 0) {
            console.log(`\n   Sample data from first pitcher:`);
            firstRow.find('td').each((i, td) => {
              if (i < headers.length) {
                console.log(`     ${headers[i]}: "${$(td).text().trim()}"`);
              }
            });
          }
          
          return false; // Break out of table loop
        }
      });
      
      if (!foundPitchingTable) {
        console.log(`❌ No pitcher stats table found`);
        
        // Show what tables we did find
        console.log(`   Found ${$('table').length} tables total`);
        $('table').each((i, table) => {
          const $table = $(table);
          const headers = [];
          $table.find('thead tr th').slice(0, 5).each((j, th) => {
            headers.push($(th).text().trim());
          });
          if (headers.length > 0) {
            console.log(`   Table ${i + 1}: ${headers.join(', ')}...`);
          }
        });
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

findPitcherStats();
