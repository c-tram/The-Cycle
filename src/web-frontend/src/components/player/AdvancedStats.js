import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Tooltip,
  LinearProgress,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Timeline,
  Speed,
  GpsFixed as Target,
  Psychology,
  Info
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';

// Utils
import { themeUtils } from '../../theme/theme';

const AdvancedStats = ({ player, gameLog, seasonStats }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Determine if player is primarily a batter or pitcher
  const isPrimaryBatter = (player.batting?.atBats || 0) > (player.pitching?.battersFaced || 0) / 4;

  // Advanced batting metrics calculations
  const calculateAdvancedBattingStats = (stats) => {
    const ab = stats?.atBats || 0;
    const hits = stats?.hits || 0;
    const doubles = stats?.doubles || 0;
    const triples = stats?.triples || 0;
    const hr = stats?.homeRuns || 0;
    const bb = stats?.baseOnBalls || 0;
    const so = stats?.strikeOuts || 0;
    const hbp = stats?.hitByPitch || 0;
    const sf = stats?.sacFlies || 0;
    const singles = hits - doubles - triples - hr;

    // Basic rates
    const avg = ab > 0 ? hits / ab : 0;
    const obp = (ab + bb + hbp + sf) > 0 ? (hits + bb + hbp) / (ab + bb + hbp + sf) : 0;
    const slg = ab > 0 ? (singles + (doubles * 2) + (triples * 3) + (hr * 4)) / ab : 0;
    const ops = obp + slg;

    // Advanced metrics
    const iso = slg - avg; // Isolated Power
    const babip = (hits - hr) > 0 && (ab - so - hr + sf) > 0 ? (hits - hr) / (ab - so - hr + sf) : 0;
    const kRate = ab > 0 ? so / ab : 0;
    const bbRate = ab > 0 ? bb / ab : 0;
    const hrRate = ab > 0 ? hr / ab : 0;
    
    // wOBA calculation (simplified)
    const woba = (ab + bb + hbp + sf) > 0 ? 
      (0.69 * bb + 0.72 * hbp + 0.89 * singles + 1.27 * doubles + 1.62 * triples + 2.10 * hr) / 
      (ab + bb + hbp + sf) : 0;

    // wRC+ (simplified, normally requires league averages)
    const wrcPlus = woba > 0 ? (woba / 0.320) * 100 : 0; // 0.320 is approximate league average wOBA

    return {
      avg, obp, slg, ops, iso, babip, kRate, bbRate, hrRate, woba, wrcPlus
    };
  };

  // Advanced pitching metrics calculations
  const calculateAdvancedPitchingStats = (stats) => {
    const ip = typeof stats?.inningsPitched === 'string' ? 
      parseFloat(stats.inningsPitched) : (stats?.inningsPitched || 0);
    const hits = stats?.hits || 0;
    const er = stats?.earnedRuns || 0;
    const bb = stats?.baseOnBalls || 0;
    const so = stats?.strikeOuts || 0;
    const hr = stats?.homeRuns || 0;
    const bf = stats?.battersFaced || 0;

    // Basic rates
    const era = ip > 0 ? (er * 9) / ip : 0;
    const whip = ip > 0 ? (hits + bb) / ip : 0;

    // Rate stats per 9 innings
    const k9 = ip > 0 ? (so * 9) / ip : 0;
    const bb9 = ip > 0 ? (bb * 9) / ip : 0;
    const hr9 = ip > 0 ? (hr * 9) / ip : 0;
    const h9 = ip > 0 ? (hits * 9) / ip : 0;

    // Advanced metrics
    const kRate = bf > 0 ? so / bf : 0;
    const bbRate = bf > 0 ? bb / bf : 0;
    const kbb = bb > 0 ? so / bb : 0;

    // FIP calculation
    const fip = ip > 0 ? ((13 * hr) + (3 * bb) - (2 * so)) / ip + 3.10 : 0; // 3.10 is FIP constant

    // BABIP for pitchers
    const babip = (hits - hr) > 0 && (bf - so - hr - bb) > 0 ? 
      (hits - hr) / (bf - so - hr - bb) : 0;

    return {
      era, whip, k9, bb9, hr9, h9, kRate, bbRate, kbb, fip, babip
    };
  };

  // Calculate advanced stats for current season
  const currentAdvancedStats = useMemo(() => {
    if (isPrimaryBatter) {
      return calculateAdvancedBattingStats(seasonStats?.batting);
    } else {
      return calculateAdvancedPitchingStats(seasonStats?.pitching);
    }
  }, [seasonStats, isPrimaryBatter]);

  // Generate trend data from game log
  const trendData = useMemo(() => {
    if (!gameLog.length) return [];

    const sortedGames = [...gameLog].sort((a, b) => 
      new Date(a.gameInfo?.date || a.date) - new Date(b.gameInfo?.date || b.date)
    );

    let runningStats = [];
    let cumulativeStats = { hits: 0, ab: 0, er: 0, ip: 0, so: 0, bb: 0 };

    sortedGames.forEach((game, index) => {
      const statCategory = isPrimaryBatter ? 'batting' : 'pitching';
      const gameStats = game[statCategory];

      if (isPrimaryBatter) {
        cumulativeStats.hits += gameStats?.hits || 0;
        cumulativeStats.ab += gameStats?.atBats || 0;
        cumulativeStats.so += gameStats?.strikeOuts || 0;
        cumulativeStats.bb += gameStats?.baseOnBalls || 0;

        const avg = cumulativeStats.ab > 0 ? cumulativeStats.hits / cumulativeStats.ab : 0;
        const kRate = cumulativeStats.ab > 0 ? cumulativeStats.so / cumulativeStats.ab : 0;

        runningStats.push({
          game: index + 1,
          date: game.gameInfo?.date || game.date,
          avg: avg,
          kRate: kRate,
          primaryStat: avg
        });
      } else {
        cumulativeStats.er += gameStats?.earnedRuns || 0;
        const gameIP = typeof gameStats?.inningsPitched === 'string' ? 
          parseFloat(gameStats.inningsPitched) : (gameStats?.inningsPitched || 0);
        cumulativeStats.ip += gameIP;
        cumulativeStats.so += gameStats?.strikeOuts || 0;

        const era = cumulativeStats.ip > 0 ? (cumulativeStats.er * 9) / cumulativeStats.ip : 0;
        const k9 = cumulativeStats.ip > 0 ? (cumulativeStats.so * 9) / cumulativeStats.ip : 0;

        runningStats.push({
          game: index + 1,
          date: game.gameInfo?.date || game.date,
          era: era,
          k9: k9,
          primaryStat: era
        });
      }
    });

    return runningStats;
  }, [gameLog, isPrimaryBatter]);

  // League percentiles (simulated - would come from real league data)
  const getPercentile = (value, stat) => {
    const percentiles = {
      // Batting percentiles (higher is better)
      avg: { 90: 0.300, 75: 0.280, 50: 0.260, 25: 0.240 },
      ops: { 90: 0.900, 75: 0.800, 50: 0.720, 25: 0.650 },
      woba: { 90: 0.370, 75: 0.340, 50: 0.320, 25: 0.300 },
      iso: { 90: 0.200, 75: 0.160, 50: 0.130, 25: 0.100 },
      
      // Pitching percentiles (lower is better for ERA, WHIP)
      era: { 90: 3.00, 75: 3.50, 50: 4.00, 25: 4.50 },
      whip: { 90: 1.10, 75: 1.25, 50: 1.35, 25: 1.45 },
      fip: { 90: 3.20, 75: 3.80, 50: 4.20, 25: 4.60 },
      k9: { 90: 10.0, 75: 8.5, 50: 7.5, 25: 6.5 }
    };

    const thresholds = percentiles[stat];
    if (!thresholds) return 50;

    const isLowerBetter = ['era', 'whip', 'fip'].includes(stat);
    
    if (isLowerBetter) {
      if (value <= thresholds[90]) return 90;
      if (value <= thresholds[75]) return 75;
      if (value <= thresholds[50]) return 50;
      if (value <= thresholds[25]) return 25;
      return 10;
    } else {
      if (value >= thresholds[90]) return 90;
      if (value >= thresholds[75]) return 75;
      if (value >= thresholds[50]) return 50;
      if (value >= thresholds[25]) return 25;
      return 10;
    }
  };

  // Advanced stats categories
  const battingAdvancedCategories = [
    {
      label: 'Plate Discipline',
      icon: Target,
      stats: [
        { key: 'kRate', label: 'K%', value: currentAdvancedStats.kRate, format: (v) => `${(v * 100).toFixed(1)}%`, lower_better: true },
        { key: 'bbRate', label: 'BB%', value: currentAdvancedStats.bbRate, format: (v) => `${(v * 100).toFixed(1)}%` },
        { key: 'kbb', label: 'K/BB', value: currentAdvancedStats.kRate / (currentAdvancedStats.bbRate || 0.01), format: (v) => v.toFixed(2), lower_better: true }
      ]
    },
    {
      label: 'Power Metrics',
      icon: Speed,
      stats: [
        { key: 'iso', label: 'ISO', value: currentAdvancedStats.iso, format: (v) => v.toFixed(3) },
        { key: 'hrRate', label: 'HR%', value: currentAdvancedStats.hrRate, format: (v) => `${(v * 100).toFixed(1)}%` },
        { key: 'slg', label: 'SLG', value: currentAdvancedStats.slg, format: (v) => v.toFixed(3) }
      ]
    },
    {
      label: 'Advanced Metrics',
      icon: Analytics,
      stats: [
        { key: 'woba', label: 'wOBA', value: currentAdvancedStats.woba, format: (v) => v.toFixed(3) },
        { key: 'wrcPlus', label: 'wRC+', value: currentAdvancedStats.wrcPlus, format: (v) => Math.round(v) },
        { key: 'babip', label: 'BABIP', value: currentAdvancedStats.babip, format: (v) => v.toFixed(3) }
      ]
    }
  ];

  const pitchingAdvancedCategories = [
    {
      label: 'Command & Control',
      icon: Target,
      stats: [
        { key: 'kRate', label: 'K%', value: currentAdvancedStats.kRate, format: (v) => `${(v * 100).toFixed(1)}%` },
        { key: 'bbRate', label: 'BB%', value: currentAdvancedStats.bbRate, format: (v) => `${(v * 100).toFixed(1)}%`, lower_better: true },
        { key: 'kbb', label: 'K/BB', value: currentAdvancedStats.kbb, format: (v) => v.toFixed(2) }
      ]
    },
    {
      label: 'Rate Stats',
      icon: Speed,
      stats: [
        { key: 'k9', label: 'K/9', value: currentAdvancedStats.k9, format: (v) => v.toFixed(1) },
        { key: 'bb9', label: 'BB/9', value: currentAdvancedStats.bb9, format: (v) => v.toFixed(1), lower_better: true },
        { key: 'hr9', label: 'HR/9', value: currentAdvancedStats.hr9, format: (v) => v.toFixed(1), lower_better: true }
      ]
    },
    {
      label: 'Advanced Metrics',
      icon: Analytics,
      stats: [
        { key: 'fip', label: 'FIP', value: currentAdvancedStats.fip, format: (v) => v.toFixed(2), lower_better: true },
        { key: 'babip', label: 'BABIP', value: currentAdvancedStats.babip, format: (v) => v.toFixed(3) },
        { key: 'whip', label: 'WHIP', value: currentAdvancedStats.whip, format: (v) => v.toFixed(2), lower_better: true }
      ]
    }
  ];

  const advancedCategories = isPrimaryBatter ? battingAdvancedCategories : pitchingAdvancedCategories;

  const tabOptions = [
    { label: 'Overview', icon: Analytics },
    { label: 'Trends', icon: Timeline },
    { label: 'Percentiles', icon: Psychology }
  ];

  const renderPercentileBar = (value, percentile) => {
    const getColor = (pct) => {
      if (pct >= 75) return theme.palette.success.main;
      if (pct >= 50) return theme.palette.warning.main;
      return theme.palette.error.main;
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentile}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
              '& .MuiLinearProgress-bar': {
                backgroundColor: getColor(percentile),
                borderRadius: 4
              }
            }}
          />
        </Box>
        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 45 }}>
          {percentile}th
        </Typography>
      </Box>
    );
  };

  if (!seasonStats) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          No advanced stats available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {player.name} - Advanced Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Deep dive into advanced metrics, trends, and predictive analytics
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 60,
              textTransform: 'none',
              fontWeight: 600
            }
          }}
        >
          {tabOptions.map((tab, index) => (
            <Tab
              key={tab.label}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <tab.icon fontSize="small" />
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Advanced Stats Categories */}
          {advancedCategories.map((category, index) => (
            <Grid item xs={12} md={4} key={category.label}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card elevation={0} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <category.icon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        {category.label}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {category.stats.map((stat) => (
                        <Grid item xs={12} key={stat.key}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                {stat.label}
                              </Typography>
                              <Typography variant="h6" fontWeight={700}>
                                {stat.format(stat.value || 0)}
                              </Typography>
                            </Box>
                            {renderPercentileBar(stat.value, getPercentile(stat.value, stat.key))}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Card elevation={0}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Season Progression
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="game"
                    label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: isPrimaryBatter ? 'Batting Average' : 'ERA', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip 
                    labelFormatter={(value) => `Game ${value}`}
                    formatter={(value, name) => [
                      isPrimaryBatter ? value.toFixed(3) : value.toFixed(2),
                      isPrimaryBatter ? 'AVG' : 'ERA'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="primaryStat" 
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  League Percentile Rankings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  How {player.name} ranks compared to other MLB {isPrimaryBatter ? 'batters' : 'pitchers'}
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Metric</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Value</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Percentile</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ranking</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {advancedCategories.flatMap(category => category.stats).map((stat) => {
                        const percentile = getPercentile(stat.value, stat.key);
                        return (
                          <TableRow key={stat.key}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {stat.label}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={600}>
                                {stat.format(stat.value || 0)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={600}>
                                {percentile}th
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {renderPercentileBar(stat.value, percentile)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdvancedStats;
