import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Skeleton,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Button,
  Stack,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh,
  SportsBaseball,
  Schedule,
  LiveTv,
  FilterList,
  Today,
  DateRange,
  CalendarMonth,
  Home,
  Flight,
  Sort,
  TrendingUp,
  Close
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { statsApi, gamesApi } from '../services/apiService';
import Boxscore from './Boxscore';

// Utility: Get MLB team logo URL
import { getTeamLogoUrl as getSharedTeamLogoUrl } from '../utils/teamLogos';
const getTeamLogoUrl = (teamCode) => getSharedTeamLogoUrl(teamCode, 500);

// MLB Teams list for filtering
const MLB_TEAMS = [
  { code: 'ARI', name: 'Arizona Diamondbacks' },
  { code: 'ATL', name: 'Atlanta Braves' },
  { code: 'BAL', name: 'Baltimore Orioles' },
  { code: 'BOS', name: 'Boston Red Sox' },
  { code: 'CHC', name: 'Chicago Cubs' },
  { code: 'CWS', name: 'Chicago White Sox' },
  { code: 'CIN', name: 'Cincinnati Reds' },
  { code: 'CLE', name: 'Cleveland Guardians' },
  { code: 'COL', name: 'Colorado Rockies' },
  { code: 'DET', name: 'Detroit Tigers' },
  { code: 'HOU', name: 'Houston Astros' },
  { code: 'KC', name: 'Kansas City Royals' },
  { code: 'LAA', name: 'Los Angeles Angels' },
  { code: 'LAD', name: 'Los Angeles Dodgers' },
  { code: 'MIA', name: 'Miami Marlins' },
  { code: 'MIL', name: 'Milwaukee Brewers' },
  { code: 'MIN', name: 'Minnesota Twins' },
  { code: 'NYM', name: 'New York Mets' },
  { code: 'NYY', name: 'New York Yankees' },
  { code: 'OAK', name: 'Oakland Athletics' },
  { code: 'PHI', name: 'Philadelphia Phillies' },
  { code: 'PIT', name: 'Pittsburgh Pirates' },
  { code: 'SD', name: 'San Diego Padres' },
  { code: 'SF', name: 'San Francisco Giants' },
  { code: 'SEA', name: 'Seattle Mariners' },
  { code: 'STL', name: 'St. Louis Cardinals' },
  { code: 'TB', name: 'Tampa Bay Rays' },
  { code: 'TEX', name: 'Texas Rangers' },
  { code: 'TOR', name: 'Toronto Blue Jays' },
  { code: 'WSH', name: 'Washington Nationals' }
];

// Utility function to format game time in user's local timezone
const formatGameTime = (gameTime) => {
  if (!gameTime) return 'TBD';
  try {
    const date = new Date(gameTime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use user's local timezone
    });
  } catch (error) {
    console.error('Error formatting game time:', error);
    return 'TBD';
  }
};

const LiveScoreboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dateFilter, setDateFilter] = useState('today'); // Default to today's games
  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // New filtering states
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [homeAwayFilter, setHomeAwayFilter] = useState('all');
  const [sortBy, setSortBy] = useState('status'); // Default to status sorting (Live > Final > Scheduled)
  const [scoreFilter, setScoreFilter] = useState('all');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showBoxscore, setShowBoxscore] = useState(false);

  // Date filter options
  const dateFilterOptions = [
    { value: 'today', label: 'Today', icon: <Today /> },
    { value: 'yesterday', label: 'Yesterday', icon: <Schedule /> },
    { value: 'recent', label: 'Recent Games (May 2025)', icon: <SportsBaseball /> },
    { value: 'week', label: 'Last 7 Days', icon: <CalendarMonth /> },
    { value: 'month', label: 'Last 30 Days', icon: <DateRange /> },
    { value: 'custom', label: 'Custom Range', icon: <FilterList /> }
  ];

  // Get date range based on filter selection
  const getDateRange = () => {
    const today = new Date();
    // Fix timezone issue - use local date instead of UTC
    const formatDate = (date) => {
      return date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
    };
    
    switch (dateFilter) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today) };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
      
      case 'recent':
        // Show May 2025 games where we have data
        return { startDate: '2025-05-08', endDate: '2025-05-12' };
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { startDate: formatDate(weekAgo), endDate: formatDate(today) };
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { startDate: formatDate(monthAgo), endDate: formatDate(today) };
      
      case 'custom':
        return { 
          startDate: customStartDate || formatDate(today), 
          endDate: customEndDate || formatDate(today) 
        };
      
      default:
        return { startDate: formatDate(today), endDate: formatDate(today) };
    }
  };

  const fetchLiveGames = async () => {
    try {
      setLoading(true);
      setGames([]); // Clear existing games first
      
      const { startDate, endDate } = getDateRange();
      
      // For today's games, fetch live MLB data
      if (dateFilter === 'today') {
        await fetchTodaysLiveGames();
      } else {
        // For historical data, use our Redis cache
        await fetchHistoricalGames(startDate, endDate);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's live games from our backend proxy (which calls MLB Stats API)
  const fetchTodaysLiveGames = async () => {
    try {
      // Fix timezone issue - use local date instead of UTC
      const today = new Date();
      const localDateString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // Use our backend proxy to avoid CORS issues
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/v2/mlb-live/schedule/${localDateString}?t=${timestamp}`);
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        setGames(data.games);
      } else {
        console.log('📅 No games scheduled for today');
        setGames([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch live MLB games:', error);
      // Fallback to our API with today's date
      const today = new Date().toISOString().split('T')[0];
      console.log('🔄 Falling back to historical API for:', today);
      await fetchHistoricalGames(today, today);
    }
  };

  // Fetch historical games from our Redis cache
  const fetchHistoricalGames = async (startDate, endDate) => {
    try {
      // If it's a single day, use the recent games API
      if (startDate === endDate) {
        const response = await gamesApi.getRecentGames({ 
          date: startDate,
          limit: 30 
        });
        setGames(response.games || []);
      } else {
        // For date ranges, use the efficient range API
        const response = await gamesApi.getGamesRange(startDate, endDate, 50);
        setGames(response.games || []);
      }
    } catch (error) {
      console.error('Failed to fetch historical games:', error);
      setGames([]);
    }
  };

  // Filter and sort games based on user selections
  const getFilteredAndSortedGames = () => {
    let filteredGames = [...games];

    // Filter by team
    if (selectedTeam !== 'all') {
      filteredGames = filteredGames.filter(game => 
        game.homeTeam?.abbreviation === selectedTeam || 
        game.awayTeam?.abbreviation === selectedTeam
      );
    }

    // Filter by home/away
    if (homeAwayFilter !== 'all' && selectedTeam !== 'all') {
      filteredGames = filteredGames.filter(game => {
        if (homeAwayFilter === 'home') {
          return game.homeTeam?.abbreviation === selectedTeam;
        } else {
          return game.awayTeam?.abbreviation === selectedTeam;
        }
      });
    }

    // Filter by score differential
    if (scoreFilter !== 'all') {
      filteredGames = filteredGames.filter(game => {
        if (!game.homeScore && !game.awayScore) return scoreFilter === 'scheduled';
        
        const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
        
        switch (scoreFilter) {
          case 'close': return diff <= 3;
          case 'blowout': return diff >= 7;
          case 'competitive': return diff >= 1 && diff <= 6;
          case 'tied': return diff === 0 && (game.homeScore || game.awayScore);
          case 'scheduled': return !game.homeScore && !game.awayScore;
          default: return true;
        }
      });
    }

    // Sort games
    filteredGames.sort((a, b) => {
      switch (sortBy) {
        case 'time':
          const timeA = new Date(a.scheduledTime || a.gameTime || 0);
          const timeB = new Date(b.scheduledTime || b.gameTime || 0);
          return timeA - timeB; // Earlier games first
        
        case 'score_diff':
          const diffA = Math.abs((a.homeScore || 0) - (a.awayScore || 0));
          const diffB = Math.abs((b.homeScore || 0) - (b.awayScore || 0));
          return diffB - diffA; // Largest diff first
        
        case 'total_runs':
          const totalA = (a.homeScore || 0) + (a.awayScore || 0);
          const totalB = (b.homeScore || 0) + (b.awayScore || 0);
          return totalB - totalA; // Highest total first
        
        case 'status':
          const statusOrder = { 'Live': 0, 'Final': 1, 'Scheduled': 2, 'Postponed': 3, 'Cancelled': 4 };
          return statusOrder[getGameStatus(a)] - statusOrder[getGameStatus(b)];
        
        default:
          // Default sorting: Live > Final > Scheduled (same as status)
          const defaultStatusOrder = { 'Live': 0, 'Final': 1, 'Scheduled': 2, 'Postponed': 3, 'Cancelled': 4 };
          return defaultStatusOrder[getGameStatus(a)] - defaultStatusOrder[getGameStatus(b)];
      }
    });

    return filteredGames;
  };

  // Handle game card click to show boxscore
  const handleGameClick = (game) => {
    setSelectedGame(game);
    setShowBoxscore(true);
  };

  useEffect(() => {
    fetchLiveGames();
    
    // Auto-refresh with different intervals based on filter
    let interval;
    if (dateFilter === 'today') {
      // More frequent updates for live games (every 15 seconds)
      interval = setInterval(fetchLiveGames, 15000);
    } else if (dateFilter === 'yesterday') {
      // Less frequent for yesterday (every minute)
      interval = setInterval(fetchLiveGames, 60000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateFilter, customStartDate, customEndDate]); // Note: filtering doesn't require new API calls

  const getGameStatus = (game) => {
    // Handle live MLB data format first - prioritize structured flags
    if (game.isFinal) return 'Final';
    if (game.isLive) return 'Live';
    
    // Then check status codes
    if (game.statusCode) {
      switch (game.statusCode) {
        case 'S': case 'P': return 'Scheduled';
        case 'I': case 'IR': return 'Live';
        case 'F': case 'O': return 'Final';
        case 'PO': return 'Postponed';
        case 'C': return 'Cancelled';
        default: return game.status || 'Scheduled';
      }
    }
    
    // Fallback to string matching for historical data
    if (!game.status) return 'Scheduled';
    const status = game.status.toLowerCase();
    if (status.includes('final')) return 'Final';
    if (status.includes('live') || status.includes('progress') || status.includes('inning')) return 'Live';
    if (status.includes('postponed')) return 'Postponed';
    if (status.includes('cancelled')) return 'Cancelled';
    return 'Scheduled';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Live': return theme.palette.success.main;
      case 'Final': return theme.palette.text.secondary;
      case 'Postponed': return theme.palette.warning.main;
      case 'Cancelled': return theme.palette.error.main;
      default: return theme.palette.primary.main;
    }
  };

  const GameCard = ({ game }) => {
    const status = getGameStatus(game);
    const statusColor = getStatusColor(status);
    const isClickable = game.mlbGameData || game.id; // Only clickable if we have detailed data
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          elevation={0}
          onClick={() => isClickable && handleGameClick(game)}
          sx={{
            height: 110,
            border: `1px solid ${alpha(statusColor, 0.2)}`,
            background: status === 'Live' ? 
              `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)}, ${alpha(theme.palette.success.main, 0.02)})` :
              'background.paper',
            position: 'relative',
            cursor: isClickable ? 'pointer' : 'default',
            '&:hover': {
              transform: isClickable ? 'translateY(-1px)' : 'none',
              boxShadow: isClickable ? theme.shadows[2] : 'none',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <CardContent sx={{ p: 1 }}>
            {/* Compact Header with Status and Live indicator */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Chip
                label={status}
                size="small"
                sx={{
                  backgroundColor: alpha(statusColor, 0.1),
                  color: statusColor,
                  fontSize: '0.7rem',
                  height: 20,
                  '& .MuiChip-label': { px: 1 }
                }}
              />
              {status === 'Live' && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LiveTv sx={{ fontSize: 14, color: theme.palette.success.main, mr: 0.5 }} />
                  <Typography variant="caption" color="success.main" fontWeight={600} fontSize="0.7rem">
                    LIVE
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Compact Teams and Score in single row */}
            <Box sx={{ mb: 0.5 }}>
              {/* Away Team Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <Avatar
                    src={getTeamLogoUrl(game.awayTeam?.abbreviation)}
                    sx={{ width: 20, height: 20, mr: 0.75, fontSize: '0.7rem' }}
                  >
                    {game.awayTeam?.abbreviation?.substring(0, 2)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} fontSize="0.8rem" noWrap>
                    {game.awayTeam?.abbreviation || 'TBD'}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} fontSize="1rem" sx={{ minWidth: 24, textAlign: 'right' }}>
                  {game.awayScore ?? '-'}
                </Typography>
              </Box>

              {/* Home Team Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <Avatar
                    src={getTeamLogoUrl(game.homeTeam?.abbreviation)}
                    sx={{ width: 20, height: 20, mr: 0.75, fontSize: '0.7rem' }}
                  >
                    {game.homeTeam?.abbreviation?.substring(0, 2)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} fontSize="0.8rem" noWrap>
                    {game.homeTeam?.abbreviation || 'TBD'}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} fontSize="1rem" sx={{ minWidth: 24, textAlign: 'right' }}>
                  {game.homeScore ?? '-'}
                </Typography>
              </Box>
            </Box>

            {/* Compact Game Details */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontSize="0.7rem" noWrap>
                {dateFilter !== 'today' && game.gameDate ? 
                  new Date(game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                  formatGameTime(game.gameTime || game.scheduledTime)
                }
              </Typography>
              {game.inning && (
                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                  {game.inning}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              MLB Scoreboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dateFilter === 'today' && 'Today\'s Games (Live MLB Data) • Auto-refresh every 15s'}
              {dateFilter === 'yesterday' && 'Yesterday\'s Games • Auto-refresh every 60s'}
              {dateFilter === 'recent' && 'Recent Games (May 8-12, 2025) • Historical Data'}
              {dateFilter === 'week' && 'Last 7 Days'}
              {dateFilter === 'month' && 'Last 30 Days'}
              {dateFilter === 'custom' && `${customStartDate || 'Custom'} to ${customEndDate || 'Custom'}`}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Updated {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Show filters">
              <IconButton 
                size="small" 
                onClick={() => setShowFilters(!showFilters)}
                color={showFilters ? 'primary' : 'default'}
              >
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh games">
              <IconButton 
                size="small" 
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  fetchLiveGames();
                }}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filter Controls */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 1 }}>
              <Stack spacing={2}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={dateFilter}
                    label="Time Period"
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    {dateFilterOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {option.icon}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {dateFilter === 'custom' && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      label="Start Date"
                      type="date"
                      size="small"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 150 }}
                    />
                    <Typography variant="body2" color="text.secondary">to</Typography>
                    <TextField
                      label="End Date"
                      type="date"
                      size="small"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 150 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={fetchLiveGames}
                      disabled={!customStartDate || !customEndDate}
                    >
                      Apply
                    </Button>
                  </Stack>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                {/* Advanced Filters */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Filter & Sort
                </Typography>
                
                <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Team</InputLabel>
                    <Select
                      value={selectedTeam}
                      label="Team"
                      onChange={(e) => setSelectedTeam(e.target.value)}
                    >
                      <MenuItem value="all">All Teams</MenuItem>
                      {MLB_TEAMS.map((team) => (
                        <MenuItem key={team.code} value={team.code}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              src={getTeamLogoUrl(team.code)}
                              sx={{ width: 20, height: 20, fontSize: '0.7rem' }}
                            >
                              {team.code.substring(0, 2)}
                            </Avatar>
                            {team.code}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }} disabled={selectedTeam === 'all'}>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={homeAwayFilter}
                      label="Location"
                      onChange={(e) => setHomeAwayFilter(e.target.value)}
                    >
                      <MenuItem value="all">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SportsBaseball fontSize="small" />
                          All Games
                        </Box>
                      </MenuItem>
                      <MenuItem value="home">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Home fontSize="small" />
                          Home Only
                        </Box>
                      </MenuItem>
                      <MenuItem value="away">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Flight fontSize="small" />
                          Away Only
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Score Filter</InputLabel>
                    <Select
                      value={scoreFilter}
                      label="Score Filter"
                      onChange={(e) => setScoreFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Games</MenuItem>
                      <MenuItem value="close">Close Games (≤3 runs)</MenuItem>
                      <MenuItem value="competitive">Competitive (1-6 runs)</MenuItem>
                      <MenuItem value="blowout">Blowouts (≥7 runs)</MenuItem>
                      <MenuItem value="tied">Tied Games</MenuItem>
                      <MenuItem value="scheduled">Scheduled Only</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort By"
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="time">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule fontSize="small" />
                          Game Time
                        </Box>
                      </MenuItem>
                      <MenuItem value="status">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LiveTv fontSize="small" />
                          Game Status
                        </Box>
                      </MenuItem>
                      <MenuItem value="score_diff">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUp fontSize="small" />
                          Score Margin
                        </Box>
                      </MenuItem>
                      <MenuItem value="total_runs">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SportsBaseball fontSize="small" />
                          Total Runs
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </motion.div>
        )}

        {loading ? (
          <Grid container spacing={1}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={i}>
                <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        ) : games.length > 0 ? (
          (() => {
            const filteredGames = getFilteredAndSortedGames();
            return filteredGames.length > 0 ? (
              <>
                {/* Games Count and Filter Summary */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {filteredGames.length} of {games.length} games
                    {selectedTeam !== 'all' && ` for ${selectedTeam}`}
                    {homeAwayFilter !== 'all' && selectedTeam !== 'all' && ` (${homeAwayFilter} games)`}
                  </Typography>
                  {(selectedTeam !== 'all' || homeAwayFilter !== 'all' || scoreFilter !== 'all') && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedTeam('all');
                        setHomeAwayFilter('all');
                        setScoreFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Box>
                
                <Grid container spacing={1}>
                  {filteredGames.map((game, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={game.id || index}>
                      <GameCard game={game} />
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SportsBaseball sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No games match your filters
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedTeam('all');
                    setHomeAwayFilter('all');
                    setScoreFilter('all');
                  }}
                  sx={{ mt: 1 }}
                >
                  Clear All Filters
                </Button>
              </Box>
            );
          })()
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SportsBaseball sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No games found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dateFilter === 'today' && 'No MLB games scheduled today. Check console for API debug info.'}
              {dateFilter === 'yesterday' && 'No games found for yesterday'}
              {dateFilter === 'recent' && 'No recent games found'}
              {dateFilter === 'week' && 'No games found in the last 7 days'}
              {dateFilter === 'month' && 'No games found in the last 30 days'}
              {dateFilter === 'custom' && 'No games found in selected date range'}
            </Typography>
            {dateFilter === 'today' && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setDateFilter('recent')}
                sx={{ mt: 2 }}
              >
                View Sample Games (May 2025)
              </Button>
            )}
            {dateFilter === 'custom' && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowFilters(true)}
                sx={{ mt: 2 }}
              >
                Adjust Date Range
              </Button>
            )}
          </Box>
        )}
      </CardContent>
      
      {/* Boxscore Component */}
      {selectedGame && (
        <Boxscore 
          game={selectedGame}
          open={showBoxscore}
          onClose={() => setShowBoxscore(false)}
          onNavigateToFull={(gameId, date) => {
            setShowBoxscore(false);
            navigate(`/boxscore/${gameId}/${date}`);
          }}
        />
      )}
    </Card>
  );
};

export default LiveScoreboard;
