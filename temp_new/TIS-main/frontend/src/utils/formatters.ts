/**
 * Centralized formatting utilities
 * Provides consistent data formatting across the application
 */

import { logger } from './logger';

/**
 * Date formatting utilities
 */
export const formatDate = {
  /**
   * Format date to DD.MM.YYYY format
   */
  short: (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('az-AZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      logger.warn('Date formatting error', null, {
        component: 'formatters',
        action: 'formatDate.short',
        data: { date }
      });
      return '';
    }
  },

  /**
   * Format date to DD.MM.YYYY HH:mm format
   */
  long: (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('az-AZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      logger.warn('Date formatting error', null, {
        component: 'formatters',
        action: 'formatDate.long',
        data: { date }
      });
      return '';
    }
  },

  /**
   * Format date to relative time (e.g., "2 gün əvvəl")
   */
  relative: (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      
      const now = new Date();
      const diffInMs = now.getTime() - d.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Bu gün';
      if (diffInDays === 1) return 'Dünən';
      if (diffInDays < 7) return `${diffInDays} gün əvvəl`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} həftə əvvəl`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} ay əvvəl`;
      return `${Math.floor(diffInDays / 365)} il əvvəl`;
    } catch (error) {
      logger.warn('Date formatting error', null, {
        component: 'formatters',
        action: 'formatDate.relative',
        data: { date }
      });
      return '';
    }
  },

  /**
   * Format date for input[type="date"] (YYYY-MM-DD)
   */
  forInput: (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      
      return d.toISOString().split('T')[0];
    } catch (error) {
      logger.warn('Date formatting error', null, {
        component: 'formatters',
        action: 'formatDate.forInput',
        data: { date }
      });
      return '';
    }
  }
};

/**
 * Number formatting utilities
 */
export const formatNumber = {
  /**
   * Format currency with AZN symbol
   */
  currency: (amount: number | string | null | undefined): string => {
    if (amount === null || amount === undefined) return '';
    
    try {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return '';
      
      return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        minimumFractionDigits: 2,
      }).format(num);
    } catch (error) {
      logger.warn('Number formatting error', null, {
        component: 'formatters',
        action: 'formatNumber.currency',
        data: { amount }
      });
      return '';
    }
  },

  /**
   * Format number with thousands separator
   */
  thousands: (num: number | string | null | undefined): string => {
    if (num === null || num === undefined) return '';
    
    try {
      const number = typeof num === 'string' ? parseFloat(num) : num;
      if (isNaN(number)) return '';
      
      return new Intl.NumberFormat('az-AZ').format(number);
    } catch (error) {
      logger.warn('Number formatting error', null, {
        component: 'formatters',
        action: 'formatNumber.thousands',
        data: { num }
      });
      return '';
    }
  },

  /**
   * Format decimal number with specified precision
   */
  decimal: (num: number | string | null | undefined, precision: number = 2): string => {
    if (num === null || num === undefined) return '';
    
    try {
      const number = typeof num === 'string' ? parseFloat(num) : num;
      if (isNaN(number)) return '';
      
      return number.toFixed(precision);
    } catch (error) {
      logger.warn('Number formatting error', null, {
        component: 'formatters',
        action: 'formatNumber.decimal',
        data: { num, precision }
      });
      return '';
    }
  },

  /**
   * Format percentage
   */
  percentage: (num: number | string | null | undefined, precision: number = 1): string => {
    if (num === null || num === undefined) return '';
    
    try {
      const number = typeof num === 'string' ? parseFloat(num) : num;
      if (isNaN(number)) return '';
      
      return `${(number * 100).toFixed(precision)}%`;
    } catch (error) {
      logger.warn('Number formatting error', null, {
        component: 'formatters',
        action: 'formatNumber.percentage',
        data: { num, precision }
      });
      return '';
    }
  }
};

/**
 * Text formatting utilities
 */
