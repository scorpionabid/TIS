import { TablePagination } from '@/components/common/TablePagination';
import { LinkDatabaseCardItem } from './LinkDatabaseCardItem';
import type { LinkShare } from '../types/linkDatabase.types';

interface LinkDatabaseCardGridProps {
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
}

export function LinkDatabaseCardGrid({
  links,
  selectedIds,
  paginationMeta,
  onToggleSelect,
  onPageChange,
  onPerPageChange,
  onEdit,
  onDelete,
  onRestore,
}: LinkDatabaseCardGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => (
          <LinkDatabaseCardItem
            key={link.id}
            link={link}
            isSelected={selectedIds.has(link.id)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
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
