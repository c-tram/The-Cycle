import React from 'react';
import {
  Box,
  Typography,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const StatsChart = ({ data, title, type = 'line', xKey = 'date', yKey = 'value', color }) => {
  const theme = useTheme();
  
  const chartColor = color || theme.palette.primary.main;

  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No chart data available
        </Typography>
      </Box>
    );
  }

  const ChartComponent = type === 'bar' ? BarChart : LineChart;
  const DataComponent = type === 'bar' ? Bar : Line;

  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            axisLine={{ stroke: theme.palette.divider }}
          />
          <YAxis 
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            axisLine={{ stroke: theme.palette.divider }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
              color: theme.palette.text.primary
            }}
          />
          {type === 'bar' ? (
            <Bar dataKey={yKey} fill={chartColor} radius={[4, 4, 0, 0]} />
          ) : (
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={chartColor} 
              strokeWidth={3}
              dot={{ fill: chartColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: chartColor, strokeWidth: 2 }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </Box>
  );
};

export default StatsChart;
