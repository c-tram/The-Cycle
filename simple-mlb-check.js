// Simple MLB.com stats page analyzer
const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function checkMLBStatsPages() {
  console.log('Checking MLB.com stats pages...\n');
  
  try {
    // Check pitching stats page
    console.log('Fetching pitching stats...');
    const response = await fetch('https://www.mlb.com/stats/pitching', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const html = await response.text();
    console.log('HTML length:', html.length);
    console.log('HTML preview (first 500 chars):', html.substring(0, 500));
    
    const $ = cheerio.load(html);
    
    // Look for tables
    const tables = $('table');
    console.log('Number of tables found:', tables.length);
    
    // Look for any div containing stats data
    const statsContainers = $('[class*="stats"], [id*="stats"], [class*="table"], [id*="table"]');
    console.log('Stats containers found:', statsContainers.length);
    
    // Check page title
    const title = $('title').text();
    console.log('Page title:', title);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMLBStatsPages();
