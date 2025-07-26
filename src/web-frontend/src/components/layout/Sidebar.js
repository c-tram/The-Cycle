import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard,
  People,
  Groups,
  EmojiEvents,
  TrendingUp,
  Analytics,
  Compare,
  Settings,
  SportsBaseball,
  Timeline,
  Assessment,
  StarBorder
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ open, onClose, variant = 'temporary' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      section: 'Main',
      items: [
        {
          text: 'Dashboard',
          icon: <Dashboard />,
          path: '/',
          description: 'Overview & insights'
        },
        {
          text: 'Players',
          icon: <People />,
          path: '/players',
          description: 'Player statistics & analysis'
        },
        {
          text: 'Teams',
          icon: <Groups />,
          path: '/teams',
          description: 'Team performance & rosters'
        },
        {
          text: 'Standings',
          icon: <EmojiEvents />,
          path: '/standings',
          description: 'League standings & records'
        }
      ]
    },
    {
      section: 'Analytics',
      items: [
        {
          text: 'Leaders',
          icon: <StarBorder />,
          path: '/leaders',
          description: 'Statistical leaders',
          badge: 'Popular'
        },
        {
          text: 'Advanced Analytics',
          icon: <Analytics />,
          path: '/analytics',
          description: 'Deep statistical analysis',
          badge: 'Pro'
        },
        {
          text: 'Compare',
          icon: <Compare />,
          path: '/compare',
          description: 'Player & team comparisons'
        }
      ]
    },
    {
      section: 'Tools',
      items: [
        {
          text: 'Settings',
          icon: <Settings />,
          path: '/settings',
          description: 'App preferences'
        }
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isCurrentPath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawerWidth = 280;

  const drawerContent = (
    <Box
      sx={{
        width: drawerWidth,
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          pt: { xs: 3, md: 4 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              color: 'white'
            }}
          >
            <SportsBaseball sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
              The Cycle
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v2.0 Professional
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
        {navigationItems.map((section, sectionIndex) => (
          <Box key={section.section} sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              sx={{
                px: 3,
                py: 1,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'text.secondary',
                letterSpacing: '0.1em'
              }}
            >
              {section.section}
            </Typography>
            
            <List dense sx={{ px: 1 }}>
              {section.items.map((item, itemIndex) => {
                const isActive = isCurrentPath(item.path);
                
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      delay: (sectionIndex * section.items.length + itemIndex) * 0.05 
                    }}
                  >
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          backgroundColor: isActive 
                            ? alpha(theme.palette.primary.main, 0.1)
                            : 'transparent',
                          color: isActive 
                            ? theme.palette.primary.main 
                            : 'text.primary',
                          '&:hover': {
                            backgroundColor: isActive
                              ? alpha(theme.palette.primary.main, 0.15)
                              : alpha(theme.palette.action.hover, 0.8),
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease-in-out'
                          },
                          '&:active': {
                            transform: 'translateX(2px)'
                          },
                          py: 1.5,
                          px: 2
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: 'inherit',
                            minWidth: 40,
                            '& .MuiSvgIcon-root': {
                              fontSize: 22
                            }
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight={isActive ? 600 : 500}
                                sx={{ fontSize: '0.875rem' }}
                              >
                                {item.text}
                              </Typography>
                              {item.badge && (
                                <Chip
                                  label={item.badge}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    backgroundColor: item.badge === 'Pro' 
                                      ? alpha(theme.palette.secondary.main, 0.2)
                                      : alpha(theme.palette.success.main, 0.2),
                                    color: item.badge === 'Pro'
                                      ? theme.palette.secondary.main
                                      : theme.palette.success.main,
                                    border: `1px solid ${
                                      item.badge === 'Pro'
                                        ? alpha(theme.palette.secondary.main, 0.3)
                                        : alpha(theme.palette.success.main, 0.3)
                                    }`
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                mt: 0.25,
                                display: 'block'
                              }}
                            >
                              {item.description}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </motion.div>
                );
              })}
            </List>
            
            {sectionIndex < navigationItems.length - 1 && (
              <Divider sx={{ mx: 2, my: 2, opacity: 0.6 }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backgroundColor: alpha(theme.palette.background.default, 0.5)
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Pro Analytics
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Advanced baseball statistics with professional-grade calculations
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip
              icon={<Assessment />}
              label="40+ Stats"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
            <Chip
              icon={<Timeline />}
              label="Real-time"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      PaperProps={{
        sx: {
          borderRight: 'none',
          boxShadow: variant === 'temporary' ? theme.shadows[8] : 'none'
        }
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box'
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
