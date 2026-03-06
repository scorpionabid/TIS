interface PerformanceMetric {
  average: number;
  max: number;
  count: number;
  lastRecorded: number;
}

interface PerformanceReport {
  renders: Record<string, PerformanceMetric>;
  bundles: Record<string, PerformanceMetric>;
  api: Record<string, PerformanceMetric>;
  summary: {
    slowRenders: number;
    slowBundles: number;
    slowAPICalls: number;
  };
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: Map<string, number[]> = new Map();
  private isProduction = process.env.NODE_ENV === 'production';

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  // Track component render times
  trackRender(componentName: string, renderTime: number): void {
    if (renderTime > 16.67) { // 60fps threshold
      this.recordMetric(`render.${componentName}`, renderTime);
      
      if (renderTime > 100 && !this.isProduction) {
        console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  // Track bundle loading times
  trackBundleLoad(bundleName: string, loadTime: number): void {
    this.recordMetric(`bundle.${bundleName}`, loadTime);
    
    // Alert for bundles taking >2 seconds (development only)
    if (loadTime > 2000 && !this.isProduction) {
      console.warn(`📦 Slow bundle: ${bundleName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  // Track API response times
  trackAPICall(endpoint: string, responseTime: number): void {
    this.recordMetric(`api.${endpoint}`, responseTime);
    
    if (responseTime > 1000 && !this.isProduction) {
      console.warn(`🌐 Slow API: ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }
  }

  // Track page navigation time
  trackNavigation(route: string, navigationTime: number): void {
    this.recordMetric(`navigation.${route}`, navigationTime);
    
    if (navigationTime > 3000 && !this.isProduction) {
      console.warn(`🧭 Slow navigation: ${route} took ${navigationTime.toFixed(2)}ms`);
    }
  }

  // Track memory usage spikes
  trackMemoryUsage(componentName: string, memoryMB: number): void {
    this.recordMetric(`memory.${componentName}`, memoryMB);
    
    if (memoryMB > 100 && !this.isProduction) {
      console.warn(`💾 High memory usage: ${componentName} using ${memoryMB.toFixed(1)}MB`);
    }
  }

  private recordMetric(key: string, value: number): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const values = this.metrics.get(key)!;
    values.push(value);
    
    // Keep only last 100 measurements for memory efficiency
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get performance report
  getReport(): PerformanceReport {
    const report: PerformanceReport = {
      renders: {},
      bundles: {},
      api: {},
      summary: {
        slowRenders: 0,
        slowBundles: 0,
        slowAPICalls: 0
      }
    };

    this.metrics.forEach((values, key) => {
      const [category, name] = key.split('.');
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const lastRecorded = values[values.length - 1];
      
      const data: PerformanceMetric = { 
        average: Math.round(avg * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: values.length,
        lastRecorded: Math.round(lastRecorded * 100) / 100
      };
      
      switch (category) {
        case 'render':
          report.renders[name] = data;
          if (avg > 16.67) report.summary.slowRenders++;
          break;
        case 'bundle':
          report.bundles[name] = data;
          if (avg > 2000) report.summary.slowBundles++;
          break;
        case 'api':
          report.api[name] = data;
          if (avg > 1000) report.summary.slowAPICalls++;
          break;
      }
    });

    return report;
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
  }

  // Get current metrics count
  getMetricsCount(): number {
    return this.metrics.size;
  }

  // Export metrics to console (dev only)
  logReport(): void {
    if (this.isProduction) return;
    
    const report = this.getReport();
    console.group('📊 Performance Report');
    
    if (Object.keys(report.renders).length > 0) {
      console.group('🎭 Component Renders');
      Object.entries(report.renders).forEach(([name, metric]) => {
        console.log(`${name}: avg ${metric.average}ms, max ${metric.max}ms (${metric.count} samples)`);
      });
      console.groupEnd();
    }

    if (Object.keys(report.bundles).length > 0) {
      console.group('📦 Bundle Loads');
      Object.entries(report.bundles).forEach(([name, metric]) => {
        console.log(`${name}: avg ${metric.average}ms, max ${metric.max}ms (${metric.count} samples)`);
      });
      console.groupEnd();
    }

    if (Object.keys(report.api).length > 0) {
      console.group('🌐 API Calls');
      Object.entries(report.api).forEach(([name, metric]) => {
        console.log(`${name}: avg ${metric.average}ms, max ${metric.max}ms (${metric.count} samples)`);
      });
      console.groupEnd();
    }

    console.log('📈 Summary:', report.summary);
    console.groupEnd();
  }
}

export default PerformanceTracker;