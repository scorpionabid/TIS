/**
 * Types for TableAnalytics sub-components
 */

import type { ReportTable, ReportTableColumn, ReportTableResponse } from '@/types/reportTable';

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

export interface UseTableAnalyticsProps {
  responses: ReportTableResponse[];
  table: ReportTable;
}

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
}
