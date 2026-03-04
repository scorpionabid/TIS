import { describe, it, expect } from 'vitest';
import { parseTSV, isTSVData } from '../tsvParser';

describe('tsvParser utilities', () => {
  describe('parseTSV', () => {
    it('should parse simple TSV data', () => {
      const input = 'col1\tcol2\tcol3\nval1\tval2\tval3';
      const result = parseTSV(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['col1', 'col2', 'col3']);
      expect(result[1]).toEqual(['val1', 'val2', 'val3']);
    });

    it('should handle quoted fields', () => {
      const input = '"col with\ttab"\tcol2\nval1\tval2';
      const result = parseTSV(input);
      expect(result[0][0]).toBe('col with\ttab');
    });

    it('should handle empty lines', () => {
      const input = 'col1\tcol2\n\nval1\tval2';
      const result = parseTSV(input);
      expect(result).toHaveLength(2);
    });

    it('should handle trailing newline', () => {
      const input = 'col1\tcol2\nval1\tval2\n';
      const result = parseTSV(input);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(parseTSV('')).toEqual([]);
    });

    it('should handle single row', () => {
      const input = 'col1\tcol2\tcol3';
      const result = parseTSV(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['col1', 'col2', 'col3']);
    });

    it('should handle mixed quoted and unquoted fields', () => {
      const input = '"quoted field"\tunquoted\t"another quoted"';
      const result = parseTSV(input);
      expect(result[0]).toEqual(['quoted field', 'unquoted', 'another quoted']);
    });
  });

  describe('isTSVData', () => {
    it('should return true for tab-separated data', () => {
      expect(isTSVData('col1\tcol2\nval1\tval2')).toBe(true);
    });

    it('should return true for newline-only data (single column)', () => {
      expect(isTSVData('col1\nval1')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isTSVData('just plain text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isTSVData('')).toBe(false);
    });

    it('should return true for single tab', () => {
      expect(isTSVData('a\tb')).toBe(true);
    });
  });
});
