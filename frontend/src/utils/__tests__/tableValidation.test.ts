import { describe, it, expect } from 'vitest';
import { validateRow, hasValidationErrors, colMinWidth, colTypeLabel } from '../tableValidation';
import type { ReportTableColumn, ReportTableRow } from '@/types/reportTable';

describe('tableValidation utilities', () => {
  const textCol: ReportTableColumn = {
    key: 'name',
    label: 'Ad',
    type: 'text',
    required: true,
  };

  const numberCol: ReportTableColumn = {
    key: 'age',
    label: 'Yaş',
    type: 'number',
    required: false,
  };

  const dateCol: ReportTableColumn = {
    key: 'birthdate',
    label: 'Doğum tarixi',
    type: 'date',
    required: true,
  };

  describe('validateRow', () => {
    it('should return empty object for valid row', () => {
      const row: ReportTableRow = { name: 'John', age: '25', birthdate: '1999-01-01' };
      const columns = [textCol, numberCol, dateCol];
      const errors = validateRow(row, columns);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const row: ReportTableRow = { name: '', age: '25', birthdate: '1999-01-01' };
      const columns = [textCol, numberCol, dateCol];
      const errors = validateRow(row, columns);
      expect(errors.name).toBeDefined();
      expect(errors.birthdate).toBeUndefined();
    });

    it('should validate number type', () => {
      const row: ReportTableRow = { name: 'John', age: 'not-a-number', birthdate: '1999-01-01' };
      const columns = [textCol, numberCol, dateCol];
      const errors = validateRow(row, columns);
      expect(errors.age).toBeDefined();
    });

    it('should allow empty optional fields', () => {
      const row: ReportTableRow = { name: 'John', age: '', birthdate: '1999-01-01' };
      const columns = [textCol, numberCol, dateCol];
      const errors = validateRow(row, columns);
      expect(errors.age).toBeUndefined();
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false for empty errors', () => {
      const errors = {};
      expect(hasValidationErrors(errors)).toBe(false);
    });

    it('should return true when errors exist', () => {
      const errors = { 0: { name: 'Required' } };
      expect(hasValidationErrors(errors)).toBe(true);
    });
  });

  describe('colMinWidth', () => {
    it('should return correct width for text type', () => {
      expect(colMinWidth('text')).toBe('min-w-[120px]');
    });

    it('should return correct width for number type', () => {
      expect(colMinWidth('number')).toBe('min-w-[80px]');
    });

    it('should return correct width for date type', () => {
      expect(colMinWidth('date')).toBe('min-w-[100px]');
    });

    it('should return default width for unknown type', () => {
      expect(colMinWidth('unknown')).toBe('min-w-[100px]');
    });
  });

  describe('colTypeLabel', () => {
    it('should return correct label for text type', () => {
      expect(colTypeLabel(textCol)).toBe('Mətn');
    });

    it('should return correct label for number type', () => {
      expect(colTypeLabel(numberCol)).toBe('Rəqəm');
    });

    it('should return correct label for date type', () => {
      expect(colTypeLabel(dateCol)).toBe('Tarix');
    });
  });
});
