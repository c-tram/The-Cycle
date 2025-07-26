// Professional Baseball Analytics Theme System
// Modern, sleek design with baseball-inspired colors and typography

import { createTheme } from '@mui/material/styles';

// Color palette inspired by professional baseball analytics platforms
const baseColors = {
  // Primary brand colors
  primary: {
    50: '#e8f4fd',
    100: '#d1e9fb',
    200: '#a3d3f7',
    300: '#75bdf3',
    400: '#47a7ef',
    500: '#1976d2', // Main primary
    600: '#1565c0',
    700: '#0d47a1',
    800: '#0a3d91',
    900: '#083371',
    main: '#1976d2', // Required by MUI
    light: '#47a7ef',
    dark: '#0d47a1',
    contrastText: '#ffffff'
  },
  
  // Secondary colors for accents
  secondary: {
    50: '#fff3e0',
    100: '#ffe7cc',
    200: '#ffcc99',
    300: '#ffb366',
    400: '#ff9933',
    500: '#ff6f00', // Main secondary
    600: '#e65100',
    700: '#cc4400',
    800: '#b33900',
    900: '#992e00',
    main: '#ff6f00', // Required by MUI
    light: '#ffcc99',
    dark: '#e65100',
    contrastText: '#ffffff'
  },

  // Success colors for positive stats
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
    main: '#4caf50', // Required by MUI
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff'
  },

  // Error colors for negative stats
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
    main: '#f44336', // Required by MUI
    light: '#ef5350',
    dark: '#d32f2f',
    contrastText: '#ffffff'
  },

  // Warning colors for medium stats
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#ffc107',
    600: '#ffb300',
    700: '#ffa000',
    800: '#ff8f00',
    900: '#ff6f00',
    main: '#ffc107', // Required by MUI
    light: '#ffca28',
    dark: '#ffa000',
    contrastText: '#000000'
  },

  // Neutral grays for backgrounds and text
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  },

  // Baseball field inspired colors
  field: {
    grass: '#2d5a27',
    dirt: '#8b4513',
    warning: '#ff6b35',
    foul: '#ffffff'
  }
};

// Dark theme colors
const darkColors = {
  background: {
    default: '#0a0e1a',
    paper: '#1a1f2e',
    elevated: '#252a3a'
  },
  surface: {
    primary: '#1e2332',
    secondary: '#252a3a',
    tertiary: '#2d3348'
  }
};

// Light theme colors  
const lightColors = {
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
    elevated: '#ffffff'
  },
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9'
  }
};

// Typography system
const typography = {
  fontFamily: [
    'Inter',
    'SF Pro Display',
    'Segoe UI',
    '-apple-system',
    'BlinkMacSystemFont',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif'
  ].join(','),
  
  h1: {
    fontSize: '3.5rem',
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.02em'
  },
  h2: {
    fontSize: '2.75rem',
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.01em'
  },
  h3: {
    fontSize: '2.25rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em'
  },
  h4: {
    fontSize: '1.875rem',
    fontWeight: 600,
    lineHeight: 1.35
  },
  h5: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4
  },
  h6: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.45
  },
  
  // Body text
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5
  },
  
  // Captions and small text
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.01em'
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  },

  // Monospace for statistics
  mono: {
    fontFamily: [
      'SF Mono',
      'Monaco',
      'Inconsolata',
      'Roboto Mono',
      'Consolas',
      'Courier New',
      'monospace'
    ].join(','),
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.4
  }
};

// Spacing system (8px base unit)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64
};

// Border radius system
const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24
};

// Shadow system
const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
};

