import {DefaultTheme} from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1B5E20', // Dark green for baseball theme
    accent: '#4CAF50', // Light green
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    disabled: '#BDBDBD',
    placeholder: '#757575',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    // Custom colors for baseball
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    card: '#FFFFFF',
    border: '#E0E0E0',
  },
  roundness: 8,
  fonts: {
    ...DefaultTheme.fonts,
    medium: {
      ...DefaultTheme.fonts.medium,
      fontFamily: 'System',
    },
    regular: {
      ...DefaultTheme.fonts.regular,
      fontFamily: 'System',
    },
    light: {
      ...DefaultTheme.fonts.light,
      fontFamily: 'System',
    },
    thin: {
      ...DefaultTheme.fonts.thin,
      fontFamily: 'System',
    },
  },
};
