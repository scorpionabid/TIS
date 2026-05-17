/**
 * Performance monitoring and optimization utilities
 * NON-BREAKING - Only for new implementations
 */

import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled = import.meta.env.MODE === 'development' || import.meta.env.VITE_PERFORMANCE_MONITORING === 'true';

  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(name, metric);
  }

  /**
   * End measuring a performance metric
   */
  end(name: string, logResult: boolean = true): number | undefined {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Performance metric '${name}' was not started`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (logResult) {
      logger.debug(`Performance: ${name}`, {
        component: 'Performance',
        data: {
          duration: `${metric.duration.toFixed(2)}ms`,
          metadata: metric.metadata
        }
      });
    }

    this.metrics.delete(name);
    return metric.duration;
  }

  /**
   * Measure the execution time of a function
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure the execution time of an async function
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all active metrics (for debugging)
   */
  getActiveMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component for measuring component render time
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithPerformanceMonitoring = (props: P) => {
    const renderMetricName = `${displayName}_render`;
    
    React.useEffect(() => {
      performanceMonitor.start(renderMetricName);
      return () => {
        performanceMonitor.end(renderMetricName);
      };
    });

    return React.createElement(WrappedComponent, props);
  };

  WithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${displayName})`;
  return WithPerformanceMonitoring;
}

/**
 * Hook for measuring performance in functional components
 */
export function usePerformanceMonitoring(name: string, dependencies?: any[]) {
  React.useEffect(() => {
    performanceMonitor.start(name);
    return () => {
      performanceMonitor.end(name);
    };
  }, dependencies);
}

/**
 * Debounce function with performance tracking
 */
export function performanceDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  name?: string
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      if (name) {
        performanceMonitor.measure(name, () => func(...args));
      } else {
        func(...args);
      }
    }, delay);
  };
}

/**
 * Throttle function with performance tracking
 */
export function performanceThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  name?: string
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      if (name) {
        performanceMonitor.measure(name, () => func(...args));
      } else {
        func(...args);
      }
    }
  };
}

/**
 * Memory usage monitoring (development only)
 */
export function logMemoryUsage(context?: string): void {
  if (import.meta.env.MODE !== 'development') return;

  if ('memory' in performance) {
    const memory = (performance as any).memory;
    logger.debug(`Memory Usage${context ? ` (${context})` : ''}`, {
      component: 'Performance',
      data: {
        usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      }
    });
  }
}

// Export convenience functions
export const startTiming = performanceMonitor.start.bind(performanceMonitor);
export const endTiming = performanceMonitor.end.bind(performanceMonitor);
export const measureFunction = performanceMonitor.measure.bind(performanceMonitor);
export const measureAsync = performanceMonitor.measureAsync.bind(performanceMonitor);