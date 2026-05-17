/**
 * TableVersionHistory - Display and manage version history for report tables
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  History,
  RotateCcw,
  Eye,
  MoreVertical,
  GitBranch,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  Diff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import type { ReportTable, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';

export interface TableVersion {
  id: number;
  table_id: number;
  version_number: number;
  title: string;
  description?: string;
  columns: ReportTableColumn[];
  max_rows: number;
  target_institutions?: number[];
  deadline?: string;
  created_by: {
    id: number;
    name: string;
  };
  created_at: string;
  change_summary?: string;
  is_restorable: boolean;
}

interface TableVersionHistoryProps {
  table: ReportTable;
  trigger?: React.ReactNode;
}

// Mock API for versions - replace with actual API
const versionService = {
  async getVersions(tableId: number): Promise<TableVersion[]> {
    // TODO: Replace with actual API call
    // return apiClient.get(`report-tables/${tableId}/versions`);
    return [];
  },

  async restoreVersion(tableId: number, versionId: number): Promise<ReportTable> {
    // TODO: Replace with actual API call
    // return apiClient.post(`report-tables/${tableId}/versions/${versionId}/restore`);
    throw new Error('API not implemented');
  },

  async compareVersions(tableId: number, versionId1: number, versionId2: number): Promise<VersionDiff> {
    // TODO: Replace with actual API call
    throw new Error('API not implemented');
  },
};

interface VersionDiff {
  title?: { old: string; new: string };
  description?: { old: string; new: string };
  columns_added: ReportTableColumn[];
  columns_removed: ReportTableColumn[];
  columns_changed: Array<{
    key: string;
    label?: { old: string; new: string };
    type?: { old: string; new: string };
    formula?: { old: string; new: string };
  }>;
  max_rows?: { old: number; new: number };
  deadline?: { old: string; new: string };
}

export function TableVersionHistory({ table, trigger }: TableVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TableVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['table-versions', table.id],
    queryFn: () => versionService.getVersions(table.id),
    enabled: open,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: number) => versionService.restoreVersion(table.id, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Versiya bərpa edildi');
      setOpen(false);
    },
    onError: () => toast.error('Versiya bərpa edilə bilmədi'),
  });

  const handleCompareToggle = (versionId: number) => {
    setCompareVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const getChangeDescription = (version: TableVersion) => {
    if (version.change_summary) return version.change_summary;
    return 'Cədvəl redaktə edildi';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <History className="h-4 w-4" />
            Versiya tarixçəsi
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Versiya tarixçəsi
            <span className="text-sm font-normal text-gray-500">({table.title})</span>
          </DialogTitle>
          <DialogDescription>
            Cədvəlin əvvəlki versiyalarına baxın və lazım olduqda bərpa edin
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersions([]);
              }}
            >
              <Diff className="h-4 w-4 mr-1" />
              Müqayisə rejimi
            </Button>
            {compareMode && compareVersions.length === 2 && (
              <Button size="sm" variant="secondary">
                Müqayisə et
              </Button>
            )}
          </div>
          <Badge variant="secondary">
            Cari versiya: v{versions.length > 0 ? versions[0].version_number : 1}
          </Badge>
        </div>

        {compareMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm text-blue-700">
            Müqayisə üçün 2 versiya seçin
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Hələ versiya tarixçəsi yoxdur</p>
              <p className="text-sm">Cədvəl redaktə edildikdə versiya yaradılacaq</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {compareMode && <TableHead className="w-10" />}
                  <TableHead>Versiya</TableHead>
                  <TableHead>Dəyişikliklər</TableHead>
                  <TableHead>Yaradan</TableHead>
                  <TableHead>Tarix</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version, index) => (
                  <TableRow 
                    key={version.id}
                    className={index === 0 ? 'bg-emerald-50/50' : ''}
                  >
                    {compareMode && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={compareVersions.includes(version.id)}
                          onChange={() => handleCompareToggle(version.id)}
                          className="rounded"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-emerald-600">Cari</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{getChangeDescription(version)}</p>
                      <p className="text-xs text-gray-500">
                        {version.columns.length} sütun, {version.max_rows} sətir
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {version.created_by.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(version.created_at), 'dd MMM yyyy, HH:mm', { locale: az })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Eye className="h-4 w-4 mr-2" /> Bax
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>v{version.version_number} versiyası</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Sütunlar:</h4>
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Açar</TableHead>
                                          <TableHead>Etiket</TableHead>
                                          <TableHead>Tip</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {version.columns.map(col => (
                                          <TableRow key={col.key}>
                                            <TableCell className="font-mono text-sm">{col.key}</TableCell>
                                            <TableCell>{col.label}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{col.type}</Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {version.is_restorable && index > 0 && (
                            <DropdownMenuItem 
                              onClick={() => restoreMutation.mutate(version.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" /> Bərpa et
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TableVersionHistory;
