// Clean unified macro splits route (replaces prior duplicated/partial code)
const express = require('express');
const router = express.Router();
const { getRedisClient, getMultipleKeys } = require('../utils/redis');

// ---------------- Basic stat helpers ----------------
function addInnings(a, b) {
  const toOuts = (ip) => {
    if (!ip) return 0;
    const parts = String(ip).split('.');
    return (parseInt(parts[0] || '0', 10) * 3) + parseInt(parts[1] || '0', 10);
  };
  const outs = toOuts(a) + toOuts(b);
  const whole = Math.floor(outs / 3);
  const rem = outs % 3; return `${whole}.${rem}`;
}
function aggregatePitchingTotals(acc, p) {
  if (!p) return acc;
  acc.inningsPitched = addInnings(acc.inningsPitched, p.inningsPitched || '0.0');
  acc.strikeOuts += p.strikeOuts || p.strikeouts || 0;
  acc.baseOnBalls += p.baseOnBalls || p.walks || 0;
  acc.hits += p.hits || 0; acc.homeRuns += p.homeRuns || 0; acc.earnedRuns += p.earnedRuns || 0; acc.battersFaced += p.battersFaced || 0; return acc;
}
function finalizePitching(p) {
  const parts = String(p.inningsPitched || '0.0').split('.');
  const outs = (parseInt(parts[0] || '0', 10) * 3) + parseInt(parts[1] || '0', 10);
  const innings = outs / 3;
  if (innings > 0) {
    if (p.era == null) p.era = (p.earnedRuns * 9) / innings;
    if (p.whip == null) p.whip = (p.baseOnBalls + p.hits) / innings;
    p.k9 = (p.strikeOuts * 9) / innings; p.bb9 = (p.baseOnBalls * 9) / innings;
    p.kRate = p.battersFaced > 0 ? p.strikeOuts / p.battersFaced : 0; p.bbRate = p.battersFaced > 0 ? p.baseOnBalls / p.battersFaced : 0;
  } else { p.era = p.era || 0; p.whip = p.whip || 0; p.k9 = 0; p.bb9 = 0; p.kRate = 0; p.bbRate = 0; }
  return p;
}
function aggregateBattingTotals(acc, b) {
  if (!b) return acc;
  const fields = ['plateAppearances','atBats','hits','doubles','triples','homeRuns','baseOnBalls','walks','strikeOuts','strikeouts','hitByPitch','sacrificeFlies','totalBases'];
  fields.forEach(f => { if (typeof b[f] === 'number') acc[f] = (acc[f] || 0) + b[f]; }); return acc;
}
function finalizeBatting(b) {
  const atBats = b.atBats || 0; const hits = b.hits || 0;
  const pa = b.plateAppearances || (atBats + (b.baseOnBalls||b.walks||0) + (b.hitByPitch||0) + (b.sacrificeFlies||0));
  b.avg = atBats > 0 ? hits / atBats : 0; const obNumer = hits + (b.baseOnBalls||b.walks||0) + (b.hitByPitch||0);
  b.obp = pa > 0 ? obNumer / pa : 0; const singles = hits - (b.doubles||0) - (b.triples||0) - (b.homeRuns||0);
  const tb = singles + 2*(b.doubles||0) + 3*(b.triples||0) + 4*(b.homeRuns||0); b.slg = atBats > 0 ? tb / atBats : 0; b.ops = b.obp + b.slg;
  b.kRate = pa > 0 ? ((b.strikeOuts||b.strikeouts||0) / pa) : 0; b.bbRate = pa > 0 ? ((b.baseOnBalls||b.walks||0) / pa) : 0; return b;
}

