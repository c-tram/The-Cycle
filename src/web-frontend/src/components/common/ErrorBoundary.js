import React from 'react';
import { Box, Typography, Button, Paper, useTheme } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error} 
        onReload={this.handleReload}
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, onReload, onRetry }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: 'background.default'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 500,
            textAlign: 'center',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: theme.palette.error.light,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                color: theme.palette.error.main
              }}
            >
              <ErrorOutline sx={{ fontSize: 40 }} />
            </Box>
          </motion.div>

          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Oops! Something went wrong
          </Typography>

          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, lineHeight: 1.6 }}
          >
            We encountered an unexpected error while loading the baseball analytics. 
            Don't worry, this happens sometimes with complex statistical calculations.
          </Typography>

          {process.env.NODE_ENV === 'development' && error && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: theme.palette.grey[100],
                borderRadius: 1,
                textAlign: 'left',
                maxHeight: 150,
                overflow: 'auto'
              }}
            >
              <Typography variant="caption" color="error" component="pre">
                {error.toString()}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
              sx={{ minWidth: 120 }}
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={onReload}
              sx={{ minWidth: 120 }}
            >
              Reload Page
            </Button>
          </Box>

          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ mt: 3, display: 'block' }}
          >
            If this problem persists, please check your internet connection or contact support.
          </Typography>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default ErrorBoundary;
