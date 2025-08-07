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
  Paper
} from '@mui/material';
import {
  Home as HomeIcon,
  FlightTakeoff as AwayIcon,
  WbSunny as DayIcon,
  Brightness3 as NightIcon,
  People as VsLeftIcon,
  PersonOutline as VsRightIcon,
  CalendarToday as MonthIcon,
  Stadium as VenueIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Utils
import { themeUtils } from '../../theme/theme';

const PlayerSplits = ({ player, gameLog, showAdvanced }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Determine if player is primarily a batter or pitcher
  const isPrimaryBatter = (player.batting?.atBats || 0) > (player.pitching?.battersFaced || 0) / 4;

  // Calculate splits based on different criteria
  const calculateSplits = (games, splitFunction) => {
    const splitGroups = {};
    
    games.forEach(game => {
      const splitKey = splitFunction(game);
      if (!splitGroups[splitKey]) {
        splitGroups[splitKey] = [];
      }
      splitGroups[splitKey].push(game);
    });

    return Object.entries(splitGroups).map(([key, groupGames]) => {
      const stats = calculateGroupStats(groupGames);
      return {
        split: key,
        games: groupGames.length,
        ...stats
      };
    });
  };

  // Calculate aggregate stats for a group of games
  const calculateGroupStats = (games) => {
    const statCategory = isPrimaryBatter ? 'batting' : 'pitching';
    
    if (isPrimaryBatter) {
      const totalAB = games.reduce((sum, g) => sum + (g[statCategory]?.atBats || 0), 0);
      const totalHits = games.reduce((sum, g) => sum + (g[statCategory]?.hits || 0), 0);
      const totalRuns = games.reduce((sum, g) => sum + (g[statCategory]?.runs || 0), 0);
      const totalHR = games.reduce((sum, g) => sum + (g[statCategory]?.homeRuns || 0), 0);
      const totalRBI = games.reduce((sum, g) => sum + (g[statCategory]?.rbi || 0), 0);
      const totalBB = games.reduce((sum, g) => sum + (g[statCategory]?.baseOnBalls || 0), 0);
      const totalSO = games.reduce((sum, g) => sum + (g[statCategory]?.strikeOuts || 0), 0);
      const totalTB = games.reduce((sum, g) => {
        const hits = g[statCategory]?.hits || 0;
        const doubles = g[statCategory]?.doubles || 0;
        const triples = g[statCategory]?.triples || 0;
        const hr = g[statCategory]?.homeRuns || 0;
        return sum + hits + doubles + (triples * 2) + (hr * 3);
      }, 0);

      const avg = totalAB > 0 ? totalHits / totalAB : 0;
      const obp = (totalAB + totalBB) > 0 ? (totalHits + totalBB) / (totalAB + totalBB) : 0;
      const slg = totalAB > 0 ? totalTB / totalAB : 0;
      const ops = obp + slg;

      return {
        atBats: totalAB,
        hits: totalHits,
        runs: totalRuns,
        homeRuns: totalHR,
        rbi: totalRBI,
        baseOnBalls: totalBB,
        strikeOuts: totalSO,
        avg,
        obp,
        slg,
        ops
      };
    } else {
      const totalIP = games.reduce((sum, g) => {
        const ip = g[statCategory]?.inningsPitched || 0;
        return sum + (typeof ip === 'string' ? parseFloat(ip) : ip);
      }, 0);
      const totalHits = games.reduce((sum, g) => sum + (g[statCategory]?.hits || 0), 0);
      const totalER = games.reduce((sum, g) => sum + (g[statCategory]?.earnedRuns || 0), 0);
      const totalBB = games.reduce((sum, g) => sum + (g[statCategory]?.baseOnBalls || 0), 0);
      const totalSO = games.reduce((sum, g) => sum + (g[statCategory]?.strikeOuts || 0), 0);
      const totalHR = games.reduce((sum, g) => sum + (g[statCategory]?.homeRuns || 0), 0);
      const totalWins = games.reduce((sum, g) => sum + (g[statCategory]?.wins || 0), 0);

      const era = totalIP > 0 ? (totalER * 9) / totalIP : 0;
      const whip = totalIP > 0 ? (totalHits + totalBB) / totalIP : 0;

      return {
        inningsPitched: totalIP,
        hits: totalHits,
        earnedRuns: totalER,
        baseOnBalls: totalBB,
        strikeOuts: totalSO,
        homeRuns: totalHR,
        wins: totalWins,
        era,
        whip
      };
    }
  };

  // Home/Away splits
  const homeAwaySplits = useMemo(() => {
    return calculateSplits(gameLog, (game) => game.gameInfo?.homeAway || 'unknown');
  }, [gameLog]);

  // Day/Night splits (assuming day games start before 6 PM)
  const dayNightSplits = useMemo(() => {
    return calculateSplits(gameLog, (game) => {
      if (!game.gameInfo?.time) return 'unknown';
      const hour = parseInt(game.gameInfo.time.split(':')[0]);
      return hour < 18 ? 'day' : 'night';
    });
  }, [gameLog]);

  // Monthly splits
  const monthlySplits = useMemo(() => {
    return calculateSplits(gameLog, (game) => {
      const date = new Date(game.gameInfo?.date || game.date);
      return date.toLocaleDateString('en-US', { month: 'long' });
    });
  }, [gameLog]);

  // Vs Team splits
  const vsTeamSplits = useMemo(() => {
    return calculateSplits(gameLog, (game) => game.gameInfo?.opponent || 'unknown')
      .sort((a, b) => b.games - a.games);
  }, [gameLog]);

  // Win/Loss splits
  const resultSplits = useMemo(() => {
    return calculateSplits(gameLog, (game) => 
      game.gameInfo?.result === 'W' ? 'Team Wins' : 'Team Losses'
    );
  }, [gameLog]);

  // Situational splits (runners in scoring position, etc.)
  const situationalSplits = useMemo(() => {
    // This would require more detailed game data
    // For now, we'll create placeholder splits based on available data
    const splits = [];
    
    // High pressure situations (close games)
    const closeGames = gameLog.filter(game => {
      const scoreDiff = Math.abs((game.gameInfo?.teamScore || 0) - (game.gameInfo?.opponentScore || 0));
      return scoreDiff <= 2;
    });
    
    const blowoutGames = gameLog.filter(game => {
      const scoreDiff = Math.abs((game.gameInfo?.teamScore || 0) - (game.gameInfo?.opponentScore || 0));
      return scoreDiff > 5;
    });

    if (closeGames.length > 0) {
      splits.push({
        split: 'Close Games (≤2 runs)',
        games: closeGames.length,
        ...calculateGroupStats(closeGames)
      });
    }

    if (blowoutGames.length > 0) {
      splits.push({
        split: 'Blowouts (>5 runs)',
        games: blowoutGames.length,
        ...calculateGroupStats(blowoutGames)
      });
    }

    return splits;
  }, [gameLog]);

  const splitCategories = [
    { 
      label: 'Home/Away', 
      data: homeAwaySplits,
      icon: HomeIcon,
      getIcon: (split) => split === 'home' ? <HomeIcon fontSize="small" /> : <AwayIcon fontSize="small" />
    },
    { 
      label: 'Day/Night', 
      data: dayNightSplits,
      icon: DayIcon,
      getIcon: (split) => split === 'day' ? <DayIcon fontSize="small" /> : <NightIcon fontSize="small" />
    },
    { 
      label: 'By Month', 
      data: monthlySplits,
      icon: MonthIcon,
      getIcon: () => <MonthIcon fontSize="small" />
    },
    { 
      label: 'Vs Teams', 
      data: vsTeamSplits,
      icon: VenueIcon,
      getIcon: () => <VenueIcon fontSize="small" />
    },
    { 
      label: 'Team Result', 
      data: resultSplits,
      icon: VenueIcon,
      getIcon: () => <VenueIcon fontSize="small" />
    },
    { 
      label: 'Situational', 
      data: situationalSplits,
      icon: VenueIcon,
      getIcon: () => <VenueIcon fontSize="small" />
    }
  ];

  // Stats configuration for display
  const battingDisplayStats = [
    { key: 'games', label: 'G', format: (val) => val },
    { key: 'atBats', label: 'AB', format: (val) => val || 0 },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'runs', label: 'R', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'rbi', label: 'RBI', format: (val) => val || 0 },
    { key: 'avg', label: 'AVG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'obp', label: 'OBP', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'slg', label: 'SLG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'ops', label: 'OPS', format: (val) => val?.toFixed(3) || '.000' }
  ];

  const pitchingDisplayStats = [
    { key: 'games', label: 'G', format: (val) => val },
    { key: 'wins', label: 'W', format: (val) => val || 0 },
    { key: 'inningsPitched', label: 'IP', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'earnedRuns', label: 'ER', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'era', label: 'ERA', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '0.00' }
  ];

  const displayStats = isPrimaryBatter ? battingDisplayStats : pitchingDisplayStats;

  if (!gameLog.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          No splits data available
        </Typography>
      </Box>
    );
  }

  const currentSplitData = splitCategories[activeTab]?.data || [];

  return (
    <Box>
      {/* Header */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {player.name} - Performance Splits
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Breakdown of performance across different situations and matchups
          </Typography>
        </CardContent>
      </Card>

      {/* Split Category Tabs */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
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
          {splitCategories.map((category, index) => (
            <Tab
              key={category.label}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <category.icon fontSize="small" />
                  {category.label}
                  <Chip
                    label={category.data.length}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Card>

      {/* Split Data Table */}
      {currentSplitData.length > 0 ? (
        <Card elevation={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                    Split
                  </TableCell>
                  {displayStats.map((stat) => (
                    <TableCell key={stat.key} align="center" sx={{ fontWeight: 700, minWidth: 60 }}>
                      {stat.label}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 700, minWidth: 100 }}>
                    Performance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentSplitData.map((splitData, index) => {
                  const primaryStat = isPrimaryBatter ? splitData.ops : (10 - splitData.era);
                  const maxStat = Math.max(...currentSplitData.map(d => 
                    isPrimaryBatter ? d.ops : (10 - d.era)
                  ));
                  const performancePercent = maxStat > 0 ? (primaryStat / maxStat) * 100 : 0;

                  return (
                    <motion.tr
                      key={splitData.split}
                      component={TableRow}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.02)
                        }
                      }}
                    >
                      {/* Split Name */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {splitCategories[activeTab]?.getIcon(splitData.split.toLowerCase())}
                          <Typography variant="body2" fontWeight={600}>
                            {splitData.split}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Stats */}
                      {displayStats.map((stat) => {
                        const value = splitData[stat.key];
                        const isGoodStat = isPrimaryBatter ? 
                          ['hits', 'runs', 'homeRuns', 'rbi', 'avg', 'obp', 'slg', 'ops'].includes(stat.key) :
                          ['strikeOuts', 'wins'].includes(stat.key);
                        const isBadStat = isPrimaryBatter ?
                          ['strikeOuts'].includes(stat.key) :
                          ['hits', 'earnedRuns', 'era', 'whip'].includes(stat.key);

                        return (
                          <TableCell key={stat.key} align="center">
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                color: value > 0 && isGoodStat ? theme.palette.success.main :
                                       value > 0 && isBadStat ? theme.palette.error.main :
                                       'text.primary'
                              }}
                            >
                              {stat.format(value)}
                            </Typography>
                          </TableCell>
                        );
                      })}

                      {/* Performance Bar */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(performancePercent, 100)}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(theme.palette.grey[300], 0.3),
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: performancePercent >= 80 ? theme.palette.success.main :
                                               performancePercent >= 60 ? theme.palette.warning.main :
                                               theme.palette.error.main,
                                borderRadius: 3
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {performancePercent.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No {splitCategories[activeTab]?.label.toLowerCase()} data available
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {currentSplitData.length > 0 && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Best Split
                </Typography>
                {(() => {
                  const bestSplit = currentSplitData.reduce((best, split) => {
                    const bestStat = isPrimaryBatter ? best.ops : (10 - best.era);
                    const splitStat = isPrimaryBatter ? split.ops : (10 - split.era);
                    return splitStat > bestStat ? split : best;
                  });

                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {splitCategories[activeTab]?.getIcon(bestSplit.split.toLowerCase())}
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {bestSplit.split}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isPrimaryBatter ? 
                            `${bestSplit.ops?.toFixed(3)} OPS` : 
                            `${bestSplit.era?.toFixed(2)} ERA`
                          } in {bestSplit.games} games
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Most Games
                </Typography>
                {(() => {
                  const mostGames = currentSplitData.reduce((most, split) => 
                    split.games > most.games ? split : most
                  );

                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {splitCategories[activeTab]?.getIcon(mostGames.split.toLowerCase())}
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {mostGames.split}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {mostGames.games} games ({((mostGames.games / gameLog.length) * 100).toFixed(1)}%)
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PlayerSplits;
