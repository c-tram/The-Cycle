// ============================================================================
// MLB SPLITS MACRO API ROUTES v2
// ============================================================================
// Expose simplified macro-key splits for players and teams.
// Keys:
//   - splits:player:TEAM-Player_Name-YEAR
//   - splits:team:TEAM:YEAR
// Optional query: ?path=by_location.home or compound.count_vs_pitcher.MIA-Anthony_Bender.2-2.away
// ============================================================================

const express = require('express');
const { getRedisClient, getKeysByPattern, getMultipleKeys } = require('../utils/redis');
const router = express.Router();

// Helpers
function normalizePlayer(param) {
  // Incoming URL uses dashes; macro uses underscores
  return (param || '').replace(/-/g, '_');
}

function makePlayerKey(team, player, season) {
  return `splits:player:${team}-${normalizePlayer(player)}-${season}`;
}

function makeTeamKey(team, season) {
  return `splits:team:${team}:${season}`;
}

function getByPath(root, pathStr) {
  if (!pathStr) return root;
  const parts = pathStr.split('.').filter(Boolean);
  let node = root;
  for (const p of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[p];
  }
  return node;
}

async function readKey(key) {
  const client = getRedisClient();
  const raw = await client.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// GET /api/v2/splits/macro/player/:team/:player/:season
router.get('/macro/player/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params;
    const { path } = req.query; // optional path into splits
    const key = makePlayerKey(team.toUpperCase(), player, season);
    const data = await readKey(key);
    if (!data) return res.status(404).json({ error: 'Not found', key });

    if (path) {
      const subtree = getByPath(data.splits || {}, path);
      if (subtree == null) {
        return res.status(404).json({ error: 'Path not found', key, path });
      }
      return res.json({ key, info: data.info, games: data.games, lastUpdated: data.lastUpdated, path, data: subtree });
    }

    res.json({ key, ...data });
  } catch (err) {
    console.error('macro/player error:', err);
    res.status(500).json({ error: 'Failed to fetch player macro splits' });
  }
});

// GET /api/v2/splits/macro/team/:team/:season
router.get('/macro/team/:team/:season', async (req, res) => {
  try {
    const { team, season } = req.params;
    const { path } = req.query;
    const key = makeTeamKey(team.toUpperCase(), season);
    const data = await readKey(key);
    if (!data) return res.status(404).json({ error: 'Not found', key });

    if (path) {
      const subtree = getByPath(data.splits || {}, path);
      if (subtree == null) {
        return res.status(404).json({ error: 'Path not found', key, path });
      }
      return res.json({ key, info: data.info, games: data.games, lastUpdated: data.lastUpdated, path, data: subtree });
    }

    res.json({ key, ...data });
  } catch (err) {
    console.error('macro/team error:', err);
    res.status(500).json({ error: 'Failed to fetch team macro splits' });
  }
});

// GET /api/v2/splits/players/available-players?season=2025
// Returns a lightweight list of players that have macro split data
router.get('/players/available-players', async (req, res) => {
  try {
    const season = (req.query.season || '2025').toString();
    const pattern = `splits:player:*-${season}`;
    const client = getRedisClient();

    // Use SCAN to avoid KEYS blocking; collect matching keys
    let cursor = '0';
    const keys = [];
    do {
      // ioredis: scan returns [nextCursor, keysArray]
      // eslint-disable-next-line no-await-in-loop
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
      cursor = result[0];
      const batch = result[1] || [];
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length === 0) return res.json({ players: [], count: 0 });

    // Derive player list from keys without fetching values (fast)
    const players = keys.map((key) => {
      // key format: splits:player:TEAM-Player_Name-YEAR
      const base = key.split(':')[2] || '';
      const parts = base.split('-');
      const team = (parts[0] || '').toUpperCase();
      const year = parts[parts.length - 1] || season;
      const nameRaw = parts.slice(1, -1).join('-');
      const name = nameRaw.replace(/_/g, ' ');
      return {
        id: `${team}-${nameRaw}-${year}`,
        team,
        name,
        season: year,
        keyCount: 0 // lightweight listing; omit heavy value reads
      };
    });

    res.json({ players, count: players.length });
  } catch (err) {
    console.error('available-players error:', err);
    res.status(500).json({ error: 'Failed to list available players' });
  }
});

// GET /api/v2/splits/players/search?q=ben&season=2025&team=NYY&limit=20
router.get('/players/search', async (req, res) => {
  try {
    const season = (req.query.season || '2025').toString();
    const q = (req.query.q || '').toString();
    const team = (req.query.team || '').toString().toUpperCase();
    const limit = Math.min(parseInt(req.query.limit || '20', 10) || 20, 100);

    // Build a narrow SCAN pattern when team is provided
    const pattern = team
      ? `splits:player:${team}-*-${season}`
      : `splits:player:*-${season}`;

    // Normalize query for flexible matching (case/space/underscore insensitive)
    const normalize = (s) => (s || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const qNorm = normalize(q);

    const client = getRedisClient();
    let cursor = '0';
    const players = [];

    // SCAN until we gather 'limit' matches or cursor finishes
    do {
      // eslint-disable-next-line no-await-in-loop
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
      cursor = result[0];
      const batch = result[1] || [];
      for (const key of batch) {
        // key: splits:player:TEAM-Player_Name-YEAR
        const base = key.split(':')[2] || '';
        const parts = base.split('-');
        const t = (parts[0] || '').toUpperCase();
        const year = parts[parts.length - 1] || season;
        const nameRaw = parts.slice(1, -1).join('-');
        const name = nameRaw.replace(/_/g, ' ');
        if (qNorm) {
          const nameNorm = normalize(name);
          if (!nameNorm.includes(qNorm)) continue;
        }
        players.push({ id: `${t}-${nameRaw}-${year}`, team: t, name, season: year, keyCount: 0 });
        if (players.length >= limit) break;
      }
      if (players.length >= limit) break;
    } while (cursor !== '0');

    res.json({ players, count: players.length, truncated: cursor !== '0' });
  } catch (err) {
    console.error('players/search error:', err);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

module.exports = router;
