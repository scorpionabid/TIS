import { useEffect, useRef, useCallback } from 'react';
import PerformanceTracker from './PerformanceTracker';

// Hook to track component render performance - DISABLED FOR SPEED
export const usePerformanceMonitor = (componentName: string) => {
  // No-op for performance - tracking disabled
};

// Hook to track API call performance
export const useAPIPerformanceTracker = () => {
  const tracker = PerformanceTracker.getInstance();

  const trackAPICall = useCallback((endpoint: string, responseTime: number) => {
    tracker.trackAPICall(endpoint, responseTime);
  }, [tracker]);

  return { trackAPICall };
};

// Hook to track navigation performance - DISABLED FOR SPEED
export const useNavigationTracker = () => {
  // No-op functions for performance - tracking disabled
  const startNavigation = useCallback(() => {}, []);
  const endNavigation = useCallback((routeName: string) => {}, []);

  return { startNavigation, endNavigation };
};

// Hook to track bundle loading performance
export const useBundleLoadTracker = () => {
  const tracker = PerformanceTracker.getInstance();

  const trackBundleLoad = useCallback((bundleName: string, loadTime: number) => {
    tracker.trackBundleLoad(bundleName, loadTime);
  }, [tracker]);

  // Track initial bundle loads using PerformanceObserver
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            trackBundleLoad('initial-bundle', navEntry.loadEventEnd - navEntry.loadEventStart);
          }
          
          if (entry.entryType === 'resource' && entry.name.includes('.js')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            const bundleName = entry.name.split('/').pop()?.replace('.js', '') || 'unknown';
            trackBundleLoad(bundleName, resourceEntry.duration);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });

      return () => observer.disconnect();
    }
  }, [trackBundleLoad]);

  return { trackBundleLoad };
};

// Hook to get performance report
export const usePerformanceReport = () => {
  const tracker = PerformanceTracker.getInstance();

  const getReport = useCallback(() => {
    return tracker.getReport();
  }, [tracker]);

  const logReport = useCallback(() => {
    tracker.logReport();
  }, [tracker]);

  const clearMetrics = useCallback(() => {
    tracker.clearMetrics();
  }, [tracker]);

  return { getReport, logReport, clearMetrics };
};