import React, { useState, useEffect, useMemo } from 'react';
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
  Skeleton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Search,
  Groups,
  Sports,
  TrendingUp,
  TrendingDown,
  Refresh,
  Star,
  Assessment,
  EmojiEvents,
  Timeline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// API and utils
import { teamsApi, statsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';

const Teams = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'standings', 'stats'
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedLeague, setSelectedLeague] = useState('all');

  // Available divisions and leagues
  const divisions = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'];
  const leagues = ['AL', 'NL'];

  useEffect(() => {
    loadTeamsData();
  }, []);

  const loadTeamsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsResponse, standingsResponse] = await Promise.all([
        teamsApi.getTeams(),
        teamsApi.getStandings()
      ]);

      setTeams(teamsResponse.teams || []);
      setStandings(standingsResponse.standings || []);
    } catch (err) {
      console.error('Error loading teams data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams
  const filteredTeams = useMemo(() => {
    let filtered = [...teams];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(term) ||
        team.abbreviation.toLowerCase().includes(term) ||
        team.city.toLowerCase().includes(term)
      );
    }

    // Division filter
    if (selectedDivision !== 'all') {
      filtered = filtered.filter(team => team.division === selectedDivision);
    }

    // League filter
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(team => team.league === selectedLeague);
    }

    return filtered;
  }, [teams, searchTerm, selectedDivision, selectedLeague]);

  // Group standings by division
  const standingsByDivision = useMemo(() => {
    const grouped = {};
    standings.forEach(team => {
      if (!grouped[team.division]) {
        grouped[team.division] = [];
      }
      grouped[team.division].push(team);
    });
    
    // Sort each division by wins
    Object.keys(grouped).forEach(division => {
      grouped[division].sort((a, b) => (b.wins || 0) - (a.wins || 0));
    });
    
    return grouped;
  }, [standings]);

  // Tab configuration
  const tabs = [
    { value: 'overview', label: 'Team Overview', icon: <Groups /> },
    { value: 'standings', label: 'Standings', icon: <EmojiEvents /> },
    { value: 'stats', label: 'Team Stats', icon: <Assessment /> }
  ];

  if (loading) {
    return <TeamsSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error loading teams: {error}
        </Typography>
        <Button 
          startIcon={<Refresh />} 
          onClick={loadTeamsData}
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
          Team Center
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete team information, standings, and performance analytics
        </Typography>
      </Box>

      {/* Controls */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* View Tabs */}
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={activeView}
              onChange={(_, newValue) => setActiveView(newValue)}
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>League</InputLabel>
                <Select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  label="League"
                >
                  <MenuItem value="all">All Leagues</MenuItem>
                  {leagues.map((league) => (
                    <MenuItem key={league} value={league}>
                      {league}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Division</InputLabel>
                <Select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  label="Division"
                >
                  <MenuItem value="all">All Divisions</MenuItem>
                  {divisions.map((division) => (
                    <MenuItem key={division} value={division}>
                      {division}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton onClick={loadTeamsData}>
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {/* Results Summary */}
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary">
              {activeView === 'overview' && `Showing ${filteredTeams.length} teams`}
              {activeView === 'standings' && `${standings.length} teams in standings`}
              {searchTerm && ` matching "${searchTerm}"`}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TeamsOverview teams={filteredTeams} onTeamClick={(team) => navigate(`/teams/${team.id}`)} />
          </motion.div>
        )}

        {activeView === 'standings' && (
          <motion.div
            key="standings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StandingsView standings={standingsByDivision} onTeamClick={(team) => navigate(`/teams/${team.id}`)} />
          </motion.div>
        )}

        {activeView === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TeamStatsView teams={filteredTeams} onTeamClick={(team) => navigate(`/teams/${team.id}`)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

// Teams overview component
const TeamsOverview = ({ teams, onTeamClick }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {teams.map((team) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={team.id}>
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
                  borderColor: themeUtils.getTeamColor(team.abbreviation),
                  boxShadow: `0 4px 12px ${alpha(themeUtils.getTeamColor(team.abbreviation), 0.15)}`
                }
              }}
              onClick={() => onTeamClick(team)}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Team Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      backgroundColor: themeUtils.getTeamColor(team.abbreviation),
                      mr: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700
                    }}
                  >
                    {team.abbreviation}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {team.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.city}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Team Info */}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={team.division}
                    size="small"
                    sx={{
                      backgroundColor: alpha(themeUtils.getTeamColor(team.abbreviation), 0.1),
                      color: themeUtils.getTeamColor(team.abbreviation),
                      fontWeight: 600,
                      mb: 1
                    }}
                  />
                </Box>

                {/* Quick Stats */}
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Players
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {team.playerCount || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Record
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {team.wins || 0}-{team.losses || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Pct
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {team.winPercentage ? team.winPercentage.toFixed(3) : '---'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
};

// Standings view component
const StandingsView = ({ standings, onTeamClick }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {Object.entries(standings).map(([division, teams]) => (
        <Grid item xs={12} lg={6} key={division}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                {division}
              </Typography>

              <List>
                {teams.map((team, index) => (
                  <React.Fragment key={team.id}>
                    <ListItem
                      onClick={() => onTeamClick(team)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: alpha(themeUtils.getTeamColor(team.abbreviation), 0.05)
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{
                              color: index === 0 ? theme.palette.warning.main : 'text.secondary',
                              mr: 2
                            }}
                          >
                            {index + 1}
                          </Typography>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              backgroundColor: themeUtils.getTeamColor(team.abbreviation),
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            {team.abbreviation}
                          </Avatar>
                        </Box>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1" fontWeight={600}>
                              {team.name}
                            </Typography>
                            {index === 0 && <Star sx={{ color: theme.palette.warning.main, fontSize: 16 }} />}
                          </Box>
                        }
                        secondary={`${team.wins || 0}-${team.losses || 0} • ${team.gamesBack > 0 ? `${team.gamesBack} GB` : 'Leader'}`}
                      />

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={700}>
                          {team.winPercentage ? team.winPercentage.toFixed(3) : '---'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {team.streak > 0 ? (
                            <TrendingUp sx={{ color: theme.palette.success.main, fontSize: 16, mr: 0.5 }} />
                          ) : (
                            <TrendingDown sx={{ color: theme.palette.error.main, fontSize: 16, mr: 0.5 }} />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {Math.abs(team.streak || 0)}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                    {index < teams.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Team stats view component
const TeamStatsView = ({ teams, onTeamClick }) => {
  const theme = useTheme();

  // Calculate team averages and leaders
  const teamStats = teams.map(team => {
    const battingAvg = team.stats?.batting?.avg || 0;
    const homeRuns = team.stats?.batting?.homeRuns || 0;
    const era = team.stats?.pitching?.era || 0;
    const wins = team.wins || 0;

    return {
      ...team,
      battingAvg,
      homeRuns,
      era,
      wins
    };
  });

  // Sort by different stats
  const topBattingAvg = [...teamStats].sort((a, b) => b.battingAvg - a.battingAvg).slice(0, 5);
  const topHomeRuns = [...teamStats].sort((a, b) => b.homeRuns - a.homeRuns).slice(0, 5);
  const topERA = [...teamStats].sort((a, b) => a.era - b.era).slice(0, 5);
  const topWins = [...teamStats].sort((a, b) => b.wins - a.wins).slice(0, 5);

  const statCategories = [
    { title: 'Team Batting Average', teams: topBattingAvg, stat: 'battingAvg', format: (val) => val.toFixed(3) },
    { title: 'Team Home Runs', teams: topHomeRuns, stat: 'homeRuns', format: (val) => val.toString() },
    { title: 'Team ERA (Best)', teams: topERA, stat: 'era', format: (val) => val.toFixed(2) },
    { title: 'Most Wins', teams: topWins, stat: 'wins', format: (val) => val.toString() }
  ];

  return (
    <Grid container spacing={3}>
      {statCategories.map((category, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                {category.title}
              </Typography>

              <List>
                {category.teams.map((team, rank) => (
                  <React.Fragment key={team.id}>
                    <ListItem
                      onClick={() => onTeamClick(team)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: alpha(themeUtils.getTeamColor(team.abbreviation), 0.05)
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{
                              color: rank === 0 ? theme.palette.warning.main : 'text.secondary',
                              mr: 2
                            }}
                          >
                            {rank + 1}
                          </Typography>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: themeUtils.getTeamColor(team.abbreviation),
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            {team.abbreviation}
                          </Avatar>
                        </Box>
                      </ListItemAvatar>

                      <ListItemText
                        primary={team.name}
                        secondary={`${team.wins || 0}-${team.losses || 0}`}
                      />

                      <Typography variant="h6" fontWeight={700} color="primary">
                        {category.format(team[category.stat])}
                      </Typography>
                    </ListItem>
                    {rank < category.teams.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Loading skeleton
const TeamsSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={200} height={50} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={400} height={30} sx={{ mb: 4 }} />
      
      <Skeleton variant="rectangular" height={150} sx={{ mb: 3, borderRadius: 2 }} />
      
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Teams;
