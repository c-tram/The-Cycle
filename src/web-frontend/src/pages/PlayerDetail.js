import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Skeleton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  ArrowBack,
  Sports,
  Timeline,
  Compare,
  Star,
  TrendingUp,
  TrendingDown,
  Assessment,
  EmojiEvents,
  Person
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// API and utils
import { playersApi, statsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';

const PlayerDetail = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { team, playerName, year } = useParams();
  
  const [player, setPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [gameStats, setGameStats] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (team && playerName && year) {
      loadPlayerData();
    }
  }, [team, playerName, year]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct player identifier from URL params
      const playerId = `${team}/${playerName.replace(/_/g, ' ')}/${year}`;

      const [
        playerResponse,
        statsResponse,
        gamesResponse,
        compareResponse
      ] = await Promise.all([
        playersApi.getPlayer(playerId),
        playersApi.getPlayerStats(playerId),
        playersApi.getPlayerGames(playerId, { limit: 10 }),
        playersApi.getPlayerComparisons(playerId, { limit: 5 })
      ]);

      setPlayer(playerResponse.player);
      setPlayerStats(statsResponse);
      setGameStats(gamesResponse.games || []);
      setComparisons(compareResponse.comparisons || []);
    } catch (err) {
      console.error('Error loading player data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PlayerDetailSkeleton />;
  }

  if (error || !player) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          {error || 'Player not found'}
        </Typography>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/players')}
          sx={{ mt: 2 }}
        >
          Back to Players
        </Button>
      </Box>
    );
  }

  const tabs = [
    { value: 'overview', label: 'Overview', icon: <Person /> },
    { value: 'stats', label: 'Statistics', icon: <Assessment /> },
    { value: 'games', label: 'Game Log', icon: <Timeline /> },
    { value: 'compare', label: 'Compare', icon: <Compare /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => navigate('/players')}
            sx={{ mb: 2 }}
          >
            Back to Players
          </Button>
          
          <Card elevation={0} sx={{ 
            background: `linear-gradient(135deg, ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.05)}, ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.02)})`,
            border: `1px solid ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.2)}`
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                    mr: 3,
                    fontSize: '1.5rem',
                    fontWeight: 700
                  }}
                >
                  {player.team || team}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h3" fontWeight={800} gutterBottom>
                    {player.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={`#${player.jerseyNumber || '---'}`}
                      sx={{
                        backgroundColor: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                        color: '#ffffff',
                        fontWeight: 700
                      }}
                    />
                    <Chip
                      label={player.position || 'Unknown Position'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={player.team}
                      sx={{
                        backgroundColor: alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.1),
                        color: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary">
                    {player.birthDate && `Born: ${new Date(player.birthDate).toLocaleDateString()}`}
                    {player.height && ` • Height: ${player.height}`}
                    {player.weight && ` • Weight: ${player.weight}`}
                    {player.bats && ` • Bats: ${player.bats}`}
                    {player.throws && ` • Throws: ${player.throws}`}
                  </Typography>
                </Box>
                
                {/* Quick Stats */}
                <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h4" fontWeight={800} color="primary">
                        {playerStats?.summary?.games || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Games
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h4" fontWeight={800} color="primary">
                        {playerStats?.batting?.avg?.toFixed(3) || '---'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        AVG
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Navigation Tabs */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                px: 3,
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 600
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
        </Card>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <PlayerOverview player={player} stats={playerStats} />
        )}
        
        {activeTab === 'stats' && (
          <PlayerStats stats={playerStats} />
        )}
        
        {activeTab === 'games' && (
          <PlayerGameLog games={gameStats} />
        )}
        
        {activeTab === 'compare' && (
          <PlayerComparisons player={player} comparisons={comparisons} />
        )}
      </Box>
    </motion.div>
  );
};

// Player overview component
const PlayerOverview = ({ player, stats }) => {
  const theme = useTheme();

  const keyStats = [
    { 
      category: 'Batting',
      stats: [
        { label: 'Batting Average', value: stats?.batting?.avg?.toFixed(3) || '---', color: 'primary' },
        { label: 'On-Base Percentage', value: stats?.batting?.obp?.toFixed(3) || '---', color: 'success' },
        { label: 'Slugging Percentage', value: stats?.batting?.slg?.toFixed(3) || '---', color: 'warning' },
        { label: 'OPS', value: stats?.batting?.ops?.toFixed(3) || '---', color: 'error' },
        { label: 'Home Runs', value: stats?.batting?.homeRuns || 0, color: 'primary' },
        { label: 'RBIs', value: stats?.batting?.rbi || 0, color: 'success' }
      ]
    },
    {
      category: 'Pitching',
      stats: [
        { label: 'ERA', value: stats?.pitching?.era?.toFixed(2) || '---', color: 'primary' },
        { label: 'WHIP', value: stats?.pitching?.whip?.toFixed(2) || '---', color: 'success' },
        { label: 'Wins', value: stats?.pitching?.wins || 0, color: 'warning' },
        { label: 'Losses', value: stats?.pitching?.losses || 0, color: 'error' },
        { label: 'Strikeouts', value: stats?.pitching?.strikeouts || 0, color: 'primary' },
        { label: 'Innings Pitched', value: stats?.pitching?.inningsPitched?.toFixed(1) || '---', color: 'success' }
      ]
    }
  ];

  return (
    <Grid container spacing={3}>
      {keyStats.map((category) => (
        <Grid item xs={12} lg={6} key={category.category}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Sports sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>
                  {category.category} Statistics
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {category.stats.map((stat, index) => (
                  <Grid item xs={6} key={index}>
                    <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette[stat.color].main, 0.05) }}>
                      <Typography variant="h4" fontWeight={800} color={stat.color}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Performance Metrics */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Performance Metrics
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Consistency</Typography>
                    <Typography variant="body2" fontWeight={600}>85%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={85} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Clutch Performance</Typography>
                    <Typography variant="body2" fontWeight={600}>72%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={72} 
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Season Progress</Typography>
                    <Typography variant="body2" fontWeight={600}>68%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={68} 
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Player stats component
const PlayerStats = ({ stats }) => {
  const battingStats = [
    { label: 'At Bats', value: stats?.batting?.atBats || 0 },
    { label: 'Hits', value: stats?.batting?.hits || 0 },
    { label: 'Runs', value: stats?.batting?.runs || 0 },
    { label: 'Doubles', value: stats?.batting?.doubles || 0 },
    { label: 'Triples', value: stats?.batting?.triples || 0 },
    { label: 'Home Runs', value: stats?.batting?.homeRuns || 0 },
    { label: 'RBIs', value: stats?.batting?.rbi || 0 },
    { label: 'Walks', value: stats?.batting?.walks || 0 },
    { label: 'Strikeouts', value: stats?.batting?.strikeouts || 0 },
    { label: 'Stolen Bases', value: stats?.batting?.stolenBases || 0 }
  ];

  const pitchingStats = [
    { label: 'Wins', value: stats?.pitching?.wins || 0 },
    { label: 'Losses', value: stats?.pitching?.losses || 0 },
    { label: 'Games', value: stats?.pitching?.games || 0 },
    { label: 'Games Started', value: stats?.pitching?.gamesStarted || 0 },
    { label: 'Complete Games', value: stats?.pitching?.completeGames || 0 },
    { label: 'Shutouts', value: stats?.pitching?.shutouts || 0 },
    { label: 'Saves', value: stats?.pitching?.saves || 0 },
    { label: 'Innings Pitched', value: stats?.pitching?.inningsPitched?.toFixed(1) || '---' },
    { label: 'Hits Allowed', value: stats?.pitching?.hits || 0 },
    { label: 'Earned Runs', value: stats?.pitching?.earnedRuns || 0 }
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={6}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Batting Statistics
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {battingStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{stat.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Pitching Statistics
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {pitchingStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{stat.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Player game log component
const PlayerGameLog = ({ games }) => {
  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Recent Game Log
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell align="center">AB</TableCell>
                <TableCell align="center">H</TableCell>
                <TableCell align="center">R</TableCell>
                <TableCell align="center">RBI</TableCell>
                <TableCell align="center">AVG</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((game, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {game.date ? new Date(game.date).toLocaleDateString() : '---'}
                  </TableCell>
                  <TableCell>{game.opponent || '---'}</TableCell>
                  <TableCell align="center">{game.atBats || 0}</TableCell>
                  <TableCell align="center">{game.hits || 0}</TableCell>
                  <TableCell align="center">{game.runs || 0}</TableCell>
                  <TableCell align="center">{game.rbi || 0}</TableCell>
                  <TableCell align="center">
                    {game.avg ? game.avg.toFixed(3) : '---'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Player comparisons component
const PlayerComparisons = ({ player, comparisons }) => {
  const theme = useTheme();

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Similar Players
        </Typography>

        <List>
          {comparisons.map((comparison, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Avatar
                    sx={{
                      backgroundColor: themeUtils.getTeamColor(comparison.player.team),
                      mr: 2,
                      fontWeight: 700
                    }}
                  >
                    {comparison.player.team}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {comparison.player.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {comparison.player.team} • {comparison.player.position}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="primary" fontWeight={600}>
                      {comparison.similarity}% similar
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {comparison.reason}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
              {index < comparisons.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// Loading skeleton
const PlayerDetailSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={100} height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PlayerDetail;
