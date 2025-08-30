/**
 * Advanced Error Tracking System
 * 
 * Comprehensive error tracking and reporting system for production monitoring.
 * Integrates with performance monitoring and provides detailed error analytics.
 */

import { performanceMonitor } from '@/utils/performanceMonitor';
import { cacheService } from '@/services/CacheService';

interface ErrorReport {
  id: string;
  timestamp: string;
  type: 'javascript' | 'react' | 'network' | 'permission' | 'cache' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  breadcrumbs: Breadcrumb[];
  metadata: Record<string, any>;
  fingerprint: string;
}

interface Breadcrumb {
  timestamp: string;
  category: 'navigation' | 'action' | 'api' | 'ui' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalInfo?: Record<string, any>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private sessionId: string;
  private userId?: string;
  private errorBuffer: ErrorReport[] = [];
  private maxBufferSize = 100;
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.setupPerformanceObserver();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Enable or disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`🔍 Error tracking ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set current user context
   */
  setUser(userId: string, userData?: Record<string, any>): void {
    this.userId = userId;
    this.addBreadcrumb({
      category: 'action',
      message: 'User context updated',
      level: 'info',
      data: { userId, ...userData }
    });
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString()
    };

    this.breadcrumbs.push(fullBreadcrumb);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    console.debug('🍞 Breadcrumb:', fullBreadcrumb);
  }

  /**
   * Track JavaScript errors
   */
  trackError(
    error: Error,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    if (!this.isEnabled) return '';

    const errorId = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error, context);

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type: 'javascript',
      severity,
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      metadata: {
        component: context.component,
        action: context.action,
        ...context.additionalInfo
      },
      fingerprint
    };

    this.bufferError(errorReport);
    this.logError(errorReport);

    // Add error breadcrumb
    this.addBreadcrumb({
      category: 'error',
      message: `JavaScript error: ${error.message}`,
      level: 'error',
      data: { errorId, component: context.component }
    });

    return errorId;
  }

  /**
   * Track React component errors
   */
  trackReactError(
    error: Error,
    errorInfo: React.ErrorInfo,
    context: ErrorContext = {}
  ): string {
    if (!this.isEnabled) return '';

    const errorId = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error, { ...context, componentStack: errorInfo.componentStack });

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type: 'react',
      severity: 'high',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      metadata: {
        component: context.component,
        ...context.additionalInfo
      },
      fingerprint
    };

    this.bufferError(errorReport);
    this.logError(errorReport);

    // Add error breadcrumb
    this.addBreadcrumb({
      category: 'error',
      message: `React error: ${error.message}`,
      level: 'error',
      data: { errorId, component: context.component }
    });

    return errorId;
  }

  /**
   * Track network errors
   */
  trackNetworkError(
    url: string,
    status: number,
    statusText: string,
    context: ErrorContext = {}
  ): string {
    if (!this.isEnabled) return '';

    const errorId = this.generateErrorId();
    const error = new Error(`Network error: ${status} ${statusText} for ${url}`);

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type: 'network',
      severity: status >= 500 ? 'high' : 'medium',
      message: error.message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      metadata: {
        networkUrl: url,
        status,
        statusText,
        ...context.additionalInfo
      },
      fingerprint: this.generateFingerprint(error, { url, status })
    };

    this.bufferError(errorReport);
    this.logError(errorReport);

    // Add network error breadcrumb
    this.addBreadcrumb({
      category: 'api',
      message: `Network error: ${status} ${url}`,
      level: status >= 500 ? 'error' : 'warning',
      data: { errorId, status, url }
    });

    return errorId;
  }

  /**
   * Track performance issues
   */
  trackPerformanceIssue(
    type: string,
    duration: number,
    threshold: number,
    context: ErrorContext = {}
  ): string {
    if (!this.isEnabled || duration < threshold) return '';

    const errorId = this.generateErrorId();
    const error = new Error(`Performance issue: ${type} took ${duration}ms (threshold: ${threshold}ms)`);

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type: 'performance',
      severity: duration > threshold * 2 ? 'high' : 'medium',
      message: error.message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      metadata: {
        performanceType: type,
        duration,
        threshold,
        ...context.additionalInfo
      },
      fingerprint: this.generateFingerprint(error, { type, duration: Math.floor(duration / 100) * 100 })
    };

    this.bufferError(errorReport);
    this.logError(errorReport);

    return errorId;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
    topErrors: { fingerprint: string; count: number; lastSeen: string }[];
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const fingerprintCounts: Record<string, { count: number; lastSeen: string }> = {};

    this.errorBuffer.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      
      if (!fingerprintCounts[error.fingerprint]) {
        fingerprintCounts[error.fingerprint] = { count: 0, lastSeen: error.timestamp };
      }
      fingerprintCounts[error.fingerprint].count++;
      fingerprintCounts[error.fingerprint].lastSeen = error.timestamp;
    });

    const topErrors = Object.entries(fingerprintCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([fingerprint, data]) => ({ fingerprint, ...data }));

    return {
      totalErrors: this.errorBuffer.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorBuffer.slice(-20),
      topErrors
    };
  }

  /**
   * Clear error buffer
   */
  clearErrors(): void {
    this.errorBuffer = [];
    console.log('🗑️ Error buffer cleared');
  }

  /**
   * Export error data
   */
  exportErrors(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      breadcrumbs: this.breadcrumbs,
      errors: this.errorBuffer,
      stats: this.getErrorStats()
    }, null, 2);
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        new Error(`Unhandled promise rejection: ${event.reason}`),
        { component: 'global', action: 'promise_rejection' },
        'high'
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      if (event.error) {
        this.trackError(
          event.error,
          { 
            component: 'global', 
            action: 'javascript_error',
            additionalInfo: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          },
          'high'
        );
      }
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.trackError(
          new Error(`Resource loading failed: ${target.tagName}`),
          {
            component: 'global',
            action: 'resource_load_error',
            additionalInfo: {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href
            }
          },
          'medium'
        );
      }
    }, true);
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Track slow page loads
            if (navEntry.loadEventEnd - navEntry.navigationStart > 3000) {
              this.trackPerformanceIssue(
                'page_load',
                navEntry.loadEventEnd - navEntry.navigationStart,
                3000,
                { additionalInfo: { url: navEntry.name } }
              );
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['navigation', 'paint'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  private bufferError(errorReport: ErrorReport): void {
    this.errorBuffer.push(errorReport);

    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
    }
  }

  private logError(errorReport: ErrorReport): void {
    const logMethod = errorReport.severity === 'critical' || errorReport.severity === 'high' ? 'error' : 'warn';
    
    console[logMethod](`🚨 Error [${errorReport.severity.toUpperCase()}]:`, {
      id: errorReport.id,
      type: errorReport.type,
      message: errorReport.message,
      component: errorReport.metadata.component,
      fingerprint: errorReport.fingerprint
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateFingerprint(error: Error, context: any): string {
    const key = JSON.stringify({
      message: error.message,
      stack: error.stack?.split('\n')[0], // First line of stack
      component: context.component,
      type: context.type
    });
    
    return btoa(key).substring(0, 16);
  }
}

// Singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Integration with existing error handling
export const trackComponentError = (error: Error, errorInfo: React.ErrorInfo, context?: ErrorContext) => {
  return errorTracker.trackReactError(error, errorInfo, context);
};

export const trackNetworkError = (url: string, status: number, statusText: string, context?: ErrorContext) => {
  return errorTracker.trackNetworkError(url, status, statusText, context);
};

export const trackJSError = (error: Error, context?: ErrorContext) => {
  return errorTracker.trackError(error, context);
};

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => {
  errorTracker.addBreadcrumb(breadcrumb);
};

// Development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).__errorTracker = {
    getStats: () => errorTracker.getErrorStats(),
    export: () => errorTracker.exportErrors(),
    clear: () => errorTracker.clearErrors(),
    trackTest: () => errorTracker.trackError(new Error('Test error'), { component: 'test' })
  };

  console.log('🔧 Error tracker controls available via window.__errorTracker');
}

export default errorTracker;