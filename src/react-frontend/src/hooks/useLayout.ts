import { useState, useEffect, createContext, useContext } from 'react';

interface LayoutContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const defaultLayoutContext: LayoutContextType = {
  sidebarCollapsed: false,
  setSidebarCollapsed: (_value: boolean) => {},
  isMobile: false,
  toggleSidebar: () => {},
};

export const LayoutContext = createContext(defaultLayoutContext);

export const useLayout = () => useContext(LayoutContext);

export const useLayoutProvider = (): LayoutContextType => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.innerWidth < 768);
    setIsMobile(window.innerWidth < 768);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed((prev: boolean) => !prev);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse sidebar on mobile
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [sidebarCollapsed]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    toggleSidebar,
  };
};
