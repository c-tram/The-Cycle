import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome,
  faBaseballBall,
  faTrophy,
  faChartLine,
  faBaseball,
  faBars,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useLayout } from '../hooks/useLayout';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { pathname } = location;
  const { sidebarCollapsed, setSidebarCollapsed, isMobile, toggleSidebar } = useLayout();
  
  // Close sidebar when clicking a link on mobile
  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };
  
  return (
    <>
      {isMobile && (
        <div className={`mobile-toggle ${!sidebarCollapsed ? 'active' : ''}`} onClick={toggleSidebar}>
          <FontAwesomeIcon icon={sidebarCollapsed ? faBars : faTimes} />
        </div>
      )}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="logo">
          <FontAwesomeIcon icon={faBaseball} className="logo-icon" />
          <h2>MLB STATCAST</h2>
        </div>
        <nav className="nav-menu">
          <ul>
            <li>
              <Link 
                to="/" 
                className={pathname === '/' ? 'active' : ''} 
                onClick={handleLinkClick}
                title="Overview"
              >
                <FontAwesomeIcon icon={faHome} className="menu-icon" />
                <span className="menu-text">Overview</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/teams" 
                className={pathname === '/teams' ? 'active' : ''} 
                onClick={handleLinkClick}
                title="Teams"
              >
                <FontAwesomeIcon icon={faBaseballBall} className="menu-icon" />
                <span className="menu-text">Teams</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/standings" 
                className={pathname === '/standings' ? 'active' : ''} 
                onClick={handleLinkClick}
                title="Standings"
              >
                <FontAwesomeIcon icon={faTrophy} className="menu-icon" />
                <span className="menu-text">Standings</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/trends" 
                className={pathname === '/trends' ? 'active' : ''} 
                onClick={handleLinkClick}
                title="Trends"
              >
                <FontAwesomeIcon icon={faChartLine} className="menu-icon" />
                <span className="menu-text">Trends</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <span>© 2023 MLB Statcast</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
