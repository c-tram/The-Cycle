import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  useTheme
} from '@mui/material';
import {
  Home as HomeIcon,
  FlightTakeoff as AwayIcon,
  Stadium as VenueIcon,
  Person as PlayerIcon,
  Groups as TeamIcon,
  PanTool as HandednessIcon,
  Compare as VsIcon,
  TrendingUp as StatsIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Import API service when ready
// import * as statsApi from '../services/apiService';

const Splits = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Split categories with their respective configurations
  const splitCategories = [
    {
      id: 'home-away',
      title: 'Home/Away',
      description: 'Player performance at home vs away games',
      icon: <HomeIcon />,
      color: theme.palette.primary.main,
      filters: ['player', 'team', 'season']
    },
    {
      id: 'player-venue',
      title: 'Player vs Venue',
      description: 'How players perform at specific ballparks',
      icon: <VenueIcon />,
      color: theme.palette.secondary.main,
      filters: ['player', 'venue', 'season']
    },
    {
      id: 'player-player',
      title: 'Player vs Player',
      description: 'Head-to-head matchup statistics',
      icon: <VsIcon />,
      color: theme.palette.success.main,
      filters: ['pitcher', 'batter', 'season']
    },
    {
      id: 'player-team',
      title: 'Player vs Team',
      description: 'Individual player performance against specific teams',
      icon: <PlayerIcon />,
      color: theme.palette.warning.main,
      filters: ['player', 'opponent', 'season']
    },
    {
      id: 'team-team',
      title: 'Team vs Team',
      description: 'Head-to-head team matchup statistics',
      icon: <TeamIcon />,
      color: theme.palette.error.main,
      filters: ['team1', 'team2', 'season']
    },
    {
      id: 'hitter-handedness',
      title: 'Hitter vs Handedness',
      description: 'Batter performance vs left/right-handed pitching',
      icon: <HandednessIcon />,
      color: theme.palette.info.main,
      filters: ['batter', 'pitcher-hand', 'season']
    },
    {
      id: 'pitcher-handedness',
      title: 'Pitcher vs Handedness',
      description: 'Pitcher performance vs left/right-handed batting',
      icon: <HandednessIcon />,
      color: theme.palette.purple?.main || '#9c27b0',
      filters: ['pitcher', 'batter-hand', 'season']
    }
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setError(null);
  };

  const loadSplitData = async (splitType, filters) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement API calls for different split types
      console.log(`Loading ${splitType} data with filters:`, filters);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success for now
      setLoading(false);
      
    } catch (err) {
      console.error(`Error loading ${splitType} data:`, err);
      setError(`Failed to load ${splitType} data. Please try again.`);
      setLoading(false);
    }
  };

  const SplitFilterPanel = ({ category }) => {
    const [filterValues, setFilterValues] = useState({});

    const handleFilterChange = (filterName, value) => {
      setFilterValues(prev => ({ ...prev, [filterName]: value }));
    };

    const handleLoadData = () => {
      loadSplitData(category.id, filterValues);
    };

    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 1, 
              backgroundColor: category.color + '20',
              color: category.color,
              mr: 2 
            }}
          >
            {category.icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {category.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {category.description}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2} alignItems="center">
          {category.filters.map((filter) => (
            <Grid item xs={12} sm={6} md={3} key={filter}>
              <TextField
                fullWidth
                label={filter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                placeholder={`Select ${filter}...`}
                size="small"
                value={filterValues[filter] || ''}
                onChange={(e) => handleFilterChange(filter, e.target.value)}
              />
            </Grid>
          ))}
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              onClick={handleLoadData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <StatsIcon />}
              sx={{ 
                backgroundColor: category.color,
                '&:hover': { 
                  backgroundColor: category.color,
                  filter: 'brightness(0.9)' 
                }
              }}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const SplitResultsPanel = ({ category }) => {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Results for {category.title}
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box>
            <Alert severity="info">
              Split data will be displayed here once the backend API is implemented.
              This will include detailed statistics tables, charts, and comparisons.
            </Alert>
            
            {/* TODO: Add actual results display components */}
            <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Future components:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mt: 1 }}>
                • Statistical comparison tables<br/>
                • Performance trend charts<br/>
                • Split efficiency metrics<br/>
                • Historical matchup data<br/>
                • Advanced sabermetric breakdowns
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    );
  };

  const currentCategory = splitCategories[selectedTab];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box mb={4}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Statistical Splits
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Comprehensive situational and matchup analytics
          </Typography>
        </Box>

        {/* Split Category Tabs */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: currentCategory.color
              }
            }}
          >
            {splitCategories.map((category, index) => (
              <Tab
                key={category.id}
                icon={category.icon}
                label={category.title}
                sx={{
                  '&.Mui-selected': {
                    color: category.color
                  }
                }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Dynamic Content based on Selected Tab */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SplitFilterPanel category={currentCategory} />
            <SplitResultsPanel category={currentCategory} />
          </motion.div>
        </AnimatePresence>

        {/* Information Panel */}
        <Paper elevation={1} sx={{ p: 3, mt: 3, backgroundColor: theme.palette.background.default }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
            About Statistical Splits
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Statistical splits reveal how players and teams perform in different situations and matchups. 
            This comprehensive analysis helps identify strengths, weaknesses, and patterns that traditional 
            season-long statistics might not capture.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Key Features:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Home/Away performance analysis<br/>
                • Venue-specific player statistics<br/>
                • Head-to-head matchup tracking<br/>
                • Handedness advantage analysis
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Data Sources:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • MLB Play-by-Play API integration<br/>
                • Real-time situational tracking<br/>
                • Historical matchup databases<br/>
                • Advanced metric calculations
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default Splits;