export const formatText = {
  /**
   * Format full name from first_name, last_name, patronymic
   */
  fullName: (firstName: string = '', lastName: string = '', patronymic?: string): string => {
    const parts = [firstName, lastName, patronymic].filter(part => part && part.trim());
    return parts.join(' ').trim() || 'İsimsiz';
  },

  /**
   * Format initials from name
   */
  initials: (firstName: string = '', lastName: string = ''): string => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return (first + last) || '??';
  },

  /**
   * Format phone number
   */
  phone: (phone: string | null | undefined): string => {
    if (!phone) return '';
    
    try {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, '');
      
      // If starts with 994, format as +994 XX XXX XX XX
      if (digits.startsWith('994') && digits.length === 12) {
        return `+994 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
      }
      
      // If starts with 0 and has 10 digits, format as 0XX XXX XX XX
      if (digits.startsWith('0') && digits.length === 10) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
      }
      
      // Return original if doesn't match expected patterns
      return phone;
    } catch (error) {
      logger.warn('Phone formatting error', null, {
        component: 'formatters',
        action: 'formatText.phone',
        data: { phone }
      });
      return phone;
    }
  },

  /**
   * Capitalize first letter of each word
   */
  titleCase: (text: string | null | undefined): string => {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Truncate text with ellipsis
   */
  truncate: (text: string | null | undefined, length: number = 50): string => {
    if (!text) return '';
    if (text.length <= length) return text;
    
    return text.substring(0, length).trim() + '...';
  },

  /**
   * Format UTIS code
   */
  utisCode: (code: string | number | null | undefined): string => {
    if (!code) return '';
    
    const str = code.toString();
    if (str.length === 8) {
      return str.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4');
    }
    
    return str;
  },

  /**
   * Format institution type display name
   */
  institutionType: (type: string | null | undefined): string => {
    if (!type) return '';
    
    const typeMap: Record<string, string> = {
      'ministry': 'Nazirlik',
      'region': 'Regional İdarə', 
      'regional_education_department': 'Regional Təhsil İdarəsi',
      'sektor': 'Sektor',
      'sector_education_office': 'Sektor Təhsil Şöbəsi',
      'school': 'Məktəb',
      'secondary_school': 'Orta Məktəb',
      'lyceum': 'Lise',
      'gymnasium': 'Gimnaziya',
      'primary_school': 'İbtidai Məktəb',
      'vocational': 'Peşə Məktəbi',
      'university': 'Universitet',
      'preschool': 'Məktəbəqədər',
      'kindergarten': 'Uşaq Bağçası',
    };
    
    return typeMap[type] || formatText.titleCase(type);
  }
};

/**
 * Status formatting utilities
 */
export const formatStatus = {
  /**
   * Format user status
   */
  user: (isActive: boolean | null | undefined): { label: string; color: string } => {
    if (isActive === true) {
      return { label: 'Aktiv', color: 'text-green-600' };
    }
    if (isActive === false) {
      return { label: 'Deaktiv', color: 'text-red-600' };
    }
    return { label: 'Naməlum', color: 'text-gray-600' };
  },

  /**
   * Format task priority
   */
  priority: (priority: string | null | undefined): { label: string; color: string } => {
    switch (priority?.toLowerCase()) {
      case 'low':
        return { label: 'Aşağı', color: 'text-green-600' };
      case 'medium':
        return { label: 'Orta', color: 'text-yellow-600' };
      case 'high':
        return { label: 'Yüksək', color: 'text-orange-600' };
      case 'urgent':
        return { label: 'Təcili', color: 'text-red-600' };
      default:
        return { label: 'Naməlum', color: 'text-gray-600' };
    }
  },

  /**
   * Format task status
   */
  task: (status: string | null | undefined): { label: string; color: string } => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { label: 'Gözləyir', color: 'text-yellow-600' };
      case 'in_progress':
        return { label: 'İcra edilir', color: 'text-blue-600' };
      case 'completed':
        return { label: 'Tamamlanıb', color: 'text-green-600' };
      case 'cancelled':
        return { label: 'Ləğv edilib', color: 'text-red-600' };
      default:
        return { label: 'Naməlum', color: 'text-gray-600' };
    }
  }
};

/**
 * Validation utilities
 */
export const isValid = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return (cleanPhone.length === 10 && cleanPhone.startsWith('0')) ||
           (cleanPhone.length === 12 && cleanPhone.startsWith('994'));
  },

  utisCode: (code: string): boolean => {
    return /^\d{8}$/.test(code);
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};