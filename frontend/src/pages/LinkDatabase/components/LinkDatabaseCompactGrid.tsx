import React from 'react';
import { TablePagination } from '@/components/common/TablePagination';
import { LinkDatabaseCompactItem } from './LinkDatabaseCompactItem';
import type { LinkShare } from '../types/linkDatabase.types';

interface LinkDatabaseCompactGridProps {
  links: LinkShare[];
  selectedIds: Set<number>;
  paginationMeta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  onToggleSelect: (id: number) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
  onRestore?: (link: LinkShare) => void;
  onTrack?: (link: LinkShare) => void;
}

export function LinkDatabaseCompactGrid({
  links,
  selectedIds,
  paginationMeta,
  onToggleSelect,
  onPageChange,
  onPerPageChange,
  onEdit,
  onDelete,
  onRestore,
  onTrack,
}: LinkDatabaseCompactGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {links.map((link) => (
          <LinkDatabaseCompactItem
            key={link.id}
            link={link}
            isSelected={selectedIds.has(link.id)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
            onTrack={onTrack}
          />
        ))}
      </div>

      {/* Pagination */}
      {paginationMeta.total > 0 && (
        <TablePagination
          currentPage={paginationMeta.currentPage}
          totalPages={paginationMeta.lastPage}
          total={paginationMeta.total}
          perPage={paginationMeta.perPage}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
