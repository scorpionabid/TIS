import { useEffect, useRef, useCallback } from 'react';
import PerformanceTracker from './PerformanceTracker';

// Hook to track component render performance
export const usePerformanceMonitor = (componentName: string) => {
  const tracker = PerformanceTracker.getInstance();
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - renderStartTime.current;
      tracker.trackRender(componentName, renderTime);
    };
  });

  // Track memory usage when component mounts
  useEffect(() => {
    if ('memory' in performance && (performance as any).memory) {
      const memoryMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      tracker.trackMemoryUsage(componentName, memoryMB);
    }
  }, [componentName, tracker]);
};

// Hook to track API call performance
export const useAPIPerformanceTracker = () => {
  const tracker = PerformanceTracker.getInstance();

  const trackAPICall = useCallback((endpoint: string, responseTime: number) => {
    tracker.trackAPICall(endpoint, responseTime);
  }, [tracker]);

  return { trackAPICall };
};

// Hook to track navigation performance
export const useNavigationTracker = () => {
  const tracker = PerformanceTracker.getInstance();
  const navigationStartTime = useRef<number>(0);

  const startNavigation = useCallback(() => {
    navigationStartTime.current = performance.now();
  }, []);

  const endNavigation = useCallback((routeName: string) => {
    if (navigationStartTime.current > 0) {
      const navigationTime = performance.now() - navigationStartTime.current;
      tracker.trackNavigation(routeName, navigationTime);
      navigationStartTime.current = 0;
    }
  }, [tracker]);

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