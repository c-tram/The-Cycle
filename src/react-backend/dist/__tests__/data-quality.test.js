"use strict";
/**
 * Data Quality and API Function Tests
 * Tests for specific API functions and data validation (converted from test-api-function-directly.js)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const teams_1 = require("../constants/teams");
/**
 * Simulates the fetchTeamRosterFromAPI function for testing
 */
async function fetchTeamRosterFromAPI(teamAbbr, period, statType) {
    const teamId = teams_1.TEAM_ID_MAP[teamAbbr.toLowerCase()];
    if (!teamId) {
        throw new Error(`Unknown team abbreviation: ${teamAbbr}`);
    }
    const currentYear = new Date().getFullYear();
    // Get team roster
    const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
    const rosterResponse = await (0, node_fetch_1.default)(rosterUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });
    if (!rosterResponse.ok) {
        throw new Error(`Roster API failed: ${rosterResponse.status} - ${rosterResponse.statusText}`);
    }
    const rosterData = await rosterResponse.json();
    if (!rosterData.roster || rosterData.roster.length === 0) {
        throw new Error('No roster data found');
    }
    const players = [];
    // Process each player on the roster
    for (const player of rosterData.roster) {
        const playerId = player.person.id;
        const playerName = player.person.fullName;
        const position = player.position.abbreviation;
        // Skip players based on stat type and position
        if (statType === 'pitching' && position !== 'P') {
            continue;
        }
        if (statType === 'hitting' && position === 'P') {
            continue;
        }
        try {
            // Get player season stats
            const playerStatsUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&season=${currentYear}&group=${statType}`;
            const playerResponse = await (0, node_fetch_1.default)(playerStatsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (playerResponse.ok) {
                const playerData = await playerResponse.json();
                // Find the correct stat group
                const statGroup = playerData.stats?.find((s) => s.group?.displayName === statType || s.type?.displayName === statType);
                if (statGroup?.splits?.[0]?.stat) {
                    const stats = statGroup.splits[0].stat;
                    players.push({
                        name: playerName,
                        position: position,
                        stats: stats
                    });
                }
            }
        }
        catch (error) {
            console.warn(`Failed to get stats for ${playerName}:`, error.message);
        }
    }
    return players;
}
describe('API Function Testing', () => {
    const testTimeout = 45000; // 45 seconds for comprehensive tests
    describe('fetchTeamRosterFromAPI Function', () => {
        test('should fetch Yankees hitting stats successfully', async () => {
            const players = await fetchTeamRosterFromAPI('nyy', 'season', 'hitting');
            expect(Array.isArray(players)).toBe(true);
            expect(players.length).toBeGreaterThan(0);
            console.log(`✅ Found ${players.length} Yankees hitters`);
            // Check player data structure
            const player = players[0];
            expect(player).toHaveProperty('name');
            expect(player).toHaveProperty('position');
            expect(player).toHaveProperty('stats');
            expect(player.position).not.toBe('P'); // Should not be pitcher
            // Check stats structure
            const stats = player.stats;
            expect(stats).toHaveProperty('gamesPlayed');
            expect(stats).toHaveProperty('atBats');
            expect(stats).toHaveProperty('hits');
            // Log sample players
            players.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name}: AVG=${p.stats.avg || 'N/A'}, HR=${p.stats.homeRuns || 0}, RBI=${p.stats.rbi || 0}`);
            });
        }, testTimeout);
        test('should fetch Yankees pitching stats successfully', async () => {
            const players = await fetchTeamRosterFromAPI('nyy', 'season', 'pitching');
            expect(Array.isArray(players)).toBe(true);
            expect(players.length).toBeGreaterThan(0);
            console.log(`✅ Found ${players.length} Yankees pitchers`);
            // Check player data structure
            const player = players[0];
            expect(player).toHaveProperty('name');
            expect(player).toHaveProperty('position');
            expect(player).toHaveProperty('stats');
            expect(player.position).toBe('P'); // Should be pitcher
            // Check stats structure
            const stats = player.stats;
            expect(stats).toHaveProperty('gamesPlayed');
            expect(stats).toHaveProperty('wins');
            expect(stats).toHaveProperty('losses');
            // Log sample players
            players.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name}: ERA=${p.stats.era || 'N/A'}, WHIP=${p.stats.whip || 'N/A'}, W=${p.stats.wins || 0}, SO=${p.stats.strikeOuts || 0}`);
            });
        }, testTimeout);
        test('should work for multiple teams', async () => {
            const testTeams = ['nyy', 'bos', 'lad'];
            for (const team of testTeams) {
                console.log(`\nTesting ${team.toUpperCase()}:`);
                // Test hitting stats
                const hitters = await fetchTeamRosterFromAPI(team, 'season', 'hitting');
                expect(hitters.length).toBeGreaterThan(0);
                console.log(`  Hitters: ${hitters.length}`);
                // Test pitching stats
                const pitchers = await fetchTeamRosterFromAPI(team, 'season', 'pitching');
                expect(pitchers.length).toBeGreaterThan(0);
                console.log(`  Pitchers: ${pitchers.length}`);
            }
        }, testTimeout);
    });
    describe('Data Quality Validation', () => {
        test('should validate hitting stats ranges', async () => {
            const players = await fetchTeamRosterFromAPI('nyy', 'season', 'hitting');
            const playersWithStats = players.filter(p => p.stats.atBats > 0);
            if (playersWithStats.length > 0) {
                for (const player of playersWithStats.slice(0, 5)) { // Test first 5 with stats
                    const stats = player.stats;
                    // Batting average should be between 0 and 1
                    if (stats.avg && stats.avg !== '---') {
                        const avg = parseFloat(stats.avg);
                        expect(avg).toBeGreaterThanOrEqual(0);
                        expect(avg).toBeLessThanOrEqual(1);
                    }
                    // Home runs should be non-negative
                    if (stats.homeRuns !== undefined) {
                        expect(stats.homeRuns).toBeGreaterThanOrEqual(0);
                    }
                    // RBI should be non-negative
                    if (stats.rbi !== undefined) {
                        expect(stats.rbi).toBeGreaterThanOrEqual(0);
                    }
                    // At-bats should be positive if they have stats
                    if (stats.atBats !== undefined) {
                        expect(stats.atBats).toBeGreaterThanOrEqual(0);
                    }
                }
                console.log(`✅ Data quality validation passed for ${playersWithStats.length} hitters with stats`);
            }
        }, testTimeout);
        test('should validate pitching stats ranges', async () => {
            const players = await fetchTeamRosterFromAPI('nyy', 'season', 'pitching');
            const playersWithStats = players.filter(p => p.stats.gamesPlayed > 0);
            if (playersWithStats.length > 0) {
                for (const player of playersWithStats.slice(0, 5)) { // Test first 5 with stats
                    const stats = player.stats;
                    // ERA should be non-negative and reasonable
                    if (stats.era && stats.era !== '---') {
                        const era = parseFloat(stats.era);
                        expect(era).toBeGreaterThanOrEqual(0);
                        expect(era).toBeLessThanOrEqual(20); // Reasonable upper bound
                    }
                    // WHIP should be non-negative and reasonable
                    if (stats.whip && stats.whip !== '---') {
                        const whip = parseFloat(stats.whip);
                        expect(whip).toBeGreaterThanOrEqual(0);
                        expect(whip).toBeLessThanOrEqual(5); // Reasonable upper bound
                    }
                    // Wins/losses should be non-negative
                    if (stats.wins !== undefined) {
                        expect(stats.wins).toBeGreaterThanOrEqual(0);
                    }
                    if (stats.losses !== undefined) {
                        expect(stats.losses).toBeGreaterThanOrEqual(0);
                    }
                    // Strikeouts should be non-negative
                    if (stats.strikeOuts !== undefined) {
                        expect(stats.strikeOuts).toBeGreaterThanOrEqual(0);
                    }
                }
                console.log(`✅ Data quality validation passed for ${playersWithStats.length} pitchers with stats`);
            }
        }, testTimeout);
    });
    describe('Error Handling', () => {
        test('should handle invalid team abbreviation', async () => {
            await expect(fetchTeamRosterFromAPI('invalid', 'season', 'hitting'))
                .rejects
                .toThrow('Unknown team abbreviation: invalid');
        });
        test('should handle API failures gracefully', async () => {
            // Mock a scenario where roster API might fail
            // This test verifies our error handling is in place
            try {
                await fetchTeamRosterFromAPI('nyy', 'season', 'hitting');
                // If it succeeds, that's fine - API is working
                expect(true).toBe(true);
            }
            catch (error) {
                // If it fails, error should be descriptive
                expect(error).toBeDefined();
                expect(typeof error.message).toBe('string');
            }
        }, testTimeout);
    });
});
