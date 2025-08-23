// ============================================================================
// SPLIT ANALYTICS DASHBOARD
// Comprehensive overview of available splits with data availability metrics
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Alert,
  Badge,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  useTheme
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Analytics,
  TrendingUp,
  Speed,
  DataUsage,
  Insights,
  Timeline,
  Assessment,
  QueryStats
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

// ============================================================================
// SPLIT CATEGORY DEFINITIONS
// ============================================================================

const SPLIT_CATEGORIES = {
  basic: {
    title: 'Basic Splits',
    icon: <Analytics />,
    color: '#1976d2',
    description: 'Fundamental player performance breakdowns',
    splits: [
      { 
        key: 'home-away', 
        name: 'Home vs Away', 
        endpoint: '/api/v2/splits/home-away',
        description: 'Performance at home vs road games'
      },
      { 
        key: 'handedness', 
        name: 'vs Handedness', 
        endpoint: '/api/v2/splits/handedness',
        description: 'Performance vs left/right-handed pitching'
      },
      { 
        key: 'venues', 
        name: 'By Venue', 
        endpoint: '/api/v2/splits/venues',
        description: 'Performance at specific ballparks'
      },
      { 
        key: 'opponents', 
        name: 'vs Teams', 
        endpoint: '/api/v2/splits/opponents',
        description: 'Performance against specific teams'
      }
    ]
  },
  compound: {
    title: 'Compound Analysis',
    icon: <TrendingUp />,
    color: '#388e3c',
    description: 'Multi-dimensional contextual breakdowns',
    splits: [
      { 
        key: 'handedness-vs-team', 
        name: 'Handedness vs Teams', 
        endpoint: '/api/v2/splits/handedness-vs-team',
        description: 'L/R performance against specific teams'
      },
      { 
        key: 'home-away-vs-handedness', 
        name: 'Home/Away vs Handedness', 
        endpoint: '/api/v2/splits/home-away-vs-handedness',
        description: 'Combined situational and matchup analysis'
      }
    ]
  },
  counts: {
    title: 'Count Analytics',
    icon: <Speed />,
    color: '#f57c00',
    description: 'Performance in different count situations',
    splits: [
      { 
        key: 'counts', 
        name: 'By Count', 
        endpoint: '/api/v2/splits/counts',
        description: 'Performance in each count (0-0 through 3-2)'
      },
      { 
        key: 'counts-vs-team', 
        name: 'Counts vs Teams', 
        endpoint: '/api/v2/splits/counts-vs-team',
        description: 'Count performance against specific teams'
      },
      { 
        key: 'counts-vs-venue', 
        name: 'Counts vs Venues', 
        endpoint: '/api/v2/splits/counts-vs-venue',
        description: 'Count performance at specific venues'
      },
      { 
        key: 'counts-vs-handedness', 
        name: 'Counts vs Handedness', 
        endpoint: '/api/v2/splits/counts-vs-handedness',
        description: 'Count performance vs L/R pitching'
      }
    ]
  },
  pitcher: {
    title: 'Pitcher Perspective',
    icon: <DataUsage />,
    color: '#d32f2f',
    description: 'Pitcher-centric analytical views',
    splits: [
      { 
        key: 'pitcher-vs-teams', 
        name: 'Pitcher vs Teams', 
        endpoint: '/api/v2/splits/pitcher-vs-teams',
        description: 'How pitchers perform against specific teams'
      },
      { 
        key: 'pitcher-vs-handedness', 
        name: 'Pitcher vs Handedness', 
        endpoint: '/api/v2/splits/pitcher-vs-handedness',
        description: 'Pitcher effectiveness vs L/R batters'
      },
      { 
        key: 'pitcher-home-away', 
        name: 'Pitcher Home/Away', 
        endpoint: '/api/v2/splits/pitcher-home-away',
        description: 'Pitcher performance at home vs away'
      }
    ]
  },
  advanced: {
    title: 'Advanced Matchups',
    icon: <Insights />,
    color: '#7b1fa2',
    description: 'Specialized analytical perspectives',
    splits: [
      { 
        key: 'player-vs-pitcher', 
        name: 'Player vs Pitcher', 
        endpoint: '/api/v2/splits/player-vs-pitcher',
        description: 'Head-to-head matchup history'
      },
      { 
        key: 'situational-leverage', 
        name: 'Situational Leverage', 
        endpoint: '/api/v2/splits/situational-leverage',
        description: 'Performance in high-leverage situations'
      }
    ]
  },
  meta: {
    title: 'Meta-Analysis',
    icon: <Assessment />,
    color: '#5e35b1',
    description: 'Performance pattern analysis',
    splits: [
      { 
        key: 'consistency', 
        name: 'Consistency Metrics', 
        endpoint: '/api/v2/splits/consistency',
        description: 'Performance variance across contexts'
      },
      { 
        key: 'clutch-performance', 
        name: 'Clutch Performance', 
        endpoint: '/api/v2/splits/clutch-performance',
        description: 'Performance in pressure situations'
      }
    ]
  }
};

// ============================================================================
// SPLIT ANALYTICS DASHBOARD COMPONENT
// ============================================================================

