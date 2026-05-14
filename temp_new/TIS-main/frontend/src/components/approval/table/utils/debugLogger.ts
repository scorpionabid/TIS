/**
 * Centralized Debug Logger for Approval Table
 *
 * This utility provides consistent, conditional logging for development
 * All logs are automatically disabled in production builds
 */

interface LogContext {
  component?: string;
  action?: string;
  data?: any;
  [key: string]: any;
}

class ApprovalTableLogger {
  private isDev = process.env.NODE_ENV === 'development';
  private isEnabled = this.isDev; // Can be controlled by feature flags in future

  private formatMessage(prefix: string, message: string, context?: LogContext): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const contextStr = context ? JSON.stringify(context, null, 2) : '';

    console.log(`[${timestamp}] ${prefix} ${message}`);
    if (contextStr) {
      console.log(contextStr);
    }
  }

  // Table state logging
  checkbox(message: string, context?: LogContext) {
    this.formatMessage('☑️ [CHECKBOX]', message, context);
  }

  pagination(message: string, context?: LogContext) {
    this.formatMessage('📄 [PAGINATION]', message, context);
  }

  sort(message: string, context?: LogContext) {
    this.formatMessage('🔄 [SORT]', message, context);
  }

  // Bulk actions logging
  bulkAction(message: string, context?: LogContext) {
    this.formatMessage('🚀 [BULK]', message, context);
  }

  bulkValidation(message: string, context?: LogContext) {
    this.formatMessage('🔍 [VALIDATION]', message, context);
  }

  // Individual actions logging
  individualAction(message: string, context?: LogContext) {
    this.formatMessage('🎯 [INDIVIDUAL]', message, context);
  }

  // Modal logging
  modal(message: string, context?: LogContext) {
    this.formatMessage('📝 [MODAL]', message, context);
  }

  // Export logging
  export(message: string, context?: LogContext) {
    this.formatMessage('📤 [EXPORT]', message, context);
  }

  // Error logging (always enabled)
  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error || '');
  }

  // Success logging
  success(message: string, context?: LogContext) {
    this.formatMessage('✅ [SUCCESS]', message, context);
  }

  // Warning logging
  warning(message: string, context?: LogContext) {
    this.formatMessage('⚠️ [WARNING]', message, context);
  }
}

// Export singleton instance
export const debugLogger = new ApprovalTableLogger();

// Export utility function for conditional logging
export const isDevelopment = process.env.NODE_ENV === 'development';