// -------- path utilities / compacting --------
const isPlainObject = (o) => o && typeof o === 'object' && !Array.isArray(o);
function getByPath(root, pathStr) {
  if (!pathStr) return root; const parts = pathStr.split('.').filter(Boolean); let node = root;
  for (const p of parts) { if (!node || typeof node !== 'object') return null; node = node[p]; }
  return node;
}
function compactNode(node, opts = {}) {
  const { stripGames = true, maxDepth = Infinity } = opts;
  function walk(n, depth) {
    if (!isPlainObject(n)) return n; const out = {};
    for (const [k,v] of Object.entries(n)) {
      if (stripGames && k === 'games') { out.gameCount = Array.isArray(v)?v.length:0; continue; }
      if (depth >= maxDepth && k === 'splits') { out.splits = '[truncated]'; continue; }
      out[k] = isPlainObject(v) ? walk(v, depth+1) : v;
    } return out;
  } return walk(node,0);
}
async function readKey(key) { const client = getRedisClient(); const raw = await client.get(key); if (!raw) return null; try { return JSON.parse(raw);} catch { return null;} }
function normalizePlayerSegment(raw = '') {
  return raw
    .replace(/%20/gi, ' ')
    .replace(/[\s-]+/g, '_') // unify to underscores
    .replace(/__+/g, '_');
}
const makePlayerKey = (team, player, season) => {
  const seg = normalizePlayerSegment(player);
  return `splits:player:${team}-${seg}-${season}`;
};
// Helper to fetch raw game keys with fallback patterns (underscore primary, hyphen secondary)
async function fetchRawGameKeysForPlayer(team, playerSeg, season, client) {
  const underscoreSeg = normalizePlayerSegment(playerSeg);
  const patternBase = `player:${team}-${underscoreSeg}-${season}`;
  let keys = await client.keys(`${patternBase}:????-??-??-*`);
  if (!keys.length) {
    // Try hyphen variant (legacy or alternative formatting)
    const hyphenSeg = underscoreSeg.replace(/_/g, '-');
    const hyphenPattern = `player:${team}-${hyphenSeg}-${season}`;
    keys = await client.keys(`${hyphenPattern}:????-??-??-*`);
  }
  return keys;
}
const makeTeamKey = (team, season) => `splits:team:${team}:${season}`;

