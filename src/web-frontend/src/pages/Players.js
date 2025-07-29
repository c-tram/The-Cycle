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
  Divider
} from '@mui/material';
import {
  Search,
  Person,
  Sports,
  Refresh,
  ViewList,
  ViewModule
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// API and utils
import { playersApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';

const Players = () => {
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
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('batting');
  const [sortBy, setSortBy] = useState('avg');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // View options
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Available teams and positions
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    loadPlayers();
    loadFilterOptions();
  }, [activeCategory, sortBy, sortOrder]);

  // Real-time search and filter effect
  useEffect(() => {
    setPage(0); // Reset to first page when filters change
    
    // Debounce the search to avoid too many API calls
    const searchTimeout = setTimeout(() => {
      if (searchTerm || selectedTeams.length > 0 || selectedPositions.length > 0) {
        // Only show search loading for subsequent searches, not initial load
        setSearchLoading(true);
        loadPlayers().finally(() => setSearchLoading(false));
      } else {
        loadPlayers();
      }
    }, 300); // 300ms delay

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, selectedTeams, selectedPositions]);

  // Debounced API call for real-time search
  const loadPlayers = useCallback(async () => {
    try {
      // Only show main loading for initial load or category changes
      if (!searchTerm && selectedTeams.length === 0 && selectedPositions.length === 0) {
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

      // Add position filter if selected
      if (selectedPositions.length === 1) {
        apiParams.position = selectedPositions[0];
      }

      const response = await playersApi.getPlayers(apiParams);
      setPlayers(response.players || []);
    } catch (err) {
      console.error('Error loading players:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy, sortOrder, selectedTeams, selectedPositions, searchTerm]);

  const loadFilterOptions = async () => {
    try {
      // Extract unique teams and positions from players
      if (players.length > 0) {
        const uniqueTeams = [...new Set(players.map(p => p.player.team))].sort();
        const uniquePositions = [...new Set(players.map(p => p.player.position).filter(Boolean))].sort();
        
        setTeams(uniqueTeams);
        setPositions(uniquePositions);
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  // Filter and sort players with real-time search
  const filteredPlayers = useMemo(() => {
    let filtered = [...players];

    // Real-time search filter (applied to already loaded data)
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(player =>
        player.player.name.toLowerCase().includes(term) ||
        player.player.team.toLowerCase().includes(term)
      );
    }

    // Team filter (handled by API for single team, client-side for multiple)
    if (selectedTeams.length > 1) {
      filtered = filtered.filter(player =>
        selectedTeams.includes(player.player.team)
      );
    }

    // Position filter (handled by API for single position, client-side for multiple)
    if (selectedPositions.length > 1) {
      filtered = filtered.filter(player =>
        selectedPositions.includes(player.player.position)
      );
    }

    return filtered;
  }, [players, searchTerm, selectedTeams, selectedPositions]);

  // Paginated players
  const paginatedPlayers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPlayers, page, rowsPerPage]);

  // Tab configuration
  const tabs = [
    { value: 'batting', label: 'Batting', icon: <Sports /> },
    { value: 'pitching', label: 'Pitching', icon: <Person /> }
  ];

  // Stat configurations
  const statConfigs = {
    batting: [
      { key: 'avg', label: 'AVG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'obp', label: 'OBP', format: (val) => val?.toFixed(3) || '---' },
      { key: 'slg', label: 'SLG', format: (val) => val?.toFixed(3) || '---' },
      { key: 'ops', label: 'OPS', format: (val) => val?.toFixed(3) || '---' },
      { key: 'homeRuns', label: 'HR', format: (val) => val || 0 },
      { key: 'rbi', label: 'RBI', format: (val) => val || 0 },
      { key: 'runs', label: 'R', format: (val) => val || 0 },
      { key: 'hits', label: 'H', format: (val) => val || 0 },
      { key: 'atBats', label: 'AB', format: (val) => val || 0 }
    ],
    pitching: [
      { key: 'era', label: 'ERA', format: (val) => val?.toFixed(2) || '---' },
      { key: 'whip', label: 'WHIP', format: (val) => val?.toFixed(2) || '---' },
      { key: 'wins', label: 'W', format: (val) => val || 0 },
      { key: 'losses', label: 'L', format: (val) => val || 0 },
      { key: 'saves', label: 'SV', format: (val) => val || 0 },
      { key: 'strikeouts', label: 'K', format: (val) => val || 0 },
      { key: 'walks', label: 'BB', format: (val) => val || 0 },
      { key: 'inningsPitched', label: 'IP', format: (val) => val?.toFixed(1) || '---' },
      { key: 'hits', label: 'H', format: (val) => val || 0 }
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
              onChange={(_, newValue) => setActiveCategory(newValue)}
              sx={{
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

          {/* Search and Filters */}
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
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

            {/* Position Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Positions</InputLabel>
                <Select
                  multiple
                  value={selectedPositions}
                  onChange={(e) => setSelectedPositions(e.target.value)}
                  input={<OutlinedInput label="Positions" />}
                  renderValue={(selected) => 
                    selected.length === 0 ? 'All Positions' : 
                    selected.length === 1 ? selected[0] :
                    `${selected.length} positions`
                  }
                >
                  {positions.map((position) => (
                    <MenuItem key={position} value={position}>
                      <Checkbox checked={selectedPositions.indexOf(position) > -1} />
                      <ListItemText primary={position} />
                    </MenuItem>
                  ))}
                </Select>
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

            {/* View Mode */}
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={() => setViewMode('table')}
                  color={viewMode === 'table' ? 'primary' : 'default'}
                  title="Table View"
                >
                  <ViewList />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode('cards')}
                  color={viewMode === 'cards' ? 'primary' : 'default'}
                  title="Card View"
                >
                  <ViewModule />
                </IconButton>
                <IconButton 
                  onClick={loadPlayers}
                  title="Refresh Data"
                >
                  <Refresh />
                </IconButton>
                {(searchTerm || selectedTeams.length > 0 || selectedPositions.length > 0) && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTeams([]);
                      setSelectedPositions([]);
                    }}
                    sx={{ ml: 1, minWidth: 'auto' }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Results Summary with Real-time Status */}
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {paginatedPlayers.length} of {filteredPlayers.length} players
                {searchTerm && ` for "${searchTerm}"`}
                {selectedTeams.length > 0 && ` • ${selectedTeams.length} team(s) selected`}
                {selectedPositions.length > 0 && ` • ${selectedPositions.length} position(s) selected`}
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
              {!searchLoading && !loading && (searchTerm || selectedTeams.length > 0 || selectedPositions.length > 0) && (
                <Chip 
                  label="Live Search Active" 
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
              onPlayerClick={(player) => navigate(`/players/${player.player.id}`)}
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
              onPlayerClick={(player) => navigate(`/players/${player.player.id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <Card elevation={0} sx={{ mt: 3 }}>
        <TablePagination
          component="div"
          count={filteredPlayers.length}
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
    </Box>
  );
};

// Players table component
const PlayersTable = ({ players, stats, onPlayerClick }) => {
  const theme = useTheme();

  return (
    <Card elevation={0}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Player</TableCell>
              <TableCell align="center">Team</TableCell>
              <TableCell align="center">Pos</TableCell>
              <TableCell align="center">G</TableCell>
              {stats.slice(0, 6).map((stat) => (
                <TableCell key={stat.key} align="center">
                  {stat.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((player, index) => (
              <TableRow
                key={`${player.player.id}-${index}`}
                hover
                onClick={() => onPlayerClick(player)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: themeUtils.getTeamColor(player.player.team),
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {player.player.team}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {player.player.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{player.player.jerseyNumber || '---'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={player.player.team}
                    size="small"
                    sx={{
                      backgroundColor: themeUtils.getTeamColor(player.player.team),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {player.player.position || '---'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>
                    {player.games || 0}
                  </Typography>
                </TableCell>
                {stats.slice(0, 6).map((stat) => (
                  <TableCell key={stat.key} align="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: themeUtils.getStatColor(
                          player[stat.key],
                          stat.key,
                          players.map(p => p[stat.key]).filter(Boolean)
                        )
                      }}
                    >
                      {stat.format(player[stat.key])}
                    </Typography>
                  </TableCell>
                ))}
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
        <Grid item xs={12} sm={6} md={4} lg={3} key={`${player.player.id}-${index}`}>
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
                      backgroundColor: themeUtils.getTeamColor(player.player.team),
                      mr: 2,
                      fontWeight: 700
                    }}
                  >
                    {player.player.team}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {player.player.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        #{player.player.jerseyNumber || '---'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • {player.player.position || 'N/A'}
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
                              player[stat.key],
                              stat.key,
                              players.map(p => p[stat.key]).filter(Boolean)
                            )
                          }}
                        >
                          {stat.format(player[stat.key])}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Games Played */}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Chip
                    label={`${player.games || 0} Games`}
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