// Create Material-UI theme
export const createAppTheme = (mode = 'light') => {
  const isLight = mode === 'light';
  const colors = isLight ? lightColors : darkColors;

  return createTheme({
    palette: {
      mode,
      primary: baseColors.primary,
      secondary: baseColors.secondary,
      success: baseColors.success,
      error: baseColors.error,
      warning: baseColors.warning,
      background: colors.background,
      text: {
        primary: isLight ? baseColors.neutral[900] : baseColors.neutral[50],
        secondary: isLight ? baseColors.neutral[600] : baseColors.neutral[300],
        disabled: isLight ? baseColors.neutral[400] : baseColors.neutral[500]
      }
    },
    
    typography: {
      ...typography,
      allVariants: {
        fontFamily: typography.fontFamily
      }
    },

    shape: {
      borderRadius: borderRadius.md
    },

    spacing: (factor) => `${spacing.sm * factor}px`,

    components: {
      // Card styling
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.lg,
            boxShadow: shadows.md,
            border: `1px solid ${isLight ? baseColors.neutral[200] : baseColors.neutral[700]}`,
            '&:hover': {
              boxShadow: shadows.lg,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            }
          }
        }
      },

      // Button styling
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            padding: `${spacing.sm}px ${spacing.md}px`,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: shadows.sm,
              transform: 'translateY(-1px)',
              transition: 'all 0.15s ease-in-out'
            }
          },
          contained: {
            '&:hover': {
              boxShadow: shadows.md
            }
          }
        }
      },

      // Chip styling for stats
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.sm,
            fontWeight: 500,
            fontSize: '0.75rem'
          }
        }
      },

      // Paper styling
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.lg,
            border: `1px solid ${isLight ? baseColors.neutral[200] : baseColors.neutral[700]}`
          },
          elevation1: {
            boxShadow: shadows.sm
          },
          elevation2: {
            boxShadow: shadows.md
          },
          elevation3: {
            boxShadow: shadows.lg
          }
        }
      },

      // Table styling
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? baseColors.neutral[50] : colors.surface.secondary,
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: isLight ? baseColors.neutral[700] : baseColors.neutral[300]
            }
          }
        }
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isLight ? baseColors.neutral[200] : baseColors.neutral[700]}`,
            padding: `${spacing.sm}px ${spacing.md}px`
          }
        }
      },

      // Tab styling
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 44,
            '&.Mui-selected': {
              fontWeight: 600
            }
          }
        }
      },

      // AppBar styling
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? colors.background.paper : colors.background.default,
            color: isLight ? baseColors.neutral[900] : baseColors.neutral[50],
            boxShadow: shadows.sm,
            borderBottom: `1px solid ${isLight ? baseColors.neutral[200] : baseColors.neutral[700]}`
          }
        }
      }
    },

    // Custom theme properties
    custom: {
      colors: baseColors,
      spacing,
      borderRadius,
      shadows,
      field: baseColors.field
    }
  });
};

// Team color mappings for charts and UI
export const teamColors = {
  'NYY': '#132448',
  'BOS': '#BD3039', 
  'TOR': '#134A8E',
  'TB': '#092C5C',
  'BAL': '#DF4601',
  'HOU': '#002D62',
  'LAA': '#BA0021',
  'OAK': '#003831',
  'SEA': '#0C2C56',
  'TEX': '#003278',
  'ATL': '#CE1141',
  'WSH': '#AB0003',
  'NYM': '#002D72',
  'PHI': '#E81828',
  'MIA': '#00A3E0',
  'CHC': '#0E3386',
  'MIL': '#12284B',
  'STL': '#C41E3A',
  'CIN': '#C6011F',
  'PIT': '#FDB827',
  'LAD': '#005A9C',
  'SD': '#2F241D',
  'SF': '#FD5A1E',
  'COL': '#C4CED4',
  'ARI': '#A71930',
  'KC': '#004687',
  'MIN': '#002B5C',
  'CWS': '#27251F',
  'CLE': '#E31937',
  'DET': '#0C2340'
};

// Statistical performance color scales
export const statColors = {
  // Batting average color scale
  average: {
    excellent: baseColors.success[600],  // .300+
    good: baseColors.success[400],       // .280-.299
    average: baseColors.warning[500],    // .250-.279
    poor: baseColors.error[400],         // .220-.249
    terrible: baseColors.error[600]      // <.220
  },
  
  // ERA color scale (lower is better)
  era: {
    excellent: baseColors.success[600],  // <2.50
    good: baseColors.success[400],       // 2.50-3.49
    average: baseColors.warning[500],    // 3.50-4.49
    poor: baseColors.error[400],         // 4.50-5.49
    terrible: baseColors.error[600]      // 5.50+
  },

  // OPS color scale
  ops: {
    excellent: baseColors.success[600],  // .900+
    good: baseColors.success[400],       // .800-.899
    average: baseColors.warning[500],    // .700-.799
    poor: baseColors.error[400],         // .600-.699
    terrible: baseColors.error[600]      // <.600
  },

  // WHIP color scale (lower is better)
  whip: {
    excellent: baseColors.success[600],  // <1.00
    good: baseColors.success[400],       // 1.00-1.19
    average: baseColors.warning[500],    // 1.20-1.39
    poor: baseColors.error[400],         // 1.40-1.59
    terrible: baseColors.error[600]      // 1.60+
  }
};

// Utility functions for theme
export const themeUtils = {
  // Get color based on statistical performance
  getStatColor: (value, statType, theme) => {
    const scale = statColors[statType];
    if (!scale) return theme.palette.text.primary;

    switch (statType) {
      case 'average':
        if (value >= 0.300) return scale.excellent;
        if (value >= 0.280) return scale.good;
        if (value >= 0.250) return scale.average;
        if (value >= 0.220) return scale.poor;
        return scale.terrible;
      
      case 'era':
        if (value < 2.50) return scale.excellent;
        if (value < 3.50) return scale.good;
        if (value < 4.50) return scale.average;
        if (value < 5.50) return scale.poor;
        return scale.terrible;
      
      case 'ops':
        if (value >= 0.900) return scale.excellent;
        if (value >= 0.800) return scale.good;
        if (value >= 0.700) return scale.average;
        if (value >= 0.600) return scale.poor;
        return scale.terrible;
      
      case 'whip':
        if (value < 1.00) return scale.excellent;
        if (value < 1.20) return scale.good;
        if (value < 1.40) return scale.average;
        if (value < 1.60) return scale.poor;
        return scale.terrible;
      
      default:
        return theme.palette.text.primary;
    }
  },

  // Get team primary color
  getTeamColor: (teamId) => {
    return teamColors[teamId?.toUpperCase()] || baseColors.neutral[500];
  },

  // Get contrasting text color
  getContrastText: (backgroundColor) => {
    // Simple luminance calculation
    const rgb = backgroundColor.match(/\d+/g);
    if (!rgb) return '#ffffff';
    
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  },

  // Format statistical values
  formatStat: (value, statType) => {
    if (value === null || value === undefined) return '---';
    
    const numValue = Number(value);
    if (isNaN(numValue)) return '---';

    // Percentage stats (AVG, OBP, SLG, etc.)
    if (['avg', 'obp', 'slg', 'ops', 'babip'].includes(statType.toLowerCase())) {
      return numValue.toFixed(3);
    }
    
    // ERA and WHIP
    if (['era', 'whip', 'fip'].includes(statType.toLowerCase())) {
      return numValue.toFixed(2);
    }
    
    // Innings pitched
    if (statType.toLowerCase() === 'inningspitched') {
      return numValue.toFixed(1);
    }
    
    // Whole numbers
    return Math.round(numValue).toString();
  },

  // Get position color
  getPositionColor: (position) => {
    const positionColors = {
      'P': '#e91e63', // Pitcher - Pink
      'C': '#9c27b0', // Catcher - Purple
      '1B': '#673ab7', // First Base - Deep Purple
      '2B': '#3f51b5', // Second Base - Indigo
      '3B': '#2196f3', // Third Base - Blue
      'SS': '#03a9f4', // Shortstop - Light Blue
      'LF': '#00bcd4', // Left Field - Cyan
      'CF': '#009688', // Center Field - Teal
      'RF': '#4caf50', // Right Field - Green
      'OF': '#4caf50', // Outfield - Green
      'IF': '#3f51b5', // Infield - Indigo
      'DH': '#ff9800', // Designated Hitter - Orange
      'RP': '#f44336', // Relief Pitcher - Red
      'SP': '#e91e63'  // Starting Pitcher - Pink
    };
    
    return positionColors[position] || '#757575';
  },

  // Format spacing value
  spacing: (multiplier) => `${spacing.sm * multiplier}px`,

  // Get responsive breakpoint values
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920
  }
};

export default {
  createAppTheme,
  teamColors,
  statColors,
  themeUtils,
  baseColors,
  typography,
  spacing,
  borderRadius,
  shadows
};
