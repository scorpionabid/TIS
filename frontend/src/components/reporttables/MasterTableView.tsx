/**
 * MasterTableView - Admin view showing all schools' data in one unified table
 * Allows filtering, sorting, and comparison across institutions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Building2,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  BarChart3,
  Eye,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportTable, ReportTableResponse, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstitutionData {
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

interface MasterTableViewProps {
  table: ReportTable;
  onRowAction?: (institutionId: number, rowIndex: number, action: 'approve' | 'reject' | 'return') => void;
  onBulkAction?: (institutionIds: number[], action: 'approve' | 'reject' | 'return') => void;
}

interface ColumnStat {
  label: string;
  total: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatCellValue(value: unknown, type?: string): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    if (type === 'currency') {
      return value.toLocaleString('az-AZ', { style: 'currency', currency: 'AZN' });
    }
    return value.toLocaleString('az-AZ');
  }
  return String(value);
}

function detectAnomaly(value: number, stats: { avg: number; std: number }): 'high' | 'low' | null {
  if (stats.std === 0) return null;
  const zScore = (value - stats.avg) / stats.std;
  if (zScore > 2) return 'high';
  if (zScore < -2) return 'low';
  return null;
}

// ─── MasterTableView Component ────────────────────────────────────────────────

export function MasterTableView({ table, onRowAction, onBulkAction }: MasterTableViewProps) {
  const { user } = useAuth() as { user: { id: number; name: string; role: string } | null };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<number>>(new Set());
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'merged' | 'expanded'>('merged');
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(2);
  const [showStats, setShowStats] = useState(true);

  // Fetch all responses for this table
  const { data: responses, isLoading } = useQuery({
    queryKey: ['report-table-all-responses', table.id],
    queryFn: () => reportTableService.getAllResponses(table.id),
    enabled: !!table.id,
  });

  // Process data into institution-centric view
  const institutionData = useMemo((): InstitutionData[] => {
    if (!responses) return [];
    
    const grouped = new Map<number, InstitutionData>();
    
    responses.forEach((response: ReportTableResponse) => {
      const inst = response.institution;
      if (!inst) return;
      
      const existing = grouped.get(inst.id);
      const rowStatuses = response.row_statuses || {};
      
      let approved = 0, pending = 0, rejected = 0;
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
        grouped.set(inst.id, {
          institution_id: inst.id,
          institution_name: inst.name,
          sector_name: inst.parent?.name,
          region_name: (inst as { parent?: { id: number; name: string; parent?: { id: number; name: string } } }).parent?.parent?.name,
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

  // Filter and sort institutions
  const filteredData = useMemo(() => {
    let filtered = institutionData;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inst => 
        inst.institution_name.toLowerCase().includes(term) ||
        inst.sector_name?.toLowerCase().includes(term) ||
        inst.region_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inst => inst.status === statusFilter);
    }
    
    // Apply sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(inst => inst.sector_name === sectorFilter);
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
          const col = table.columns.find(c => c.key === sortField);
          if (col?.type === 'number') {
            aVal = a.rows.reduce((sum, row) => sum + (Number(row[sortField]) || 0), 0);
            bVal = b.rows.reduce((sum, row) => sum + (Number(row[sortField]) || 0), 0);
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
  }, [institutionData, searchTerm, statusFilter, sectorFilter, sortField, sortDirection, table.columns]);

  // Calculate statistics for each numeric column
  const columnStats = useMemo(() => {
    const stats: Record<string, ColumnStat> = {};
    
    table.columns.forEach(col => {
      if (col.type !== 'number') return;
      
      const values: number[] = [];
      filteredData.forEach(inst => {
        inst.rows.forEach(row => {
          const val = Number(row[col.key]);
          if (!isNaN(val)) values.push(val);
        });
      });
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Calculate standard deviation
        const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        
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

  // Get unique sectors for filter
  const sectors = useMemo(() => {
    const unique = new Set(institutionData.map(i => i.sector_name).filter(Boolean));
    return Array.from(unique);
  }, [institutionData]);

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Toggle institution selection
  const toggleSelection = useCallback((id: number) => {
    setSelectedInstitutions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedInstitutions.size === filteredData.length) {
      setSelectedInstitutions(new Set());
    } else {
      setSelectedInstitutions(new Set(filteredData.map(i => i.institution_id)));
    }
  }, [selectedInstitutions.size, filteredData]);

  // Toggle expand institution
  const toggleExpand = useCallback((id: number) => {
    setExpandedInstitutions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Export to Excel
  const handleExport = useCallback(() => {
    // Create CSV content
    const headers = ['Məktəb', 'Sektor', 'Region', 'Status', 'Sətir sayı', ...table.columns.map(c => c.label)];
    const rows = filteredData.map(inst => [
      inst.institution_name,
      inst.sector_name || '',
      inst.region_name || '',
      inst.status,
      inst.row_count.toString(),
      ...table.columns.map(col => {
        if (col.type === 'number') {
          const sum = inst.rows.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
          return sum.toString();
        }
        return inst.rows.map(r => r[col.key]).join('; ');
      })
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${table.title}-master-view.csv`;
    link.click();
    
    toast.success('Cədvəl export edildi');
  }, [filteredData, table]);

  // Status badge helper
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Təqdim edildi</Badge>;
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" /> Qismən</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-gray-500 gap-1"><XCircle className="h-3 w-3" /> Qaralama</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-500">Məktəblər</div>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <div className="text-xs text-gray-400">cəmi {institutionData.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-500">Təqdim edilmiş</div>
            <div className="text-2xl font-bold text-emerald-600">
              {filteredData.filter(i => i.status === 'submitted').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-500">Gözləyən</div>
            <div className="text-2xl font-bold text-amber-600">
              {filteredData.reduce((sum, i) => sum + i.pending_count, 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-500">Təsdiqlənmiş</div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredData.reduce((sum, i) => sum + i.approved_count, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters and actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Məktəb axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="submitted">Təqdim edilmiş</SelectItem>
              <SelectItem value="partial">Qismən</SelectItem>
              <SelectItem value="draft">Qaralama</SelectItem>
            </SelectContent>
          </Select>

          {sectors.length > 0 && (
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-40">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sektor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün sektorlar</SelectItem>
                {sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === 'merged' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('merged')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Ümumi
            </Button>
            <Button
              variant={viewMode === 'expanded' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('expanded')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ətraflı
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          {selectedInstitutions.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  Toplu əməliyyat ({selectedInstitutions.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Seçilmiş məktəblər</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onBulkAction?.(Array.from(selectedInstitutions), 'approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                  Hamısını təsdiqlə
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkAction?.(Array.from(selectedInstitutions), 'return')}>
                  <Clock className="h-4 w-4 mr-2 text-amber-500" />
                  Hamısını qaytar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkAction?.(Array.from(selectedInstitutions), 'reject')}>
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  Hamısını rədd et
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Column statistics */}
      {showStats && Object.keys(columnStats).length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium mb-3">Sütun statistikası:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(columnStats).map(([key, stat]) => (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-white p-3 rounded border cursor-help">
                      <div className="text-xs text-gray-500 truncate">{stat.label}</div>
                      <div className="text-lg font-semibold">{stat.total.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">ortalama: {stat.average?.toFixed(1)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p><strong>{stat.label}</strong></p>
                      <p>Cəmi: {stat.total.toLocaleString()}</p>
                      <p>Ortalama: {stat.average?.toFixed(2)}</p>
                      <p>Min: {stat.min}, Maks: {stat.max}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedInstitutions.size === filteredData.length && filteredData.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Məktəb
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Sektor</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 text-right"
                onClick={() => handleSort('rows')}
              >
                <div className="flex items-center gap-1 justify-end">
                  Sətir
                  {sortField === 'rows' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              {table.columns.filter(c => c.type === 'number').map(col => (
                <TableHead 
                  key={col.key}
                  className="cursor-pointer hover:bg-slate-100 text-right"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 justify-end">
                    {col.label}
                    {sortField === col.key && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((inst) => {
              const isExpanded = expandedInstitutions.has(inst.institution_id);
              const isSelected = selectedInstitutions.has(inst.institution_id);
              
              return (
                <React.Fragment key={inst.institution_id}>
                  <TableRow className={isSelected ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(inst.institution_id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{inst.institution_name}</div>
                      {inst.region_name && (
                        <div className="text-xs text-gray-500">{inst.region_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{inst.sector_name || '-'}</TableCell>
                    <TableCell><StatusBadge status={inst.status} /></TableCell>
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
                    {table.columns.filter(c => c.type === 'number').map(col => {
                      const values = inst.rows.map(r => Number(r[col.key])).filter(v => !isNaN(v));
                      const sum = values.reduce((a, b) => a + b, 0);
                      const stats = columnStats[col.key];
                      const anomaly = stats && values.length > 0 
                        ? detectAnomaly(sum / (values.length || 1), { avg: stats.average || 0, std: stats.max ? (stats.max - (stats.min || 0)) / 4 : 1 })
                        : null;
                      
                      return (
                        <TableCell key={col.key} className="text-right">
                          <div className={`font-mono ${anomaly === 'high' ? 'text-red-600 font-bold' : anomaly === 'low' ? 'text-blue-600' : ''}`}>
                            {formatCellValue(sum, col.format)}
                            {anomaly && <span className="ml-1 text-xs">{anomaly === 'high' ? '↑' : '↓'}</span>}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(inst.institution_id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row details */}
                  {isExpanded && viewMode === 'expanded' && (
                    <TableRow>
                      <TableCell colSpan={table.columns.filter(c => c.type === 'number').length + 5} className="bg-slate-50 p-0">
                        <div className="p-4">
                          <h5 className="font-medium mb-2">{inst.institution_name} - ətraflı məlumat</h5>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                {table.columns.map(col => (
                                  <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inst.rows.map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{idx + 1}</TableCell>
                                  {table.columns.map(col => (
                                    <TableCell key={col.key}>
                                      {formatCellValue(row[col.key], col.type === 'number' ? col.format : undefined)}
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    {/* Row status would go here */}
                                  </TableCell>
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
