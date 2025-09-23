import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Skeleton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Sports,
  Timeline,
  Compare,
  Assessment,
  Person,
  Search,
  TrendingUp,
  InfoOutlined
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// API and utils
import { playersApi, statsApi } from '../services/apiService';
import { themeUtils } from '../theme/theme';
import { calculatePlayerCVR, getCVRDisplay, formatSalary } from '../utils/cvrCalculations'; // v3.0 - FIXED EXPORTS
import { getTeamLogoUrl as getSharedTeamLogoUrl } from '../utils/teamLogos';

// Team logo utility
const getTeamLogoUrl = (teamCode) => getSharedTeamLogoUrl(teamCode, 500);

// WAR Display Helper
const getWARDisplay = (war) => {
  const warValue = war || 0;
  
  if (warValue >= 6.0) {
    return {
      value: warValue.toFixed(1),
      description: 'MVP Level',
      color: '#ff6b35',
      emoji: '🔥',
      grade: 'A+'
    };
  } else if (warValue >= 4.0) {
    return {
      value: warValue.toFixed(1),
      description: 'All-Star Level',
      color: '#ff8c42',
      emoji: '⭐',
      grade: 'A'
    };
  } else if (warValue >= 2.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Above Average',
      color: '#ffd23f',
      emoji: '👍',
      grade: 'B+'
    };
  } else if (warValue >= 1.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Average',
      color: '#06ffa5',
      emoji: '✅',
      grade: 'B'
    };
  } else if (warValue >= 0.0) {
    return {
      value: warValue.toFixed(1),
      description: 'Below Average',
      color: '#4fb3d9',
      emoji: '📉',
      grade: 'C'
    };
  } else {
    return {
      value: warValue.toFixed(1),
      description: 'Replacement Level',
      color: '#c0392b',
      emoji: '🔻',
      grade: 'D'
    };
  }
};

// Helper function to format innings pitched for display (e.g., 5.33 → "5.1", 5.67 → "5.2")
const formatInningsPitched = (ip) => {
  if (!ip || ip === 0) return '0.0';
  
  const wholeInnings = Math.floor(ip);
  const fractionalPart = ip - wholeInnings;
  
  // Convert decimal back to outs (thirds)
  if (fractionalPart < 0.1) {
    return `${wholeInnings}.0`;
  } else if (fractionalPart < 0.5) {
    return `${wholeInnings}.1`; // 1 out
  } else if (fractionalPart < 0.9) {
    return `${wholeInnings}.2`; // 2 outs
  } else {
    return `${wholeInnings + 1}.0`; // Round up to next inning
  }
};

