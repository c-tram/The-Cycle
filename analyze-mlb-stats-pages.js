// Analyze MLB.com stats pages structure
const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function analyzeMLBStatsPages() {
  console.log('🔍 Analyzing MLB.com stats pages...\n');
  
  try {
    // Analyze batting stats page
    console.log('📊 BATTING STATS PAGE: https://www.mlb.com/stats/');
    const battingResponse = await fetch('https://www.mlb.com/stats/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!battingResponse.ok) {
      throw new Error(`Batting stats request failed: ${battingResponse.status}`);
    }
    
    const battingHtml = await battingResponse.text();
    const $batting = cheerio.load(battingHtml);
    
    // Look for the main stats table
    const battingTable = $batting('table').first();
    console.log(`Found batting table: ${battingTable.length > 0 ? 'YES' : 'NO'}`);
    
    if (battingTable.length > 0) {
      // Analyze headers
      const headers = [];
      battingTable.find('thead th, thead td').each((i, el) => {
        const text = $batting(el).text().trim();
        if (text) headers.push(text);
      });
      console.log('Batting headers:', headers);
      
      // Analyze first few rows
      const rows = [];
      battingTable.find('tbody tr').slice(0, 3).each((i, row) => {
        const cells = [];
        $batting(row).find('td').each((j, cell) => {
          cells.push($batting(cell).text().trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      
      console.log('Sample batting rows:');
      rows.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, row.slice(0, 8)); // First 8 columns
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Analyze pitching stats page
    console.log('⚾ PITCHING STATS PAGE: https://www.mlb.com/stats/pitching');
    const pitchingResponse = await fetch('https://www.mlb.com/stats/pitching', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!pitchingResponse.ok) {
      throw new Error(`Pitching stats request failed: ${pitchingResponse.status}`);
    }
    
    const pitchingHtml = await pitchingResponse.text();
    const $pitching = cheerio.load(pitchingHtml);
    
    // Look for the main stats table
    const pitchingTable = $pitching('table').first();
    console.log(`Found pitching table: ${pitchingTable.length > 0 ? 'YES' : 'NO'}`);
    
    if (pitchingTable.length > 0) {
      // Analyze headers
      const headers = [];
      pitchingTable.find('thead th, thead td').each((i, el) => {
        const text = $pitching(el).text().trim();
        if (text) headers.push(text);
      });
      console.log('Pitching headers:', headers);
      
      // Analyze first few rows
      const rows = [];
      pitchingTable.find('tbody tr').slice(0, 3).each((i, row) => {
        const cells = [];
        $pitching(row).find('td').each((j, cell) => {
          cells.push($pitching(cell).text().trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      
      console.log('Sample pitching rows:');
      rows.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, row.slice(0, 8)); // First 8 columns
      });
    }
    
    // Look for any other table structures or data containers
    console.log('\n🔍 ADDITIONAL ANALYSIS:');
    console.log('Looking for alternative data structures...');
    
    // Check for data tables with specific classes
    const dataTables = $batting('[class*="table"], [class*="stats"], [id*="table"], [id*="stats"]');
    console.log(`Found elements with table/stats classes: ${dataTables.length}`);
    
    // Check for JSON data in script tags
    const scripts = $batting('script').toArray();
    let foundData = false;
    scripts.forEach(script => {
      const content = $batting(script).html();
      if (content && (content.includes('stats') || content.includes('players') || content.includes('batting'))) {
        console.log('Found potential data in script tag');
        foundData = true;
      }
    });
    
    if (!foundData) {
      console.log('No obvious JSON data found in script tags');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing MLB stats pages:', error.message);
  }
}

analyzeMLBStatsPages().catch(console.error);
