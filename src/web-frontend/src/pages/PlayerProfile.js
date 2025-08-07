import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person,
  Timeline,
  BarChart,
  Sports,
  TrendingUp,
  CompareArrows,
  CalendarToday,
  Home,
  FlightTakeoff,
  Whatshot,
  AcUnit,
  WbSunny,
  Settings
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// API and utils
import { playersApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';

// Import player components
import GameLog from '../components/player/GameLog';
import PlayerSplits from '../components/player/PlayerSplits';
import AdvancedStats from '../components/player/AdvancedStats';
import CareerStats from '../components/player/CareerStats';

const PlayerProfile = () => {
  const { team, playerName, year = '2025' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [player, setPlayer] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View controls
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [team, playerName, year]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load player season stats
      const playerResponse = await playersApi.getPlayer(team, playerName, year);
      
      // Normalize data structure for consistency with players list
      const normalizedPlayer = {
        ...playerResponse,
        stats: playerResponse.seasonStats || playerResponse.stats,
        summary: playerResponse.summary || {
          primaryRole: playerResponse.position || 'Unknown',
          keyStats: playerResponse.analytics?.strengths || [],
          performance: 'Average'
        }
      };
      
      setPlayer(normalizedPlayer);

      // Load game log
      try {
        const gameLogResponse = await playersApi.getPlayerGames(team, playerName, year);
        setGameLog(gameLogResponse.games || []);
      } catch (err) {
        console.log('Game log not available:', err.message);
        setGameLog([]);
      }

    } catch (err) {
      console.error('Error loading player data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { value: 'overview', label: 'Overview', icon: <Person /> },
    { value: 'stats', label: 'Career Stats', icon: <BarChart /> },
    { value: 'gamelog', label: 'Game Log', icon: <Timeline /> },
    { value: 'splits', label: 'Splits', icon: <CompareArrows /> },
    { value: 'advanced', label: 'Advanced', icon: <TrendingUp /> }
  ];

  if (loading) {
    return <PlayerProfileSkeleton />;
  }

  if (error || !player) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Player not found or error loading data
        </Typography>
        <Button onClick={() => navigate('/players')} sx={{ mt: 2 }}>
          Back to Players
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* Player Header */}
      <PlayerHeader player={player} year={year} />

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ px: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 60,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem'
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ p: 3 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PlayerOverview 
                player={player} 
                showAdvanced={showAdvanced}
                onAdvancedToggle={setShowAdvanced}
              />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CareerStats 
                player={player}
                careerStats={player}
                showAdvanced={showAdvanced}
                onAdvancedToggle={setShowAdvanced}
              />
            </motion.div>
          )}

          {activeTab === 'gamelog' && (
            <motion.div
              key="gamelog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GameLog 
                gameLog={gameLog}
                player={player}
                showAdvanced={showAdvanced}
                onAdvancedToggle={setShowAdvanced}
              />
            </motion.div>
          )}

          {activeTab === 'splits' && (
            <motion.div
              key="splits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PlayerSplits 
                player={player}
                gameLog={gameLog}
                showAdvanced={showAdvanced}
              />
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div
              key="advanced"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdvancedStats 
                player={player}
                gameLog={gameLog}
                seasonStats={player}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

// Player Header Component
const PlayerHeader = ({ player, year }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${themeUtils.getTeamColor(player.team)} 0%, ${alpha(themeUtils.getTeamColor(player.team), 0.8)} 100%)`,
        color: '#ffffff',
        p: 4
      }}
    >
      <Grid container spacing={3} alignItems="center">
        {/* Player Avatar & Info */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: alpha('#ffffff', 0.2),
                fontSize: '1.5rem',
                fontWeight: 700,
                border: '3px solid #ffffff'
              }}
            >
              {player.team}
            </Avatar>
            <Box>
              <Typography variant="h3" fontWeight={800} gutterBottom>
                {player.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Chip
                  label={player.team}
                  sx={{
                    backgroundColor: alpha('#ffffff', 0.2),
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                />
                <Typography variant="h6">
                  #{player.jerseyNumber || '---'} • {player.position || 'Multiple Positions'}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ opacity: 0.9 }}>
                {year} Season Statistics
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: alpha('#ffffff', 0.1),
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
              Season Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Games
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {player.gameCount || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {player.batting?.atBats > 0 ? 'AVG' : 'ERA'}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {player.batting?.atBats > 0 
                    ? (player.batting.avg?.toFixed(3) || '.000')
                    : (player.pitching?.era?.toFixed(2) || '0.00')
                  }
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Player Overview Component (like StatMuse main player page)
const PlayerOverview = ({ player, showAdvanced, onAdvancedToggle }) => {
  const theme = useTheme();

  // Determine if player is primarily a batter or pitcher
  const isPrimaryBatter = (player.batting?.atBats || 0) > (player.pitching?.battersFaced || 0) / 4;
  const isPrimaryPitcher = (player.pitching?.inningsPitched || 0) > (player.batting?.atBats || 0) / 4;

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {player.name} Overview
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

      <Grid container spacing={3}>
        {/* Primary Stats Section */}
        {isPrimaryBatter && (
          <Grid item xs={12} lg={8}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Batting Statistics
                </Typography>
                <BattingStatsTable stats={player.batting} showAdvanced={showAdvanced} />
              </CardContent>
            </Card>
          </Grid>
        )}

        {isPrimaryPitcher && (
          <Grid item xs={12} lg={8}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Pitching Statistics
                </Typography>
                <PitchingStatsTable stats={player.pitching} showAdvanced={showAdvanced} />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Secondary Stats & Info */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* Quick Info Card */}
            <Grid item xs={12}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Player Info
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Position</Typography>
                      <Typography fontWeight={600}>{player.position || 'Multiple'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Team</Typography>
                      <Chip 
                        label={player.team} 
                        size="small"
                        sx={{ 
                          backgroundColor: themeUtils.getTeamColor(player.team),
                          color: '#ffffff'
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Games Played</Typography>
                      <Typography fontWeight={600}>{player.gameCount || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Status</Typography>
                      <Chip 
                        label={player.status || 'Active'} 
                        size="small" 
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Secondary Stats */}
            {isPrimaryBatter && player.pitching?.inningsPitched > 0 && (
              <Grid item xs={12}>
                <Card elevation={0}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Pitching
                    </Typography>
                    <PitchingStatsTable stats={player.pitching} showAdvanced={showAdvanced} compact />
                  </CardContent>
                </Card>
              </Grid>
            )}

            {isPrimaryPitcher && player.batting?.atBats > 0 && (
              <Grid item xs={12}>
                <Card elevation={0}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Batting
                    </Typography>
                    <BattingStatsTable stats={player.batting} showAdvanced={showAdvanced} compact />
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Fielding Stats */}
            {player.fielding && (
              <Grid item xs={12}>
                <Card elevation={0}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Fielding
                    </Typography>
                    <FieldingStatsTable stats={player.fielding} showAdvanced={showAdvanced} />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

// Batting Stats Table Component
const BattingStatsTable = ({ stats, showAdvanced, compact = false }) => {
  const basicStats = [
    { key: 'gamesPlayed', label: 'G', format: (val) => val || 0 },
    { key: 'atBats', label: 'AB', format: (val) => val || 0 },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'runs', label: 'R', format: (val) => val || 0 },
    { key: 'doubles', label: '2B', format: (val) => val || 0 },
    { key: 'triples', label: '3B', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'rbi', label: 'RBI', format: (val) => val || 0 },
    { key: 'baseOnBalls', label: 'BB', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'stolenBases', label: 'SB', format: (val) => val || 0 },
    { key: 'avg', label: 'AVG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'obp', label: 'OBP', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'slg', label: 'SLG', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'ops', label: 'OPS', format: (val) => val?.toFixed(3) || '.000' }
  ];

  const advancedStats = [
    { key: 'iso', label: 'ISO', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'babip', label: 'BABIP', format: (val) => val?.toFixed(3) || '.000' },
    { key: 'kRate', label: 'K%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` },
    { key: 'bbRate', label: 'BB%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` },
    { key: 'stolenBasePercentage', label: 'SB%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` },
    { key: 'atBatsPerHomeRun', label: 'AB/HR', format: (val) => val?.toFixed(1) || '---' }
  ];

  const statsToShow = showAdvanced ? [...basicStats, ...advancedStats] : basicStats;
  const displayStats = compact ? statsToShow.slice(0, 8) : statsToShow;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {displayStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 700 }}>
                {stat.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {displayStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 600 }}>
                {stat.format(stats?.[stat.key])}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Pitching Stats Table Component
const PitchingStatsTable = ({ stats, showAdvanced, compact = false }) => {
  const basicStats = [
    { key: 'gamesPlayed', label: 'G', format: (val) => val || 0 },
    { key: 'gamesStarted', label: 'GS', format: (val) => val || 0 },
    { key: 'wins', label: 'W', format: (val) => val || 0 },
    { key: 'losses', label: 'L', format: (val) => val || 0 },
    { key: 'saves', label: 'SV', format: (val) => val || 0 },
    { key: 'inningsPitched', label: 'IP', format: (val) => val || '0.0' },
    { key: 'hits', label: 'H', format: (val) => val || 0 },
    { key: 'runs', label: 'R', format: (val) => val || 0 },
    { key: 'earnedRuns', label: 'ER', format: (val) => val || 0 },
    { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
    { key: 'baseOnBalls', label: 'BB', format: (val) => val || 0 },
    { key: 'strikeOuts', label: 'SO', format: (val) => val || 0 },
    { key: 'era', label: 'ERA', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '0.00' }
  ];

  const advancedStats = [
    { key: 'fip', label: 'FIP', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'strikeoutsPer9Inn', label: 'K/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'walksPer9Inn', label: 'BB/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'homeRunsPer9', label: 'HR/9', format: (val) => val?.toFixed(1) || '0.0' },
    { key: 'strikeoutWalkRatio', label: 'K/BB', format: (val) => val?.toFixed(2) || '0.00' },
    { key: 'strikePercentage', label: 'Strike%', format: (val) => `${(val * 100)?.toFixed(1) || '0.0'}%` }
  ];

  const statsToShow = showAdvanced ? [...basicStats, ...advancedStats] : basicStats;
  const displayStats = compact ? statsToShow.slice(0, 8) : statsToShow;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {displayStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 700 }}>
                {stat.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {displayStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 600 }}>
                {stat.format(stats?.[stat.key])}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Fielding Stats Table Component
const FieldingStatsTable = ({ stats, showAdvanced }) => {
  const fieldingStats = [
    { key: 'assists', label: 'A', format: (val) => val || 0 },
    { key: 'putOuts', label: 'PO', format: (val) => val || 0 },
    { key: 'errors', label: 'E', format: (val) => val || 0 },
    { key: 'fieldingPercentage', label: 'FLD%', format: (val) => val?.toFixed(3) || '.000' }
  ];

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {fieldingStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 700 }}>
                {stat.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {fieldingStats.map((stat) => (
              <TableCell key={stat.key} align="center" sx={{ fontWeight: 600 }}>
                {stat.format(stats?.[stat.key])}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Loading skeleton
const PlayerProfileSkeleton = () => (
  <Box>
    <Box sx={{ p: 4, backgroundColor: 'grey.100' }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item>
          <Box sx={{ width: 80, height: 80, backgroundColor: 'grey.300', borderRadius: '50%' }} />
        </Grid>
        <Grid item>
          <Box sx={{ width: 200, height: 40, backgroundColor: 'grey.300', mb: 1 }} />
          <Box sx={{ width: 150, height: 20, backgroundColor: 'grey.300' }} />
        </Grid>
      </Grid>
    </Box>
    <Box sx={{ p: 3 }}>
      <Box sx={{ width: '100%', height: 400, backgroundColor: 'grey.100' }} />
    </Box>
  </Box>
);

export default PlayerProfile;
