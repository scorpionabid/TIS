import { describe, it, expect } from 'vitest';
import { sanitizeCellValue, formatCellValue, isCellValueEmpty } from '../cellValue';
import type { ReportTableColumn } from '@/types/reportTable';

describe('cellValue utilities', () => {
  const textCol: ReportTableColumn = {
    key: 'test',
    label: 'Test',
    type: 'text',
    required: false,
  };

  const booleanCol: ReportTableColumn = {
    key: 'bool',
    label: 'Boolean',
    type: 'boolean',
    required: false,
  };

  const numberCol: ReportTableColumn = {
    key: 'num',
    label: 'Number',
    type: 'number',
    required: false,
  };

  describe('sanitizeCellValue', () => {
    it('should escape HTML tags', () => {
      expect(sanitizeCellValue('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(sanitizeCellValue('<div>test</div>')).toBe('&lt;div&gt;test&lt;/div&gt;');
    });

    it('should escape special HTML characters', () => {
      expect(sanitizeCellValue('a & b')).toBe('a &amp; b');
      expect(sanitizeCellValue('"quoted"')).toBe('&quot;quoted&quot;');
      expect(sanitizeCellValue("'single'")).toBe('&#x27;single&#x27;');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeCellValue(null)).toBe('');
      expect(sanitizeCellValue(undefined)).toBe('');
    });

    it('should convert numbers to string', () => {
      expect(sanitizeCellValue(123)).toBe('123');
      expect(sanitizeCellValue(0)).toBe('0');
    });

    it('should handle empty strings', () => {
      expect(sanitizeCellValue('')).toBe('');
    });
  });

  describe('formatCellValue', () => {
    it('should format null/undefined as dash', () => {
      expect(formatCellValue(null, textCol)).toBe('—');
      expect(formatCellValue(undefined, textCol)).toBe('—');
    });

    it('should format empty string as dash', () => {
      expect(formatCellValue('', textCol)).toBe('—');
    });

    it('should format booleans', () => {
      expect(formatCellValue('Bəli', booleanCol)).toBe('Bəli');
      expect(formatCellValue('Xeyr', booleanCol)).toBe('Xeyr');
    });

    it('should format numbers', () => {
      expect(formatCellValue(1234567, numberCol)).toBe('1.234.567');
      expect(formatCellValue(0, numberCol)).toBe('0');
    });

    it('should pass through normal strings with sanitization', () => {
      expect(formatCellValue('Hello World', textCol)).toBe('Hello World');
      expect(formatCellValue('<script>', textCol)).toBe('&lt;script&gt;');
    });
  });

  describe('isCellValueEmpty', () => {
    it('should return true for null/undefined', () => {
      expect(isCellValueEmpty(null)).toBe(true);
      expect(isCellValueEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isCellValueEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(isCellValueEmpty('   ')).toBe(true);
      expect(isCellValueEmpty('\t\n')).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isCellValueEmpty('hello')).toBe(false);
      expect(isCellValueEmpty(0)).toBe(false);
      expect(isCellValueEmpty(false)).toBe(false);
    });
  });
});
