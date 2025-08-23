const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { getRedisClient } = require('./utils/redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : false)
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redis health check
app.get('/api/redis-health', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    res.json({ status: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Debug endpoint to check Redis keys
app.get('/api/redis-debug', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    const summaryKeys = await redisClient.keys('summary:*');
    const dashboardKey = await redisClient.get('summary:dashboard:2025');
    
    res.json({ 
      summaryKeys,
      dashboardKeyExists: !!dashboardKey,
      dashboardKeyData: dashboardKey ? JSON.parse(dashboardKey) : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Import v2 routes (improved versions)
const playerRoutesV2 = require('./routes/players_v2');
const teamRoutesV2 = require('./routes/teams_v2');
const statsRoutesV2 = require('./routes/stats_v2');
const splitsRoutesV2 = require('./routes/splits_v2');
const splitsDiscover = require('./routes/splits_discover');
const splitsPlayers = require('./routes/splits_players');
const matchupRoutes = require('./routes/matchups');
const standingsRoutes = require('./routes/standings');

// Use v2 routes as primary API
app.use('/api/v2/players', playerRoutesV2);
app.use('/api/v2/teams', teamRoutesV2);
app.use('/api/v2/stats', statsRoutesV2);
app.use('/api/v2/splits', splitsRoutesV2);
app.use('/api/v2/splits', splitsDiscover);
app.use('/api/v2/splits/players', splitsPlayers);

// Legacy v1 endpoints redirected to v2 for backward compatibility
app.use('/api/players', playerRoutesV2);
app.use('/api/teams', teamRoutesV2);
app.use('/api/stats', statsRoutesV2);

// Additional routes
app.use('/api/matchups', matchupRoutes);
app.use('/api/standings', standingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 The Cycle Backend running on port ${PORT}`);
  console.log(`📊 Redis connected to: thecycle.redis.cache.windows.net`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  const redisClient = getRedisClient();
  redisClient.disconnect();
  process.exit(0);
});

module.exports = app;
