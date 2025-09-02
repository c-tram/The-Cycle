import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Avatar,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  ToggleButton
} from '@mui/material';
import {
  Search,
  Refresh,
  ViewList,
  ViewModule,
  Analytics,
  Sports,
  Stadium,
  ArrowUpward,
  ArrowDownward,
  DateRange,
  TableView,
  ViewStream
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// API and utils
import { teamsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { getCVRDisplay } from '../utils/cvrCalculations';

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

// Helper function to safely get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const Teams = ({ category }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [activeCategory, setActiveCategory] = useState(category || 'all'); // Default to 'all' or use category prop
  const [sortBy, setSortBy] = useState('record.wins');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState('all');
  
  // Enhanced date range functionality
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  
  // View options
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState('unified'); // 'divisions' or 'unified' - default to unified (list view)

  // Static data
  const divisionOptions = [
    'AL East', 'AL Central', 'AL West',
    'NL East', 'NL Central', 'NL West'
  ];

  // Helper function to get date range for API calls
  const getDateRangeParams = useCallback(() => {
    const currentDate = new Date();
    
    switch (dateRange) {
      case 'today':
        return {
          startDate: format(currentDate, 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'last1':
        return {
          startDate: format(subDays(currentDate, 1), 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'last3':
        return {
          startDate: format(subDays(currentDate, 3), 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'last7':
        return {
          startDate: format(subDays(currentDate, 7), 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'last14':
        return {
          startDate: format(subDays(currentDate, 14), 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'last30':
        return {
          startDate: format(subDays(currentDate, 30), 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd')
        };
      case 'thisWeek':
        return {
          startDate: format(startOfWeek(currentDate), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(currentDate), 'yyyy-MM-dd')
        };
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd')
        };
      case 'august':
        return {
          startDate: '2025-08-01',
          endDate: '2025-08-31'
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate
          };
        }
        return null;
      default:
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    loadTeams();
  }, [activeCategory, sortBy, sortOrder]);

  // Real-time search and filter effect
  useEffect(() => {
    setPage(0); // Reset to first page when filters change
    
    // Debounce the search to avoid too many API calls
    const searchTimeout = setTimeout(() => {
      if (searchTerm || selectedDivisions.length > 0 || dateRange !== 'all') {
        setSearchLoading(true);
        loadTeams().finally(() => setSearchLoading(false));
      } else {
        loadTeams();
      }
    }, 300); // 300ms delay

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, selectedDivisions, dateRange]);

  // Debounced API call for real-time search
  const loadTeams = useCallback(async () => {
    try {
      if (!searchTerm && selectedDivisions.length === 0 && dateRange === 'all') {
        setLoading(true);
      }
      setError(null);

      // Build API parameters based on current filters
      const apiParams = {
        category: activeCategory,
        sortBy,
        sortOrder,
        limit: 100 // Get all teams
      };

      // Add date range filter if not 'all'
      const dateParams = getDateRangeParams();
      if (dateParams) {
        apiParams.startDate = dateParams.startDate;
        apiParams.endDate = dateParams.endDate;
        apiParams.dateRange = dateRange;
      }

      const response = await teamsApi.getTeams(apiParams);
      const newTeams = response.teams || [];
      
      // Fix team records by calculating actual wins/losses from game logs
      const teamsWithActualRecords = await Promise.all(newTeams.map(async (team) => {
        try {
          // Fetch team schedule to calculate actual record
          const scheduleData = await teamsApi.getTeamSchedule(team.id, { 
            year: '2025', 
            limit: 200 
          });
          const games = scheduleData.games || [];
          
          if (games.length > 0) {
            const wins = games.filter(game => game.result === 'W').length;
            const losses = games.filter(game => game.result === 'L').length;
            const ties = games.filter(game => game.result === 'T').length;
            
            // Update record with actual calculated values
            return {
              ...team,
              record: { wins, losses, ties: ties || 0 },
              gameCount: games.length,
              standings: {
                ...team.standingss,
                winPercentage: games.length > 0 ? wins / games.length : 0
              }
            };
          }
        } catch (scheduleErr) {
          console.log(`Could not fetch schedule for ${team.id}:`, scheduleErr);
        }
        
        // Return original team if schedule fetch fails
        return team;
      }));
      
      setTeams(teamsWithActualRecords);
      
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy, sortOrder, selectedDivisions, searchTerm, dateRange, customStartDate, customEndDate, getDateRangeParams]);

  // Division organization
  const divisions = {
    'AL East': ['BAL', 'BOS', 'NYY', 'TB', 'TOR'],
    'AL Central': ['CWS', 'CHW', 'CLE', 'DET', 'KC', 'KCR', 'MIN'],
    'AL West': ['HOU', 'LAA', 'OAK', 'ATH', 'SEA', 'TEX'],
    'NL East': ['ATL', 'MIA', 'NYM', 'PHI', 'WSH', 'WSN'],
    'NL Central': ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
    'NL West': ['ARI', 'AZ', 'COL', 'LAD', 'SD', 'SDP', 'SF', 'SFG']
  };

  // Helper functions to get league and division from team ID
  const getTeamLeague = (teamId) => {
    for (const [divisionName, teamIds] of Object.entries(divisions)) {
      if (teamIds.includes(teamId)) {
        return divisionName.startsWith('AL') ? 'AL' : 'NL';
      }
    }
    return 'Unknown';
  };

  const getTeamDivision = (teamId) => {
    for (const [divisionName, teamIds] of Object.entries(divisions)) {
      if (teamIds.includes(teamId)) {
        return divisionName.split(' ')[1]; // Extract 'East', 'Central', or 'West'
      }
    }
    return 'Unknown';
  };

  const getTeamsByDivision = (divisionTeams) => {
    return teams.filter(team => divisionTeams.includes(team.id)).sort((a, b) => {
      const aWinPct = a.standings?.winPercentage || 0;
      const bWinPct = b.standings?.winPercentage || 0;
      return bWinPct - aWinPct; // Sort by win percentage descending
    });
  };

  // Filter and sort teams with real-time search
  const filteredTeams = useMemo(() => {
    let filtered = [...teams];

    // Real-time search filter
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(team =>
        team.name?.toLowerCase().includes(term) ||
        team.id?.toLowerCase().includes(term) ||
        team.league?.toLowerCase().includes(term) ||
        team.division?.toLowerCase().includes(term)
      );
    }

    // Division filter (full division names like "AL East", "NL Central")
    if (selectedDivisions.length > 0) {
      filtered = filtered.filter(team => {
        const teamFullDivision = `${getTeamLeague(team.id)} ${getTeamDivision(team.id)}`;
        return selectedDivisions.includes(teamFullDivision);
      });
    }

    // Client-side sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortBy);
        const bValue = getNestedValue(b, sortBy);
        
        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // Convert to numbers if they're numeric strings
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortOrder === 'desc' ? bNum - aNum : aNum - bNum;
        }
        
        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortOrder === 'desc') {
          return bStr.localeCompare(aStr);
        } else {
          return aStr.localeCompare(bStr);
        }
      });
    }

    return filtered;
  }, [teams, searchTerm, selectedDivisions, sortBy, sortOrder]);

  // Calculate category-specific filtered teams (for stats display)
  const categoryFilteredTeams = useMemo(() => {
    return filteredTeams.filter(team => {
      const stats = team.stats?.[activeCategory];
      if (!stats) return false;
      
      // Category-specific filtering logic
      switch (activeCategory) {
        case 'batting':
          return stats.atBats > 0 || stats.hits > 0;
        case 'pitching':
          return stats.inningsPitched && parseFloat(stats.inningsPitched) > 0;
        case 'fielding':
          return stats.chances > 0 || stats.assists > 0 || stats.putOuts > 0;
        default:
          return true;
      }
    });
  }, [filteredTeams, activeCategory]);

  // Pagination
  const paginatedTeams = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return categoryFilteredTeams.slice(startIndex, startIndex + rowsPerPage);
  }, [categoryFilteredTeams, page, rowsPerPage]);

  // Stat configurations for the three categories
  const statConfigs = {
    all: [
      // All Stats: Wins, Losses, Last 10, Total WAR, Total CVR, Pythagorean %
      { key: 'record.wins', label: 'W', format: (val) => val || 0 },
      { key: 'record.losses', label: 'L', format: (val) => val || 0 },
      { key: 'standings.winPercentage', label: 'PCT', format: (val) => val?.toFixed(3) || '---' },
      { key: 'standings.lastTen', label: 'L10', format: (val) => {
        if (!val || !val.wins || !val.losses) return '---';
        return `${val.wins}-${val.losses}`;
      }},
      { key: 'war.total', label: 'Total WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvr', label: 'Total CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }},
      { key: 'standings.pythagoreanWinPct', label: 'Pyth %', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'standings.runDifferential', label: 'Run Diff', format: (val) => val >= 0 ? `+${val}` : val || 0 }
    ],
    batting: [
      // Batting: Generic batting stats + batting WAR and CVR
      { key: 'standings.runsScored', label: 'R', format: (val) => val || 0 },
      { key: 'stats.batting.avg', label: 'AVG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.obp', label: 'OBP', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.slg', label: 'SLG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.ops', label: 'OPS', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.batting.rbi', label: 'RBI', format: (val) => val || 0 },
      { key: 'stats.batting.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.batting.doubles', label: '2B', format: (val) => val || 0 },
      { key: 'stats.batting.strikeOuts', label: 'K', format: (val) => val || 0 },
      { key: 'stats.batting.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'war.batting', label: 'Batting WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvrDetails.batting', label: 'Batting CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }}
    ],
    pitching: [
      // Pitching: Generic pitching stats + pitching WAR and CVR
      { key: 'standings.runsAllowed', label: 'RA', format: (val) => val || 0 },
      { key: 'stats.pitching.era', label: 'ERA', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.fip', label: 'FIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.strikeOuts', label: 'K', format: (val) => val || 0 },
      { key: 'stats.pitching.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'stats.pitching.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.pitching.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.pitching.saves', label: 'SV', format: (val) => val || 0 },
      { key: 'stats.pitching.inningsPitched', label: 'IP', format: (val) => val || '---' },
      { key: 'stats.pitching.strikeoutsPer9Inn', label: 'K/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'war.pitching', label: 'Pitching WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvrDetails.pitching', label: 'Pitching CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }}
    ]
  };

  // Team name mapping for full names
  const teamNameMap = {
    'ARI': 'Arizona Diamondbacks',
    'AZ': 'Arizona Diamondbacks',
    'ATL': 'Atlanta Braves',
    'BAL': 'Baltimore Orioles',
    'BOS': 'Boston Red Sox',
    'CHC': 'Chicago Cubs',
    'CWS': 'Chicago White Sox',
    'CHW': 'Chicago White Sox',
    'CIN': 'Cincinnati Reds',
    'CLE': 'Cleveland Guardians',
    'COL': 'Colorado Rockies',
    'DET': 'Detroit Tigers',
    'HOU': 'Houston Astros',
    'KC': 'Kansas City Royals',
    'KCR': 'Kansas City Royals',
    'LAA': 'Los Angeles Angels',
    'LAD': 'Los Angeles Dodgers',
    'MIA': 'Miami Marlins',
    'MIL': 'Milwaukee Brewers',
    'MIN': 'Minnesota Twins',
    'NYM': 'New York Mets',
    'NYY': 'New York Yankees',
    'OAK': 'Oakland Athletics',
    'ATH': 'Oakland Athletics',
    'PHI': 'Philadelphia Phillies',
    'PIT': 'Pittsburgh Pirates',
    'SD': 'San Diego Padres',
    'SDP': 'San Diego Padres',
    'SF': 'San Francisco Giants',
    'SFG': 'San Francisco Giants',
    'SEA': 'Seattle Mariners',
    'STL': 'St. Louis Cardinals',
    'TB': 'Tampa Bay Rays',
    'TBR': 'Tampa Bay Rays',
    'TEX': 'Texas Rangers',
    'TOR': 'Toronto Blue Jays',
    'WSH': 'Washington Nationals',
    'WSN': 'Washington Nationals'
  };

  const currentStats = statConfigs[activeCategory] || [];

  // Handle custom date range application
  const handleCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange('custom');
      setShowCustomDateDialog(false);
    }
  };

  // Handle sorting
  const handleSort = useCallback((statKey) => {
    if (sortBy === statKey) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(statKey);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Loading skeleton component
  const TeamsSkeleton = () => (
    <Box>
      {[...Array(10)].map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <Skeleton variant="text" height={40} />
              </Grid>
              <Grid item xs={9}>
                <Grid container spacing={1}>
                  {[...Array(8)].map((_, statIndex) => (
                    <Grid item xs={1.5} key={statIndex}>
                      <Skeleton variant="text" height={24} />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  if (loading) {
    return <TeamsSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error loading teams: {error}
        </Typography>
        <Button onClick={loadTeams} variant="contained" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Team Statistics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive team performance analytics for the 2025 season
        </Typography>
      </Box>

      {/* Controls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Search */}
        <Grid item xs={12} md={4}>
          <TextField
            ref={searchInputRef}
            fullWidth
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchLoading && (
                <InputAdornment position="end">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Refresh color="action" />
                  </motion.div>
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Division Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Division</InputLabel>
            <Select
              multiple
              value={selectedDivisions}
              onChange={(e) => setSelectedDivisions(e.target.value)}
              input={<OutlinedInput label="Division" />}
              renderValue={(selected) => selected.length === 0 ? 'All Divisions' : selected.join(', ')}
            >
              {divisionOptions.map((division) => (
                <MenuItem key={division} value={division}>
                  <Checkbox checked={selectedDivisions.indexOf(division) > -1} />
                  <ListItemText primary={division} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomDateDialog(true);
                } else {
                  setDateRange(e.target.value);
                }
              }}
              label="Date Range"
            >
              <MenuItem value="all">Full Season</MenuItem>
              <MenuItem value="august">August 2025</MenuItem>
              <MenuItem value="last30">Last 30 Days</MenuItem>
              <MenuItem value="last14">Last 14 Days</MenuItem>
              <MenuItem value="last7">Last 7 Days</MenuItem>
              <MenuItem value="thisWeek">This Week</MenuItem>
              <MenuItem value="custom">Custom Range...</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* View Controls */}
        <Grid item xs={12} md={2}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <ToggleButton
              value="divisions"
              selected={viewMode === 'divisions'}
              onChange={() => setViewMode('divisions')}
              size="small"
              color="primary"
              title="Division View"
            >
              <ViewModule fontSize="small" />
            </ToggleButton>
            <ToggleButton
              value="unified"
              selected={viewMode === 'unified'}
              onChange={() => setViewMode('unified')}
              size="small"
              color="primary"
              title="Unified Table View"
            >
              <TableView fontSize="small" />
            </ToggleButton>
            <IconButton onClick={loadTeams} color="primary" title="Refresh Data">
              <Refresh />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      {/* Category Tabs */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <Tabs
          value={activeCategory}
          onChange={(_, newValue) => {
            setActiveCategory(newValue);
            setPage(0);
            // Navigate to the new route
            if (newValue === 'batting') {
              navigate('/teams/batting');
            } else if (newValue === 'pitching') {
              navigate('/teams/pitching');
            } else {
              // For 'all' or any other value, go to base teams route
              navigate('/teams');
            }
          }}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem'
            }
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Analytics />
                All Stats
              </Box>
            } 
            value="all" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sports />
                Batting
              </Box>
            } 
            value="batting" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Stadium />
                Pitching
              </Box>
            } 
            value="pitching" 
          />
        </Tabs>
      </Card>

      {/* Results Summary */}
      {/* Content based on view mode */}
      {viewMode === 'divisions' ? (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing all teams organized by division ({activeCategory} statistics)
              {dateRange !== 'all' && ` (${dateRange} data)`}
            </Typography>
            
            {dateRange === 'custom' && customStartDate && customEndDate && (
              <Chip 
                label={`${format(new Date(customStartDate), 'MMM dd')} - ${format(new Date(customEndDate), 'MMM dd')}`}
                size="small"
                onDelete={() => setDateRange('all')}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          {/* Division Tables */}
          <AnimatePresence mode="wait">
            <motion.div
              key="divisions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Grid container spacing={3}>
                {Object.entries(divisions).map(([divisionName, divisionTeams]) => {
                  const divisionTeamData = getTeamsByDivision(divisionTeams);
                  
                  return (
                    <Grid item xs={12} lg={6} key={divisionName}>
                      <Card elevation={2}>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: 'primary.main', 
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <Typography variant="h6" fontWeight={700}>
                            {divisionName}
                          </Typography>
                          <Chip 
                            label={`${divisionTeamData.length} teams`}
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(255,255,255,0.2)', 
                              color: 'inherit',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: '400px' }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: 200 }}>
                                  Team
                                </TableCell>
                                {currentStats.map((stat) => (
                                  <TableCell
                                    key={stat.key}
                                    sx={{
                                      fontWeight: 700,
                                      bgcolor: 'background.paper',
                                      cursor: 'pointer',
                                      minWidth: 80,
                                      textAlign: 'center',
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.04)
                                      }
                                    }}
                                    onClick={() => handleSort(stat.key)}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                      {stat.label}
                                      {sortBy === stat.key && (
                                        <Box component="span" sx={{ ml: 0.5 }}>
                                          {sortOrder === 'desc' ? <ArrowDownward sx={{ fontSize: 14 }} /> : <ArrowUpward sx={{ fontSize: 14 }} />}
                                        </Box>
                                      )}
                                    </Box>
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {divisionTeamData.map((team, index) => (
                                <TableRow
                                  key={`${team.id}-${index}`}
                                  hover
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: alpha(theme.palette.primary.main, 0.04)
                                    }
                                  }}
                                  onClick={() => navigate(`/teams/${team.id}/2025`)}
                                >
                                  <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Avatar
                                        src={getTeamLogoUrl(team.id)}
                                        alt={team.id}
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          bgcolor: themeUtils.getTeamColor(team.id),
                                          fontSize: '0.7rem',
                                          fontWeight: 'bold'
                                        }}
                                        imgProps={{
                                          style: { objectFit: 'contain', background: 'white' }
                                        }}
                                      >
                                        {team.id}
                                      </Avatar>
                                      <Box>
                                        <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                                          {teamNameMap[team.id] || team.name || team.id}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                                          {team.league} {team.division}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  {currentStats.map((stat) => (
                                    <TableCell key={stat.key} sx={{ textAlign: 'center' }}>
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {stat.format(getNestedValue(team, stat.key))}
                                      </Typography>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <>
          {/* Unified Table View */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing all {filteredTeams.length} teams in sortable table ({activeCategory} statistics)
              {dateRange !== 'all' && ` (${dateRange} data)`}
            </Typography>
            
            {dateRange === 'custom' && customStartDate && customEndDate && (
              <Chip 
                label={`${format(new Date(customStartDate), 'MMM dd')} - ${format(new Date(customEndDate), 'MMM dd')}`}
                size="small"
                onDelete={() => setDateRange('all')}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          {/* Unified Table */}
          <Card elevation={2}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: 250 }}>
                      Team
                    </TableCell>
                    {currentStats.map((stat) => (
                      <TableCell
                        key={stat.key}
                        sx={{
                          fontWeight: 700,
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          minWidth: 100,
                          textAlign: 'center',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}
                        onClick={() => handleSort(stat.key)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {stat.label}
                          {sortBy === stat.key && (
                            <Box component="span" sx={{ ml: 0.5 }}>
                              {sortOrder === 'desc' ? <ArrowDownward sx={{ fontSize: 14 }} /> : <ArrowUpward sx={{ fontSize: 14 }} />}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTeams.map((team, index) => (
                    <TableRow
                      key={`${team.id}-${index}`}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04)
                        }
                      }}
                      onClick={() => navigate(`/teams/${team.id}/2025`)}
                    >
                      <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={getTeamLogoUrl(team.id)}
                            alt={team.id}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: themeUtils.getTeamColor(team.id),
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}
                            imgProps={{
                              style: { objectFit: 'contain', background: 'white' }
                            }}
                          >
                            {team.id}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                              {teamNameMap[team.id] || team.name || team.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                              {getTeamLeague(team.id)} {getTeamDivision(team.id)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {currentStats.map((stat) => (
                        <TableCell key={stat.key} sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {stat.format(getNestedValue(team, stat.key))}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* Custom Date Range Dialog */}
      <Dialog 
        open={showCustomDateDialog} 
        onClose={() => setShowCustomDateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateRange color="primary" />
            Custom Date Range
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{
                max: format(new Date(), 'yyyy-MM-dd'),
                min: '2025-03-01'
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{
                max: format(new Date(), 'yyyy-MM-dd'),
                min: customStartDate || '2025-03-01'
              }}
            />
            {customStartDate && customEndDate && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Selected Range: {format(new Date(customStartDate), 'MMM dd, yyyy')} - {format(new Date(customEndDate), 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Duration: {Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) + 1} days
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCustomDateDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCustomDateRange} 
            variant="contained"
            disabled={!customStartDate || !customEndDate}
            startIcon={<Analytics />}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teams;
