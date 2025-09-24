import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';
import { networkActivity } from '../../services/apiService';

// Lightweight route transition detector: shows overlay while location changes & optional min duration
// Shows overlay only if a route change still has pending network after thresholdMs
const RouteTransitionLoader = ({ thresholdMs = 2000, minShowMs = 600 }) => {
  const location = useLocation();
  const previousPath = useRef(location.pathname + location.search);
  const [show, setShow] = useState(false);
  const thresholdTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const active = useRef(false);

  useEffect(() => {
    const current = location.pathname + location.search;
    if (current !== previousPath.current) {
      previousPath.current = current;
      active.current = true;
      // Start threshold timer: only show if still loading after thresholdMs
      thresholdTimerRef.current && clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = setTimeout(() => {
        if (active.current && networkActivity.getPending() > 0) {
          setShow(true);
          hideTimerRef.current && clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => {
            // Auto hide fail-safe after long period even if pending stuck
            setShow(false);
          }, Math.max(thresholdMs + minShowMs, thresholdMs + 1500));
        }
      }, thresholdMs);
    } else {
      // route re-render without path change
      setShow(false);
    }
    return () => {
      thresholdTimerRef.current && clearTimeout(thresholdTimerRef.current);
      hideTimerRef.current && clearTimeout(hideTimerRef.current);
    };
  }, [location, thresholdMs, minShowMs]);

  // Listen to network activity to hide when all requests complete
  useEffect(() => {
    const unsubscribe = networkActivity.subscribe(pending => {
      if (pending === 0) {
        active.current = false;
        // If overlay showing ensure minShowMs already satisfied (we rely on threshold + min) then hide
        if (show) {
          setTimeout(() => setShow(false), 200); // small grace for smooth fade
        } else {
          // ensure pending timers cleared
          thresholdTimerRef.current && clearTimeout(thresholdTimerRef.current);
        }
      }
    });
    return unsubscribe;
  }, [show]);

  if (!show) return null;
  return <LoadingScreen variant="overlay" message="Loading next view..." />;
};

export default RouteTransitionLoader;