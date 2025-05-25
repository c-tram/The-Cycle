import { useState, useEffect, createContext, useContext } from 'react';

interface LayoutContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  isMobile: false,
  toggleSidebar: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export const useLayoutProvider = (): LayoutContextType => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  
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
