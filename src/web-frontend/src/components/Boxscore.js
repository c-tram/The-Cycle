import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Divider,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TableSortLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  SportsBaseball,
  Schedule,
  Stadium,
  Close,
  FilterList,
  Sort,
  Timeline,
  Groups,
  Assessment,
  Home,
  Flight,
  Refresh
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getTeamLogoUrl as getSharedTeamLogoUrl } from '../utils/teamLogos';

// Utility: Get MLB team logo URL (shared mapping to ESPN codes)
const getTeamLogoUrl = (teamCode) => getSharedTeamLogoUrl(teamCode, 500);

// Utility: Format game time
const formatGameTime = (dateTime) => {
  if (!dateTime) return '';
  try {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Chicago'
    });
  } catch {
    return dateTime;
  }
};

// Utility: Format date
const formatGameDate = (dateTime) => {
  if (!dateTime) return '';
  try {
    return new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateTime;
  }
};

const Boxscore = ({ game, open, onClose, embedded = false, onNavigateToFull }) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [detailedStats, setDetailedStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [playByPlaySort, setPlayByPlaySort] = useState('recent'); // 'recent' or 'chronological'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newPlaysCount, setNewPlaysCount] = useState(0);

  // Fetch detailed stats when needed
  const fetchDetailedStats = async (isRefresh = false) => {
    if (!game?.id) return;
    
    try {
      if (!isRefresh) setLoadingStats(true);
      
      const response = await fetch(`/api/v2/mlb-live/boxscore/${game.id}?t=${Date.now()}`);
      const data = await response.json();
      
      // Check for new plays if this is a refresh
      if (isRefresh && detailedStats?.playByPlay && data.playByPlay) {
        const oldPlayCount = detailedStats.playByPlay.length;
        const newPlayCount = data.playByPlay.length;
        if (newPlayCount > oldPlayCount) {
          setNewPlaysCount(newPlayCount - oldPlayCount);
          // Clear the animation after 3 seconds
          setTimeout(() => setNewPlaysCount(0), 3000);
        }
      }
      
      setDetailedStats(data);
    } catch (error) {
      console.error('Failed to fetch detailed stats:', error);
    } finally {
      if (!isRefresh) setLoadingStats(false);
    }
  };

  // Get game status with enhanced details
  const getGameStatus = () => {
    if (!game) return { status: 'Scheduled', color: theme.palette.primary.main };
    if (game.isFinal) return { status: 'Final', color: theme.palette.text.secondary };
    if (game.isLive) {
      const mlbData = game?.mlbGameData;
      const linescore = mlbData?.linescore;
      const inning = linescore?.currentInning ? `${linescore.currentInningOrdinal}` : '';
      const inningState = linescore?.inningState ? ` ${linescore.inningState}` : '';
      return { 
        status: `${inning}${inningState}`, 
        color: theme.palette.success.main,
        live: true 
      };
    }
    if (game.status) return { status: game.status, color: theme.palette.primary.main };
    return { status: 'Scheduled', color: theme.palette.primary.main };
  };

  const mlbData = game?.mlbGameData;
  const linescore = mlbData?.linescore;
  const homeTeam = game?.homeTeam;
  const awayTeam = game?.awayTeam;
  const gameStatus = getGameStatus();

  // Fetch detailed stats when tab changes to batting/pitching/play-by-play
  useEffect(() => {
    if (currentTab > 0 && (open || embedded) && game?.id) {
      fetchDetailedStats();
    }
  }, [currentTab, open, embedded, game?.id]);

  // Auto-refresh for play-by-play if it's a live game and tab is active
  useEffect(() => {
    if (currentTab === 3 && autoRefresh && gameStatus.live && detailedStats) {
      const interval = setInterval(() => {
        fetchDetailedStats(true); // Pass true to indicate this is a refresh
      }, 10000); // Refresh every 10 seconds for live games

      return () => clearInterval(interval);
    }
  }, [currentTab, autoRefresh, gameStatus.live, detailedStats]);

  // Early return if no game data - AFTER all hooks
  if (!game) {
    if (embedded) {
      return (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="text.secondary">No game data available</Typography>
          </CardContent>
        </Card>
      );
    }
    return null;
  }
  
  if (!open && !embedded) return null;

  // Line Score Table Component
  const LineScoreTable = () => {
    if (!linescore?.innings) return null;

    const innings = linescore.innings;
    const maxInnings = Math.max(9, innings.length);

    return (
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small" sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Team</TableCell>
              {Array.from({ length: maxInnings }, (_, i) => (
                <TableCell key={i + 1} align="center" sx={{ fontWeight: 'bold', minWidth: 40 }}>
                  {i + 1}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>R</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>H</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>E</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Away Team Row */}
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar
                    src={getTeamLogoUrl(awayTeam?.abbreviation)}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {awayTeam?.abbreviation} {awayTeam?.teamName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Away
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              {Array.from({ length: maxInnings }, (_, i) => {
                const inning = innings.find(inn => inn.num === i + 1);
                return (
                  <TableCell key={i + 1} align="center">
                    {inning?.away?.runs ?? '-'}
                  </TableCell>
                );
              })}
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.away?.runs || game.awayScore || 0}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.away?.hits || 0}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.away?.errors || 0}
              </TableCell>
            </TableRow>
            
            {/* Home Team Row */}
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar
                    src={getTeamLogoUrl(homeTeam?.abbreviation)}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {homeTeam?.abbreviation} {homeTeam?.teamName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Home
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              {Array.from({ length: maxInnings }, (_, i) => {
                const inning = innings.find(inn => inn.num === i + 1);
                return (
                  <TableCell key={i + 1} align="center">
                    {inning?.home?.runs ?? '-'}
                  </TableCell>
                );
              })}
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.home?.runs || game.homeScore || 0}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.home?.hits || 0}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                {linescore.teams?.home?.errors || 0}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Batting Stats Component
  const BattingStats = () => {
    if (loadingStats) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Loading batting statistics...
          </Typography>
        </Box>
      );
    }
    
    if (!detailedStats?.battingStats) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Groups sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Batting Statistics Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed batting stats not available for this game
          </Typography>
        </Box>
      );
    }

    const renderBattingTable = (players, teamName) => (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom color="primary">
          {teamName} Batting
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Player</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pos</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>AB</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>R</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>H</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>RBI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>BB</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>SO</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>AVG</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players
                .filter(player => player.stats.atBats > 0 || player.battingOrder)
                .sort((a, b) => parseInt(a.battingOrder || '999') - parseInt(b.battingOrder || '999'))
                .map((player, index) => (
                <TableRow key={player.playerId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {player.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{player.position}</TableCell>
                  <TableCell align="center">{player.stats.atBats}</TableCell>
                  <TableCell align="center">{player.stats.runs}</TableCell>
                  <TableCell align="center">{player.stats.hits}</TableCell>
                  <TableCell align="center">{player.stats.rbi}</TableCell>
                  <TableCell align="center">{player.stats.baseOnBalls}</TableCell>
                  <TableCell align="center">{player.stats.strikeOuts}</TableCell>
                  <TableCell align="center">{player.stats.avg}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );

    return (
      <Box>
        {renderBattingTable(detailedStats.battingStats.away, `${awayTeam?.abbreviation} ${awayTeam?.teamName}`)}
        {renderBattingTable(detailedStats.battingStats.home, `${homeTeam?.abbreviation} ${homeTeam?.teamName}`)}
      </Box>
    );
  };

  // Pitching Stats Component
  const PitchingStats = () => {
    if (loadingStats) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Loading pitching statistics...
          </Typography>
        </Box>
      );
    }
    
    if (!detailedStats?.pitchingStats) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Pitching Statistics Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed pitching stats not available for this game
          </Typography>
        </Box>
      );
    }

    const renderPitchingTable = (players, teamName) => (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom color="primary">
          {teamName} Pitching
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Pitcher</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>IP</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>H</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>R</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ER</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>BB</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>SO</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>PC</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ERA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players
                .filter(player => parseFloat(player.stats.inningsPitched) > 0)
                .map((player, index) => (
                <TableRow key={player.playerId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {player.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{player.stats.inningsPitched}</TableCell>
                  <TableCell align="center">{player.stats.hits}</TableCell>
                  <TableCell align="center">{player.stats.runs}</TableCell>
                  <TableCell align="center">{player.stats.earnedRuns}</TableCell>
                  <TableCell align="center">{player.stats.baseOnBalls}</TableCell>
                  <TableCell align="center">{player.stats.strikeOuts}</TableCell>
                  <TableCell align="center">{player.stats.pitchCount}</TableCell>
                  <TableCell align="center">{player.stats.era}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );

    return (
      <Box>
        {renderPitchingTable(detailedStats.pitchingStats.away, `${awayTeam?.abbreviation} ${awayTeam?.teamName}`)}
        {renderPitchingTable(detailedStats.pitchingStats.home, `${homeTeam?.abbreviation} ${homeTeam?.teamName}`)}
      </Box>
    );
  };

  // Play by Play Component
  const PlayByPlay = () => {
    if (loadingStats) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Loading play-by-play...
          </Typography>
        </Box>
      );
    }
    
    if (!detailedStats?.playByPlay || detailedStats.playByPlay.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Timeline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Play by Play Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed play-by-play not available for this game
          </Typography>
        </Box>
      );
    }

    // Sort plays based on user preference
    const sortedPlays = [...detailedStats.playByPlay];
    if (playByPlaySort === 'recent') {
      sortedPlays.reverse(); // Most recent first
    }
    // chronological is already in correct order

    return (
      <Box>
        {/* Header with controls */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" color="primary" gutterBottom>
              Play by Play
            </Typography>
            {newPlaysCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Chip 
                  label={`${newPlaysCount} new play${newPlaysCount > 1 ? 's' : ''}!`}
                  color="success"
                  size="small"
                  sx={{ 
                    mb: 1,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  }}
                />
              </motion.div>
            )}
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Sort Toggle */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort Order</InputLabel>
              <Select
                value={playByPlaySort}
                label="Sort Order"
                onChange={(e) => setPlayByPlaySort(e.target.value)}
              >
                <MenuItem value="recent">Recent First</MenuItem>
                <MenuItem value="chronological">Inning 1-9</MenuItem>
              </Select>
            </FormControl>

            {/* Auto-refresh toggle for live games */}
            {gameStatus.live && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Auto-refresh
                </Typography>
                <Button
                  size="small"
                  variant={autoRefresh ? "contained" : "outlined"}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  {autoRefresh ? 'ON' : 'OFF'}
                </Button>
                {autoRefresh && (
                  <Chip 
                    label="10s"
                    size="small"
                    color="success"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Stack>
            )}

            {/* Manual refresh button */}
            <Tooltip title="Refresh plays">
              <IconButton 
                onClick={() => fetchDetailedStats(true)}
                size="small"
                color="primary"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Play by play table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Inning</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Batter</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Pitcher</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Play</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlays.slice(0, 100).map((play, index) => {
                // Highlight new plays
                const isNewPlay = playByPlaySort === 'recent' && newPlaysCount > 0 && index < newPlaysCount;
                
                return (
                  <motion.tr
                    key={`${play.inning}-${play.halfInning}-${index}`}
                    component={TableRow}
                    initial={isNewPlay ? { backgroundColor: alpha(theme.palette.success.main, 0.2), scale: 1.02 } : false}
                    animate={isNewPlay ? { backgroundColor: 'transparent', scale: 1 } : false}
                    transition={{ duration: 2, delay: index * 0.1 }}
                    sx={{
                      ...(isNewPlay && {
                        borderLeft: `3px solid ${theme.palette.success.main}`,
                      })
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {play.halfInning === 'top' ? '▲' : '▼'} {play.inning}
                        </Typography>
                        {isNewPlay && (
                          <Chip 
                            label="NEW" 
                            size="small" 
                            color="success" 
                            sx={{ fontSize: '0.6rem', height: 16 }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {play.batter}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {play.pitcher}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {play.description}
                        {play.rbi > 0 && (
                          <Chip 
                            label={`${play.rbi} RBI`} 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 1, fontSize: '0.7rem', height: 18 }}
                          />
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {play.awayScore}-{play.homeScore}
                      </Typography>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {sortedPlays.length > 100 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing first 100 plays. Total plays: {sortedPlays.length}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Game Summary Component
  const GameSummary = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={3}>
          {/* Game Header */}
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <SportsBaseball color="primary" />
                <Typography variant="h5" fontWeight="bold">
                  Game {game.id}
                </Typography>
                <Chip 
                  label={gameStatus.status} 
                  color={gameStatus.live ? "success" : "default"}
                  sx={{ 
                    color: gameStatus.color,
                    fontWeight: 'bold'
                  }}
                />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatGameDate(game.gameDate)} • {formatGameTime(game.gameTime)}
                </Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* Team Matchup */}
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={4}>
              {/* Away Team */}
              <Stack alignItems="center" spacing={1}>
                <Avatar
                  src={getTeamLogoUrl(awayTeam?.abbreviation)}
                  sx={{ width: 64, height: 64 }}
                />
                <Typography variant="h6" fontWeight="bold">
                  {awayTeam?.abbreviation}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {awayTeam?.teamName}
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {game.awayScore || 0}
                </Typography>
              </Stack>

              {/* VS */}
              <Stack alignItems="center" spacing={1}>
                <Typography variant="h6" color="text.secondary">
                  @
                </Typography>
                {gameStatus.live && linescore && (
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Count
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {linescore.balls}-{linescore.strikes}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {linescore.outs} out{linescore.outs !== 1 ? 's' : ''}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Home Team */}
              <Stack alignItems="center" spacing={1}>
                <Avatar
                  src={getTeamLogoUrl(homeTeam?.abbreviation)}
                  sx={{ width: 64, height: 64 }}
                />
                <Typography variant="h6" fontWeight="bold">
                  {homeTeam?.abbreviation}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {homeTeam?.teamName}
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {game.homeScore || 0}
                </Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* Venue Info */}
          {game.venue && (
            <Grid item xs={12}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <Stadium fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {game.venue}
                </Typography>
              </Stack>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );

  // Current Game Situation (for live games)
  const CurrentSituation = () => {
    if (!gameStatus.live || !linescore?.defense || !linescore?.offense) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Situation
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Batting ({linescore.offense?.team?.name})
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>At Bat:</strong> {linescore.offense?.batter?.fullName}
                </Typography>
                <Typography variant="body2">
                  <strong>On Deck:</strong> {linescore.offense?.onDeck?.fullName}
                </Typography>
                <Typography variant="body2">
                  <strong>In Hole:</strong> {linescore.offense?.inHole?.fullName}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Pitching ({linescore.defense?.team?.name})
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Pitcher:</strong> {linescore.defense?.pitcher?.fullName}
                </Typography>
                <Typography variant="body2">
                  <strong>Catcher:</strong> {linescore.defense?.catcher?.fullName}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Tab content renderer
  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // Overview
        return (
          <Box>
            <GameSummary />
            <CurrentSituation />
            <LineScoreTable />
          </Box>
        );
      case 1: // Batting
        return <BattingStats />;
      case 2: // Pitching  
        return <PitchingStats />;
      case 3: // Play by Play
        return <PlayByPlay />;
      default:
        return null;
    }
  };

  // If embedded, render without Dialog wrapper
  if (embedded) {
    return (
      <Box>
        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs 
              value={currentTab} 
              onChange={(e, newValue) => setCurrentTab(newValue)}
            >
              <Tab label="Overview" />
              <Tab label="Batting" />
              <Tab label="Pitching" />
              <Tab 
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>Play by Play</span>
                    {gameStatus.live && currentTab === 3 && autoRefresh && (
                      <Chip 
                        label="LIVE" 
                        size="small" 
                        color="success" 
                        sx={{ 
                          fontSize: '0.6rem', 
                          height: 16,
                          animation: 'pulse 2s infinite'
                        }}
                      />
                    )}
                  </Stack>
                }
              />
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Content */}
        {renderTabContent()}
      </Box>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight="bold">
            Boxscore
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
        
        {/* Tabs */}
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ mt: 1 }}
        >
          <Tab label="Overview" />
          <Tab label="Batting" />
          <Tab label="Pitching" />
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>Play by Play</span>
                {gameStatus.live && currentTab === 3 && autoRefresh && (
                  <Chip 
                    label="LIVE" 
                    size="small" 
                    color="success" 
                    sx={{ 
                      fontSize: '0.6rem', 
                      height: 16,
                      animation: 'pulse 2s infinite'
                    }}
                  />
                )}
              </Stack>
            }
          />
        </Tabs>
      </DialogTitle>
      
      <DialogContent sx={{ overflow: 'auto' }}>
        {renderTabContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {onNavigateToFull && game?.gameDate && (
          <Button 
            variant="contained" 
            onClick={() => {
              const gameDate = game.gameDate ? game.gameDate.split('T')[0] : new Date().toISOString().split('T')[0];
              onNavigateToFull(game.id, gameDate);
            }}
          >
            View Full Boxscore
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default Boxscore;
