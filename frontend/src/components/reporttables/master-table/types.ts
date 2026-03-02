/**
 * Types shared across MasterTableView sub-components
 */

import type { ReportTable, ReportTableResponse, ReportTableColumn } from '@/types/reportTable';

export interface InstitutionData {
  institution_id: number;
  institution_name: string;
  sector_name?: string;
  region_name?: string;
  rows: Record<string, string | number | null>[];
  status: 'draft' | 'submitted' | 'partial';
  submitted_at?: string;
  row_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

export interface ColumnStat {
  label: string;
  total: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'merged' | 'expanded';

export interface MasterTableDataHookProps {
  responses: ReportTableResponse[] | undefined;
  table: ReportTable;
  searchTerm: string;
  statusFilter: string;
  sectorFilter: string;
  sortField: string | null;
  sortDirection: SortDirection;
}

export interface MasterTableDataHookResult {
  institutionData: InstitutionData[];
  filteredData: InstitutionData[];
  columnStats: Record<string, ColumnStat>;
  sectors: string[];
}
