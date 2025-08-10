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
  Person,
  Sports,
  Refresh,
  ViewList,
  ViewModule,
  ArrowUpward,
  ArrowDownward,
  DateRange,
  TrendingUp,
  Analytics
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid } from 'date-fns';

// API and utils
import { playersApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { getCVRDisplay } from '../utils/cvrCalculations';

// Helper function to safely get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const Players = () => {
  // Games/IP filter state
  const [minGames, setMinGames] = useState(0);
  const [minInnings, setMinInnings] = useState(10);
  const [gamesIpFilterEnabled, setGamesIpFilterEnabled] = useState(true);

  const theme = useTheme();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [activeCategory, setActiveCategory] = useState('batting');
  const [sortBy, setSortBy] = useState('stats.batting.avg');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState('all'); // 'all', 'custom', or predefined ranges
  
  // Enhanced date range functionality
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [dateRangeStats, setDateRangeStats] = useState(null); // For analytics
  
  // View options
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedStatGroup, setSelectedStatGroup] = useState('primary'); // Stat group selection state

  // Available teams and positions
  const [teams, setTeams] = useState([]);

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

  // Get human-readable date range description
  const getDateRangeDescription = useCallback(() => {
    const params = getDateRangeParams();
    if (!params) return 'Full Season';
    
    const { startDate, endDate } = params;
    
    switch (dateRange) {
      case 'today': return 'Today';
      case 'last1': return 'Last 1 Day';
      case 'last3': return 'Last 3 Days';
      case 'last7': return 'Last 7 Days';
      case 'last14': return 'Last 14 Days';
      case 'last30': return 'Last 30 Days';
      case 'thisWeek': return 'This Week';
      case 'thisMonth': return 'This Month';
      case 'august': return 'August 2025';
      case 'custom': return `${startDate} to ${endDate}`;
      default: return 'Full Season';
    }
  }, [dateRange, getDateRangeParams]);

  // Handle custom date range selection
  const handleCustomDateRange = () => {
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('Start date must be before end date');
      return;
    }
    
    setDateRange('custom');
    setShowCustomDateDialog(false);
  };

  useEffect(() => {
    loadPlayers();
  }, [activeCategory, sortBy, sortOrder]);

  // Set default minGames/minInnings on category or players change
  useEffect(() => {
    if (activeCategory === 'batting') {
      // Default: 25% of max team games (rounded down)
      const maxGames = Math.max(...players.map(p => p.gameCount || 0), 0);
      setMinGames(Math.floor(maxGames * 0.25));
    } else if (activeCategory === 'pitching') {
      setMinInnings(10);
    }
  }, [activeCategory, players]);

  // Real-time search and filter effect
  useEffect(() => {
    setPage(0); // Reset to first page when filters change
    
    // Debounce the search to avoid too many API calls
    const searchTimeout = setTimeout(() => {
      if (searchTerm || selectedTeams.length > 0 || dateRange !== 'all') {
        // Only show search loading for subsequent searches, not initial load
        setSearchLoading(true);
        loadPlayers().finally(() => setSearchLoading(false));
      } else {
        loadPlayers();
      }
    }, 300); // 300ms delay

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, selectedTeams, dateRange]);

  // Debounced API call for real-time search
  const loadPlayers = useCallback(async () => {
    try {
      // Only show main loading for initial load or category changes
      if (!searchTerm && selectedTeams.length === 0 && dateRange === 'all') {
        setLoading(true);
      }
      setError(null);

      // Build API parameters based on current filters
      const apiParams = {
        category: activeCategory,
        sortBy,
        sortOrder,
        limit: 1000 // Get all players for client-side filtering
      };

      // Add team filter if selected
      if (selectedTeams.length === 1) {
        apiParams.team = selectedTeams[0];
      }

      // Add date range filter if not 'all'
      const dateParams = getDateRangeParams();
      if (dateParams) {
        apiParams.startDate = dateParams.startDate;
        apiParams.endDate = dateParams.endDate;
        apiParams.dateRange = dateRange;
      }

      const response = await playersApi.getPlayers(apiParams);
      const newPlayers = response.players || [];
      setPlayers(newPlayers);
      
      // Update teams list with the new players data
      if (newPlayers.length > 0) {
        const uniqueTeams = [...new Set(newPlayers.map(p => p.team))].sort();
        setTeams(uniqueTeams);
      }
    } catch (err) {
      console.error('Error loading players:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy, sortOrder, selectedTeams, searchTerm, dateRange, customStartDate, customEndDate, getDateRangeParams]);

  // Filter and sort players with real-time search
  const filteredPlayers = useMemo(() => {
    let filtered = [...players];

    // Real-time search filter (applied to already loaded data)
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(term) ||
        player.team.toLowerCase().includes(term)
      );
    }

    // Team filter (handled by API for single team, client-side for multiple)
    if (selectedTeams.length > 1) {
      filtered = filtered.filter(player =>
        selectedTeams.includes(player.team)
      );
    }

    // Client-side sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue = getNestedValue(a, sortBy);
        let bValue = getNestedValue(b, sortBy);

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Always try to parse as float for numeric columns (G, WAR, CVR)
        const numericSortKeys = ['gameCount', 'war', 'cvr'];
        if (numericSortKeys.includes(sortBy)) {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
          if (isNaN(aValue)) aValue = 0;
          if (isNaN(bValue)) bValue = 0;
        }

        // Convert to numbers if they're numeric strings
        const aNum = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
        const bNum = typeof bValue === 'string' ? parseFloat(bValue) : bValue;

        let comparison = 0;
        if (typeof aNum === 'number' && typeof bNum === 'number' && !isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          // String comparison for non-numeric values
          comparison = String(aValue).localeCompare(String(bValue));
        }

        // Apply sort order (desc = high to low, asc = low to high)
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [players, searchTerm, selectedTeams, sortBy, sortOrder]);

  // Determine available tabs based on player data
  const availableTabs = useMemo(() => {
    if (players.length === 0) return [];

    // Check if any players have meaningful batting stats
    const hasBatters = players.some(player => {
      const batting = player.stats?.batting;
      return batting && (batting.atBats > 0 || batting.plateAppearances > 0);
    });

    // Check if any players have meaningful pitching stats  
    const hasPitchers = players.some(player => {
      const pitching = player.stats?.pitching;
      return pitching && (parseFloat(pitching.inningsPitched) > 0 || pitching.gamesPlayed > 0);
    });

    const tabs = [];
    if (hasBatters) {
      tabs.push({ value: 'batting', label: 'Batting', icon: <Sports /> });
    }
    if (hasPitchers) {
      tabs.push({ value: 'pitching', label: 'Pitching', icon: <Person /> });
    }

    return tabs;
  }, [players]);

  // Auto-select first available tab if current tab is not available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.value === activeCategory)) {
      const firstCategory = availableTabs[0].value;
      setActiveCategory(firstCategory);
      // Set default sort field based on category
      if (firstCategory === 'batting') {
        setSortBy('stats.batting.avg');
      } else if (firstCategory === 'pitching') {
        setSortBy('stats.pitching.era');
      }
    }
  }, [availableTabs, activeCategory]);

  // Update sort field when category changes, but do NOT override top-level sort keys (gameCount, war, cvr)
  useEffect(() => {
    const topLevelKeys = ['gameCount', 'war', 'cvr'];
    // Only reset sortBy if it's not a top-level key
    if (topLevelKeys.includes(sortBy)) return;
    if (activeCategory === 'batting' && !sortBy.includes('batting')) {
      setSortBy('stats.batting.avg');
    } else if (activeCategory === 'pitching' && !sortBy.includes('pitching')) {
      setSortBy('stats.pitching.era');
    }
  }, [activeCategory, sortBy]);
  
  // Reset stat group to primary when category changes (separate useEffect)
  useEffect(() => {
    setSelectedStatGroup('primary');
  }, [activeCategory]);

  // Filter players based on their relevant stats for the active category
  const categoryFilteredPlayers = useMemo(() => {
    return filteredPlayers.filter(player => {
      if (activeCategory === 'batting') {
        const batting = player.stats?.batting;
        const meetsGames = !gamesIpFilterEnabled || (player.gameCount >= minGames);
        return batting && (batting.atBats > 0 || batting.plateAppearances > 0) && meetsGames;
      } else if (activeCategory === 'pitching') {
        const pitching = player.stats?.pitching;
        const ip = parseFloat(pitching?.inningsPitched) || 0;
        const meetsIp = !gamesIpFilterEnabled || (ip >= minInnings);
        return pitching && (ip > 0 || pitching.gamesPlayed > 0) && meetsIp;
      }
      return true;
    });
  }, [filteredPlayers, activeCategory, gamesIpFilterEnabled, minGames, minInnings]);

  // Paginated players (use category-filtered players)
  const paginatedPlayers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return categoryFilteredPlayers.slice(startIndex, startIndex + rowsPerPage);
  }, [categoryFilteredPlayers, page, rowsPerPage]);

  // Stat configurations with comprehensive statistics
  const statConfigs = {
    batting: [
      // At Bats (Primary Volume)
      { key: 'stats.batting.atBats', label: 'AB', format: (val) => val || 0 },
      
      // Traditional Triple Slash
      { key: 'stats.batting.avg', label: 'AVG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.obp', label: 'OBP', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.slg', label: 'SLG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.ops', label: 'OPS', format: (val) => val?.toFixed(3) || '---' },
      
      // Power Metrics
      { key: 'stats.batting.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.batting.iso', label: 'ISO', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.extraBaseHits', label: 'XBH', format: (val) => val || 0 },
      { key: 'stats.batting.extraBaseHitRate', label: 'XBH%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.atBatsPerHomeRun', label: 'AB/HR', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.batting.powerSpeed', label: 'PWR/SPD', format: (val) => val?.toFixed(1) || '---' },
      
      // Plate Discipline
      { key: 'stats.batting.kRate', label: 'K%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.bbRate', label: 'BB%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.contactRate', label: 'Contact%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      { key: 'stats.batting.walkToStrikeoutRatio', label: 'BB/K', format: (val) => val && val < 999 ? val.toFixed(2) : val > 0 ? '∞' : '---' },
      
      // Advanced Sabermetrics
      { key: 'stats.batting.wOBA', label: 'wOBA', format: (val) => val?.toFixed(3) || '---' },
      { key: 'stats.batting.babip', label: 'BABIP', format: (val) => val?.toFixed(3) || '---' },
      
      // Speed Metrics
      { key: 'stats.batting.stolenBases', label: 'SB', format: (val) => val || 0 },
      { key: 'stats.batting.stolenBasePercentage', label: 'SB%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Traditional Counting Stats
      { key: 'stats.batting.rbi', label: 'RBI', format: (val) => val || 0 },
      { key: 'stats.batting.runs', label: 'R', format: (val) => val || 0 },
      { key: 'stats.batting.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.batting.doubles', label: '2B', format: (val) => val || 0 },
      { key: 'stats.batting.triples', label: '3B', format: (val) => val || 0 },
      { key: 'stats.batting.plateAppearances', label: 'PA', format: (val) => val || 0 },
      { key: 'stats.batting.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'stats.batting.strikeOuts', label: 'K', format: (val) => val || 0 },
      { key: 'stats.batting.hitByPitch', label: 'HBP', format: (val) => val || 0 },
      { key: 'stats.batting.groundOutsToAirouts', label: 'GO/AO', format: (val) => val?.toFixed(2) || '---' },
      
      // Advanced Metrics Last
      { key: 'gameCount', label: 'Games', format: (val) => val || 0 },
      { key: 'war', label: 'WAR', format: (val) => val ? val.toFixed(1) : '0.0' },
      { key: 'cvr', label: 'CVR', format: (val) => {
        if (!val) return '0.00';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }}
    ],
    pitching: [
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
      { key: 'stats.pitching.leftOnBase', label: 'LOB', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Strikeout Metrics
      { key: 'stats.pitching.strikeoutWalkRatio', label: 'K/BB', format: (val) => val && val < 999 ? val.toFixed(2) : val > 0 ? '∞' : '---' },
      { key: 'stats.pitching.strikeoutsPer9Inn', label: 'K/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.walksPer9Inn', label: 'BB/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.hitsPer9Inn', label: 'H/9', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.homeRunsPer9', label: 'HR/9', format: (val) => val?.toFixed(1) || '---' },
      
      // Efficiency Metrics
      { key: 'stats.pitching.pitchesPerInning', label: 'P/IP', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.pitchesPerBatter', label: 'P/BF', format: (val) => val?.toFixed(1) || '---' },
      { key: 'stats.pitching.strikePercentage', label: 'Strike%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Game Performance
      { key: 'stats.pitching.gameScore', label: 'GameScore', format: (val) => val?.toFixed(0) || '---' },
      { key: 'stats.pitching.qualityStart', label: 'QS', format: (val) => val || 0 },
      { key: 'stats.pitching.runsScoredPer9', label: 'R/9', format: (val) => val?.toFixed(2) || '---' },
      
      // Relief Metrics
      { key: 'stats.pitching.holds', label: 'HLD', format: (val) => val || 0 },
      { key: 'stats.pitching.saves', label: 'SV', format: (val) => val || 0 },
      { key: 'stats.pitching.blownSaves', label: 'BSV', format: (val) => val || 0 },
      { key: 'stats.pitching.savePercentage', label: 'SV%', format: (val) => val ? (val * 100).toFixed(1) + '%' : '---' },
      
      // Traditional Counting Stats
      { key: 'stats.pitching.wins', label: 'W', format: (val) => val || 0 },
      { key: 'stats.pitching.losses', label: 'L', format: (val) => val || 0 },
      { key: 'stats.pitching.strikeOuts', label: 'K', format: (val) => val || 0 },
      { key: 'stats.pitching.baseOnBalls', label: 'BB', format: (val) => val || 0 },
      { key: 'stats.pitching.hits', label: 'H', format: (val) => val || 0 },
      { key: 'stats.pitching.earnedRuns', label: 'ER', format: (val) => val || 0 },
      { key: 'stats.pitching.homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'stats.pitching.battersFaced', label: 'BF', format: (val) => val || 0 },
      { key: 'stats.pitching.groundOutsToAirouts', label: 'GO/AO', format: (val) => val?.toFixed(2) || '---' },
      
      // Advanced Metrics Last
      { key: 'gameCount', label: 'Games', format: (val) => val || 0 },
      { key: 'war', label: 'WAR', format: (val) => val ? val.toFixed(1) : '0.0' },
      { key: 'cvr', label: 'CVR', format: (val) => {
        if (!val) return '0.00';
        const display = getCVRDisplay(val);
        return `${display.value} ${display.emoji}`;
      }}
    ]
  };

  const currentStats = statConfigs[activeCategory] || [];

  if (loading) {
    return <PlayersSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error loading players: {error}
        </Typography>
        <Button 
          startIcon={<Refresh />} 
          onClick={loadPlayers}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Player Statistics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive player performance data for the {new Date().getFullYear()} season
        </Typography>
      </Box>

      {/* Controls */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Category Tabs */}
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={activeCategory}
              onChange={(_, newValue) => {
                setActiveCategory(newValue);
                setPage(0); // Reset to first page when changing category
              }}
              sx={{
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 600
                }
              }}
            >
              {availableTabs.map((tab) => (
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

          {/* Search and Filters */}
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search players or teams... (real-time)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputRef={searchInputRef}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchLoading && searchTerm ? (
                    <InputAdornment position="end">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                          Searching...
                        </Typography>
                      </Box>
                    </InputAdornment>
                  ) : null
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                    }
                  }
                }}
              />
            </Grid>

            {/* Team Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Teams</InputLabel>
                <Select
                  multiple
                  value={selectedTeams}
                  onChange={(e) => setSelectedTeams(e.target.value)}
                  input={<OutlinedInput label="Teams" />}
                  renderValue={(selected) => 
                    selected.length === 0 ? 'All Teams' : 
                    selected.length === 1 ? selected[0] :
                    `${selected.length} teams`
                  }
                >
                  {teams.map((team) => (
                    <MenuItem key={team} value={team}>
                      <Checkbox checked={selectedTeams.indexOf(team) > -1} />
                      <ListItemText primary={team} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setShowCustomDateDialog(true);
                    } else {
                      setDateRange(value);
                    }
                  }}
                  label="Date Range"
                >
                  <MenuItem value="all">Full Season</MenuItem>
                  <Divider />
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="last1">Last 1 Day</MenuItem>
                  <MenuItem value="last3">Last 3 Days</MenuItem>
                  <MenuItem value="last7">Last 7 Days</MenuItem>
                  <MenuItem value="last14">Last 14 Days</MenuItem>
                  <MenuItem value="last30">Last 30 Days</MenuItem>
                  <Divider />
                  <MenuItem value="thisWeek">This Week</MenuItem>
                  <MenuItem value="thisMonth">This Month</MenuItem>
                  <MenuItem value="august">August 2025</MenuItem>
                  <Divider />
                  <MenuItem value="custom">Custom Range...</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Games/IP Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel shrink>
                  {activeCategory === 'batting' ? 'Min Games' : 'Min IP'}
                </InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Checkbox
                    checked={gamesIpFilterEnabled}
                    onChange={e => setGamesIpFilterEnabled(e.target.checked)}
                    size="small"
                    sx={{ p: 0.5 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={activeCategory === 'batting' ? minGames : minInnings}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value));
                      if (activeCategory === 'batting') setMinGames(val);
                      else setMinInnings(val);
                    }}
                    inputProps={{ min: 0, step: 1 }}
                    disabled={!gamesIpFilterEnabled}
                    sx={{ 
                      width: 80,
                      '& .MuiInputBase-input': { 
                        textAlign: 'center',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  {currentStats.map((stat) => (
                    <MenuItem key={stat.key} value={stat.key}>
                      {stat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* View Mode and Controls */}
            <Grid item xs={12} md={1}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <IconButton
                  onClick={() => setViewMode('table')}
                  color={viewMode === 'table' ? 'primary' : 'default'}
                  title="Table View"
                  size="small"
                >
                  <ViewList />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode('cards')}
                  color={viewMode === 'cards' ? 'primary' : 'default'}
                  title="Card View"
                  size="small"
                >
                  <ViewModule />
                </IconButton>
                <IconButton 
                  onClick={loadPlayers}
                  title="Refresh Data"
                  size="small"
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {/* Secondary Row - Clear Filters Only */}
          <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {(searchTerm || selectedTeams.length > 0 || dateRange !== 'all' || gamesIpFilterEnabled) && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTeams([]);
                      setDateRange('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setGamesIpFilterEnabled(false);
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Results Summary with Real-time Status */}
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {paginatedPlayers.length} of {categoryFilteredPlayers.length} players
                {searchTerm && ` for "${searchTerm}"`}
                {selectedTeams.length > 0 && ` • ${selectedTeams.length} team(s) selected`}
                {dateRange !== 'all' && ` • ${getDateRangeDescription()}`}
                {gamesIpFilterEnabled && activeCategory === 'batting' && ` • Min ${minGames} games`}
                {gamesIpFilterEnabled && activeCategory === 'pitching' && ` • Min ${minInnings} IP`}
              </Typography>
              {searchLoading && (
                <Chip 
                  label="Updating..." 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 'auto' }}
                />
              )}
              {!searchLoading && !loading && (searchTerm || selectedTeams.length > 0 || dateRange !== 'all' || gamesIpFilterEnabled) && (
                <Chip 
                  label="Filters Active" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Players Display */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayersTable 
              players={paginatedPlayers}
              stats={currentStats}
              sortBy={sortBy}
              sortOrder={sortOrder}
              selectedStatGroup={selectedStatGroup}
              onStatGroupChange={setSelectedStatGroup}
              onSort={(field) => {
                if (field === sortBy) {
                  // Toggle sort order if clicking the same field
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  // Set new field and default to desc (high to low)
                  setSortBy(field);
                  setSortOrder('desc');
                }
              }}
              onPlayerClick={(player) => navigate(`/players/${player.team}/${player.name.replace(/\s+/g, '_')}/${new Date().getFullYear()}`)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayersGrid 
              players={paginatedPlayers}
              stats={currentStats}
              onPlayerClick={(player) => navigate(`/players/${player.team}/${player.name.replace(/\s+/g, '_')}/${new Date().getFullYear()}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <Card elevation={0} sx={{ mt: 3 }}>
        <TablePagination
          component="div"
          count={categoryFilteredPlayers.length}
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
                max: format(new Date(), 'yyyy-MM-dd'), // Can't select future dates
                min: '2025-03-01' // Start of 2025 season
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
                max: format(new Date(), 'yyyy-MM-dd'), // Can't select future dates
                min: customStartDate || '2025-03-01' // Can't be before start date
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

// Players table component with comprehensive stats display
const PlayersTable = ({ players, stats, sortBy, sortOrder, selectedStatGroup, onStatGroupChange, onSort, onPlayerClick }) => {
  const theme = useTheme();

  // Helper function to render sortable column header
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
        onClick={() => onSort(stat.key)}
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

  // Group stats into logical categories
  const statGroups = {
    batting: {
      primary: stats.slice(0, 9), // AB, AVG, OBP, SLG, OPS, HR, ISO, XBH, XBH%
      power: stats.slice(5, 13), // HR, ISO, XBH, XBH%, AB/HR, PWR/SPD, SB, SB%
      discipline: stats.slice(11, 19), // K%, BB%, Contact%, BB/K, wOBA, BABIP, SB, SB%
      counting: stats.slice(19, 31), // RBI, R, H, 2B, 3B, PA, BB, K, HBP, GO/AO
    },
    pitching: {
      primary: stats.slice(0, 9), // IP, ERA, WHIP, WIN%, FIP, xFIP, BABIP, LOB%, LOB
      sabermetrics: stats.slice(4, 12), // FIP, xFIP, BABIP, LOB%, LOB, K/BB, K/9, BB/9
      efficiency: stats.slice(12, 20), // H/9, HR/9, P/IP, P/BF, Strike%, GameScore, QS, R/9
      relief: stats.slice(20, 24), // HLD, SV, BSV, SV%
      counting: stats.slice(24, 36), // W, L, K, BB, H, ER, HR, BF, GO/AO
    }
  };

  const activeCategory = stats.some(s => s.key.includes('batting')) ? 'batting' : 'pitching';
  const currentGroups = statGroups[activeCategory];
  
  // Determine which stats to show based on selected group
  let currentStats;
  if (selectedStatGroup === 'all') {
    currentStats = stats; // Show all stats when 'all' is selected
  } else {
    currentStats = currentGroups[selectedStatGroup] || stats.slice(0, 8);
  }

  return (
    <Card elevation={0}>
      {/* Stat Group Selector */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Object.entries(currentGroups).map(([groupKey, groupStats]) => (
            <Chip
              key={groupKey}
              label={groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}
              variant={selectedStatGroup === groupKey ? 'filled' : 'outlined'}
              color={selectedStatGroup === groupKey ? 'primary' : 'default'}
              onClick={() => onStatGroupChange(groupKey)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
          <Chip
            label="All Stats"
            variant={selectedStatGroup === 'all' ? 'filled' : 'outlined'}
            color={selectedStatGroup === 'all' ? 'primary' : 'default'}
            onClick={() => onStatGroupChange('all')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: 'background.paper',
                  zIndex: 1100,
                  minWidth: 200
                }}
              >
                Player
              </TableCell>
              <TableCell 
                align="center"
                sx={{ 
                  position: 'sticky', 
                  left: 200, 
                  backgroundColor: 'background.paper',
                  zIndex: 1100,
                  minWidth: 80
                }}
              >
                Team
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  minWidth: 60,
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
                onClick={() => onSort('gameCount')}
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
              {currentStats.map((stat) => renderSortableHeader(stat))}
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((player, index) => (
              <TableRow
                key={`${player.name}-${index}`}
                hover
                onClick={() => onPlayerClick(player)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell
                  sx={{ 
                    position: 'sticky', 
                    left: 0, 
                    backgroundColor: 'background.paper',
                    zIndex: 1000
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: themeUtils.getTeamColor(player.team) || '#1976d2',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {player.team}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {player.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    position: 'sticky', 
                    left: 200, 
                    backgroundColor: 'background.paper',
                    zIndex: 1000
                  }}
                >
                  <Chip
                    label={player.team}
                    size="small"
                    sx={{
                      backgroundColor: themeUtils.getTeamColor(player.team) || '#1976d2',
                      color: '#ffffff',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>
                    {player.gameCount || 0}
                  </Typography>
                </TableCell>
                {currentStats.map((stat) => {
                  const value = getNestedValue(player, stat.key);
                  const formattedValue = stat.format(value);
                  const color = themeUtils.getStatColor(value, stat.key.split('.').pop(), theme);
                  
                  return (
                    <TableCell key={stat.key} align="center">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ 
                          color: color !== 'inherit' ? color : 'text.primary'
                        }}
                      >
                        {formattedValue}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

// Players grid component
const PlayersGrid = ({ players, stats, onPlayerClick }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {players.map((player, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={`${player.name}-${index}`}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              elevation={0}
              sx={{
                height: '100%',
                cursor: 'pointer',
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                }
              }}
              onClick={() => onPlayerClick(player)}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Player Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      backgroundColor: themeUtils.getTeamColor(player.team) || '#1976d2',
                      mr: 2,
                      fontWeight: 700
                    }}
                  >
                    {player.team}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {player.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        #{player.jerseyNumber || '---'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Key Stats */}
                <Grid container spacing={1}>
                  {stats.slice(0, 4).map((stat) => (
                    <Grid item xs={6} key={stat.key}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {stat.label}
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{
                            color: themeUtils.getStatColor(
                              getNestedValue(player, stat.key),
                              stat.key.split('.').pop(),
                              theme
                            )
                          }}
                        >
                          {stat.format(getNestedValue(player, stat.key))}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Games Played */}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Chip
                    label={`${player.gameCount || 0} Games`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
};

// Loading skeleton
const PlayersSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={200} height={50} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={400} height={30} sx={{ mb: 4 }} />
      
      <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
      
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Players;
