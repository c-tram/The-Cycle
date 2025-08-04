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
  const [playerSplits, setPlayerSplits] = useState(null);
  const [playerTrends, setPlayerTrends] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);

  // Team Analytics State
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [teamSchedule, setTeamSchedule] = useState(null);

  // Comparison State
  const [comparisonPlayers, setComparisonPlayers] = useState(['', '']);
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

  const loadPlayerAnalytics = async () => {
    if (!selectedPlayer) return;
    
    setLoading(true);
    try {
      const [splits, advanced] = await Promise.all([
        playersApi.getPlayerSplits(selectedPlayer).catch(() => null),
        statsApi.getAdvancedPlayerStats(selectedPlayer).catch(() => null)
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
      const [teamData, schedule] = await Promise.all([
        teamsApi.getTeam(selectedTeam, { includeRoster: 'true' }).catch(() => null),
        teamsApi.getTeamSchedule(selectedTeam, { limit: 20 }).catch(() => null)
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
    const validPlayers = comparisonPlayers.filter(p => p.trim());
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
                  <TextField
                    fullWidth
                    label="Player ID (e.g., NYY-Aaron_Judge-2025)"
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
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
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Team</InputLabel>
                    <Select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                    >
                      {['NYY', 'BOS', 'LAD', 'SF', 'HOU', 'ATL', 'CHC', 'NYM', 'PHI', 'TB'].map(team => (
                        <MenuItem key={team} value={team}>{team}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                  <TextField
                    fullWidth
                    label="Player 1 ID"
                    value={comparisonPlayers[0]}
                    onChange={(e) => setComparisonPlayers([e.target.value, comparisonPlayers[1]])}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Player 2 ID"
                    value={comparisonPlayers[1]}
                    onChange={(e) => setComparisonPlayers([comparisonPlayers[0], e.target.value])}
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
