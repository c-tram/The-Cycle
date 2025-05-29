// Debug script to analyze MLB.com stats pages structure
const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function analyzeMLBStatsPages() {
  console.log('🔍 Analyzing MLB.com stats pages structure...\n');
  
  const urls = [
    { type: 'batting', url: 'https://www.mlb.com/stats/' },
    { type: 'pitching', url: 'https://www.mlb.com/stats/pitching' }
  ];
  
  for (const { type, url } of urls) {
    try {
      console.log(`📊 Analyzing ${type} stats from: ${url}`);
      
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Look for table structures
      console.log(`\n📋 Tables found on ${type} page:`);
      $('table').each((index, table) => {
        const $table = $(table);
        const classes = $table.attr('class') || '';
        const id = $table.attr('id') || '';
        console.log(`  Table ${index + 1}: class="${classes}", id="${id}"`);
        
        // Get headers from first few rows
        const headers = [];
        $table.find('thead th, tr:first-child th, tr:first-child td').each((i, header) => {
          const text = $(header).text().trim();
          if (text && i < 15) { // Limit to first 15 columns
            headers.push(text);
          }
        });
        
        if (headers.length > 0) {
          console.log(`    Headers: ${headers.join(' | ')}`);
        }
        
        // Get first few data rows to understand structure
        const dataRows = [];
        $table.find('tbody tr, tr').slice(0, 3).each((rowIndex, row) => {
          if (rowIndex === 0 && $(row).find('th').length > 0) return; // Skip header row
          
          const rowData = [];
          $(row).find('td, th').each((cellIndex, cell) => {
            const text = $(cell).text().trim();
            if (cellIndex < 10) { // Limit to first 10 columns
              rowData.push(text);
            }
          });
          
          if (rowData.length > 0) {
            dataRows.push(rowData);
          }
        });
        
        if (dataRows.length > 0) {
          console.log(`    Sample data:`);
          dataRows.forEach((row, i) => {
            console.log(`      Row ${i + 1}: ${row.join(' | ')}`);
          });
        }
        console.log('');
      });
      
      // Look for any JSON data or React props
      console.log(`🔍 Searching for JSON data in ${type} page...`);
      const scripts = $('script');
      let foundData = false;
      
      scripts.each((index, script) => {
        const content = $(script).html() || '';
        if (content.includes('window.__INITIAL_STATE__') || 
            content.includes('window.__REDUX_STATE__') ||
            content.includes('"stats"') ||
            content.includes('"players"')) {
          console.log(`  Found potential data in script ${index + 1}`);
          const lines = content.split('\n');
          lines.slice(0, 5).forEach(line => {
            if (line.trim()) {
              console.log(`    ${line.trim().substring(0, 100)}...`);
            }
          });
          foundData = true;
        }
      });
      
      if (!foundData) {
        console.log('  No obvious JSON data found in scripts');
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
      
    } catch (error) {
      console.error(`❌ Error analyzing ${type} page:`, error.message);
    }
  }
}

// Run the analysis
analyzeMLBStatsPages().catch(console.error);
