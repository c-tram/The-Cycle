const cheerio = require('cheerio');
const fetch = require('node-fetch');

async function debugPitchingTable() {
  console.log('Debugging Baseball Savant pitching table structure...');
  
  try {
    // Use the exact same URL pattern and headers as the main backend
    const teamAbbr = 'laa'; // Los Angeles Angels abbreviation
    const teamId = 108; // LAA team ID from TEAM_ID_MAP
    const season = '2024';
    
    // Build URL exactly like the backend does for pitching
    const urlParams = new URLSearchParams();
    urlParams.append('season', season);
    const url = `https://baseballsavant.mlb.com/team/${teamId}?view=statcast&nav=pitching&${urlParams.toString()}`;
    
    console.log('Fetching URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for the pitching table
    console.log('\n=== Checking for statcast tables ===');
    
    const statcastPitching = $('#statcastPitching .table-savant table');
    console.log(`Found #statcastPitching table: ${statcastPitching.length > 0}`);
    
    if (statcastPitching.length > 0) {
      console.log('\n=== PITCHING TABLE HEADERS ===');
      statcastPitching.find('thead tr th').each((i, element) => {
        const headerText = $(element).text().trim();
        console.log(`Column ${i}: "${headerText}"`);
      });

      console.log('\n=== FIRST FEW ROWS OF PITCHING DATA ===');
      statcastPitching.find('tbody tr').slice(0, 3).each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        console.log(`\nRow ${rowIndex + 1}:`);
        cells.each((cellIndex, cell) => {
          const cellText = $(cell).text().trim();
          console.log(`  Column ${cellIndex}: "${cellText}"`);
        });
      });
    }
    
    // Also check for any other tables
    console.log('\n=== ALL TABLES ON PAGE ===');
    $('table').each((index, table) => {
      const tableId = $(table).attr('id') || 'no-id';
      const tableClass = $(table).attr('class') || 'no-class';
      const headerCount = $(table).find('thead tr th').length;
      const rowCount = $(table).find('tbody tr').length;
      console.log(`Table ${index}: id="${tableId}", class="${tableClass}", headers=${headerCount}, rows=${rowCount}`);
    });

  } catch (error) {
    console.error('Error debugging table:', error);
  }
}

debugPitchingTable();
