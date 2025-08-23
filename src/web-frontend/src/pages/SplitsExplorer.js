// ============================================================================
// PROFESSIONAL MLB SPLITS ANALYTICS DASHBOARD
// ============================================================================
// The most comprehensive situational analysis platform in baseball
// "Testing every possible baseball statistic that is imaginable"
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Autocomplete,
  Chip,
  Avatar,
  Divider,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  CircularProgress,
  useTheme,
  useMediaQuery,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  InputAdornment,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  TrendingDown,
  SportsBaseball,
  Stadium,
  Home,
  FlightTakeoff,
  Person,
  Group,
  Compare,
  Search,
  Refresh,
  Download,
  Share,
  Psychology,
  Speed,
  ShowChart,
  BarChart,
  Settings,
  AutoAwesome,
  Numbers,
  ExpandMore
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

import { splitsApi } from '../services/apiService';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// ============================================================================
// STATISTICAL AGGREGATION HELPERS
// ============================================================================

/**
 * Properly combine batting statistics from home and away games
 * @param {Object} homeStats - Home batting statistics
 * @param {Object} awayStats - Away batting statistics
 * @returns {Object} Combined and calculated statistics
 */
const combineStats = (homeStats = {}, awayStats = {}) => {
  const combined = {
    atBats: (homeStats.atBats || 0) + (awayStats.atBats || 0),
    hits: (homeStats.hits || 0) + (awayStats.hits || 0),
    runs: (homeStats.runs || 0) + (awayStats.runs || 0),
    rbi: (homeStats.rbi || 0) + (awayStats.rbi || 0),
    doubles: (homeStats.doubles || 0) + (awayStats.doubles || 0),
    triples: (homeStats.triples || 0) + (awayStats.triples || 0),
    homeRuns: (homeStats.homeRuns || 0) + (awayStats.homeRuns || 0),
    walks: (homeStats.walks || 0) + (awayStats.walks || 0),
    strikeouts: (homeStats.strikeouts || 0) + (awayStats.strikeouts || 0),
    plateAppearances: (homeStats.plateAppearances || 0) + (awayStats.plateAppearances || 0),
  };

  // Calculate combined averages properly
  if (combined.atBats > 0) {
    combined.avg = (combined.hits / combined.atBats).toFixed(3);
  } else {
    combined.avg = '.000';
  }

  if (combined.plateAppearances > 0) {
    const totalBases = combined.hits + combined.doubles + (2 * combined.triples) + (3 * combined.homeRuns);
    combined.slg = combined.atBats > 0 ? (totalBases / combined.atBats).toFixed(3) : '.000';
    combined.obp = ((combined.hits + combined.walks) / combined.plateAppearances).toFixed(3);
    combined.ops = (parseFloat(combined.obp) + parseFloat(combined.slg)).toFixed(3);
  } else {
    combined.slg = '.000';
    combined.obp = '.000';
    combined.ops = '.000';
  }

  return combined;
};

// ============================================================================
// PROFESSIONAL ANIMATION VARIANTS
// ============================================================================

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  out: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  }),
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
    transition: { duration: 0.2 }
  }
};

const statCardVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  hover: { 
    scale: 1.05,
    transition: { duration: 0.2 }
  }
};

// ============================================================================
// PROFESSIONAL STYLING COMPONENTS
// ============================================================================

const GlassCard = ({ children, ...props }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.background.paper, 0.8)} 0%, 
          ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 3,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
        }
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const StatChip = ({ label, value, color = 'primary', icon, trend, size = 'medium' }) => {
  const theme = useTheme();
  const getTrendColor = () => {
    if (trend > 0) return theme.palette.success.main;
    if (trend < 0) return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  return (
    <motion.div variants={statCardVariants} initial="initial" animate="animate" whileHover="hover">
      <Chip
        icon={icon}
        label={
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant={size === 'small' ? 'caption' : 'body2'} fontWeight="medium">
              {label}
            </Typography>
            <Typography variant={size === 'small' ? 'body2' : 'h6'} fontWeight="bold" color={color}>
              {value}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" ml={0.5}>
                {trend > 0 ? <TrendingUp sx={{ fontSize: 14, color: getTrendColor() }} /> : 
                 trend < 0 ? <TrendingDown sx={{ fontSize: 14, color: getTrendColor() }} /> : null}
                <Typography variant="caption" color={getTrendColor()}>
                  {Math.abs(trend)}
                </Typography>
              </Box>
            )}
          </Box>
        }
        sx={{
          background: `linear-gradient(45deg, ${alpha(theme.palette[color].main, 0.1)}, ${alpha(theme.palette[color].main, 0.05)})`,
          border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
          borderRadius: 2,
          px: 2,
          py: 1,
          height: 'auto',
          '& .MuiChip-label': {
            px: 1,
          }
        }}
      />
    </motion.div>
  );
};

const HeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <motion.div variants={pageVariants} initial="initial" animate="in">
      <Box
        sx={{
          background: `linear-gradient(135deg, 
            ${theme.palette.primary.main} 0%, 
            ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          py: { xs: 6, md: 10 },
          mb: 4,
          borderRadius: '0 0 24px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            opacity: 0.1
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.2),
                      width: 72,
                      height: 72,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <AnalyticsIcon sx={{ fontSize: 40, color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography 
                      variant={isMobile ? 'h3' : 'h2'} 
                      fontWeight="800"
                      sx={{
                        background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1
                      }}
                    >
                      MLB Splits Analytics
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
                      Professional Situational Performance Intelligence
                    </Typography>
                  </Box>
                </Box>

                <Typography 
                  variant="h6" 
                  sx={{ 
                    opacity: 0.95, 
                    fontWeight: 400, 
                    lineHeight: 1.6,
                    mb: 3,
                    maxWidth: 600
                  }}
                >
                  Discover comprehensive situational splits with count-based analytics, 
                  handedness matchups, venue performance, and advanced pitch-level insights.
                </Typography>

                <Box display="flex" gap={2} flexWrap="wrap">
                  <StatChip label="Split Types" value="7+" color="success" icon={<ShowChart />} />
                  <StatChip label="Count Analytics" value="12" color="info" icon={<BarChart />} />
                  <StatChip label="Pitch Data" value="Real-time" color="warning" icon={<Speed />} />
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 300,
                    background: alpha(theme.palette.common.white, 0.1),
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`
                  }}
                >
                  <Box textAlign="center">
                    <SportsBaseball sx={{ fontSize: 80, opacity: 0.7, mb: 2 }} />
                    <Typography variant="h4" fontWeight="bold">
                      2025 Season
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8 }}>
                      Live Analytics
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </motion.div>
  );
};

// ============================================================================
// MAIN SPLITS DASHBOARD COMPONENT
// ============================================================================

