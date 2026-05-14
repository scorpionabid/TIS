/**
 * useMasterTableData - Custom hook for processing MasterTableView data
 * Handles data transformation, filtering, sorting, and statistics calculation
 */

import { useMemo } from 'react';
import type { ReportTableResponse } from '@/types/reportTable';
import type {
  InstitutionData,
  ColumnStat,
  MasterTableDataHookProps,
  MasterTableDataHookResult,
  SortDirection,
} from './types';

export function useMasterTableData({
  responses,
  table,
  searchTerm,
  statusFilter,
  sectorFilter,
  sortField,
  sortDirection,
}: MasterTableDataHookProps): MasterTableDataHookResult {
  // ─── Transform responses into institution-centric data ─────────────────────

  const institutionData = useMemo((): InstitutionData[] => {
    if (!responses) return [];

    const grouped = new Map<number, InstitutionData>();

    responses.forEach((response: ReportTableResponse) => {
      const inst = response.institution;
      if (!inst) return;

      const existing = grouped.get(inst.id);
      const rowStatuses = response.row_statuses || {};

      let approved = 0,
        pending = 0,
        rejected = 0;
      Object.values(rowStatuses).forEach((status) => {
        if (status.status === 'approved') approved++;
        else if (status.status === 'submitted') pending++;
        else if (status.status === 'rejected') rejected++;
      });

      if (existing) {
        existing.rows.push(...response.rows);
        existing.approved_count += approved;
        existing.pending_count += pending;
        existing.rejected_count += rejected;
        existing.row_count += response.rows.length;
        if (response.status === 'submitted' && existing.status === 'draft') {
          existing.status = 'partial';
        }
      } else {
        // Get region name from institution hierarchy
        const regionName =
          (
            inst as {
              parent?: { id: number; name: string; parent?: { id: number; name: string } };
            }
          ).parent?.parent?.name;

        grouped.set(inst.id, {
          institution_id: inst.id,
          institution_name: inst.name,
          sector_name: inst.parent?.name,
          region_name: regionName,
          rows: [...response.rows],
          status: response.status === 'submitted' ? 'submitted' : 'draft',
          submitted_at: response.submitted_at,
          row_count: response.rows.length,
          approved_count: approved,
          pending_count: pending,
          rejected_count: rejected,
        });
      }
    });

    return Array.from(grouped.values());
  }, [responses]);

  // ─── Filter and sort institutions ──────────────────────────────────────────

  const filteredData = useMemo((): InstitutionData[] => {
    let filtered = institutionData;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(term) ||
          inst.sector_name?.toLowerCase().includes(term) ||
          inst.region_name?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inst) => inst.status === statusFilter);
    }

    // Apply sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter((inst) => inst.sector_name === sectorFilter);
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: unknown, bVal: unknown;

        if (sortField === 'name') {
          aVal = a.institution_name;
          bVal = b.institution_name;
        } else if (sortField === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else if (sortField === 'rows') {
          aVal = a.row_count;
          bVal = b.row_count;
        } else {
          // Sort by column value (sum of numeric columns)
          const col = table.columns.find((c) => c.key === sortField);
          if (col?.type === 'number') {
            aVal = a.rows.reduce(
              (sum, row) => sum + (Number(row[sortField]) || 0),
              0
            );
            bVal = b.rows.reduce(
              (sum, row) => sum + (Number(row[sortField]) || 0),
              0
            );
          } else {
            aVal = a.rows[0]?.[sortField] || '';
            bVal = b.rows[0]?.[sortField] || '';
          }
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(String(bVal))
            : String(bVal).localeCompare(aVal);
        }

        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return filtered;
  }, [
    institutionData,
    searchTerm,
    statusFilter,
    sectorFilter,
    sortField,
    sortDirection,
    table.columns,
  ]);

  // ─── Calculate statistics for numeric columns ──────────────────────────────

  const columnStats = useMemo((): Record<string, ColumnStat> => {
    const stats: Record<string, ColumnStat> = {};

    table.columns.forEach((col) => {
      if (col.type !== 'number') return;

      const values: number[] = [];
      filteredData.forEach((inst) => {
        inst.rows.forEach((row) => {
          const val = Number(row[col.key]);
          if (!isNaN(val)) values.push(val);
        });
      });

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        stats[col.key] = {
          label: col.label,
          total: sum,
          average: avg,
          min,
          max,
        };
      }
    });

    return stats;
  }, [filteredData, table.columns]);

  // ─── Get unique sectors for filter ────────────────────────────────────────

  const sectors = useMemo((): string[] => {
    const unique = new Set(
      institutionData.map((i) => i.sector_name).filter(Boolean)
    );
    return Array.from(unique);
  }, [institutionData]);

  return {
    institutionData,
    filteredData,
    columnStats,
    sectors,
  };
}

export default useMasterTableData;
