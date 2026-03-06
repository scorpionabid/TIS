/**
 * Production-optimized logger that completely removes console statements in production builds
 * Uses compile-time dead code elimination for zero runtime overhead
 */

// Environment flags
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Performance monitoring for development
interface PerformanceContext {
  component?: string;
  action?: string;
  startTime?: number;
  data?: any;
}

class ProductionLogger {
  // In production, these methods become no-ops and get eliminated by bundler
  log(message: string, data?: any): void {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, data);
    }
  }

  error(message: string, error?: any, data?: any): void {
    if (isDevelopment) {
      console.error(`❌ ${message}`, error, data);
    } else if (isProduction && error) {
      // In production, only log critical errors to monitoring service
      this.sendToErrorTracking(message, error, data);
    }
  }

  warn(message: string, data?: any): void {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data);
    }
  }

  debug(message: string, data?: any): void {
    if (isDevelopment) {
      console.debug(`🐛 ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    if (isDevelopment) {
      console.info(`ℹ️ ${message}`, data);
    }
  }

  // Performance monitoring - only in development
  performance(message: string, context?: PerformanceContext): void {
    if (isDevelopment && context?.startTime) {
      const duration = performance.now() - context.startTime;
      console.log(`⏱️ ${message} took ${duration.toFixed(2)}ms`, context);
    }
  }

  // API call logging - development only
  apiCall(method: string, endpoint: string, data?: any): void {
    if (isDevelopment) {
      console.log(`🌐 API ${method} ${endpoint}`, data ? { data } : '');
    }
  }

  // API response logging - development only
  apiResponse(method: string, endpoint: string, status: number, data?: any): void {
    if (isDevelopment) {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${emoji} API ${method} ${endpoint} - ${status}`, data);
    }
  }

  // Auth-specific logging
  authAction(action: string, data?: any): void {
    if (isDevelopment) {
      console.log(`🔐 Auth: ${action}`, data);
    }
  }

  // Route change logging
  routeChange(from: string, to: string, userRole?: string): void {
    if (isDevelopment) {
      console.log(`🧭 Route: ${from} → ${to}`, { userRole });
    }
  }

  // Component lifecycle logging
  componentMount(component: string, props?: any): void {
    if (isDevelopment) {
      console.log(`🔄 Mount: ${component}`, props);
    }
  }

  componentUnmount(component: string): void {
    if (isDevelopment) {
      console.log(`🗑️ Unmount: ${component}`);
    }
  }

  // Error tracking for production (optional)
  private sendToErrorTracking(message: string, error: any, data?: any): void {
    // In a real app, send to error tracking service like Sentry
    // For now, we'll skip this to avoid external dependencies
    if (typeof window !== 'undefined' && (window as any).__errorTracker) {
      (window as any).__errorTracker.captureError(error, { message, data });
    }
  }

  // Cache operations logging
  cacheHit(key: string, size?: number): void {
    if (isDevelopment) {
      console.log(`💾 Cache hit: ${key}`, size ? `(${size} bytes)` : '');
    }
  }

  cacheMiss(key: string): void {
    if (isDevelopment) {
      console.log(`💔 Cache miss: ${key}`);
    }
  }

  cacheSet(key: string, ttl?: number): void {
    if (isDevelopment) {
      console.log(`💾 Cache set: ${key}`, ttl ? `(TTL: ${ttl}ms)` : '');
    }
  }

  // Memory and performance monitoring
  memoryUsage(): void {
    if (isDevelopment && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log('📊 Memory usage:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
      });
    }
  }
}

// Create singleton instance
export const prodLogger = new ProductionLogger();

// Convenience exports for easier migration
export const logDev = prodLogger.log.bind(prodLogger);
export const logError = prodLogger.error.bind(prodLogger);
export const logWarn = prodLogger.warn.bind(prodLogger);
export const logDebug = prodLogger.debug.bind(prodLogger);
export const logInfo = prodLogger.info.bind(prodLogger);

// Specialized logging functions
export const logApiCall = prodLogger.apiCall.bind(prodLogger);
export const logApiResponse = prodLogger.apiResponse.bind(prodLogger);
export const logAuth = prodLogger.authAction.bind(prodLogger);
export const logRoute = prodLogger.routeChange.bind(prodLogger);
export const logPerformance = prodLogger.performance.bind(prodLogger);

// Component lifecycle helpers
export const logMount = prodLogger.componentMount.bind(prodLogger);
export const logUnmount = prodLogger.componentUnmount.bind(prodLogger);

// Cache logging helpers
export const logCacheHit = prodLogger.cacheHit.bind(prodLogger);
export const logCacheMiss = prodLogger.cacheMiss.bind(prodLogger);
export const logCacheSet = prodLogger.cacheSet.bind(prodLogger);

// Performance helper function
export const measurePerformance = <T>(
  name: string, 
  fn: () => T, 
  context?: PerformanceContext
): T => {
  if (!isDevelopment) {
    return fn();
  }
  
  const startTime = performance.now();
  const result = fn();
  prodLogger.performance(name, { ...context, startTime });
  return result;
};

// Async performance helper
export const measurePerformanceAsync = async <T>(
  name: string, 
  fn: () => Promise<T>, 
  context?: PerformanceContext
): Promise<T> => {
  if (!isDevelopment) {
    return fn();
  }
  
  const startTime = performance.now();
  const result = await fn();
  prodLogger.performance(name, { ...context, startTime });
  return result;
};

// Default export
export default prodLogger;