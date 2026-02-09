import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const dataTableVariants = cva(
  "w-full border border-border rounded-md overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-card",
        striped: "bg-card",
        bordered: "bg-card border-border",
        minimal: "bg-transparent"
      },
      size: {
        default: "",
        compact: "text-xs",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface DataTableProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dataTableVariants> {
  columns: ColumnDef[];
  data: any[];
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
  };
  selection?: {
    enabled: boolean;
    selectedRows: any[];
    onSelectionChange: (selectedRows: any[]) => void;
    onSelectAll?: () => void;
  };
  actions?: React.ReactNode;
  empty?: {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
  };
}

export interface ColumnDef {
  id: string;
  header: string | React.ReactNode;
  accessor: string | ((row: any) => any);
  cell?: (row: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
  ({
    className,
    variant,
    size,
    columns,
    data,
    isLoading = false,
    onRowClick,
    onSort,
    sortColumn,
    sortDirection,
    pagination,
    selection,
    actions,
    empty,
    ...props
  }, ref) => {
    const [selectedRows, setSelectedRows] = React.useState<any[]>(selection?.selectedRows || []);

    const handleSort = (columnId: string) => {
      const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort?.(columnId, newDirection);
    };

    const handleRowSelection = (row: any, checked: boolean) => {
      if (checked) {
        setSelectedRows(prev => [...prev, row]);
      } else {
        setSelectedRows(prev => prev.filter(r => r.id !== row.id));
      }
      selection?.onSelectionChange?.(selectedRows);
    };

    const handleSelectAll = () => {
      if (selection?.enabled) {
        const allSelected = selectedRows.length === data.length;
        if (allSelected) {
          setSelectedRows([]);
        } else {
          setSelectedRows(data);
        }
        selection?.onSelectAll?.();
      }
    };

    const paginatedData = pagination 
      ? data.slice((pagination.page - 1) * pagination.perPage, pagination.page * pagination.perPage)
      : data;

    return (
      <div ref={ref} className={cn(dataTableVariants({ variant, size }), className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-4">
            {selection?.enabled && (
              <input
                type="checkbox"
                checked={selectedRows.length > 0 && selectedRows.length === data.length}
                indeterminate={selectedRows.length > 0 && selectedRows.length < data.length}
                onChange={handleSelectAll}
                className="rounded border-border"
              />
            )}
            <h3 className="text-lg font-semibold text-foreground">
              {typeof columns[0]?.header === 'string' ? columns[0]?.header : 'Data Table'}
            </h3>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-transparent"></div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {empty?.icon && (
                <div className="mb-4 text-muted-foreground">
                  {empty.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {empty?.title || 'No data available'}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {empty?.description || 'There are no records to display at the moment.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {selection?.enabled && (
                    <th className="w-12 p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.length > 0 && selectedRows.length === paginatedData.length}
                        indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={cn(
                        "p-3 text-left font-medium text-foreground",
                        column.sortable && "cursor-pointer hover:bg-muted",
                        column.className
                      )}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.header}</span>
                        {column.sortable && sortColumn === column.id && (
                          <span className="text-muted-foreground">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border hover:bg-muted cursor-pointer",
                      onRowClick && "hover:bg-accent"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selection?.enabled && (
                      <td className="w-12 p-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.some(r => r.id === row.id)}
                          onChange={(e) => handleRowSelection(row, e.target.checked)}
                          className="rounded border-border"
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = typeof column.accessor === 'function' 
                        ? column.accessor(row) 
                        : row[column.accessor];
                      
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            "p-3",
                            column.className
                          )}
                        >
                          {column.cell ? (
                            column.cell(row)
                          ) : (
                            <div className="max-w-xs truncate">
                              {value}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.perPage + 1} to {Math.min(pagination.page * pagination.perPage, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages || Math.ceil(pagination.total / pagination.perPage)}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= (pagination.totalPages || Math.ceil(pagination.total / pagination.perPage))}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

DataTable.displayName = "DataTable"

export { DataTable, type ColumnDef }
