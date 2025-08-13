import React, { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Sports,
  Timeline,
  Compare,
  Assessment,
  People,
  Search,
  TrendingUp,
  InfoOutlined,
  Groups,
  EmojiEvents,
  Stadium,
  LocationOn
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// API and utils
import { teamsApi, playersApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { getCVRDisplay, formatSalary } from '../utils/cvrCalculations';

// Team logo utility
const getTeamLogoUrl = (teamCode) => {
  if (!teamCode) return null;
  const code = teamCode.toUpperCase();
  const codeMap = {
    AZ: 'ARI',
    CWS: 'CHW',
    KC: 'KCR',
    SD: 'SDP',
    SF: 'SFG',
    TB: 'TBR',
    WSH: 'WSN',
  };
  const logoCode = codeMap[code] || code;
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${logoCode}.png`;
};

// CVR Display Helper
const getCVRDisplayTeam = (cvr) => {
  const cvrValue = cvr || 0;
  
  if (cvrValue >= 1.8) {
    return {
      value: cvrValue.toFixed(2),
      description: 'Elite Value',
      color: '#ff6b35',
      emoji: '🔥',
      grade: 'A+'
    };
  } else if (cvrValue >= 1.5) {
    return {
      value: cvrValue.toFixed(2),
      description: 'Excellent Value',
      color: '#ff8c42',
      emoji: '⭐',
      grade: 'A'
    };
  } else if (cvrValue >= 1.2) {
    return {
      value: cvrValue.toFixed(2),
      description: 'Good Value',
      color: '#ffd23f',
      emoji: '👍',
      grade: 'B+'
    };
  } else if (cvrValue >= 0.8) {
    return {
      value: cvrValue.toFixed(2),
      description: 'Fair Value',
      color: '#06ffa5',
      emoji: '✅',
      grade: 'B'
    };
  } else if (cvrValue >= 0.5) {
    return {
      value: cvrValue.toFixed(2),
      description: 'Below Average',
      color: '#4fb3d9',
      emoji: '📉',
      grade: 'C'
    };
  } else {
    return {
      value: cvrValue.toFixed(2),
      description: 'Poor Value',
      color: '#c0392b',
      emoji: '❌',
      grade: 'D'
    };
  }
};

// WAR Display Helper
const getWARDisplayTeam = (war) => {
  const warValue = war || 0;
  
  if (warValue >= 30.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Championship Level',
      color: '#ff6b35',
      emoji: '🏆',
      grade: 'A+'
    };
  } else if (warValue >= 20.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Playoff Contender',
      color: '#ff8c42',
      emoji: '⭐',
      grade: 'A'
    };
  } else if (warValue >= 10.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Above Average',
      color: '#ffd23f',
      emoji: '👍',
      grade: 'B+'
    };
  } else if (warValue >= 5.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Average',
      color: '#06ffa5',
      emoji: '✅',
      grade: 'B'
    };
  } else if (warValue >= 0.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Below Average',
      color: '#4fb3d9',
      emoji: '📉',
      grade: 'C'
    };
  } else {
    return {
      value: warValue.toFixed(1),
      description: 'Poor Performance',
      color: '#c0392b',
      emoji: '❌',
      grade: 'D'
    };
  }
};

const TeamDetail = () => {
  const { teamId, year } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [roster, setRoster] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Load team data
  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading team data for:', { teamId, year });

      // Get team data
      const teamResponse = await teamsApi.getTeam(teamId, { year: year || '2025' });
      console.log('Team response:', teamResponse);
      
      setTeam(teamResponse);
      setTeamStats(teamResponse.seasonStats || teamResponse.stats || teamResponse);
      
      // Get team roster
      const rosterResponse = await playersApi.getPlayers({ 
        team: teamId, 
        year: year || '2025', 
        limit: 40 
      });
      console.log('Roster response:', rosterResponse);
      setRoster(rosterResponse.players || []);
      
      // Get team schedule/game log
      try {
        const scheduleUrl = `/api/teams/${teamId}/schedule?year=${year || '2025'}&limit=15`;
        const scheduleResponse = await fetch(scheduleUrl);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          console.log('Schedule response:', scheduleData);
          setGameLog(scheduleData.games || []);
        } else {
          console.log('No schedule data available');
          setGameLog([]);
        }
      } catch (scheduleErr) {
        console.log('Schedule fetch failed:', scheduleErr);
        setGameLog([]);
      }
      
    } catch (err) {
      console.error('Error loading team data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId, year]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  if (loading) {
    return <TeamDetailSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error loading team data: {error}
        </Typography>
        <Button 
          startIcon={<ArrowBack />}
          onClick={() => navigate('/teams')}
          sx={{ mt: 2 }}
        >
          Back to Teams
        </Button>
      </Box>
    );
  }

  const teamName = team?.name || teamId;
  const teamColor = themeUtils.getTeamColor(teamId);
  const logoUrl = getTeamLogoUrl(teamId);
  
  // Get team metrics
  const cvr = team?.analytics?.overall?.cvr || team?.cvr || teamStats?.cvr || 0;
  const war = team?.analytics?.overall?.war?.total || team?.war?.total || teamStats?.war?.total || 0;
  const cvrDisplay = getCVRDisplayTeam(cvr);
  const warDisplay = getWARDisplayTeam(war);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/teams')}
            sx={{ mb: 2 }}
          >
            Back to Teams
          </Button>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                src={logoUrl}
                alt={teamId}
                sx={{
                  width: 100,
                  height: 100,
                  backgroundColor: teamColor,
                  fontSize: '2rem',
                  fontWeight: 800
                }}
                imgProps={{
                  style: { objectFit: 'contain', background: 'white' }
                }}
              >
                {teamId}
              </Avatar>
            </Grid>
            
            <Grid item xs>
              <Typography variant="h3" fontWeight={800} gutterBottom>
                {teamName}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {year || '2025'} Season
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<EmojiEvents />}
                  label={`CVR: ${cvrDisplay.value} ${cvrDisplay.emoji}`}
                  sx={{
                    backgroundColor: alpha(cvrDisplay.color, 0.1),
                    color: cvrDisplay.color,
                    fontWeight: 700
                  }}
                />
                <Chip
                  icon={<TrendingUp />}
                  label={`WAR: ${warDisplay.value} ${warDisplay.emoji}`}
                  sx={{
                    backgroundColor: alpha(warDisplay.color, 0.1),
                    color: warDisplay.color,
                    fontWeight: 700
                  }}
                />
                <Chip
                  icon={<Groups />}
                  label={`${roster.length} Players`}
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Tabs */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 600
              }
            }}
          >
            <Tab
              icon={<Assessment />}
              label="Team Stats"
              iconPosition="start"
            />
            <Tab
              icon={<Timeline />}
              label="Recent Games"
              iconPosition="start"
            />
            <Tab
              icon={<People />}
              label="Roster"
              iconPosition="start"
            />
            <Tab
              icon={<Stadium />}
              label="Overview"
              iconPosition="start"
            />
          </Tabs>
        </Card>

        {/* Tab Content */}
        {activeTab === 0 && (
          <TeamStatsTab team={team} teamStats={teamStats} />
        )}
        
        {activeTab === 1 && (
          <GameLogTab gameLog={gameLog} teamId={teamId} />
        )}
        
        {activeTab === 2 && (
          <RosterTab roster={roster} teamId={teamId} />
        )}
        
        {activeTab === 3 && (
          <OverviewTab team={team} teamStats={teamStats} />
        )}
      </Box>
    </motion.div>
  );
};

// Team Stats Tab
const TeamStatsTab = ({ team, teamStats }) => {
  const theme = useTheme();
  
  // Extract stats from multiple possible locations
  const record = team?.record || { wins: 0, losses: 0 };
  const standings = team?.standings || {};
  const analytics = team?.analytics || {};
  const batting = teamStats?.batting || {};
  const pitching = teamStats?.pitching || {};
  const fielding = teamStats?.fielding || {};
  
  const statCategories = [
    {
      title: 'Team Performance',
      stats: [
        { label: 'Wins', value: record.wins || 0 },
        { label: 'Losses', value: record.losses || 0 },
        { label: 'Win %', value: standings.winPercentage ? (standings.winPercentage * 100).toFixed(1) + '%' : ((record.wins || 0) / ((record.wins || 0) + (record.losses || 0)) * 100).toFixed(1) + '%' },
        { label: 'Games Played', value: (record.wins || 0) + (record.losses || 0) }
      ]
    },
    {
      title: 'Advanced Metrics',
      stats: [
        { label: 'CVR', value: (team?.analytics?.overall?.cvr || team?.cvr || 0).toFixed(2) },
        { label: 'WAR', value: (team?.analytics?.overall?.war?.total || team?.war?.total || 0).toFixed(1) },
        { label: 'Run Differential', value: `${standings.runDifferential >= 0 ? '+' : ''}${standings.runDifferential || 0}` },
        { label: 'Runs Scored', value: standings.runsScored || batting.runs || 0 }
      ]
    },
    {
      title: 'Offensive Stats',
      stats: [
        { label: 'Batting Avg', value: (batting.average || 0).toFixed(3) },
        { label: 'On-Base %', value: (batting.obp || 0).toFixed(3) },
        { label: 'Slugging %', value: (batting.slg || 0).toFixed(3) },
        { label: 'OPS', value: ((batting.obp || 0) + (batting.slg || 0)).toFixed(3) }
      ]
    },
    {
      title: 'Pitching Stats',
      stats: [
        { label: 'Team ERA', value: (pitching.era || 0).toFixed(2) },
        { label: 'WHIP', value: (pitching.whip || 0).toFixed(2) },
        { label: 'Strikeouts', value: pitching.strikeouts || 0 },
        { label: 'Saves', value: pitching.saves || 0 }
      ]
    }
  ];

  return (
    <Grid container spacing={3}>
      {statCategories.map((category, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {category.title}
              </Typography>
              
              <Grid container spacing={2}>
                {category.stats.map((stat, statIndex) => (
                  <Grid item xs={6} key={statIndex}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={800} color="primary">
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
    </Grid>
  );
};

// Roster Tab
const RosterTab = ({ roster, teamId }) => {
  const navigate = useNavigate();
  
  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Team Roster ({roster.length} players)
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="center">Position</TableCell>
                <TableCell align="center">Games</TableCell>
                <TableCell align="center">CVR</TableCell>
                <TableCell align="center">WAR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.map((player, index) => (
                <TableRow
                  key={index}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    const playerName = player.name.replace(/\s+/g, '_');
                    navigate(`/players/${teamId}/${playerName}/2025`);
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          backgroundColor: themeUtils.getTeamColor(teamId),
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {player.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
                        {player.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={player.position || 'UNK'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {player.gameCount || 0}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={(player.cvr || 0) >= 1.0 ? 'success.main' : 'text.secondary'}
                    >
                      {(player.cvr || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={(player.war || 0) >= 1.0 ? 'success.main' : 'text.secondary'}
                    >
                      {(player.war || 0).toFixed(1)}
                    </Typography>
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

// Overview Tab
const OverviewTab = ({ team, teamStats }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Season Summary
            </Typography>
            <Typography variant="body1" color="text.secondary">
              The {team?.name || 'team'} is currently in the {new Date().getFullYear()} MLB season.
              Team analytics and performance metrics are tracked through our comprehensive
              statistical system including CVR (Cycle Value Rating) and advanced sabermetrics.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Quick Stats
            </Typography>
            <List dense>
              <ListItem>
                <Typography variant="body2">
                  <strong>League:</strong> MLB
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body2">
                  <strong>Season:</strong> {new Date().getFullYear()}
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body2">
                  <strong>Data Source:</strong> MLB Stats API
                </Typography>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Game Log Tab
const GameLogTab = ({ gameLog, teamId }) => {
  const navigate = useNavigate();
  
  if (!gameLog || gameLog.length === 0) {
    return (
      <Card elevation={0}>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No recent games available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Game data will appear here once the season begins
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Recent Games ({gameLog.length})
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="center">Opponent</TableCell>
                <TableCell align="center">H/A</TableCell>
                <TableCell align="center">Result</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell align="center">Record</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gameLog.map((game, index) => {
                const isWin = game.result === 'W';
                const score = game.score || { team: 0, opponent: 0 };
                
                return (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(game.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Avatar
                          src={getTeamLogoUrl(game.opponent)}
                          alt={game.opponent}
                          sx={{ width: 24, height: 24 }}
                          imgProps={{ style: { objectFit: 'contain', background: 'white' } }}
                        >
                          {game.opponent}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {game.opponent}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={game.homeAway === 'home' ? 'H' : 'A'}
                        size="small"
                        color={game.homeAway === 'home' ? 'primary' : 'default'}
                        variant={game.homeAway === 'home' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={game.result || 'TBD'}
                        size="small"
                        color={isWin ? 'success' : 'error'}
                        sx={{ 
                          fontWeight: 700,
                          minWidth: 32
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={isWin ? 'success.main' : 'error.main'}
                      >
                        {score.team}-{score.opponent}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {game.teamRecord || '--'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Loading skeleton
const TeamDetailSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={150} height={40} sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Skeleton variant="circular" width={100} height={100} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={300} height={60} />
          <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>
      </Box>
      
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </Box>
  );
};

export default TeamDetail;
