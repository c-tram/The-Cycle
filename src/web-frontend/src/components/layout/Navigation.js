import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  DarkMode,
  LightMode,
  Search,
  Notifications,
  Settings,
  AccountCircle,
  Analytics,
  TrendingUp,
  Wifi,
  WifiOff
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = ({ 
  darkMode, 
  onToggleDarkMode, 
  onToggleSidebar, 
  apiStatus = 'connected'
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);

  // Get page title based on current route
  const getPageTitle = (pathname) => {
    const routes = {
      '/': 'Dashboard',
      '/players': 'Players',
      '/teams': 'Teams',
      '/standings': 'Standings',
      '/leaders': 'Statistical Leaders',
      '/splits': 'Statistical Splits',
      '/analytics': 'Advanced Analytics',
      '/compare': 'Compare',
      '/settings': 'Settings'
    };
    
    // Handle dynamic routes
    if (pathname.startsWith('/players/')) return 'Player Details';
    if (pathname.startsWith('/teams/')) return 'Team Details';
    if (pathname.startsWith('/compare/')) return 'Compare';
    
    return routes[pathname] || 'The Cycle';
  };

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return theme.palette.success.main;
      case 'error': return theme.palette.error.main;
      case 'checking': return theme.palette.warning.main;
      default: return theme.palette.warning.main;
    }
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'connected': return <Wifi fontSize="small" />;
      case 'error': return <WifiOff fontSize="small" />;
      default: return <Wifi fontSize="small" />;
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backdropFilter: 'blur(20px)',
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Menu button for mobile */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onToggleSidebar}
          sx={{ 
            mr: 2,
            display: { md: 'none' }
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo and Brand */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mr: 4
            }}
            onClick={() => navigate('/')}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                color: 'white'
              }}
            >
              <Analytics sx={{ fontSize: 24, fontWeight: 'bold' }} />
            </Box>
            <Box>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                The Cycle
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Professional Baseball Analytics
              </Typography>
            </Box>
          </Box>
        </motion.div>

        {/* Page Title */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 'auto' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              opacity: 0.8
            }}
          >
            {getPageTitle(location.pathname)}
          </Typography>
        </Box>

        {/* Right side controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {/* GitHub Repository Link */}
          <Tooltip title="View GitHub Repository">
            <IconButton
              color="inherit"
              onClick={() => window.open('https://github.com/c-tram/The-Cycle', '_blank')}
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <Avatar
                src="https://github.com/c-tram.png"
                alt="GitHub Repository"
                sx={{
                  width: 32,
                  height: 32,
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  '&:hover': {
                    border: `2px solid ${theme.palette.primary.main}`,
                    transform: 'scale(1.05)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                CT
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* API Status Indicator */}
          <Tooltip title={`API Status: ${apiStatus}`}>
            <Chip
              icon={getStatusIcon()}
              label={apiStatus}
              size="small"
              sx={{
                backgroundColor: alpha(getStatusColor(), 0.1),
                color: getStatusColor(),
                border: `1px solid ${alpha(getStatusColor(), 0.3)}`,
                '& .MuiChip-icon': {
                  color: getStatusColor()
                },
                display: { xs: 'none', sm: 'flex' }
              }}
            />
          </Tooltip>

          {/* Search button */}
          <Tooltip title="Search">
            <IconButton
              color="inherit"
              onClick={() => navigate('/players')}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <Search />
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <IconButton
                color="inherit"
                onClick={onToggleDarkMode}
                sx={{
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
              >
                {darkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
            </motion.div>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationsOpen}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <Badge badgeContent={2} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              onClick={() => navigate('/settings')}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <Settings />
            </IconButton>
          </Tooltip>

          {/* Profile menu */}
          <Tooltip title="Account">
            <IconButton
              color="inherit"
              onClick={handleProfileMenuOpen}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleProfileMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: theme.shadows[8]
            }
          }}
        >
          <MenuItem onClick={() => navigate('/settings')}>
            <Settings sx={{ mr: 2 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={() => navigate('/analytics')}>
            <TrendingUp sx={{ mr: 2 }} />
            Analytics
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={handleNotificationsClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 300,
              borderRadius: 2,
              boxShadow: theme.shadows[8]
            }
          }}
        >
          <MenuItem>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Season Update Available
              </Typography>
              <Typography variant="caption" color="text.secondary">
                New player statistics have been loaded
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Analytics Report Ready
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Weekly performance summary is available
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
