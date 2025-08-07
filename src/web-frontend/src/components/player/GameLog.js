import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  useTheme,
  alpha,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  Home,
  FlightTakeoff,
  CheckCircle,
  Cancel,
  FilterList
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Utils
import { themeUtils } from '../../theme/theme';

const GameLog = ({ gameLog, player, showAdvanced, onAdvancedToggle }) => {
  const theme = useTheme();
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [filterHomeAway, setFilterHomeAway] = useState('all');

  // Determine if player is primarily a batter or pitcher
  const isPrimaryBatter = (player.batting?.atBats || 0) > (player.pitching?.battersFaced || 0) / 4;

  // Filter games based on selected filters
  const filteredGames = useMemo(() => {
    let filtered = [...gameLog];

    if (filterMonth !== 'all') {
      filtered = filtered.filter(game => {
        const gameDate = new Date(game.gameInfo?.date || game.date);
        return gameDate.getMonth() + 1 === parseInt(filterMonth);
      });
    }

    if (filterResult !== 'all') {
      filtered = filtered.filter(game => 
        game.gameInfo?.result === filterResult.toUpperCase()
      );
    }

    if (filterHomeAway !== 'all') {
      filtered = filtered.filter(game => 
        game.gameInfo?.homeAway === filterHomeAway
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.gameInfo?.date || b.date) - new Date(a.gameInfo?.date || a.date)
    );
  }, [gameLog, filterMonth, filterResult, filterHomeAway]);

  // Calculate running averages and trends
  const gamesWithTrends = useMemo(() => {
    if (!filteredGames.length) return [];

    return filteredGames.map((game, index) => {
      // Calculate running averages up to this game
      const gamesUpToNow = filteredGames.slice(index);
      
      let runningAvg = 0;
      let runningOPS = 0;
      let runningERA = 0;
      
      if (isPrimaryBatter) {
        const totalAB = gamesUpToNow.reduce((sum, g) => sum + (g.batting?.atBats || 0), 0);
        const totalHits = gamesUpToNow.reduce((sum, g) => sum + (g.batting?.hits || 0), 0);
        const totalOBP = gamesUpToNow.reduce((sum, g) => sum + (g.batting?.obp || 0), 0) / gamesUpToNow.length;
        const totalSLG = gamesUpToNow.reduce((sum, g) => sum + (g.batting?.slg || 0), 0) / gamesUpToNow.length;
        
        runningAvg = totalAB > 0 ? totalHits / totalAB : 0;
        runningOPS = totalOBP + totalSLG;
      } else {
        const totalER = gamesUpToNow.reduce((sum, g) => sum + (g.pitching?.earnedRuns || 0), 0);
        const totalIP = gamesUpToNow.reduce((sum, g) => {
          const ip = g.pitching?.inningsPitched || 0;
          return sum + (typeof ip === 'string' ? parseFloat(ip) : ip);
        }, 0);
        
        runningERA = totalIP > 0 ? (totalER * 9) / totalIP : 0;
      }

      return {
        ...game,
        runningAvg,
        runningOPS,
        runningERA,
        trend: index < filteredGames.length - 1 ? 
          (isPrimaryBatter ? 
            (runningAvg > (game.batting?.avg || 0) ? 'up' : 'down') :
            (runningERA < (game.pitching?.era || 0) ? 'up' : 'down')
          ) : 'neutral'
      };
    });
  }, [filteredGames, isPrimaryBatter]);

  // Batting stats configuration
  const battingStats = [
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
    { key: 'ops', label: 'OPS', format: (val) => val?.toFixed(3) || '.000' }
  ];

  const battingAdvancedStats = [
    { key: 'iso', label: 'ISO', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'babip', label: 'BABIP', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'kRate', label: 'K%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` },
    { key: 'bbRate', label: 'BB%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` }
  ];

  // Pitching stats configuration
  const pitchingStats = [
    { key: 'inningsPitched', label: 'IP', format: (val) => val || '0.0' },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'runs', label: 'R', format: (val) => val || 0 },
    { key: 'earnedRuns', label: 'ER', format: (val) => val || 0 },
    { key: 'baseOnBalls', label: 'BB', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'era', label: 'ERA', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '0.00' }
  ];

  const pitchingAdvancedStats = [
    { key: 'fip', label: 'FIP', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'strikeoutsPer9Inn', label: 'K/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'walksPer9Inn', label: 'BB/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'homeRunsPer9', label: 'HR/9', format: (val) => val?.toFixed(1) || '0.0' }
  ];

  const currentStats = isPrimaryBatter ? battingStats : pitchingStats;
  const currentAdvancedStats = isPrimaryBatter ? battingAdvancedStats : pitchingAdvancedStats;
  const statsToShow = showAdvanced ? [...currentStats, ...currentAdvancedStats] : currentStats;

  // Get unique months for filter
  const availableMonths = useMemo(() => {
    const months = [...new Set(gameLog.map(game => {
      const date = new Date(game.gameInfo?.date || game.date);
      return date.getMonth() + 1;
    }))].sort((a, b) => a - b);
    
    return months.map(month => ({
      value: month,
      label: new Date(2025, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    }));
  }, [gameLog]);

  if (!gameLog.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          No game log data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Controls */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>
              {player.name} - 2025 Game Log
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

          {/* Filters */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Month</InputLabel>
                <Select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  label="Month"
                >
                  <MenuItem value="all">All Months</MenuItem>
                  {availableMonths.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Result</InputLabel>
                <Select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  label="Result"
                >
                  <MenuItem value="all">All Games</MenuItem>
                  <MenuItem value="w">Wins</MenuItem>
                  <MenuItem value="l">Losses</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Home/Away</InputLabel>
                <Select
                  value={filterHomeAway}
                  onChange={(e) => setFilterHomeAway(e.target.value)}
                  label="Home/Away"
                >
                  <MenuItem value="all">All Games</MenuItem>
                  <MenuItem value="home">Home</MenuItem>
                  <MenuItem value="away">Away</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredGames.length} of {gameLog.length} games
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Game Log Table */}
      <Card elevation={0}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 80 }}>Opp</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 60 }}>@</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 60 }}>Result</TableCell>
                {statsToShow.map((stat) => (
                  <TableCell key={stat.key} align="center" sx={{ fontWeight: 700, minWidth: 60 }}>
                    {stat.label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                  Trend
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gamesWithTrends.map((game, index) => (
                <motion.tr
                  key={`${game.gameInfo?.gameId || index}-${index}`}
                  component={TableRow}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.02)
                    }
                  }}
                >
                  {/* Date */}
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(game.gameInfo?.date || game.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Typography>
                  </TableCell>

                  {/* Opponent */}
                  <TableCell align="center">
                    <Chip
                      label={game.gameInfo?.opponent || 'N/A'}
                      size="small"
                      sx={{
                        backgroundColor: themeUtils.getTeamColor(game.gameInfo?.opponent || ''),
                        color: 'white',
                        fontWeight: 600,
                        minWidth: 45
                      }}
                    />
                  </TableCell>

                  {/* Home/Away */}
                  <TableCell align="center">
                    <Tooltip title={game.gameInfo?.homeAway === 'home' ? 'Home' : 'Away'}>
                      <Box>
                        {game.gameInfo?.homeAway === 'home' ? (
                          <Home fontSize="small" color="primary" />
                        ) : (
                          <FlightTakeoff fontSize="small" color="action" />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {/* Result */}
                  <TableCell align="center">
                    <Tooltip title={`Team ${game.gameInfo?.result === 'W' ? 'Won' : 'Lost'}`}>
                      <Box>
                        {game.gameInfo?.result === 'W' ? (
                          <CheckCircle fontSize="small" color="success" />
                        ) : (
                          <Cancel fontSize="small" color="error" />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {/* Stats */}
                  {statsToShow.map((stat) => {
                    const statCategory = isPrimaryBatter ? 'batting' : 'pitching';
                    const value = game[statCategory]?.[stat.key];
                    const isGoodStat = isPrimaryBatter ? 
                      ['hits', 'runs', 'homeRuns', 'rbi', 'avg', 'obp', 'slg', 'ops'].includes(stat.key) :
                      ['strikeOuts', 'wins'].includes(stat.key);
                    const isBadStat = isPrimaryBatter ?
                      ['strikeOuts'].includes(stat.key) :
                      ['hits', 'runs', 'earnedRuns', 'baseOnBalls', 'homeRuns', 'era', 'whip'].includes(stat.key);

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

                  {/* Trend */}
                  <TableCell align="center">
                    {game.trend === 'up' && (
                      <TrendingUp color="success" fontSize="small" />
                    )}
                    {game.trend === 'down' && (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    {game.trend === 'neutral' && (
                      <Remove color="action" fontSize="small" />
                    )}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Summary Stats */}
      <Card elevation={0} sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Filtered Period Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {filteredGames.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Games
                </Typography>
              </Box>
            </Grid>
            
            {isPrimaryBatter ? (
              <>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => sum + (g.batting?.hits || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Hits
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => sum + (g.batting?.homeRuns || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Home Runs
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => sum + (g.batting?.rbi || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      RBI
                    </Typography>
                  </Box>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => sum + (g.pitching?.strikeOuts || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Strikeouts
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => sum + (g.pitching?.wins || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Wins
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {filteredGames.reduce((sum, g) => {
                        const ip = g.pitching?.inningsPitched || 0;
                        return sum + (typeof ip === 'string' ? parseFloat(ip) : ip);
                      }, 0).toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Innings Pitched
                    </Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GameLog;
