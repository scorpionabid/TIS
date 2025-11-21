import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Link as LinkIcon, Search, FileText, Edit, Trash2 } from 'lucide-react';
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
  isRefreshing?: boolean;
  // New props for grouped selection
  selectedGroup?: GroupedLink | null;
  onSelectGroup?: (group: GroupedLink) => void;
  onResourceAction?: (resource: Resource, action: 'edit' | 'delete') => void;
}

const LinkSelectionCard: React.FC<LinkSelectionCardProps> = ({
  links,
  selectedLink,
  onSelect,
  isLoading,
  isRefreshing = false,
  selectedGroup,
  onSelectGroup,
  onResourceAction,
}) => {
  const [filters, setFilters] = useState<LinkGroupFilters>({});
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

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

  const shareScopeLabels: Record<string, string> = {
    public: 'Açıq səviyyə',
    regional: 'Regional səviyyə',
    sectoral: 'Sektor səviyyəsi',
    institutional: 'Müəssisə səviyyəsi',
    specific_users: 'Xüsusi istifadəçilər',
  };

  const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>, link: Resource) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(link);
    }
    onResourceAction?.({
      ...link,
      type: (link.type || 'link') as Resource['type'],
    }, 'edit');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onSelect?.(pendingDelete);
    onResourceAction?.({
      ...pendingDelete,
      type: (pendingDelete.type || 'link') as Resource['type'],
    }, 'delete');
    setPendingDelete(null);
  };

  return (
    <Card className="border border-border/60 bg-white shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Link seçimi</CardTitle>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Yenilənir
              </span>
            )}
          </div>
          <Badge variant="secondary">{filteredGroups.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Qrup seçin və paylaşdığı müəssisələrin siyahısına baxın.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {paginatedGroups.map((group) => {
              const isActive = isGroupSelected(group);
              return (
                <div
                  key={group.title}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleGroupClick(group)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleGroupClick(group);
                    }
                  }}
                  className={`w-full rounded-lg border p-2.5 sm:p-3 text-left transition ${
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
                    {onResourceAction && (
                    <div className="mt-2 space-y-1">
                      {group.links.slice(0, 3).map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1 text-xs"
                          onClick={(event) => event.stopPropagation()}
                        >
                    <div className="truncate">
                      {shareScopeLabels[link.share_scope || ''] || 'Səviyyə göstərilmir'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(event) => handleEditClick(event, link)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:bg-red-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDelete(link);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                      ))}
                      {group.links.length > 3 && (
                        <p className="text-[11px] text-muted-foreground">
                          ... və {group.links.length - 3} digər link
                        </p>
                      )}
                    </div>
                  )}
                  </div>
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

        <AlertDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Linki silmək istəyirsiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete?.title
                  ? `"${pendingDelete.title}" linki silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                  : 'Seçilmiş link silinəcək.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bağla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default LinkSelectionCard;
