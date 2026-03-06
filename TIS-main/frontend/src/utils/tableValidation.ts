/**
 * Table validation utilities for Report Tables
 */

import type { ReportTableRow, ReportTableColumn } from '@/types/reportTable';

/**
 * Validates a single row against column definitions
 * Returns an object with error messages keyed by column key
 */
export function validateRow(
  row: ReportTableRow,
  columns: ReportTableColumn[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  columns.forEach((col) => {
    const val = String(row[col.key] ?? '').trim();

    if (col.required && !val) {
      errors[col.key] = 'Tələb olunur';
      return;
    }
    if (!val) return;

    if (col.type === 'number') {
      const n = Number(val);
      if (isNaN(n)) { errors[col.key] = 'Yalnız rəqəm'; return; }
      if (col.min !== undefined && n < col.min) { errors[col.key] = `Min: ${col.min}`; return; }
      if (col.max !== undefined && n > col.max) { errors[col.key] = `Maks: ${col.max}`; return; }
    }

    if (col.type === 'text') {
      if (col.min_length && val.length < col.min_length) { errors[col.key] = `Min ${col.min_length} simvol`; return; }
      if (col.max_length && val.length > col.max_length) { errors[col.key] = `Maks ${col.max_length} simvol`; return; }
    }

    if (col.type === 'select' && col.options && col.options.length > 0) {
      if (!col.options.includes(val)) { errors[col.key] = 'Yanlış seçim'; return; }
    }

    if (col.type === 'boolean') {
      const valid = ['bəli', 'xeyr', 'true', 'false', '1', '0'];
      if (!valid.includes(val.toLowerCase())) { errors[col.key] = 'Bəli və ya Xeyr seçin'; return; }
    }
  });
  return errors;
}

/**
 * Checks if any validation errors exist in the row errors object
 */
export function hasValidationErrors(
  rowErrors: Record<number, Record<string, string>>
): boolean {
  return Object.values(rowErrors).some((errs) => Object.keys(errs).length > 0);
}

/**
 * Gets the appropriate CSS min-width class for a column type
 */
export function colMinWidth(type: string): string {
  switch (type) {
    case 'text':
      return 'min-w-[120px]';
    case 'number':
      return 'min-w-[80px]';
    case 'date':
      return 'min-w-[120px]';
    case 'select':
      return 'min-w-[150px]';
    case 'boolean':
      return 'min-w-[100px]';
    case 'file':
      return 'min-w-[200px]';
    case 'signature':
      return 'min-w-[200px]';
    case 'calculated':
      return 'min-w-[100px]';
    case 'gps':
      return 'min-w-[150px]';
    default:
      return 'min-w-[100px]';
  }
}

/**
 * Gets a human-readable label for a column type
 */
export function colTypeLabel(col: ReportTableColumn): string | null {
  if (col.type === 'number') return 'rəqəm';
  if (col.type === 'date') return 'tarix';
  if (col.type === 'select') return 'seçim';
  if (col.type === 'boolean') return 'bəli/xeyr';
  if (col.type === 'calculated') return 'hesablama';
  if (col.type === 'file') return 'fayl';
  if (col.type === 'signature') return 'imza';
  if (col.type === 'gps') return 'GPS';
  return null;
}
