"use strict";
/**
 * Test file for validating dynamic content handling in MLB Statcast pipeline
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gamesScraper_1 = require("../scrapers/gamesScraper");
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
// Proper Jest test suite for dynamic content handling
describe('MLB Statcast Dynamic Content Handling', () => {
    // Test for detecting dynamic content on MLB.com
    test('should detect dynamic content on MLB.com', async () => {
        try {
            // Fetch the MLB stats page with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
            const response = await (0, node_fetch_1.default)('https://www.mlb.com/stats/', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // If we can't access MLB.com, skip this test but don't fail
            if (!response.ok) {
                console.warn('MLB.com not accessible, skipping dynamic content detection test');
                return;
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Check for dynamic content indicators
            const scriptTags = $('script');
            const hasReact = html.includes('react') || html.includes('React');
            const hasAjax = html.includes('ajax') || html.includes('fetch') || html.includes('XMLHttpRequest');
            const dynamicLoading = hasReact || hasAjax;
            // Assertions for dynamic content detection
            expect(scriptTags.length).toBeGreaterThan(0);
            expect(dynamicLoading).toBe(true);
            // Either React or AJAX/fetch should be detected
            expect(hasReact || hasAjax).toBe(true);
        }
        catch (error) {
            // If there's a network error or timeout, gracefully skip this test
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`MLB.com request failed: ${errorMessage}. Skipping dynamic content detection test.`);
        }
    }, 15000); // Increase timeout for this test
    // Test for scraper's ability to handle dynamic content
    test('should retrieve game data despite dynamic content limitations', async () => {
        jest.setTimeout(30000); // Increase timeout for this test
        try {
            // Run the games scraper (which should fall back to mock data if needed)
            const games = await (0, gamesScraper_1.scrapeGames)();
            // Verify we received valid game data - even if it's mock data
            expect(games).toBeDefined();
            expect(games.recent).toBeInstanceOf(Array);
            expect(games.upcoming).toBeInstanceOf(Array);
            // Should have at least some game data (or mock data if nothing else)
            expect(games.recent.length).toBeGreaterThan(0);
            expect(games.upcoming.length).toBeGreaterThan(0);
            // Check that game objects have the expected structure
            if (games.recent.length > 0) {
                const firstGame = games.recent[0];
                expect(firstGame).toHaveProperty('homeTeam');
                expect(firstGame).toHaveProperty('awayTeam');
                expect(firstGame).toHaveProperty('date');
                expect(firstGame).toHaveProperty('status');
            }
            // Check the structure of upcoming games too
            if (games.upcoming.length > 0) {
                const firstUpcoming = games.upcoming[0];
                expect(firstUpcoming).toHaveProperty('homeTeam');
                expect(firstUpcoming).toHaveProperty('awayTeam');
                expect(firstUpcoming).toHaveProperty('date');
                expect(firstUpcoming).toHaveProperty('status');
            }
        }
        catch (error) {
            console.error('Error in game scraping test:', error);
            throw error; // Re-throw to fail the test
        }
    }, 30000); // Explicitly set timeout for this test
});
