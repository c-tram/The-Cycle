import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
	Box,
	Card,
	CardContent,
	Typography,
	TextField,
	InputAdornment,
	IconButton,
	Tabs,
	Tab,
	Chip,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	TableContainer,
	Collapse,
	Avatar,
	Tooltip,
	CircularProgress,
	Divider,
	Button,
	Autocomplete,
	ListItem,
	ListItemAvatar,
	ListItemText,
		Paper,
		TableSortLabel
} from '@mui/material';
	import { Switch, FormControlLabel } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
	Search,
	Refresh,
	ExpandMore,
	ExpandLess,
	Analytics,
	SportsBaseball,
	PersonSearch,
	Troubleshoot,
	SportsMma,
	Numbers,
	Hub,
	Download
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { splitsApi, macroSplitsApi, statsApi } from '../services/apiService';
import { getTeamLogoUrl } from '../utils/teamLogos';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const formatRate = (val, digits = 3) => (val || val === 0) ? Number(val).toFixed(digits) : '—';
const pct = (v, d = 1) => (v || v === 0) ? (v * 100).toFixed(d) + '%' : '—';

// Merge stat objects (assumes leaf numeric) - shallow only for table rows
const mergeStats = (a = {}, b = {}) => {
	const out = { ...a };
	for (const k of Object.keys(b)) {
		const av = out[k];
		const bv = b[k];
		if (typeof bv === 'number' && typeof av === 'number') out[k] = av + bv; else if (av == null) out[k] = bv;
	}
	return out;
};

// Extract display core stats from a raw batting split node
const deriveBattingDisplay = (raw = {}) => {
	// Unwrap typical nesting variants
	const node = raw?.stats?.batting || raw?.batting || raw;
	const atBats = node.atBats || 0;
	const hits = node.hits || 0;
	const doubles = node.doubles || 0;
	const triples = node.triples || 0;
	const homeRuns = node.homeRuns || 0;
	// Walks naming variance
	const baseOnBalls = node.baseOnBalls ?? node.walks ?? 0;
	// Strikeouts naming variance
	const strikeOuts = node.strikeOuts ?? node.strikeouts ?? 0;
	const hitByPitch = node.hitByPitch || 0;
	const sacrificeFlies = node.sacrificeFlies || 0;
	const plateAppearances = node.plateAppearances;
	const singles = node.singles != null ? node.singles : (hits - doubles - triples - homeRuns);
	const totalBases = node.totalBases != null ? node.totalBases : (singles + 2 * doubles + 3 * triples + 4 * homeRuns);
	const pa = plateAppearances || (atBats + baseOnBalls + hitByPitch + sacrificeFlies);
	// Prefer backend precalculated if present
	const avg = node.avg != null ? node.avg : (atBats > 0 ? hits / atBats : 0);
	const obp = node.obp != null ? node.obp : (pa > 0 ? (hits + baseOnBalls + hitByPitch) / pa : 0);
	const slg = node.slg != null ? node.slg : (atBats > 0 ? totalBases / atBats : 0);
	const ops = node.ops != null ? node.ops : (obp + slg);
	const kRate = pa > 0 ? strikeOuts / pa : 0;
	const bbRate = pa > 0 ? baseOnBalls / pa : 0;
	return { pa, atBats, hits, doubles, triples, homeRuns, baseOnBalls, strikeOuts, avg, obp, slg, ops, kRate, bbRate };
};

// Pitching stat extraction (hoisted normal function so row builders can use before later hooks)
function derivePitchingDisplay(raw = {}) {
	const node = raw?.stats?.pitching || raw?.pitching || raw;
	if (!node || typeof node !== 'object') return {};
	const ip = node.inningsPitched || 0;
	const innings = typeof ip === 'string' ? parseFloat(ip) || 0 : ip;
	const era = node.era != null ? Number(node.era) : 0;
	const whip = node.whip != null ? Number(node.whip) : 0;
	const fip = node.fip != null ? Number(node.fip) : (node.FIP || 0);
	const strikeOuts = node.strikeOuts ?? node.strikeouts ?? 0;
	const baseOnBalls = node.baseOnBalls ?? node.walks ?? 0;
	const hits = node.hits || 0;
	const homeRuns = node.homeRuns || 0;
	const battersFaced = node.battersFaced || 0;
	const k9 = innings > 0 ? (strikeOuts * 9) / innings : 0;
	const bb9 = innings > 0 ? (baseOnBalls * 9) / innings : 0;
	const kRate = battersFaced > 0 ? strikeOuts / battersFaced : 0;
	const bbRate = battersFaced > 0 ? baseOnBalls / battersFaced : 0;
	return { innings, era, whip, fip, k9, bb9, strikeOuts, baseOnBalls, hits, homeRuns, kRate, bbRate, battersFaced };
}

// Aggregate home/away (and potential future neutral) location objects into a single batting stats object
const aggregateLocations = (locContainer = {}) => {
	const fields = ['plateAppearances','atBats','hits','runs','rbi','homeRuns','doubles','triples','singles','walks','baseOnBalls','strikeouts','strikeOuts','hitByPitch','sacrificeFlies','sacrificeHits','stolenBases','groundedIntoDoublePlay','totalBases'];
	const sum = {};
	for (const loc of Object.keys(locContainer)) {
		const n = locContainer[loc]?.stats?.batting || locContainer[loc]?.batting || locContainer[loc];
		if (!n) continue;
		for (const f of fields) {
			if (n[f] != null && typeof n[f] === 'number') sum[f] = (sum[f] || 0) + n[f];
		}
	}
	// Normalize naming to what deriveBattingDisplay expects
	if (sum.walks != null && sum.baseOnBalls == null) sum.baseOnBalls = sum.walks;
	if (sum.strikeouts != null && sum.strikeOuts == null) sum.strikeOuts = sum.strikeouts;
	// Recompute singles if missing
	if (sum.hits != null && sum.singles == null) {
		sum.singles = sum.hits - (sum.doubles || 0) - (sum.triples || 0) - (sum.homeRuns || 0);
	}
	return sum;
};

// Table column definitions (batting focus for now)
const BATTING_COLUMNS = [
	{ key: 'pa', label: 'PA', format: v => v || 0 },
	{ key: 'atBats', label: 'AB', format: v => v || 0 },
	{ key: 'hits', label: 'H', format: v => v || 0 },
	{ key: 'homeRuns', label: 'HR', format: v => v || 0 },
	{ key: 'avg', label: 'AVG', format: v => formatRate(v, 3) },
	{ key: 'obp', label: 'OBP', format: v => formatRate(v, 3) },
	{ key: 'slg', label: 'SLG', format: v => formatRate(v, 3) },
	{ key: 'ops', label: 'OPS', format: v => formatRate(v, 3) },
	{ key: 'kRate', label: 'K%', format: v => pct(v) },
	{ key: 'bbRate', label: 'BB%', format: v => pct(v) }
];

// ---------------------------------------------------------------------------
// Color Classification (All Stats)
// ---------------------------------------------------------------------------
// Tier colors reused everywhere
const STAT_COLORS = [
	'rgba(211,47,47,0.85)',   // Poor
	'rgba(239,108,0,0.85)',   // Below Avg
	'rgba(255,179,0,0.90)',   // Avg
	'rgba(102,187,106,0.90)', // Above Avg
	'rgba(46,125,50,0.95)'    // Elite
];

// Which stats are "lower is better"
const LOWER_BETTER = new Set(['era','whip','fip','kRatePitch','bb9','hitsPer9','runsPer9']);
// Which batting stats are inverted (lower is better) - only K% for now
const BATTING_LOWER_BETTER = new Set(['kRate']);

// Metrics we compare to league baseline directly if available (batting)
const BASELINE_RATES = new Set(['avg','obp','slg','ops','kRate','bbRate']);

// Compute percentile-based tier (fallback) among a list of numeric values
function percentileTier(value, values) {
	if (value == null || isNaN(value)) return 2; // neutral
	const sorted = values.filter(v => v != null && !isNaN(v)).sort((a,b)=>a-b);
	if (!sorted.length) return 2;
	const idx = sorted.findIndex(v => v >= value);
	const rank = idx === -1 ? sorted.length - 1 : idx;
	const pct = rank / (sorted.length - 1 || 1); // 0..1
	if (pct >= 0.90) return 4;
	if (pct >= 0.65) return 3;
	if (pct >= 0.35) return 2;
	if (pct >= 0.10) return 1;
	return 0;
}

