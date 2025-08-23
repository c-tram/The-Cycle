// ============================================================================
// ADVANCED MULTI-DIMENSIONAL QUERY BUILDER
// Build complex queries combining multiple split dimensions
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Autocomplete,
  Button,
  Chip,
  FormGroup,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  useTheme
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Clear,
  Build,
  Psychology
} from '@mui/icons-material';

// ============================================================================
// QUERY DIMENSION DEFINITIONS
// ============================================================================

const QUERY_DIMENSIONS = {
  player: {
    label: 'Player Context',
    icon: '👤',
    fields: ['team', 'player', 'season'],
    required: true
  },
  situational: {
    label: 'Situational Context',
    icon: '🏟️',
    fields: ['home_away', 'venue'],
    combinable: true
  },
  opponent: {
    label: 'Opponent Context', 
    icon: '⚔️',
    fields: ['opponent_team', 'opponent_pitcher', 'opponent_handedness'],
    combinable: true
  },
  count: {
    label: 'Count Context',
    icon: '🔢',
    fields: ['count_specific', 'count_ranges'],
    exclusive: true
  },
  temporal: {
    label: 'Temporal Context',
    icon: '📅',
    fields: ['date_range', 'month', 'day_night'],
    combinable: true
  }
};

const FIELD_OPTIONS = {
  team: ['HOU', 'LAA', 'SEA', 'OAK', 'TEX', 'NYY', 'BOS', 'TB', 'TOR', 'BAL', 'CLE', 'CWS', 'DET', 'KC', 'MIN'],
  home_away: [{ label: 'Home', value: 'home' }, { label: 'Away', value: 'away' }],
  opponent_handedness: [{ label: 'Left-Handed', value: 'L' }, { label: 'Right-Handed', value: 'R' }],
  count_specific: [
    '0-0', '0-1', '0-2', '1-0', '1-1', '1-2', 
    '2-0', '2-1', '2-2', '3-0', '3-1', '3-2'
  ],
  count_ranges: [
    { label: 'Ahead in count', value: 'ahead' },
    { label: 'Behind in count', value: 'behind' },
    { label: 'Even count', value: 'even' },
    { label: 'Two-strike situations', value: 'two_strike' }
  ],
  season: ['2025', '2024', '2023']
};

// ============================================================================
// ADVANCED QUERY BUILDER COMPONENT
// ============================================================================

