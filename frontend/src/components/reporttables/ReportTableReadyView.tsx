import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Eye, Download, FileSpreadsheet, Loader2, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ReportTable, ReportTableResponse, RowStatuses, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';
import { useAuth } from '@/contexts/AuthContextOptimized';

interface ReportTableReadyViewProps {
  tables?: ReportTable[];
  tableId?: number;
  showAsList?: boolean;
}

interface ApprovedResponse {
  id: number;
  report_table_id: number;
  institution_id: number;
  institution_name?: string;
  sector_name?: string;
  respondent_name?: string;
  submitted_at?: string;
  approved_at?: string;
  status: 'approved';
  rows: Record<string, unknown>[];
  row_count: number;
  row_statuses?: RowStatuses;
}

// Flat row interface for table display
interface FlatApprovedRow {
  id: string; // unique id: responseId + rowIndex
  response_id: number;
  institution_id: number;
  institution_name: string;
  sector_name: string;
  row_index: number;
  row_data: Record<string, unknown>;
  approved_at?: string;
  submitted_at?: string;
}

export function ReportTableReadyView({ tables: propTables, tableId, showAsList = false }: ReportTableReadyViewProps) {
  const [viewingTable, setViewingTable] = useState<ReportTable | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const { currentUser } = useAuth();

  // Get user's sector name (for sektoradmin, their institution IS the sector)
  const userSectorName = currentUser?.institution?.name || null;
  const isSectorAdmin = currentUser?.role === 'sektoradmin';

  // Fetch approved responses for the table
  const { data: approvedResponses = [], isLoading } = useQuery<ApprovedResponse[]>({
    queryKey: ['approved-responses', tableId],
    queryFn: async () => {
      if (!tableId) return [];
      // Get all responses for the table using the correct method
      const result = await reportTableService.getResponses(tableId);
      const responses = result.data || [];
      
      // DEBUG: Log the actual response structure
      console.log('All responses:', responses);
      if (responses.length > 0) {
        console.log('First response structure:', JSON.stringify(responses[0], null, 2));
      }
      
      // Filter responses that have at least one approved row
      const approved = responses.filter((r: ReportTableResponse) => {
        // Check if response has approved status
        if (r.status === 'approved') return true;
        
        // Check if any row is approved (using row_statuses object)
        const rowStatuses = r.row_statuses ?? {};
        for (const [idx, meta] of Object.entries(rowStatuses)) {
          if (meta.status === 'approved') {
            return true;
          }
        }
        
        return false;
      }).map((r: ReportTableResponse) => ({
        ...r,
        // Müəssisə adını düzgün götür - institution.name istifadə et
        institution_name: r.institution?.name || 'Müəssisə #' + r.institution_id,
        sector_name: r.institution?.parent?.name || '-',
        row_count: r.rows?.length || 0,
      })) as unknown as ApprovedResponse[];
      
      // FILTER BY SECTOR: Only show responses from the user's sector
      let filteredApproved = approved;
      if (isSectorAdmin && userSectorName) {
        filteredApproved = approved.filter((r: ApprovedResponse) => r.sector_name === userSectorName);
      }
      
      console.log('Approved responses (filtered by sector):', filteredApproved);
      return filteredApproved;
    },
    enabled: !!tableId,
  });

  // Fetch table data if tableId is provided
  const { data: tableData } = useQuery<ReportTable | null>({
    queryKey: ['table-detail', tableId],
    queryFn: async () => {
      if (!tableId) return null;
      return await reportTableService.getTable(tableId);
    },
    enabled: !!tableId,
  });

  const table = tableData || (propTables?.[0] ?? null);

  // Convert approved responses to flat rows (Excel-like structure)
  const flatApprovedRows: FlatApprovedRow[] = useMemo(() => {
    const rows: FlatApprovedRow[] = [];
    
    approvedResponses.forEach((response) => {
      const rowStatuses = response.row_statuses ?? {};
      
      response.rows?.forEach((rowData, index) => {
        // Only include approved rows
        const rowMeta = rowStatuses[String(index)];
        if (rowMeta?.status === 'approved' || response.status === 'approved') {
          rows.push({
            id: `${response.id}-${index}`,
            response_id: response.id,
            institution_id: response.institution_id,
            institution_name: response.institution_name || 'Müəssisə #' + response.institution_id,
            sector_name: response.sector_name || '-',
            row_index: index + 1, // 1-based row number
            row_data: rowData,
            approved_at: response.approved_at,
            submitted_at: response.submitted_at,
          });
        }
      });
    });
    
    return rows;
  }, [approvedResponses]);

  // Group by sector
  const sectorGroups = useMemo(() => {
    const groups = new Map<string, { sectorName: string; rows: FlatApprovedRow[] }>();
    
    flatApprovedRows.forEach((row) => {
      const sectorKey = row.sector_name;
      if (!groups.has(sectorKey)) {
        groups.set(sectorKey, { sectorName: sectorKey, rows: [] });
      }
      groups.get(sectorKey)!.rows.push(row);
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      a.sectorName.localeCompare(b.sectorName, 'az')
    );
  }, [flatApprovedRows]);

  const handleExport = async (table: ReportTable) => {
    try {
      await reportTableService.exportApprovedRows(table.id, table.title);
      toast.success('Excel faylı yükləndi (yalnız təsdiqlənmiş sətirlər)');
    } catch (error) {
      toast.error('Export zamanı xəta baş verdi');
    }
  };

  const toggleSector = (sectorName: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorName)) {
        next.delete(sectorName);
      } else {
        next.add(sectorName);
      }
      return next;
    });
  };

  // Render cell value based on column type
  const renderCellValue = (value: unknown, column?: ReportTableColumn): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (column?.type === 'boolean') return value ? 'Bəli' : 'Xeyr';
    return String(value);
  };

  // Table View (Excel-like) - showAsList mode
  if (showAsList) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (!table) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">Cədvəl məlumatı yüklənir...</p>
        </div>
      );
    }

    if (flatApprovedRows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">Hazır cavab yoxdur</p>
          <p className="text-xs mt-1">Təsdiqlənmiş cavablar burada görünəcək</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-base">{table.title}</h3>
            <p className="text-sm text-gray-500">
              {flatApprovedRows.length} təsdiqlənmiş sətir
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport(table)}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>

        {/* Sector-grouped tables */}
        {sectorGroups.length > 0 ? (
          <div className="space-y-3">
            {sectorGroups.map((group) => {
              const isExpanded = expandedSectors.has(group.sectorName);
              
              return (
                <Collapsible
                  key={group.sectorName}
                  open={isExpanded}
                  onOpenChange={() => toggleSector(group.sectorName)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-emerald-600" />
                        )}
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-gray-800 text-sm">
                          {group.sectorName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs bg-white">
                          {group.rows.length} sətir
                        </Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                      <div className="w-full">
                        <Table className="w-full">
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="w-12 text-center font-semibold text-xs">№</TableHead>
                              <TableHead className="min-w-[180px] font-semibold text-xs text-left">Müəssisə</TableHead>
                              
                              {/* Dynamic columns from table definition */}
                              {table.columns?.map((col) => (
                                <TableHead key={col.key} className="min-w-[120px] font-semibold text-xs text-left">
                                  {col.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.rows.map((row, idx) => (
                              <TableRow key={row.id} className="hover:bg-gray-50/50">
                                {/* Row number in sector */}
                                <TableCell className="text-center text-xs text-gray-500">
                                  {idx + 1}
                                </TableCell>
                                
                                {/* Institution name */}
                                <TableCell className="text-sm text-left">
                                  {row.institution_name}
                                </TableCell>
                                
                                {/* Dynamic cell values */}
                                {table.columns?.map((col) => (
                                  <TableCell key={col.key} className="text-sm text-left">
                                    {renderCellValue(row.row_data[col.key], col)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>Məlumat tapılmadı</p>
          </div>
        )}
      </div>
    );
  }

  // Card View (original)

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">Hazır cədvəl yoxdur</p>
        <p className="text-sm mt-1 max-w-md text-center">
          Təsdiqlənmiş və cavabları olan cədvəllər burada göstəriləcək.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Hazır cədvəllər</h2>
          <p className="text-sm text-gray-500">
            {propTables?.length ?? 0} cədvəl təsdiqlənmiş cavablarla
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {propTables?.map((table) => (
          <Card key={table.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold line-clamp-2">
                  {table.title}
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                  Hazır
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{table.responses_count}</span> cavab
                  {table.target_institutions && (
                    <span className="ml-2">
                      / {table.target_institutions.length} müəssisə
                    </span>
                  )}
                </div>
                
                {table.deadline && (
                  <div className="text-xs text-gray-400">
                    Son tarix: {new Date(table.deadline).toLocaleDateString('az-AZ')}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setViewingTable(table)}
                  >
                    <Eye className="h-4 w-4" />
                    Bax
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleExport(table)}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Dialog */}
      {viewingTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{viewingTable.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewingTable(null)}>
                Bağla
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">
                Bu cədvəl {viewingTable.responses_count} məktəbdən cavab alıb.
              </p>
              {/* TODO: Add detailed response view */}
              <div className="text-center py-8 text-gray-400">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Cavabların detallı görünüşü hazırlanma mərhələsindədir</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
