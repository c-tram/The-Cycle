import React from 'react';
import { Box, CircularProgress, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { SportsBaseball } from '@mui/icons-material';

// variant: 'full' (startup) or 'overlay' (route transition)
const LoadingScreen = ({ message = 'Loading baseball analytics...', variant = 'full' }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: variant === 'overlay' 
          ? alpha(theme.palette.background.default, 0.85) 
          : 'background.default',
        backdropFilter: variant === 'overlay' ? 'blur(6px)' : 'none',
        zIndex: 9999,
        pointerEvents: variant === 'overlay' ? 'none' : 'auto'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            px: 2
          }}
        >
          {/* Animated Logo */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            <Box
              sx={{
                width: variant === 'overlay' ? 64 : 80,
                height: variant === 'overlay' ? 64 : 80,
                borderRadius: variant === 'overlay' ? 3 : '20px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: theme.shadows[8],
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <SportsBaseball sx={{ fontSize: variant === 'overlay' ? 34 : 40 }} />
              
              {/* Animated background overlay */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(45deg, ${alpha(theme.palette.primary.light, 0.3)}, transparent)`,
                  borderRadius: '20px'
                }}
                animate={{ 
                  x: [-100, 100, -100],
                  opacity: [0, 0.5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: 'easeInOut' 
                }}
              />
            </Box>
          </motion.div>

          {/* Loading indicator */}
          <Box sx={{ position: 'relative' }}>
            <CircularProgress
              size={60}
              thickness={3}
              sx={{
                color: theme.palette.primary.main,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round'
                }
              }}
            />
            <CircularProgress
              size={60}
              thickness={3}
              variant="determinate"
              value={25}
              sx={{
                color: alpha(theme.palette.secondary.main, 0.3),
                position: 'absolute',
                top: 0,
                left: 0,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round'
                }
              }}
            />
          </Box>

          {/* Brand and message */}
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                The Cycle
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'text.secondary',
                  mb: 2,
                  fontWeight: 500
                }}
              >
                Professional Baseball Analytics
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.8
                }}
              >
                {message}
              </Typography>
            </motion.div>
          </Box>

          {/* Loading dots animation */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: 'easeInOut'
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main
                  }}
                />
              </motion.div>
            ))}
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default LoadingScreen;