const Splits = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [viewMode, setViewMode] = useState('cards'); // cards, table, timeline
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [splitsData, setSplitsData] = useState({});
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState({
    homeAvg: '.---',
    awayAvg: '.---', 
    vsRhp: '.---',
    vsLhp: '.---'
  });
  
  // Table state
  const [tableFilters, setTableFilters] = useState({
    searchTerm: '',
    sortBy: 'name',
    sortOrder: 'asc',
    showHome: true,
    showAway: true,
    minAtBats: 0,
    selectedColumns: new Set(['name', 'avg', 'obp', 'slg', 'ops', 'atBats', 'hits'])
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  // Tab configuration
  const splitTabs = [
    { label: 'Overview', value: 'overview', icon: <AnalyticsIcon /> },
    { label: 'Home/Away', value: 'home-away', icon: <Home /> },
    { label: 'Venues', value: 'venues', icon: <Stadium /> },
    { label: 'vs Teams', value: 'vs-teams', icon: <Group /> },
    { label: 'vs Pitchers', value: 'vs-pitchers', icon: <Person /> },
    { label: 'Handedness', value: 'handedness', icon: <Compare /> },
    { label: 'Count Analytics', value: 'counts', icon: <Psychology /> },
    { label: 'Compound Analytics', value: 'compound', icon: <AutoAwesome /> },
  ];

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchAvailablePlayers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await splitsApi.getAvailablePlayers();
      setAvailablePlayers(data.players || []);
    } catch (err) {
      setError('Failed to load available players');
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load quick stats overview (Home/Away/vs RHP/LHP)
  const loadQuickStats = useCallback(async (playerData) => {
    if (!playerData) return;
    
    try {
      const { team, name, season } = playerData;
      const playerName = name.replace(/\s+/g, '-');

      // Fetch home/away and handedness splits for quick overview
      const [homeAwayData, handednessData] = await Promise.allSettled([
        splitsApi.getHomeAwaySplits(team, playerName, season),
        splitsApi.getHandednessSplits(team, playerName, season)
      ]);

      const stats = { homeAvg: '.---', awayAvg: '.---', vsRhp: '.---', vsLhp: '.---' };

      // Parse Home/Away data
      if (homeAwayData.status === 'fulfilled' && homeAwayData.value?.data) {
        const homeData = homeAwayData.value.data.home?.stats?.batting;
        const awayData = homeAwayData.value.data.away?.stats?.batting;
        
        if (homeData?.avg) stats.homeAvg = homeData.avg.toFixed(3);
        if (awayData?.avg) stats.awayAvg = awayData.avg.toFixed(3);
      }

      // Parse Handedness data  
      if (handednessData.status === 'fulfilled' && handednessData.value?.data) {
        const vsRHP = handednessData.value.data.R?.stats?.batting;
        const vsLHP = handednessData.value.data.L?.stats?.batting;
        
        if (vsRHP?.avg) stats.vsRhp = vsRHP.avg.toFixed(3);
        if (vsLHP?.avg) stats.vsLhp = vsLHP.avg.toFixed(3);
      }

      setQuickStats(stats);
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  }, []);

  const fetchPlayerSplits = useCallback(async (playerData) => {
    if (!playerData) return;
    
    try {
      setLoading(true);
      setError(null);

      const { team, name, season } = playerData;
      const playerName = name.replace(/\s+/g, '-');

      console.log(`🔍 Fetching comprehensive splits for ${name} (${team})...`);

      // Use the comprehensive splits search as primary data source
      const allSplitsData = await splitsApi.searchPlayerSplits(team, playerName, season);
      
      console.log('🔍 Raw splits data structure:', allSplitsData);
      console.log('🔍 Full response keys:', Object.keys(allSplitsData));
      console.log('🔍 Splits keys:', Object.keys(allSplitsData.splits || {}));
      console.log('🔍 Sample split data:', Object.values(allSplitsData.splits || {})[0]);
      
      // If search endpoint returns no splits, fall back to individual endpoints
      if (!allSplitsData.splits || Object.keys(allSplitsData.splits).length === 0) {
        console.log('⚠️ Search endpoint returned no splits. Trying individual endpoints...');
        
        // Fetch individual split types as fallback
        const [
          homeAway,
          venues,
          vsTeams,
          handedness,
          counts
        ] = await Promise.allSettled([
          splitsApi.getHomeAwaySplits(team, playerName, season),
          splitsApi.getVenueSplits(team, playerName, season),
          splitsApi.getVsTeamsSplits(team, playerName, season),
          splitsApi.getHandednessSplits(team, playerName, season),
          splitsApi.getCountSplits(team, playerName, season)
        ]);

        console.log('🔍 Individual endpoint results:');
        console.log('Home/Away:', homeAway.status, homeAway.value || homeAway.reason);
        console.log('Venues:', venues.status, venues.value || venues.reason);
        console.log('Vs Teams:', vsTeams.status, vsTeams.value || vsTeams.reason);
        console.log('Handedness:', handedness.status, handedness.value || handedness.reason);
        console.log('Counts:', counts.status, counts.value || counts.reason);

        setSplitsData({
          homeAway: homeAway.status === 'fulfilled' ? homeAway.value : null,
          venues: venues.status === 'fulfilled' ? venues.value : null,
          vsTeams: vsTeams.status === 'fulfilled' ? vsTeams.value : null,
          handedness: handedness.status === 'fulfilled' ? handedness.value : null,
          counts: counts.status === 'fulfilled' ? counts.value : null,
          allSplits: allSplitsData
        });

        return;
      }
      
      console.log(`📊 Found ${Object.keys(allSplitsData.splits || {}).length} split categories for ${name}`);

      // Parse the comprehensive data into our expected format
      const parsedData = parseComprehensiveSplitsData(allSplitsData);

      setSplitsData(parsedData);
      
      // Load quick stats overview data
      loadQuickStats(playerData);

    } catch (err) {
      setError(`Failed to load splits for ${playerData.name}: ${err.message}`);
      console.error('Error fetching splits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to parse comprehensive splits data into component format
  const parseComprehensiveSplitsData = (allSplitsData) => {
    const splits = allSplitsData.splits || {};
    
    console.log('🔍 Parsing splits data. Total splits:', Object.keys(splits).length);
    
    // Simple parsing - let's see what the actual data looks like first
    const homeAway = { splits: { home: null, away: null } };
    const venues = { venues: {} };
    const vsTeams = { opponents: {} };
    const handedness = { handedness: { left: null, right: null } };
    const counts = { counts: {} };
    
    // Log first few splits to understand structure
    const sampleSplits = Object.entries(splits).slice(0, 5);
    console.log('🔍 Sample splits:', sampleSplits);
    
    // Check if we have direct home/away splits
    if (splits.home) {
      console.log('✅ Found direct home split:', splits.home);
      homeAway.splits.home = splits.home;
    }
    
    if (splits.away) {
      console.log('✅ Found direct away split:', splits.away);
      homeAway.splits.away = splits.away;
    }
    
    // If no direct home/away, try to find them in the keys
    if (!splits.home && !splits.away) {
      console.log('❌ No direct home/away splits found. Looking for patterns...');
      
      // Look for home/away patterns in keys
      Object.entries(splits).forEach(([key, data]) => {
        if (key.includes('home') || key.includes('Home')) {
          console.log('🏠 Found potential home data:', key, data);
          homeAway.splits.home = data;
        } else if (key.includes('away') || key.includes('Away') || key.includes('road') || key.includes('Road')) {
          console.log('✈️ Found potential away data:', key, data);
          homeAway.splits.away = data;
        }
      });
    }
    
    // For now, return simplified structure until we understand the data better
    return {
      homeAway,
      venues,
      vsTeams,
      handedness,
      counts,
      allSplits: allSplitsData
    };
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchAvailablePlayers();
  }, [fetchAvailablePlayers]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerSplits(selectedPlayer);
    }
  }, [selectedPlayer, fetchPlayerSplits]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePlayerSelect = (event, newValue) => {
    setSelectedPlayer(newValue);
    if (newValue) {
      setSelectedTeam(newValue.team);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAvailablePlayers();
    if (selectedPlayer) {
      await fetchPlayerSplits(selectedPlayer);
    }
    setRefreshing(false);
  };

  const handleFilterToggle = (filter) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setActiveFilters(newFilters);
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderPlayerSearch = () => (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Search sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Select Player for Split Analysis
            </Typography>
            <Box flexGrow={1} />
            <Tooltip title="Refresh Player List">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <Refresh sx={{ color: refreshing ? 'action.disabled' : 'primary.main' }} />
                {refreshing && <CircularProgress size={24} sx={{ position: 'absolute' }} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={availablePlayers}
                getOptionLabel={(option) => `${option.name} (${option.team})`}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
                      {option.team}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.team} • {option.season} • {option.keyCount} splits
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Players"
                    variant="outlined"
                    placeholder="Type player name or team..."
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        background: alpha(theme.palette.background.paper, 0.8),
                      }
                    }}
                  />
                )}
                onChange={handlePlayerSelect}
                value={selectedPlayer}
                loading={loading}
                loadingText="Loading players..."
                noOptionsText="No players found with splits data"
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <TextField
                  select
                  label="Season"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  SelectProps={{ native: true }}
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </TextField>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAdvanced}
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Advanced"
                  sx={{ ml: 1 }}
                />
              </Box>
            </Grid>
          </Grid>

          {selectedPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.2 }}
            >
              <Divider sx={{ my: 3 }} />
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  {selectedPlayer.team}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedPlayer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPlayer.team} • {selectedPlayer.season} Season
                  </Typography>
                </Box>
                <Box flexGrow={1} />
                <StatChip 
                  label="Split Records" 
                  value={selectedPlayer.keyCount} 
                  color="info" 
                  icon={<BarChart />}
                />
              </Box>
            </motion.div>
          )}
        </CardContent>
      </GlassCard>
    </motion.div>
  );

  const renderTabContent = () => {
    if (!selectedPlayer || loading) {
      return (
        <Box display="flex" justifyContent="center" py={8}>
          {loading ? <LoadingSpinner /> : (
            <Box textAlign="center">
              <SportsBaseball sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a player to view their splits analysis
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    const currentTab = splitTabs[selectedTab];

    return (
      <motion.div
        key={selectedTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <SplitTabContent 
          tabValue={currentTab.value}
          playerData={selectedPlayer}
          splitsData={splitsData}
          showAdvanced={showAdvanced}
          quickStats={quickStats}
        />
      </motion.div>
    );
  };

  const renderQuickStats = () => {
    if (!selectedPlayer || loading) return null;

    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
        <GlassCard>
          <CardHeader
            title="Quick Stats Overview"
            titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            avatar={<AnalyticsIcon sx={{ color: 'primary.main' }} />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <StatChip 
                  label="Home AVG" 
                  value={quickStats.homeAvg || '.---'} 
                  color="success"
                  icon={<Home />}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatChip 
                  label="Away AVG" 
                  value={quickStats.awayAvg || '.---'} 
                  color="info"
                  icon={<FlightTakeoff />}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatChip 
                  label="vs RHP" 
                  value={quickStats.vsRhp || '.---'} 
                  color="warning"
                  icon={<Person />}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatChip 
                  label="vs LHP" 
                  value={quickStats.vsLhp || '.---'} 
                  color="secondary"
                  icon={<Person />}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </GlassCard>
      </motion.div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <motion.div variants={pageVariants} initial="initial" animate="in" exit="out">
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <HeroSection />

        <Container maxWidth="xl" sx={{ pb: 8 }}>
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
              >
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Search Section */}
          <Box mb={4}>
            {renderPlayerSearch()}
          </Box>

          {/* Quick Stats */}
          {selectedPlayer && (
            <Box mb={4}>
              {renderQuickStats()}
            </Box>
          )}

          {/* Split Tabs */}
          {selectedPlayer && (
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <GlassCard sx={{ mb: 4 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    variant={isMobile ? 'scrollable' : 'fullWidth'}
                    scrollButtons="auto"
                    sx={{
                      '& .MuiTab-root': {
                        minHeight: 64,
                        fontWeight: 600,
                        textTransform: 'none',
                      },
                      '& .Mui-selected': {
                        color: 'primary.main',
                      }
                    }}
                  >
                    {splitTabs.map((tab, index) => (
                      <Tab
                        key={tab.value}
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            {tab.icon}
                            <span>{tab.label}</span>
                          </Box>
                        }
                        value={index}
                      />
                    ))}
                  </Tabs>
                </Box>
              </GlassCard>
            </motion.div>
          )}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {renderTabContent()}
          </AnimatePresence>
        </Container>
      </Box>
    </motion.div>
  );
};

// ============================================================================
// PROFESSIONAL FILTERABLE DATA TABLE COMPONENT
// ============================================================================

const FilterableDataTable = ({ 
  data, 
  title, 
  subtitle,
  icon,
  columns,
  defaultSort = 'name',
  showFilters = true,
  showExport = true 
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState({
    searchTerm: '',
    sortBy: defaultSort,
    sortOrder: 'asc',
    showHome: true,
    showAway: true,
    minAtBats: 0,
    selectedColumns: new Set(columns.filter(col => col.default).map(col => col.id))
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  // Process and filter data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let processed = data.map(item => {
      // Flatten the data structure for table display
      const result = {
        id: item.id || Math.random(),
        name: item.name || item.opponent || item.venue || 'Unknown',
        ...item
      };

      // Extract batting stats from nested structure
      if (item.home?.stats?.batting || item.away?.stats?.batting) {
        const homeStats = item.home?.stats?.batting || {};
        const awayStats = item.away?.stats?.batting || {};
        
        // Combined stats (weighted average where appropriate)
        const totalAtBats = (parseInt(homeStats.atBats) || 0) + (parseInt(awayStats.atBats) || 0);
        const totalHits = (parseInt(homeStats.hits) || 0) + (parseInt(awayStats.hits) || 0);
        const totalPlateAppearances = (parseInt(homeStats.plateAppearances) || 0) + (parseInt(awayStats.plateAppearances) || 0);
        
        result.atBats = totalAtBats;
        result.hits = totalHits;
        result.plateAppearances = totalPlateAppearances;
        result.avg = totalAtBats > 0 ? (totalHits / totalAtBats).toFixed(3) : '.000';
        
        // Add individual home/away stats
        result.homeAvg = homeStats.avg || '.000';
        result.awayAvg = awayStats.avg || '.000';
        result.homeOps = homeStats.ops || '0.000';
        result.awayOps = awayStats.ops || '0.000';
        result.homeAtBats = parseInt(homeStats.atBats) || 0;
        result.awayAtBats = parseInt(awayStats.atBats) || 0;
        
        // Calculate other combined stats
        if (homeStats.obp && awayStats.obp && totalPlateAppearances > 0) {
          const homePA = parseInt(homeStats.plateAppearances) || 0;
          const awayPA = parseInt(awayStats.plateAppearances) || 0;
          const weightedOBP = ((parseFloat(homeStats.obp) * homePA) + (parseFloat(awayStats.obp) * awayPA)) / totalPlateAppearances;
          result.obp = weightedOBP.toFixed(3);
        }
        
        if (homeStats.slg && awayStats.slg && totalAtBats > 0) {
          const homeAB = parseInt(homeStats.atBats) || 0;
          const awayAB = parseInt(awayStats.atBats) || 0;
          const weightedSLG = ((parseFloat(homeStats.slg) * homeAB) + (parseFloat(awayStats.slg) * awayAB)) / totalAtBats;
          result.slg = weightedSLG.toFixed(3);
          result.ops = (parseFloat(result.obp) + parseFloat(result.slg)).toFixed(3);
        }
        
        // Add counting stats
        result.homeRuns = (parseInt(homeStats.homeRuns) || 0) + (parseInt(awayStats.homeRuns) || 0);
        result.rbi = (parseInt(homeStats.rbi) || 0) + (parseInt(awayStats.rbi) || 0);
        result.runs = (parseInt(homeStats.runs) || 0) + (parseInt(awayStats.runs) || 0);
        result.strikeouts = (parseInt(homeStats.strikeouts) || 0) + (parseInt(awayStats.strikeouts) || 0);
        result.walks = (parseInt(homeStats.walks) || 0) + (parseInt(awayStats.walks) || 0);
      }

      return result;
    });

    // Apply filters
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      processed = processed.filter(item => 
        item.name.toLowerCase().includes(search) ||
        (item.opponent && item.opponent.toLowerCase().includes(search)) ||
        (item.venue && item.venue.toLowerCase().includes(search))
      );
    }

    if (filters.minAtBats > 0) {
      processed = processed.filter(item => (item.atBats || 0) >= filters.minAtBats);
    }

    // Apply sorting
    processed.sort((a, b) => {
      let aVal = a[filters.sortBy];
      let bVal = b[filters.sortBy];
      
      // Handle numeric values
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return processed;
  }, [data, filters]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return processedData.slice(start, end);
  }, [processedData, page, rowsPerPage]);

  // Available columns for selection
  const availableColumns = columns.filter(col => filters.selectedColumns.has(col.id));

  const handleSort = (columnId) => {
    const isAsc = filters.sortBy === columnId && filters.sortOrder === 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: columnId,
      sortOrder: isAsc ? 'desc' : 'asc'
    }));
  };

  const handleColumnToggle = (columnId) => {
    setFilters(prev => {
      const newSelected = new Set(prev.selectedColumns);
      if (newSelected.has(columnId)) {
        newSelected.delete(columnId);
      } else {
        newSelected.add(columnId);
      }
      return { ...prev, selectedColumns: newSelected };
    });
  };

  const exportToCSV = () => {
    const headers = availableColumns.map(col => col.label).join(',');
    const rows = processedData.map(row => 
      availableColumns.map(col => row[col.id] || '').join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_splits.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
      <GlassCard>
        <CardHeader
          title={title}
          subheader={subtitle}
          titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
          avatar={icon}
          action={
            <Box display="flex" gap={1}>
              {showExport && (
                <Tooltip title="Export to CSV">
                  <IconButton onClick={exportToCSV} size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Column Settings">
                <IconButton 
                  onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                  size="small"
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />

        {showFilters && (
          <CardContent sx={{ pb: 0 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min At-Bats"
                  type="number"
                  value={filters.minAtBats}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAtBats: parseInt(e.target.value) || 0 }))}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.showHome}
                        onChange={(e) => setFilters(prev => ({ ...prev, showHome: e.target.checked }))}
                        size="small"
                      />
                    }
                    label="Home"
                    sx={{ mr: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.showAway}
                        onChange={(e) => setFilters(prev => ({ ...prev, showAway: e.target.checked }))}
                        size="small"
                      />
                    }
                    label="Away"
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.secondary">
                    {processedData.length} records
                  </Typography>
                  {filters.searchTerm && (
                    <Chip 
                      label={`"${filters.searchTerm}"`}
                      size="small" 
                      onDelete={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        )}

        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {availableColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.numeric ? 'right' : 'left'}
                    sx={{ 
                      fontWeight: 'bold',
                      background: alpha(theme.palette.primary.main, 0.05),
                      minWidth: column.minWidth || 'auto'
                    }}
                  >
                    <TableSortLabel
                      active={filters.sortBy === column.id}
                      direction={filters.sortBy === column.id ? filters.sortOrder : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow 
                  key={row.id || index}
                  hover
                  sx={{ 
                    '&:nth-of-type(odd)': { 
                      backgroundColor: alpha(theme.palette.action.hover, 0.05) 
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08)
                    }
                  }}
                >
                  {availableColumns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell 
                        key={column.id} 
                        align={column.numeric ? 'right' : 'left'}
                        sx={{ py: 1 }}
                      >
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={availableColumns.length} align="center" sx={{ py: 8 }}>
                    <Box textAlign="center">
                      <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Data Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your filters or search terms
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />

        {/* Column Selection Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight="bold">
              Select Columns
            </Typography>
          </MenuItem>
          <Divider />
          {columns.map((column) => (
            <MenuItem key={column.id} onClick={() => handleColumnToggle(column.id)}>
              <Checkbox checked={filters.selectedColumns.has(column.id)} />
              <ListItemText primary={column.label} />
            </MenuItem>
          ))}
        </Menu>
      </GlassCard>
    </motion.div>
  );
};

const SplitTabContent = ({ tabValue, playerData, splitsData, showAdvanced, quickStats }) => {
  const theme = useTheme();

  const renderContent = () => {
    switch (tabValue) {
      case 'overview':
        return <OverviewContent playerData={playerData} splitsData={splitsData} quickStats={quickStats} />;
      case 'home-away':
        return <HomeAwayContent data={splitsData.homeAway} playerData={playerData} showAdvanced={showAdvanced} quickStats={quickStats} />;
      case 'venues':
        return <VenuesContent data={splitsData.venues} playerData={playerData} showAdvanced={showAdvanced} />;
      case 'vs-teams':
        return <VsTeamsContent data={splitsData.vsTeams} playerData={playerData} showAdvanced={showAdvanced} />;
      case 'handedness':
        return <HandednessContent data={splitsData.handedness} playerData={playerData} showAdvanced={showAdvanced} quickStats={quickStats} />;
      case 'counts':
        return <CountsContent data={splitsData.counts} playerData={playerData} showAdvanced={showAdvanced} />;
      case 'vs-pitchers':
        return <VsPitchersContent playerData={playerData} showAdvanced={showAdvanced} />;
      case 'compound':
        return <CompoundAnalyticsContent playerData={playerData} showAdvanced={showAdvanced} />;
      default:
        return <ComingSoonContent tabName={tabValue} />;
    }
  };

  return (
    <Box>
      {renderContent()}
    </Box>
  );
};

// ============================================================================
// INDIVIDUAL CONTENT COMPONENTS
// ============================================================================

const OverviewContent = ({ playerData, splitsData }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <GlassCard>
            <CardHeader
              title="Splits Overview Dashboard"
              titleTypographyProps={{ variant: 'h5', fontWeight: 'bold' }}
              avatar={<AnalyticsIcon sx={{ color: 'primary.main' }} />}
              action={
                <Box display="flex" gap={1}>
                  <IconButton><Download /></IconButton>
                  <IconButton><Share /></IconButton>
                </Box>
              }
            />
            <CardContent>
              <Typography variant="body1" color="text.secondary" paragraph>
                Comprehensive situational analysis for {playerData?.name}. 
                Explore performance variations across different game situations, 
                venues, and matchups with advanced count-based analytics.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      background: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      p: 3,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}
                  >
                    <Typography variant="h6" gutterBottom color="primary.main" fontWeight="bold">
                      Available Split Categories
                    </Typography>
                    
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Chip label="Home vs Away Performance" icon={<Home />} variant="outlined" />
                      <Chip label="Venue-Specific Statistics" icon={<Stadium />} variant="outlined" />
                      <Chip label="Team Matchup Analysis" icon={<Group />} variant="outlined" />
                      <Chip label="Pitcher Handedness Splits" icon={<Compare />} variant="outlined" />
                      <Chip label="Count Situation Analytics" icon={<Psychology />} variant="outlined" />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      background: alpha(theme.palette.success.main, 0.05),
                      borderRadius: 2,
                      p: 3,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
                    }}
                  >
                    <Typography variant="h6" gutterBottom color="success.main" fontWeight="bold">
                      Advanced Analytics Features
                    </Typography>
                    
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Chip label="Pitch-by-Pitch Analysis" icon={<Speed />} variant="outlined" color="success" />
                      <Chip label="Count-Based Performance" icon={<BarChart />} variant="outlined" color="success" />
                      <Chip label="Game Context Situational" icon={<ShowChart />} variant="outlined" color="success" />
                      <Chip label="Multi-Season Trends" icon={<TrendingUp />} variant="outlined" color="success" />
                      <Chip label="Real-Time Updates" icon={<Refresh />} variant="outlined" color="success" />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </motion.div>
      </Grid>
    </Grid>
  );
};

const HomeAwayContent = ({ data, playerData, showAdvanced, quickStats }) => {
  const [filters, setFilters] = useState({
    handedness: 'all', // all, L, R
    countType: 'all', // all, hitters, pitchers
    selectedCount: 'all' // all, 0-0, 0-1, etc.
  });
  const [countSplitsData, setCountSplitsData] = useState({});
  const [handsData, setHandsData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load advanced split data when filters change
  useEffect(() => {
    if (showAdvanced && playerData?.id) {
      loadAdvancedSplits();
    }
  }, [showAdvanced, playerData, filters]);

  const loadAdvancedSplits = async () => {
    if (!playerData?.id) return;
    
    setLoading(true);
    try {
      // Load count-based home/away splits
      const countResponse = await fetch(`http://localhost:3001/api/splits/v2/counts-vs-home-away/${playerData.id}`);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setCountSplitsData(countData);
      }

      // Load handedness home/away splits
      const handsResponse = await fetch(`http://localhost:3001/api/splits/v2/handedness-vs-home-away/${playerData.id}`);
      if (handsResponse.ok) {
        const handsData = await handsResponse.json();
        setHandsData(handsData);
      }
    } catch (error) {
      console.error('Error loading advanced home/away splits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (!data || !data.splits) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle>No Home/Away Data</AlertTitle>
        No home vs away split data available for this player.
      </Alert>
    );
  }

  const { splits } = data;
  
  // Prepare basic table data
  const tableData = [
    {
      id: 'home',
      name: 'Home Games',
      situation: 'Home',
      icon: '🏠',
      ...splits.home?.stats?.batting,
      games: splits.home?.games?.length || 0,
      playCount: splits.home?.playCount || 0
    },
    {
      id: 'away',
      name: 'Away Games', 
      situation: 'Away',
      icon: '✈️',
      ...splits.away?.stats?.batting,
      games: splits.away?.games?.length || 0,
      playCount: splits.away?.playCount || 0
    }
  ];

  const columns = [
    { id: 'situation', label: 'Situation', default: true, minWidth: 100 },
    { id: 'games', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'runs', label: 'R', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false },
    { id: 'playCount', label: 'Plays', numeric: true, default: false }
  ];

  return (
    <Box>
      <FilterableDataTable
        data={tableData}
        title="Home vs Away Performance"
        subtitle={`Comprehensive home and away split analysis for ${data.player}`}
        icon={<Compare sx={{ color: 'primary.main' }} />}
        columns={columns}
        defaultSort="avg"
        showFilters={false}
      />
      
      {showAdvanced && (
        <Box mt={3}>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <GlassCard>
              <CardHeader
                title="Advanced Home/Away Analytics"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
                avatar={<Psychology sx={{ color: 'warning.main' }} />}
                action={
                  <Box display="flex" gap={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Handedness</InputLabel>
                      <Select
                        value={filters.handedness}
                        onChange={(e) => handleFilterChange('handedness', e.target.value)}
                        label="Handedness"
                      >
                        <MenuItem value="all">All Pitchers</MenuItem>
                        <MenuItem value="L">vs LHP</MenuItem>
                        <MenuItem value="R">vs RHP</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Count Type</InputLabel>
                      <Select
                        value={filters.countType}
                        onChange={(e) => handleFilterChange('countType', e.target.value)}
                        label="Count Type"
                      >
                        <MenuItem value="all">All Counts</MenuItem>
                        <MenuItem value="hitters">Hitter's Counts</MenuItem>
                        <MenuItem value="pitchers">Pitcher's Counts</MenuItem>
                        <MenuItem value="even">Even Counts</MenuItem>
                      </Select>
                    </FormControl>

                    {loading && <CircularProgress size={20} />}
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Performance in different count situations and handedness matchups for home vs away games
                </Typography>

                {/* Quick Stats from API */}
                {quickStats && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#4caf50', 0.1) }}>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {quickStats.homeAway?.home?.avg || '.000'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Home AVG
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#2196f3', 0.1) }}>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          {quickStats.homeAway?.away?.avg || '.000'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Away AVG
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#ff9800', 0.1) }}>
                        <Typography variant="h6" color="warning.main" fontWeight="bold">
                          {quickStats.handedness?.left?.avg || '.000'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          vs LHP
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#e91e63', 0.1) }}>
                        <Typography variant="h6" color="secondary.main" fontWeight="bold">
                          {quickStats.handedness?.right?.avg || '.000'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          vs RHP
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {/* Count-based analysis */}
                {countSplitsData && Object.keys(countSplitsData).length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Count-Specific Home/Away Performance
                    </Typography>
                    
                    {/* Filter out 3-strike and 4-ball counts */}
                    {Object.entries(countSplitsData)
                      .filter(([count]) => !count.includes('3-') && !count.includes('-4'))
                      .map(([count, data]) => (
                        <Accordion key={count} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body1" fontWeight="medium">
                                Count: {count}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${data.home?.totalPlays || 0}H / ${data.away?.totalPlays || 0}A`}
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                                  Home Performance
                                </Typography>
                                <Typography variant="body2">
                                  AVG: {data.home?.avg || '.000'} | OPS: {data.home?.ops || '.000'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                                  Away Performance
                                </Typography>
                                <Typography variant="body2">
                                  AVG: {data.away?.avg || '.000'} | OPS: {data.away?.ops || '.000'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                  </Box>
                )}

                {/* Handedness analysis */}
                {handsData && Object.keys(handsData).length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Handedness-Specific Home/Away Performance
                    </Typography>
                    
                    {Object.entries(handsData).map(([handedness, data]) => (
                      <Accordion key={handedness} sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="body1" fontWeight="medium">
                              vs {handedness === 'L' ? 'Left-Handed' : 'Right-Handed'} Pitching
                            </Typography>
                            <Chip
                              size="small"
                              label={`${data.home?.totalPlays || 0}H / ${data.away?.totalPlays || 0}A`}
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                                Home vs {handedness}HP
                              </Typography>
                              <Typography variant="body2">
                                AVG: {data.home?.avg || '.000'} | OPS: {data.home?.ops || '.000'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {data.home?.totalPlays || 0} plate appearances
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                                Away vs {handedness}HP
                              </Typography>
                              <Typography variant="body2">
                                AVG: {data.away?.avg || '.000'} | OPS: {data.away?.ops || '.000'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {data.away?.totalPlays || 0} plate appearances
                              </Typography>
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}

                {!countSplitsData && !handsData && (
                  <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
                    <AlertTitle>Loading Advanced Analytics...</AlertTitle>
                    Advanced count and handedness analytics are being loaded from the comprehensive splits system.
                  </Alert>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>
        </Box>
      )}
    </Box>
  );
};

const VenuesContent = ({ data, showAdvanced }) => {
  if (!data || !data.venues || Object.keys(data.venues).length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle>No Venue Data</AlertTitle>
        No venue-specific split data available for this player.
      </Alert>
    );
  }

  // Transform venues data for table
  const tableData = Object.entries(data.venues).map(([venue, venueData]) => {
    const homeStats = venueData.home?.stats?.batting || {};
    const awayStats = venueData.away?.stats?.batting || {};
    
    // Properly combine home and away stats
    const combinedStats = combineStats(homeStats, awayStats);
    
    return {
      id: venue,
      name: venue,
      venue: venue,
      homeGames: venueData.home?.games?.length || 0,
      awayGames: venueData.away?.games?.length || 0,
      totalGames: (venueData.home?.games?.length || 0) + (venueData.away?.games?.length || 0),
      home: venueData.home,
      away: venueData.away,
      homeAvg: homeStats.avg || '.000',
      awayAvg: awayStats.avg || '.000',
      ...combinedStats
    };
  });

  const columns = [
    { id: 'venue', label: 'Venue', default: true, minWidth: 120 },
    { id: 'totalGames', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeAvg', label: 'Home AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'awayAvg', label: 'Road AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'homeGames', label: 'Home G', numeric: true, default: false },
    { id: 'awayGames', label: 'Road G', numeric: true, default: false },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false }
  ];

  return (
    <FilterableDataTable
      data={tableData}
      title="Venue Performance Analysis"
      subtitle={`Performance breakdown across ${Object.keys(data.venues).length} different ballparks`}
      icon={<Stadium sx={{ color: 'primary.main' }} />}
      columns={columns}
      defaultSort="totalGames"
    />
  );
};

const VsTeamsContent = ({ data, playerData, showAdvanced }) => {
  const [filters, setFilters] = useState({
    homeAway: 'all', // all, home, away
    handedness: 'all', // all, L, R
    countType: 'all', // all, hitters, pitchers
    selectedTeam: 'all' // all, specific team
  });
  const [countTeamData, setCountTeamData] = useState({});
  const [handsTeamData, setHandsTeamData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load advanced split data when filters change
  useEffect(() => {
    if (showAdvanced && playerData?.id) {
      loadAdvancedTeamSplits();
    }
  }, [showAdvanced, playerData, filters]);

  const loadAdvancedTeamSplits = async () => {
    if (!playerData?.id) return;
    
    setLoading(true);
    try {
      // Load count-based team splits
      const countResponse = await fetch(`http://localhost:3001/api/splits/v2/counts-vs-teams/${playerData.id}`);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setCountTeamData(countData);
      }

      // Load handedness team splits
      const handsResponse = await fetch(`http://localhost:3001/api/splits/v2/handedness-vs-teams/${playerData.id}`);
      if (handsResponse.ok) {
        const handsData = await handsResponse.json();
        setHandsTeamData(handsData);
      }
    } catch (error) {
      console.error('Error loading advanced team splits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (!data || !data.opponents || Object.keys(data.opponents).length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle>No Team Matchup Data</AlertTitle>
        No team vs team split data available for this player.
      </Alert>
    );
  }

  // Transform opponent data for table
  const tableData = Object.entries(data.opponents).map(([team, teamData]) => {
    const homeStats = teamData.home?.stats?.batting || {};
    const awayStats = teamData.away?.stats?.batting || {};
    
    // Properly combine home and away stats
    const combinedStats = combineStats(homeStats, awayStats);
    
    return {
      id: team,
      name: team,
      opponent: team,
      homeGames: teamData.home?.games?.length || 0,
      awayGames: teamData.away?.games?.length || 0,
      totalGames: (teamData.home?.games?.length || 0) + (teamData.away?.games?.length || 0),
      home: teamData.home,
      away: teamData.away,
      homeAvg: homeStats.avg || '.000',
      awayAvg: awayStats.avg || '.000',
      homeOps: homeStats.ops || '.000',
      awayOps: awayStats.ops || '.000',
      ...combinedStats
    };
  });

  const columns = [
    { id: 'opponent', label: 'Opponent', default: true, minWidth: 80 },
    { id: 'totalGames', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeAvg', label: 'Home AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'awayAvg', label: 'Road AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'homeOps', label: 'Home OPS', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'awayOps', label: 'Road OPS', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'runs', label: 'R', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false }
  ];

  return (
    <Box>
      <FilterableDataTable
        data={tableData}
        title="Team Matchup Performance"
        subtitle={`Performance against ${Object.keys(data.opponents).length} different opponents`}
        icon={<Group sx={{ color: 'secondary.main' }} />}
        columns={columns}
        defaultSort="ops"
      />

      {showAdvanced && (
        <Box mt={3}>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <GlassCard>
              <CardHeader
                title="Advanced Team Matchup Analytics"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
                avatar={<Psychology sx={{ color: 'secondary.main' }} />}
                action={
                  <Box display="flex" gap={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Home/Away</InputLabel>
                      <Select
                        value={filters.homeAway}
                        onChange={(e) => handleFilterChange('homeAway', e.target.value)}
                        label="Home/Away"
                      >
                        <MenuItem value="all">All Games</MenuItem>
                        <MenuItem value="home">Home Only</MenuItem>
                        <MenuItem value="away">Away Only</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Handedness</InputLabel>
                      <Select
                        value={filters.handedness}
                        onChange={(e) => handleFilterChange('handedness', e.target.value)}
                        label="Handedness"
                      >
                        <MenuItem value="all">All Pitchers</MenuItem>
                        <MenuItem value="L">vs LHP</MenuItem>
                        <MenuItem value="R">vs RHP</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Count Type</InputLabel>
                      <Select
                        value={filters.countType}
                        onChange={(e) => handleFilterChange('countType', e.target.value)}
                        label="Count Type"
                      >
                        <MenuItem value="all">All Counts</MenuItem>
                        <MenuItem value="hitters">Hitter's Counts</MenuItem>
                        <MenuItem value="pitchers">Pitcher's Counts</MenuItem>
                        <MenuItem value="even">Even Counts</MenuItem>
                      </Select>
                    </FormControl>

                    {loading && <CircularProgress size={20} />}
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Advanced count-based and handedness analysis against specific teams
                </Typography>

                {/* Count-based team analysis */}
                {countTeamData && Object.keys(countTeamData).length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Count-Specific Performance vs Teams
                    </Typography>
                    
                    {/* Show top 3 teams by count performance */}
                    {Object.entries(countTeamData)
                      .filter(([count]) => !count.includes('3-') && !count.includes('-4'))
                      .slice(0, 3)
                      .map(([count, teams]) => (
                        <Accordion key={count} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body1" fontWeight="medium">
                                Count: {count}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${Object.keys(teams).length} teams`}
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={1}>
                              {Object.entries(teams).slice(0, 6).map(([team, data]) => (
                                <Grid item xs={6} md={4} key={team}>
                                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: alpha('#1976d2', 0.05) }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                      {team}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      AVG: {data.avg || '.000'} | OPS: {data.ops || '.000'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {data.totalPlays || 0} PAs
                                    </Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                  </Box>
                )}

                {/* Handedness-based team analysis */}
                {handsTeamData && Object.keys(handsTeamData).length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Handedness-Specific Performance vs Teams
                    </Typography>
                    
                    {Object.entries(handsTeamData).map(([handedness, teams]) => (
                      <Accordion key={handedness} sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="body1" fontWeight="medium">
                              vs {handedness === 'L' ? 'Left-Handed' : 'Right-Handed'} Pitching
                            </Typography>
                            <Chip
                              size="small"
                              label={`${Object.keys(teams).length} teams`}
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={1}>
                            {Object.entries(teams).slice(0, 6).map(([team, data]) => (
                              <Grid item xs={6} md={4} key={team}>
                                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: alpha('#9c27b0', 0.05) }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {team} ({handedness}HP)
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    AVG: {data.avg || '.000'} | OPS: {data.ops || '.000'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {data.totalPlays || 0} plate appearances
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}

                {!countTeamData && !handsTeamData && (
                  <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
                    <AlertTitle>Loading Advanced Analytics...</AlertTitle>
                    Advanced count and handedness analytics vs teams are being loaded.
                  </Alert>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>
        </Box>
      )}
    </Box>
  );
};

const HandednessContent = ({ data, showAdvanced }) => {
  if (!data || !data.handedness) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle>No Handedness Data</AlertTitle>
        No pitcher handedness split data available for this player.
      </Alert>
    );
  }

  const { handedness } = data;
  
  // Transform handedness data for table
  const tableData = [];
  
  if (handedness.left) {
    const leftHomeStats = handedness.left.home?.stats?.batting || {};
    const leftAwayStats = handedness.left.away?.stats?.batting || {};
    const leftCombinedStats = combineStats(leftHomeStats, leftAwayStats);
    
    tableData.push({
      id: 'vs-lhp',
      name: 'vs Left-Handed Pitching',
      handedness: 'LHP',
      icon: '👈',
      homeGames: handedness.left.home?.games?.length || 0,
      awayGames: handedness.left.away?.games?.length || 0,
      totalGames: (handedness.left.home?.games?.length || 0) + (handedness.left.away?.games?.length || 0),
      home: handedness.left.home,
      away: handedness.left.away,
      homeAvg: leftHomeStats.avg || '.000',
      awayAvg: leftAwayStats.avg || '.000',
      homeOps: leftHomeStats.ops || '.000',
      awayOps: leftAwayStats.ops || '.000',
      ...leftCombinedStats
    });
  }
  
  if (handedness.right) {
    const rightHomeStats = handedness.right.home?.stats?.batting || {};
    const rightAwayStats = handedness.right.away?.stats?.batting || {};
    const rightCombinedStats = combineStats(rightHomeStats, rightAwayStats);
    
    tableData.push({
      id: 'vs-rhp',
      name: 'vs Right-Handed Pitching',
      handedness: 'RHP',
      icon: '👉',
      homeGames: handedness.right.home?.games?.length || 0,
      awayGames: handedness.right.away?.games?.length || 0,
      totalGames: (handedness.right.home?.games?.length || 0) + (handedness.right.away?.games?.length || 0),
      home: handedness.right.home,
      away: handedness.right.away,
      homeAvg: rightHomeStats.avg || '.000',
      awayAvg: rightAwayStats.avg || '.000',
      homeOps: rightHomeStats.ops || '.000',
      awayOps: rightAwayStats.ops || '.000',
      ...rightCombinedStats
    });
  }

  const columns = [
    { id: 'handedness', label: 'Pitcher Hand', default: true, minWidth: 120 },
    { id: 'totalGames', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeAvg', label: 'Home AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'awayAvg', label: 'Road AVG', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'homeOps', label: 'Home OPS', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'awayOps', label: 'Road OPS', numeric: true, default: false, format: (value) => value || '.000' },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'runs', label: 'R', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false }
  ];

  return (
    <Box>
      <FilterableDataTable
        data={tableData}
        title="Handedness Matchup Analysis"
        subtitle="Performance against left-handed and right-handed pitching"
        icon={<Compare sx={{ color: 'warning.main' }} />}
        columns={columns}
        defaultSort="ops"
        showFilters={false}
      />

      {showAdvanced && (
        <Box mt={3}>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <GlassCard>
              <CardHeader
                title="Advanced Handedness Analytics"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
                avatar={<Psychology sx={{ color: 'secondary.main' }} />}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Detailed count-based performance against left and right-handed pitching
                </Typography>
                
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <AlertTitle>Coming Soon</AlertTitle>
                  Advanced handedness analytics including platoon advantage analysis, 
                  count-specific performance, and pitch-type effectiveness breakdowns.
                </Alert>
              </CardContent>
            </GlassCard>
          </motion.div>
        </Box>
      )}
    </Box>
  );
};

const CountsContent = ({ data, showAdvanced }) => {
  if (!data || !data.counts) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle>No Count Data</AlertTitle>
        No count-specific performance data available for this player.
      </Alert>
    );
  }

  const { counts } = data;
  
  // Transform counts data for table
  const tableData = Object.entries(counts).map(([count, countData]) => {
    const homeStats = countData.home?.stats?.batting || {};
    const awayStats = countData.away?.stats?.batting || {};
    const combinedStats = combineStats(homeStats, awayStats);
    const totalGames = (countData.home?.games?.length || 0) + (countData.away?.games?.length || 0);
    
    return {
      id: count,
      count: count,
      name: `Count ${count}`,
      icon: getCountIcon(count),
      homeGames: countData.home?.games?.length || 0,
      awayGames: countData.away?.games?.length || 0,
      totalGames,
      home: countData.home,
      away: countData.away,
      ...combinedStats
    };
  }).sort((a, b) => b.totalGames - a.totalGames);

  // Helper function to get count-specific icons
  function getCountIcon(count) {
    if (count.startsWith('0-')) return '🔴'; // No strikes
    if (count.startsWith('1-')) return '🟡'; // One strike
    if (count.startsWith('2-')) return '🟠'; // Two strikes
    if (count.endsWith('-0')) return '🔵'; // No balls
    if (count.endsWith('-1')) return '🟦'; // One ball
    if (count.endsWith('-2')) return '🟢'; // Two balls
    if (count.endsWith('-3')) return '🟣'; // Three balls
    return '⚾';
  }

  const columns = [
    { id: 'count', label: 'Count', default: true, minWidth: 100 },
    { id: 'totalGames', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'runs', label: 'R', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false },
    { id: 'doubles', label: '2B', numeric: true, default: false },
    { id: 'triples', label: '3B', numeric: true, default: false }
  ];

  return (
    <Box>
      <FilterableDataTable
        data={tableData}
        title="Count-Specific Performance"
        subtitle="How the player performs in different count situations"
        icon={<Numbers sx={{ color: 'primary.main' }} />}
        columns={columns}
        defaultSort="ops"
        showFilters={true}
        searchPlaceholder="Search count situations..."
      />

      {showAdvanced && (
        <Box mt={3}>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <GlassCard>
              <CardHeader
                title="Count Analytics Insights"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
                avatar={<Psychology sx={{ color: 'secondary.main' }} />}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Advanced count-based performance analysis including pressure situations
                </Typography>
                
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <AlertTitle>Coming Soon</AlertTitle>
                  Pressure count analysis, two-strike performance, hitter's counts vs pitcher's counts, 
                  and situational tendencies in different count scenarios.
                </Alert>
              </CardContent>
            </GlassCard>
          </motion.div>
        </Box>
      )}
    </Box>
  );
};

const VsPitchersContent = ({ playerData, showAdvanced }) => {
  const [filters, setFilters] = useState({
    homeAway: 'all', // all, home, away
    countType: 'all', // all, hitters, pitchers, even
    minPlateAppearances: 5
  });
  const [pitchersData, setPitchersData] = useState({});
  const [countPitchersData, setCountPitchersData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load pitcher splits data
  useEffect(() => {
    if (playerData?.id) {
      loadPitchersSplits();
    }
  }, [playerData, filters]);

  const loadPitchersSplits = async () => {
    if (!playerData?.id) return;
    
    setLoading(true);
    try {
      // Load general pitcher splits
      const pitchersResponse = await fetch(`http://localhost:3001/api/splits/v2/pitchers/${playerData.id}`);
      if (pitchersResponse.ok) {
        const pitchersData = await pitchersResponse.json();
        setPitchersData(pitchersData);
      }

      // Load count-based pitcher splits 
      const countPitchersResponse = await fetch(`http://localhost:3001/api/splits/v2/counts-vs-pitchers/${playerData.id}`);
      if (countPitchersResponse.ok) {
        const countData = await countPitchersResponse.json();
        setCountPitchersData(countData);
      }
    } catch (error) {
      console.error('Error loading pitcher splits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Transform pitchers data for table
  const tableData = pitchersData && Object.entries(pitchersData).length > 0 
    ? Object.entries(pitchersData)
        .filter(([pitcher, data]) => (data.totalPlays || 0) >= filters.minPlateAppearances)
        .map(([pitcher, data]) => ({
          id: pitcher,
          pitcher: pitcher,
          name: pitcher,
          icon: '⚾',
          totalPlays: data.totalPlays || 0,
          games: data.games || 0,
          ...data,
          avg: data.avg || '.000',
          obp: data.obp || '.000',
          slg: data.slg || '.000',
          ops: data.ops || '.000'
        }))
        .sort((a, b) => b.totalPlays - a.totalPlays)
    : [];

  const columns = [
    { id: 'pitcher', label: 'Pitcher', default: true, minWidth: 120 },
    { id: 'totalPlays', label: 'PAs', numeric: true, default: true },
    { id: 'games', label: 'Games', numeric: true, default: true },
    { id: 'atBats', label: 'AB', numeric: true, default: true },
    { id: 'hits', label: 'H', numeric: true, default: true },
    { id: 'avg', label: 'AVG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'obp', label: 'OBP', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'slg', label: 'SLG', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'ops', label: 'OPS', numeric: true, default: true, format: (value) => value || '.000' },
    { id: 'homeRuns', label: 'HR', numeric: true, default: false },
    { id: 'rbi', label: 'RBI', numeric: true, default: false },
    { id: 'runs', label: 'R', numeric: true, default: false },
    { id: 'strikeouts', label: 'K', numeric: true, default: false },
    { id: 'walks', label: 'BB', numeric: true, default: false },
    { id: 'doubles', label: '2B', numeric: true, default: false },
    { id: 'triples', label: '3B', numeric: true, default: false }
  ];

  return (
    <Box>
      {tableData.length > 0 ? (
        <FilterableDataTable
          data={tableData}
          title="Individual Pitcher Matchups"
          subtitle={`Performance against ${tableData.length} individual pitchers (min ${filters.minPlateAppearances} PAs)`}
          icon={<Person sx={{ color: 'primary.main' }} />}
          columns={columns}
          defaultSort="ops"
          showFilters={true}
          searchPlaceholder="Search pitcher names..."
        />
      ) : (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <AlertTitle>Loading Pitcher Data...</AlertTitle>
          {loading ? 'Loading individual pitcher matchup data...' : 'No pitcher matchup data available for this player.'}
          {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Alert>
      )}

      {showAdvanced && (
        <Box mt={3}>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <GlassCard>
              <CardHeader
                title="Advanced Pitcher Analytics"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
                avatar={<Psychology sx={{ color: 'warning.main' }} />}
                action={
                  <Box display="flex" gap={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Home/Away</InputLabel>
                      <Select
                        value={filters.homeAway}
                        onChange={(e) => handleFilterChange('homeAway', e.target.value)}
                        label="Home/Away"
                      >
                        <MenuItem value="all">All Games</MenuItem>
                        <MenuItem value="home">Home Only</MenuItem>
                        <MenuItem value="away">Away Only</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Count Type</InputLabel>
                      <Select
                        value={filters.countType}
                        onChange={(e) => handleFilterChange('countType', e.target.value)}
                        label="Count Type"
                      >
                        <MenuItem value="all">All Counts</MenuItem>
                        <MenuItem value="hitters">Hitter's Counts</MenuItem>
                        <MenuItem value="pitchers">Pitcher's Counts</MenuItem>
                        <MenuItem value="even">Even Counts</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>Min PAs</InputLabel>
                      <Select
                        value={filters.minPlateAppearances}
                        onChange={(e) => handleFilterChange('minPlateAppearances', e.target.value)}
                        label="Min PAs"
                      >
                        <MenuItem value={1}>1+</MenuItem>
                        <MenuItem value={3}>3+</MenuItem>
                        <MenuItem value={5}>5+</MenuItem>
                        <MenuItem value={10}>10+</MenuItem>
                        <MenuItem value={15}>15+</MenuItem>
                      </Select>
                    </FormControl>

                    {loading && <CircularProgress size={20} />}
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Advanced count-based performance analysis against individual pitchers
                </Typography>

                {/* Count-based pitcher analysis */}
                {countPitchersData && Object.keys(countPitchersData).length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Count-Specific Performance vs Pitchers
                    </Typography>
                    
                    {Object.entries(countPitchersData)
                      .filter(([count]) => !count.includes('3-') && !count.includes('-4'))
                      .slice(0, 4)
                      .map(([count, pitchers]) => (
                        <Accordion key={count} sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body1" fontWeight="medium">
                                Count: {count}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${Object.keys(pitchers).length} pitchers`}
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={1}>
                              {Object.entries(pitchers)
                                .filter(([pitcher, data]) => (data.totalPlays || 0) >= 2)
                                .slice(0, 8)
                                .map(([pitcher, data]) => (
                                <Grid item xs={6} md={3} key={pitcher}>
                                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: alpha('#ff9800', 0.05) }}>
                                    <Typography variant="caption" fontWeight="bold" noWrap>
                                      {pitcher}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      AVG: {data.avg || '.000'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {data.totalPlays || 0} PAs
                                    </Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                  </Box>
                )}

                {/* Summary statistics */}
                {pitchersData && Object.keys(pitchersData).length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Pitcher Matchup Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#4caf50', 0.1) }}>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            {Object.keys(pitchersData).length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Pitchers Faced
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#2196f3', 0.1) }}>
                          <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {Object.values(pitchersData).reduce((sum, data) => sum + (data.totalPlays || 0), 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Plate Appearances
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#ff9800', 0.1) }}>
                          <Typography variant="h6" color="warning.main" fontWeight="bold">
                            {(Object.values(pitchersData).reduce((sum, data) => sum + (parseFloat(data.avg) || 0), 0) / Object.keys(pitchersData).length).toFixed(3)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Average AVG vs All
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#e91e63', 0.1) }}>
                          <Typography variant="h6" color="secondary.main" fontWeight="bold">
                            {Object.values(pitchersData).filter(data => (data.totalPlays || 0) >= 10).length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Frequent Matchups (10+ PAs)
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {!countPitchersData && !pitchersData && (
                  <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
                    <AlertTitle>Loading Pitcher Analytics...</AlertTitle>
                    Advanced pitcher-specific analytics are being loaded from the comprehensive splits system.
                  </Alert>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>
        </Box>
      )}
    </Box>
  );
};

const CompoundAnalyticsContent = ({ playerData, showAdvanced }) => {
  const [analysisType, setAnalysisType] = useState('counts-vs-team');
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedHandedness, setSelectedHandedness] = useState('R');
  const [compoundData, setCompoundData] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableOpponents, setAvailableOpponents] = useState([]);
  const [availableVenues, setAvailableVenues] = useState([]);

  const analysisTypes = [
    { value: 'counts-vs-team', label: 'Count Performance vs Specific Teams', icon: <Numbers /> },
    { value: 'counts-vs-venue', label: 'Count Performance at Specific Venues', icon: <Stadium /> },
    { value: 'counts-vs-handedness', label: 'Count Performance vs Handedness', icon: <Compare /> },
    { value: 'handedness-vs-team', label: 'Handedness Performance vs Teams', icon: <Group /> },
  ];

  // Load available opponents and venues from basic splits data
  useEffect(() => {
    const loadOptions = async () => {
      if (!playerData) return;
      
      try {
        const { team, name, season } = playerData;
        const playerName = name.replace(/\s+/g, '_');

        // Load available opponents from vs-teams endpoint
        const teamsResponse = await fetch(`http://localhost:8081/api/v2/splits/vs-teams/${team}/${playerName}/${season}`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          if (teamsData.opponents) {
            const opponents = Object.keys(teamsData.opponents);
            setAvailableOpponents(opponents);
            if (opponents.length > 0 && !selectedOpponent) {
              setSelectedOpponent(opponents[0]);
            }
          }
        }

        // Load available venues from venue endpoint
        const venuesResponse = await fetch(`http://localhost:8081/api/v2/splits/venue/${team}/${playerName}/${season}`);
        if (venuesResponse.ok) {
          const venuesData = await venuesResponse.json();
          if (venuesData.venues) {
            const venues = Object.keys(venuesData.venues);
            setAvailableVenues(venues);
            if (venues.length > 0 && !selectedVenue) {
              setSelectedVenue(venues[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    loadOptions();
  }, [playerData]);

  // Load compound data when parameters change
  useEffect(() => {
    if (!playerData) return;
    
    const shouldLoad = 
      (analysisType === 'counts-vs-team' && selectedOpponent) ||
      (analysisType === 'counts-vs-venue' && selectedVenue) ||
      (analysisType === 'counts-vs-handedness' && selectedHandedness) ||
      (analysisType === 'handedness-vs-team' && selectedOpponent);

    if (shouldLoad) {
      loadCompoundData();
    }
  }, [analysisType, selectedOpponent, selectedVenue, selectedHandedness, playerData]);

  const loadCompoundData = async () => {
    if (!playerData) return;
    
    setLoading(true);
    try {
      const { team, name, season } = playerData;
      const playerName = name.replace(/\s+/g, '_');
      
      let url = '';
      
      switch (analysisType) {
        case 'counts-vs-team':
          if (selectedOpponent) {
            url = `http://localhost:8081/api/v2/splits/counts-vs-team/${team}/${playerName}/${season}/${selectedOpponent}`;
          }
          break;
        case 'counts-vs-venue':
          if (selectedVenue) {
            url = `http://localhost:8081/api/v2/splits/counts-vs-venue/${team}/${playerName}/${season}/${selectedVenue}`;
          }
          break;
        case 'counts-vs-handedness':
          if (selectedHandedness) {
            url = `http://localhost:8081/api/v2/splits/counts-vs-handedness/${team}/${playerName}/${season}/${selectedHandedness}`;
          }
          break;
        case 'handedness-vs-team':
          if (selectedOpponent) {
            url = `http://localhost:8081/api/v2/splits/handedness-vs-team/${team}/${playerName}/${season}/${selectedOpponent}`;
          }
          break;
      }
      
      if (url) {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setCompoundData(data);
        } else {
          console.error(`API call failed: ${response.status}`);
          setCompoundData({});
        }
      }
    } catch (error) {
      console.error('Error loading compound data:', error);
      setCompoundData({});
    } finally {
      setLoading(false);
    }
  };

  const renderDataTable = () => {
    if (!compoundData || Object.keys(compoundData).length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>No Compound Data</AlertTitle>
          No compound analysis data available for the selected parameters.
        </Alert>
      );
    }

    // Render based on analysis type
    switch (analysisType) {
      case 'counts-vs-team':
      case 'counts-vs-venue':
      case 'counts-vs-handedness':
        return renderCountAnalysis();
      case 'handedness-vs-team':
        return renderHandednessAnalysis();
      default:
        return null;
    }
  };

  const renderCountAnalysis = () => {
    if (!compoundData.counts) return null;

    const countEntries = Object.entries(compoundData.counts)
      .filter(([count, data]) => data?.stats?.batting)
      .map(([count, data]) => ({
        count,
        ...data.stats.batting,
        games: data.games?.length || 0,
        lastUpdated: data.lastUpdated
      }))
      .sort((a, b) => (b.ops || 0) - (a.ops || 0));

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Count</strong></TableCell>
              <TableCell align="center"><strong>Games</strong></TableCell>
              <TableCell align="center"><strong>PA</strong></TableCell>
              <TableCell align="center"><strong>AVG</strong></TableCell>
              <TableCell align="center"><strong>OBP</strong></TableCell>
              <TableCell align="center"><strong>SLG</strong></TableCell>
              <TableCell align="center"><strong>OPS</strong></TableCell>
              <TableCell align="center"><strong>HR</strong></TableCell>
              <TableCell align="center"><strong>RBI</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {countEntries.map(({ count, games, plateAppearances, avg, obp, slg, ops, homeRuns, rbi }) => (
              <TableRow
                key={count}
                sx={{ 
                  '&:nth-of-type(odd)': { backgroundColor: alpha('#1976d2', 0.02) },
                  '&:hover': { backgroundColor: alpha('#1976d2', 0.05) }
                }}
              >
                <TableCell>
                  <Chip 
                    label={count} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">{games}</TableCell>
                <TableCell align="center">{plateAppearances || 0}</TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    color={avg >= 0.300 ? 'success.main' : avg >= 0.250 ? 'warning.main' : 'error.main'}
                    fontWeight="medium"
                  >
                    {avg?.toFixed(3) || '.---'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                  {obp?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                  {slg?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight="bold"
                    color={ops >= 0.900 ? 'success.main' : ops >= 0.750 ? 'warning.main' : 'error.main'}
                  >
                    {ops?.toFixed(3) || '.---'}
                  </Typography>
                </TableCell>
                <TableCell align="center">{homeRuns || 0}</TableCell>
                <TableCell align="center">{rbi || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderHandednessAnalysis = () => {
    if (!compoundData.handedness) return null;

    const handednessEntries = Object.entries(compoundData.handedness)
      .filter(([hand, data]) => data?.stats?.batting)
      .map(([hand, data]) => ({
        handedness: hand === 'L' ? 'vs LHP' : 'vs RHP',
        ...data.stats.batting,
        games: data.games?.length || 0
      }));

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Handedness</strong></TableCell>
              <TableCell align="center"><strong>Games</strong></TableCell>
              <TableCell align="center"><strong>PA</strong></TableCell>
              <TableCell align="center"><strong>AVG</strong></TableCell>
              <TableCell align="center"><strong>OBP</strong></TableCell>
              <TableCell align="center"><strong>SLG</strong></TableCell>
              <TableCell align="center"><strong>OPS</strong></TableCell>
              <TableCell align="center"><strong>HR</strong></TableCell>
              <TableCell align="center"><strong>RBI</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {handednessEntries.map(({ handedness, games, plateAppearances, avg, obp, slg, ops, homeRuns, rbi }) => (
              <TableRow key={handedness}>
                <TableCell>
                  <Chip 
                    label={handedness} 
                    size="small" 
                    color={handedness.includes('LHP') ? 'secondary' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">{games}</TableCell>
                <TableCell align="center">{plateAppearances || 0}</TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                  {avg?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                  {obp?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                  {slg?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {ops?.toFixed(3) || '.---'}
                </TableCell>
                <TableCell align="center">{homeRuns || 0}</TableCell>
                <TableCell align="center">{rbi || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const getSelectedParameter = () => {
    switch (analysisType) {
      case 'counts-vs-team':
      case 'handedness-vs-team':
        return selectedOpponent;
      case 'counts-vs-venue':
        return selectedVenue?.replace(/_/g, ' ');
      case 'counts-vs-handedness':
        return selectedHandedness === 'R' ? 'Right-Handed Pitchers' : 'Left-Handed Pitchers';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12}>
          <GlassCard>
            <CardHeader
              title="Compound Situational Analytics"
              subheader="Multi-dimensional split analysis combining multiple factors"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              avatar={<AutoAwesome sx={{ color: 'primary.main' }} />}
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Analysis Type Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Analysis Type</InputLabel>
                    <Select
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value)}
                      label="Analysis Type"
                    >
                      {analysisTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {type.icon}
                            {type.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Dynamic Parameter Selection */}
                <Grid item xs={12} md={6}>
                  {(analysisType === 'counts-vs-team' || analysisType === 'handedness-vs-team') && (
                    <FormControl fullWidth>
                      <InputLabel>Opponent Team</InputLabel>
                      <Select
                        value={selectedOpponent}
                        onChange={(e) => setSelectedOpponent(e.target.value)}
                        label="Opponent Team"
                      >
                        {availableOpponents.map(team => (
                          <MenuItem key={team} value={team}>{team}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {analysisType === 'counts-vs-venue' && (
                    <FormControl fullWidth>
                      <InputLabel>Venue</InputLabel>
                      <Select
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        label="Venue"
                      >
                        {availableVenues.map(venue => (
                          <MenuItem key={venue} value={venue}>
                            {venue.replace(/_/g, ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {analysisType === 'counts-vs-handedness' && (
                    <FormControl fullWidth>
                      <InputLabel>Pitcher Handedness</InputLabel>
                      <Select
                        value={selectedHandedness}
                        onChange={(e) => setSelectedHandedness(e.target.value)}
                        label="Pitcher Handedness"
                      >
                        <MenuItem value="R">Right-Handed Pitchers</MenuItem>
                        <MenuItem value="L">Left-Handed Pitchers</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Grid>
              </Grid>

              {getSelectedParameter() && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Analyzing: <strong>{getSelectedParameter()}</strong>
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Data Display */}
        <Grid item xs={12}>
          <GlassCard>
            <CardHeader
              title={`${analysisTypes.find(t => t.value === analysisType)?.label || 'Analysis'} Results`}
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              action={loading && <CircularProgress size={24} />}
            />
            <CardContent>
              {renderDataTable()}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
    </motion.div>
  );
};

const ComingSoonContent = ({ tabName }) => (
  <motion.div variants={cardVariants} initial="hidden" animate="visible">
    <GlassCard>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <AutoAwesome sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {tabName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Advanced situational analytics coming soon
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This section will feature comprehensive {tabName.replace('-', ' ')} split analysis 
          with interactive visualizations and deep statistical insights.
        </Typography>
      </CardContent>
    </GlassCard>
  </motion.div>
);

export default Splits;
