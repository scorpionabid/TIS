import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Search,
  Download,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerformanceMonitor } from '@/utils/performance/hooks';

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableVirtualizedProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
  onRowEdit?: (row: T) => void;
  onRowDelete?: (row: T) => void;
  onBulkDelete?: (rows: T[]) => void;
  onExport?: () => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  virtualizeThreshold?: number; // Start virtualizing when data length exceeds this
  rowHeight?: number;
  maxHeight?: number;
}

const VirtualTableRow = React.memo(({ 
  index, 
  style, 
  data: { 
    paginatedData, 
    columns, 
    selectable, 
    selectedRows, 
    handleSelectRow, 
    onRowEdit, 
    onRowDelete 
  } 
}: any) => {
  const row = paginatedData[index];
  
  return (
    <div style={style} className="flex items-center border-b hover:bg-muted/50">
      {selectable && (
        <div className="flex items-center justify-center w-12 px-4">
          <Checkbox
            checked={selectedRows.has(row.id)}
            onCheckedChange={(checked) => handleSelectRow(row.id, !!checked)}
          />
        </div>
      )}
      {columns.map((column: Column<any>) => (
        <div
          key={String(column.key)}
          className={cn(
            "flex items-center px-4 flex-1 text-sm",
            column.width && `w-[${column.width}]`
          )}
        >
          {column.render 
            ? column.render(row[column.key], row)
            : String(row[column.key] || '')
          }
        </div>
      ))}
      {(onRowEdit || onRowDelete) && (
        <div className="flex items-center justify-center w-12 px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRowEdit && (
                <DropdownMenuItem onClick={() => onRowEdit(row)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Düzəliş et
                </DropdownMenuItem>
              )}
              {onRowDelete && (
                <DropdownMenuItem 
                  onClick={() => onRowDelete(row)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

VirtualTableRow.displayName = 'VirtualTableRow';

export function DataTableVirtualized<T extends { id: string | number }>({
  data,
  columns,
  pageSize = 50, // Increased for virtualization
  searchable = true,
  selectable = false,
  onRowSelect,
  onRowEdit,
  onRowDelete,
  onBulkDelete,
  onExport,
  loading = false,
  emptyState,
  className,
  virtualizeThreshold = 100, // Start virtualizing at 100 items
  rowHeight = 50,
  maxHeight = 400,
}: DataTableVirtualizedProps<T>) {
  usePerformanceMonitor('DataTableVirtualized');

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  // Optimized filtering with useMemo and better search algorithm
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return data.filter((row) => {
      // Use some() with early return for better performance
      return columns.some((column) => {
        const value = row[column.key];
        if (value == null) return false;
        
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(searchLower);
      });
    });
  }, [data, searchTerm, columns]);

  // Optimized sorting
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Type-aware comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const shouldVirtualize = paginatedData.length > virtualizeThreshold;

  const handleSort = useCallback((column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  }, [paginatedData]);

  const handleSelectRow = useCallback((rowId: string | number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    setSelectedRows(newSelection);
    
    if (onRowSelect) {
      const selectedData = data.filter(row => newSelection.has(row.id));
      onRowSelect(selectedData);
    }
  }, [selectedRows, data, onRowSelect]);

  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete) {
      const selectedData = data.filter(row => selectedRows.has(row.id));
      onBulkDelete(selectedData);
      setSelectedRows(new Set());
    }
  }, [onBulkDelete, data, selectedRows]);

  // Debounced search to prevent excessive filtering
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Axtarış..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-64"
              />
            </div>
          )}
          
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedRows.size} seçildi
              </Badge>
              {onBulkDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </Button>
              )}
            </div>
          )}
        </div>

        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Eksport
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {/* Table Header */}
        <div className="flex items-center bg-muted/50 border-b font-medium">
          {selectable && (
            <div className="flex items-center justify-center w-12 px-4 py-3">
              <Checkbox
                checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </div>
          )}
          {columns.map((column) => (
            <div
              key={String(column.key)}
              className={cn(
                "flex items-center px-4 py-3 flex-1 text-sm font-medium",
                column.sortable && "cursor-pointer hover:bg-muted select-none",
                column.width && `w-[${column.width}]`
              )}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <div className="flex items-center gap-2">
                {column.title}
                {column.sortable && sortColumn === column.key && (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </div>
            </div>
          ))}
          {(onRowEdit || onRowDelete) && (
            <div className="flex items-center justify-center w-12 px-4 py-3 text-sm font-medium">
              Əməliyyatlar
            </div>
          )}
        </div>

        {/* Table Body */}
        {paginatedData.length === 0 ? (
          <div className="text-center py-8">
            {emptyState || (
              <div className="text-muted-foreground">
                Məlumat tapılmadı
              </div>
            )}
          </div>
        ) : shouldVirtualize ? (
          /* Virtualized List for Large Datasets */
          <List
            height={Math.min(maxHeight, paginatedData.length * rowHeight)}
            itemCount={paginatedData.length}
            itemSize={rowHeight}
            itemData={{
              paginatedData,
              columns,
              selectable,
              selectedRows,
              handleSelectRow,
              onRowEdit,
              onRowDelete
            }}
          >
            {VirtualTableRow}
          </List>
        ) : (
          /* Regular Table for Small Datasets */
          <div>
            {paginatedData.map((row, index) => (
              <div key={row.id} className="flex items-center border-b hover:bg-muted/50">
                {selectable && (
                  <div className="flex items-center justify-center w-12 px-4">
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={(checked) => handleSelectRow(row.id, !!checked)}
                    />
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className={cn(
                      "flex items-center px-4 py-3 flex-1 text-sm",
                      column.width && `w-[${column.width}]`
                    )}
                  >
                    {column.render 
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')
                    }
                  </div>
                ))}
                {(onRowEdit || onRowDelete) && (
                  <div className="flex items-center justify-center w-12 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onRowEdit && (
                          <DropdownMenuItem onClick={() => onRowEdit(row)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Düzəliş et
                          </DropdownMenuItem>
                        )}
                        {onRowDelete && (
                          <DropdownMenuItem 
                            onClick={() => onRowDelete(row)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {sortedData.length} nəticədən {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedData.length)} göstərilir
            {shouldVirtualize && (
              <span className="ml-2 text-xs text-blue-600">
                (Virtualized: {paginatedData.length} items)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select
              value={currentPage.toString()}
              onValueChange={(value) => setCurrentPage(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}