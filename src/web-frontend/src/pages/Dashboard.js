import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Skeleton,
  useTheme,
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
  LinearProgress,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SportsBaseball,
  People,
  Groups,
  Assessment,
  Star,
  Timeline,
  Refresh,
  ArrowForward,
  EmojiEvents,
  Speed,
  LocalFireDepartment
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// API and utils
import { statsApi, playersApi, teamsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import LiveScoreboard from '../components/LiveScoreboard';

// Utility: Get MLB team logo URL by team code (3-letter abbreviation)
const getTeamLogoUrl = (teamCode) => {
  if (!teamCode) return null;
  // You can use ESPN, MLB, or your own CDN. Example below uses ESPN CDN:
  // https://a.espncdn.com/i/teamlogos/mlb/500/{teamCode}.png
  // Team codes must be uppercase and mapped to ESPN/MLB codes if needed
  const code = teamCode.toUpperCase();
  // Some codes may need mapping (e.g., "CWS" -> "CHW", "AZ" -> "ARI")
  const codeMap = {
    AZ: 'ARI',
    CWS: 'CHW',
    KC: 'KCR',
    SD: 'SDP',
    SF: 'SFG',
    TB: 'TBR',
    WSH: 'WSN',
    // Add more mappings as needed
  };
  const logoCode = codeMap[code] || code;
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${logoCode}.png`;
};

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [leaders, setLeaders] = useState({});
  const [teams, setTeams] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [standings, setStandings] = useState([]);
  const [error, setError] = useState(null);
  const [selectedStatCategory, setSelectedStatCategory] = useState('cvr');
  const [activeLeaderTab, setActiveLeaderTab] = useState(0);

  // Define stat categories with proper API calls
  const statCategories = {
    cvr: {
      label: 'CVR (Cycle Value Rating)',
      description: 'Our proprietary comprehensive value metric',
      tabs: [
        { key: 'cvrBatters', title: 'CVR - Batters', stat: 'cvr', category: 'batting', minGames: 50, icon: SportsBaseball },
        { key: 'cvrPitchers', title: 'CVR - Pitchers', stat: 'cvr', category: 'pitching', minInnings: 30, icon: Speed },
        { key: 'cvrTeams', title: 'CVR - Teams', stat: 'cvr', category: 'team', icon: EmojiEvents },
        { key: 'warPlayers', title: 'WAR - Players', stat: 'war', category: 'batting', minGames: 30, icon: Star },
        { key: 'warTeams', title: 'WAR - Teams', stat: 'war', category: 'team', icon: Groups }
      ]
    },
    traditional: {
      label: 'Traditional Stats',
      description: 'Classic baseball statistics',
      tabs: [
        { key: 'battingAvg', title: 'Batting Average', stat: 'avg', category: 'batting', minAtBats: 50, icon: SportsBaseball },
        { key: 'era', title: 'ERA Leaders', stat: 'era', category: 'pitching', minInnings: 20, icon: Speed },
        { key: 'winPct', title: 'Win Percentage', stat: 'winPercentage', category: 'team', icon: EmojiEvents },
        { key: 'homeRuns', title: 'Home Runs', stat: 'homeRuns', category: 'batting', minAtBats: 50, icon: LocalFireDepartment },
        { key: 'strikeouts', title: 'Strikeouts (P)', stat: 'strikeouts', category: 'pitching', minInnings: 20, icon: Timeline }
      ]
    }
  };

  useEffect(() => {
    setActiveLeaderTab(0); // Reset to first tab when category changes
    loadDashboardData();
  }, [selectedStatCategory]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentCategory = statCategories[selectedStatCategory];
      const tabs = currentCategory.tabs;

      // Load summary first
      const summaryData = await statsApi.getSummary().catch(() => null);
      setSummary(summaryData);

      // Load data for each tab based on selected category
      const tabPromises = tabs.map(async (tab) => {
        if (tab.category === 'team') {
          if (tab.stat === 'winPercentage') {
            // Fix standings by using schedule API (same approach as Teams.js)
            return teamsApi.getTeams({ limit: 50 }).then(async data => {
              const teams = data?.teams || [];
              
              // Calculate actual records from schedule API
              const teamsWithCorrectRecords = await Promise.all(teams.map(async (team) => {
                try {
                  const scheduleData = await teamsApi.getTeamSchedule(team.id, { 
                    year: '2025', 
                    limit: 200 
                  });
                  const games = scheduleData.games || [];
                  
                  if (games.length > 0) {
                    const wins = games.filter(game => game.result === 'W').length;
                    const losses = games.filter(game => game.result === 'L').length;
                    const ties = games.filter(game => game.result === 'T').length;
                    
                    return {
                      ...team,
                      record: { wins, losses, ties: ties || 0 },
                      winPercentage: games.length > 0 ? wins / games.length : 0,
                      gameCount: games.length
                    };
                  }
                } catch (scheduleErr) {
                  console.log(`Could not fetch schedule for ${team.id}:`, scheduleErr);
                }
                return team;
              }));
              
              // Sort by win percentage
              const sortedStandings = teamsWithCorrectRecords
                .filter(team => team.winPercentage > 0)
                .sort((a, b) => b.winPercentage - a.winPercentage);
              
              return { 
                key: tab.key, 
                data: sortedStandings 
              };
            });
          } else {
            // For CVR/WAR team stats, get all teams and fix records using schedule API (same as Teams.js)
            return teamsApi.getTeams({ limit: 50 }).then(async data => {
              const teams = data?.teams || [];
              
              // Fix team records by calculating actual wins/losses from schedule API (same approach as Teams.js)
              const teamsWithCorrectRecords = await Promise.all(teams.map(async (team) => {
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
                        ...team.standings,
                        winPercentage: games.length > 0 ? wins / games.length : 0
                      }
                    };
                  }
                } catch (scheduleErr) {
                  console.log(`Could not fetch schedule for ${team.id}:`, scheduleErr);
                }
                return team; // Return original team if schedule fetch fails
              }));
              
              // Sort teams by the specific stat in descending order
              const sortedTeams = teamsWithCorrectRecords
                .map(team => ({
                  ...team,
                  statValue: getTeamStatValue(team, tab.stat)
                }))
                .filter(team => team.statValue > 0) // Filter out teams with no/zero stat
                .sort((a, b) => b.statValue - a.statValue) // Descending order
                .slice(0, 10); // Take top 10 for tabs
              
              return { 
                key: tab.key, 
                data: sortedTeams 
              };
            });
          }
        } else {
          // Player stats
          return statsApi.getLeaders({
            category: tab.category,
            stat: tab.stat,
            limit: 10, // Increased limit for tabs
            minGames: tab.minGames || 15,
            minAtBats: tab.minAtBats || undefined,
            minInnings: tab.minInnings || undefined
          }).then(data => ({ 
            key: tab.key, 
            data: data?.leaders || [] 
          }));
        }
      });

      const results = await Promise.all(tabPromises);
      
      // Parse and format data for the professional grid
      const newLeaders = {};
      
      results.forEach((result, index) => {
        const tab = tabs[index];
        const rawData = result.data;
        
        if (tab.category === 'team') {
          // Team data formatting
          newLeaders[result.key] = rawData.slice(0, 10).map(t => ({
            id: t.id || t.name || 'UNK',
            name: t.name || t.id || 'Unknown Team',
            value: getTeamStatValue(t, tab.stat),
            statLabel: tab.stat.toUpperCase(),
            record: t.record || { wins: t.wins || 0, losses: t.losses || 0 },
            subtitle: `${(t.record?.wins || t.wins || 0)}-${(t.record?.losses || t.losses || 0)}`
          }));
        } else {
          // Player data formatting
          newLeaders[result.key] = rawData.map(p => ({
            name: p.player?.name || 'Unknown Player',
            team: p.player?.team || 'UNK',
            games: p.games || 0,
            value: typeof p.value === 'number' ? p.value : parseFloat(p.value) || 0,  // Ensure number
            statLabel: tab.stat.toUpperCase(),
            subtitle: getPlayerSubtitle(p, tab)
          }));
        }
      });

      setLeaders(newLeaders);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getTeamStatValue = (team, stat) => {
    let value;
    switch (stat) {
      case 'winPercentage':
        value = team.winPercentage || 0;
        break;
      case 'cvr':
        // Check multiple possible locations for CVR and ensure numeric casting
        value = team.stats?.overall?.cvr || team.cvr || 0;
        value = typeof value === 'number' ? value : parseFloat(value) || 0;
        break;
      case 'war':
        // WAR might be an object with {total, batting, pitching} or just a number
        const warData = team.stats?.overall?.war || team.war;
        if (typeof warData === 'object' && warData !== null && warData.total !== undefined) {
          value = warData.total;
        } else {
          value = warData || 0;
        }
        // Ensure numeric casting for WAR
        value = typeof value === 'number' ? value : parseFloat(value) || 0;
        break;
      default:
        value = 0;
    }
    
    // Ensure we return a number for sorting
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  };

  const getPlayerSubtitle = (player, tab) => {
    const games = player.games || 0;
    if (tab.category === 'batting') {
      const atBats = player.qualifyingStats?.atBats || 0;
      return `${games}G • ${atBats} AB`;
    } else if (tab.category === 'pitching') {
      const ip = player.qualifyingStats?.inningsPitched || 0;
      return `${games}G • ${ip} IP`;
    }
    return `${games}G`;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error loading dashboard: {error}
        </Typography>
        <Button 
          startIcon={<Refresh />}
          onClick={loadDashboardData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard
                  title="View Players"
                  description="Browse player statistics and performance"
                  icon={<People />}
                  onClick={() => navigate('/players')}
                  color={theme.palette.primary.main}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard
                  title="View Teams"
                  description="Browse team statistics and performance"
                  icon={<Groups />}
                  onClick={() => navigate('/teams')}
                  color={theme.palette.success.main}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard
                  title="Statistical Splits"
                  description="Home/Away, Player vs Player, Matchups"
                  icon={<Star />}
                  onClick={() => navigate('/splits')}
                  color={theme.palette.warning.main}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard
                  title="Advanced Analytics"
                  description="TBD"
                  icon={<Assessment />}
                  onClick={() => navigate('/analytics')}
                  color={theme.palette.secondary.main}
                />
              </Grid>
            </Grid>
          </Box>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total Players"
                value={summary?.summary?.totalPlayers || 0}
                icon={<People />}
                color={theme.palette.primary.main}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Games Played"
                value={summary?.summary?.totalGames || 0}
                icon={<SportsBaseball />}
                color={theme.palette.success.main}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Player Games"
                value={summary?.summary?.totalPlayerGames || 0}
                icon={<Assessment />}
                color={theme.palette.warning.main}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Avg Players/Game"
                value={Math.round(summary?.summary?.averagePlayersPerGame || 0)}
                icon={<Timeline />}
                color={theme.palette.info.main}
              />
            </Grid>
          </Grid>
        </motion.div>

        {/* Live Scoreboard */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4 }}>
            <LiveScoreboard />
          </Box>
        </motion.div>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Tabbed Statistical Leaders */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card elevation={0} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                        Current Leaders
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {statCategories[selectedStatCategory].description}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Stat Category</InputLabel>
                        <Select
                          value={selectedStatCategory}
                          label="Stat Category"
                          onChange={(e) => setSelectedStatCategory(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2
                            }
                          }}
                        >
                          {Object.entries(statCategories).map(([key, category]) => (
                            <MenuItem key={key} value={key}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {category.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {category.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Button 
                        endIcon={<ArrowForward />}
                        onClick={() => navigate('/splits')}
                        size="small"
                        variant="outlined"
                      >
                        View All Splits
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* Tab Navigation */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs 
                      value={activeLeaderTab} 
                      onChange={(e, newValue) => setActiveLeaderTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        '& .MuiTab-root': {
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.95rem'
                        }
                      }}
                    >
                      {statCategories[selectedStatCategory].tabs.map((tab, index) => (
                        <Tab
                          key={tab.key}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <tab.icon sx={{ fontSize: 20 }} />
                              {tab.title}
                            </Box>
                          }
                          value={index}
                        />
                      ))}
                    </Tabs>
                  </Box>
                  
                  {/* Tab Content */}
                  <Box sx={{ minHeight: 400 }}>
                    {statCategories[selectedStatCategory].tabs.map((tab, index) => (
                      <Box
                        key={tab.key}
                        sx={{ 
                          display: activeLeaderTab === index ? 'block' : 'none'
                        }}
                      >
                        <LeaderboardTab
                          tab={tab}
                          data={leaders[tab.key] || []}
                          onItemClick={(item) => {
                            if (tab.category === 'team') {
                              // Navigate to team detail page
                              navigate(`/teams/${item.id || item.name}/2025`);
                            } else {
                              // Navigate to player detail page
                              const playerName = item.name.replace(/\s+/g, '_');
                              navigate(`/players/${item.team}/${playerName}/2025`);
                            }
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

// Leaderboard Tab Component
const LeaderboardTab = ({ tab, data, onItemClick }) => {
  const theme = useTheme();
  
  const formatValue = (item) => {
    // Ensure item.value is a valid number
    const value = typeof item.value === 'number' ? item.value : parseFloat(item.value);
    
    if (isNaN(value) || value === null || value === undefined) {
      return '---';
    }
    
    if (tab.stat === 'winPercentage') {
      return (value * 100).toFixed(1) + '%';
    }
    if (tab.stat === 'era') {
      return value.toFixed(2);
    }
    if (tab.stat === 'cvr' || tab.stat === 'war') {
      return value.toFixed(1);
    }
    if (tab.stat === 'avg') {
      return value.toFixed(3);
    }
    if (tab.stat === 'homeRuns' || tab.stat === 'strikeouts') {
      return Math.round(value).toString();
    }
    if (tab.category === 'team' && tab.stat !== 'cvr' && tab.stat !== 'war') {
      return (value * 100).toFixed(1) + '%';
    }
    return value.toFixed(3);
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0: return theme.palette.warning.main; // Gold
      case 1: return alpha(theme.palette.grey[400], 0.8); // Silver
      case 2: return alpha(theme.palette.error.main, 0.6); // Bronze
      default: return theme.palette.text.secondary;
    }
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 8,
        color: 'text.secondary'
      }}>
        <tab.icon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          No Data Available
        </Typography>
        <Typography variant="body2">
          No qualifying {tab.category === 'team' ? 'teams' : 'players'} found for {tab.title}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 3,
        pb: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <tab.icon sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight={600}>
          {tab.title} Leaders
        </Typography>
        <Chip 
          label={`${data.length} ${tab.category === 'team' ? 'teams' : 'players'}`}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Table */}
      <Box sx={{ 
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: '60px 80px 1fr 120px 100px',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: `1px solid ${theme.palette.divider}`,
          p: 2
        }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            Rank
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            Team
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            {tab.category === 'team' ? 'Team Name' : 'Player Name'}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            {tab.stat.toUpperCase()}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            Details
          </Typography>
        </Box>

        {/* Table Rows */}
        {data.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '60px 80px 1fr 120px 100px',
                p: 2,
                cursor: onItemClick ? 'pointer' : 'default',
                borderBottom: index < data.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.5)}` : 'none',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.03),
                  transition: 'background-color 0.2s ease'
                }
              }}
              onClick={() => onItemClick && onItemClick(item)}
            >
              {/* Rank */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={index + 1}
                  size="small"
                  sx={{
                    backgroundColor: index < 3 ? getRankColor(index) : alpha(theme.palette.grey[400], 0.2),
                    color: index < 3 ? 'white' : theme.palette.text.secondary,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    minWidth: 28,
                    height: 24
                  }}
                />
              </Box>

              {/* Team Logo */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const teamCode = item.team || item.id || 'UNK';
                  const logoUrl = getTeamLogoUrl(teamCode);
                  return (
                    <Avatar
                      src={logoUrl}
                      alt={teamCode}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: themeUtils.getTeamColor(teamCode),
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        border: index < 3 ? `2px solid ${getRankColor(index)}` : 'none'
                      }}
                      imgProps={{
                        style: { objectFit: 'contain', background: 'white' }
                      }}
                    >
                      {teamCode.substring(0, 3)}
                    </Avatar>
                  );
                })()}
              </Box>

              {/* Name */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {item.name || 'Unknown'}
                  </Typography>
                  {tab.category !== 'team' && (
                    <Typography variant="caption" color="text.secondary">
                      {item.team || 'UNK'}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Stat Value */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography 
                  variant="h6" 
                  fontWeight={700}
                  sx={{ 
                    color: index < 3 ? getRankColor(index) : theme.palette.text.primary,
                    fontSize: '1rem'
                  }}
                >
                  {formatValue(item)}
                </Typography>
              </Box>

              {/* Details */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {item.subtitle || `${item.statLabel || 'STAT'}`}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
};

// Summary card component
const SummaryCard = ({ title, value, icon, color, subtitle, trend }) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={0}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.05)}, ${alpha(color, 0.02)})`,
        border: `1px solid ${alpha(color, 0.1)}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
            
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend.positive ? (
                  <TrendingUp sx={{ fontSize: 16, color: theme.palette.success.main, mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: theme.palette.error.main, mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend.positive ? theme.palette.success.main : theme.palette.error.main,
                    fontWeight: 600
                  }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Action card component
const ActionCard = ({ title, description, icon, onClick, color }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        elevation={0}
        sx={{
          height: '100%',
          cursor: 'pointer',
          border: `1px solid ${alpha(color, 0.2)}`,
          '&:hover': {
            backgroundColor: alpha(color, 0.05),
            borderColor: alpha(color, 0.3),
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out'
          }
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Loading skeleton
const DashboardSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={300} height={50} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