const AdvancedQueryBuilder = ({ onQueryBuild, loading }) => {
  const theme = useTheme();
  
  const [queryDimensions, setQueryDimensions] = useState({
    player: { enabled: true, values: {} },
    situational: { enabled: false, values: {} },
    opponent: { enabled: false, values: {} },
    count: { enabled: false, values: {} },
    temporal: { enabled: false, values: {} }
  });
  
  const [expandedDimensions, setExpandedDimensions] = useState(['player']);
  const [queryValid, setQueryValid] = useState(false);
  
  // Validate query completeness
  useEffect(() => {
    const playerComplete = queryDimensions.player.enabled && 
      queryDimensions.player.values.team && 
      queryDimensions.player.values.player && 
      queryDimensions.player.values.season;
      
    const enabledDimensions = Object.keys(queryDimensions).filter(
      dim => queryDimensions[dim].enabled
    );
    
    const allEnabledComplete = enabledDimensions.every(dim => {
      const dimension = queryDimensions[dim];
      const requiredFields = QUERY_DIMENSIONS[dim].fields;
      
      if (dim === 'player') return playerComplete;
      
      // For optional dimensions, just need at least one field filled
      return requiredFields.some(field => dimension.values[field]);
    });
    
    setQueryValid(playerComplete && allEnabledComplete);
  }, [queryDimensions]);
  
  // Toggle dimension
  const toggleDimension = (dimensionKey) => {
    setQueryDimensions(prev => ({
      ...prev,
      [dimensionKey]: {
        ...prev[dimensionKey],
        enabled: !prev[dimensionKey].enabled
      }
    }));
  };
  
  // Update dimension value
  const updateDimensionValue = (dimensionKey, field, value) => {
    setQueryDimensions(prev => ({
      ...prev,
      [dimensionKey]: {
        ...prev[dimensionKey],
        values: {
          ...prev[dimensionKey].values,
          [field]: value
        }
      }
    }));
  };
  
  // Build and execute query
  const buildQuery = () => {
    if (!queryValid) return;
    
    // Convert dimensions to API query structure
    const query = {
      base: queryDimensions.player.values,
      filters: {}
    };
    
    // Add enabled dimensions as filters
    Object.keys(queryDimensions).forEach(dimKey => {
      if (dimKey !== 'player' && queryDimensions[dimKey].enabled) {
        const values = queryDimensions[dimKey].values;
        Object.keys(values).forEach(field => {
          if (values[field]) {
            query.filters[field] = values[field];
          }
        });
      }
    });
    
    onQueryBuild(query);
  };
  
  // Clear all dimensions
  const clearAll = () => {
    setQueryDimensions({
      player: { enabled: true, values: {} },
      situational: { enabled: false, values: {} },
      opponent: { enabled: false, values: {} },
      count: { enabled: false, values: {} },
      temporal: { enabled: false, values: {} }
    });
  };
  
  // Render field input
  const renderFieldInput = (dimensionKey, field) => {
    const value = queryDimensions[dimensionKey].values[field] || '';
    const options = FIELD_OPTIONS[field];
    
    if (options) {
      return (
        <Autocomplete
          size="small"
          fullWidth
          options={options}
          value={value}
          onChange={(_, newValue) => updateDimensionValue(dimensionKey, field, newValue)}
          getOptionLabel={(option) => typeof option === 'object' ? option.label : option}
          renderInput={(params) => (
            <TextField
              {...params}
              label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              variant="outlined"
            />
          )}
        />
      );
    } else {
      return (
        <TextField
          size="small"
          fullWidth
          label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          variant="outlined"
          value={value}
          onChange={(e) => updateDimensionValue(dimensionKey, field, e.target.value)}
          placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
        />
      );
    }
  };
  
  return (
    <Card elevation={3}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build />
            <Typography variant="h6">Advanced Query Builder</Typography>
          </Box>
        }
        subheader="Build complex multi-dimensional split queries"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={clearAll}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Psychology />}
              onClick={buildQuery}
              disabled={!queryValid || loading}
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </Button>
          </Box>
        }
      />
      <CardContent>
        {/* Query Status */}
        <Alert 
          severity={queryValid ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
        >
          {queryValid 
            ? '✅ Query ready - all required parameters configured'
            : '⚠️ Complete player context (team, player, season) to execute query'
          }
        </Alert>
        
        {/* Dimension Configuration */}
        {Object.entries(QUERY_DIMENSIONS).map(([dimKey, dimension]) => (
          <Accordion 
            key={dimKey}
            expanded={expandedDimensions.includes(dimKey)}
            onChange={() => setExpandedDimensions(prev => 
              prev.includes(dimKey) 
                ? prev.filter(d => d !== dimKey)
                : [...prev, dimKey]
            )}
            disabled={dimKey === 'player'} // Player dimension always enabled
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">
                  {dimension.icon} {dimension.label}
                </Typography>
                
                {dimKey !== 'player' && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={queryDimensions[dimKey].enabled}
                        onChange={() => toggleDimension(dimKey)}
                        size="small"
                      />
                    }
                    label={queryDimensions[dimKey].enabled ? 'Enabled' : 'Disabled'}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                
                {dimension.required && (
                  <Chip 
                    label="Required" 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                )}
                
                {dimension.combinable && (
                  <Chip 
                    label="Combinable" 
                    size="small" 
                    color="secondary" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Grid container spacing={2}>
                {dimension.fields.map(field => (
                  <Grid item xs={12} sm={6} md={4} key={field}>
                    {renderFieldInput(dimKey, field)}
                  </Grid>
                ))}
              </Grid>
              
              {/* Show current values */}
              {Object.keys(queryDimensions[dimKey].values).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Current values:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(queryDimensions[dimKey].values).map(([field, value]) => 
                      value && (
                        <Chip
                          key={field}
                          label={`${field}: ${typeof value === 'object' ? value.label : value}`}
                          size="small"
                          variant="outlined"
                          onDelete={() => updateDimensionValue(dimKey, field, '')}
                        />
                      )
                    )}
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
        
        {/* Query Preview */}
        {queryValid && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              🔍 Query Preview
            </Typography>
            <Box sx={{ 
              bgcolor: theme.palette.background.default,
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              {JSON.stringify({
                base: queryDimensions.player.values,
                filters: Object.keys(queryDimensions)
                  .filter(dim => dim !== 'player' && queryDimensions[dim].enabled)
                  .reduce((acc, dim) => ({ ...acc, ...queryDimensions[dim].values }), {})
              }, null, 2)}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedQueryBuilder;
