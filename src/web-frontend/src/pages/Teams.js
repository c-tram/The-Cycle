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
  Stack
} from '@mui/material';
import {
  Search,
  Sports,
  Refresh,
  ViewList,
  ViewModule,
  ArrowUpward,
  ArrowDownward,
  DateRange,
  Analytics,
  Groups,
  Stadium
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// API and utils
import { teamsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { getCVRDisplay } from '../utils/cvrCalculations';

// Helper function to safely get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const Teams = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('batting');
  const [sortBy, setSortBy] = useState('record.wins');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState('all');
  
  // Enhanced date range functionality
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  
  // View options
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Static data
  const leagues = ['AL', 'NL'];
  const divisions = ['East', 'Central', 'West'];

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
      if (searchTerm || selectedLeagues.length > 0 || selectedDivisions.length > 0 || dateRange !== 'all') {
        setSearchLoading(true);
        loadTeams().finally(() => setSearchLoading(false));
      } else {
        loadTeams();
      }
    }, 300); // 300ms delay

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, selectedLeagues, selectedDivisions, dateRange]);

  // Debounced API call for real-time search
  const loadTeams = useCallback(async () => {
    try {
      if (!searchTerm && selectedLeagues.length === 0 && selectedDivisions.length === 0 && dateRange === 'all') {
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

      // Add league filter if selected
      if (selectedLeagues.length === 1) {
        apiParams.league = selectedLeagues[0];
      }

      // Add division filter if selected
      if (selectedDivisions.length === 1) {
        apiParams.division = selectedDivisions[0];
      }

      // Add date range filter if not 'all'
      const dateParams = getDateRangeParams();
      if (dateParams) {
        apiParams.startDate = dateParams.startDate;
        apiParams.endDate = dateParams.endDate;
        apiParams.dateRange = dateRange;
      }

      const response = await teamsApi.getTeams(apiParams);
      const newTeams = response.teams || [];
      setTeams(newTeams);
      
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy, sortOrder, selectedLeagues, selectedDivisions, searchTerm, dateRange, customStartDate, customEndDate, getDateRangeParams]);

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

    // League filter (handled by API for single league, client-side for multiple)
    if (selectedLeagues.length > 1) {
      filtered = filtered.filter(team =>
        selectedLeagues.includes(team.league)
      );
    }

    // Division filter (handled by API for single division, client-side for multiple)
    if (selectedDivisions.length > 1) {
      filtered = filtered.filter(team =>
        selectedDivisions.includes(team.division)
      );
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
  }, [teams, searchTerm, selectedLeagues, selectedDivisions, sortBy, sortOrder]);

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

  // Stat configurations for different categories
  const statConfigs = {
    batting: [
      // Team Identity
      { key: 'id', label: 'Team', format: (val) => val || '---', sticky: true },
      { key: 'record.wins', label: 'W', format: (val) => val || 0 },
      { key: 'record.losses', label: 'L', format: (val) => val || 0 },
      { key: 'standings.winPercentage', label: 'PCT', format: (val) => val?.toFixed(3) || '---' },
      
      // Advanced Team Metrics
      { key: 'war.total', label: 'WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvr', label: 'CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }},
      
      // Traditional Triple Slash (Team)
      { key: 'stats.batting.avg', label: 'AVG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.obp', label: 'OBP', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.slg', label: 'SLG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.ops', label: 'OPS', format: (val) => val?.toFixed(3) || '---' },
      
      // Power Metrics
      { key: 'stats.batting.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.batting.iso', label: 'ISO', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.extraBaseHits', label: 'XBH', format: (val) => val || 0 },
      { key: 'stats.batting.extraBaseHitRate', label: 'XBH%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Plate Discipline
      { key: 'stats.batting.kRate', label: 'K%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.bbRate', label: 'BB%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.contactRate', label: 'Contact%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.walkToStrikeoutRatio', label: 'BB/K', format: (val) => val && val < 999 ? val.toFixed(2) : val > 0 ? '∞' : '---' },
      
      // Advanced Sabermetrics
      { key: 'stats.batting.wOBA', label: 'wOBA', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.babip', label: 'BABIP', format: (val) => val?.toFixed(3) || '---' },
      
      // Run Production
      { key: 'standings.runsScored', label: 'R', format: (val) => val || 0 },
      { key: 'stats.batting.rbi', label: 'RBI', format: (val) => val || 0 },
      { key: 'stats.batting.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.batting.doubles', label: '2B', format: (val) => val || 0 },
      { key: 'stats.batting.triples', label: '3B', format: (val) => val || 0 },
      { key: 'stats.batting.stolenBases', label: 'SB', format: (val) => val || 0 },
      { key: 'stats.batting.plateAppearances', label: 'PA', format: (val) => val || 0 },
      { key: 'stats.batting.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'stats.batting.strikeOuts', label: 'K', format: (val) => val || 0 }
    ],
    pitching: [
      // Team Identity
      { key: 'id', label: 'Team', format: (val) => val || '---', sticky: true },
      { key: 'record.wins', label: 'W', format: (val) => val || 0 },
      { key: 'record.losses', label: 'L', format: (val) => val || 0 },
      { key: 'standings.winPercentage', label: 'PCT', format: (val) => val?.toFixed(3) || '---' },
      
      // Advanced Team Metrics
      { key: 'war.total', label: 'WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'war.pitching', label: 'pWAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvr', label: 'CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }},
      
      // Innings (Primary Volume)
      { key: 'stats.pitching.inningsPitched', label: 'IP', format: (val) => val || '---' },
      
      // Traditional Rate Stats
      { key: 'stats.pitching.era', label: 'ERA', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.winPercentage', label: 'WIN%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Advanced Sabermetrics
      { key: 'stats.pitching.fip', label: 'FIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.xFip', label: 'xFIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'stats.pitching.babip', label: 'BABIP', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.pitching.strandRate', label: 'LOB%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Strikeout Metrics
      { key: 'stats.pitching.strikeoutWalkRatio', label: 'K/BB', format: (val) => val && val < 999 ? val.toFixed(2) : val > 0 ? '∞' : '---' },
      { key: 'stats.pitching.strikeoutsPer9Inn', label: 'K/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.walksPer9Inn', label: 'BB/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.hitsPer9Inn', label: 'H/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.homeRunsPer9', label: 'HR/9', format: (val) => val?.toFixed(1) || '---' },
      
      // Efficiency Metrics
      { key: 'stats.pitching.pitchesPerInning', label: 'P/IP', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.strikePercentage', label: 'Strike%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Run Prevention
      { key: 'standings.runsAllowed', label: 'RA', format: (val) => val || 0 },
      { key: 'standings.runDifferential', label: 'DIFF', format: (val) => val >= 0 ? `+${val}` : val || 0 },
      { key: 'stats.pitching.earnedRuns', label: 'ER', format: (val) => val || 0 },
      { key: 'stats.pitching.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.pitching.strikeOuts', label: 'K', format: (val) => val || 0 },
      { key: 'stats.pitching.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'stats.pitching.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.pitching.saves', label: 'SV', format: (val) => val || 0 }
    ],
    fielding: [
      // Team Identity
      { key: 'id', label: 'Team', format: (val) => val || '---', sticky: true },
      { key: 'record.wins', label: 'W', format: (val) => val || 0 },
      { key: 'record.losses', label: 'L', format: (val) => val || 0 },
      { key: 'standings.winPercentage', label: 'PCT', format: (val) => val?.toFixed(3) || '---' },
      
      // Advanced Team Metrics
      { key: 'war.total', label: 'WAR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'cvr', label: 'CVR', format: (val) => {
        if (!val) return '---';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }},
      
      // Primary Fielding Stats
      { key: 'stats.fielding.fieldingPercentage', label: 'FLD%', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.fielding.errors', label: 'E', format: (val) => val || 0 },
      { key: 'stats.fielding.assists', label: 'A', format: (val) => val || 0 },
      { key: 'stats.fielding.putOuts', label: 'PO', format: (val) => val || 0 },
      { key: 'stats.fielding.chances', label: 'TC', format: (val) => val || 0 },
      
      // Advanced Fielding
      { key: 'stats.fielding.caughtStealingPercentage', label: 'CS%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Related Stats
      { key: 'stats.pitching.groundOutsToAirouts', label: 'GO/AO', format: (val) => val?.toFixed(2) || '---' },
      { key: 'standings.runDifferential', label: 'DIFF', format: (val) => val >= 0 ? `+${val}` : val || 0 }
    ]
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

        {/* League Filter */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>League</InputLabel>
            <Select
              multiple
              value={selectedLeagues}
              onChange={(e) => setSelectedLeagues(e.target.value)}
              input={<OutlinedInput label="League" />}
              renderValue={(selected) => selected.length === 0 ? 'All Leagues' : selected.join(', ')}
            >
              {leagues.map((league) => (
                <MenuItem key={league} value={league}>
                  <Checkbox checked={selectedLeagues.indexOf(league) > -1} />
                  <ListItemText primary={league} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Division Filter */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Division</InputLabel>
            <Select
              multiple
              value={selectedDivisions}
              onChange={(e) => setSelectedDivisions(e.target.value)}
              input={<OutlinedInput label="Division" />}
              renderValue={(selected) => selected.length === 0 ? 'All Divisions' : selected.join(', ')}
            >
              {divisions.map((division) => (
                <MenuItem key={division} value={division}>
                  <Checkbox checked={selectedDivisions.indexOf(division) > -1} />
                  <ListItemText primary={division} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range */}
        <Grid item xs={12} md={2}>
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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton 
              onClick={() => setViewMode('table')}
              color={viewMode === 'table' ? 'primary' : 'default'}
            >
              <ViewList />
            </IconButton>
            <IconButton 
              onClick={() => setViewMode('cards')}
              color={viewMode === 'cards' ? 'primary' : 'default'}
            >
              <ViewModule />
            </IconButton>
            <IconButton onClick={loadTeams} color="primary">
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
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Groups />
                Fielding
              </Box>
            } 
            value="fielding" 
          />
        </Tabs>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {categoryFilteredTeams.length} teams
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

      {/* Teams Table */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card elevation={0}>
              <TableContainer sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {currentStats.map((stat) => (
                        <TableCell
                          key={stat.key}
                          sx={{
                            fontWeight: 700,
                            bgcolor: 'background.paper',
                            cursor: stat.key !== 'id' ? 'pointer' : 'default',
                            position: stat.sticky ? 'sticky' : 'static',
                            left: stat.sticky ? 0 : 'auto',
                            zIndex: stat.sticky ? 1000 : 'auto',
                            minWidth: stat.key === 'id' ? 120 : 80,
                            '&:hover': {
                              bgcolor: stat.key !== 'id' ? alpha(theme.palette.primary.main, 0.04) : 'inherit'
                            }
                          }}
                          onClick={() => stat.key !== 'id' && handleSort(stat.key)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {stat.label}
                            {sortBy === stat.key && (
                              <Box component="span" sx={{ ml: 0.5 }}>
                                {sortOrder === 'desc' ? <ArrowDownward sx={{ fontSize: 16 }} /> : <ArrowUpward sx={{ fontSize: 16 }} />}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTeams.map((team, index) => (
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
                        {currentStats.map((stat) => (
                          <TableCell
                            key={stat.key}
                            sx={{
                              position: stat.sticky ? 'sticky' : 'static',
                              left: stat.sticky ? 0 : 'auto',
                              bgcolor: stat.sticky ? 'background.paper' : 'inherit',
                              zIndex: stat.sticky ? 999 : 'auto',
                              borderRight: stat.sticky ? '1px solid' : 'none',
                              borderColor: stat.sticky ? 'divider' : 'transparent'
                            }}
                          >
                            {stat.key === 'id' ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: themeUtils.getTeamColor(team.id),
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {team.id}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {team.name || team.id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {team.league} {team.division}
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {stat.format(getNestedValue(team, stat.key))}
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Typography>Cards view coming soon...</Typography>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <Card elevation={0} sx={{ mt: 3 }}>
        <TablePagination
          component="div"
          count={categoryFilteredTeams.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

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
