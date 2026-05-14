/**
 * MasterTableView - Admin view showing all schools' data in one unified table
 * REFACTORED: Broken down into smaller sub-components for better maintainability
 */

import React, { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import type { ReportTable } from "@/types/reportTable";
import { reportTableService } from "@/services/reportTables";

// ─── Bulk Operations ────────────────────────────────────────────────────────

import { BulkOperationsToolbar } from "./BulkOperations";
import { BulkActionConfirmDialog } from "./BulkActionConfirmDialog";

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

// ─── Audit Log Types ───────────────────────────────────────────────────────

interface BulkActionAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  tableId: number;
  tableTitle: string;
  action: 'approve' | 'reject' | 'return';
  count: number;
  successful: number;
  failed: number;
  details?: string;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

const AUDIT_LOG_KEY = 'report-table-bulk-actions-audit';

function saveAuditLogEntry(entry: BulkActionAuditEntry) {
  const existing = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  existing.unshift(entry);
  // Keep only last 50 entries
  const trimmed = existing.slice(0, 50);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
}

function getAuditLog(): BulkActionAuditEntry[] {
  return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
}

function formatCellValue(value: unknown, type?: string): string {
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
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<BulkActionAuditEntry[]>([]);
  
  // ─── Bulk Operations State ────────────────────────────────────────────────
  
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

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

  // ─── Select Search Results ─────────────────────────────────────────────

  const selectSearchResults = useCallback(() => {
    const searchInstitutions = filteredData.map(i => i.institution_id);
    setSelectedInstitutions(new Set(searchInstitutions));
  }, [filteredData]);

  // ─── Load Audit Log on Mount ─────────────────────────────────────────────

  useEffect(() => {
    setAuditLog(getAuditLog());
  }, []);

  // ─── Export Handler ──────────────────────────────────────────────────────

  const handleExport = useCallback((exportSelectedOnly: boolean = false) => {
    const dataToExport = exportSelectedOnly 
      ? filteredData.filter(i => selectedInstitutions.has(i.institution_id))
      : filteredData;
    
    const headers = [
      "Məktəb",
      "Sektor",
      "Region",
      "Status",
      "Sətir sayı",
      ...table.columns.map((c) => c.label),
    ];
    const rows = dataToExport.map((inst) => [
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
    link.download = `${table.title}-${exportSelectedOnly ? 'secilmis' : 'master-view'}.csv`;
    link.click();
  }, [filteredData, selectedInstitutions, table]);

  // ─── Filter + Bulk Selection Handlers ────────────────────────────────────

  const selectBySector = useCallback((sectorName: string) => {
    const sectorInstitutions = filteredData
      .filter(i => i.sector_name === sectorName)
      .map(i => i.institution_id);
    
    setSelectedInstitutions(prev => {
      const next = new Set(prev);
      const allSelected = sectorInstitutions.every(id => next.has(id));
      
      if (allSelected) {
        // Deselect all in this sector
        sectorInstitutions.forEach(id => next.delete(id));
      } else {
        // Select all in this sector
        sectorInstitutions.forEach(id => next.add(id));
      }
      return next;
    });
  }, [filteredData]);

  const selectByStatus = useCallback((status: string) => {
    const statusInstitutions = filteredData
      .filter(i => i.status === status)
      .map(i => i.institution_id);
    
    setSelectedInstitutions(prev => {
      const next = new Set(prev);
      const allSelected = statusInstitutions.every(id => next.has(id));
      
      if (allSelected) {
        statusInstitutions.forEach(id => next.delete(id));
      } else {
        statusInstitutions.forEach(id => next.add(id));
      }
      return next;
    });
  }, [filteredData]);

  // ─── Bulk Action Handlers ────────────────────────────────────────────────

  const handleBulkApprove = useCallback(async (ids: (string | number)[]) => {
    if (!onBulkAction) return;
    setIsProcessingBulk(true);
    try {
      await onBulkAction(ids as number[], 'approve');
      // Save audit log entry
      const entry: BulkActionAuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: 'Current User', // In real app, get from auth context
        tableId: table.id,
        tableTitle: table.title,
        action: 'approve',
        count: ids.length,
        successful: ids.length,
        failed: 0,
      };
      saveAuditLogEntry(entry);
      setAuditLog(getAuditLog());
      setSelectedInstitutions(new Set());
    } finally {
      setIsProcessingBulk(false);
    }
  }, [onBulkAction, table]);

  const handleBulkReject = useCallback(async (ids: (string | number)[]) => {
    if (!onBulkAction) return;
    setIsProcessingBulk(true);
    try {
      await onBulkAction(ids as number[], 'reject');
      const entry: BulkActionAuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: 'Current User',
        tableId: table.id,
        tableTitle: table.title,
        action: 'reject',
        count: ids.length,
        successful: ids.length,
        failed: 0,
      };
      saveAuditLogEntry(entry);
      setAuditLog(getAuditLog());
      setSelectedInstitutions(new Set());
    } finally {
      setIsProcessingBulk(false);
    }
  }, [onBulkAction, table]);

  const handleBulkReturn = useCallback(async (ids: (string | number)[]) => {
    if (!onBulkAction) return;
    setIsProcessingBulk(true);
    try {
      await onBulkAction(ids as number[], 'return');
      const entry: BulkActionAuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: 'Current User',
        tableId: table.id,
        tableTitle: table.title,
        action: 'return',
        count: ids.length,
        successful: ids.length,
        failed: 0,
      };
      saveAuditLogEntry(entry);
      setAuditLog(getAuditLog());
      setSelectedInstitutions(new Set());
    } finally {
      setIsProcessingBulk(false);
    }
  }, [onBulkAction, table]);

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
        totalCount={filteredData.length}
        onExport={handleExport}
        onBulkAction={
          onBulkAction
            ? (action) => onBulkAction(Array.from(selectedInstitutions), action)
            : undefined
        }
        onSelectBySector={selectBySector}
        onSelectByStatus={selectByStatus}
        onSelectAllFiltered={toggleSelectAll}
        onSelectSearchResults={selectSearchResults}
      />

      {/* Column Statistics */}
      {showStats && Object.keys(columnStats).length > 0 && (
        <MasterTableColumnStats stats={columnStats} />
      )}

      {/* Bulk Operations Toolbar */}
      {filteredData.length > 0 && onBulkAction && (
        <BulkOperationsToolbar
          rowIds={filteredData.map((i) => i.institution_id)}
          selectedIds={selectedInstitutions}
          onSelectionChange={(ids) => setSelectedInstitutions(ids as Set<number>)}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkReturn={handleBulkReturn}
          disabled={isLoading}
        />
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

      {/* Bulk Action Confirm Dialog */}
      <BulkActionConfirmDialog
        isOpen={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        onConfirm={async () => {
          const ids = Array.from(selectedInstitutions);
          switch (bulkAction) {
            case 'approve':
              await handleBulkApprove(ids);
              break;
            case 'reject':
              await handleBulkReject(ids);
              break;
            case 'return':
              await handleBulkReturn(ids);
              break;
          }
          setBulkAction(null);
        }}
        action={bulkAction || 'approve'}
        rowCount={selectedInstitutions.size}
        isLoading={isProcessingBulk}
      />

      {/* Audit Log Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showAuditLog ? 'Tarixçəni gizlət' : 'Toplu əməliyyat tarixçəsini göstər'}
        </button>
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">Son toplu əməliyyatlar</h3>
          {auditLog.length === 0 ? (
            <p className="text-sm text-gray-500">Hələ heç bir toplu əməliyyat edilməyib.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLog.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        entry.action === 'approve'
                          ? 'bg-emerald-100 text-emerald-700'
                          : entry.action === 'reject'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {entry.action === 'approve'
                        ? 'Təsdiqləndi'
                        : entry.action === 'reject'
                        ? 'Rədd edildi'
                        : 'Qaytarıldı'}
                    </span>
                    <span className="text-gray-600">{entry.tableTitle}</span>
                    <span className="text-gray-500">({entry.count} sətir)</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.timestamp).toLocaleString('az-AZ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MasterTableView;
