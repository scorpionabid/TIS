import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Centralized loading state components
 * Provides consistent loading experiences across the application
 */

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

export interface TableSkeletonProps {
  columns: number;
  rows?: number;
  hasActions?: boolean;
  hasSelection?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows = 5,
  hasActions = false,
  hasSelection = false,
  className
}) => {
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
            )}
            {Array.from({ length: columns }, (_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
            {hasActions && (
              <TableHead className="text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {hasSelection && (
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              )}
              {Array.from({ length: columns }, (_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
              ))}
              {hasActions && (
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
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

export interface CardSkeletonProps {
  count?: number;
  hasImage?: boolean;
  hasStats?: boolean;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  count = 3,
  hasImage = false,
  hasStats = false,
  className
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              {hasImage && <Skeleton className="h-12 w-12 rounded" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            {hasStats && (
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export interface StatSkeletonProps {
  count?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const StatSkeleton: React.FC<StatSkeletonProps> = ({
  count = 4,
  orientation = 'horizontal',
  className
}) => {
  const gridClass = orientation === 'horizontal' 
    ? `grid-cols-${Math.min(count, 4)}` 
    : 'grid-cols-1';

  return (
    <div className={cn(`grid gap-4 ${gridClass}`, className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export interface FormSkeletonProps {
  fields?: number;
  columns?: 1 | 2;
  hasTabs?: boolean;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 6,
  columns = 2,
  hasTabs = false,
  className
}) => {
  const gridClass = columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

  return (
    <div className={cn('space-y-6', className)}>
      {hasTabs && (
        <div className="flex space-x-2 border-b">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
      )}
      <div className={cn(`grid gap-4 ${gridClass}`)}>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

export interface ListSkeletonProps {
  count?: number;
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
  hasImage = false,
  hasActions = false,
  className
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          {hasImage && <Skeleton className="h-12 w-12 rounded" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          {hasActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export interface LoadingStateProps {
  type: 'table' | 'cards' | 'form' | 'list' | 'stats' | 'spinner';
  message?: string;
  className?: string;
  // Table specific
  columns?: number;
  rows?: number;
  hasActions?: boolean;
  hasSelection?: boolean;
  // Card specific
  cardCount?: number;
  hasImage?: boolean;
  hasStats?: boolean;
  // Form specific
  fields?: number;
  formColumns?: 1 | 2;
  hasTabs?: boolean;
  // Spinner specific
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type,
  message = 'Yüklənir...',
  className,
  // Table props
  columns = 4,
  rows = 5,
  hasActions = false,
  hasSelection = false,
  // Card props
  cardCount = 3,
  hasImage = false,
  hasStats = false,
  // Form props
  fields = 6,
  formColumns = 2,
  hasTabs = false,
  // Spinner props
  size = 'md'
}) => {
  switch (type) {
    case 'table':
      return (
        <TableSkeleton
          columns={columns}
          rows={rows}
          hasActions={hasActions}
          hasSelection={hasSelection}
          className={className}
        />
      );
    case 'cards':
      return (
        <CardSkeleton
          count={cardCount}
          hasImage={hasImage}
          hasStats={hasStats}
          className={className}
        />
      );
    case 'form':
      return (
        <FormSkeleton
          fields={fields}
          columns={formColumns}
          hasTabs={hasTabs}
          className={className}
        />
      );
    case 'list':
      return (
        <ListSkeleton
          count={cardCount}
          hasImage={hasImage}
          hasActions={hasActions}
          className={className}
        />
      );
    case 'stats':
      return (
        <StatSkeleton
          count={cardCount}
          className={className}
        />
      );
    case 'spinner':
    default:
      return (
        <LoadingSpinner
          size={size}
          text={message}
          className={className}
        />
      );
  }
};