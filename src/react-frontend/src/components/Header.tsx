import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faGear, 
  faSignOutAlt,
  faCaretDown,
  faBell,
  faSearch,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import { useLayout } from '../hooks/useLayout';
import '../styles/Header.css';

interface HeaderProps {
  userName: string;
}

const Header = ({ userName }: HeaderProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { isMobile, toggleSidebar } = useLayout();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const location = useLocation();

  // Get current page name from route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    return path.substring(1).charAt(0).toUpperCase() + path.substring(2);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node) && isMobile) {
        setShowMobileSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  // Reset mobile search on resize
  useEffect(() => {
    if (!isMobile) {
      setShowMobileSearch(false);
    }
  }, [isMobile]);

  return (
    <header className="main-header">
      <div className="header-content">
        {isMobile && (
          <div className="menu-toggle" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </div>
        )}
        <div className="page-title">
          <h1>{getPageTitle()}</h1>
        </div>
        
        <div className="user-controls">
          {isMobile ? (
            <>
              {showMobileSearch ? (
                <div className="search-box mobile-search" ref={searchRef}>
                  <FontAwesomeIcon icon={faSearch} className="search-icon" />
                  <input type="text" placeholder="Search stats, players..." autoFocus />
                </div>
              ) : (
                <>
                  <div className="mobile-icon" onClick={toggleMobileSearch}>
                    <FontAwesomeIcon icon={faSearch} />
                  </div>
                  <div className="mobile-icon">
                    <FontAwesomeIcon icon={faBell} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input type="text" placeholder="Search stats, players..." />
              </div>
              
              <div className="notifications">
                <FontAwesomeIcon icon={faBell} />
                <span className="notification-badge">2</span>
              </div>
            </>
          )}
          
          <div className="user-dropdown" onClick={toggleDropdown} ref={dropdownRef}>
            <div className="user-avatar">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <span className="user-name">{userName}</span>
            <FontAwesomeIcon icon={faCaretDown} className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
            
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <ul>
                  <li>
                    <FontAwesomeIcon icon={faUser} className="menu-icon" />
                    <span>Profile</span>
                  </li>
                  <li>
                    <FontAwesomeIcon icon={faGear} className="menu-icon" />
                    <span>Settings</span>
                  </li>
                  <li>
                    <FontAwesomeIcon icon={faSignOutAlt} className="menu-icon" />
                    <span>Logout</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