// Given metric & value produce tier (0..4)
function classifyStatMetric({ statKey, value, baselineBatting, baselinePitching, sampleValues, context }) {
	if (value == null || isNaN(value)) return 2;
	// Normalize naming for pitching context
	const directionLower = context === 'pitching' ? (statKey === 'era' || statKey === 'whip' || statKey === 'fip') : BATTING_LOWER_BETTER.has(statKey);
	// Baseline comparison for specified rate stats (batting)
	if (context === 'batting' && BASELINE_RATES.has(statKey) && baselineBatting && baselineBatting[statKey] != null) {
		const base = baselineBatting[statKey];
		if (base && base > 0) {
			const pctDiff = directionLower ? (base - value) / base : (value - base) / base; // positive good
			if (pctDiff > 0.10) return 4;
			if (pctDiff > 0.03) return 3;
			if (pctDiff > -0.03) return 2;
			if (pctDiff > -0.10) return 1;
			return 0;
		}
	}
	// For pitching we have baseline ERA (already used elsewhere) -> treat same pattern for era/whip/fip if available
	if (context === 'pitching' && baselinePitching && ['era','whip','fip'].includes(statKey) && baselinePitching[statKey] != null) {
		const base = baselinePitching[statKey];
		if (base && base > 0) {
			const pctDiff = (base - value) / base; // lower better
			if (pctDiff > 0.10) return 4;
			if (pctDiff > 0.03) return 3;
			if (pctDiff > -0.03) return 2;
			if (pctDiff > -0.10) return 1;
			return 0;
		}
	}
	// Percentile fallback
	const tier = percentileTier(value, sampleValues);
	// Invert tiers if lower is better (so low value yields high tier)
	if (directionLower) return 4 - tier;
	return tier;
}

