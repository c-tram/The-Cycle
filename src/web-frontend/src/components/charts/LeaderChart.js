import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { themeUtils } from '../../theme/theme';

const LeaderChart = ({ leaders, title, statKey, statLabel, formatValue }) => {
  const theme = useTheme();

  if (!leaders || leaders.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No leaders data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      
      <List>
        {leaders.slice(0, 10).map((leader, index) => (
          <ListItem
            key={index}
            sx={{
              px: 0,
              py: 1,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05)
              }
            }}
          >
            <ListItemAvatar>
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{
                    color: index === 0 
                      ? theme.palette.warning.main 
                      : index < 3 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary,
                    mr: 2,
                    minWidth: 20
                  }}
                >
                  {index + 1}
                </Typography>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: themeUtils.getTeamColor(leader.player?.team || leader.team),
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {leader.player?.team || leader.team || 'N/A'}
                </Avatar>
              </Box>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight={600}>
                  {leader.player?.name || leader.name || 'Unknown Player'}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {leader.player?.team || leader.team} • {leader.games || 0}G
                </Typography>
              }
            />
            
            <Chip
              label={formatValue ? formatValue(leader[statKey] || leader.value) : (leader[statKey] || leader.value || '---')}
              size="small"
              sx={{
                backgroundColor: alpha(
                  index === 0 
                    ? theme.palette.warning.main 
                    : theme.palette.primary.main, 
                  0.1
                ),
                color: index === 0 
                  ? theme.palette.warning.main 
                  : theme.palette.primary.main,
                fontWeight: 700,
                minWidth: 60
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LeaderChart;
