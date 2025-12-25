/**
 * Debug Logger Utility
 * Centralized logging for permission debugging
 * Logs are stored in localStorage and can be viewed in /debug page
 */

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  data?: any;
}

const MAX_LOGS = 500; // Keep last 500 logs
const STORAGE_KEY = 'atis_debug_logs';

class DebugLogger {
  private enabled: boolean;

  constructor() {
    // Enable debug mode in development or if explicitly enabled
    this.enabled = import.meta.env.DEV || localStorage.getItem('debug_mode') === 'true';
  }

  private addLog(level: DebugLog['level'], category: string, message: string, data?: any) {
    if (!this.enabled) return;

    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to avoid references
    };

    try {
      const existingLogs = this.getLogs();
      const newLogs = [...existingLogs, log].slice(-MAX_LOGS); // Keep only last MAX_LOGS
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));

      // Also log to console with emoji prefix
      const emoji = { info: '🔍', warn: '⚠️', error: '❌', success: '✅' }[level];
      console.log(`${emoji} [${category}] ${message}`, data || '');
    } catch (error) {
      console.error('Failed to write debug log:', error);
    }
  }

  info(category: string, message: string, data?: any) {
    this.addLog('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.addLog('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.addLog('error', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.addLog('success', category, message, data);
  }

  getLogs(): DebugLog[] {
    try {
      const logs = localStorage.getItem(STORAGE_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem(STORAGE_KEY);
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('debug_mode', 'true');
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('debug_mode');
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const debugLogger = new DebugLogger();
export type { DebugLog };
