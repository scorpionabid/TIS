/**
 * MasterTableDataTable - Main data table with rows and expandable details
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { ReportTable } from '@/types/reportTable';
import type { InstitutionData, ColumnStat, SortDirection, ViewMode } from './types';
import { formatCellValue, detectAnomaly } from '../MasterTableView';

interface MasterTableDataTableProps {
  table: ReportTable;
  data: InstitutionData[];
  selectedInstitutions: Set<number>;
  expandedInstitutions: Set<number>;
  sortField: string | null;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  columnStats: Record<string, ColumnStat>;
  onToggleSelection: (id: number) => void;
  onToggleSelectAll: () => void;
  onToggleExpand: (id: number) => void;
  onSort: (field: string) => void;
  onRowAction?: (institutionId: number, rowIndex: number, action: 'approve' | 'reject' | 'return') => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'submitted':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Təqdim edildi
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
          <Clock className="h-3 w-3" /> Qismən
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="outline" className="text-gray-500 gap-1">
          <XCircle className="h-3 w-3" /> Qaralama
        </Badge>
      );
    default:
      return null;
  }
};

export const MasterTableDataTable: React.FC<MasterTableDataTableProps> = ({
  table,
  data,
  selectedInstitutions,
  expandedInstitutions,
  sortField,
  sortDirection,
  viewMode,
  columnStats,
  onToggleSelection,
  onToggleSelectAll,
  onToggleExpand,
  onSort,
}) => {
  const allSelected = data.length > 0 && selectedInstitutions.size === data.length;
  const numericColumns = table.columns.filter((c) => c.type === 'number');

  const SortIndicator: React.FC<{ field: string }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {/* Select All Checkbox */}
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="rounded border-gray-300"
            />
          </TableHead>

          {/* Institution Name */}
          <TableHead
            className="cursor-pointer hover:bg-slate-100"
            onClick={() => onSort('name')}
          >
            <div className="flex items-center gap-1">
              Məktəb
              <SortIndicator field="name" />
            </div>
          </TableHead>

          {/* Sector */}
          <TableHead>Sektor</TableHead>

          {/* Status */}
          <TableHead
            className="cursor-pointer hover:bg-slate-100"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center gap-1">
              Status
              <SortIndicator field="status" />
            </div>
          </TableHead>

          {/* Row Count */}
          <TableHead
            className="cursor-pointer hover:bg-slate-100 text-right"
            onClick={() => onSort('rows')}
          >
            <div className="flex items-center gap-1 justify-end">
              Sətir
              <SortIndicator field="rows" />
            </div>
          </TableHead>

          {/* Numeric Column Headers */}
          {numericColumns.map((col) => (
            <TableHead
              key={col.key}
              className="cursor-pointer hover:bg-slate-100 text-right"
              onClick={() => onSort(col.key)}
            >
              <div className="flex items-center gap-1 justify-end">
                {col.label}
                <SortIndicator field={col.key} />
              </div>
            </TableHead>
          ))}

          {/* Expand Column */}
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((inst) => {
          const isExpanded = expandedInstitutions.has(inst.institution_id);
          const isSelected = selectedInstitutions.has(inst.institution_id);

          return (
            <React.Fragment key={inst.institution_id}>
              {/* Main Row */}
              <TableRow className={isSelected ? 'bg-blue-50' : ''}>
                {/* Selection Checkbox */}
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelection(inst.institution_id)}
                    className="rounded border-gray-300"
                  />
                </TableCell>

                {/* Institution Info */}
                <TableCell>
                  <div className="font-medium">{inst.institution_name}</div>
                  {inst.region_name && (
                    <div className="text-xs text-gray-500">{inst.region_name}</div>
                  )}
                </TableCell>

                {/* Sector */}
                <TableCell>{inst.sector_name || '-'}</TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={inst.status} />
                </TableCell>

                {/* Row Count with Badge */}
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-medium">{inst.row_count}</span>
                    {inst.approved_count > 0 && (
                      <Badge variant="outline" className="text-xs text-emerald-600">
                        {inst.approved_count} təsdiq
                      </Badge>
                    )}
                    {inst.pending_count > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        {inst.pending_count} gözləyir
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Numeric Column Values */}
                {numericColumns.map((col) => {
                  const values = inst.rows
                    .map((r) => Number(r[col.key]))
                    .filter((v) => !isNaN(v));
                  const sum = values.reduce((a, b) => a + b, 0);
                  const stats = columnStats[col.key];
                  const anomaly =
                    stats && values.length > 0
                      ? detectAnomaly(sum / (values.length || 1), {
                          avg: stats.average || 0,
                          std: stats.max ? (stats.max - (stats.min || 0)) / 4 : 1,
                        })
                      : null;

                  return (
                    <TableCell key={col.key} className="text-right">
                      <div
                        className={`font-mono ${
                          anomaly === 'high'
                            ? 'text-red-600 font-bold'
                            : anomaly === 'low'
                            ? 'text-blue-600'
                            : ''
                        }`}
                      >
                        {formatCellValue(sum, col.format)}
                        {anomaly && (
                          <span className="ml-1 text-xs">
                            {anomaly === 'high' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  );
                })}

                {/* Expand Button */}
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onToggleExpand(inst.institution_id)}>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>

              {/* Expanded Detail View */}
              {isExpanded && viewMode === 'expanded' && (
                <TableRow>
                  <TableCell
                    colSpan={numericColumns.length + 5}
                    className="bg-slate-50 p-0"
                  >
                    <div className="p-4">
                      <h5 className="font-medium mb-2">
                        {inst.institution_name} - ətraflı məlumat
                      </h5>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            {table.columns.map((col) => (
                              <TableHead key={col.key}>{col.label}</TableHead>
                            ))}
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inst.rows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              {table.columns.map((col) => (
                                <TableCell key={col.key}>
                                  {formatCellValue(
                                    row[col.key],
                                    col.type === 'number' ? col.format : undefined
                                  )}
                                </TableCell>
                              ))}
                              <TableCell>{/* Row status */}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default MasterTableDataTable;
