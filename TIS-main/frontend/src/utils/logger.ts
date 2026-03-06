/**
 * Production-safe logging utility
 * Only logs in development mode, silent in production
 */

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'info';

interface LogContext {
  component?: string;
  action?: string;
  data?: any;
  timestamp?: string;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isEnabled = this.isDevelopment || import.meta.env.VITE_ENABLE_LOGGING === 'true';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = context?.component ? `[${context.component}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`;
  }

  log(message: string, context?: LogContext): void {
    if (!this.isEnabled) return;
    console.log(this.formatMessage('log', message, context), context?.data);
  }

  error(message: string, error?: any, context?: LogContext): void {
    if (!this.isEnabled) return;
    console.error(this.formatMessage('error', message, context), error, context?.data);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.isEnabled) return;
    console.warn(this.formatMessage('warn', message, context), context?.data);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isEnabled || !this.isDevelopment) return;
    console.debug(this.formatMessage('debug', message, context), context?.data);
  }

  info(message: string, context?: LogContext): void {
    if (!this.isEnabled) return;
    console.info(this.formatMessage('info', message, context), context?.data);
  }

  // Service-specific helpers
  apiCall(endpoint: string, method: string, data?: any): void {
    this.debug(`API ${method} ${endpoint}`, { 
      component: 'API',
      action: method,
      data 
    });
  }

  serviceResult(service: string, method: string, result: any): void {
    this.debug(`${service} ${method} result`, {
      component: service,
      action: method,
      data: result
    });
  }

  authAction(action: string, data?: any): void {
    this.info(`Auth: ${action}`, {
      component: 'Auth',
      action,
      data
    });
  }

  routeChange(path: string, userRole?: string): void {
    this.debug(`Route change: ${path}`, {
      component: 'Router',
      action: 'navigate',
      data: { path, userRole }
    });
  }
}

export const logger = new Logger();

// Backward compatibility exports
export const log = logger.log.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logDebug = logger.debug.bind(logger);