// -------- dynamic on-the-fly builder if precomputed key absent --------
async function buildPlayerMacroOnTheFly(team, player, season) {
  const client = getRedisClient();
  const gameKeys = await fetchRawGameKeysForPlayer(team, player, season, client);
  if (!gameKeys.length) return null;
  const rawGames = await getMultipleKeys(gameKeys);
  const macro = { by_location: {}, vs_handedness: {}, vs_teams: {}, vs_pitchers: {} };
  rawGames.forEach(g => {
    const data = g.data || {}; const gi = data.gameInfo || {};
    const loc = gi.homeAway === 'home' ? 'home' : gi.homeAway === 'away' ? 'away' : 'unknown';
    if (!macro.by_location[loc]) macro.by_location[loc] = { stats: { batting: {}, pitching: {} } };
    macro.by_location[loc].stats.batting = aggregateBattingTotals(macro.by_location[loc].stats.batting, data.batting);
    macro.by_location[loc].stats.pitching = aggregatePitchingTotals(macro.by_location[loc].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    const pHand = gi.opponentPitcherHand || gi.pitcherHand || 'U';
    if (!macro.vs_handedness[pHand]) macro.vs_handedness[pHand] = { stats: { batting: {}, pitching: {} }, by_location: {} };
    macro.vs_handedness[pHand].stats.batting = aggregateBattingTotals(macro.vs_handedness[pHand].stats.batting, data.batting);
    macro.vs_handedness[pHand].stats.pitching = aggregatePitchingTotals(macro.vs_handedness[pHand].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    if (!macro.vs_handedness[pHand].by_location[loc]) macro.vs_handedness[pHand].by_location[loc] = { stats: { batting: {}, pitching: {} } };
    macro.vs_handedness[pHand].by_location[loc].stats.batting = aggregateBattingTotals(macro.vs_handedness[pHand].by_location[loc].stats.batting, data.batting);
    macro.vs_handedness[pHand].by_location[loc].stats.pitching = aggregatePitchingTotals(macro.vs_handedness[pHand].by_location[loc].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    const opp = gi.opponent || gi.opponentTeam || 'UNK';
    if (!macro.vs_teams[opp]) macro.vs_teams[opp] = { stats: { batting: {}, pitching: {} }, by_location: {} };
    macro.vs_teams[opp].stats.batting = aggregateBattingTotals(macro.vs_teams[opp].stats.batting, data.batting);
    macro.vs_teams[opp].stats.pitching = aggregatePitchingTotals(macro.vs_teams[opp].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    if (!macro.vs_teams[opp].by_location[loc]) macro.vs_teams[opp].by_location[loc] = { stats: { batting: {}, pitching: {} } };
    macro.vs_teams[opp].by_location[loc].stats.batting = aggregateBattingTotals(macro.vs_teams[opp].by_location[loc].stats.batting, data.batting);
    macro.vs_teams[opp].by_location[loc].stats.pitching = aggregatePitchingTotals(macro.vs_teams[opp].by_location[loc].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    if (gi.opponentPitcher) {
      const pitcherKey = gi.opponentPitcher.replace(/\s+/g, '-');
      if (!macro.vs_pitchers[pitcherKey]) macro.vs_pitchers[pitcherKey] = { stats: { batting: {}, pitching: {} }, by_location: {} };
      macro.vs_pitchers[pitcherKey].stats.batting = aggregateBattingTotals(macro.vs_pitchers[pitcherKey].stats.batting, data.batting);
      macro.vs_pitchers[pitcherKey].stats.pitching = aggregatePitchingTotals(macro.vs_pitchers[pitcherKey].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
      if (!macro.vs_pitchers[pitcherKey].by_location[loc]) macro.vs_pitchers[pitcherKey].by_location[loc] = { stats: { batting: {}, pitching: {} } };
      macro.vs_pitchers[pitcherKey].by_location[loc].stats.batting = aggregateBattingTotals(macro.vs_pitchers[pitcherKey].by_location[loc].stats.batting, data.batting);
      macro.vs_pitchers[pitcherKey].by_location[loc].stats.pitching = aggregatePitchingTotals(macro.vs_pitchers[pitcherKey].by_location[loc].stats.pitching || { inningsPitched:'0.0', strikeOuts:0, baseOnBalls:0, hits:0, homeRuns:0, earnedRuns:0, battersFaced:0 }, data.pitching);
    }
  });
  const finalizeTree = (node) => { if (!node || !node.stats) return; if (node.stats.batting) node.stats.batting = finalizeBatting(node.stats.batting); if (node.stats.pitching) node.stats.pitching = finalizePitching(node.stats.pitching); if (node.by_location) Object.values(node.by_location).forEach(finalizeTree); };
  Object.values(macro.by_location).forEach(finalizeTree);
  Object.values(macro.vs_handedness).forEach(finalizeTree);
  Object.values(macro.vs_teams).forEach(finalizeTree);
  Object.values(macro.vs_pitchers).forEach(finalizeTree);
  return { splits: macro };
}

// ---------------- Routes ----------------
router.get('/macro/player/:team/:player/:season', async (req, res) => {
  try {
    const { team, player, season } = req.params; const { path } = req.query;
    const paths = req.query.paths ? String(req.query.paths).split(',').map(s=>s.trim()).filter(Boolean) : null;
    const compact = req.query.compact === '1' || req.query.compact === 'true'; const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth,10) : undefined;
    const key = makePlayerKey(team.toUpperCase(), player, season);
    let store = await readKey(key);
    if (!store) {
      console.warn('[macro] precomputed key miss', { key });
      store = await buildPlayerMacroOnTheFly(team.toUpperCase(), player, season);
      if (store) console.info('[macro] built on-the-fly', { key });
    }
    // Contract: if no data, return 200 with empty splits object (frontend expects graceful empty state)
    if (!store) {
      if (paths || path) return res.status(200).json({ key, splits: {}, results: [], path, data: null });
      return res.status(200).json({ key, splits: {} });
    }
    const base = store.splits || {};
    if (paths && paths.length) {
      const results = paths.map(p => ({ path: p, data: getByPath(base, p) }));
      return res.json({ key, results: compact ? results.map(r => ({ ...r, data: r.data && compactNode(r.data, { stripGames:true, maxDepth }) })) : results });
    }
    if (path) { const sub = getByPath(base, path); if (sub == null) return res.status(404).json({ error: 'Path not found', key, path }); return res.json({ key, path, data: compact ? compactNode(sub, { stripGames:true, maxDepth }) : sub }); }
    return res.json(compact ? { key, splits: compactNode(base, { stripGames:true, maxDepth }) } : { key, splits: base });
  } catch (e) { console.error('macro/player error', e); res.status(500).json({ error: 'Failed to fetch player macro splits' }); }
});

router.get('/macro/team/:team/:season', async (req, res) => {
  try {
    const { team, season } = req.params; const compact = req.query.compact === '1' || req.query.compact === 'true'; const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth,10) : undefined;
    const key = makeTeamKey(team.toUpperCase(), season); const store = await readKey(key); if (!store) return res.status(404).json({ error: 'Not found', key });
    return res.json(compact ? { key, splits: compactNode(store.splits || {}, { stripGames:true, maxDepth }) } : { key, ...(store) });
  } catch (e) { console.error('macro/team error', e); res.status(500).json({ error: 'Failed to fetch team macro splits' }); }
});

router.get('/players/available-players', async (req, res) => {
  try {
    const season = (req.query.season || '2025').toString(); const client = getRedisClient(); const pattern = `splits:player:*-${season}`;
    let cursor = '0'; const keys = [];
    do { // eslint-disable-next-line no-await-in-loop
      const out = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000); cursor = out[0]; keys.push(...(out[1]||[]));
    } while (cursor !== '0');
    if (!keys.length) return res.json({ players: [], count: 0 });
    const players = keys.map(k => { const base = k.split(':')[2] || ''; const parts = base.split('-'); const team = (parts[0]||'').toUpperCase(); const year = parts[parts.length-1] || season; const nameRaw = parts.slice(1,-1).join('-'); return { id: `${team}-${nameRaw}-${year}`, team, name: nameRaw.replace(/_/g,' '), season: year }; });
    res.json({ players, count: players.length });
  } catch (e) { console.error('available-players error', e); res.status(500).json({ error: 'Failed to list available players' }); }
});

router.get('/players/search', async (req, res) => {
  try {
    const season = (req.query.season || '2025').toString(); const q = (req.query.q || '').toString(); const team = (req.query.team || '').toString().toUpperCase(); const limit = Math.min(parseInt(req.query.limit || '20',10)||20,100);
    const pattern = team ? `splits:player:${team}-*-${season}` : `splits:player:*-${season}`; const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,''); const qNorm = norm(q);
    const client = getRedisClient(); let cursor = '0'; const players = [];
    do { // eslint-disable-next-line no-await-in-loop
      const out = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000); cursor = out[0];
      for (const key of (out[1]||[])) { const base = key.split(':')[2] || ''; const parts = base.split('-'); const t = (parts[0]||'').toUpperCase(); const year = parts[parts.length-1] || season; const nameRaw = parts.slice(1,-1).join('-'); const name = nameRaw.replace(/_/g,' '); if (qNorm) { const nameNorm = norm(name); if (!nameNorm.includes(qNorm)) continue; } players.push({ id: `${t}-${nameRaw}-${year}`, team: t, name, season: year }); if (players.length >= limit) break; }
      if (players.length >= limit) break; } while (cursor !== '0');
    res.json({ players, count: players.length, truncated: cursor !== '0' });
  } catch (e) { console.error('players/search error', e); res.status(500).json({ error: 'Failed to search players' }); }
});

module.exports = router;
