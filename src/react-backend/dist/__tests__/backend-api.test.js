"use strict";
/**
 * Backend API Integration Tests
 * Tests our own backend endpoints that were working in the root test files
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
describe('Backend API Integration', () => {
    const baseUrl = 'http://localhost:3000/api';
    const testTimeout = 30000; // 30 seconds for API calls
    // Helper function to conditionally skip tests that need localhost server in CI
    const conditionalTest = (name, fn, timeout) => {
        if (process.env.SKIP_LOCALHOST_TESTS === 'true') {
            console.log(`Skipping localhost test in CI: ${name}`);
            test.skip(name, fn, timeout);
        }
        else {
            test(name, fn, timeout);
        }
    };
    describe('Roster Endpoint', () => {
        conditionalTest('should return pitching stats for Yankees', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=nyy&period=season&statType=pitching`);
            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            const teamData = data[0];
            expect(teamData).toHaveProperty('players');
            expect(Array.isArray(teamData.players)).toBe(true);
            expect(teamData.players.length).toBeGreaterThan(0);
            // Check pitcher stats structure
            const pitcher = teamData.players[0];
            expect(pitcher).toHaveProperty('name');
            expect(pitcher).toHaveProperty('era');
            expect(pitcher).toHaveProperty('whip');
            expect(pitcher).toHaveProperty('wins');
            expect(pitcher).toHaveProperty('so'); // strikeouts
            console.log(`✅ Found ${teamData.players.length} pitchers for Yankees`);
            console.log(`Sample pitcher: ${pitcher.name} - ERA: ${pitcher.era}, WHIP: ${pitcher.whip}`);
        }, testTimeout);
        conditionalTest('should return batting stats for Yankees (hitting normalization)', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=nyy&period=season&statType=batting`);
            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            const teamData = data[0];
            expect(teamData).toHaveProperty('players');
            expect(Array.isArray(teamData.players)).toBe(true);
            expect(teamData.players.length).toBeGreaterThan(0);
            // Check hitter stats structure
            const hitter = teamData.players[0];
            expect(hitter).toHaveProperty('name');
            expect(hitter).toHaveProperty('avg'); // batting average
            expect(hitter).toHaveProperty('hr'); // home runs
            expect(hitter).toHaveProperty('rbi'); // RBIs
            console.log(`✅ Found ${teamData.players.length} hitters for Yankees`);
            console.log(`Sample hitter: ${hitter.name} - AVG: ${hitter.avg}, HR: ${hitter.hr}, RBI: ${hitter.rbi}`);
        }, testTimeout);
        conditionalTest('should return hitting stats for Yankees (explicit hitting)', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=nyy&period=season&statType=hitting`);
            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            const teamData = data[0];
            expect(teamData).toHaveProperty('players');
            expect(Array.isArray(teamData.players)).toBe(true);
            expect(teamData.players.length).toBeGreaterThan(0);
            console.log(`✅ Found ${teamData.players.length} hitters for Yankees (explicit hitting)`);
        }, testTimeout);
        conditionalTest('should work for multiple teams', async () => {
            const teams = ['nyy', 'bos', 'lad'];
            for (const team of teams) {
                const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=${team}&period=season&statType=batting`);
                expect(response.ok).toBe(true);
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
                expect(data.length).toBeGreaterThan(0);
                expect(data[0].players.length).toBeGreaterThan(0);
                console.log(`✅ ${team.toUpperCase()}: ${data[0].players.length} players found`);
            }
        }, testTimeout);
        conditionalTest('should validate realistic statistical values', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=nyy&period=season&statType=pitching`);
            const data = await response.json();
            const pitchers = data[0].players.slice(0, 3); // Test first 3 pitchers
            const eras = pitchers
                .map((p) => parseFloat(p.era))
                .filter((era) => !isNaN(era) && era > 0);
            const whips = pitchers
                .map((p) => parseFloat(p.whip))
                .filter((whip) => !isNaN(whip) && whip > 0);
            if (eras.length > 0) {
                const avgEra = eras.reduce((a, b) => a + b, 0) / eras.length;
                expect(avgEra).toBeGreaterThan(0);
                expect(avgEra).toBeLessThan(10); // Reasonable ERA range
                console.log(`Average ERA: ${avgEra.toFixed(2)}`);
            }
            if (whips.length > 0) {
                const avgWhip = whips.reduce((a, b) => a + b, 0) / whips.length;
                expect(avgWhip).toBeGreaterThan(0);
                expect(avgWhip).toBeLessThan(3); // Reasonable WHIP range
                console.log(`Average WHIP: ${avgWhip.toFixed(2)}`);
            }
        }, testTimeout);
    });
    describe('Other API Endpoints', () => {
        conditionalTest('should return standings data', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/standings`);
            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            if (data.length > 0) {
                const division = data[0];
                expect(division).toHaveProperty('division');
                expect(division).toHaveProperty('teams');
                expect(Array.isArray(division.teams)).toBe(true);
                console.log(`✅ Found ${data.length} divisions in standings`);
            }
        }, testTimeout);
        conditionalTest('should return games data', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/games`);
            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data).toHaveProperty('recent');
            expect(data).toHaveProperty('upcoming');
            console.log(`✅ Games endpoint working - Recent: ${data.recent?.length || 0}, Upcoming: ${data.upcoming?.length || 0}`);
        }, testTimeout);
        conditionalTest('should return trends data', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/trends`);
            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(typeof data).toBe('object');
            console.log(`✅ Trends endpoint working - Keys: ${Object.keys(data).join(', ')}`);
        }, testTimeout);
    });
    describe('Error Handling', () => {
        conditionalTest('should handle invalid team abbreviation', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster?team=invalid&period=season&statType=batting`);
            // Should either return an error status or fallback data
            if (!response.ok) {
                expect(response.status).toBeGreaterThanOrEqual(400);
            }
            else {
                // If it returns 200, it should have fallback/mock data
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
            }
        }, testTimeout);
        conditionalTest('should handle missing parameters gracefully', async () => {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/roster`);
            // Should either return an error or default to some team
            if (response.ok) {
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
            }
            else {
                expect(response.status).toBeGreaterThanOrEqual(400);
            }
        }, testTimeout);
    });
});
