import React from 'react';
import DocumentFilterPanel from '@/components/resources/DocumentFilterPanel';
import { DocumentFilterResultsSummary } from '@/components/resources/DocumentFilterResultsSummary';
import DocumentTable from '@/components/resources/DocumentTable';
import { TablePagination } from '@/components/common/TablePagination';
import { Resource } from '@/types/resources';
import { LinkFilters } from '@/components/resources/LinkFilterPanel';

interface DocumentTabContentProps {
  filters: LinkFilters;
  onFiltersChange: (filters: LinkFilters) => void;
  documentFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  institutionOptions: Array<{ id: number; name: string }>;
  creatorOptions: Array<{ id: number; label: string }>;
  documentResources: Resource[];
  totalCount?: number;
  pagination: {
    current: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    startIndex: number;
    endIndex: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (value: number) => void;
  };
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

const DocumentTabContent: React.FC<DocumentTabContentProps> = ({
  filters,
  onFiltersChange,
  documentFilterPanelOpen,
  onToggleFilterPanel,
  institutionOptions,
  creatorOptions,
  documentResources,
  totalCount,
  pagination,
  onResourceAction,
  userDirectory,
}) => {
  return (
    <div className="mt-6 space-y-4">
      <DocumentFilterPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableInstitutions={institutionOptions}
        availableCreators={creatorOptions}
        isOpen={documentFilterPanelOpen}
        onToggle={onToggleFilterPanel}
      />
      <DocumentFilterResultsSummary
        resources={documentResources}
        totalCount={totalCount}
      />
      <DocumentTable
        documents={documentResources}
        onResourceAction={onResourceAction}
        userDirectory={userDirectory}
      />
      {pagination.totalItems > 0 && (
        <TablePagination
          currentPage={pagination.current}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.perPage}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.onPageChange}
          onPrevious={() => pagination.onPageChange(Math.max(1, pagination.current - 1))}
          onNext={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.current + 1))}
          canGoPrevious={pagination.current > 1}
          canGoNext={pagination.current < pagination.totalPages}
          onItemsPerPageChange={pagination.onPerPageChange}
        />
      )}
    </div>
  );
};

export default DocumentTabContent;
