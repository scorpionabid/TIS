import { Loader2 } from 'lucide-react';
import { LinkDatabaseTable } from './LinkDatabaseTable';
import { LinkDatabaseCardGrid } from './LinkDatabaseCardGrid';
import { LinkDatabaseEmptyState } from './LinkDatabaseEmptyState';
import { LinkDatabaseTableSkeleton, LinkDatabaseCardSkeleton } from './LinkDatabaseSkeleton';
import type { ViewMode, LinkShare, SortField, SortDirection } from '../types/linkDatabase.types';

interface LinkDatabaseContentProps {
  links: LinkShare[];
  viewMode: ViewMode;
  isLoading: boolean;
  isFetching: boolean;
  hasFilters: boolean;
  canCreate: boolean;
  selectedIds: Set<number>;
  sortBy: SortField;
  sortDirection: SortDirection;
  paginationMeta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  onSort: (field: SortField) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
  onRestore?: (link: LinkShare) => void;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export function LinkDatabaseContent({
  links,
  viewMode,
  isLoading,
  isFetching,
  hasFilters,
  canCreate,
  selectedIds,
  sortBy,
  sortDirection,
  paginationMeta,
  onSort,
  onToggleSelect,
  onSelectAll,
  onPageChange,
  onPerPageChange,
  onEdit,
  onDelete,
  onRestore,
  onCreateClick,
  onClearFilters,
}: LinkDatabaseContentProps) {
  // Initial loading
  if (isLoading) {
    return viewMode === 'table' ? <LinkDatabaseTableSkeleton /> : <LinkDatabaseCardSkeleton />;
  }

  // Empty state
  if (links.length === 0) {
    return (
      <LinkDatabaseEmptyState
        hasFilters={hasFilters}
        canCreate={canCreate}
        onCreateClick={onCreateClick}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="relative">
      {/* Refetch overlay */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {viewMode === 'table' ? (
        <LinkDatabaseTable
          links={links}
          selectedIds={selectedIds}
          sortBy={sortBy}
          sortDirection={sortDirection}
          paginationMeta={paginationMeta}
          onSort={onSort}
          onToggleSelect={onToggleSelect}
          onSelectAll={onSelectAll}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      ) : (
        <LinkDatabaseCardGrid
          links={links}
          selectedIds={selectedIds}
          paginationMeta={paginationMeta}
          onToggleSelect={onToggleSelect}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      )}
    </div>
  );
}
