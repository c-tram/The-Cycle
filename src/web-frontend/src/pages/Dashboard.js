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
  InputLabel
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

  // Define stat categories with proper API calls
  const statCategories = {
    cvr: {
      label: 'CVR (Cycle Value Rating)',
      description: 'Our proprietary comprehensive value metric',
      columns: [
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
      columns: [
        { key: 'battingAvg', title: 'Batting Average', stat: 'avg', category: 'batting', minAtBats: 50, icon: SportsBaseball },
        { key: 'era', title: 'ERA Leaders', stat: 'era', category: 'pitching', minInnings: 20, icon: Speed },
        { key: 'winPct', title: 'Win Percentage', stat: 'winPercentage', category: 'team', icon: EmojiEvents },
        { key: 'homeRuns', title: 'Home Runs', stat: 'homeRuns', category: 'batting', minAtBats: 50, icon: LocalFireDepartment },
        { key: 'strikeouts', title: 'Strikeouts (P)', stat: 'strikeouts', category: 'pitching', minInnings: 20, icon: Timeline }
      ]
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedStatCategory]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentCategory = statCategories[selectedStatCategory];
      const columns = currentCategory.columns;

      // Load summary first
      const summaryData = await statsApi.getSummary().catch(() => null);
      setSummary(summaryData);

      // Load data for each column based on selected category
      const columnPromises = columns.map(async (column) => {
        if (column.category === 'team') {
          if (column.stat === 'winPercentage') {
            return teamsApi.getStandings().then(data => ({ 
              key: column.key, 
              data: data?.standings || [] 
            }));
          } else {
            // For CVR/WAR team stats, get all teams and sort by the specific stat
            return teamsApi.getTeams({ limit: 50 }).then(data => {
              const teams = data?.teams || [];
              
              // Sort teams by the specific stat in descending order
              const sortedTeams = teams
                .map(team => ({
                  ...team,
                  statValue: getTeamStatValue(team, column.stat)
                }))
                .filter(team => team.statValue > 0) // Filter out teams with no/zero stat
                .sort((a, b) => b.statValue - a.statValue) // Descending order
                .slice(0, 5); // Take top 5
              
              return { 
                key: column.key, 
                data: sortedTeams 
              };
            });
          }
        } else {
          // Player stats
          return statsApi.getLeaders({
            category: column.category,
            stat: column.stat,
            limit: 5,
            minGames: column.minGames || 15,
            minAtBats: column.minAtBats || undefined,
            minInnings: column.minInnings || undefined
          }).then(data => ({ 
            key: column.key, 
            data: data?.leaders || [] 
          }));
        }
      });

      const results = await Promise.all(columnPromises);
      
      // Parse and format data for the professional grid
      const newLeaders = {};
      
      results.forEach((result, index) => {
        const column = columns[index];
        const rawData = result.data;
        
        if (column.category === 'team') {
          // Team data formatting
          newLeaders[result.key] = rawData.slice(0, 5).map(t => ({
            id: t.id || t.name || 'UNK',
            name: t.name || t.id || 'Unknown Team',
            value: getTeamStatValue(t, column.stat),
            statLabel: column.stat.toUpperCase(),
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
            statLabel: column.stat.toUpperCase(),
            subtitle: getPlayerSubtitle(p, column)
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

  const getPlayerSubtitle = (player, column) => {
    const games = player.games || 0;
    if (column.category === 'batting') {
      const atBats = player.qualifyingStats?.atBats || 0;
      return `${games}G • ${atBats} AB`;
    } else if (column.category === 'pitching') {
      const ip = player.qualifyingStats?.inningsPitched || 0;
      return `${games}G • ${ip} IP`;
    }
    return `${games}G`;
  };

  // Get colors for columns
  const getColumnColor = (index) => {
    const colors = [
      theme.palette.success.main,    // Green
      theme.palette.info.main,       // Blue  
      theme.palette.warning.main,    // Orange
      theme.palette.error.main,      // Red
      theme.palette.primary.main     // Purple
    ];
    return colors[index % colors.length];
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
                  title="Statistical Leaders"
                  description="CVR, WAR, and traditional metrics"
                  icon={<Star />}
                  onClick={() => navigate('/leaders')}
                  color={theme.palette.warning.main}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard
                  title="Advanced Analytics"
                  description="Deep dive statistical analysis"
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
                subtitle={`${summary?.summary?.totalTeams || 0} teams`}
                trend={{ value: 5.2, positive: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Games Played"
                value={summary?.summary?.totalGames || 0}
                icon={<SportsBaseball />}
                color={theme.palette.success.main}
                subtitle={`${summary?.summary?.totalGameDates || 0} days`}
                trend={{ value: 2.1, positive: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Player Games"
                value={summary?.summary?.totalPlayerGames || 0}
                icon={<Assessment />}
                color={theme.palette.warning.main}
                subtitle="Total performances"
                trend={{ value: 8.7, positive: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Avg Players/Game"
                value={summary?.summary?.averagePlayersPerGame || 0}
                icon={<Timeline />}
                color={theme.palette.info.main}
                subtitle={`${summary?.summary?.averageGamesPerDay || 0} games/day`}
                trend={{ value: 12.4, positive: true }}
              />
            </Grid>
          </Grid>
        </motion.div>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* 5-column Statistical Leaders grid */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card elevation={0} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                        Statistical Leaders & Standings
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
                        onClick={() => navigate('/leaders')}
                        size="small"
                        variant="outlined"
                      >
                        View All Leaders
                      </Button>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {statCategories[selectedStatCategory].columns.map((column, index) => (
                      <Grid item xs={12} sm={6} md={2.4} key={column.key}>
                        <StatColumn
                          title={column.title}
                          icon={<column.icon />}
                          color={getColumnColor(index)}
                          data={leaders[column.key] || []}
                          emptyMessage={`No qualifying ${column.category === 'team' ? 'teams' : 'players'}`}
                          isTeamStat={column.category === 'team'}
                          statType={column.stat}
                          onItemClick={(item) => {
                            if (column.category === 'team') {
                              // Navigate to team detail page
                              navigate(`/teams/${item.id || item.name}/2025`);
                            } else {
                              // Navigate to player detail page
                              const playerName = item.name.replace(/\s+/g, '_');
                              navigate(`/players/${item.team}/${playerName}/2025`);
                            }
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

// Professional Statistical Column Component
const StatColumn = ({ title, icon, color, data, emptyMessage, isTeamStat, statType, onItemClick }) => {
  const theme = useTheme();
  
  const formatValue = (item) => {
    // Ensure item.value is a valid number
    const value = typeof item.value === 'number' ? item.value : parseFloat(item.value);
    
    if (isNaN(value) || value === null || value === undefined) {
      return '---';
    }
    
    if (statType === 'winPercentage') {
      return (value * 100).toFixed(1) + '%';
    }
    if (statType === 'era') {
      return value.toFixed(2);
    }
    if (statType === 'cvr' || statType === 'war') {
      return value.toFixed(1);
    }
    if (statType === 'avg') {
      return value.toFixed(3);
    }
    if (statType === 'homeRuns' || statType === 'strikeouts') {
      return Math.round(value).toString();
    }
    if (isTeamStat && statType !== 'cvr' && statType !== 'war') {
      return (value * 100).toFixed(1) + '%';
    }
    return value.toFixed(3);
  };

  const getChipColor = (index) => {
    switch (index) {
      case 0: return theme.palette.warning.main; // Gold
      case 1: return alpha(theme.palette.grey[400], 0.8); // Silver
      case 2: return alpha(theme.palette.error.main, 0.6); // Bronze
      default: return alpha(color, 0.6);
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      border: `1px solid ${alpha(color, 0.1)}`,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: alpha(color, 0.02)
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: alpha(color, 0.08),
        borderBottom: `1px solid ${alpha(color, 0.1)}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ color: color }}>{icon}</Box>
          <Typography variant="subtitle2" fontWeight={700} color={color}>
            {title}
          </Typography>
        </Box>
      </Box>

      {/* Data */}
      <Box sx={{ p: 1.5 }}>
        {data?.length > 0 ? (
          <List dense sx={{ p: 0 }}>
            {data.map((item, idx) => (
              <ListItem 
                key={idx} 
                sx={{ 
                  px: 0, 
                  py: 0.5,
                  borderRadius: 1,
                  cursor: onItemClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: alpha(color, 0.05)
                  }
                }}
                onClick={() => onItemClick && onItemClick(item)}
              >

                <ListItemAvatar>
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
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          border: `2px solid ${idx < 3 ? getChipColor(idx) : 'transparent'}`
                        }}
                        imgProps={{
                          style: { objectFit: 'contain', background: 'white' }
                        }}
                      >
                        {/* Fallback to abbreviation if logo fails to load */}
                        {teamCode.substring(0, 3)}
                      </Avatar>
                    );
                  })()}
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                      {item.name || 'Unknown'}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {item.subtitle || `${item.statLabel || 'STAT'}`}
                    </Typography>
                  }
                />
                
                <Box sx={{ textAlign: 'right', minWidth: 60 }}>
                  <Chip
                    label={formatValue(item)}
                    size="small"
                    sx={{
                      backgroundColor: alpha(getChipColor(idx), 0.1),
                      color: getChipColor(idx),
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      height: 24,
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                  {idx < 3 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                      <Chip
                        label={`#${idx + 1}`}
                        size="small"
                        sx={{
                          backgroundColor: getChipColor(idx),
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.6rem',
                          height: 16,
                          '& .MuiChip-label': {
                            px: 0.5
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 3,
            color: 'text.secondary'
          }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {emptyMessage}
            </Typography>
          </Box>
        )}
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
