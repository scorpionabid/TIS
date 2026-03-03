/**
 * MasterTableView - Admin view showing all schools' data in one unified table
 * REFACTORED: Broken down into smaller sub-components for better maintainability
 */

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import type { ReportTable } from "@/types/reportTable";
import { reportTableService } from "@/services/reportTables";

// ─── Sub-components ─────────────────────────────────────────────────────────

import { MasterTableStats } from "./master-table/MasterTableStats";
import { MasterTableFilters } from "./master-table/MasterTableFilters";
import { MasterTableColumnStats } from "./master-table/MasterTableColumnStats";
import { MasterTableDataTable } from "./master-table/MasterTableDataTable";

// ─── Custom Hook ────────────────────────────────────────────────────────────

import { useMasterTableData } from "./master-table/useMasterTableData";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InstitutionData {
  institution_id: number;
  institution_name: string;
  sector_name?: string;
  region_name?: string;
  rows: Record<string, string | number | null>[];
  status: "draft" | "submitted" | "partial";
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

export type SortDirection = "asc" | "desc";
export type ViewMode = "merged" | "expanded";

interface MasterTableViewProps {
  table: ReportTable;
  onRowAction?: (
    institutionId: number,
    rowIndex: number,
    action: "approve" | "reject" | "return",
  ) => void;
  onBulkAction?: (
    institutionIds: number[],
    action: "approve" | "reject" | "return",
  ) => void;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

export function formatCellValue(value: unknown, type?: string): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") {
    if (type === "currency") {
      return value.toLocaleString("az-AZ", {
        style: "currency",
        currency: "AZN",
      });
    }
    return value.toLocaleString("az-AZ");
  }
  return String(value);
}

export function detectAnomaly(
  value: number,
  stats: { avg: number; std: number },
): "high" | "low" | null {
  if (stats.std === 0) return null;
  const zScore = (value - stats.avg) / stats.std;
  if (zScore > 2) return "high";
  if (zScore < -2) return "low";
  return null;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MasterTableView({
  table,
  onRowAction,
  onBulkAction,
}: MasterTableViewProps) {
  // ─── State Management ────────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<number>>(
    new Set(),
  );
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("merged");
  const [showStats, setShowStats] = useState(true);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const { data: responses, isLoading } = useQuery({
    queryKey: ["report-table-all-responses", table.id],
    queryFn: () => reportTableService.getAllResponses(table.id),
    enabled: !!table.id,
    refetchInterval: 30_000,
  });

  // ─── Data Processing (via custom hook) ───────────────────────────────────

  const { institutionData, filteredData, columnStats, sectors } =
    useMasterTableData({
      responses,
      table,
      searchTerm,
      statusFilter,
      sectorFilter,
      sortField,
      sortDirection,
    });

  // ─── Event Handlers ──────────────────────────────────────────────────────

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("asc");
      return field;
    });
  }, []);

  const toggleSelection = useCallback((id: number) => {
    setSelectedInstitutions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedInstitutions((prev) => {
      if (prev.size === filteredData.length) {
        return new Set();
      }
      return new Set(filteredData.map((i) => i.institution_id));
    });
  }, [filteredData]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedInstitutions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Export Handler ──────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const headers = [
      "Məktəb",
      "Sektor",
      "Region",
      "Status",
      "Sətir sayı",
      ...table.columns.map((c) => c.label),
    ];
    const rows = filteredData.map((inst) => [
      inst.institution_name,
      inst.sector_name || "",
      inst.region_name || "",
      inst.status,
      inst.row_count.toString(),
      ...table.columns.map((col) => {
        if (col.type === "number") {
          const sum = inst.rows.reduce(
            (acc, row) => acc + (Number(row[col.key]) || 0),
            0,
          );
          return sum.toString();
        }
        return inst.rows.map((r) => r[col.key]).join("; ");
      }),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${table.title}-master-view.csv`;
    link.click();
  }, [filteredData, table]);

  // ─── Loading State ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header Stats Cards */}
      {showStats && (
        <MasterTableStats
          filteredCount={filteredData.length}
          totalCount={institutionData.length}
          submittedCount={
            filteredData.filter((i) => i.status === "submitted").length
          }
          pendingCount={filteredData.reduce(
            (sum, i) => sum + i.pending_count,
            0,
          )}
          approvedCount={filteredData.reduce(
            (sum, i) => sum + i.approved_count,
            0,
          )}
        />
      )}

      {/* Filters and Actions */}
      <MasterTableFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sectorFilter={sectorFilter}
        onSectorChange={setSectorFilter}
        sectors={sectors}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedInstitutions.size}
        onExport={handleExport}
        onBulkAction={
          onBulkAction
            ? (action) => onBulkAction(Array.from(selectedInstitutions), action)
            : undefined
        }
      />

      {/* Column Statistics */}
      {showStats && Object.keys(columnStats).length > 0 && (
        <MasterTableColumnStats stats={columnStats} />
      )}

      {/* Main Data Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <MasterTableDataTable
          table={table}
          data={filteredData}
          selectedInstitutions={selectedInstitutions}
          expandedInstitutions={expandedInstitutions}
          sortField={sortField}
          sortDirection={sortDirection}
          viewMode={viewMode}
          columnStats={columnStats}
          onToggleSelection={toggleSelection}
          onToggleSelectAll={toggleSelectAll}
          onToggleExpand={toggleExpand}
          onSort={handleSort}
          onRowAction={onRowAction}
        />

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Məlumat tapılmadı</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasterTableView;
