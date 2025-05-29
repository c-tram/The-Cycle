// Debug script to check Baseball Savant column headers for LAA pitching table
const cheerio = require('cheerio');
const fetch = require('node-fetch');

async function debugColumnHeaders() {
  console.log('Debugging Baseball Savant column headers for LAA pitching...');
  
  try {
    // Use the exact same URL pattern as the backend
    const teamId = 108; // LAA team ID
    const season = '2025';
    
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
      console.log('Response status:', response.status);
      console.log('Response text preview:', (await response.text()).substring(0, 500));
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for the main pitching table (same selector as backend)
    const table = $('#statcastPitching .table-savant table');
    
    if (table.length === 0) {
      console.log('No #statcastPitching table found. Looking for other tables...');
      
      // Check all tables on the page
      $('table').each((index, tableEl) => {
        const tableId = $(tableEl).attr('id') || 'no-id';
        const tableClass = $(tableEl).attr('class') || 'no-class';
        console.log(`Table ${index}: id="${tableId}", class="${tableClass}"`);
        
        const headerCount = $(tableEl).find('thead tr th').length;
        if (headerCount > 10) { // Likely a stats table
          console.log(`  Headers (${headerCount}):`);
          $(tableEl).find('thead tr th').each((i, th) => {
            const headerText = $(th).text().trim();
            console.log(`    ${i}: "${headerText}"`);
          });
        }
      });
      return;
    }

    console.log('\n=== COLUMN HEADERS ===');
    table.find('thead tr th').each((i, element) => {
      const headerText = $(element).text().trim();
      console.log(`Column ${i}: "${headerText}"`);
    });

    console.log('\n=== SAMPLE DATA (First Player) ===');
    const firstRow = table.find('tbody tr').first();
    const cells = firstRow.find('td');
    
    console.log('Row data:');
    cells.each((cellIndex, cell) => {
      const cellText = $(cell).text().trim();
      console.log(`  Column ${cellIndex}: "${cellText}"`);
    });

    console.log('\n=== STATS ARRAY MAPPING (Starting from column 2) ===');
    cells.each((cellIndex, cell) => {
      if (cellIndex >= 2) {
        const cellText = $(cell).text().trim();
        const statsIndex = cellIndex - 2;
        console.log(`  stats[${statsIndex}] = column ${cellIndex} = "${cellText}"`);
      }
    });

  } catch (error) {
    console.error('Error debugging headers:', error);
  }
}

debugColumnHeaders();
