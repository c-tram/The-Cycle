import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LayoutContext, useLayoutProvider } from './hooks/useLayout';
import './App.css';
import './styles/Layout.css';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';

// Pages
import Overview from './pages/Overview';
import Teams from './pages/Teams';
import Standings from './pages/Standings';
import Trends from './pages/Trends';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  const handleLogin = (username: string, password: string) => {
    if (username && password) {
      setIsLoggedIn(true);
      setUserName(username);
    }
  };

  const layoutContext = useLayoutProvider();

  return (
    <HelmetProvider>
      {!isLoggedIn ? (
        <div className="auth-container">
          <Login onLogin={handleLogin} />
        </div>
      ) : (
        <LayoutContext.Provider value={layoutContext}>
          <Router>
            <div className="app-container">
              <Sidebar />
              <div className={`main-content ${layoutContext.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Header userName={userName} />
                <div className="content-area">
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/standings" element={<Standings />} />
                    <Route path="/trends" element={<Trends />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </div>
          </Router>
        </LayoutContext.Provider>
      )}
    </HelmetProvider>
  );
}

export default App;
