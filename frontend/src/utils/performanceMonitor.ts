/**
 * Performance Monitoring Utilities
 * 
 * Comprehensive performance tracking system for the application.
 * Monitors component render times, navigation performance, and role-based operations.
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface NavigationMetric extends PerformanceMetric {
  menuGroups: number;
  totalItems: number;
  cacheHit: boolean;
  userRole: string;
}

interface ComponentMetric extends PerformanceMetric {
  componentName: string;
  renderCount: number;
  props?: Record<string, any>;
}

interface RoleCheckMetric extends PerformanceMetric {
  roleCheckType: string;
  rolesChecked: string[];
  permissionsChecked: string[];
  result: boolean;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      console.log('🚀 Performance monitoring enabled');
    } else {
      console.log('🛑 Performance monitoring disabled');
    }
  }

  /**
   * Record a navigation performance metric
   */
  recordNavigation(metric: Omit<NavigationMetric, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const navigationMetric: NavigationMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    this.addMetric(navigationMetric);

    // Log slow navigation generation
    if (metric.duration > 15) {
      console.warn('🐌 Slow navigation detected:', {
        duration: `${metric.duration}ms`,
        role: metric.userRole,
        menuGroups: metric.menuGroups,
        totalItems: metric.totalItems,
        cacheHit: metric.cacheHit
      });
    }
  }

  /**
   * Record a component render performance metric
   */
  recordComponentRender(metric: Omit<ComponentMetric, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const componentMetric: ComponentMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    this.addMetric(componentMetric);

    // Log slow component renders
    if (metric.duration > 20) {
      console.warn('🐌 Slow component render:', {
        component: metric.componentName,
        duration: `${metric.duration}ms`,
        renderCount: metric.renderCount
      });
    }
  }

  /**
   * Record a role check performance metric
   */
  recordRoleCheck(metric: Omit<RoleCheckMetric, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const roleMetric: RoleCheckMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    this.addMetric(roleMetric);

    // Log slow role checks
    if (metric.duration > 5) {
      console.warn('🐌 Slow role check:', {
        type: metric.roleCheckType,
        duration: `${metric.duration}ms`,
        roles: metric.rolesChecked,
        permissions: metric.permissionsChecked
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    total: number;
    navigation: NavigationMetric[];
    components: ComponentMetric[];
    roleChecks: RoleCheckMetric[];
    averages: {
      navigation: number;
      components: number;
      roleChecks: number;
    };
  } {
    const navigationMetrics = this.metrics.filter(m => m.name.includes('navigation')) as NavigationMetric[];
    const componentMetrics = this.metrics.filter(m => m.name.includes('component')) as ComponentMetric[];
    const roleCheckMetrics = this.metrics.filter(m => m.name.includes('role')) as RoleCheckMetric[];

    return {
      total: this.metrics.length,
      navigation: navigationMetrics,
      components: componentMetrics,
      roleChecks: roleCheckMetrics,
      averages: {
        navigation: this.calculateAverage(navigationMetrics),
        components: this.calculateAverage(componentMetrics),
        roleChecks: this.calculateAverage(roleCheckMetrics)
      }
    };
  }

  /**
   * Get slow operations report
   */
  getSlowOperationsReport(thresholds = { navigation: 15, components: 20, roleChecks: 5 }): {
    slowNavigation: NavigationMetric[];
    slowComponents: ComponentMetric[];
    slowRoleChecks: RoleCheckMetric[];
  } {
    const stats = this.getStats();

    return {
      slowNavigation: stats.navigation.filter(m => m.duration > thresholds.navigation),
      slowComponents: stats.components.filter(m => m.duration > thresholds.components),
      slowRoleChecks: stats.roleChecks.filter(m => m.duration > thresholds.roleChecks)
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('📊 Performance metrics cleared');
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      stats: this.getStats(),
      slowOperations: this.getSlowOperationsReport(),
      metrics: this.metrics
    }, null, 2);
  }

  /**
   * Generate performance summary
   */
  generateSummary(): void {
    const stats = this.getStats();
    const slowOps = this.getSlowOperationsReport();

    console.group('📊 Performance Summary');
    console.log(`Total metrics recorded: ${stats.total}`);
    console.log('Average durations:');
    console.log(`  Navigation: ${stats.averages.navigation.toFixed(2)}ms`);
    console.log(`  Components: ${stats.averages.components.toFixed(2)}ms`);
    console.log(`  Role Checks: ${stats.averages.roleChecks.toFixed(2)}ms`);
    
    if (slowOps.slowNavigation.length > 0) {
      console.warn(`⚠️ ${slowOps.slowNavigation.length} slow navigation operations detected`);
    }
    if (slowOps.slowComponents.length > 0) {
      console.warn(`⚠️ ${slowOps.slowComponents.length} slow component renders detected`);
    }
    if (slowOps.slowRoleChecks.length > 0) {
      console.warn(`⚠️ ${slowOps.slowRoleChecks.length} slow role checks detected`);
    }
    console.groupEnd();
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / metrics.length;
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Higher-order component for monitoring component render performance
 */
export function withPerformanceMonitoring<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
) {
  return React.memo((props: T) => {
    const startTime = performance.now();
    const renderCount = React.useRef(0);

    React.useEffect(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      renderCount.current += 1;

      performanceMonitor.recordComponentRender({
        name: `component-render-${componentName || WrappedComponent.name}`,
        componentName: componentName || WrappedComponent.name || 'Unknown',
        duration,
        renderCount: renderCount.current,
        props: Object.keys(props).length > 0 ? { propsCount: Object.keys(props).length } : undefined
      });
    });

    return React.createElement(WrappedComponent, props);
  });
}

/**
 * Hook for measuring operation performance
 */
export function usePerformanceMeasurement() {
  const measureOperation = React.useCallback((
    operationName: string,
    operation: () => any,
    metadata?: Record<string, any>
  ) => {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceMonitor.recordComponentRender({
      name: `operation-${operationName}`,
      componentName: operationName,
      duration,
      renderCount: 1,
      props: metadata
    });

    return result;
  }, []);

  return { measureOperation };
}

// Development-only performance monitoring controls
if (process.env.NODE_ENV === 'development') {
  // Add global controls for development
  (window as any).__performanceMonitor = {
    getStats: () => performanceMonitor.getStats(),
    getSummary: () => performanceMonitor.generateSummary(),
    export: () => performanceMonitor.exportMetrics(),
    clear: () => performanceMonitor.clearMetrics(),
    enable: () => performanceMonitor.setEnabled(true),
    disable: () => performanceMonitor.setEnabled(false),
    getSlowOps: () => performanceMonitor.getSlowOperationsReport()
  };

  console.log('🔧 Performance monitor controls available via window.__performanceMonitor');
}

export default performanceMonitor;