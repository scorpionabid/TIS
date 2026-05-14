import { useCallback, useMemo } from 'react';
import type { ReportTableRow, ReportTableColumn } from '@/types/reportTable';
import { FormulaEngine, type CellContext } from '@/lib/formulaEngine';

interface UseCalculatedColumnsParams {
  columns: ReportTableColumn[];
  displayRows: ReportTableRow[];
}

export function useCalculatedColumns({ columns, displayRows }: UseCalculatedColumnsParams) {
  const buildCellContext = useCallback((row: ReportTableRow, rowIdx: number): CellContext => {
    const context: CellContext = {};
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const cellRef = `${colLetter}${rowIdx + 1}`;
      const value = row[col.key];
      if (col.type === 'number' && value !== '' && value !== null) {
        context[cellRef] = parseFloat(String(value)) || 0;
      } else if (col.type === 'boolean') {
        const lower = String(value).toLowerCase();
        context[cellRef] = lower === 'bəli' || lower === 'true' || lower === '1';
      } else {
        context[cellRef] = value ?? '';
      }
      context[col.key] = context[cellRef];
    });
    return context;
  }, [columns]);

  const computeCalculatedValue = useCallback((
    row: ReportTableRow,
    rowIdx: number,
    col: ReportTableColumn
  ): string => {
    if (!col.formula) return '';
    const context = buildCellContext(row, rowIdx);
    const result = FormulaEngine.evaluate(col.formula, context);
    if (result.error) return `#ERROR: ${result.error}`;
    if (result.value === null) return '';

    const value = result.value;
    if (typeof value === 'number') {
      if (col.format === 'currency') {
        return value.toLocaleString('az-AZ', { style: 'currency', currency: 'AZN' });
      } else if (col.format === 'percent') {
        return `${(value * 100).toFixed(col.decimals ?? 0)}%`;
      } else {
        return value.toFixed(col.decimals ?? 2);
      }
    }
    return String(value);
  }, [buildCellContext]);

  const getCellDisplayValue = useCallback((
    row: ReportTableRow,
    rowIdx: number,
    col: ReportTableColumn
  ): string => {
    if (col.type === 'calculated') {
      return computeCalculatedValue(row, rowIdx, col);
    }
    return String(row[col.key] ?? '');
  }, [computeCalculatedValue]);

  const calculatedColumns = useMemo(
    () => columns.filter((col) => col.type === 'calculated'),
    [columns]
  );

  const circularErrors = useMemo(() => {
    if (calculatedColumns.length === 0) return [];
    const dependencies: Record<string, string[]> = {};
    calculatedColumns.forEach((col) => {
      if (col.formula) {
        dependencies[col.key] = FormulaEngine.getDependencies(col.formula);
      }
    });
    return FormulaEngine.detectCircular(dependencies);
  }, [calculatedColumns]);

  return { getCellDisplayValue, circularErrors, calculatedColumns, buildCellContext };
}
