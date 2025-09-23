import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  LocationOn,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// API and utils
import { teamsApi, playersApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { getCVRDisplay, formatSalary } from '../utils/cvrCalculations';
import { getTeamLogoUrl as getSharedTeamLogoUrl } from '../utils/teamLogos';

// Team logo utility
const getTeamLogoUrl = (teamCode) => getSharedTeamLogoUrl(teamCode, 500);

// Helper function to safely get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
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
        const scheduleData = await teamsApi.getTeamSchedule(teamId, { 
          year: year || '2025', 
          limit: 200 // Show all games (162 regular season + playoffs/spring training)
        });
        console.log('Schedule response:', scheduleData);
        setGameLog(scheduleData.games || []);
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

  // Calculate actual record from game log for accuracy
  const actualRecord = useMemo(() => {
    if (!gameLog || gameLog.length === 0) {
      return { wins: 0, losses: 0, games: 0 };
    }
    
    const wins = gameLog.filter(game => game.result === 'W').length;
    const losses = gameLog.filter(game => game.result === 'L').length;
    const games = gameLog.length;
    
    return { wins, losses, games };
  }, [gameLog]);

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
              label="Game Log"
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
          <TeamStatsTab team={team} teamStats={teamStats} actualRecord={actualRecord} />
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
const TeamStatsTab = ({ team, teamStats, actualRecord }) => {
  const theme = useTheme();
  
  // Use actual record from game log instead of API record (which may be stale)
  const record = actualRecord.games > 0 ? actualRecord : (team?.record || { wins: 0, losses: 0 });
  const standings = team?.standings || {};
  const analytics = team?.analytics || {};
  const batting = teamStats?.batting || {};
  const pitching = teamStats?.pitching || {};
  const fielding = teamStats?.fielding || {};
  
  // Calculate comprehensive team statistics
  const statCategories = [
    {
      title: 'Team Record & Standing',
      color: theme.palette.primary.main,
      stats: [
        { label: 'Wins', value: record.wins || 0, format: 'number' },
        { label: 'Losses', value: record.losses || 0, format: 'number' },
        { label: 'Win %', value: standings.winPercentage || ((record.wins || 0) / ((record.wins || 0) + (record.losses || 0))) || 0, format: 'percentage' },
        { label: 'Games Played', value: (record.wins || 0) + (record.losses || 0), format: 'number' },
        { label: 'Home Record', value: `${team?.standings?.homeRecord?.wins || 0}-${team?.standings?.homeRecord?.losses || 0}`, format: 'text' },
        { label: 'Away Record', value: `${team?.standings?.awayRecord?.wins || 0}-${team?.standings?.awayRecord?.losses || 0}`, format: 'text' }
      ]
    },
    {
      title: 'Advanced Team Metrics',
      color: theme.palette.success.main,
      stats: [
        { label: 'CVR (Team)', value: team?.analytics?.overall?.cvr || team?.cvr || 0, format: 'decimal' },
        { label: 'WAR (Total)', value: team?.analytics?.overall?.war?.total || team?.war?.total || 0, format: 'decimal' },
        { label: 'WAR (Batting)', value: team?.analytics?.overall?.war?.batting || team?.war?.batting || 0, format: 'decimal' },
        { label: 'WAR (Pitching)', value: team?.analytics?.overall?.war?.pitching || team?.war?.pitching || 0, format: 'decimal' },
        { label: 'Run Differential', value: standings.runDifferential || 0, format: 'signed' },
        { label: 'Pythagorean W%', value: analytics?.overall?.pythagoreanWinPct || standings?.pythagoreanWinPct || 0, format: 'percentage' }
      ]
    },
    {
      title: 'Offensive Statistics',
      color: theme.palette.warning.main,
      stats: [
        { label: 'Runs Scored', value: standings.runsScored || batting.runs || 0, format: 'number' },
        { label: 'Batting Average', value: batting.average || 0, format: 'average' },
        { label: 'On-Base %', value: batting.obp || 0, format: 'average' },
        { label: 'Slugging %', value: batting.slg || 0, format: 'average' },
        { label: 'OPS', value: (batting.obp || 0) + (batting.slg || 0), format: 'average' },
        { label: 'Home Runs', value: batting.homeRuns || 0, format: 'number' },
        { label: 'RBIs', value: batting.rbi || 0, format: 'number' },
        { label: 'Hits', value: batting.hits || 0, format: 'number' },
        { label: 'Doubles', value: batting.doubles || 0, format: 'number' },
        { label: 'Triples', value: batting.triples || 0, format: 'number' },
        { label: 'Walks', value: batting.baseOnBalls || 0, format: 'number' },
        { label: 'Strikeouts', value: batting.strikeOuts || 0, format: 'number' }
      ]
    },
    {
      title: 'Pitching Statistics',
      color: theme.palette.error.main,
      stats: [
        { label: 'Runs Allowed', value: standings.runsAllowed || pitching.runs || 0, format: 'number' },
        { label: 'Team ERA', value: pitching.era || 0, format: 'era' },
        { label: 'WHIP', value: pitching.whip || 0, format: 'decimal' },
        { label: 'FIP', value: pitching.fip || 0, format: 'era' },
        { label: 'xFIP', value: pitching.xFip || 0, format: 'era' },
        { label: 'BABIP', value: pitching.babip || 0, format: 'average' },
        { label: 'K/9', value: pitching.strikeoutsPer9Inn || 0, format: 'decimal' },
        { label: 'BB/9', value: pitching.walksPer9Inn || 0, format: 'decimal' },
        { label: 'HR/9', value: pitching.homeRunsPer9 || 0, format: 'decimal' },
        { label: 'LOB%', value: pitching.strandRate || 0, format: 'percentage' },
        { label: 'Innings Pitched', value: pitching.inningsPitched || 0, format: 'text' },
        { label: 'Strikeouts', value: pitching.strikeOuts || 0, format: 'number' },
        { label: 'Walks', value: pitching.baseOnBalls || 0, format: 'number' },
        { label: 'Saves', value: pitching.saves || 0, format: 'number' }
      ]
    },
    {
      title: 'Fielding Statistics',
      color: theme.palette.info.main,
      stats: [
        { label: 'Fielding %', value: fielding.fieldingPercentage || 0, format: 'average' },
        { label: 'Errors', value: fielding.errors || 0, format: 'number' },
        { label: 'Assists', value: fielding.assists || 0, format: 'number' },
        { label: 'Putouts', value: fielding.putOuts || 0, format: 'number' },
        { label: 'Total Chances', value: fielding.chances || 0, format: 'number' },
        { label: 'Double Plays', value: fielding.doublePlays || 0, format: 'number' }
      ]
    },
    {
      title: 'Advanced Sabermetrics',
      color: theme.palette.secondary.main,
      stats: [
        { label: 'wOBA', value: batting.wOBA || 0, format: 'average' },
        { label: 'ISO', value: batting.iso || 0, format: 'average' },
        { label: 'BABIP (Off)', value: batting.babip || 0, format: 'average' },
        { label: 'K%', value: batting.kRate || 0, format: 'percentage' },
        { label: 'BB%', value: batting.bbRate || 0, format: 'percentage' },
        { label: 'Contact%', value: batting.contactRate || 0, format: 'percentage' },
        { label: 'XBH', value: batting.extraBaseHits || 0, format: 'number' },
        { label: 'XBH%', value: batting.extraBaseHitRate || 0, format: 'percentage' }
      ]
    }
  ];

  // Format value based on type
  const formatValue = (value, format) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return '---';
    }
    
    switch (format) {
      case 'percentage':
        return (value * 100).toFixed(1) + '%';
      case 'average':
        return value.toFixed(3);
      case 'decimal':
        return value.toFixed(1);
      case 'era':
        return value.toFixed(2);
      case 'signed':
        return value >= 0 ? `+${value}` : value.toString();
      case 'number':
        return Math.round(value).toString();
      case 'text':
      default:
        return value.toString();
    }
  };

  return (
    <Grid container spacing={3}>
      {statCategories.map((category, index) => (
        <Grid item xs={12} md={6} lg={4} key={index}>
          <Card 
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${alpha(category.color, 0.2)}`,
              backgroundColor: alpha(category.color, 0.02)
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: category.color
                  }}
                />
                <Typography variant="h6" fontWeight={700} sx={{ color: category.color }}>
                  {category.title}
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                {category.stats.map((stat, statIndex) => (
                  <Grid item xs={6} key={statIndex}>
                    <Box sx={{ textAlign: 'center', p: 1.5 }}>
                      <Typography 
                        variant="h5" 
                        fontWeight={800} 
                        sx={{ 
                          color: category.color,
                          mb: 0.5
                        }}
                      >
                        {formatValue(stat.value, stat.format)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
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

// Professional Roster Tab with Sortable Tables
const RosterTab = ({ roster, teamId }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Roster state management
  const [playerType, setPlayerType] = useState('batting'); // 'batting' or 'pitching'
  const [sortBy, setSortBy] = useState('stats.batting.avg');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedStatGroup, setSelectedStatGroup] = useState('primary');
  const [selectedPosition, setSelectedPosition] = useState('all'); // Position filter

  // Get all unique positions from roster
  const availablePositions = useMemo(() => {
    const positions = new Set();
    roster.forEach(player => {
      if (player.position) {
        positions.add(player.position);
      }
    });
    return Array.from(positions).sort();
  }, [roster]);

  // Separate batters and pitchers with position filtering
  const batters = useMemo(() => {
    return roster.filter(player => {
      const batting = player.stats?.batting;
      const hasStats = batting && (batting.atBats > 0 || batting.plateAppearances > 0);
      const matchesPosition = selectedPosition === 'all' || player.position === selectedPosition;
      return hasStats && matchesPosition;
    });
  }, [roster, selectedPosition]);

  const pitchers = useMemo(() => {
    return roster.filter(player => {
      const pitching = player.stats?.pitching;
      const hasStats = pitching && (parseFloat(pitching.inningsPitched) > 0 || pitching.gamesPlayed > 0);
      const matchesPosition = selectedPosition === 'all' || player.position === selectedPosition;
      return hasStats && matchesPosition;
    });
  }, [roster, selectedPosition]);

  // Auto-switch to available player type
  useEffect(() => {
    if (playerType === 'batting' && batters.length === 0 && pitchers.length > 0) {
      setPlayerType('pitching');
      setSortBy('stats.pitching.era');
    } else if (playerType === 'pitching' && pitchers.length === 0 && batters.length > 0) {
      setPlayerType('batting');
      setSortBy('stats.batting.avg');
    }
  }, [batters.length, pitchers.length, playerType]);

  // Get current players based on selected type
  const currentPlayers = playerType === 'batting' ? batters : pitchers;

  // Sort players
  const sortedPlayers = useMemo(() => {
    if (!sortBy) return currentPlayers;

    return [...currentPlayers].sort((a, b) => {
      let aValue = getNestedValue(a, sortBy);
      let bValue = getNestedValue(b, sortBy);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Convert to numbers for numeric comparison
      const aNum = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
      const bNum = typeof bValue === 'string' ? parseFloat(bValue) : bValue;

      let comparison = 0;
      if (typeof aNum === 'number' && typeof bNum === 'number' && !isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [currentPlayers, sortBy, sortOrder]);

  // Handle sorting
  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Render sortable header
  const renderSortableHeader = (stat) => {
    const isActive = sortBy === stat.key;
    const isDesc = sortOrder === 'desc';
    
    return (
      <TableCell 
        key={stat.key} 
        align="center" 
        sx={{ 
          minWidth: 80,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05)
          },
          ...(isActive && {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main
          })
        }}
        onClick={() => handleSort(stat.key)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="caption" fontWeight={600}>
            {stat.label}
          </Typography>
          {isActive && (
            isDesc ? <ArrowDownward sx={{ fontSize: '0.875rem' }} /> : <ArrowUpward sx={{ fontSize: '0.875rem' }} />
          )}
        </Box>
      </TableCell>
    );
  };

  // Define stat configurations
  const battingStats = [
    { key: 'stats.batting.avg', label: 'AVG' },
    { key: 'stats.batting.onBasePercentage', label: 'OBP' },
    { key: 'stats.batting.sluggingPercentage', label: 'SLG' },
    { key: 'stats.batting.ops', label: 'OPS' },
    { key: 'stats.batting.homeRuns', label: 'HR' },
    { key: 'stats.batting.rbi', label: 'RBI' },
    { key: 'stats.batting.runs', label: 'R' },
    { key: 'stats.batting.hits', label: 'H' },
    { key: 'stats.batting.doubles', label: '2B' },
    { key: 'stats.batting.triples', label: '3B' },
    { key: 'stats.batting.baseOnBalls', label: 'BB' },
    { key: 'stats.batting.strikeOuts', label: 'K' },
    { key: 'war', label: 'WAR' },
    { key: 'cvr', label: 'CVR' }
  ];

  const pitchingStats = [
    { key: 'stats.pitching.era', label: 'ERA' },
    { key: 'stats.pitching.whip', label: 'WHIP' },
    { key: 'stats.pitching.inningsPitched', label: 'IP' },
    { key: 'stats.pitching.strikeOuts', label: 'K' },
    { key: 'stats.pitching.baseOnBalls', label: 'BB' },
    { key: 'stats.pitching.hits', label: 'H' },
    { key: 'stats.pitching.homeRuns', label: 'HR' },
    { key: 'stats.pitching.earnedRuns', label: 'ER' },
    { key: 'stats.pitching.wins', label: 'W' },
    { key: 'stats.pitching.losses', label: 'L' },
    { key: 'stats.pitching.saves', label: 'SV' },
    { key: 'war', label: 'WAR' },
    { key: 'cvr', label: 'CVR' }
  ];

  // Stat groups for filtering
  const statGroups = {
    batting: {
      primary: battingStats.slice(0, 6), // AVG, OBP, SLG, OPS, HR, RBI
      power: battingStats.slice(4, 10), // HR, RBI, R, H, 2B, 3B
      discipline: [battingStats[10], battingStats[11], battingStats[0], battingStats[1]], // BB, K, AVG, OBP
      advanced: [battingStats[12], battingStats[13], battingStats[3]], // WAR, CVR, OPS
    },
    pitching: {
      primary: pitchingStats.slice(0, 6), // ERA, WHIP, IP, K, BB, H
      efficiency: [pitchingStats[0], pitchingStats[1], pitchingStats[3], pitchingStats[4]], // ERA, WHIP, K, BB
      counting: pitchingStats.slice(5, 11), // H, HR, ER, W, L, SV
      advanced: [pitchingStats[11], pitchingStats[12], pitchingStats[2]], // WAR, CVR, IP
    }
  };

  const currentStats = playerType === 'batting' ? battingStats : pitchingStats;
  const currentGroups = statGroups[playerType];
  
  // Determine which stats to show based on selected group
  let displayStats;
  if (selectedStatGroup === 'all') {
    displayStats = currentStats;
  } else {
    displayStats = currentGroups[selectedStatGroup] || currentStats.slice(0, 6);
  }

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 0 }}>
        {/* Header with Player Type Toggle and Position Filter */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Team Roster ({currentPlayers.length} players{selectedPosition !== 'all' ? ` - ${selectedPosition}` : ''})
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Position Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Position</InputLabel>
                <Select
                  value={selectedPosition}
                  label="Position"
                  onChange={(e) => setSelectedPosition(e.target.value)}
                >
                  <MenuItem value="all">All Positions</MenuItem>
                  {availablePositions.map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Player Type Toggle */}
              {batters.length > 0 && (
                <Chip
                  label={`Batters (${batters.length})`}
                  variant={playerType === 'batting' ? 'filled' : 'outlined'}
                  color={playerType === 'batting' ? 'primary' : 'default'}
                  onClick={() => {
                    setPlayerType('batting');
                    setSortBy('stats.batting.avg');
                    setSelectedStatGroup('primary');
                  }}
                  sx={{ cursor: 'pointer' }}
                />
              )}
              {pitchers.length > 0 && (
                <Chip
                  label={`Pitchers (${pitchers.length})`}
                  variant={playerType === 'pitching' ? 'filled' : 'outlined'}
                  color={playerType === 'pitching' ? 'primary' : 'default'}
                  onClick={() => {
                    setPlayerType('pitching');
                    setSortBy('stats.pitching.era');
                    setSelectedStatGroup('primary');
                  }}
                  sx={{ cursor: 'pointer' }}
                />
              )}
            </Box>
          </Box>

          {/* Stat Group Filter */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(currentGroups).map(([groupKey, groupStats]) => (
              <Chip
                key={groupKey}
                label={groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}
                variant={selectedStatGroup === groupKey ? 'filled' : 'outlined'}
                color={selectedStatGroup === groupKey ? 'primary' : 'default'}
                onClick={() => setSelectedStatGroup(groupKey)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
            <Chip
              label="All Stats"
              variant={selectedStatGroup === 'all' ? 'filled' : 'outlined'}
              color={selectedStatGroup === 'all' ? 'primary' : 'default'}
              onClick={() => setSelectedStatGroup('all')}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>

        {/* Professional Sortable Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {/* Player Name Column */}
                <TableCell 
                  sx={{ 
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    },
                    ...(sortBy === 'name' && {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main
                    })
                  }}
                  onClick={() => handleSort('name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      Player
                    </Typography>
                    {sortBy === 'name' && (
                      sortOrder === 'desc' ? <ArrowDownward sx={{ fontSize: '0.875rem' }} /> : <ArrowUpward sx={{ fontSize: '0.875rem' }} />
                    )}
                  </Box>
                </TableCell>

                {/* Position Column */}
                <TableCell align="center">
                  <Typography variant="caption" fontWeight={600}>
                    POS
                  </Typography>
                </TableCell>

                {/* Games Column */}
                <TableCell 
                  align="center"
                  sx={{ 
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    },
                    ...(sortBy === 'gameCount' && {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main
                    })
                  }}
                  onClick={() => handleSort('gameCount')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      G
                    </Typography>
                    {sortBy === 'gameCount' && (
                      sortOrder === 'desc' ? <ArrowDownward sx={{ fontSize: '0.875rem' }} /> : <ArrowUpward sx={{ fontSize: '0.875rem' }} />
                    )}
                  </Box>
                </TableCell>

                {/* Dynamic Stat Columns */}
                {displayStats.map((stat) => renderSortableHeader(stat))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow
                  key={index}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    const playerName = player.name.replace(/\s+/g, '_');
                    navigate(`/players/${teamId}/${playerName}/2025`);
                  }}
                >
                  {/* Player Name */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={getTeamLogoUrl(teamId)}
                        sx={{
                          width: 32,
                          height: 32,
                          backgroundColor: themeUtils.getTeamColor(teamId),
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {!getTeamLogoUrl(teamId) && player.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
                        {player.name}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Position */}
                  <TableCell align="center">
                    <Chip
                      label={player.position || 'UNK'}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>

                  {/* Games */}
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={500}>
                      {player.gameCount || 0}
                    </Typography>
                  </TableCell>

                  {/* Dynamic Stat Columns */}
                  {displayStats.map((stat) => {
                    const value = getNestedValue(player, stat.key);
                    const displayValue = value != null ? 
                      (typeof value === 'number' ? 
                        (stat.key.includes('avg') || stat.key.includes('era') || stat.key.includes('whip') ? 
                          value.toFixed(3) : 
                          stat.key === 'cvr' ? value.toFixed(2) :
                          stat.key === 'war' ? value.toFixed(1) :
                          Math.round(value)) : 
                        value) : 
                      '--';

                    const isGoodStat = (stat.key === 'war' && value >= 1.0) || 
                                     (stat.key === 'cvr' && value >= 1.0) ||
                                     (stat.key.includes('avg') && value >= 0.280) ||
                                     (stat.key.includes('ops') && value >= 0.800);

                    return (
                      <TableCell key={stat.key} align="center">
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          color={isGoodStat ? 'success.main' : 'text.secondary'}
                        >
                          {displayValue}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Empty State */}
        {sortedPlayers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No {playerType === 'batting' ? 'batters' : 'pitchers'} found{selectedPosition !== 'all' ? ` at position ${selectedPosition}` : ''} with sufficient playing time.
            </Typography>
            {selectedPosition !== 'all' && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedPosition('all')}
                sx={{ mt: 1 }}
              >
                Show All Positions
              </Button>
            )}
          </Box>
        )}
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
            No games available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Game data will appear here once games are played
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Game Log ({gameLog.length})
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
                        {(() => {
                          // Prefer officialDate (YYYY-MM-DD) from API, otherwise use startLocal or the stored date
                          const official = game.gameInfo?.officialDate || game.officialDate || null;
                          const startLocal = game.gameInfo?.startLocal || game.startLocal || null;

                          if (official) {
                            return new Date(official + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }

                          if (startLocal) {
                            // startLocal might be 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD, HH:MM' depending on ingestion
                            const datePart = startLocal.split(/[ ,]/)[0];
                            return new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }

                          return new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        })()}
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
