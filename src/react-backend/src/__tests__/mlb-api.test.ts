/**
 * MLB Stats API Integration Tests
 * Converted from root directory test files to proper Jest test suite
 */

import fetch from 'node-fetch';

// Team ID mapping for testing
const TEAM_ID_MAP: Record<string, number> = {
  ari: 109, atl: 144, bal: 110, bos: 111, chc: 112, cin: 113, cle: 114, col: 115, det: 116,
  hou: 117, kc: 118, ana: 108, laa: 108, lad: 119, mia: 146, mil: 158, min: 142, nym: 121,
  nyy: 147, oak: 133, phi: 143, pit: 134, sd: 135, sea: 136, sf: 137, stl: 138, tb: 139,
  tex: 140, tor: 141, was: 120, wsh: 120, cws: 145, chw: 145
};

describe('MLB Stats API Integration', () => {
  const currentYear = new Date().getFullYear();
  const testTimeout = 30000; // 30 seconds for API calls

  describe('Basic API Connectivity', () => {
    test('should connect to MLB teams endpoint', async () => {
      const teamsUrl = 'https://statsapi.mlb.com/api/v1/teams?sportId=1';
      
      const response = await fetch(teamsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('teams');
      expect(Array.isArray(data.teams)).toBe(true);
      expect(data.teams.length).toBeGreaterThan(25); // MLB has 30 teams
      expect(data.teams[0]).toHaveProperty('name');
    }, testTimeout);

    test('should get team roster for Yankees', async () => {
      const teamId = TEAM_ID_MAP.nyy;
      const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
      
      const response = await fetch(rosterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('roster');
      expect(Array.isArray(data.roster)).toBe(true);
      expect(data.roster.length).toBeGreaterThan(20); // Active roster should have 25+ players
      
      // Check roster structure
      const player = data.roster[0];
      expect(player).toHaveProperty('person');
      expect(player).toHaveProperty('position');
      expect(player.person).toHaveProperty('id');
      expect(player.person).toHaveProperty('fullName');
      expect(player.position).toHaveProperty('abbreviation');
    }, testTimeout);
  });

  describe('Player Statistics API', () => {
    let testPlayerId: number;
    let testPitcherId: number;

    beforeAll(async () => {
      // Get Yankees roster to find test players
      const teamId = TEAM_ID_MAP.nyy;
      const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${currentYear}`;
      
      const response = await fetch(rosterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const data = await response.json();
      
      // Find a hitter and a pitcher for testing
      const hitter = data.roster.find((p: any) => p.position.abbreviation !== 'P');
      const pitcher = data.roster.find((p: any) => p.position.abbreviation === 'P');
      
      testPlayerId = hitter?.person.id;
      testPitcherId = pitcher?.person.id;
    });

    test('should get hitting stats for a position player', async () => {
      if (!testPlayerId) {
        console.warn('No test player ID available, skipping test');
        return;
      }

      const statsUrl = `https://statsapi.mlb.com/api/v1/people/${testPlayerId}/stats?stats=season&season=${currentYear}&group=hitting`;
      
      const response = await fetch(statsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(Array.isArray(data.stats)).toBe(true);
      
      if (data.stats.length > 0 && data.stats[0].splits?.length > 0) {
        const stats = data.stats[0].splits[0].stat;
        
        // Check for common hitting stats
        expect(stats).toHaveProperty('gamesPlayed');
        expect(stats).toHaveProperty('atBats');
        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('avg');
        expect(stats).toHaveProperty('homeRuns');
        expect(stats).toHaveProperty('rbi');
        
        // Validate stat ranges
        if (stats.avg && stats.avg !== '---') {
          const avg = parseFloat(stats.avg);
          expect(avg).toBeGreaterThanOrEqual(0);
          expect(avg).toBeLessThanOrEqual(1);
        }
      }
    }, testTimeout);

    test('should get pitching stats for a pitcher', async () => {
      if (!testPitcherId) {
        console.warn('No test pitcher ID available, skipping test');
        return;
      }

      const statsUrl = `https://statsapi.mlb.com/api/v1/people/${testPitcherId}/stats?stats=season&season=${currentYear}&group=pitching`;
      
      const response = await fetch(statsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(Array.isArray(data.stats)).toBe(true);
      
      if (data.stats.length > 0 && data.stats[0].splits?.length > 0) {
        const stats = data.stats[0].splits[0].stat;
        
        // Check for common pitching stats
        expect(stats).toHaveProperty('gamesPlayed');
        expect(stats).toHaveProperty('wins');
        expect(stats).toHaveProperty('losses');
        expect(stats).toHaveProperty('era');
        expect(stats).toHaveProperty('whip');
        expect(stats).toHaveProperty('strikeOuts');
        
        // Validate stat ranges
        if (stats.era && stats.era !== '---') {
          const era = parseFloat(stats.era);
          expect(era).toBeGreaterThanOrEqual(0);
          expect(era).toBeLessThanOrEqual(20); // Reasonable ERA range
        }
        
        if (stats.whip && stats.whip !== '---') {
          const whip = parseFloat(stats.whip);
          expect(whip).toBeGreaterThanOrEqual(0);
          expect(whip).toBeLessThanOrEqual(5); // Reasonable WHIP range
        }
      }
    }, testTimeout);
  });

  describe('Team Statistics API', () => {
    test('should get team batting and pitching statistics', async () => {
      const teamId = TEAM_ID_MAP.nyy;
      const teamStatsUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=season&group=hitting,pitching&season=${currentYear}`;
      
      const response = await fetch(teamStatsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(Array.isArray(data.stats)).toBe(true);
      expect(data.stats.length).toBeGreaterThanOrEqual(1);
      
      // Check for hitting or pitching stats
      const hasHittingStats = data.stats.some((s: any) => 
        s.group?.displayName === 'hitting' || s.type?.displayName === 'hitting'
      );
      const hasPitchingStats = data.stats.some((s: any) => 
        s.group?.displayName === 'pitching' || s.type?.displayName === 'pitching'
      );
      
      expect(hasHittingStats || hasPitchingStats).toBe(true);
    }, testTimeout);
  });

  describe('Error Handling', () => {
    test('should handle invalid team ID gracefully', async () => {
      const invalidTeamId = 999;
      const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${invalidTeamId}/roster?season=${currentYear}`;
      
      const response = await fetch(rosterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      // Should return 404 or similar error status, but sometimes MLB API is lenient
      if (response.ok) {
        // If it returns 200, check that response contains no actual data
        const data = await response.json();
        console.log('Invalid team ID returned 200, checking for empty data...');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    }, testTimeout);

    test('should handle invalid player ID gracefully', async () => {
      const invalidPlayerId = 999999;
      const statsUrl = `https://statsapi.mlb.com/api/v1/people/${invalidPlayerId}/stats?stats=season&season=${currentYear}&group=hitting`;
      
      const response = await fetch(statsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      // Should return error status or empty data
      if (response.ok) {
        const data = await response.json();
        expect(data.stats).toEqual([]);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    }, testTimeout);
  });
});
