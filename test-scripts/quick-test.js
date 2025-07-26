#!/usr/bin/env node

// Quick test scenarios for The Cycle API
const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3001';

// Utility function to call API
async function call(endpoint) {
    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        return response.data;
    } catch (error) {
        console.error(chalk.red(`Error calling ${endpoint}: ${error.message}`));
        return null;
    }
}

// Print formatted results
function print(title, data) {
    console.log(chalk.yellow(`\n📋 ${title}`));
    console.log('─'.repeat(50));
    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    const scenario = process.argv[2] || 'help';

    switch (scenario) {
        case 'summary':
            const summary = await call('/api/stats/summary');
            print('Database Summary', summary);
            break;

        case 'leaders':
            const stat = process.argv[3] || 'battingAverage';
            const category = process.argv[4] || 'batting';
            const leaders = await call(`/api/stats/leaders?category=${category}&stat=${stat}&limit=10`);
            print(`Top 10 ${category} ${stat} Leaders`, leaders);
            break;

        case 'yankees':
            const yankees = await call('/api/teams/NYY/2025');
            const yankeesRoster = await call('/api/teams/NYY/2025/roster');
            print('Yankees Team Stats', yankees);
            print('Yankees Roster', { count: yankeesRoster?.playerCount, players: yankeesRoster?.roster?.slice(0, 5) });
            break;

        case 'judge':
            const judge = await call('/api/players/NYY/Aaron_Judge/2025');
            const judgeGames = await call('/api/players/NYY/Aaron_Judge/2025/games?limit=5');
            print('Aaron Judge Stats', judge);
            print('Aaron Judge Recent Games', judgeGames);
            break;

        case 'matchups':
            const teamMatchups = await call('/api/matchups/teams?limit=5');
            const playerMatchups = await call('/api/matchups/players?limit=5');
            print('Team vs Team Matchups', teamMatchups);
            print('Player vs Team Matchups', playerMatchups);
            break;

        case 'search':
            const query = process.argv[3] || 'Judge';
            const searchResults = await call(`/api/stats/search?q=${query}&limit=5`);
            print(`Search Results for "${query}"`, searchResults);
            break;

        case 'red-sox':
            const redSox = await call('/api/teams/BOS/2025');
            const redSoxVsYankees = await call('/api/teams/BOS/2025/vs/NYY');
            print('Red Sox Team Stats', redSox);
            print('Red Sox vs Yankees', redSoxVsYankees);
            break;

        case 'pitching':
            const eraLeaders = await call('/api/stats/leaders?category=pitching&stat=era&limit=10');
            const strikeoutLeaders = await call('/api/stats/leaders?category=pitching&stat=strikeOuts&limit=10');
            print('ERA Leaders', eraLeaders);
            print('Strikeout Leaders', strikeoutLeaders);
            break;

        case 'random-player':
            // Get a random player from the list
            const players = await call('/api/players?limit=1');
            if (players?.players?.length > 0) {
                const player = players.players[0];
                const playerDetail = await call(`/api/players/${player.team}/${player.name.replace(/\s/g, '_')}/${player.year}`);
                print(`Random Player: ${player.name} (${player.team})`, playerDetail);
            }
            break;

        case 'all-teams':
            const teams = await call('/api/teams');
            print('All Teams', { count: teams?.count, teams: teams?.teams?.map(t => t.team) });
            break;

        case 'help':
        default:
            console.log(chalk.blue('The Cycle API Quick Test Scenarios'));
            console.log('=====================================\n');
            console.log('Available scenarios:');
            console.log('  summary         - Database overview');
            console.log('  leaders [stat] [category] - Statistical leaders');
            console.log('  yankees         - Yankees team info');
            console.log('  judge           - Aaron Judge stats');
            console.log('  matchups        - Team and player matchups');
            console.log('  search [query]  - Search for players/teams');
            console.log('  red-sox         - Red Sox info and vs Yankees');
            console.log('  pitching        - Pitching leaders');
            console.log('  random-player   - Random player stats');
            console.log('  all-teams       - List all teams');
            console.log('  help            - Show this help\n');
            console.log('Examples:');
            console.log('  node quick-test.js summary');
            console.log('  node quick-test.js leaders homeRuns batting');
            console.log('  node quick-test.js search Ohtani');
            break;
    }
}

main().catch(console.error);
