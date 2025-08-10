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
  Tooltip
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data for the 5-column leaders grid
      const [
        summaryData,
        cvrBatting,
        cvrPitching,
        cvrTeam,
        last10Teams,
        divisionLeaders
      ] = await Promise.all([
        statsApi.getSummary().catch(() => null),
        // CVR Batting: top 5 batters by CVR (min 30 games)
        statsApi.getLeaders({ category: 'batting', stat: 'cvr', limit: 5, minGames: 30 }).catch(() => ({ leaders: [] })),
        // CVR Pitching: top 5 pitchers by CVR (min 20 IP)
        statsApi.getLeaders({ category: 'pitching', stat: 'cvr', limit: 5, minInnings: 20 }).catch(() => ({ leaders: [] })),
        // CVR Team: top 5 teams by team CVR
        statsApi.getLeaders({ category: 'team', stat: 'cvr', limit: 5 }).catch(() => ({ leaders: [] })),
        // Best Last 10 Game Records: top 5 teams by last 10 games
        teamsApi.getTeams({ sortBy: 'last10', limit: 5 }).catch(() => ({ teams: [] })),
        // Division Leaders: top 5 division leaders by win pct
        teamsApi.getStandings().catch(() => ({ standings: [] }))
      ]);

      // Parse and format data for the grid
      setSummary(summaryData);
      setLeaders({
        cvrBatting: (cvrBatting.leaders || []).map(p => ({
          name: p.player?.name,
          team: p.player?.team,
          games: p.games,
          cvr: p.value
        })),
        cvrPitching: (cvrPitching.leaders || []).map(p => ({
          name: p.player?.name,
          team: p.player?.team,
          games: p.games,
          cvr: p.value
        })),
        cvrTeam: (cvrTeam.leaders || []).map(t => ({
          id: t.player?.team || t.team || t.id,
          name: t.player?.team || t.team || t.id,
          cvr: t.value
        })),
        last10: (last10Teams.teams || []).map(t => ({
          id: t.id,
          name: t.name,
          last10: t.standings?.last10 || t.last10 || 'N/A'
        })),
        divisionLeaders: (divisionLeaders.standings || []).slice(0, 5).map(t => ({
          id: t.id,
          name: t.name,
          league: t.league,
          division: t.division,
          record: t.record
        }))
      });
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
                  description="TBD"
                  icon={<Star />}
                  onClick={() => navigate('/leaders')}
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
                    <Typography variant="h6" fontWeight={700}>
                      Statistical Leaders (CVR & Standings)
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
                    {/* CVR Batting Leaders */}
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          CVR Batting
                        </Typography>
                        <List dense>
                          {leaders.cvrBatting?.length > 0 ? leaders.cvrBatting.map((player, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <ListItemAvatar>
                                <Avatar sx={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: themeUtils.getTeamColor(player.team),
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {player.team}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={player.name}
                                secondary={`${player.team} • ${player.games}G`}
                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={player.cvr?.toFixed(2) || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                  color: theme.palette.success.main,
                                  fontWeight: 700,
                                  minWidth: 50,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No data available"
                                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    </Grid>

                    {/* CVR Pitching Leaders */}
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          CVR Pitching
                        </Typography>
                        <List dense>
                          {leaders.cvrPitching?.length > 0 ? leaders.cvrPitching.map((player, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <ListItemAvatar>
                                <Avatar sx={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: themeUtils.getTeamColor(player.team),
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {player.team}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={player.name}
                                secondary={`${player.team} • ${player.games}G`}
                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={player.cvr?.toFixed(2) || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                                  color: theme.palette.info.main,
                                  fontWeight: 700,
                                  minWidth: 50,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No data available"
                                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    </Grid>

                    {/* CVR Team Leaders */}
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          CVR Team
                        </Typography>
                        <List dense>
                          {leaders.cvrTeam?.length > 0 ? leaders.cvrTeam.map((team, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <ListItemAvatar>
                                <Avatar sx={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: themeUtils.getTeamColor(team.id),
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {team.id}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={team.name || team.id}
                                secondary={team.id}
                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={team.cvr?.toFixed(2) || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                  color: theme.palette.warning.main,
                                  fontWeight: 700,
                                  minWidth: 50,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No data available"
                                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    </Grid>

                    {/* Best Last 10 Game Records */}
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Best Last 10 Games
                        </Typography>
                        <List dense>
                          {leaders.last10?.length > 0 ? leaders.last10.map((team, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <ListItemAvatar>
                                <Avatar sx={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: themeUtils.getTeamColor(team.id),
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {team.id}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={team.name || team.id}
                                secondary={`Last 10: ${team.last10}`}
                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={team.last10 || '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                  color: theme.palette.success.main,
                                  fontWeight: 700,
                                  minWidth: 50,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No data available"
                                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    </Grid>

                    {/* Division Leaders (Total Standings) */}
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Division Leaders
                        </Typography>
                        <List dense>
                          {leaders.divisionLeaders?.length > 0 ? leaders.divisionLeaders.map((team, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <ListItemAvatar>
                                <Avatar sx={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: themeUtils.getTeamColor(team.id),
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {team.id}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={team.name || team.id}
                                secondary={`${team.league} ${team.division}`}
                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={team.record ? `${team.record.wins}-${team.record.losses}` : '---'}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                                  color: theme.palette.info.main,
                                  fontWeight: 700,
                                  minWidth: 50,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No data available"
                                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
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
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
