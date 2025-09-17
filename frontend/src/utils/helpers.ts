/**
 * Common helper utilities
 * General purpose utilities used across the application
 */

import { logger } from './logger';
import { formatText } from './formatters';

/**
 * Array manipulation utilities
 */
export const arrayHelpers = {
  /**
   * Remove item from array by id
   */
  removeById: <T extends { id: number | string }>(array: T[], id: number | string): T[] => {
    return array.filter(item => item.id !== id);
  },

  /**
   * Update item in array by id
   */
  updateById: <T extends { id: number | string }>(array: T[], id: number | string, updates: Partial<T>): T[] => {
    return array.map(item => item.id === id ? { ...item, ...updates } : item);
  },

  /**
   * Find item by id
   */
  findById: <T extends { id: number | string }>(array: T[], id: number | string): T | undefined => {
    return array.find(item => item.id === id);
  },

  /**
   * Group array by key
   */
  groupBy: <T extends Record<string, unknown>>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Sort array by multiple keys
   */
  sortBy: <T extends Record<string, any>>(array: T[], ...keys: (keyof T)[]): T[] => {
    return [...array].sort((a, b) => {
      for (const key of keys) {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  },

  /**
   * Remove duplicates by key
   */
  uniqueBy: <T extends Record<string, any>>(array: T[], key: keyof T): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const k = item[key];
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Move item in array
   */
  move: <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
    const result = [...array];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
  }
};

/**
 * Object manipulation utilities
 */
export const objectHelpers = {
  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => objectHelpers.deepClone(item)) as unknown as T;
    if (typeof obj === "object") {
      const copy = {} as T;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          copy[key] = objectHelpers.deepClone(obj[key]);
        }
      }
      return copy;
    }
    return obj;
  },

  /**
   * Pick specific keys from object
   */
  pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  },

  /**
   * Omit specific keys from object
   */
  omit: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  },

  /**
   * Check if object is empty
   */
  isEmpty: (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
  },

  /**
   * Flatten nested object
   */
  flatten: (obj: Record<string, any>, prefix = ''): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, objectHelpers.flatten(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    
    return result;
  }
};

/**
 * String manipulation utilities
 */
export const stringHelpers = {
  /**
   * Generate random string
   */
  random: (length: number = 10, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  },

  /**
   * Convert to kebab-case
   */
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[_\s]+/g, '-')
      .toLowerCase();
  },

  /**
   * Convert to camelCase
   */
  camelCase: (str: string): string => {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^[A-Z]/, char => char.toLowerCase());
  },

  /**
   * Convert to PascalCase
   */
  pascalCase: (str: string): string => {
    const camelCased = stringHelpers.camelCase(str);
    return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
  },

  /**
   * Escape HTML
   */
  escapeHtml: (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Strip HTML tags
   */
  stripHtml: (str: string): string => {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  },

  /**
   * Generate slug from string
   */
  slug: (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove consecutive hyphens
  }
};

/**
 * Validation utilities
 */
export const validationHelpers = {
  /**
   * Check if value is not null, undefined, or empty string
   */
  isPresent: (value: unknown): boolean => {
    return value !== null && value !== undefined && value !== '';
  },

  /**
   * Check if string has minimum length
   */
  minLength: (value: string, min: number): boolean => {
    return validationHelpers.isPresent(value) && value.length >= min;
  },

  /**
   * Check if string has maximum length
   */
  maxLength: (value: string, max: number): boolean => {
    return !validationHelpers.isPresent(value) || value.length <= max;
  },

  /**
   * Check if number is within range
   */
  inRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  /**
   * Check if array has minimum length
   */
  minArrayLength: (arr: unknown[], min: number): boolean => {
    return Array.isArray(arr) && arr.length >= min;
  }
};

/**
 * File and URL utilities
 */
export const fileHelpers = {
  /**
   * Get file extension
   */
  getExtension: (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  /**
   * Format file size
   */
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if file type is image
   */
  isImage: (filename: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const ext = fileHelpers.getExtension(filename).toLowerCase();
    return imageExtensions.includes(ext);
  },

  /**
   * Check if file type is document
   */
  isDocument: (filename: string): boolean => {
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    const ext = fileHelpers.getExtension(filename).toLowerCase();
    return docExtensions.includes(ext);
  }
};

/**
 * URL utilities
 */
export const urlHelpers = {
  /**
   * Build URL with query parameters
   */
  buildUrl: (baseUrl: string, params: Record<string, any> = {}): string => {
    const url = new URL(baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
    
    return url.toString();
  },

  /**
   * Parse query string to object
   */
  parseQuery: (queryString: string): Record<string, string> => {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  },

  /**
   * Get domain from URL
   */
  getDomain: (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch (error) {
      logger.warn('Invalid URL provided to getDomain', null, {
        component: 'urlHelpers',
        data: { url }
      });
      return '';
    }
  }
};

/**
 * Async utilities
 */
export const asyncHelpers = {
  /**
   * Delay execution
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) break;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt} failed, retrying in ${delay}ms`, error, {
          component: 'asyncHelpers',
          action: 'retry',
          data: { attempt, maxAttempts, delay }
        });
        
        await asyncHelpers.delay(delay);
      }
    }
    
    throw lastError!;
  },

  /**
   * Debounce function calls
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Throttle function calls
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastExecTime >= delay) {
        func(...args);
        lastExecTime = now;
      }
    };
  }
};

/**
 * Local storage utilities with error handling
 */
export const storageHelpers = {
  /**
   * Get item from localStorage
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      logger.warn('localStorage get error', error, {
        component: 'storageHelpers',
        action: 'get',
        data: { key }
      });
      return defaultValue || null;
    }
  },

  /**
   * Set item in localStorage
   */
  set: (key: string, value: unknown): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn('localStorage set error', error, {
        component: 'storageHelpers',
        action: 'set',
        data: { key }
      });
      return false;
    }
  },

  /**
   * Remove item from localStorage
   */
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.warn('localStorage remove error', error, {
        component: 'storageHelpers',
        action: 'remove',
        data: { key }
      });
      return false;
    }
  },

  /**
   * Clear all localStorage
   */
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.warn('localStorage clear error', error, {
        component: 'storageHelpers',
        action: 'clear'
      });
      return false;
    }
  }
};