// CVR Explanation Component
const CVRExplanation = ({ player, cvrData, salaryData }) => {
  const getSalaryTierName = (salary) => {
    if (salary >= 35000000) return 'Ultra-Mega ($35M+)';
    if (salary >= 25000000) return 'Superstar ($25M+)';
    if (salary >= 15000000) return 'Star ($15M+)';  
    if (salary >= 8000000) return 'Above Average ($8M+)';
    if (salary >= 3000000) return 'Average ($3M+)';
    if (salary >= 1000000) return 'Below Average ($1M+)';
    return 'Rookie/Minimum (<$1M)';
  };

  const getValueScoreBreakdown = (stats) => {
    if (!stats) return [];
    
    if (stats.batting) {
      const batting = stats.batting;
      const avg = parseFloat(batting.battingAverage) || 0;
      const obp = parseFloat(batting.onBasePercentage) || 0;
      const slg = parseFloat(batting.sluggingPercentage) || 0;
      
      return [
        { category: 'Batting Average', value: avg.toFixed(3), max: '30pts', note: '.320+ is elite' },
        { category: 'On-Base %', value: obp.toFixed(3), max: '30pts', note: 'Most important stat' },
        { category: 'Slugging %', value: slg.toFixed(3), max: '25pts', note: 'Power component' },
        { category: 'Production/Game', value: 'Various', max: '25pts', note: 'HRs + RBIs + Runs per game' }
      ];
    }
    
    if (stats.pitching) {
      const pitching = stats.pitching;
      const era = parseFloat(pitching.era) || 0;
      const whip = parseFloat(pitching.whip) || 0;
      const ip = parseFloat(pitching.inningsPitched) || 0;
      const so = pitching.strikeouts || 0;
      const k9 = ip > 0 ? (so * 9) / ip : 0;
      
      return [
        { category: 'ERA', value: era.toFixed(2), max: '25pts', note: 'Under 2.00 is elite' },
        { category: 'WHIP', value: whip.toFixed(2), max: '20pts', note: 'Under 0.90 is elite' },
        { category: 'K/9', value: k9.toFixed(1), max: '20pts', note: '11+ strikeouts per 9 innings' },
        { category: 'Wins & Innings', value: `${pitching.wins || 0}W, ${formatInningsPitched(ip)}IP`, max: '25pts', note: 'Durability and results' }
      ];
    }
    
    return [];
  };

  const breakdown = getValueScoreBreakdown(player?.seasonStats);
  const salary = salaryData?.salary || 0;
  const salaryTier = getSalaryTierName(salary);

  return (
    <Box sx={{ maxWidth: 400, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
        🏆 Cycle Value Rating (CVR) v4.0 Explained
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        CVR measures player value relative to salary on a 0.0-2.0+ scale where 1.0 = average value.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          📊 Performance Score: {cvrData?.valueScore || 0}/100
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Base Score: {cvrData?.baseValueScore || 0} × WAR Multiplier: {cvrData?.warMultiplier || 1.0} (WAR: {cvrData?.estimatedWAR || 0})
        </Typography>
        {breakdown.map((item, index) => (
          <Box key={index} sx={{ ml: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              • {item.category}: {item.value} ({item.max}) - {item.note}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          💰 Salary Tier: {salaryTier}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Tier Multiplier: {cvrData?.salaryTier || 1.0}x (Elite players get reduced salary penalties)
        </Typography>
      </Box>

      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Formula: CVR = (Performance Score ÷ 50) ÷ (Salary Tier ÷ 1.0)
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          📈 CVR Scale (0.0-2.0+):
        </Typography>
        <Box sx={{ ml: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', color: '#00C851' }}>1.8+: Elite Value 💎 </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#4CAF50' }}>1.5+: Excellent Value 🔥</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#8BC34A' }}>1.2+: Good Value ✅</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#FFC107' }}>0.8+: Fair Value ⚡</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#FF9800' }}>0.5+: Below Average ⚠️</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#F44336' }}>Under 0.5: Poor Value 💸</Typography>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        Scale: 1.0 = average value, 2.0+ = exceptional value. Elite performers can achieve high CVR despite massive salaries.
      </Typography>
    </Box>
  );
};

// Helper function to parse innings pitched from string format (e.g., "5.1" = 5.33, "5.0" = 5.0)
const parseInningsPitched = (ip) => {
  if (!ip) return 0;
  if (typeof ip === 'number') return ip;
  
  const ipStr = String(ip);
  if (ipStr.includes('.')) {
    const [whole, fraction] = ipStr.split('.');
    const wholeInnings = parseInt(whole) || 0;
    const fractionPart = parseInt(fraction) || 0;
    
    // If the fraction is 0 (like "1.0"), treat it as exact decimal
    // If the fraction is 1 or 2 (like "6.1" or "6.2"), treat as outs
    if (fractionPart === 0) {
      return wholeInnings; // "1.0" = 1.0, "8.0" = 8.0
    } else {
      return wholeInnings + (fractionPart / 3); // "6.1" = 6.33, "6.2" = 6.67
    }
  }
  
  return parseFloat(ipStr) || 0;
};

const PlayerDetail = () => {
  const navigate = useNavigate();
  const { team, playerName, year } = useParams();
  
  const [player, setPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [gameStats, setGameStats] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [salaryData, setSalaryData] = useState(null);
  const [cvr, setCvr] = useState(null);
  const [cvrData, setCvrData] = useState(null); // Store full CVR calculation data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadPlayerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading player data for:', { team, playerName, year });

      // Convert URL params to the backend format (Team-Player_Name-Year)
      const formattedPlayerName = playerName.replace(/_/g, '_');
      
      // Get individual player data with game log included
      const playerResponse = await playersApi.getPlayerById(`${team}-${formattedPlayerName}-${year}`, { 
        year, 
        includeGameLog: 'true' 
      });
      console.log('Player response:', playerResponse);
      
      // Get player splits for additional analysis
      const splitsResponse = await playersApi.getPlayerSplits(team, formattedPlayerName, year, 'all');
      console.log('Splits response:', splitsResponse);

      setPlayer({
        ...playerResponse,
        name: playerResponse.name,
        team: playerResponse.team,
        position: playerResponse.position,
        year: playerResponse.year
      });
      
      setPlayerStats(playerResponse.seasonStats);
      setGameStats(playerResponse.gameLog || []);
      
      // Debug season vs game log IP totals
      if (playerResponse.seasonStats?.pitching && playerResponse.gameLog?.length > 0) {
        const seasonIP = parseInningsPitched(playerResponse.seasonStats.pitching.inningsPitched);
        const gameLogTotal = playerResponse.gameLog.reduce((total, game) => {
          const gameIP = parseInningsPitched(game.stats?.pitching?.inningsPitched);
          return total + gameIP;
        }, 0);
        console.log('=== IP COMPARISON ===');
        console.log('Season IP (raw):', playerResponse.seasonStats.pitching.inningsPitched);
        console.log('Season IP (parsed):', seasonIP);
        console.log('Game Log Total IP:', gameLogTotal);
        console.log('Difference:', seasonIP - gameLogTotal);
      }
      
      // Use real data for comparisons if available
      setComparisons(playerResponse.analytics?.comparisons?.similarPlayers?.map((name, index) => ({
        player: { 
          name, 
          team: ['TEX', 'LAD', 'NYY', 'SF'][index] || 'UNK', 
          position: playerResponse.position 
        },
        similarity: 85 + Math.floor(Math.random() * 15),
        reason: ['Similar batting style', 'Comparable power numbers', 'Defensive similarity'][index] || 'Statistical match'
      })) || []);

      // Use salary data from player response (already includes name normalization)
      console.log('Player response salary data:', playerResponse.salary);
      
      if (playerResponse.salary && playerResponse.salary.salary) {
        setSalaryData(playerResponse.salary);
      } else {
        console.log('No salary data in player response');
        setSalaryData(null);
      }
      
      // Use pre-computed CVR from backend instead of calculating dynamically
      // This ensures consistency with the players list page
      const backendCVR = playerResponse.cvr || playerResponse.seasonStats?.cvr || 0;
      console.log('🚨 USING BACKEND CVR:', backendCVR, 'from player response');
      setCvr(backendCVR);
      
      // Create minimal CVR data for explanation (we'll use the backend value)
      if (backendCVR > 0) {
        setCvrData({
          cvr: backendCVR,
          explanation: 'Pre-computed CVR from backend (consistent with players list)',
          source: 'backend'
        });
      } else {
        setCvrData(null);
      }
      
    } catch (err) {
      console.error('Error loading player data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [team, playerName, year]);

  useEffect(() => {
    if (team && playerName && year) {
      loadPlayerData();
    }
  }, [team, playerName, year, loadPlayerData]);

  // Determine player type based on games played - MUST be before any early returns
  const playerType = React.useMemo(() => {
    const battingGames = playerStats?.batting?.gamesPlayed || 0;
    const pitchingGames = playerStats?.pitching?.gamesPlayed || 0;
    const atBats = playerStats?.batting?.atBats || 0;
    const inningsPitched = parseFloat(playerStats?.pitching?.inningsPitched) || 0;
    
    // Check for two-way player - meaningful stats in both categories
    const hasBattingStats = battingGames > 0 || atBats > 0;
    const hasPitchingStats = pitchingGames > 0 || inningsPitched > 0;
    
    if (hasBattingStats && hasPitchingStats) {
      return 'two-way'; // Two-way player (any meaningful stats in both)
    } else if (hasPitchingStats && !hasBattingStats) {
      return 'pitcher'; // Pure pitcher
    } else {
      return 'batter'; // Pure batter (default)
    }
  }, [playerStats]);

  const tabs = [
    { value: 'overview', label: 'Overview', icon: <Person /> },
    { value: 'stats', label: 'Statistics', icon: <Assessment /> },
    { value: 'games', label: 'Game Log', icon: <Timeline /> },
    { value: 'compare', label: 'Compare', icon: <Compare /> }
  ];

  if (loading) {
    return <PlayerDetailSkeleton />;
  }

  if (error || !player) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          {error || 'Player not found'}
        </Typography>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/players')}
          sx={{ mt: 2 }}
        >
          Back to Players
        </Button>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => navigate('/players')}
            sx={{ mb: 2 }}
          >
            Back to Players
          </Button>
          
          <Card elevation={0} sx={{ 
            background: `linear-gradient(135deg, ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.05)}, ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.02)})`,
            border: `1px solid ${alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.2)}`
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  src={getTeamLogoUrl(player?.team || team)}
                  alt={player?.team || team}
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                    mr: 3,
                    fontSize: '1.5rem',
                    fontWeight: 700
                  }}
                  imgProps={{
                    style: { objectFit: 'contain', background: 'white' }
                  }}
                >
                  {player.team || team}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h3" fontWeight={800} gutterBottom>
                    {player.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={player.position || 'Unknown Position'}
                      sx={{
                        backgroundColor: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                        color: '#ffffff',
                        fontWeight: 700
                      }}
                    />
                    <Chip
                      label={player.team}
                      sx={{
                        backgroundColor: alpha(themeUtils.getTeamColor(player?.team || team) || '#1976d2', 0.1),
                        color: themeUtils.getTeamColor(player?.team || team) || '#1976d2',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary">
                    {player.birthDate && `Born: ${new Date(player.birthDate).toLocaleDateString()}`}
                    {player.height && ` • Height: ${player.height}`}
                    {player.weight && ` • Weight: ${player.weight}`}
                    {player.bats && ` • Bats: ${player.bats}`}
                    {player.throws && ` • Throws: ${player.throws}`}
                  </Typography>
                </Box>
                
                {/* Quick Stats - CVR Focus */}
                <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      {(() => {
                        const cvrDisplay = getCVRDisplay(cvr);
                        return (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                          >
                            <Tooltip
                              title={
                                <CVRExplanation 
                                  player={player} 
                                  cvrData={cvrData} 
                                  salaryData={salaryData} 
                                />
                              }
                              arrow
                              placement="top"
                              enterDelay={300}
                              leaveDelay={200}
                            >
                              <Box 
                                sx={{ 
                                  background: `linear-gradient(135deg, ${cvrDisplay.color}15, ${cvrDisplay.color}05)`,
                                  border: `2px solid ${cvrDisplay.color}`,
                                  borderRadius: 3,
                                  padding: 2,
                                  position: 'relative',
                                  overflow: 'hidden',
                                  cursor: 'help',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: `linear-gradient(45deg, transparent 30%, ${cvrDisplay.color}10 50%, transparent 70%)`,
                                    animation: cvr && cvr > 1.2 ? 'shimmer 2s infinite' : 'none',
                                  },
                                  '@keyframes shimmer': {
                                    '0%': { transform: 'translateX(-100%)' },
                                    '100%': { transform: 'translateX(100%)' }
                                  }
                                }}
                              >
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        color: cvrDisplay.color, 
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1
                                      }}
                                    >
                                      {cvrDisplay.emoji} Cycle Value Rating
                                    </Typography>
                                    <IconButton 
                                      size="small" 
                                      sx={{ 
                                        color: cvrDisplay.color, 
                                        opacity: 0.7,
                                        '&:hover': { opacity: 1 }
                                      }}
                                    >
                                      <InfoOutlined fontSize="small" />
                                    </IconButton>
                                  </Box>
                                <Typography 
                                  variant="h3" 
                                  sx={{ 
                                    color: cvrDisplay.color,
                                    fontWeight: 900,
                                    fontSize: '2.5rem',
                                    lineHeight: 1,
                                    textShadow: cvr && cvr > 1.5 ? `0 0 20px ${cvrDisplay.color}50` : 'none'
                                  }}
                                >
                                  {cvrDisplay.value}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: cvrDisplay.color,
                                    fontWeight: 500,
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  {cvrDisplay.description}
                                </Typography>
                                {cvrDisplay.grade && (
                                  <Chip 
                                    label={`Grade: ${cvrDisplay.grade}`}
                                    size="small"
                                    sx={{ 
                                      mt: 0.5,
                                      backgroundColor: cvrDisplay.color,
                                      color: 'white',
                                      fontWeight: 700,
                                      fontSize: '0.6rem'
                                    }}
                                  />
                                )}
                                {salaryData && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      display: 'block',
                                      mt: 1,
                                      color: 'text.secondary',
                                      fontSize: '0.6rem'
                                    }}
                                  >
                                    Salary: {formatSalary(salaryData.salary)}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            </Tooltip>
                          </motion.div>
                        );
                      })()}
                    </Grid>
                    
                    <Grid item xs={6}>
                      {(() => {
                        const warDisplay = getWARDisplay(player.war);
                        return (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                          >
                            <Box 
                              sx={{ 
                                background: `linear-gradient(135deg, ${warDisplay.color}15, ${warDisplay.color}05)`,
                                border: `2px solid ${warDisplay.color}`,
                                borderRadius: 3,
                                padding: 2,
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'help',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: `linear-gradient(45deg, transparent 30%, ${warDisplay.color}10 50%, transparent 70%)`,
                                  animation: player.war && player.war > 2.0 ? 'shimmer 2s infinite' : 'none',
                                },
                                '@keyframes shimmer': {
                                  '0%': { transform: 'translateX(-100%)' },
                                  '100%': { transform: 'translateX(100%)' }
                                }
                              }}
                            >
                              <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: warDisplay.color, 
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      textTransform: 'uppercase',
                                      letterSpacing: 1
                                    }}
                                  >
                                    {warDisplay.emoji} Wins Above Replacement
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    sx={{ 
                                      color: warDisplay.color, 
                                      opacity: 0.7,
                                      '&:hover': { opacity: 1 }
                                    }}
                                  >
                                    <InfoOutlined fontSize="small" />
                                  </IconButton>
                                </Box>
                              <Typography 
                                variant="h3" 
                                sx={{ 
                                  color: warDisplay.color,
                                  fontWeight: 900,
                                  fontSize: '2.5rem',
                                  lineHeight: 1,
                                  textShadow: player.war && player.war > 2.0 ? `0 0 20px ${warDisplay.color}50` : 'none'
                                }}
                              >
                                {warDisplay.value}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: warDisplay.color,
                                  fontWeight: 500,
                                  fontSize: '0.7rem'
                                }}
                              >
                                {warDisplay.description}
                              </Typography>
                              {warDisplay.grade && (
                                <Chip 
                                  label={`Grade: ${warDisplay.grade}`}
                                  size="small"
                                  sx={{ 
                                    mt: 0.5,
                                    backgroundColor: warDisplay.color,
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.6rem'
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          </motion.div>
                        );
                      })()}
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Navigation Tabs */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                px: 3,
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
        </Card>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <PlayerOverview player={player} seasonStats={playerStats} recentGames={gameStats} playerType={playerType} />
        )}
        
        {activeTab === 'stats' && (
          <PlayerStats stats={playerStats} playerType={playerType} />
        )}
        
        {activeTab === 'games' && (
          <PlayerGameLog games={gameStats} playerType={playerType} />
        )}
        
        {activeTab === 'compare' && (
          <PlayerComparisons 
            player={player} 
            comparisons={comparisons} 
            playerType={playerType} 
            seasonStats={playerStats} 
            playerCVR={cvr}
            playerSalary={salaryData}
          />
        )}
      </Box>
    </motion.div>
  );
};

// Player overview component
const PlayerOverview = ({ player, seasonStats, recentGames, playerType }) => {
  const theme = useTheme();

  // Calculate key highlights from real data
  const keyStats = React.useMemo(() => {
    const categories = [];
    
    // Show batting statistics for batters and two-way players
    if ((playerType === 'batter' || playerType === 'two-way') && seasonStats?.batting) {
      const batting = seasonStats.batting;
      
      // Calculate batting average
      const avg = batting.atBats > 0 ? (batting.hits / batting.atBats) : 0;
      
      // Calculate on-base percentage
      const obp = (batting.atBats + batting.baseOnBalls + batting.hitByPitch + (batting.sacrificeFlies || 0)) > 0 
        ? (batting.hits + batting.baseOnBalls + batting.hitByPitch) / 
          (batting.atBats + batting.baseOnBalls + batting.hitByPitch + (batting.sacrificeFlies || 0))
        : 0;
      
      // Calculate slugging percentage
      const totalBases = batting.hits + batting.doubles + (2 * batting.triples) + (3 * batting.homeRuns);
      const slg = batting.atBats > 0 ? (totalBases / batting.atBats) : 0;
      
      // Calculate OPS
      const ops = obp + slg;
      
      categories.push({
        category: 'Batting',
        stats: [
          { 
            label: 'Batting Average', 
            value: avg.toFixed(3), 
            color: 'primary' 
          },
          { 
            label: 'On-Base Percentage', 
            value: obp.toFixed(3), 
            color: 'success' 
          },
          { 
            label: 'Slugging Percentage', 
            value: slg.toFixed(3), 
            color: 'warning' 
          },
          { 
            label: 'OPS', 
            value: ops.toFixed(3), 
            color: 'error' 
          },
          { label: 'Home Runs', value: batting.homeRuns || 0, color: 'primary' },
          { label: 'RBIs', value: batting.rbi || 0, color: 'success' }
        ]
      });
    }

    // Show pitching statistics for pitchers and two-way players
    if ((playerType === 'pitcher' || playerType === 'two-way') && seasonStats?.pitching && seasonStats.pitching.gamesPlayed > 0) {
      const pitching = seasonStats.pitching;
      
      // Calculate ERA using helper function
      const ip = parseInningsPitched(pitching.inningsPitched);
      const era = ip > 0 ? (pitching.earnedRuns * 9) / ip : 0;
      
      // Calculate WHIP
      const whip = ip > 0 ? (pitching.hits + pitching.baseOnBalls) / ip : 0;
      
      categories.push({
        category: 'Pitching',
        stats: [
          { 
            label: 'ERA', 
            value: era.toFixed(2), 
            color: 'primary' 
          },
          { 
            label: 'WHIP', 
            value: whip.toFixed(2), 
            color: 'success' 
          },
          { label: 'Wins', value: pitching.wins || 0, color: 'warning' },
          { label: 'Losses', value: pitching.losses || 0, color: 'error' },
          { label: 'Strikeouts', value: pitching.strikeOuts || 0, color: 'primary' },
          { label: 'Innings Pitched', value: formatInningsPitched(ip), color: 'success' }
        ]
      });
    }

    return categories;
  }, [seasonStats, playerType]);

  // Recent performance metrics based on actual recent games
  const recentPerformance = React.useMemo(() => {
    if (!recentGames || recentGames.length === 0) return null;
    
    const last10 = recentGames.slice(0, 10);
    const totals = last10.reduce((acc, game) => {
      const batting = game.stats?.batting || {};
      return {
        atBats: acc.atBats + (batting.atBats || 0),
        hits: acc.hits + (batting.hits || 0),
        games: acc.games + 1
      };
    }, { atBats: 0, hits: 0, games: 0 });
    
    const recentAvg = totals.atBats > 0 ? (totals.hits / totals.atBats) : 0;
    const seasonAvg = seasonStats?.batting?.atBats > 0 ? (seasonStats.batting.hits / seasonStats.batting.atBats) : 0;
    
    // Calculate performance metrics
    const consistency = Math.min(100, Math.max(0, (recentAvg * 300))); // Scale 0-100
    const hotStreak = recentAvg > seasonAvg ? Math.min(100, (recentAvg / seasonAvg) * 50) : Math.max(30, recentAvg * 200);
    const clutchFactor = Math.min(100, Math.max(50, (seasonStats?.batting?.rbi || 0) * 1.5)); // RBI-based clutch
    
    return {
      consistency: Math.round(consistency),
      hotStreak: Math.round(hotStreak),
      clutchFactor: Math.round(clutchFactor),
      recentAvg: recentAvg.toFixed(3),
      games: totals.games
    };
  }, [recentGames, seasonStats]);

  return (
    <Grid container spacing={3}>
      {keyStats.map((category) => (
        <Grid item xs={12} lg={6} key={category.category}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Sports sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>
                  {category.category} Statistics
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {category.stats.map((stat, index) => (
                  <Grid item xs={6} key={index}>
                    <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette[stat.color].main, 0.05) }}>
                      <Typography variant="h4" fontWeight={800} color={stat.color}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Performance Metrics */}
      {recentPerformance && (
        <Grid item xs={12}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Recent Performance (Last {recentPerformance.games} Games)
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  Recent Batting Average: <strong>{recentPerformance.recentAvg}</strong>
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Performance Level</Typography>
                      <Typography variant="body2" fontWeight={600}>{recentPerformance.consistency}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={recentPerformance.consistency} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Hot Streak</Typography>
                      <Typography variant="body2" fontWeight={600}>{recentPerformance.hotStreak}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={recentPerformance.hotStreak} 
                      color="success"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Clutch Factor</Typography>
                      <Typography variant="body2" fontWeight={600}>{recentPerformance.clutchFactor}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={recentPerformance.clutchFactor} 
                      color="warning"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

// Player stats component
const PlayerStats = ({ stats, playerType }) => {
  // Calculate advanced batting stats from raw data
  const calculateAdvancedStats = React.useMemo(() => {
    if (!stats?.batting) return {};
    
    const batting = stats.batting;
    const avg = batting.atBats > 0 ? (batting.hits / batting.atBats) : 0;
    const obp = (batting.atBats + batting.baseOnBalls + batting.hitByPitch + (batting.sacrificeFlies || 0)) > 0 
      ? (batting.hits + batting.baseOnBalls + batting.hitByPitch) / 
        (batting.atBats + batting.baseOnBalls + batting.hitByPitch + (batting.sacrificeFlies || 0))
      : 0;
    const totalBases = batting.hits + batting.doubles + (2 * batting.triples) + (3 * batting.homeRuns);
    const slg = batting.atBats > 0 ? (totalBases / batting.atBats) : 0;
    const ops = obp + slg;
    const iso = slg - avg;
    
    return { avg, obp, slg, ops, iso };
  }, [stats]);

  // Calculate advanced pitching stats from raw data
  const calculatePitchingStats = React.useMemo(() => {
    if (!stats?.pitching) return {};
    
    const pitching = stats.pitching;
    const ip = parseInningsPitched(pitching.inningsPitched);
    const era = ip > 0 ? (pitching.earnedRuns * 9) / ip : 0;
    const whip = ip > 0 ? (pitching.hits + pitching.baseOnBalls) / ip : 0;
    
    return { era, whip, ip };
  }, [stats]);

  const battingStats = [
    { label: 'Games Played', value: stats?.batting?.gamesPlayed || 0 },
    { label: 'At Bats', value: stats?.batting?.atBats || 0 },
    { label: 'Plate Appearances', value: stats?.batting?.plateAppearances || 0 },
    { label: 'Hits', value: stats?.batting?.hits || 0 },
    { label: 'Runs', value: stats?.batting?.runs || 0 },
    { label: 'Doubles', value: stats?.batting?.doubles || 0 },
    { label: 'Triples', value: stats?.batting?.triples || 0 },
    { label: 'Home Runs', value: stats?.batting?.homeRuns || 0 },
    { label: 'RBIs', value: stats?.batting?.rbi || 0 },
    { label: 'Total Bases', value: stats?.batting?.totalBases || 0 },
    { label: 'Base on Balls', value: stats?.batting?.baseOnBalls || 0 },
    { label: 'Strikeouts', value: stats?.batting?.strikeOuts || 0 },
    { label: 'Hit by Pitch', value: stats?.batting?.hitByPitch || 0 },
    { label: 'Stolen Bases', value: stats?.batting?.stolenBases || 0 },
    { label: 'Caught Stealing', value: stats?.batting?.caughtStealing || 0 },
    { label: 'Batting Average', value: calculateAdvancedStats.avg?.toFixed(3) || '---' },
    { label: 'On-Base %', value: calculateAdvancedStats.obp?.toFixed(3) || '---' },
    { label: 'Slugging %', value: calculateAdvancedStats.slg?.toFixed(3) || '---' },
    { label: 'OPS', value: calculateAdvancedStats.ops?.toFixed(3) || '---' },
    { label: 'ISO', value: calculateAdvancedStats.iso?.toFixed(3) || '---' },
    { label: 'BABIP', value: stats?.batting?.babip?.toFixed(3) || '---' },
    { label: 'wOBA', value: stats?.batting?.wOBA?.toFixed(3) || '---' },
    { label: 'K Rate', value: stats?.batting?.kRate ? (stats.batting.kRate * 100).toFixed(1) + '%' : '---' },
    { label: 'BB Rate', value: stats?.batting?.bbRate ? (stats.batting.bbRate * 100).toFixed(1) + '%' : '---' }
  ];

  const pitchingStats = [
    { label: 'Games Played', value: stats?.pitching?.gamesPlayed || 0 },
    { label: 'Games Started', value: stats?.pitching?.gamesStarted || 0 },
    { label: 'Wins', value: stats?.pitching?.wins || 0 },
    { label: 'Losses', value: stats?.pitching?.losses || 0 },
    { label: 'Saves', value: stats?.pitching?.saves || 0 },
    { label: 'Holds', value: stats?.pitching?.holds || 0 },
    { label: 'Innings Pitched', value: calculatePitchingStats.ip ? formatInningsPitched(calculatePitchingStats.ip) : '---' },
    { label: 'Hits Allowed', value: stats?.pitching?.hits || 0 },
    { label: 'Runs Allowed', value: stats?.pitching?.runs || 0 },
    { label: 'Earned Runs', value: stats?.pitching?.earnedRuns || 0 },
    { label: 'Home Runs', value: stats?.pitching?.homeRuns || 0 },
    { label: 'Base on Balls', value: stats?.pitching?.baseOnBalls || 0 },
    { label: 'Strikeouts', value: stats?.pitching?.strikeOuts || 0 },
    { label: 'Hit by Pitch', value: stats?.pitching?.hitByPitch || 0 },
    { label: 'Batters Faced', value: stats?.pitching?.battersFaced || 0 },
    { label: 'ERA', value: calculatePitchingStats.era?.toFixed(2) || '---' },
    { label: 'WHIP', value: calculatePitchingStats.whip?.toFixed(2) || '---' },
    { label: 'FIP', value: stats?.pitching?.fip?.toFixed(2) || '---' },
    { label: 'xFIP', value: stats?.pitching?.xFip?.toFixed(2) || '---' },
    { label: 'BABIP', value: stats?.pitching?.babip?.toFixed(3) || '---' },
    { label: 'K/9', value: stats?.pitching?.strikeoutsPer9Inn?.toFixed(1) || '---' },
    { label: 'BB/9', value: stats?.pitching?.walksPer9Inn?.toFixed(1) || '---' },
    { label: 'H/9', value: stats?.pitching?.hitsPer9Inn?.toFixed(1) || '---' },
    { label: 'HR/9', value: stats?.pitching?.homeRunsPer9?.toFixed(1) || '---' }
  ];

  const fieldingStats = [
    { label: 'Games Started', value: stats?.fielding?.gamesStarted || 0 },
    { label: 'Assists', value: stats?.fielding?.assists || 0 },
    { label: 'Put Outs', value: stats?.fielding?.putOuts || 0 },
    { label: 'Errors', value: stats?.fielding?.errors || 0 },
    { label: 'Total Chances', value: stats?.fielding?.chances || 0 },
    { label: 'Fielding %', value: stats?.fielding?.fieldingPercentage?.toFixed(3) || '---' }
  ];

  // Determine what to show based on player type
  const showBatting = (playerType === 'batter' || playerType === 'two-way') && stats?.batting;
  const showPitching = (playerType === 'pitcher' || playerType === 'two-way') && stats?.pitching?.gamesPlayed > 0;
  const showFielding = stats?.fielding;

  return (
    <Grid container spacing={3}>
      {/* Batting Stats */}
      {showBatting && (
        <Grid item xs={12} lg={showPitching ? 6 : 12}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Batting Statistics
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {battingStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{stat.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Pitching Stats */}
      {showPitching && (
        <Grid item xs={12} lg={showBatting ? 6 : 12}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Pitching Statistics
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {pitchingStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{stat.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Fielding Stats */}
      {showFielding && (
        <Grid item xs={12} lg={4}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Fielding Statistics
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {fieldingStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{stat.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

// Player game log component
const PlayerGameLog = ({ games, playerType }) => {
  const formatDate = (dateString, game = {}) => {
    try {
      const official = game.gameInfo?.officialDate || game.officialDate || null;
      const startLocal = game.gameInfo?.startLocal || game.startLocal || null;

      if (official) {
        return new Date(official + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (startLocal) {
        const datePart = startLocal.split(/[ ,]/)[0];
        return new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Calculate game log totals for verification
  const gameLogTotals = React.useMemo(() => {
    if (!games || games.length === 0) return null;
    
    if (playerType === 'pitcher') {
      return games.reduce((acc, game) => {
        const pitching = game.stats?.pitching || {};
        const ip = parseInningsPitched(pitching.inningsPitched);
        return {
          games: acc.games + (ip > 0 ? 1 : 0),
          inningsPitched: acc.inningsPitched + ip,
          hits: acc.hits + (pitching.hits || 0),
          runs: acc.runs + (pitching.runs || 0),
          earnedRuns: acc.earnedRuns + (pitching.earnedRuns || 0),
          walks: acc.walks + (pitching.baseOnBalls || 0),
          strikeouts: acc.strikeouts + (pitching.strikeOuts || 0),
          wins: acc.wins + (pitching.wins || 0),
          losses: acc.losses + (pitching.losses || 0),
          saves: acc.saves + (pitching.saves || 0)
        };
      }, { games: 0, inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0, wins: 0, losses: 0, saves: 0 });
    } else {
      return games.reduce((acc, game) => {
        const batting = game.stats?.batting || {};
        return {
          games: acc.games + (batting.atBats > 0 ? 1 : 0),
          atBats: acc.atBats + (batting.atBats || 0),
          hits: acc.hits + (batting.hits || 0),
          runs: acc.runs + (batting.runs || 0),
          rbi: acc.rbi + (batting.rbi || 0),
          homeRuns: acc.homeRuns + (batting.homeRuns || 0),
          walks: acc.walks + (batting.baseOnBalls || 0),
          strikeouts: acc.strikeouts + (batting.strikeOuts || 0)
        };
      }, { games: 0, atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 });
    }
  }, [games, playerType]);

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Season Game Log ({games?.length || 0} Games)
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Opponent</TableCell>
                {playerType === 'pitcher' ? (
                  // Pitching columns
                  <>
                    <TableCell align="center">Dec</TableCell>
                    <TableCell align="center">IP</TableCell>
                    <TableCell align="center">H</TableCell>
                    <TableCell align="center">R</TableCell>
                    <TableCell align="center">ER</TableCell>
                    <TableCell align="center">BB</TableCell>
                    <TableCell align="center">K</TableCell>
                    <TableCell align="center">ERA</TableCell>
                  </>
                ) : (
                  // Batting columns
                  <>
                    <TableCell align="center">AB</TableCell>
                    <TableCell align="center">H</TableCell>
                    <TableCell align="center">R</TableCell>
                    <TableCell align="center">RBI</TableCell>
                    <TableCell align="center">HR</TableCell>
                    <TableCell align="center">BB</TableCell>
                    <TableCell align="center">K</TableCell>
                    <TableCell align="center">AVG</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {games && games.length > 0 ? (
                games.map((game, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{formatDate(game.date, game)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {game.gameInfo?.homeAway === 'home' ? 'vs' : '@'} {game.gameInfo?.opponent || '---'}
                      </Box>
                    </TableCell>
                    {playerType === 'pitcher' ? (
                      // Pitching stats
                      <>
                        <TableCell align="center">
                          {game.stats?.pitching?.wins ? 'W' : 
                           game.stats?.pitching?.losses ? 'L' : 
                           game.stats?.pitching?.saves ? 'S' : '---'}
                        </TableCell>
                        <TableCell align="center">
                          {(() => {
                            const ip = parseInningsPitched(game.stats?.pitching?.inningsPitched);
                            return ip > 0 ? formatInningsPitched(ip) : '---';
                          })()}
                        </TableCell>
                        <TableCell align="center">{game.stats?.pitching?.hits || 0}</TableCell>
                        <TableCell align="center">{game.stats?.pitching?.runs || 0}</TableCell>
                        <TableCell align="center">{game.stats?.pitching?.earnedRuns || 0}</TableCell>
                        <TableCell align="center">{game.stats?.pitching?.baseOnBalls || 0}</TableCell>
                        <TableCell align="center">{game.stats?.pitching?.strikeOuts || 0}</TableCell>
                        <TableCell align="center">
                          {(() => {
                            const ip = parseInningsPitched(game.stats?.pitching?.inningsPitched);
                            const er = game.stats?.pitching?.earnedRuns || 0;
                            return ip > 0 ? ((er * 9) / ip).toFixed(2) : '---';
                          })()}
                        </TableCell>
                      </>
                    ) : (
                      // Batting stats
                      <>
                        <TableCell align="center">{game.stats?.batting?.atBats || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.hits || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.runs || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.rbi || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.homeRuns || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.baseOnBalls || 0}</TableCell>
                        <TableCell align="center">{game.stats?.batting?.strikeOuts || 0}</TableCell>
                        <TableCell align="center">
                          {game.stats?.batting?.atBats > 0 
                            ? (game.stats.batting.hits / game.stats.batting.atBats).toFixed(3)
                            : '---'
                          }
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={playerType === 'pitcher' ? 10 : 10} align="center">
                    <Typography color="text.secondary">
                      No game data available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              
              {/* Game Log Totals Row */}
              {gameLogTotals && (
                <TableRow sx={{ backgroundColor: alpha('#1976d2', 0.05), fontWeight: 'bold' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Totals</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{gameLogTotals.games} Games</TableCell>
                  {playerType === 'pitcher' ? (
                    <>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {gameLogTotals.wins}W-{gameLogTotals.losses}L-{gameLogTotals.saves}S
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {formatInningsPitched(gameLogTotals.inningsPitched)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.hits}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.runs}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.earnedRuns}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.walks}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.strikeouts}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {gameLogTotals.inningsPitched > 0 
                          ? ((gameLogTotals.earnedRuns * 9) / gameLogTotals.inningsPitched).toFixed(2)
                          : '---'
                        }
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.atBats}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.hits}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.runs}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.rbi}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.homeRuns}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.walks}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{gameLogTotals.strikeouts}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {gameLogTotals.atBats > 0 
                          ? (gameLogTotals.hits / gameLogTotals.atBats).toFixed(3)
                          : '---'
                        }
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Player comparisons component - Modern redesign with detailed statistical comparisons
const PlayerComparisons = ({ player, playerType, seasonStats, playerCVR, playerSalary }) => {
  const theme = useTheme();
  const [comparisonPlayers, setComparisonPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playerCVRs, setPlayerCVRs] = useState({}); // Store CVR data for compared players

  // Get key statistics for comparison based on player type
  const getKeyStats = (stats, type) => {
    if (type === 'pitcher' && stats?.pitching) {
      const ip = parseInningsPitched(stats.pitching.inningsPitched);
      const era = ip > 0 ? (stats.pitching.earnedRuns * 9) / ip : 0;
      const whip = ip > 0 ? (stats.pitching.hits + stats.pitching.baseOnBalls) / ip : 0;
      const k9 = ip > 0 ? (stats.pitching.strikeOuts * 9) / ip : 0;
      
      return [
        { label: 'ERA', value: era.toFixed(2), format: 'decimal' },
        { label: 'WHIP', value: whip.toFixed(2), format: 'decimal' },
        { label: 'K/9', value: k9.toFixed(1), format: 'decimal' },
        { label: 'IP', value: formatInningsPitched(ip), format: 'innings' },
        { label: 'W-L', value: `${stats.pitching.wins || 0}-${stats.pitching.losses || 0}`, format: 'record' },
        { label: 'Saves', value: stats.pitching.saves || 0, format: 'number' }
      ];
    } else if (stats?.batting) {
      const avg = stats.batting.atBats > 0 ? (stats.batting.hits / stats.batting.atBats) : 0;
      const obp = (stats.batting.atBats + stats.batting.baseOnBalls + stats.batting.hitByPitch + (stats.batting.sacrificeFlies || 0)) > 0 
        ? (stats.batting.hits + stats.batting.baseOnBalls + stats.batting.hitByPitch) / 
          (stats.batting.atBats + stats.batting.baseOnBalls + stats.batting.hitByPitch + (stats.batting.sacrificeFlies || 0))
        : 0;
      const totalBases = stats.batting.hits + stats.batting.doubles + (2 * stats.batting.triples) + (3 * stats.batting.homeRuns);
      const slg = stats.batting.atBats > 0 ? (totalBases / stats.batting.atBats) : 0;
      
      return [
        { label: 'AVG', value: avg.toFixed(3), format: 'average' },
        { label: 'OBP', value: obp.toFixed(3), format: 'average' },
        { label: 'SLG', value: slg.toFixed(3), format: 'average' },
        { label: 'OPS', value: (obp + slg).toFixed(3), format: 'average' },
        { label: 'HR', value: stats.batting.homeRuns || 0, format: 'number' },
        { label: 'RBI', value: stats.batting.rbi || 0, format: 'number' }
      ];
    }
    return [];
  };

  // Find statistically similar players
  const findSimilarPlayers = React.useCallback(async () => {
    if (!player || !seasonStats) return;

    try {
      setLoading(true);
      console.log('Finding similar players for:', player.name);
      
      const playersResponse = await playersApi.getPlayers({ year: player.year });
      const allPlayers = playersResponse.players || [];
      
      // Filter candidates by position type
      const candidates = allPlayers.filter(p => {
        if (p.name === player.name) return false;
        
        if (playerType === 'pitcher') {
          return p.position && (p.position.includes('P') || p.position === 'SP' || p.position === 'RP');
        } else {
          return p.position && !p.position.includes('P');
        }
      });

      console.log(`Found ${candidates.length} candidate players`);

      // Calculate similarities for top candidates
      const similarities = [];
      const playersToCheck = candidates.slice(0, 50); // Check more players for better matches

      for (const candidate of playersToCheck) {
        try {
          const candidateKey = `${candidate.team}-${candidate.name.replace(/\s+/g, '_')}-${player.year}`;
          const candidateData = await playersApi.getPlayerById(candidateKey);
          
          if (!candidateData?.seasonStats) continue;

          let similarity = 0;
          let matchedStats = [];

          if (playerType === 'pitcher' && candidateData.seasonStats.pitching && seasonStats.pitching) {
            const myStats = seasonStats.pitching;
            const theirStats = candidateData.seasonStats.pitching;
            
            const myIP = parseInningsPitched(myStats.inningsPitched);
            const theirIP = parseInningsPitched(theirStats.inningsPitched);
            
            if (myIP > 10 && theirIP > 10) { // Only compare pitchers with meaningful innings
              const myERA = myIP > 0 ? (myStats.earnedRuns * 9) / myIP : 0;
              const theirERA = theirIP > 0 ? (theirStats.earnedRuns * 9) / theirIP : 0;
              
              const myWHIP = myIP > 0 ? (myStats.hits + myStats.baseOnBalls) / myIP : 0;
              const theirWHIP = theirIP > 0 ? (theirStats.hits + theirStats.baseOnBalls) / theirIP : 0;
              
              const myK9 = myIP > 0 ? (myStats.strikeOuts * 9) / myIP : 0;
              const theirK9 = theirIP > 0 ? (theirStats.strikeOuts * 9) / theirIP : 0;

              // Calculate similarity scores
              const eraSim = Math.max(0, 100 - Math.abs(myERA - theirERA) * 15);
              const whipSim = Math.max(0, 100 - Math.abs(myWHIP - theirWHIP) * 50);
              const k9Sim = Math.max(0, 100 - Math.abs(myK9 - theirK9) * 5);
              const ipSim = Math.max(0, 100 - Math.abs(myIP - theirIP) * 1);

              similarity = (eraSim + whipSim + k9Sim + ipSim) / 4;

              if (eraSim > 70) matchedStats.push('Similar ERA');
              if (whipSim > 70) matchedStats.push('Similar WHIP');
              if (k9Sim > 70) matchedStats.push('Similar strikeout rate');
              if (ipSim > 70) matchedStats.push('Similar workload');
            }
          } else if (candidateData.seasonStats.batting && seasonStats.batting) {
            const myStats = seasonStats.batting;
            const theirStats = candidateData.seasonStats.batting;

            if (myStats.atBats > 50 && theirStats.atBats > 50) { // Only compare hitters with meaningful ABs
              const myAVG = myStats.hits / myStats.atBats;
              const theirAVG = theirStats.hits / theirStats.atBats;
              
              const myOBP = (myStats.hits + myStats.baseOnBalls + myStats.hitByPitch) / 
                           (myStats.atBats + myStats.baseOnBalls + myStats.hitByPitch + (myStats.sacrificeFlies || 0));
              const theirOBP = (theirStats.hits + theirStats.baseOnBalls + theirStats.hitByPitch) / 
                              (theirStats.atBats + theirStats.baseOnBalls + theirStats.hitByPitch + (theirStats.sacrificeFlies || 0));

              const myHR = myStats.homeRuns || 0;
              const theirHR = theirStats.homeRuns || 0;

              const myRBI = myStats.rbi || 0;
              const theirRBI = theirStats.rbi || 0;

              // Calculate similarity scores
              const avgSim = Math.max(0, 100 - Math.abs(myAVG - theirAVG) * 300);
              const obpSim = Math.max(0, 100 - Math.abs(myOBP - theirOBP) * 300);
              const hrSim = Math.max(0, 100 - Math.abs(myHR - theirHR) * 2);
              const rbiSim = Math.max(0, 100 - Math.abs(myRBI - theirRBI) * 1);

              similarity = (avgSim + obpSim + hrSim + rbiSim) / 4;

              if (avgSim > 75) matchedStats.push('Similar batting average');
              if (obpSim > 75) matchedStats.push('Similar on-base percentage');
              if (hrSim > 75) matchedStats.push('Similar power');
              if (rbiSim > 75) matchedStats.push('Similar run production');
            }
          }

          if (similarity > 50 && matchedStats.length > 0) { // Higher threshold for better matches
            similarities.push({
              player: {
                name: candidate.name,
                team: candidate.team,
                position: candidate.position
              },
              similarity: Math.round(similarity),
              matchedStats,
              stats: candidateData.seasonStats
            });
          }

        } catch (err) {
          console.log(`Error checking ${candidate.name}:`, err.message);
          continue;
        }
      }

      console.log(`Found ${similarities.length} similar players`);
      
      // Sort by similarity and take top 5
      const topSimilar = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      setComparisonPlayers(topSimilar);

    } catch (err) {
      console.error('Error finding similar players:', err);
      setComparisonPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [player, seasonStats, playerType]);

  // Load available players for search
  const loadAvailablePlayers = React.useCallback(async () => {
    try {
      const response = await playersApi.getPlayers({ year: player.year });
      const players = response.players || [];
      
      const filteredPlayers = players
        .filter(p => p.name !== player.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailablePlayers(filteredPlayers);
    } catch (err) {
      console.error('Error loading available players:', err);
      setAvailablePlayers([]);
    }
  }, [player]);

  // Handle player selection for detailed comparison
  const selectPlayerForComparison = async (selectedPlayerData) => {
    try {
      setLoading(true);
      const playerKey = `${selectedPlayerData.team}-${selectedPlayerData.name.replace(/\s+/g, '_')}-${player.year}`;
      const fullPlayerData = await playersApi.getPlayerById(playerKey);
      
      if (fullPlayerData?.seasonStats) {
        const updatedSelectedPlayer = {
          ...selectedPlayerData,
          stats: fullPlayerData.seasonStats
        };
        setSelectedPlayer(updatedSelectedPlayer);

        // Fetch CVR data for the selected player
        try {
          const salaryResponse = await statsApi.getSalary(
            selectedPlayerData.team, 
            selectedPlayerData.name.replace(/\s+/g, '_'), 
            player.year
          );
          
          if (salaryResponse && salaryResponse.data && salaryResponse.data.salary) {
            const cvrResult = await calculatePlayerCVR(
              { stats: fullPlayerData.seasonStats },
              salaryResponse.data
            );
            
            setPlayerCVRs(prev => ({
              ...prev,
              [playerKey]: {
                cvr: cvrResult.cvr,
                salary: salaryResponse.data.salary,
                salaryData: salaryResponse.data,
                cvrDetails: cvrResult
              }
            }));
          }
        } catch (cvrErr) {
          console.log('CVR data not available for selected player:', cvrErr.message);
        }
      }
    } catch (err) {
      console.error('Error loading player for comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize
  React.useEffect(() => {
    if (player && seasonStats) {
      findSimilarPlayers();
      loadAvailablePlayers();
    }
  }, [player, seasonStats, findSimilarPlayers, loadAvailablePlayers]);

  // Filter available players based on search
  const filteredPlayers = availablePlayers.filter(p => {
    if (!searchTerm) return false;
    const searchLower = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(searchLower) || 
           p.team.toLowerCase().includes(searchLower);
  });

  const playerStats = getKeyStats(seasonStats, playerType);
  const selectedStats = selectedPlayer ? getKeyStats(selectedPlayer.stats, playerType) : [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Grid container spacing={4}>
        {/* Similar Players Section */}
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ height: 'fit-content' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendingUp sx={{ mr: 2, color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>
                  Statistically Similar Players
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    Analyzing player statistics...
                  </Typography>
                </Box>
              ) : comparisonPlayers.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {comparisonPlayers.map((comparison, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          borderColor: alpha(theme.palette.primary.main, 0.2)
                        }
                      }}
                      onClick={() => selectPlayerForComparison(comparison.player)}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar
                            sx={{
                              backgroundColor: themeUtils.getTeamColor(comparison.player.team) || theme.palette.primary.main,
                              mr: 2,
                              width: 32,
                              height: 32,
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}
                          >
                            {comparison.player.team}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {comparison.player.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {comparison.player.team} • {comparison.player.position}
                            </Typography>
                          </Box>
                          <Typography
                            variant="h6"
                            color="primary"
                            fontWeight={700}
                            sx={{ fontSize: '1.1rem' }}
                          >
                            {comparison.similarity}%
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Similar in: {comparison.matchedStats.join(', ')}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>
                    No statistically similar players found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This player has a unique statistical profile
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Player Search & Detailed Comparison */}
        <Grid item xs={12} lg={6}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Compare sx={{ mr: 2, color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>
                  Custom Comparison
                </Typography>
              </Box>

              {/* Search Bar */}
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for a player to compare..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 3 }}
              />

              {/* Search Results */}
              {searchTerm && filteredPlayers.length > 0 && (
                <Paper
                  elevation={2}
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    mb: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                  }}
                >
                  <List sx={{ p: 0 }}>
                    {filteredPlayers.slice(0, 10).map((p, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => {
                          selectPlayerForComparison(p);
                          setSearchTerm('');
                        }}
                        sx={{
                          borderBottom: index < Math.min(filteredPlayers.length, 10) - 1 ? 
                            `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Avatar
                            sx={{
                              backgroundColor: themeUtils.getTeamColor(p.team) || theme.palette.primary.main,
                              mr: 2,
                              width: 28,
                              height: 28,
                              fontSize: '0.6rem',
                              fontWeight: 700
                            }}
                          >
                            {p.team}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {p.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.team} • {p.position}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Detailed Comparison */}
              {selectedPlayer ? (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Comparing with {selectedPlayer.name}
                    </Typography>
                    <Divider />
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Statistic</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {player.name}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {selectedPlayer.name}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            Difference
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {playerStats.map((stat, index) => {
                          const selectedStat = selectedStats[index];
                          const playerVal = parseFloat(String(stat.value).replace(/[^\d.-]/g, '')) || 0;
                          const selectedVal = parseFloat(String(selectedStat?.value || '').replace(/[^\d.-]/g, '')) || 0;
                          const diff = playerVal - selectedVal;
                          const isPlayerBetter = 
                            (stat.label === 'ERA' || stat.label === 'WHIP') ? diff < 0 : diff > 0;

                          return (
                            <TableRow key={index}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {stat.label}
                              </TableCell>
                              <TableCell 
                                align="center" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: isPlayerBetter ? 'success.main' : 'inherit'
                                }}
                              >
                                {stat.value}
                              </TableCell>
                              <TableCell 
                                align="center" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: !isPlayerBetter ? 'success.main' : 'inherit'
                                }}
                              >
                                {selectedStat?.value || '---'}
                              </TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: Math.abs(diff) < 0.01 ? 'text.secondary' :
                                           isPlayerBetter ? 'success.main' : 'error.main',
                                    fontWeight: 600
                                  }}
                                >
                                  {Math.abs(diff) < 0.01 ? 'Even' :
                                   `${diff > 0 ? '+' : ''}${diff.toFixed(stat.format === 'average' ? 3 : 
                                                                      stat.format === 'decimal' ? 2 : 0)}`}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* CVR Comparison Row */}
                        {(() => {
                          const selectedPlayerKey = selectedPlayer ? `${selectedPlayer.team}-${selectedPlayer.name.replace(/\s+/g, '_')}-${player.year}` : null;
                          const selectedPlayerCVR = selectedPlayerKey ? playerCVRs[selectedPlayerKey] : null;
                          const playerCVRDisplay = getCVRDisplay(playerCVR);
                          const selectedCVRDisplay = getCVRDisplay(selectedPlayerCVR?.cvr);
                          
                          const playerCVRVal = playerCVR || 0;
                          const selectedCVRVal = selectedPlayerCVR?.cvr || 0;
                          const cvrDiff = playerCVRVal - selectedCVRVal;
                          const isPlayerBetter = cvrDiff > 0;

                          return (
                            <TableRow 
                              sx={{ 
                                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                                '& td': { borderTop: `2px solid ${theme.palette.primary.main}` }
                              }}
                            >
                              <TableCell sx={{ fontWeight: 700 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  💎 CVR (Cycle Value Rating)
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: 900,
                                      color: playerCVRDisplay.color,
                                      textShadow: playerCVR && playerCVR > 1.2 ? `0 0 10px ${playerCVRDisplay.color}50` : 'none'
                                    }}
                                  >
                                    {playerCVRDisplay.value}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: playerCVRDisplay.color, fontSize: '0.6rem' }}>
                                    {playerCVRDisplay.description}
                                  </Typography>
                                  {playerSalary && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                                      {formatSalary(playerSalary.salary)}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: 900,
                                      color: selectedCVRDisplay.color,
                                      textShadow: selectedPlayerCVR?.cvr && selectedPlayerCVR.cvr > 1.2 ? `0 0 10px ${selectedCVRDisplay.color}50` : 'none'
                                    }}
                                  >
                                    {selectedCVRDisplay.value}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: selectedCVRDisplay.color, fontSize: '0.6rem' }}>
                                    {selectedCVRDisplay.description}
                                  </Typography>
                                  {selectedPlayerCVR?.salary && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                                      {formatSalary(selectedPlayerCVR.salary)}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {playerCVR && selectedPlayerCVR?.cvr ? (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: Math.abs(cvrDiff) < 0.01 ? 'text.secondary' :
                                               isPlayerBetter ? 'success.main' : 'error.main',
                                        fontWeight: 700,
                                        fontSize: '0.9rem'
                                      }}
                                    >
                                      {Math.abs(cvrDiff) < 0.01 ? 'Even' :
                                       `${cvrDiff > 0 ? '+' : ''}${cvrDiff.toFixed(2)}`}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                      color: isPlayerBetter ? 'success.main' : 'error.main',
                                      fontSize: '0.6rem',
                                      fontWeight: 600
                                    }}>
                                      {isPlayerBetter ? 'Better Value' : 'Worse Value'}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    ---
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedPlayer(null)}
                    sx={{ mt: 2 }}
                  >
                    Clear Comparison
                  </Button>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>
                    Search for a player above to see a detailed statistical comparison
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compare key statistics side-by-side
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Loading skeleton
const PlayerDetailSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={100} height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PlayerDetail;