const SplitAnalyticsDashboard = () => {
  const theme = useTheme();
  
  const [splitAvailability, setSplitAvailability] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(['basic']);
  const [loading, setLoading] = useState(true);
  const [totalSplitKeys, setTotalSplitKeys] = useState(0);
  
  // Load split availability data
  useEffect(() => {
    loadSplitAvailability();
  }, []);
  
  const loadSplitAvailability = async () => {
    try {
      setLoading(true);
      
      // Check availability for each split type
      const availabilityPromises = Object.values(SPLIT_CATEGORIES)
        .flatMap(category => category.splits)
        .map(async split => {
          try {
            // Make a test query to check if data exists
            const response = await apiService.get(`${split.endpoint}?team=HOU&player=Jose_Altuve&season=2025`);
            return {
              splitKey: split.key,
              available: response && Object.keys(response).length > 0,
              recordCount: response ? Object.keys(response).length : 0,
              sampleData: response
            };
          } catch (error) {
            return {
              splitKey: split.key,
              available: false,
              recordCount: 0,
              error: error.message
            };
          }
        });
      
      const results = await Promise.all(availabilityPromises);
      
      // Process results into availability map
      const availability = {};
      let totalKeys = 0;
      
      results.forEach(result => {
        availability[result.splitKey] = result;
        totalKeys += result.recordCount;
      });
      
      setSplitAvailability(availability);
      setTotalSplitKeys(totalKeys);
      
    } catch (error) {
      console.error('Error loading split availability:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle category expansion
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(cat => cat !== categoryKey)
        : [...prev, categoryKey]
    );
  };
  
  // Calculate category stats
  const getCategoryStats = (category) => {
    const splits = category.splits;
    const availableSplits = splits.filter(split => 
      splitAvailability[split.key]?.available
    ).length;
    
    const totalRecords = splits.reduce((sum, split) => 
      sum + (splitAvailability[split.key]?.recordCount || 0), 0
    );
    
    return {
      available: availableSplits,
      total: splits.length,
      records: totalRecords,
      percentage: splits.length > 0 ? (availableSplits / splits.length) * 100 : 0
    };
  };
  
  // Render split status
  const renderSplitStatus = (split) => {
    const availability = splitAvailability[split.key];
    
    if (loading) {
      return <LinearProgress sx={{ width: 100 }} />;
    }
    
    if (!availability) {
      return <Chip label="Unknown" size="small" variant="outlined" />;
    }
    
    if (availability.available) {
      return (
        <Tooltip title={`${availability.recordCount} records available`}>
          <Chip 
            label={`✓ ${availability.recordCount}`} 
            size="small" 
            color="success"
            variant="filled"
          />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title={availability.error || 'No data available'}>
          <Chip 
            label="No Data" 
            size="small" 
            color="error"
            variant="outlined"
          />
        </Tooltip>
      );
    }
  };
  
  return (
    <Box>
      {/* Dashboard Header */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QueryStats />
              <Typography variant="h5">Split Analytics Dashboard</Typography>
            </Box>
          }
          subheader={
            loading 
              ? "Loading split availability..."
              : `${totalSplitKeys.toLocaleString()} total analytical data points across ${Object.keys(splitAvailability).length} split types`
          }
        />
        <CardContent>
          {!loading && (
            <Alert severity="info">
              🔍 This dashboard shows the availability and coverage of all analytical split types.
              Each split provides a different lens for analyzing player performance across various contexts.
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Category Cards */}
      <Grid container spacing={3}>
        {Object.entries(SPLIT_CATEGORIES).map(([categoryKey, category]) => {
          const stats = getCategoryStats(category);
          const isExpanded = expandedCategories.includes(categoryKey);
          
          return (
            <Grid item xs={12} key={categoryKey}>
              <Card 
                elevation={2}
                sx={{ 
                  border: `2px solid ${category.color}`,
                  borderRadius: 2
                }}
              >
                <CardHeader
                  avatar={
                    <Box 
                      sx={{ 
                        color: category.color,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {category.icon}
                    </Box>
                  }
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6">{category.title}</Typography>
                      
                      {!loading && (
                        <>
                          <Badge 
                            badgeContent={`${stats.available}/${stats.total}`} 
                            color={stats.percentage === 100 ? 'success' : 'warning'}
                          >
                            <Chip 
                              label={`${Math.round(stats.percentage)}%`} 
                              size="small"
                              sx={{ bgcolor: category.color, color: 'white' }}
                            />
                          </Badge>
                          
                          <Chip 
                            label={`${stats.records.toLocaleString()} records`}
                            size="small"
                            variant="outlined"
                          />
                        </>
                      )}
                    </Box>
                  }
                  subheader={category.description}
                  action={
                    <IconButton onClick={() => toggleCategory(categoryKey)}>
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  }
                />
                
                <Collapse in={isExpanded}>
                  <CardContent>
                    <List dense>
                      {category.splits.map(split => (
                        <ListItem key={split.key}>
                          <ListItemIcon>
                            <Timeline sx={{ color: category.color }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={split.name}
                            secondary={split.description}
                          />
                          <Box sx={{ ml: 2 }}>
                            {renderSplitStatus(split)}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Collapse>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default SplitAnalyticsDashboard;
