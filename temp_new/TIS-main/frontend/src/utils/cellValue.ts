/**
 * Utility functions for safely rendering cell values in report tables
 * Prevents XSS attacks by properly escaping HTML entities
 */

import type { ReportTableColumn } from '@/types/reportTable';

/**
 * Sanitizes a string value to prevent XSS attacks
 * Escapes HTML entities: <, >, &, ", '
 * 
 * @param value - The value to sanitize
 * @returns Sanitized string safe for rendering
 */
export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const str = String(value);
  
  // HTML entity escaping to prevent XSS
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Formats a cell value for display based on column type
 * Applies type-specific formatting and XSS sanitization
 * 
 * @param value - The cell value
 * @param col - The column definition
 * @returns Formatted and sanitized string for display
 */
export function formatCellValue(
  value: string | number | boolean | null | undefined,
  col: ReportTableColumn
): string {
  // Handle null/undefined/empty values
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  // Apply type-specific formatting
  if (col.type === 'boolean') {
    if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr';
    const strVal = String(value ?? '').toLowerCase();
    if (strVal === 'bəli' || strVal === 'true' || strVal === '1') return 'Bəli';
    if (strVal === 'xeyr' || strVal === 'false' || strVal === '0') return 'Xeyr';
    return value ? 'Bəli' : 'Xeyr';
  }

  if (col.type === 'number' && typeof value === 'number') {
    // Format numbers with consistent decimal places
    return value.toLocaleString('az-AZ');
  }

  if (col.type === 'date' && value && typeof value !== 'boolean') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('az-AZ');
      }
    } catch {
      // Fall through to string conversion
    }
  }

  // Default: convert to string with XSS sanitization
  return sanitizeCellValue(value);
}

/**
 * Validates if a cell value is empty
 * 
 * @param value - The value to check
 * @returns True if the value is considered empty
 */
export function isCellValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return value === '';
}
