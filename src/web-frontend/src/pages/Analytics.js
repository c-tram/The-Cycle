import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  useTheme
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  Compare,
  Timeline,
  Assessment,
  FilterList
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { playersApi, statsApi, teamsApi } from '../services/apiService';

const Analytics = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Player Analytics State
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [playerOptions, setPlayerOptions] = useState([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [playerSplits, setPlayerSplits] = useState(null);
  const [playerTrends, setPlayerTrends] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);

  // Team Analytics State
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamOptions, setTeamOptions] = useState([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [teamSchedule, setTeamSchedule] = useState(null);

  // Comparison State
  const [comparisonPlayers, setComparisonPlayers] = useState([null, null]);
  const [comparisonData, setComparisonData] = useState(null);

  // Leaders State
  const [leaderCategory, setLeaderCategory] = useState('batting');
  const [leaderStat, setLeaderStat] = useState('avg');
  const [leaders, setLeaders] = useState([]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setData(null);
  };

  // Search functions for autocomplete
  const searchPlayers = async (query) => {
    if (!query || query.length < 2) {
      setPlayerOptions([]);
      return;
    }
    
    setPlayerSearchLoading(true);
    try {
      const response = await playersApi.searchPlayers(query, { limit: 20 });
      const options = response.players?.map(player => ({
        id: player.id,
        label: `${player.name} (${player.team}) - ${player.position}`,
        value: player.id,
        name: player.name,
        team: player.team,
        position: player.position
      })) || [];
      setPlayerOptions(options);
    } catch (error) {
      console.error('Error searching players:', error);
      setPlayerOptions([]);
    } finally {
      setPlayerSearchLoading(false);
    }
  };

  const searchTeams = async (query) => {
    if (!query || query.length < 1) {
      setTeamOptions([]);
      return;
    }
    
    setTeamSearchLoading(true);
    try {
      const response = await teamsApi.getTeams();
      const filteredTeams = response.teams?.filter(team => 
        team.name?.toLowerCase().includes(query.toLowerCase()) ||
        team.id?.toLowerCase().includes(query.toLowerCase())
      ) || [];
      
      const options = filteredTeams.map(team => ({
        id: team.id,
        label: `${team.name} (${team.id})`,
        value: team.id,
        name: team.name
      }));
      setTeamOptions(options);
    } catch (error) {
      console.error('Error searching teams:', error);
      setTeamOptions([]);
    } finally {
      setTeamSearchLoading(false);
    }
  };

  const loadPlayerAnalytics = async () => {
    if (!selectedPlayer) return;
    
    setLoading(true);
    try {
      const playerId = typeof selectedPlayer === 'object' ? selectedPlayer.id : selectedPlayer;
      const [splits, advanced] = await Promise.all([
        playersApi.getPlayerSplits(playerId).catch(() => null),
        statsApi.getAdvancedPlayerStats(playerId).catch(() => null)
      ]);
      
      setPlayerSplits(splits);
      setAdvancedStats(advanced);
    } catch (err) {
      setError('Failed to load player analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAnalytics = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    try {
      const teamId = typeof selectedTeam === 'object' ? selectedTeam.id : selectedTeam;
      const [teamData, schedule] = await Promise.all([
        teamsApi.getTeam(teamId, { includeRoster: 'true' }).catch(() => null),
        teamsApi.getTeamSchedule(teamId, { limit: 20 }).catch(() => null)
      ]);
      
      setTeamAnalytics(teamData);
      setTeamSchedule(schedule);
    } catch (err) {
      setError('Failed to load team analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    const validPlayers = comparisonPlayers
      .map(p => typeof p === 'object' ? p.id : p)
      .filter(p => p && p.trim());
    if (validPlayers.length < 2) return;
    
    setLoading(true);
    try {
      const comparison = await playersApi.comparePlayers(validPlayers).catch(() => null);
      setComparisonData(comparison);
    } catch (err) {
      setError('Failed to load player comparison');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaders = async () => {
    setLoading(true);
    try {
      const leadersData = await statsApi.getLeaders({
        category: leaderCategory,
        stat: leaderStat,
        limit: 20
      });
      setLeaders(leadersData.leaders || []);
    } catch (err) {
      setError('Failed to load leaders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 3) { // Leaders tab
      loadLeaders();
    }
  }, [activeTab, leaderCategory, leaderStat]);

  const tabs = [
    { label: 'Player Analytics', icon: <AnalyticsIcon /> },
    { label: 'Team Analytics', icon: <Assessment /> },
    { label: 'Player Comparison', icon: <Compare /> },
    { label: 'League Leaders', icon: <TrendingUp /> }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AnalyticsIcon color="primary" />
        Advanced Analytics
      </Typography>

      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              label={tab.label} 
              icon={tab.icon} 
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Player Analytics Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Select Player
                  </Typography>
                  <Autocomplete
                    fullWidth
                    options={playerOptions}
                    value={selectedPlayer}
                    onChange={(event, newValue) => setSelectedPlayer(newValue)}
                    onInputChange={(event, newInputValue) => {
                      if (newInputValue !== (selectedPlayer?.label || '')) {
                        searchPlayers(newInputValue);
                      }
                    }}
                    loading={playerSearchLoading}
                    loadingText="Searching players..."
                    noOptionsText="No players found. Try typing a name or team."
                    getOptionLabel={(option) => option?.label || ''}
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search for player (name, team, position)"
                        placeholder="e.g., Aaron Judge, NYY, Pitcher"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {playerSearchLoading ? <LinearProgress /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.team} • {option.position}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={loadPlayerAnalytics}
                    disabled={!selectedPlayer || loading}
                    fullWidth
                  >
                    Analyze Player
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              {advancedStats && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Advanced Player Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Games</Typography>
                        <Typography variant="h6">{advancedStats.gameCount}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Batting Avg</Typography>
                        <Typography variant="h6">
                          {advancedStats.seasonStats?.batting?.avg?.toFixed(3) || '---'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">OPS</Typography>
                        <Typography variant="h6">
                          {advancedStats.seasonStats?.batting?.ops?.toFixed(3) || '---'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">ERA</Typography>
                        <Typography variant="h6">
                          {advancedStats.seasonStats?.pitching?.era?.toFixed(2) || '---'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        )}

        {/* Team Analytics Tab */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Select Team
                  </Typography>
                  <Autocomplete
                    fullWidth
                    options={teamOptions}
                    value={selectedTeam}
                    onChange={(event, newValue) => setSelectedTeam(newValue)}
                    onInputChange={(event, newInputValue) => {
                      if (newInputValue !== (selectedTeam?.label || '')) {
                        searchTeams(newInputValue);
                      }
                    }}
                    loading={teamSearchLoading}
                    loadingText="Searching teams..."
                    noOptionsText="No teams found. Try typing a team name or code."
                    getOptionLabel={(option) => option?.label || ''}
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search for team (name or code)"
                        placeholder="e.g., Yankees, NYY, Dodgers"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {teamSearchLoading ? <LinearProgress /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.id}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={loadTeamAnalytics}
                    disabled={!selectedTeam || loading}
                    fullWidth
                  >
                    Analyze Team
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              {teamAnalytics && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {teamAnalytics.name} ({teamAnalytics.id})
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Record</Typography>
                        <Typography variant="h6">
                          {teamAnalytics.record?.wins || 0}-{teamAnalytics.record?.losses || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Win %</Typography>
                        <Typography variant="h6">
                          {teamAnalytics.standings?.winPercentage?.toFixed(3) || '---'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Runs Scored</Typography>
                        <Typography variant="h6">
                          {teamAnalytics.standings?.runsScored || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Run Diff</Typography>
                        <Typography variant="h6">
                          {teamAnalytics.standings?.runDifferential > 0 ? '+' : ''}
                          {teamAnalytics.standings?.runDifferential || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        )}

        {/* Player Comparison Tab */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compare Players
                  </Typography>
                  <Autocomplete
                    fullWidth
                    options={playerOptions}
                    value={comparisonPlayers[0] ? playerOptions.find(p => p.id === (typeof comparisonPlayers[0] === 'object' ? comparisonPlayers[0].id : comparisonPlayers[0])) || null : null}
                    onChange={(event, newValue) => {
                      const playerId = newValue ? newValue.id : '';
                      setComparisonPlayers([playerId, comparisonPlayers[1]]);
                    }}
                    onInputChange={(event, newInputValue) => {
                      if (newInputValue.length > 2) {
                        searchPlayers(newInputValue);
                      }
                    }}
                    getOptionLabel={(option) => `${option.fullName} (${option.primaryPosition})`}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <div>
                          <Typography variant="subtitle1">{option.fullName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.currentTeam?.name} - {option.primaryPosition}
                          </Typography>
                        </div>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Search Player 1" variant="outlined" />
                    )}
                    sx={{ mb: 2 }}
                  />
                  <Autocomplete
                    fullWidth
                    options={playerOptions}
                    value={comparisonPlayers[1] ? playerOptions.find(p => p.id === (typeof comparisonPlayers[1] === 'object' ? comparisonPlayers[1].id : comparisonPlayers[1])) || null : null}
                    onChange={(event, newValue) => {
                      const playerId = newValue ? newValue.id : '';
                      setComparisonPlayers([comparisonPlayers[0], playerId]);
                    }}
                    onInputChange={(event, newInputValue) => {
                      if (newInputValue.length > 2) {
                        searchPlayers(newInputValue);
                      }
                    }}
                    getOptionLabel={(option) => `${option.fullName} (${option.primaryPosition})`}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <div>
                          <Typography variant="subtitle1">{option.fullName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.currentTeam?.name} - {option.primaryPosition}
                          </Typography>
                        </div>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Search Player 2" variant="outlined" />
                    )}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={loadComparison}
                    disabled={comparisonPlayers.filter(p => p.trim()).length < 2 || loading}
                    fullWidth
                  >
                    Compare Players
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              {comparisonData && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Player Comparison Results
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comparison functionality will be available once the backend is populated with data.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        )}

        {/* League Leaders Tab */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Leader Filters
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={leaderCategory}
                      onChange={(e) => setLeaderCategory(e.target.value)}
                    >
                      <MenuItem value="batting">Batting</MenuItem>
                      <MenuItem value="pitching">Pitching</MenuItem>
                      <MenuItem value="fielding">Fielding</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Statistic</InputLabel>
                    <Select
                      value={leaderStat}
                      onChange={(e) => setLeaderStat(e.target.value)}
                    >
                      {leaderCategory === 'batting' && (
                        <>
                          <MenuItem value="avg">Batting Average</MenuItem>
                          <MenuItem value="ops">OPS</MenuItem>
                          <MenuItem value="homeRuns">Home Runs</MenuItem>
                          <MenuItem value="rbi">RBI</MenuItem>
                          <MenuItem value="hits">Hits</MenuItem>
                        </>
                      )}
                      {leaderCategory === 'pitching' && (
                        <>
                          <MenuItem value="era">ERA</MenuItem>
                          <MenuItem value="wins">Wins</MenuItem>
                          <MenuItem value="strikeOuts">Strikeouts</MenuItem>
                          <MenuItem value="whip">WHIP</MenuItem>
                          <MenuItem value="saves">Saves</MenuItem>
                        </>
                      )}
                      {leaderCategory === 'fielding' && (
                        <>
                          <MenuItem value="fieldingPercentage">Fielding %</MenuItem>
                          <MenuItem value="assists">Assists</MenuItem>
                          <MenuItem value="putOuts">Put Outs</MenuItem>
                        </>
                      )}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {leaderCategory.charAt(0).toUpperCase() + leaderCategory.slice(1)} Leaders - {leaderStat.toUpperCase()}
                  </Typography>
                  {leaders.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Player</TableCell>
                            <TableCell>Team</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell align="right">Games</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leaders.map((leader, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Chip 
                                  label={leader.rank || (index + 1)} 
                                  color={index < 3 ? 'primary' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{leader.player?.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <Chip label={leader.player?.team || 'UNK'} size="small" />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {typeof leader.value === 'number' ? 
                                    (leader.value < 1 ? leader.value.toFixed(3) : leader.value) : 
                                    leader.value || '---'}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{leader.games || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No leaders data available. Make sure your backend is running and populated with data.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </motion.div>
    </Box>
  );
};

export default Analytics;
