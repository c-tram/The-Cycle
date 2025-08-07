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
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Star,
  EmojiEvents,
  Timeline,
  ShowChart,
  TableChart,
  BarChart as BarChartIcon
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
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Utils
import { themeUtils } from '../../theme/theme';

const CareerStats = ({ player, careerStats, showAdvanced, onAdvancedToggle }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [viewType, setViewType] = useState('table'); // 'table', 'chart'

  // Determine if player is primarily a batter or pitcher
  const isPrimaryBatter = (player.batting?.atBats || 0) > (player.pitching?.battersFaced || 0) / 4;

  // Mock career data - in real app this would come from API
  const mockCareerData = useMemo(() => {
    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
    return years.map((year, index) => {
      if (isPrimaryBatter) {
        const games = year === 2020 ? 60 : (140 + Math.random() * 20);
        const ab = Math.floor(games * (3.5 + Math.random() * 1));
        const hits = Math.floor(ab * (0.240 + Math.random() * 0.080));
        const hr = Math.floor(hits * (0.15 + Math.random() * 0.10));
        const rbi = Math.floor(hr * 3 + hits * 0.3);
        const runs = Math.floor(hits * 0.8 + hr * 0.5);
        const bb = Math.floor(ab * (0.08 + Math.random() * 0.04));
        const so = Math.floor(ab * (0.18 + Math.random() * 0.08));
        
        return {
          year,
          games: Math.floor(games),
          atBats: ab,
          hits,
          runs,
          doubles: Math.floor(hits * 0.15),
          triples: Math.floor(hits * 0.02),
          homeRuns: hr,
          rbi,
          baseOnBalls: bb,
          strikeOuts: so,
          avg: hits / ab,
          obp: (hits + bb) / (ab + bb),
          slg: (hits + Math.floor(hits * 0.15) + (Math.floor(hits * 0.02) * 2) + (hr * 3)) / ab,
          ops: 0,
          war: 1.5 + Math.random() * 3,
          team: player.team || 'HOU'
        };
      } else {
        const games = year === 2020 ? 12 : (28 + Math.random() * 10);
        const ip = games * (5.5 + Math.random() * 1);
        const hits = Math.floor(ip * (8.2 + Math.random() * 2));
        const er = Math.floor(ip * (3.8 + Math.random() * 2) / 9);
        const bb = Math.floor(ip * (2.8 + Math.random() * 1.5) / 9);
        const so = Math.floor(ip * (8.5 + Math.random() * 3) / 9);
        const hr = Math.floor(ip * (1.1 + Math.random() * 0.5) / 9);
        
        return {
          year,
          games: Math.floor(games),
          wins: Math.floor(games * 0.5 + Math.random() * 5),
          losses: Math.floor(games * 0.3 + Math.random() * 4),
          saves: Math.floor(Math.random() * 5),
          inningsPitched: ip,
          hits,
          earnedRuns: er,
          baseOnBalls: bb,
          strikeOuts: so,
          homeRuns: hr,
          era: (er * 9) / ip,
          whip: (hits + bb) / ip,
          k9: (so * 9) / ip,
          war: 1.0 + Math.random() * 4,
          team: player.team || 'HOU'
        };
      }
    }).map(season => ({
      ...season,
      ops: season.obp + season.slg
    }));
  }, [isPrimaryBatter, player.team]);

  // Add current season (2025) from actual data if available
  const completeCareerData = useMemo(() => {
    const currentSeason = {
      year: 2025,
      team: player.team,
      ...careerStats
    };

    // Calculate derived stats for current season
    if (isPrimaryBatter && currentSeason.batting) {
      const batting = currentSeason.batting;
      currentSeason.avg = batting.atBats > 0 ? batting.hits / batting.atBats : 0;
      currentSeason.obp = (batting.atBats + batting.baseOnBalls) > 0 ? 
        (batting.hits + batting.baseOnBalls) / (batting.atBats + batting.baseOnBalls) : 0;
      currentSeason.slg = batting.atBats > 0 ? 
        ((batting.hits - batting.doubles - batting.triples - batting.homeRuns) + 
         (batting.doubles * 2) + (batting.triples * 3) + (batting.homeRuns * 4)) / batting.atBats : 0;
      currentSeason.ops = currentSeason.obp + currentSeason.slg;
    } else if (!isPrimaryBatter && currentSeason.pitching) {
      const pitching = currentSeason.pitching;
      const ip = typeof pitching.inningsPitched === 'string' ? 
        parseFloat(pitching.inningsPitched) : pitching.inningsPitched;
      currentSeason.era = ip > 0 ? (pitching.earnedRuns * 9) / ip : 0;
      currentSeason.whip = ip > 0 ? (pitching.hits + pitching.baseOnBalls) / ip : 0;
      currentSeason.k9 = ip > 0 ? (pitching.strikeOuts * 9) / ip : 0;
    }

    // Replace 2025 in mock data with actual data
    const mockWithoutCurrent = mockCareerData.filter(season => season.year !== 2025);
    return [...mockWithoutCurrent, currentSeason].sort((a, b) => a.year - b.year);
  }, [mockCareerData, careerStats, player.team, isPrimaryBatter]);

  // Career totals and averages
  const careerTotals = useMemo(() => {
    const totals = completeCareerData.reduce((acc, season) => {
      if (isPrimaryBatter) {
        acc.games += season.games || 0;
        acc.atBats += season.atBats || 0;
        acc.hits += season.hits || 0;
        acc.runs += season.runs || 0;
        acc.doubles += season.doubles || 0;
        acc.triples += season.triples || 0;
        acc.homeRuns += season.homeRuns || 0;
        acc.rbi += season.rbi || 0;
        acc.baseOnBalls += season.baseOnBalls || 0;
        acc.strikeOuts += season.strikeOuts || 0;
        acc.war += season.war || 0;
      } else {
        acc.games += season.games || 0;
        acc.wins += season.wins || 0;
        acc.losses += season.losses || 0;
        acc.saves += season.saves || 0;
        acc.inningsPitched += season.inningsPitched || 0;
        acc.hits += season.hits || 0;
        acc.earnedRuns += season.earnedRuns || 0;
        acc.baseOnBalls += season.baseOnBalls || 0;
        acc.strikeOuts += season.strikeOuts || 0;
        acc.homeRuns += season.homeRuns || 0;
        acc.war += season.war || 0;
      }
      return acc;
    }, {
      games: 0, atBats: 0, hits: 0, runs: 0, doubles: 0, triples: 0, homeRuns: 0, 
      rbi: 0, baseOnBalls: 0, strikeOuts: 0, wins: 0, losses: 0, saves: 0,
      inningsPitched: 0, earnedRuns: 0, war: 0
    });

    // Calculate averages
    if (isPrimaryBatter) {
      totals.avg = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
      totals.obp = (totals.atBats + totals.baseOnBalls) > 0 ? 
        (totals.hits + totals.baseOnBalls) / (totals.atBats + totals.baseOnBalls) : 0;
      const totalBases = (totals.hits - totals.doubles - totals.triples - totals.homeRuns) + 
        (totals.doubles * 2) + (totals.triples * 3) + (totals.homeRuns * 4);
      totals.slg = totals.atBats > 0 ? totalBases / totals.atBats : 0;
      totals.ops = totals.obp + totals.slg;
    } else {
      totals.era = totals.inningsPitched > 0 ? (totals.earnedRuns * 9) / totals.inningsPitched : 0;
      totals.whip = totals.inningsPitched > 0 ? (totals.hits + totals.baseOnBalls) / totals.inningsPitched : 0;
      totals.k9 = totals.inningsPitched > 0 ? (totals.strikeOuts * 9) / totals.inningsPitched : 0;
    }

    return totals;
  }, [completeCareerData, isPrimaryBatter]);

  // Career highlights and achievements
  const careerHighlights = useMemo(() => {
    const highlights = [];
    
    if (isPrimaryBatter) {
      const bestAvgSeason = completeCareerData.reduce((best, season) => 
        (season.avg || 0) > (best.avg || 0) ? season : best
      );
      const bestHRSeason = completeCareerData.reduce((best, season) => 
        (season.homeRuns || 0) > (best.homeRuns || 0) ? season : best
      );
      const bestOPSSeason = completeCareerData.reduce((best, season) => 
        (season.ops || 0) > (best.ops || 0) ? season : best
      );

      highlights.push(
        { label: 'Best Average', value: bestAvgSeason.avg?.toFixed(3), year: bestAvgSeason.year },
        { label: 'Most Home Runs', value: bestHRSeason.homeRuns, year: bestHRSeason.year },
        { label: 'Best OPS', value: bestOPSSeason.ops?.toFixed(3), year: bestOPSSeason.year },
        { label: 'Career Home Runs', value: careerTotals.homeRuns, year: 'Total' }
      );
    } else {
      const bestERASeason = completeCareerData.reduce((best, season) => 
        (season.era || 10) < (best.era || 10) ? season : best
      );
      const bestK9Season = completeCareerData.reduce((best, season) => 
        (season.k9 || 0) > (best.k9 || 0) ? season : best
      );
      const mostWinsSeason = completeCareerData.reduce((best, season) => 
        (season.wins || 0) > (best.wins || 0) ? season : best
      );

      highlights.push(
        { label: 'Best ERA', value: bestERASeason.era?.toFixed(2), year: bestERASeason.year },
        { label: 'Best K/9', value: bestK9Season.k9?.toFixed(1), year: bestK9Season.year },
        { label: 'Most Wins', value: mostWinsSeason.wins, year: mostWinsSeason.year },
        { label: 'Career Strikeouts', value: careerTotals.strikeOuts, year: 'Total' }
      );
    }

    return highlights;
  }, [completeCareerData, careerTotals, isPrimaryBatter]);

  // Stats configuration for table display
  const battingStats = [
    { key: 'year', label: 'Year', format: (val) => val },
    { key: 'team', label: 'Team', format: (val) => val },
    { key: 'games', label: 'G', format: (val) => val || 0 },
    { key: 'atBats', label: 'AB', format: (val) => val || 0 },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'runs', label: 'R', format: (val) => val || 0 },
    { key: 'doubles', label: '2B', format: (val) => val || 0 },
    { key: 'triples', label: '3B', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'rbi', label: 'RBI', format: (val) => val || 0 },
    { key: 'baseOnBalls', label: 'BB', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'avg', label: 'AVG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'obp', label: 'OBP', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'slg', label: 'SLG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'ops', label: 'OPS', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'war', label: 'WAR', format: (val) => val?.toFixed(1) || '0.0' }
  ];

  const pitchingStats = [
    { key: 'year', label: 'Year', format: (val) => val },
    { key: 'team', label: 'Team', format: (val) => val },
    { key: 'games', label: 'G', format: (val) => val || 0 },
    { key: 'wins', label: 'W', format: (val) => val || 0 },
    { key: 'losses', label: 'L', format: (val) => val || 0 },
    { key: 'saves', label: 'SV', format: (val) => val || 0 },
    { key: 'inningsPitched', label: 'IP', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'earnedRuns', label: 'ER', format: (val) => val || 0 },
    { key: 'baseOnBalls', label: 'BB', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'era', label: 'ERA', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'k9', label: 'K/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'war', label: 'WAR', format: (val) => val?.toFixed(1) || '0.0' }
  ];

  const currentStats = isPrimaryBatter ? battingStats : pitchingStats;
  const statsToShow = showAdvanced ? currentStats : currentStats.slice(0, -5); // Hide advanced stats if toggle is off

  const tabOptions = [
    { label: 'Table View', icon: TableChart },
    { label: 'Chart View', icon: ShowChart },
    { label: 'Highlights', icon: Star }
  ];

  return (
    <Box>
      {/* Header */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              {player.name} - Career Statistics
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={showAdvanced}
                  onChange={(e) => onAdvancedToggle(e.target.checked)}
                  color="primary"
                />
              }
              label="Advanced Stats"
            />
          </Box>
          <Typography variant="body1" color="text.secondary">
            Complete career statistics from {completeCareerData[0]?.year} to present
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
        <Card elevation={0}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {statsToShow.map((stat) => (
                    <TableCell 
                      key={stat.key} 
                      align={stat.key === 'year' || stat.key === 'team' ? 'left' : 'center'}
                      sx={{ fontWeight: 700, minWidth: stat.key === 'team' ? 80 : 60 }}
                    >
                      {stat.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {completeCareerData.map((season, index) => (
                  <motion.tr
                    key={season.year}
                    component={TableRow}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.02)
                      },
                      ...(season.year === 2025 && {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12)
                        }
                      })
                    }}
                  >
                    {statsToShow.map((stat) => {
                      const value = stat.key === 'team' ? season[stat.key] : 
                                   stat.key.includes('.') ? 
                                   stat.key.split('.').reduce((obj, key) => obj?.[key], season) :
                                   season[stat.key];

                      return (
                        <TableCell 
                          key={stat.key} 
                          align={stat.key === 'year' || stat.key === 'team' ? 'left' : 'center'}
                        >
                          {stat.key === 'team' ? (
                            <Chip
                              label={value || 'N/A'}
                              size="small"
                              sx={{
                                backgroundColor: themeUtils.getTeamColor(value || ''),
                                color: 'white',
                                fontWeight: 600,
                                minWidth: 45
                              }}
                            />
                          ) : stat.key === 'year' ? (
                            <Typography 
                              variant="body2" 
                              fontWeight={season.year === 2025 ? 700 : 600}
                              color={season.year === 2025 ? 'primary' : 'text.primary'}
                            >
                              {value}
                            </Typography>
                          ) : (
                            <Typography variant="body2" fontWeight={600}>
                              {stat.format(value)}
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </motion.tr>
                ))}
                
                {/* Career Totals Row */}
                <TableRow sx={{ 
                  borderTop: 2, 
                  borderColor: 'primary.main',
                  backgroundColor: alpha(theme.palette.primary.main, 0.05)
                }}>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={700}>
                      Career
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={700}>
                      Total
                    </Typography>
                  </TableCell>
                  {statsToShow.slice(2).map((stat) => (
                    <TableCell key={stat.key} align="center">
                      <Typography variant="body2" fontWeight={700}>
                        {stat.format(careerTotals[stat.key])}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Career Progression
                </Typography>
                <Box sx={{ height: 400, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completeCareerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          isPrimaryBatter ? value.toFixed(3) : value.toFixed(2),
                          isPrimaryBatter ? 'OPS' : 'ERA'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={isPrimaryBatter ? 'ops' : 'era'}
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {isPrimaryBatter ? 'Home Runs by Season' : 'Strikeouts by Season'}
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completeCareerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar 
                        dataKey={isPrimaryBatter ? 'homeRuns' : 'strikeOuts'}
                        fill={theme.palette.primary.main}
                      >
                        {completeCareerData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.year === 2025 ? theme.palette.secondary.main : theme.palette.primary.main}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Career Highlights */}
          <Grid item xs={12}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Career Highlights
                </Typography>
                <Grid container spacing={3}>
                  {careerHighlights.map((highlight, index) => (
                    <Grid item xs={6} sm={3} key={highlight.label}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Box
                          sx={{
                            p: 3,
                            textAlign: 'center',
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                          }}
                        >
                          <EmojiEvents color="primary" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="h4" fontWeight={700} color="primary">
                            {highlight.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {highlight.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {highlight.year}
                          </Typography>
                        </Box>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Career Milestones */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Career Milestones
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {isPrimaryBatter ? (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">1,000 Career Hits</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.hits >= 1000 ? '✓ Achieved' : `${careerTotals.hits}/1,000`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.hits / 1000) * 100, 100)}
                        sx={{ mb: 3 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">100 Career Home Runs</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.homeRuns >= 100 ? '✓ Achieved' : `${careerTotals.homeRuns}/100`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.homeRuns / 100) * 100, 100)}
                        sx={{ mb: 3 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">500 Career RBI</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.rbi >= 500 ? '✓ Achieved' : `${careerTotals.rbi}/500`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.rbi / 500) * 100, 100)}
                      />
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">100 Career Wins</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.wins >= 100 ? '✓ Achieved' : `${careerTotals.wins}/100`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.wins / 100) * 100, 100)}
                        sx={{ mb: 3 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">1,000 Career Strikeouts</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.strikeOuts >= 1000 ? '✓ Achieved' : `${careerTotals.strikeOuts}/1,000`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.strikeOuts / 1000) * 100, 100)}
                        sx={{ mb: 3 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">1,000 Career Innings</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {careerTotals.inningsPitched >= 1000 ? '✓ Achieved' : `${careerTotals.inningsPitched.toFixed(1)}/1,000`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((careerTotals.inningsPitched / 1000) * 100, 100)}
                      />
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Awards & Achievements */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Awards & Achievements
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {/* Mock awards - would come from real data */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Star color="warning" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        All-Star Selection
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2023, 2024
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <EmojiEvents color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Silver Slugger Award
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2024
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Timeline color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {careerTotals.war?.toFixed(1)} Career WAR
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {completeCareerData.length} seasons
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CareerStats;
