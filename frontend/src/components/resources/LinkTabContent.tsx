import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Resource } from '@/types/resources';
import { LinkFilters } from '@/components/resources/LinkFilterPanel';
import { GroupingMode, GroupedResources } from '@/hooks/useResourceGrouping';
import { ResourceGroupingToolbar } from '@/components/resources/ResourceGroupingToolbar';
import { LinkFilterPanelMinimalist } from '@/components/resources/LinkFilterPanelMinimalist';
import { LinkFilterResultsSummary } from '@/components/resources/LinkFilterResultsSummary';
import { TablePagination } from '@/components/common/TablePagination';
import LinkManagementTable from '@/components/resources/LinkManagementTable';
import { GroupedResourceDisplay } from '@/components/resources/GroupedResourceDisplay';
import LinkSelectionCard from '@/components/resources/LinkSelectionCard';
import LinkSharingOverview from '@/components/resources/LinkSharingOverview';
import { LinkSharingOverview as LinkSharingOverviewType } from '@/services/resources';

interface InstitutionMeta {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
}

interface LinkTabContentProps {
  error: unknown;
  linkData: Resource[];
  filteredLinkCount: number;
  isRefreshing: boolean;
  filters: LinkFilters;
  onFiltersChange: (filters: LinkFilters) => void;
  institutionOptions: Array<{ id: number; name: string }>;
  filterPanelOpen: boolean;
  onToggleFilters: () => void;
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
  groupingMode: GroupingMode;
  onChangeGroupingMode: (mode: GroupingMode) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (by: string, direction: 'asc' | 'desc') => void;
  linkTotal: number;
  isLinkLoading: boolean;
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  groupedLinkResources: GroupedResources[];
  institutionDirectory: Record<number, string>;
  userDirectory: Record<number, string>;
  selectedLink: Resource | null;
  onSelectLink: (link: Resource) => void;
  linkSharingOverview: LinkSharingOverviewType | null | undefined;
  sharingOverviewLoading: boolean;
  onRetrySharingOverview: () => void;
  institutionMetadata: Record<number, InstitutionMeta>;
  showLinkDetails: boolean;
  onRetryLinks?: () => void;
}

export const LinkTabContent: React.FC<LinkTabContentProps> = ({
  error,
  linkData,
  filteredLinkCount,
  isRefreshing,
  filters,
  onFiltersChange,
  institutionOptions,
  filterPanelOpen,
  onToggleFilters,
  pagination,
  groupingMode,
  onChangeGroupingMode,
  sortBy,
  sortDirection,
  onSortChange,
  linkTotal,
  isLinkLoading,
  onResourceAction,
  groupedLinkResources,
  institutionDirectory,
  userDirectory,
  selectedLink,
  onSelectLink,
  linkSharingOverview,
  sharingOverviewLoading,
  onRetrySharingOverview,
  institutionMetadata,
  showLinkDetails,
  onRetryLinks,
}) => {
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Linklər yüklənə bilmədi</AlertTitle>
            </div>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Link məlumatlarını yükləyərkən gözlənilməz xəta baş verdi.'}
            </AlertDescription>
            {onRetryLinks && (
              <div>
                <Button variant="outline" size="sm" onClick={onRetryLinks}>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Yenidən cəhd et
                </Button>
              </div>
            )}
          </div>
        </Alert>
      )}

      {showLinkDetails ? (
        <>
          <ResourceGroupingToolbar
            groupingMode={groupingMode}
            onGroupingModeChange={onChangeGroupingMode}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />

          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {linkData.length} link göstərilir (ümumi {filteredLinkCount})
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Yenilənir...
              </span>
            )}
          </p>

          <LinkFilterPanelMinimalist
            filters={filters}
            onFiltersChange={onFiltersChange}
            availableInstitutions={institutionOptions}
            isOpen={filterPanelOpen}
            onToggle={onToggleFilters}
          />

          <LinkFilterResultsSummary resources={linkData} totalCount={filteredLinkCount} />

          <TablePagination
            currentPage={pagination.current}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.perPage}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.onPageChange}
            onItemsPerPageChange={pagination.onPerPageChange}
            onPrevious={() => pagination.onPageChange(Math.max(1, pagination.current - 1))}
            onNext={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.current + 1))}
            canGoPrevious={pagination.current > 1}
            canGoNext={pagination.current < pagination.totalPages}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
              <LinkManagementTable
                links={linkData}
                totalCount={linkTotal}
                isLoading={isLinkLoading}
                isRefreshing={isRefreshing}
                onResourceAction={onResourceAction}
              />
              <GroupedResourceDisplay
                groups={groupedLinkResources}
                onResourceAction={onResourceAction}
                institutionDirectory={institutionDirectory}
                userDirectory={userDirectory}
                defaultExpanded={groupingMode !== 'none'}
                enablePagination
                groupsPerPage={6}
              />
            </div>

            <div className="space-y-4">
              <LinkSelectionCard
                links={linkData}
                selectedLink={selectedLink}
                onSelect={onSelectLink}
                isLoading={isLinkLoading}
                isRefreshing={isRefreshing}
                onResourceAction={onResourceAction}
              />
              <LinkSharingOverview
                selectedLink={selectedLink}
                overview={linkSharingOverview}
                isLoading={sharingOverviewLoading}
                onRetry={onRetrySharingOverview}
                institutionMetadata={institutionMetadata}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <LinkSelectionCard
            links={linkData}
            selectedLink={selectedLink}
            onSelect={onSelectLink}
            isLoading={isLinkLoading}
            isRefreshing={isRefreshing}
            onResourceAction={onResourceAction}
          />
          <LinkSharingOverview
            selectedLink={selectedLink}
            overview={linkSharingOverview}
            isLoading={sharingOverviewLoading}
            onRetry={onRetrySharingOverview}
            institutionMetadata={institutionMetadata}
          />
        </div>
      )}
    </>
  );
};

export default LinkTabContent;
