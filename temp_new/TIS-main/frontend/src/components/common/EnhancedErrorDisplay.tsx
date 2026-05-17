import React, { useState, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Table as TableIcon,
  List
} from 'lucide-react';
import { ImportError } from '@/services/regionadmin/classes';
import * as XLSX from 'xlsx';

interface EnhancedErrorDisplayProps {
  errors: string[]; // Simple string errors (backward compatible)
  structuredErrors?: ImportError[]; // Detailed error objects
  onExport?: () => void;
}

type ErrorSeverity = 'error' | 'warning' | 'info';
type ViewMode = 'list' | 'table' | 'grouped';

interface ErrorGroup {
  type: string;
  severity: ErrorSeverity;
  count: number;
  errors: ImportError[];
  expanded: boolean;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  errors,
  structuredErrors,
  onExport
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group errors by type/message
  const errorGroups = useMemo(() => {
    if (!structuredErrors || structuredErrors.length === 0) return [];

    const groups = new Map<string, ErrorGroup>();

    structuredErrors.forEach(error => {
      // Create group key based on error message pattern
      const groupKey = error.error.replace(/['"'][^'"']*['"']/g, '***'); // Replace dynamic values

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          type: groupKey,
          severity: error.severity,
          count: 0,
          errors: [],
          expanded: false
        });
      }

      const group = groups.get(groupKey)!;
      group.count++;
      group.errors.push(error);
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by severity (error > warning > info) then by count
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : b.count - a.count;
    });
  }, [structuredErrors]);

  // Filter errors
  const filteredErrors = useMemo(() => {
    if (!structuredErrors) return [];

    return structuredErrors.filter(error => {
      const severityMatch = severityFilter === 'all' || error.severity === severityFilter;
      const fieldMatch = fieldFilter === 'all' || error.field === fieldFilter;
      return severityMatch && fieldMatch;
    });
  }, [structuredErrors, severityFilter, fieldFilter]);

  // Get unique fields for filter
  const uniqueFields = useMemo(() => {
    if (!structuredErrors) return [];
    const fields = new Set(structuredErrors.map(e => e.field).filter(Boolean));
    return Array.from(fields) as string[];
  }, [structuredErrors]);

  // Severity counts
  const severityCounts = useMemo(() => {
    if (!structuredErrors) return { error: 0, warning: 0, info: 0 };

    return structuredErrors.reduce((acc, err) => {
      acc[err.severity]++;
      return acc;
    }, { error: 0, warning: 0, info: 0 });
  }, [structuredErrors]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(errorGroups.map(g => g.type)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getSeverityBadgeColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    }
  };

  const exportToExcel = () => {
    if (!structuredErrors || structuredErrors.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Xəta Hesabatı'],
      [''],
      ['Ümumi Statistika'],
      ['Kritik Xətalar', severityCounts.error],
      ['Xəbərdarlıqlar', severityCounts.warning],
      ['Məlumatlar', severityCounts.info],
      ['Ümumi', structuredErrors.length],
      [''],
      ['Ən çox rast gələn xətalar'],
      ...errorGroups.slice(0, 10).map(g => [g.errors[0].error, g.count])
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Xülasə');

    // Detailed errors sheet
    const detailsData = [
      ['Sətir', 'Sahə', 'Dəyər', 'Xəta', 'Təklif', 'Səviyyə', 'UTIS Kod', 'Müəssisə', 'Sinif'],
      ...structuredErrors.map(err => [
        err.row ?? '',
        err.field ?? '',
        err.value ?? '',
        err.error,
        err.suggestion ?? '',
        err.severity,
        err.context.utis_code ?? '',
        err.context.institution_name ?? '',
        `${err.context.class_level ?? ''}${err.context.class_name ?? ''}`
      ])
    ];

    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsSheet, 'Detallı Xətalar');

    XLSX.writeFile(wb, `sinif_import_xetalari_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!structuredErrors || structuredErrors.length === 0) {
    // Fallback to simple error list
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Xətalar ({errors.length}):</p>
            <ul className="list-disc list-inside text-sm space-y-1 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Xətalar ({filteredErrors.length})</h3>

          {/* Severity Filter */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={severityFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('all')}
              className="h-7 text-xs"
            >
              Hamısı ({structuredErrors.length})
            </Button>
            <Button
              size="sm"
              variant={severityFilter === 'error' ? 'destructive' : 'outline'}
              onClick={() => setSeverityFilter('error')}
              className="h-7 text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Xəta ({severityCounts.error})
            </Button>
            <Button
              size="sm"
              variant={severityFilter === 'warning' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('warning')}
              className="h-7 text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Xəbərdarlıq ({severityCounts.warning})
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              onClick={() => setViewMode('grouped')}
              className="h-7 text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              Qruplanmış
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="h-7 text-xs"
            >
              <List className="h-3 w-3 mr-1" />
              Siyahı
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => setViewMode('table')}
              className="h-7 text-xs"
            >
              <TableIcon className="h-3 w-3 mr-1" />
              Cədvəl
            </Button>
          </div>

          {/* Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={exportToExcel}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Excel Yüklə
          </Button>
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-2">
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="ghost" onClick={expandAll} className="h-6 text-xs">
              Hamısını Aç
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll} className="h-6 text-xs">
              Hamısını Bağla
            </Button>
          </div>

          {errorGroups
            .filter(group => {
              if (severityFilter === 'all') return true;
              return group.severity === severityFilter;
            })
            .map((group, index) => {
              const isExpanded = expandedGroups.has(group.type);
              return (
                <div key={index} className={`border rounded-lg ${getSeverityColor(group.severity)}`}>
                  <button
                    onClick={() => toggleGroup(group.type)}
                    className="w-full p-3 flex items-center justify-between hover:bg-black/5 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {getSeverityIcon(group.severity)}
                      <span className="font-medium text-sm">{group.errors[0].error}</span>
                    </div>
                    <Badge className={getSeverityBadgeColor(group.severity)}>
                      {group.count} dəfə
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="border-t p-3 bg-white/50">
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {group.errors.map((error, idx) => (
                          <div key={idx} className="text-xs p-2 bg-white rounded border">
                            <div className="font-medium">Sətir {error.row}</div>
                            {error.context.institution_name && (
                              <div className="text-muted-foreground">
                                Müəssisə: {error.context.institution_name}
                              </div>
                            )}
                            {error.field && (
                              <div className="text-muted-foreground">
                                Sahə: {error.field} = "{error.value}"
                              </div>
                            )}
                            {error.suggestion && (
                              <div className="text-green-700 mt-1">
                                💡 Təklif: {error.suggestion}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.map((error, index) => (
            <Alert key={index} className={getSeverityColor(error.severity)}>
              {getSeverityIcon(error.severity)}
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">
                    {error.row && `Sətir ${error.row}: `}{error.error}
                  </div>
                  {error.field && (
                    <div className="text-xs text-muted-foreground">
                      Sahə: {error.field} = "{error.value}"
                    </div>
                  )}
                  {error.suggestion && (
                    <div className="text-xs font-medium text-green-700">
                      💡 {error.suggestion}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead className="w-16">Sətir</TableHead>
                  <TableHead className="w-32">Səviyyə</TableHead>
                  <TableHead className="w-32">Sahə</TableHead>
                  <TableHead>Xəta</TableHead>
                  <TableHead>Təklif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredErrors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{error.row}</TableCell>
                    <TableCell>
                      <Badge className={getSeverityBadgeColor(error.severity)}>
                        {error.severity === 'error' ? 'Xəta' : error.severity === 'warning' ? 'Xəbərdarlıq' : 'Məlumat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{error.field}</TableCell>
                    <TableCell className="text-sm">{error.error}</TableCell>
                    <TableCell className="text-xs text-green-700">{error.suggestion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
