const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:8080';

class APITester {
    constructor() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async callAPI(endpoint, method = 'GET', data = null) {
        const url = `${BASE_URL}${endpoint}`;
        console.log(chalk.blue(`🔗 ${method} ${url}`));
        console.log('---');

        try {
            const config = {
                method,
                url,
                timeout: 10000,
                validateStatus: () => true // Don't throw on HTTP error status
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            
            if (response.status >= 200 && response.status < 300) {
                console.log(chalk.green(`✅ Status: ${response.status}`));
                console.log(JSON.stringify(response.data, null, 2));
                this.passedTests++;
            } else {
                console.log(chalk.red(`❌ Status: ${response.status}`));
                console.log(JSON.stringify(response.data, null, 2));
                this.failedTests++;
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error: ${error.message}`));
            this.failedTests++;
        }

        this.totalTests++;
        console.log('\n' + '='.repeat(50) + '\n');
    }

    async testHealth() {
        console.log(chalk.yellow('🏥 Testing Health Endpoints'));
        await this.callAPI('/api/health');
        await this.callAPI('/api/redis-health');
    }

    async testPlayers() {
        console.log(chalk.yellow('⚾ Testing Player Endpoints'));
        
        // Test basic players list
        await this.callAPI('/api/players?limit=5');
        
        // Test filtered by team
        await this.callAPI('/api/players?team=NYY&limit=3');
        
        // Test specific player - try common names first
        const commonPlayers = [
            { team: 'NYY', name: 'Aaron_Judge' },
            { team: 'LAD', name: 'Mookie_Betts' },
            { team: 'HOU', name: 'Jose_Altuve' },
            { team: 'BOS', name: 'Rafael_Devers' }
        ];

        for (const player of commonPlayers) {
            await this.callAPI(`/api/players/${player.team}/${player.name}/2025`);
            await this.callAPI(`/api/players/${player.team}/${player.name}/2025/games?limit=3`);
            break; // Just test the first one for now
        }
    }

    async testTeams() {
        console.log(chalk.yellow('🏟️ Testing Team Endpoints'));
        
        // Test all teams
        await this.callAPI('/api/teams?limit=5');
        
        // Test specific teams
        const teams = ['NYY', 'LAD', 'HOU', 'BOS'];
        for (const team of teams.slice(0, 2)) { // Test first 2
            await this.callAPI(`/api/teams/${team}/2025`);
            await this.callAPI(`/api/teams/${team}/2025/games?limit=3`);
            await this.callAPI(`/api/teams/${team}/2025/roster`);
        }
    }

    async testMatchups() {
        console.log(chalk.yellow('⚔️ Testing Matchup Endpoints'));
        
        await this.callAPI('/api/matchups/players?limit=3');
        await this.callAPI('/api/matchups/teams?limit=3');
        await this.callAPI('/api/matchups/teams/NYY/vs/BOS/games?limit=2');
    }

    async testStats() {
        console.log(chalk.yellow('📊 Testing Stats Endpoints'));
        
        await this.callAPI('/api/stats/summary');
        await this.callAPI('/api/stats/leaders?category=batting&stat=avg&limit=5');
        await this.callAPI('/api/stats/leaders?category=pitching&stat=era&limit=5');
        await this.callAPI('/api/stats/search?q=Judge&limit=3');
    }

    async discoverData() {
        console.log(chalk.yellow('🔍 Discovering Available Data'));
        
        // Try to find what teams and players exist
        try {
            const response = await axios.get(`${BASE_URL}/api/stats/summary`);
            console.log('Database Summary:', JSON.stringify(response.data, null, 2));
            
            // Try to get a sample of players to see naming conventions
            const playersResponse = await axios.get(`${BASE_URL}/api/players?limit=10`);
            if (playersResponse.data.players && playersResponse.data.players.length > 0) {
                console.log('\nSample Players Found:');
                playersResponse.data.players.forEach((player, index) => {
                    console.log(`${index + 1}. ${player.name} (${player.team})`);
                });
            }
            
            // Try to get teams
            const teamsResponse = await axios.get(`${BASE_URL}/api/teams?limit=10`);
            if (teamsResponse.data.teams && teamsResponse.data.teams.length > 0) {
                console.log('\nSample Teams Found:');
                teamsResponse.data.teams.forEach((team, index) => {
                    console.log(`${index + 1}. ${team.team}`);
                });
            }
        } catch (error) {
            console.log(chalk.red(`Error discovering data: ${error.message}`));
        }
    }

    async runAllTests() {
        console.log(chalk.blue('🚀 Running Full API Test Suite'));
        console.log('='.repeat(50) + '\n');
        
        await this.discoverData();
        await this.testHealth();
        await this.testPlayers();
        await this.testTeams();
        await this.testMatchups();
        await this.testStats();
        
        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log(chalk.bold('📋 Test Summary'));
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(chalk.green(`Passed: ${this.passedTests}`));
        console.log(chalk.red(`Failed: ${this.failedTests}`));
        
        if (this.failedTests === 0) {
            console.log(chalk.green('🎉 All tests passed!'));
        } else {
            console.log(chalk.yellow(`⚠️  ${this.failedTests} test(s) failed`));
        }
    }

    async customTest(endpoint) {
        console.log(chalk.yellow(`🔧 Custom API Test: ${endpoint}`));
        await this.callAPI(endpoint);
        this.printSummary();
    }
}

// Main execution
async function main() {
    const tester = new APITester();
    const command = process.argv[2] || 'help';

    switch (command) {
        case 'health':
            await tester.testHealth();
            break;
        case 'players':
            await tester.testPlayers();
            break;
        case 'teams':
            await tester.testTeams();
            break;
        case 'matchups':
            await tester.testMatchups();
            break;
        case 'stats':
            await tester.testStats();
            break;
        case 'discover':
            await tester.discoverData();
            break;
        case 'all':
            await tester.runAllTests();
            break;
        case 'custom':
            const endpoint = process.argv[3];
            if (!endpoint) {
                console.log(chalk.red('Please provide an endpoint: npm run test:custom /api/endpoint'));
                return;
            }
            await tester.customTest(endpoint);
            break;
        case 'help':
        default:
            console.log(chalk.blue('The Cycle API Tester'));
            console.log('====================\n');
            console.log('Available commands:');
            console.log('  health     - Test health endpoints');
            console.log('  players    - Test player endpoints');
            console.log('  teams      - Test team endpoints');
            console.log('  matchups   - Test matchup endpoints');
            console.log('  stats      - Test stats endpoints');
            console.log('  discover   - Discover available data');
            console.log('  all        - Run all tests');
            console.log('  custom     - Test custom endpoint');
            console.log('  help       - Show this help\n');
            console.log('Examples:');
            console.log('  node test-api.js health');
            console.log('  node test-api.js all');
            console.log('  node test-api.js custom /api/players?team=NYY');
            break;
    }

    if (command !== 'help' && command !== 'all' && command !== 'custom') {
        tester.printSummary();
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('Unhandled Rejection at:', promise, 'reason:', reason));
});

main().catch(console.error);
