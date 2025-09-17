import React from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '@/contexts/LayoutContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export interface ResponsiveTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  mobileRender?: (value: any, row: any, index: number) => React.ReactNode;
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps {
  data: any[];
  columns: ResponsiveTableColumn[];
  onRowClick?: (row: any, index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: any, index: number) => string;
  actions?: (row: any, index: number) => React.ReactNode;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = "Məlumat tapılmadı",
  className,
  rowClassName,
  actions
}) => {
  const { isMobile } = useLayout();

  const visibleColumns = isMobile
    ? columns.filter(col => !col.hideOnMobile)
    : columns;

  if (loading) {
    return (
      <div className="space-y-3">
        {isMobile ? (
          // Mobile loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Desktop loading skeleton
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key}>
                        <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // Mobile card view using existing CSS classes
    return (
      <div className={cn("table-mobile space-y-3", className)}>
        {data.map((row, index) => (
          <Card
            key={index}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              rowClassName?.(row, index),
              onRowClick && "hover:bg-muted/50"
            )}
            onClick={() => onRowClick?.(row, index)}
          >
            <CardContent className="p-4 space-y-3">
              {visibleColumns.map((col) => {
                const value = row[col.key];
                const displayValue = col.mobileRender
                  ? col.mobileRender(value, row, index)
                  : col.render
                  ? col.render(value, row, index)
                  : value;

                return (
                  <div key={col.key} className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                      {col.label}:
                    </span>
                    <div className="text-sm font-medium text-right min-w-0 flex-1">
                      {displayValue}
                    </div>
                  </div>
                );
              })}

              {/* Actions section for mobile */}
              {actions && (
                <div className="pt-2 border-t border-border flex gap-2 flex-wrap">
                  {actions(row, index)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn("table-responsive", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
            {actions && <TableHead className="text-right">Əməliyyatlar</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              className={cn(
                rowClassName?.(row, index),
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => onRowClick?.(row, index)}
            >
              {visibleColumns.map((col) => {
                const value = row[col.key];
                const displayValue = col.render
                  ? col.render(value, row, index)
                  : value;

                return (
                  <TableCell key={col.key} className={col.className}>
                    {displayValue}
                  </TableCell>
                );
              })}
              {actions && (
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {actions(row, index)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Helper component for mobile-friendly status badges
export const MobileStatusBadge: React.FC<{
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}> = ({ status, variant = 'default' }) => (
  <Badge variant={variant} className="text-xs whitespace-nowrap">
    {status}
  </Badge>
);

// Helper component for mobile-friendly action buttons
export const MobileActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
}> = ({ onClick, children, variant = 'outline', size = 'sm' }) => (
  <Button
    variant={variant}
    size={size}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="h-8 px-2 text-xs"
  >
    {children}
  </Button>
);