function colorForStat(params) {
	const tier = classifyStatMetric(params);
	return STAT_COLORS[tier];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const SplitsExplorer = () => {
	const theme = useTheme();
	const searchRef = useRef(null);

	// Global state
	const [season, setSeason] = useState('2025');
	const [team, setTeam] = useState('HOU'); // default fallback team
	const [playerQuery, setPlayerQuery] = useState('');
		const [playerResults, setPlayerResults] = useState([]);
		const [recentPlayers, setRecentPlayers] = useState(() => []);
		const [openSearch, setOpenSearch] = useState(false);
	const [selectedPlayer, setSelectedPlayer] = useState(null); // { team, name }
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [macroLoading, setMacroLoading] = useState(false);
	const [macroError, setMacroError] = useState(null);
	const [macroData, setMacroData] = useState(null); // full macro object
	const [leagueBaselines, setLeagueBaselines] = useState(null); // dynamic league averages
	const [showBaselines, setShowBaselines] = useState(false); // toggle to reveal baseline numbers
	const [activeTab, setActiveTab] = useState('overview');
		const [sortKey, setSortKey] = useState('pa');
		const [sortDir, setSortDir] = useState('desc');
			const [splitMode, setSplitMode] = useState('batting'); // 'batting' | 'pitching'

	// Drill-down state (e.g., vs pitchers accordion)
	const [expanded, setExpanded] = useState({});

	// Debounced search effect
	useEffect(() => {
		if (!playerQuery || playerQuery.length < 2) { setPlayerResults([]); setOpenSearch(false); return; }
			const handle = setTimeout(async () => {
			try {
				setLoadingSearch(true);
				const res = await splitsApi.searchPlayerSplits(playerQuery, { season, limit: 15 });
					const rawPlayers = res.players || [];
					// Deduplicate by (playerId) or (team+name) signature
					const seen = new Set();
					const players = [];
					for (const p of rawPlayers) {
						const baseId = p.playerId || `${p.team}-${p.name}`;
							if (!seen.has(baseId)) {
								seen.add(baseId);
								players.push({ ...p, _key: baseId });
							}
					}
					setPlayerResults(players);
					setOpenSearch(players.length > 0);
			} catch (e) {
				console.error('Player search failed', e);
			} finally { setLoadingSearch(false); }
		}, 300);
		return () => clearTimeout(handle);
	}, [playerQuery, season]);

	const loadMacro = useCallback(async (p) => {
		if (!p) return;
		try {
			setMacroLoading(true); setMacroError(null); setMacroData(null);
			// Pass raw name; service will normalize
			const data = await macroSplitsApi.getPlayerMacro(p.team, p.name, season);
			const payload = data?.splits || data;
			if (!payload || Object.keys(payload).length === 0) {
				console.warn('[SplitsExplorer] Empty macro splits payload', { team: p.team, player: p.name, season });
			}
			setMacroData(payload);
		} catch (e) {
			console.error('Macro load error', e);
			setMacroError(e.message || 'Failed loading macro splits');
		} finally { setMacroLoading(false); }
	}, [season]);

	// Auto-load macro when player selected
	useEffect(() => { if (selectedPlayer) loadMacro(selectedPlayer); }, [selectedPlayer, loadMacro]);

	// Auto-detect pitcher once macroData loaded
	useEffect(() => {
		if (!macroData) return;
		// Criteria: has any pitching innings AND very few plate appearances OR pitching stats exist without batting improvement
		const loc = macroData.by_location;
		if (!loc) return;
		let totalIPOuts = 0; let totalPA = 0; let hasPitching = false;
		for (const k of Object.keys(loc)) {
			const p = loc[k]?.stats?.pitching || loc[k]?.pitching;
			if (p?.inningsPitched) {
				hasPitching = true;
				const parts = String(p.inningsPitched).split('.');
				const outs = (parseInt(parts[0]||'0',10)*3)+parseInt(parts[1]||'0',10);
				totalIPOuts += outs;
			}
			const b = loc[k]?.stats?.batting || loc[k]?.batting;
			if (b?.plateAppearances) totalPA += b.plateAppearances;
		}
		const innings = totalIPOuts/3;
		if (hasPitching && innings >= 5 && totalPA <= 15 && splitMode !== 'pitching') {
			setSplitMode('pitching');
		}
	}, [macroData, splitMode]);

	// Load league baselines once per season change
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const data = await statsApi.getBaselines(season);
				if (mounted) setLeagueBaselines(data);
			} catch (e) {
				console.warn('Baseline fetch failed, using static tiers fallback', e.message);
				if (mounted) setLeagueBaselines(null);
			}
		})();
		return () => { mounted = false; };
	}, [season]);

	// Normalized views per tab
			const homeAwayRows = useMemo(() => {
					if (!macroData?.by_location) return [];
					return Object.entries(macroData.by_location).map(([loc, node]) => {
						const batting = deriveBattingDisplay(node);
						const pitching = derivePitchingDisplay(node);
						return { key: loc, label: loc.toUpperCase(), batting, pitching, stats: batting };
					});
			}, [macroData]);

		const aggregatePitchingLocations = useCallback((locContainer = {}) => {
			// Aggregate core counting stats to recompute rates
			const sum = { outs: 0, strikeOuts: 0, baseOnBalls: 0, hits: 0, homeRuns: 0, earnedRuns: 0, battersFaced: 0 };
			for (const loc of Object.keys(locContainer)) {
				const n = locContainer[loc]?.stats?.pitching || locContainer[loc]?.pitching || locContainer[loc];
				if (!n) continue;
				const ip = n.inningsPitched || '0.0';
				const [ipInnings, ipRemainder] = String(ip).split('.');
				const outs = (parseInt(ipInnings || '0', 10) * 3) + parseInt(ipRemainder || '0', 10);
				sum.outs += outs;
				sum.strikeOuts += (n.strikeOuts ?? n.strikeouts ?? 0);
				sum.baseOnBalls += (n.baseOnBalls ?? n.walks ?? 0);
				sum.hits += (n.hits || 0);
				sum.homeRuns += (n.homeRuns || 0);
				sum.earnedRuns += (n.earnedRuns || 0);
				sum.battersFaced += (n.battersFaced || 0);
			}
			// Rebuild pseudo pitching node for derivePitchingDisplay
			const inningsWhole = Math.floor(sum.outs / 3);
			const remainder = sum.outs % 3;
			const aggregated = {
				inningsPitched: `${inningsWhole}.${remainder}`,
				strikeOuts: sum.strikeOuts,
				baseOnBalls: sum.baseOnBalls,
				hits: sum.hits,
				homeRuns: sum.homeRuns,
				earnedRuns: sum.earnedRuns,
				battersFaced: sum.battersFaced,
				// era & whip will be recomputed in derivePitchingDisplay fallback path (if present) else computed below
			};
			return { stats: { pitching: aggregated } };
		}, []);

			const vsHandednessRows = useMemo(() => {
					if (!macroData?.vs_handedness) return [];
					return Object.entries(macroData.vs_handedness).map(([hand, locObj]) => {
						const batting = deriveBattingDisplay(aggregateLocations(locObj));
						const pitching = derivePitchingDisplay(aggregatePitchingLocations(locObj));
						return { key: hand, label: hand, batting, pitching, stats: batting };
					});
			}, [macroData, aggregatePitchingLocations]);

			const countRows = useMemo(() => {
					const source = macroData?.by_count || macroData?.counts || macroData?.byCount;
					if (!source) return [];
					return Object.entries(source).map(([count, node]) => {
						const batting = deriveBattingDisplay(node);
						const pitching = derivePitchingDisplay(node);
						return { key: count, label: count, batting, pitching, stats: batting };
					});
			}, [macroData]);

			const vsTeamsRows = useMemo(() => {
					if (!macroData?.vs_teams) return [];
					return Object.entries(macroData.vs_teams).map(([opp, locObj]) => {
						const batting = deriveBattingDisplay(aggregateLocations(locObj));
						const pitching = derivePitchingDisplay(aggregatePitchingLocations(locObj));
						return { key: opp, label: opp, batting, pitching, stats: batting };
					});
			}, [macroData, aggregatePitchingLocations]);

			const vsPitchersRows = useMemo(() => {
					if (!macroData?.vs_pitchers) return [];
					return Object.entries(macroData.vs_pitchers).map(([compoundKey, locObj]) => {
						const batting = deriveBattingDisplay(aggregateLocations(locObj));
						const pitching = derivePitchingDisplay(aggregatePitchingLocations(locObj));
						return { key: compoundKey, label: compoundKey.replace('-', ' '), batting, pitching, stats: batting };
					});
			}, [macroData, aggregatePitchingLocations]);

			// Determine if pitching data exists (for toggle)
			const hasPitchingSplits = useMemo(() => {
				const loc = macroData?.by_location;
				if (!loc) return false;
				return Object.values(loc).some(v => v?.stats?.pitching);
			}, [macroData]);

			// Pitching derivation helpers ---------------------------------------------------------
			const pitchingHomeAway = useMemo(() => {
				if (!macroData?.by_location) return {};
				const out = {};
				for (const [loc, node] of Object.entries(macroData.by_location)) out[loc] = derivePitchingDisplay(node);
				return out;
			}, [macroData]);

			const pitchingVsHandedness = useMemo(() => {
				if (!macroData?.vs_handedness) return {};
				const out = {};
				for (const [hand, locObj] of Object.entries(macroData.vs_handedness)) out[hand] = derivePitchingDisplay(aggregateLocations(locObj));
				return out;
			}, [macroData]);

	// Compound analytics (after venue removal only keep count_vs_team, count_vs_handedness, handedness_vs_team)
	const compoundGroups = useMemo(() => {
		const compound = macroData?.compound || {};
		const out = [];
			if (compound.count_vs_team) {
				const groupRows = [];
				for (const [countKey, teams] of Object.entries(compound.count_vs_team)) {
					for (const [opp, locObj] of Object.entries(teams)) {
						groupRows.push({ key: `${countKey}-${opp}`, label: `${countKey} vs ${opp}`, stats: deriveBattingDisplay(aggregateLocations(locObj)) });
					}
				}
				out.push({ key: 'count_vs_team', label: 'Count vs Team', rows: groupRows });
			}
			if (compound.count_vs_handedness) {
				const groupRows = [];
				for (const [countKey, hands] of Object.entries(compound.count_vs_handedness)) {
					for (const [hand, locObj] of Object.entries(hands)) {
						groupRows.push({ key: `${countKey}-${hand}`, label: `${countKey} vs ${hand}`, stats: deriveBattingDisplay(aggregateLocations(locObj)) });
					}
				}
				out.push({ key: 'count_vs_handedness', label: 'Count vs Handedness', rows: groupRows });
			}
			if (compound.handedness_vs_team) {
				const groupRows = [];
				for (const [hand, teams] of Object.entries(compound.handedness_vs_team)) {
					for (const [opp, locObj] of Object.entries(teams)) {
						groupRows.push({ key: `${hand}-${opp}`, label: `${hand} vs ${opp}`, stats: deriveBattingDisplay(aggregateLocations(locObj)) });
					}
				}
				out.push({ key: 'handedness_vs_team', label: 'Handedness vs Team', rows: groupRows });
			}
		return out;
	}, [macroData]);

	// Active tab dataset selection
	const currentRows = useMemo(() => {
		switch (activeTab) {
			case 'overview': return homeAwayRows;
			case 'teams': return vsTeamsRows;
			case 'pitchers': return vsPitchersRows;
			case 'counts': return countRows;
			case 'compound': return []; // handled separately
			default: return [];
		}
	}, [activeTab, homeAwayRows, vsTeamsRows, vsPitchersRows, countRows]);

		// Sorting logic for non-compound tables
	const sortedRows = useMemo(() => {
		const rows = [...currentRows];
		if (!sortKey) return rows;
		rows.sort((a, b) => {
			const aStats = splitMode === 'pitching' ? a.pitching : a.batting;
			const bStats = splitMode === 'pitching' ? b.pitching : b.batting;
			const av = aStats?.[sortKey];
			const bv = bStats?.[sortKey];
			if (av == null && bv == null) return 0;
			if (av == null) return 1;
			if (bv == null) return -1;
			if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
			const as = String(av).toLowerCase();
			const bs = String(bv).toLowerCase();
			return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
		});
		return rows;
	}, [currentRows, sortKey, sortDir, splitMode]);

		// For compound groups apply same sorting inside each group
		const sortedCompoundGroups = useMemo(() => {
			if (activeTab !== 'compound') return compoundGroups;
			return compoundGroups.map(g => {
				const rows = [...g.rows];
				rows.sort((a, b) => {
					const av = a.stats[sortKey];
					const bv = b.stats[sortKey];
					if (av == null && bv == null) return 0;
					if (av == null) return 1;
					if (bv == null) return -1;
					if (typeof av === 'number' && typeof bv === 'number') {
						return sortDir === 'desc' ? bv - av : av - bv;
					}
					const as = String(av).toLowerCase();
					const bs = String(bv).toLowerCase();
					return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
				});
				return { ...g, rows };
			});
		}, [compoundGroups, activeTab, sortKey, sortDir]);

		// CSV Export --------------------------------------------------------------
		const buildCsv = useCallback(() => {
			// Support pitching mode export
			const PITCHING_COLUMNS = [
				{ key: 'era', label: 'ERA', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'whip', label: 'WHIP', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'fip', label: 'FIP', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'innings', label: 'IP', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'k9', label: 'K/9', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'bb9', label: 'BB/9', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'strikeOuts', label: 'K', format: v => v || 0 },
				{ key: 'baseOnBalls', label: 'BB', format: v => v || 0 },
				{ key: 'hits', label: 'H', format: v => v || 0 },
				{ key: 'homeRuns', label: 'HR', format: v => v || 0 }
			];
			const activeCols = splitMode === 'pitching' ? PITCHING_COLUMNS : BATTING_COLUMNS;
			const cols = ['Split', ...activeCols.map(c => c.label)];
			const lines = [cols.join(',')];
			const escape = (v) => {
				if (v == null) return '';
				const s = String(v);
				return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
			};
			const addRow = (label, stats) => {
				const row = [label, ...activeCols.map(c => stats?.[c.key] != null ? stats[c.key] : '')];
				lines.push(row.map(escape).join(','));
			};
			if (activeTab === 'compound') {
				sortedCompoundGroups.forEach(group => {
					lines.push(`# ${group.label}`);
					group.rows.forEach(r => addRow(r.label, r.stats));
					lines.push('');
				});
			} else {
				sortedRows.forEach(r => {
					const block = splitMode === 'pitching' ? r.pitching : r.batting; // choose correct stat block
					addRow(r.label, block);
				});
			}
			return lines.join('\n');
		}, [activeTab, sortedRows, sortedCompoundGroups, splitMode]);

		const handleExport = useCallback(() => {
			const csv = buildCsv();
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const safeName = (selectedPlayer?.name || 'player').replace(/[^a-z0-9_\-]+/gi, '_');
			const fileName = `splits_${safeName}_${activeTab}_${Date.now()}.csv`;
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.setAttribute('download', fileName);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}, [buildCsv, selectedPlayer, activeTab]);

		const handleSort = (key) => {
			if (sortKey === key) {
				setSortDir(d => d === 'desc' ? 'asc' : 'desc');
			} else {
				setSortKey(key);
				setSortDir('desc');
			}
		};

	// -----------------------------------------------------------------------
	// Rendering helpers
	// -----------------------------------------------------------------------
		const renderStatsTable = (rows) => {
			const showingPitching = splitMode === 'pitching';
			const PITCHING_COLUMNS = [
				{ key: 'era', label: 'ERA', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'whip', label: 'WHIP', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'fip', label: 'FIP', format: v => v==null? '—' : Number(v).toFixed(2) },
				{ key: 'innings', label: 'IP', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'k9', label: 'K/9', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'bb9', label: 'BB/9', format: v => v==null? 0 : Number(v).toFixed(1) },
				{ key: 'strikeOuts', label: 'K', format: v => v || 0 },
				{ key: 'baseOnBalls', label: 'BB', format: v => v || 0 },
				{ key: 'hits', label: 'H', format: v => v || 0 },
				{ key: 'homeRuns', label: 'HR', format: v => v || 0 }
			];
			const columns = showingPitching ? PITCHING_COLUMNS : BATTING_COLUMNS;
			// Build sample maps for percentile fallback per context (use correct stat block)
			const sampleMap = {};
			columns.forEach(c => { sampleMap[c.key] = []; });
			rows.forEach(r => {
				const block = showingPitching ? r.pitching : r.batting;
				columns.forEach(c => { const val = block?.[c.key]; if (typeof val === 'number' && !isNaN(val)) sampleMap[c.key].push(val); });
			});
			const baselineBatting = leagueBaselines?.batting;
			const baselinePitching = leagueBaselines?.pitching;
			return (
				<TableContainer sx={{ maxHeight: 520 }}>
					<Table stickyHeader size="small">
						<TableHead>
							<TableRow>
								<TableCell sx={{ position: 'sticky', left: 0, background: theme.palette.background.paper, zIndex: 10 }}>
									<TableSortLabel active={sortKey === 'label'} direction={sortKey === 'label' ? sortDir : 'asc'} onClick={() => handleSort('label')}>
										Split
									</TableSortLabel>
								</TableCell>
								{columns.map(c => {
									const active = sortKey === c.key;
									return (
										<TableCell key={c.key} align="center" sx={{ cursor: 'pointer' }} onClick={() => handleSort(c.key)}>
											<TableSortLabel active={active} direction={active ? sortDir : 'asc'}>{c.label}</TableSortLabel>
										</TableCell>
									);
								})}
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(r => {
								const statBlock = showingPitching ? r.pitching : r.batting;
								return (
									<TableRow key={r.key} hover>
										<TableCell sx={{ position: 'sticky', left: 0, background: theme.palette.background.paper }}>{r.label}</TableCell>
										{columns.map(c => {
											const val = statBlock?.[c.key];
											const bg = colorForStat({ statKey: c.key, value: val, baselineBatting, baselinePitching, sampleValues: sampleMap[c.key], context: showingPitching ? 'pitching' : 'batting' });
											return (
												<TableCell key={c.key} align="center" sx={{ backgroundColor: bg, color: '#fff', transition: 'background-color .3s' }}>
													{c.format ? c.format(val) : val ?? '—'}
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
							{rows.length === 0 && (
								<TableRow>
									<TableCell colSpan={1 + columns.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
										No data
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			);
		};

		// Reusable card grid for other tabs -------------------------------------------------
		const [filterText, setFilterText] = useState('');
	const filteredRows = useMemo(() => {
		if (!filterText) return sortedRows;
		const ft = filterText.toLowerCase();
		return sortedRows.filter(r => r.label.toLowerCase().includes(ft));
	}, [filterText, sortedRows]);

		const classifyColor = (v, isPitchingLocal) => {
			const OPS_TIERS = [0.0, 0.600, 0.700, 0.760, 0.850];
			const ERA_TIERS = [Infinity, 5.00, 4.25, 3.60, 3.10];
			const COLORS = [
				'rgba(211,47,47,0.85)',
				'rgba(239,108,0,0.85)',
				'rgba(255,179,0,0.90)',
				'rgba(102,187,106,0.90)',
				'rgba(46,125,50,0.95)'
			];
			if (v == null || isNaN(v)) return COLORS[2];
			if (!isPitchingLocal) {
				if (v >= OPS_TIERS[4]) return COLORS[4];
				if (v >= OPS_TIERS[3]) return COLORS[3];
				if (v >= OPS_TIERS[2]) return COLORS[2];
				if (v >= OPS_TIERS[1]) return COLORS[1];
				return COLORS[0];
			}
			// pitching
			if (v < ERA_TIERS[4]) return COLORS[4];
			if (v < ERA_TIERS[3]) return COLORS[3];
			if (v < ERA_TIERS[2]) return COLORS[2];
			if (v < ERA_TIERS[1]) return COLORS[1];
			return COLORS[0];
		};

		const renderRowCard = (row, isPitchingLocal) => {
			const statBlock = isPitchingLocal ? row.pitching : row.batting;
			const headlineValue = isPitchingLocal ? (statBlock?.era != null ? statBlock.era.toFixed(2)+' ERA' : '—') : (statBlock?.ops != null ? formatRate(statBlock.ops,3)+' OPS' : '—');
			const baselineBatting = leagueBaselines?.batting;
			const baselinePitching = leagueBaselines?.pitching;
			return (
				<Card key={row.key} variant="outlined" sx={{ flex: '1 1 240px', minWidth: 240 }}>
					<CardContent sx={{ p: 1.5 }}>
						<Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 0.5 }}>
							<Typography variant="caption" fontWeight={600}>{row.label}</Typography>
							{activeTab === 'teams' && <Avatar src={getTeamLogoUrl(row.label)} alt={row.label} sx={{ width: 24, height: 24 }} />}
						</Box>
						<Typography variant="subtitle1" fontWeight={700} sx={{ backgroundColor: classifyColor(isPitchingLocal ? statBlock?.era : statBlock?.ops, isPitchingLocal), color:'#fff', display:'inline-block', px: 0.75, borderRadius: 1 }}>{headlineValue}</Typography>
							<Table size="small" sx={{ mt: 0.5 }}>
								<TableBody>
									{BATTING_COLUMNS.slice(0,8).map(c => {
										const val = statBlock?.[c.key];
										const baselineVal = !isPitchingLocal ? (leagueBaselines?.batting?.[c.key] ?? null) : (leagueBaselines?.pitching?.[c.key] ?? null);
										const bg = colorForStat({ statKey: c.key, value: val, baselineBatting, baselinePitching, sampleValues: [val], context: isPitchingLocal ? 'pitching' : 'batting' });
										const diffPct = baselineVal != null && val != null && baselineVal !== 0 ? (((val - baselineVal) / baselineVal) * 100) : null;
										return (
											<TableRow key={c.key}>
												<TableCell sx={{ py:0.25, borderBottom:'none' }}><Typography variant="caption" color="text.secondary">{c.label}</Typography></TableCell>
												<TableCell sx={{ py:0.25, borderBottom:'none', backgroundColor: bg, color:'#fff', borderRadius: 1 }} align="right">
													<Tooltip title={baselineVal != null ? `League ${c.label}: ${c.format(baselineVal)}${diffPct!=null?` | Diff: ${diffPct>0?'+':''}${diffPct.toFixed(1)}%`:''}` : ''} placement="top" arrow>
														<Box component="span">
															<Typography variant="caption" fontWeight={600} component="span">{c.format(val)}</Typography>
															{showBaselines && baselineVal != null && (
																<Typography variant="caption" component="span" sx={{ ml: .5, opacity: 0.85 }}>({c.format(baselineVal)})</Typography>
															)}
														</Box>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
					</CardContent>
				</Card>
			);
		};

		const renderCompoundCards = () => (
			<Box>
				{sortedCompoundGroups.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p:2 }}>No compound analytics (after pruning)</Typography>}
				{sortedCompoundGroups.map(group => (
					<Box key={group.key} sx={{ mb: 3 }}>
						<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{group.label}</Typography>
						<Box sx={{ display:'flex', flexWrap:'wrap', gap: 1.5 }}>
							{group.rows.filter(r => !filterText || r.label.toLowerCase().includes(filterText.toLowerCase())).map(r => renderRowCard(r, splitMode==='pitching'))}
						</Box>
					</Box>
				))}
			</Box>
		);

		const renderFilteredCards = () => (
			<Box>
				<Box sx={{ mb: 1.5 }}>
					<TextField value={filterText} onChange={e=>setFilterText(e.target.value)} size="small" placeholder={`Filter ${activeTab==='teams'?'teams':activeTab==='pitchers'?'pitchers':activeTab==='counts'?'counts':'rows'}`} fullWidth />
				</Box>
				<Box sx={{ display:'flex', flexWrap:'wrap', gap: 1.5 }}>
					{filteredRows.map(r => renderRowCard(r, splitMode==='pitching'))}
					{filteredRows.length===0 && <Typography variant="body2" color="text.secondary" sx={{ p:2 }}>No matches</Typography>}
				</Box>
			</Box>
		);

		const renderCompound = () => renderCompoundCards();

			// Home/Away card layout with additional L/R splits ---------------------------------
			const HOME_AWAY_METRICS = [
				{ key: 'pa', label: 'PA' },
				{ key: 'atBats', label: 'AB' },
				{ key: 'hits', label: 'H' },
				{ key: 'homeRuns', label: 'HR' },
				{ key: 'avg', label: 'AVG', fmt: v => formatRate(v) },
				{ key: 'obp', label: 'OBP', fmt: v => formatRate(v) },
				{ key: 'slg', label: 'SLG', fmt: v => formatRate(v) },
				{ key: 'ops', label: 'OPS', fmt: v => formatRate(v) },
				{ key: 'kRate', label: 'K%', fmt: v => pct(v) },
				{ key: 'bbRate', label: 'BB%', fmt: v => pct(v) }
			];

			const renderStatChipRow = (stats) => (
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
					{HOME_AWAY_METRICS.map(m => (
						<Chip
							key={m.key}
								label={`${m.label}: ${(m.fmt ? m.fmt(stats[m.key]) : stats[m.key] ?? 0)}`}
							size="small"
							sx={{ fontWeight: 500 }}
						/>
					))}
				</Box>
			);

			const renderHomeAwayCards = () => {
					// Select mode-specific data
					const battingHome = homeAwayRows.find(r => r.key === 'home')?.batting;
					const battingAway = homeAwayRows.find(r => r.key === 'away')?.batting;
					const battingVsLeft = vsHandednessRows.find(r => r.key.toLowerCase().startsWith('l'))?.batting;
					const battingVsRight = vsHandednessRows.find(r => r.key.toLowerCase().startsWith('r'))?.batting;

					const pitchingHome = pitchingHomeAway.home;
					const pitchingAway = pitchingHomeAway.away;
					const pitchingVsLeft = pitchingVsHandedness['L'] || pitchingVsHandedness['LHP'] || pitchingVsHandedness['L'];
					const pitchingVsRight = pitchingVsHandedness['R'] || pitchingVsHandedness['RHP'] || pitchingVsHandedness['R'];

					const isPitching = splitMode === 'pitching';

					// Build arrays for iteration
					const cards = isPitching ? [
						{ key: 'home', title: 'HOME', stats: pitchingHome },
						{ key: 'away', title: 'AWAY', stats: pitchingAway },
					] : [
						{ key: 'home', title: 'HOME', stats: battingHome },
						{ key: 'away', title: 'AWAY', stats: battingAway },
					];

					// Aggregate total
					const aggregate = () => {
						if (isPitching) {
							if (!pitchingHome && !pitchingAway) return null;
							const base = {};
							[pitchingHome, pitchingAway].filter(Boolean).forEach(s => {
								Object.keys(s).forEach(k => { if (typeof s[k] === 'number') base[k] = (base[k] || 0) + s[k]; });
							});
							// Recompute derived where needed (ERA weighted by innings)
							if (base.innings > 0) {
								const totalER = ( (pitchingHome?.era||0) * (pitchingHome?.innings||0) + (pitchingAway?.era||0) * (pitchingAway?.innings||0) ) / 9;
								base.era = base.innings > 0 ? (totalER * 9) / base.innings : 0;
								base.k9 = base.innings > 0 ? (base.strikeOuts * 9) / base.innings : 0;
								base.bb9 = base.innings > 0 ? (base.baseOnBalls * 9) / base.innings : 0;
								base.kRate = base.battersFaced > 0 ? base.strikeOuts / base.battersFaced : 0;
								base.bbRate = base.battersFaced > 0 ? base.baseOnBalls / base.battersFaced : 0;
							}
							return base;
						} else {
							if (!battingHome && !battingAway) return null;
							const agg = {};
							[battingHome, battingAway].filter(Boolean).forEach(s => {
								HOME_AWAY_METRICS.forEach(m => { const v = s[m.key]; if (typeof v === 'number') agg[m.key] = (agg[m.key] || 0) + v; });
							});
							if (agg.atBats > 0 && agg.hits != null) agg.avg = agg.hits / agg.atBats;
							if (agg.pa > 0) {
								const bb = (battingHome?.baseOnBalls || 0) + (battingAway?.baseOnBalls || 0);
								const hbp = (battingHome?.hitByPitch || 0) + (battingAway?.hitByPitch || 0);
								const hits = (battingHome?.hits || 0) + (battingAway?.hits || 0);
								agg.obp = (hits + bb + hbp) / agg.pa;
								const tb = (battingHome?.slg || 0) * (battingHome?.atBats || 0) + (battingAway?.slg || 0) * (battingAway?.atBats || 0);
								agg.slg = agg.atBats > 0 ? tb / agg.atBats : 0;
								agg.ops = (agg.obp || 0) + (agg.slg || 0);
								const k = (battingHome?.strikeOuts || 0) + (battingAway?.strikeOuts || 0);
								const bbTotal = bb;
								agg.kRate = k / agg.pa;
								agg.bbRate = bbTotal / agg.pa;
							}
							return agg;
						}
					};
					const total = aggregate();

					const lh = isPitching ? pitchingVsLeft : battingVsLeft;
					const rh = isPitching ? pitchingVsRight : battingVsRight;

					// Heat map scale values
							const valueAccessor = isPitching ? (s => s?.era) : (s => s?.ops);
							// Dynamic baseline logic: compute deviation from league average; fallback to fixed tiers if baseline absent
							const baselineBattingOPS = leagueBaselines?.batting?.ops || leagueBaselines?.batting?.ops || null;
							const baselinePitchingERA = leagueBaselines?.pitching?.era || null;
							const OPS_TIERS = [0.0, 0.600, 0.700, 0.760, 0.850]; // fallback boundaries
							const ERA_TIERS = [Infinity, 5.00, 4.25, 3.60, 3.10]; // fallback boundaries
							const COLORS = [
								'rgba(211,47,47,0.85)',   // Poor - Red
								'rgba(239,108,0,0.85)',   // Below Avg - Deep Orange
								'rgba(255,179,0,0.90)',   // Avg - Amber
								'rgba(102,187,106,0.90)', // Above Avg - Light Green
								'rgba(46,125,50,0.95)'    // Elite - Green
							];
							const classify = (v) => {
								if (v == null || isNaN(v)) return 2; // neutral/avg
								if (!isPitching) {
										if (baselineBattingOPS) {
											// Relative deviation buckets: <=-10%, -10% to -3%, -3% to +3%, +3% to +10%, > +10%
											const pctDiff = (v - baselineBattingOPS) / baselineBattingOPS;
											if (pctDiff > 0.10) return 4; // elite green
											if (pctDiff > 0.03) return 3; // above avg
											if (pctDiff > -0.03) return 2; // average band
											if (pctDiff > -0.10) return 1; // below avg
											return 0; // poor
										}
										// Fallback static tiers
										if (v >= OPS_TIERS[4]) return 4;
										if (v >= OPS_TIERS[3]) return 3;
										if (v >= OPS_TIERS[2]) return 2;
										if (v >= OPS_TIERS[1]) return 1;
									return 0;
								} else {
										// Pitching ERA baseline: inverse logic (lower better)
										if (baselinePitchingERA) {
											const pctDiff = (baselinePitchingERA - v) / baselinePitchingERA; // positive good
											if (pctDiff > 0.10) return 4; // elite
											if (pctDiff > 0.03) return 3; // above avg
											if (pctDiff > -0.03) return 2; // average
											if (pctDiff > -0.10) return 1; // below avg
											return 0; // poor
										}
										// Fallback static tiers (lower better)
										if (v < ERA_TIERS[4]) return 4; // Elite
										if (v < ERA_TIERS[3]) return 3; // Above Avg
									if (v < ERA_TIERS[2]) return 2; // Avg
									if (v < ERA_TIERS[1]) return 1; // Below Avg
									return 0; // Poor
								}
							};
							const heatColor = (v) => COLORS[classify(v)];

								const Legend = () => {
									const labels = ['Poor','Below Avg','Avg','Above Avg','Elite'];
									// Dynamic legend: if baselines exist show % deviation bands else static ranges
									const hasBaseline = isPitching ? !!baselinePitchingERA : !!baselineBattingOPS;
									const rangesBattingStatic = ['< .600','.600-.699','.700-.759','.760-.849','≥ .850'];
									const rangesPitchingStatic = ['> 5.00','4.25-5.00','3.60-4.24','3.10-3.59','< 3.10'];
									const rangesBattingDynamic = ['≤ -10%','-10% to -3%','±3%','+3% to +10%','> +10%'];
									const rangesPitchingDynamic = ['≥ +10% ERA','+3% to +10%','±3%','-10% to -3%','≤ -10% ERA'];
									const ranges = hasBaseline ? (isPitching ? rangesPitchingDynamic : rangesBattingDynamic) : (isPitching ? rangesPitchingStatic : rangesBattingStatic);
									return (
										<Box sx={{ mt: 1 }}>
											<Box sx={{ display:'flex', gap:1, flexWrap:'wrap', alignItems:'center' }}>
												{labels.map((lab,i) => (
													<Box key={lab} sx={{ display:'flex', flexDirection:'column', alignItems:'center', px:0.5 }}>
														<Box sx={{ width:44, height:16, borderRadius:1, bgcolor: COLORS[i], display:'flex', alignItems:'center', justifyContent:'center' }}>
															<Typography variant="caption" sx={{ color:'#fff', fontSize:10 }}>{lab.split(' ').map(w=>w[0]).join('')}</Typography>
														</Box>
														<Typography variant="caption" color="text.secondary" sx={{ fontSize:9 }}>{ranges[i]}</Typography>
													</Box>
												))}
												<Typography variant="caption" color="text.secondary" sx={{ ml:1 }}>{isPitching ? 'Lower ERA better' : 'Higher OPS better'}</Typography>
											</Box>
										</Box>
									);
								};


					const battingCols = [
						{ k: 'ops', l: 'OPS', fmt: v => formatRate(v) },
						{ k: 'avg', l: 'AVG', fmt: v => formatRate(v) },
						{ k: 'obp', l: 'OBP', fmt: v => formatRate(v) },
						{ k: 'slg', l: 'SLG', fmt: v => formatRate(v) },
						{ k: 'pa', l: 'PA' },
						{ k: 'atBats', l: 'AB' },
						{ k: 'hits', l: 'H' },
						{ k: 'homeRuns', l: 'HR' },
						{ k: 'kRate', l: 'K%', fmt: v => pct(v) },
						{ k: 'bbRate', l: 'BB%', fmt: v => pct(v) }
					];
					const pitchingCols = [
						{ k: 'era', l: 'ERA', fmt: v => v?.toFixed(2) },
						{ k: 'whip', l: 'WHIP', fmt: v => v?.toFixed(2) },
						{ k: 'fip', l: 'FIP', fmt: v => v?.toFixed(2) },
						{ k: 'innings', l: 'IP', fmt: v => v?.toFixed(1) },
						{ k: 'k9', l: 'K/9', fmt: v => v?.toFixed(1) },
						{ k: 'bb9', l: 'BB/9', fmt: v => v?.toFixed(1) },
						{ k: 'strikeOuts', l: 'K' },
						{ k: 'baseOnBalls', l: 'BB' },
						{ k: 'hits', l: 'H' },
						{ k: 'homeRuns', l: 'HR' }
					];

					const cols = isPitching ? pitchingCols : battingCols;

					// Delta calculations (home vs away)
					const delta = (a, b, key, invert=false) => {
						if (!a || !b) return null;
						const av = a[key]; const bv = b[key];
						if (av == null || bv == null) return null;
						const diff = av - bv; // positive means home better for batting metrics
						const sign = diff > 0 ? '+' : diff < 0 ? '' : '';
						const val = isNaN(diff) ? '' : (Math.abs(diff) < 0.001 ? diff.toFixed(4) : diff.toFixed(3));
						const isBetter = invert ? diff < 0 : diff > 0;
						return { text: `${key.toUpperCase()} ${sign}${val}`, color: isBetter ? 'success' : diff === 0 ? 'default' : 'error' };
					};
					const deltas = isPitching ? [
						delta(pitchingHome, pitchingAway, 'era', true),
						delta(pitchingHome, pitchingAway, 'whip', true),
						delta(pitchingHome, pitchingAway, 'k9'),
						delta(pitchingHome, pitchingAway, 'bb9', true)
					].filter(Boolean) : [
						delta(battingHome, battingAway, 'ops'),
						delta(battingHome, battingAway, 'avg'),
						delta(battingHome, battingAway, 'kRate', true),
						delta(battingHome, battingAway, 'bbRate')
					].filter(Boolean);

					return (
						<Box>
							{leagueBaselines && (
								<Box sx={{ display:'flex', justifyContent:'flex-end', mb: 1 }}>
									<FormControlLabel
										control={<Switch size="small" checked={showBaselines} onChange={e => setShowBaselines(e.target.checked)} />}
										label={<Typography variant="caption" fontWeight={600}>{showBaselines ? 'Hide League Values' : 'Show League Values'}</Typography>}
									/>
								</Box>
							)}
									<Legend />
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
								{cards.map(c => (
									<Card key={c.key} variant="outlined" sx={{ flex: '1 1 300px', minWidth: 280 }}>
										<CardContent>
											<Typography variant="subtitle2" color="text.secondary">{c.title}</Typography>
											<Typography variant="h5" fontWeight={700} sx={{ backgroundColor: heatColor(valueAccessor(c.stats)), display: 'inline-block', px: 1, borderRadius: 1, color: '#fff' }}>
												{c.stats ? (isPitching ? (c.stats.era?.toFixed(2) + ' ERA') : (formatRate(c.stats.ops,3) + ' OPS')) : '—'}
											</Typography>
											{c.stats ? (
												<Table size="small" sx={{ mt: 1 }}>
													<TableBody>
														{cols.map(col => {
															const val = c.stats[col.k];
															// Derive baseline for overview metrics
															let baselineVal = null;
															if (!isPitching) baselineVal = leagueBaselines?.batting?.[col.k] ?? null; else baselineVal = leagueBaselines?.pitching?.[col.k] ?? null;
															// For k9/bb9 compute from totals if baseline not directly present
															if (baselineVal == null && isPitching && ['k9','bb9'].includes(col.k)) {
																const p = leagueBaselines?.pitching;
																if (p?.totals?.inningsPitched && p?.totals?.inningsPitched !== '0.0') {
																	const parts = p.totals.inningsPitched.split('.');
																	const outs = (parseInt(parts[0]||'0',10)*3) + parseInt(parts[1]||'0',10);
																	const ip = outs/3;
																	if (ip > 0) {
																		if (col.k==='k9') baselineVal = (p.totals.strikeOuts*9)/ip; else if (col.k==='bb9') baselineVal = (p.totals.baseOnBalls*9)/ip;
																	}
																}
															}
															const bg = colorForStat({ statKey: col.k, value: val, baselineBatting: leagueBaselines?.batting, baselinePitching: leagueBaselines?.pitching, sampleValues: [val], context: isPitching ? 'pitching' : 'batting' });
															const diffPct = baselineVal != null && val != null && baselineVal !== 0 ? (((val - baselineVal) / baselineVal) * 100) : null;
															return (
																<TableRow key={col.k}>
																	<TableCell sx={{ py: 0.5, borderBottom: 'none' }}><Typography variant="caption" color="text.secondary">{col.l}</Typography></TableCell>
																	<TableCell sx={{ py: 0.5, borderBottom: 'none', backgroundColor: bg, color:'#fff', borderRadius:1 }} align="right">
																		<Tooltip title={baselineVal != null ? `League ${col.l}: ${col.fmt?col.fmt(baselineVal):baselineVal}${diffPct!=null?` | Diff: ${diffPct>0?'+':''}${diffPct.toFixed(1)}%`:''}` : ''} arrow>
																			<Box component="span">
																				<Typography variant="caption" fontWeight={600} component="span">{col.fmt ? col.fmt(val) : (val ?? 0)}</Typography>
																				{showBaselines && baselineVal != null && (
																					<Typography variant="caption" component="span" sx={{ ml:.5, opacity:.85 }}>({col.fmt ? col.fmt(baselineVal) : baselineVal})</Typography>
																				)}
																			</Box>
																		</Tooltip>
																	</TableCell>
																</TableRow>
															);
														})}
													</TableBody>
												</Table>
											) : (
												<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No data</Typography>
											)}
											{/* Mini bars removed as requested */}
										</CardContent>
									</Card>
								))}
								<Card variant="outlined" sx={{ flex: '1 1 300px', minWidth: 280, bgcolor: theme => alpha(theme.palette.primary.main, 0.04) }}>
									<CardContent>
										<Typography variant="subtitle2" color="text.secondary">TOTAL</Typography>
										  <Typography variant="h5" fontWeight={700} sx={{ backgroundColor: heatColor(valueAccessor(total)), display: 'inline-block', px: 1, borderRadius: 1, color: '#fff' }}>
											{total ? (isPitching ? (total.era?.toFixed(2) + ' ERA') : (formatRate(total.ops,3) + ' OPS')) : '—'}
										</Typography>
										{total && (
											<Table size="small" sx={{ mt: 1 }}>
												<TableBody>
													{cols.map(col => {
														const val = total[col.k];
														let baselineVal = !isPitching ? (leagueBaselines?.batting?.[col.k] ?? null) : (leagueBaselines?.pitching?.[col.k] ?? null);
														if (baselineVal == null && isPitching && ['k9','bb9'].includes(col.k)) {
															const p = leagueBaselines?.pitching; if (p?.totals?.inningsPitched) { const parts=p.totals.inningsPitched.split('.'); const outs=(parseInt(parts[0]||'0',10)*3)+parseInt(parts[1]||'0',10); const ip=outs/3; if (ip>0){ if(col.k==='k9') baselineVal=(p.totals.strikeOuts*9)/ip; else if(col.k==='bb9') baselineVal=(p.totals.baseOnBalls*9)/ip; }}}
														const bg = colorForStat({ statKey: col.k, value: val, baselineBatting: leagueBaselines?.batting, baselinePitching: leagueBaselines?.pitching, sampleValues:[val], context: isPitching?'pitching':'batting' });
														const diffPct = baselineVal != null && val != null && baselineVal !== 0 ? (((val - baselineVal)/baselineVal)*100) : null;
														return (
															<TableRow key={col.k}>
																<TableCell sx={{ py: 0.5, borderBottom: 'none' }}><Typography variant="caption" color="text.secondary">{col.l}</Typography></TableCell>
																<TableCell sx={{ py: 0.5, borderBottom: 'none', backgroundColor:bg, color:'#fff', borderRadius:1 }} align="right">
																	<Tooltip title={baselineVal != null ? `League ${col.l}: ${col.fmt?col.fmt(baselineVal):baselineVal}${diffPct!=null?` | Diff: ${diffPct>0?'+':''}${diffPct.toFixed(1)}%`:''}`:''} arrow>
																		<Box component="span">
																			<Typography variant="caption" fontWeight={700} component="span">{col.fmt ? col.fmt(val) : (val ?? 0)}</Typography>
																			{showBaselines && baselineVal != null && (
																				<Typography variant="caption" component="span" sx={{ ml:.5, opacity:.85 }}>({col.fmt?col.fmt(baselineVal):baselineVal})</Typography>
																			)}
																		</Box>
																	</Tooltip>
																</TableCell>
														</TableRow>
														);
													})}
												</TableBody>
											</Table>
										)}
										  {/* Mini bars removed as requested */}
									</CardContent>
								</Card>
							</Box>
							<Divider sx={{ my: 3 }} />
							<Typography variant="subtitle1" fontWeight={700} gutterBottom>Vs Handedness (Aggregate)</Typography>
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
								<Card variant="outlined" sx={{ flex: '1 1 300px', minWidth: 280 }}>
									<CardContent>
										<Typography variant="subtitle2" color="text.secondary">VS LEFT</Typography>
										  <Typography variant="h6" fontWeight={700} sx={{ backgroundColor: heatColor(valueAccessor(lh)), display: 'inline-block', px: 1, borderRadius: 1, color: '#fff' }}>
											{lh ? (isPitching ? (lh.era?.toFixed(2)+' ERA') : (formatRate(lh.ops,3)+' OPS')) : '—'}
										</Typography>
										{lh && (
											<Table size="small" sx={{ mt: 1 }}>
												<TableBody>
													{cols.map(col => {
														const val = lh[col.k];
														let baselineVal = !isPitching ? (leagueBaselines?.batting?.[col.k] ?? null) : (leagueBaselines?.pitching?.[col.k] ?? null);
														if (baselineVal == null && isPitching && ['k9','bb9'].includes(col.k)) {
															const p = leagueBaselines?.pitching; if (p?.totals?.inningsPitched){ const parts=p.totals.inningsPitched.split('.'); const outs=(parseInt(parts[0]||'0',10)*3)+parseInt(parts[1]||'0',10); const ip=outs/3; if(ip>0){ if(col.k==='k9') baselineVal=(p.totals.strikeOuts*9)/ip; else if(col.k==='bb9') baselineVal=(p.totals.baseOnBalls*9)/ip; }}}
														const bg = colorForStat({ statKey: col.k, value: val, baselineBatting: leagueBaselines?.batting, baselinePitching: leagueBaselines?.pitching, sampleValues:[val], context: isPitching?'pitching':'batting' });
														const diffPct = baselineVal != null && val != null && baselineVal !== 0 ? (((val - baselineVal)/baselineVal)*100) : null;
														return (
															<TableRow key={col.k}>
																<TableCell sx={{ py: 0.4, borderBottom:'none' }}><Typography variant="caption" color="text.secondary">{col.l}</Typography></TableCell>
																<TableCell sx={{ py: 0.4, borderBottom:'none', backgroundColor:bg, color:'#fff', borderRadius:1 }} align="right">
																	<Tooltip title={baselineVal != null ? `League ${col.l}: ${col.fmt?col.fmt(baselineVal):baselineVal}${diffPct!=null?` | Diff: ${diffPct>0?'+':''}${diffPct.toFixed(1)}%`:''}`:''} arrow>
																		<Box component="span">
																			<Typography variant="caption" fontWeight={600} component="span">{col.fmt ? col.fmt(val) : (val ?? 0)}</Typography>
																			{showBaselines && baselineVal != null && (<Typography variant="caption" component="span" sx={{ ml:.5, opacity:.85 }}>({col.fmt?col.fmt(baselineVal):baselineVal})</Typography>)}
																		</Box>
																	</Tooltip>
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</Table>
										)}
										  {/* Mini bars removed as requested */}
									</CardContent>
								</Card>
								<Card variant="outlined" sx={{ flex: '1 1 300px', minWidth: 280 }}>
									<CardContent>
										<Typography variant="subtitle2" color="text.secondary">VS RIGHT</Typography>
										  <Typography variant="h6" fontWeight={700} sx={{ backgroundColor: heatColor(valueAccessor(rh)), display: 'inline-block', px: 1, borderRadius: 1, color: '#fff' }}>
											{rh ? (isPitching ? (rh.era?.toFixed(2)+' ERA') : (formatRate(rh.ops,3)+' OPS')) : '—'}
										</Typography>
										{rh && (
											<Table size="small" sx={{ mt: 1 }}>
												<TableBody>
													{cols.map(col => {
														const val = rh[col.k];
														let baselineVal = !isPitching ? (leagueBaselines?.batting?.[col.k] ?? null) : (leagueBaselines?.pitching?.[col.k] ?? null);
														if (baselineVal == null && isPitching && ['k9','bb9'].includes(col.k)) { const p=leagueBaselines?.pitching; if(p?.totals?.inningsPitched){ const parts=p.totals.inningsPitched.split('.'); const outs=(parseInt(parts[0]||'0',10)*3)+parseInt(parts[1]||'0',10); const ip=outs/3; if(ip>0){ if(col.k==='k9') baselineVal=(p.totals.strikeOuts*9)/ip; else if(col.k==='bb9') baselineVal=(p.totals.baseOnBalls*9)/ip; }}}
														const bg = colorForStat({ statKey: col.k, value: val, baselineBatting: leagueBaselines?.batting, baselinePitching: leagueBaselines?.pitching, sampleValues:[val], context: isPitching?'pitching':'batting' });
														const diffPct = baselineVal != null && val != null && baselineVal !== 0 ? (((val - baselineVal)/baselineVal)*100) : null;
														return (
															<TableRow key={col.k}>
																<TableCell sx={{ py: 0.4, borderBottom:'none' }}><Typography variant="caption" color="text.secondary">{col.l}</Typography></TableCell>
																<TableCell sx={{ py: 0.4, borderBottom:'none', backgroundColor:bg, color:'#fff', borderRadius:1 }} align="right">
																	<Tooltip title={baselineVal != null ? `League ${col.l}: ${col.fmt?col.fmt(baselineVal):baselineVal}${diffPct!=null?` | Diff: ${diffPct>0?'+':''}${diffPct.toFixed(1)}%`:''}`:''} arrow>
																		<Box component="span">
																			<Typography variant="caption" fontWeight={600} component="span">{col.fmt ? col.fmt(val) : (val ?? 0)}</Typography>
																			{showBaselines && baselineVal != null && (<Typography variant="caption" component="span" sx={{ ml:.5, opacity:.85 }}>({col.fmt?col.fmt(baselineVal):baselineVal})</Typography>)}
																		</Box>
																	</Tooltip>
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</Table>
										)}
										  {/* Mini bars removed as requested */}
									</CardContent>
								</Card>
							</Box>
						</Box>
					);
				};

	// -----------------------------------------------------------------------
	// Main UI
	// -----------------------------------------------------------------------
	return (
		<Box sx={{ p: { xs: 2, sm: 3 } }}>
			<Box sx={{ mb: 4 }}>
				<Typography variant="h4" fontWeight={800} gutterBottom>Splits Explorer</Typography>
				<Typography variant="body1" color="text.secondary">Unified macro-based situational splits (storage-optimized)</Typography>
			</Box>

			{/* Search / Selection Card */}
			<Card elevation={0} sx={{ mb: 3 }}>
				<CardContent sx={{ p: 3 }}>
					<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
									<Box sx={{ minWidth: 320, position: 'relative' }}>
														<Autocomplete
											open={openSearch}
											onOpen={() => { if (playerResults.length) setOpenSearch(true); }}
											onClose={() => setOpenSearch(false)}
											loading={loadingSearch}
											options={playerResults}
															isOptionEqualToValue={(o, v) => o._key === v._key}
											getOptionLabel={(o) => `${o.name} (${o.team})`}
											filterOptions={(x) => x} // backend provides filtered
											noOptionsText={playerQuery.length < 2 ? 'Type at least 2 characters' : 'No matches'}
											renderInput={(params) => (
												<TextField
													{...params}
													inputRef={searchRef}
													placeholder="Search player (min 2 chars)"
													size="small"
													onChange={(e) => {
														setPlayerQuery(e.target.value);
														if (!openSearch) setOpenSearch(true);
													}}
													InputProps={{
														...params.InputProps,
														startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
														endAdornment: (
															<Box sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}>
																{loadingSearch && <CircularProgress size={16} />}
																{params.InputProps.endAdornment}
															</Box>
														)
													}}
												/>
											)}
															renderOption={(props, option) => (
																<ListItem {...props} key={option._key} sx={{ py: 0.5 }}>
													<ListItemAvatar>
														<Avatar src={getTeamLogoUrl(option.team)} alt={option.team} sx={{ width: 34, height: 34 }} />
													</ListItemAvatar>
													<ListItemText
														primary={<Typography variant="body2" fontWeight={600}>{option.name}</Typography>}
														secondary={<Typography variant="caption" color="text.secondary">{option.team}</Typography>}
													/>
												</ListItem>
											)}
											onChange={(_, value) => {
												if (value) {
													setSelectedPlayer({ team: value.team, name: value.name });
													setRecentPlayers(prev => {
														const exists = prev.find(p => p.name === value.name && p.team === value.team);
														const updated = exists ? prev : [{ team: value.team, name: value.name }, ...prev].slice(0, 8);
														return updated;
													});
													setOpenSearch(false);
												}
											}}
										/>
										{/* Recent selections pill row */}
										{recentPlayers.length > 0 && !playerQuery && (
											<Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
												{recentPlayers.map(r => (
													<Chip
														key={`${r.team}-${r.name}`}
														label={`${r.name.split(' ')[0]} (${r.team})`}
														size="small"
														onClick={() => setSelectedPlayer(r)}
														color={selectedPlayer?.name === r.name && selectedPlayer?.team === r.team ? 'primary' : 'default'}
													/>
												))}
											</Box>
										)}
									</Box>
						<Box sx={{ flexGrow: 1 }} />
						<IconButton onClick={() => selectedPlayer && loadMacro(selectedPlayer)} size="small"><Refresh /></IconButton>
					</Box>
					{selectedPlayer && (
						<Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
							<Avatar src={getTeamLogoUrl(selectedPlayer.team)} alt={selectedPlayer.team} sx={{ width: 40, height: 40 }} />
							<Box>
								<Typography variant="h6" fontWeight={600}>{selectedPlayer.name}</Typography>
								<Typography variant="body2" color="text.secondary">{selectedPlayer.team} • {season}</Typography>
							</Box>
							{macroLoading && <Chip label="Loading splits..." size="small" color="info" />}
							{macroError && <Chip label={macroError} size="small" color="error" />}
						</Box>
					)}
				</CardContent>
			</Card>

			{/* Tabs */}
			<Card elevation={0} sx={{ mb: 3 }}>
				<CardContent sx={{ p: 0 }}>
					<Tabs
						value={activeTab}
						onChange={(_, v) => setActiveTab(v)}
						variant="scrollable"
						scrollButtons="auto"
						sx={{ px: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
					>
						<Tab value="overview" label="Overview" icon={<SportsBaseball fontSize="small" />} iconPosition="start" />
						<Tab value="teams" label="Vs Teams" icon={<Analytics fontSize="small" />} iconPosition="start" />
						<Tab value="pitchers" label="Vs Pitchers" icon={<PersonSearch fontSize="small" />} iconPosition="start" />
						<Tab value="counts" label="Counts" icon={<Numbers fontSize="small" />} iconPosition="start" />
						<Tab value="compound" label="Compound" icon={<Hub fontSize="small" />} iconPosition="start" />
					</Tabs>
				</CardContent>
			</Card>

			{/* Data Section */}
			<AnimatePresence mode="wait">
				{!selectedPlayer ? (
					<motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<Card variant="outlined">
							<CardContent sx={{ p: 6, textAlign: 'center' }}>
								<Typography variant="h6" gutterBottom>Select a player to view splits</Typography>
								<Typography variant="body2" color="text.secondary">Search above to begin exploring situational performance.</Typography>
							</CardContent>
						</Card>
					</motion.div>
				) : macroLoading ? (
					<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<Card variant="outlined"><CardContent sx={{ p: 6, textAlign: 'center' }}><CircularProgress /><Typography variant="body2" sx={{ mt: 2 }}>Loading macro splits...</Typography></CardContent></Card>
					</motion.div>
				) : macroError ? (
					<motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<Card variant="outlined"><CardContent sx={{ p: 6, textAlign: 'center' }}><Typography color="error" variant="h6">{macroError}</Typography><Button onClick={() => loadMacro(selectedPlayer)} sx={{ mt: 2 }} startIcon={<Refresh />}>Retry</Button></CardContent></Card>
					</motion.div>
				) : (
					<motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
												{activeTab !== 'overview' && (
													<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
														<Tooltip title="Export CSV of current view">
															<IconButton size="small" onClick={handleExport} disabled={(activeTab === 'compound' ? sortedCompoundGroups.length === 0 : sortedRows.length === 0)}>
																<Download fontSize="small" />
															</IconButton>
														</Tooltip>
													</Box>
												)}
												{activeTab === 'overview' ? renderHomeAwayCards() : activeTab === 'compound' ? renderCompound() : renderFilteredCards()}
					</motion.div>
				)}
			</AnimatePresence>
		</Box>
	);
};

export default SplitsExplorer;
