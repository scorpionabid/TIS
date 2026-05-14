/**
 * useTableAnalytics - Custom hook for table analytics calculations
 */

import { useMemo } from 'react';
import type { ReportTable, ReportTableResponse, ReportTableColumn } from '@/types/reportTable';

export interface ColumnAnalytics {
  column: ReportTableColumn;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

export interface TableAnalyticsData {
  submitted: number;
  draft: number;
  totalRows: number;
  institutionCount: number;
  targetCount: number;
  participationRate: number;
  columnStats: ColumnAnalytics[];
  statusDistribution: Array<{ label: string; value: number; color: string }>;
}

interface UseTableAnalyticsProps {
  responses: ReportTableResponse[];
  table: ReportTable;
}

export function useTableAnalytics({
  responses,
  table,
}: UseTableAnalyticsProps): TableAnalyticsData | null {
  return useMemo(() => {
    if (!responses.length) return null;

    // Submission stats
    const submitted = responses.filter((r) => r.status === 'submitted').length;
    const draft = responses.filter((r) => r.status === 'draft').length;
    const totalRows = responses.reduce((acc, r) => acc + (r.rows?.length || 0), 0);

    // Institution participation
    const institutionCount = responses.length;
    const targetCount = table.target_institutions?.length || 0;
    const participationRate =
      targetCount > 0 ? (institutionCount / targetCount) * 100 : 0;

    // Column analytics (for number columns)
    const numberColumns =
      table.columns?.filter((col) => col.type === 'number') || [];
    const columnStats: ColumnAnalytics[] = numberColumns
      .map((col) => {
        const values: number[] = [];
        responses.forEach((r) => {
          r.rows?.forEach((row) => {
            const val = parseFloat(String(row[col.key]));
            if (!isNaN(val)) values.push(val);
          });
        });

        if (values.length === 0) return null;

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
          column: col,
          count: values.length,
          sum,
          avg,
          min,
          max,
        };
      })
      .filter((item): item is ColumnAnalytics => item !== null);

    // Status distribution
    const statusDistribution = [
      { label: 'Göndərilib', value: submitted, color: '#10b981' },
      { label: 'Qaralama', value: draft, color: '#6b7280' },
    ];

    return {
      submitted,
      draft,
      totalRows,
      institutionCount,
      targetCount,
      participationRate,
      columnStats,
      statusDistribution,
    };
  }, [responses, table]);
}

export default useTableAnalytics;
