// Simple MLB API test
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing MLB API connection...');
    
    // Try the basic teams endpoint first
    const teamsUrl = 'https://statsapi.mlb.com/api/v1/teams?sportId=1';
    console.log('Fetching:', teamsUrl);
    
    const response = await fetch(teamsUrl);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Found', data.teams?.length, 'teams');
      console.log('First team:', data.teams?.[0]?.name);
    } else {
      console.log('Failed with status:', response.status);
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAPI();
