// ============================================================================
// SPLIT RESULTS DISPLAY COMPONENT
// Intelligent visualization for all split data types
// ============================================================================

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { ExpandMore, TrendingUp, TrendingDown } from '@mui/icons-material';

// ============================================================================
// STAT FORMATTING HELPERS
// ============================================================================

const formatStat = (value, statType) => {
  if (value === null || value === undefined || value === '') return '-';
  
  switch (statType) {
    case 'avg':
    case 'obp':
    case 'slg':
    case 'ops':
      return typeof value === 'number' ? value.toFixed(3) : value;
    case 'era':
      return typeof value === 'number' ? value.toFixed(2) : value;
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return typeof value === 'number' ? value.toLocaleString() : value;
  }
};

const getStatTrend = (value, statType) => {
  if (typeof value !== 'number') return null;
  
  const benchmarks = {
    avg: { excellent: 0.300, good: 0.250, poor: 0.200 },
    obp: { excellent: 0.360, good: 0.320, poor: 0.280 },
    slg: { excellent: 0.500, good: 0.400, poor: 0.350 },
    ops: { excellent: 0.850, good: 0.750, poor: 0.650 },
    era: { excellent: 3.50, good: 4.00, poor: 5.00, inverse: true }
  };
  
  const benchmark = benchmarks[statType];
  if (!benchmark) return null;
  
  if (benchmark.inverse) {
    if (value <= benchmark.excellent) return 'excellent';
    if (value <= benchmark.good) return 'good';
    return 'poor';
  } else {
    if (value >= benchmark.excellent) return 'excellent';
    if (value >= benchmark.good) return 'good';
    return 'poor';
  }
};

// ============================================================================
// SPLIT RESULTS DISPLAY COMPONENT
// ============================================================================

const SplitResultsDisplay = ({ splitData, splitType }) => {
  const theme = useTheme();
  
  if (!splitData || !splitData.data) {
    return (
      <Typography color="text.secondary" align="center">
        No data available
      </Typography>
    );
  }
  
  const { data, summary } = splitData;
  
  // Render basic stats card
  const renderStatsCard = (title, stats, subtitle = null) => {
    if (!stats || !stats.batting) return null;
    
    const { batting } = stats;
    
    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {formatStat(batting.avg, 'avg')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AVG
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary">
                  {formatStat(batting.ops, 'ops')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  OPS
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5">
                  {formatStat(batting.hits)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hits
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5">
                  {formatStat(batting.homeRuns)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  HR
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Additional stats */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              PA: {formatStat(batting.plateAppearances)} • 
              AB: {formatStat(batting.atBats)} • 
              R: {formatStat(batting.runs)} • 
              RBI: {formatStat(batting.rbi)} • 
              BB: {formatStat(batting.walks)} • 
              K: {formatStat(batting.strikeouts)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Render comparison table for splits with multiple categories
  const renderComparisonTable = (dataObject) => {
    const entries = Object.entries(dataObject);
    if (entries.length === 0) return null;
    
    return (
      <TableContainer component={Card} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Split</TableCell>
              <TableCell align="right">AVG</TableCell>
              <TableCell align="right">OBP</TableCell>
              <TableCell align="right">SLG</TableCell>
              <TableCell align="right">OPS</TableCell>
              <TableCell align="right">PA</TableCell>
              <TableCell align="right">HR</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(([splitName, splitData]) => {
              if (!splitData || !splitData.stats || !splitData.stats.batting) return null;
              
              const { batting } = splitData.stats;
              const trend = getStatTrend(parseFloat(batting.avg), 'avg');
              
              return (
                <TableRow key={splitName} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {splitName}
                      {trend === 'excellent' && <TrendingUp color="success" fontSize="small" />}
                      {trend === 'poor' && <TrendingDown color="error" fontSize="small" />}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      color={trend === 'excellent' ? 'success.main' : trend === 'poor' ? 'error.main' : 'text.primary'}
                      fontWeight={trend === 'excellent' ? 'bold' : 'normal'}
                    >
                      {formatStat(batting.avg, 'avg')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatStat(batting.obp, 'obp')}</TableCell>
                  <TableCell align="right">{formatStat(batting.slg, 'slg')}</TableCell>
                  <TableCell align="right">{formatStat(batting.ops, 'ops')}</TableCell>
                  <TableCell align="right">{formatStat(batting.plateAppearances)}</TableCell>
                  <TableCell align="right">{formatStat(batting.homeRuns)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Render count-specific data (16 count scenarios)
  const renderCountData = (dataObject) => {
    const counts = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2', '3-0', '3-1', '3-2'];
    const availableCounts = Object.keys(dataObject).filter(count => counts.includes(count));
    
    if (availableCounts.length === 0) return null;
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          📊 Count Situation Analysis
        </Typography>
        
        <Grid container spacing={2}>
          {availableCounts.map(count => {
            const countData = dataObject[count];
            if (!countData || !countData.stats || !countData.stats.batting) return null;
            
            const { batting } = countData.stats;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={count}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {count}
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {formatStat(batting.avg, 'avg')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {batting.plateAppearances} PA
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((parseFloat(batting.avg) / 0.400) * 100, 100)} 
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };
  
  // Main render logic based on split type
  return (
    <Box>
      {/* Summary Information */}
      {summary && (
        <Card elevation={1} sx={{ mb: 3, bgcolor: theme.palette.primary.main, color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 Query Summary
            </Typography>
            <Typography variant="body2">
              {summary.description || `Analysis of ${splitType} splits`}
            </Typography>
            {summary.totalGames && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Based on {summary.totalGames} games
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Handle different data structures */}
      {splitType === 'home-away' && (
        <Box>
          <Typography variant="h5" gutterBottom>
            🏠 Home vs Away Performance
          </Typography>
          {renderStatsCard('Home Games', data.home, 'Performance at home ballpark')}
          {renderStatsCard('Away Games', data.away, 'Performance on the road')}
        </Box>
      )}
      
      {splitType === 'handedness' && (
        <Box>
          <Typography variant="h5" gutterBottom>
            👋 vs Left/Right Handed Pitching
          </Typography>
          {renderStatsCard('vs Left-Handed Pitching', data.L)}
          {renderStatsCard('vs Right-Handed Pitching', data.R)}
        </Box>
      )}
      
      {splitType === 'counts' && (
        <Box>
          {renderCountData(data)}
        </Box>
      )}
      
      {(splitType === 'venue' || splitType === 'vs-teams') && (
        <Box>
          <Typography variant="h5" gutterBottom>
            {splitType === 'venue' ? '🏟️ Performance by Venue' : '⚾ Performance vs Teams'}
          </Typography>
          {renderComparisonTable(data)}
        </Box>
      )}
      
      {/* Fallback for other split types */}
      {!['home-away', 'handedness', 'counts', 'venue', 'vs-teams'].includes(splitType) && (
        <Box>
          <Typography variant="h6" gutterBottom>
            📊 {splitType.charAt(0).toUpperCase() + splitType.slice(1)} Analysis
          </Typography>
          
          {typeof data === 'object' && Object.keys(data).length > 0 ? (
            Object.keys(data).length <= 5 ? (
              // Small number of splits - show as cards
              Object.entries(data).map(([key, value]) => 
                renderStatsCard(key, value, `${splitType} analysis`)
              )
            ) : (
              // Large number of splits - show as table
              renderComparisonTable(data)
            )
          ) : (
            <Typography color="text.secondary">
              No split data available
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SplitResultsDisplay;
