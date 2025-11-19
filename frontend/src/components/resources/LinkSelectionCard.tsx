import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon, Search, FileText } from 'lucide-react';
import type { Resource } from '@/types/resources';
import {
  groupLinksByTitle,
  filterGroupedLinks,
  formatLinkDate,
  getLinkTypeBadgeClass,
  getShareScopeBadgeClass,
  type GroupedLink,
  type LinkGroupFilters
} from '@/utils/linkGrouping';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/common/TablePagination';

interface LinkSelectionCardProps {
  links: Resource[];
  selectedLink: Resource | null;
  onSelect: (link: Resource) => void;
  isLoading: boolean;
  // New props for grouped selection
  selectedGroup?: GroupedLink | null;
  onSelectGroup?: (group: GroupedLink) => void;
}

const LinkSelectionCard: React.FC<LinkSelectionCardProps> = ({
  links,
  selectedLink,
  onSelect,
  isLoading,
  selectedGroup,
  onSelectGroup,
}) => {
  const [filters, setFilters] = useState<LinkGroupFilters>({});

  // Group links by title
  const groupedLinks = useMemo(() => {
    return groupLinksByTitle(links);
  }, [links]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    return filterGroupedLinks(groupedLinks, filters);
  }, [groupedLinks, filters]);

  const pagination = usePagination(filteredGroups, {
    initialItemsPerPage: 5,
  });

  const paginatedGroups = pagination.paginatedItems;
  const shouldShowPagination = pagination.totalItems > pagination.itemsPerPage;

  // Determine if a group is selected (either by selectedGroup prop or by selectedLink being in the group)
  const isGroupSelected = (group: GroupedLink): boolean => {
    if (selectedGroup) {
      return selectedGroup.title.toLowerCase() === group.title.toLowerCase();
    }
    if (selectedLink) {
      return group.links.some(link => link.id === selectedLink.id);
    }
    return false;
  };

  const handleGroupClick = (group: GroupedLink) => {
    if (onSelectGroup) {
      onSelectGroup(group);
    } else {
      // Fallback: select the first link in the group
      if (group.links.length > 0) {
        onSelect(group.links[0]);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Link seçimi</CardTitle>
          <Badge variant="secondary">{filteredGroups.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Qrup seçin və paylaşdığı müəssisələrin siyahısına baxın.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.title_search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, title_search: e.target.value }))}
              placeholder="Başlıq axtar..."
              className="pl-9 h-9"
            />
          </div>
          <div className="relative">
            <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.description_search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, description_search: e.target.value }))}
              placeholder="İzah axtar..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Linklər yüklənir...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {filters.title_search || filters.description_search
              ? 'Filterə uyğun link tapılmadı.'
              : 'Heç bir link tapılmadı.'}
          </div>
        ) : (
        <div className="space-y-2">
            {paginatedGroups.map((group) => {
              const isActive = isGroupSelected(group);
              return (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => handleGroupClick(group)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{group.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {group.total_count} link
                      </Badge>
                      {isActive && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${getLinkTypeBadgeClass(group.link_type)}`}
                    >
                      {group.link_type.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${getShareScopeBadgeClass(group.share_scope)}`}
                    >
                      {group.share_scope}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatLinkDate(group.latest_created_at)}
                    </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      İzah: {group.description}
                    </p>
                  )}

                  {/* Unique URLs indicator */}
                  {group.unique_urls > 1 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {group.unique_urls} fərqli URL
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && links.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Hələlik heç bir link yaradılmayıb.
          </div>
        )}

        {!isLoading && shouldShowPagination && (
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={Math.max(1, pagination.totalPages || 1)}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.goToPage}
            onPrevious={pagination.goToPreviousPage}
            onNext={pagination.goToNextPage}
            canGoPrevious={pagination.canGoPrevious}
            canGoNext={pagination.canGoNext}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default LinkSelectionCard;
