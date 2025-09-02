import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// Theme and styling
import { createAppTheme } from './theme/theme';

// Layout components
import Navigation from './components/layout/Navigation';
import Sidebar from './components/layout/Sidebar';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

// Page components
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import PlayerProfile from './pages/PlayerProfile';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Standings from './pages/Standings';
import Leaders from './pages/Leaders';
import SplitsExplorer from './pages/SplitsExplorer';
import Analytics from './pages/Analytics';
import Compare from './pages/Compare';
import Settings from './pages/Settings';

// Hooks and utilities
import { healthCheck } from './services/apiService';

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theCycle-darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('checking');

  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  // Initialize app and check API health
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        console.log('🔄 Initializing app and checking API health...');
        
        // Add a timeout to prevent infinite loading
        const healthPromise = healthCheck();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        );
        
        const health = await Promise.race([healthPromise, timeoutPromise]);
        console.log('✅ API Health Check Response:', health);
        setApiStatus(health.status === 'healthy' ? 'connected' : 'error');
      } catch (error) {
        console.error('❌ Failed to connect to API:', error);
        setApiStatus('error');
        // Continue anyway to show the UI
      } finally {
        console.log('✨ App initialization complete');
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theCycle-darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Navigation Header */}
            <Navigation
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              onToggleSidebar={toggleSidebar}
              apiStatus={apiStatus}
            />

            {/* Sidebar */}
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              variant="temporary"
            />

            {/* Main Content Area */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                pt: { xs: 7, sm: 8 }, // Account for navigation height
                minHeight: '100vh',
                backgroundColor: 'background.default'
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={window.location.pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <Routes>
                    {/* Dashboard - Main analytics overview */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />

                    {/* Players section */}
                    <Route path="/players" element={<Players />} />
                    <Route path="/players/batting" element={<Players category="batting" />} />
                    <Route path="/players/pitching" element={<Players category="pitching" />} />
                    <Route path="/players/:team/:playerName/:year" element={<PlayerDetail />} />
                    <Route path="/players/:playerId" element={<PlayerProfile />} />

                    {/* Teams section */}
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/teams/batting" element={<Teams category="batting" />} />
                    <Route path="/teams/pitching" element={<Teams category="pitching" />} />
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                    <Route path="/teams/:teamId/:year" element={<TeamDetail />} />

                    {/* Standings */}
                    <Route path="/standings" element={<Standings />} />

                    {/* Statistical leaders */}
                    <Route path="/leaders" element={<Leaders />} />

                    {/* Statistical splits */}
                    <Route path="/splits" element={<SplitsExplorer />} />

                    {/* Advanced analytics */}
                    <Route path="/analytics" element={<Analytics />} />

                    {/* Comparison tools */}
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/compare/players" element={<Compare type="players" />} />
                    <Route path="/compare/teams" element={<Compare type="teams" />} />

                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />

                    {/* 404 fallback */}
                    <Route path="*" element={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flex: 1,
                        flexDirection: 'column',
                        gap: 2
                      }}>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Box sx={{ fontSize: '4rem', fontWeight: 800 }}>404</Box>
                          <Box sx={{ fontSize: '1.25rem', color: 'text.secondary' }}>
                            Page not found
                          </Box>
                        </motion.div>
                      </Box>
                    } />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
