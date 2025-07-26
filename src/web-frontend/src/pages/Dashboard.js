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
  Button
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
  ArrowForward
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// API and utils
import { statsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';

// Chart components (we'll create these)
// import StatsChart from '../components/charts/StatsChart';
// import LeaderChart from '../components/charts/LeaderChart';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [leaders, setLeaders] = useState({});
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load parallel data
      const [
        summaryData,
        battingLeaders,
        pitchingLeaders,
        homeRunLeaders,
        eraLeaders
      ] = await Promise.all([
        statsApi.getSummary(),
        statsApi.getLeaders({ category: 'batting', stat: 'avg', limit: 5 }),
        statsApi.getLeaders({ category: 'pitching', stat: 'era', limit: 5 }),
        statsApi.getLeaders({ category: 'batting', stat: 'homeRuns', limit: 5 }),
        statsApi.getLeaders({ category: 'pitching', stat: 'era', limit: 3 })
      ]);

      setSummary(summaryData);
      setLeaders({
        batting: battingLeaders.leaders,
        pitching: pitchingLeaders.leaders,
        homeRuns: homeRunLeaders.leaders,
        era: eraLeaders.leaders
      });

      // Simulate recent updates
      setRecentUpdates([
        {
          type: 'player',
          player: 'Aaron Judge',
          team: 'NYY',
          stat: 'Home Run',
          value: '42nd',
          timestamp: '2 minutes ago'
        },
        {
          type: 'team',
          team: 'NYY',
          stat: 'Win',
          value: '7-4 vs BOS',
          timestamp: '1 hour ago'
        },
        {
          type: 'milestone',
          player: 'Gerrit Cole',
          team: 'NYY',
          stat: '200 Strikeouts',
          value: 'Season milestone',
          timestamp: '3 hours ago'
        }
      ]);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Baseball Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Professional-grade statistics and insights for the {new Date().getFullYear()} season
            </Typography>
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
                value={summary?.summary?.totalGameDates || 0}
                icon={<SportsBaseball />}
                color={theme.palette.success.main}
                subtitle="Season progress"
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
                subtitle="Per game"
                trend={{ value: 0.3, positive: false }}
              />
            </Grid>
          </Grid>
        </motion.div>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Statistical Leaders */}
          <Grid item xs={12} lg={8}>
            <motion.div variants={itemVariants}>
              <Card 
                elevation={0} 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)}, ${alpha(theme.palette.secondary.main, 0.02)})`
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Statistical Leaders
                    </Typography>
                    <Button 
                      endIcon={<ArrowForward />}
                      onClick={() => navigate('/leaders')}
                      size="small"
                    >
                      View All
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Batting Average Leaders */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Batting Average Leaders
                        </Typography>
                        <List dense>
                          {leaders.batting?.slice(0, 5).map((player, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemAvatar>
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
                              </ListItemAvatar>
                              <ListItemText
                                primary={player.player.name}
                                secondary={`${player.player.team} • ${player.games}G`}
                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                              />
                              <Chip
                                label={player.value?.toFixed(3) || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                  color: theme.palette.success.main,
                                  fontWeight: 700,
                                  minWidth: 60
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Grid>

                    {/* ERA Leaders */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          ERA Leaders (Pitching)
                        </Typography>
                        <List dense>
                          {leaders.era?.slice(0, 5).map((player, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemAvatar>
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
                              </ListItemAvatar>
                              <ListItemText
                                primary={player.player.name}
                                secondary={`${player.player.team} • ${player.games}G`}
                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                              />
                              <Chip
                                label={player.value?.toFixed(2) || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                  fontWeight: 700,
                                  minWidth: 60
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Recent Updates */}
          <Grid item xs={12} lg={4}>
            <motion.div variants={itemVariants}>
              <Card elevation={0} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Recent Updates
                    </Typography>
                    <IconButton size="small" onClick={loadDashboardData}>
                      <Refresh />
                    </IconButton>
                  </Box>

                  <List>
                    {recentUpdates.map((update, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ px: 0, py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: update.type === 'player' 
                                  ? alpha(theme.palette.primary.main, 0.1)
                                  : update.type === 'team'
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.warning.main, 0.1),
                                color: update.type === 'player'
                                  ? theme.palette.primary.main
                                  : update.type === 'team'
                                  ? theme.palette.success.main
                                  : theme.palette.warning.main
                              }}
                            >
                              {update.type === 'milestone' ? <Star /> : <SportsBaseball />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {update.player || update.team}
                                </Typography>
                                {update.team && (
                                  <Chip
                                    label={update.team}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      backgroundColor: themeUtils.getTeamColor(update.team),
                                      color: 'white'
                                    }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                  {update.stat}: <strong>{update.value}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {update.timestamp}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < recentUpdates.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card elevation={0}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                    Quick Actions
                  </Typography>
                  
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
                        title="Team Standings"
                        description="Check current league standings"
                        icon={<Groups />}
                        onClick={() => navigate('/standings')}
                        color={theme.palette.success.main}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <ActionCard
                        title="Statistical Leaders"
                        description="Top performers by category"
                        icon={<Star />}
                        onClick={() => navigate('/leaders')}
                        color={theme.palette.warning.main}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <ActionCard
                        title="Advanced Analytics"
                        description="Deep statistical analysis"
                        icon={<Assessment />}
                        onClick={() => navigate('/analytics')}
                        color={theme.palette.secondary.main}
                      />
                    </Grid>
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
        <Grid item xs={12} lg={8}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
