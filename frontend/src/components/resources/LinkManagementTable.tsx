import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  X,
  Building2
} from 'lucide-react';
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

interface LinkManagementTableProps {
  links: Resource[];
  isLoading: boolean;
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  onBulkDelete?: (links: Resource[]) => Promise<void> | void;
}

const LinkManagementTable: React.FC<LinkManagementTableProps> = ({
  links,
  isLoading,
  onResourceAction,
  onBulkDelete,
}) => {
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<GroupedLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter states
  const [filters, setFilters] = useState<LinkGroupFilters>({});

  // Group links by title
  const groupedLinks = useMemo(() => {
    return groupLinksByTitle(links);
  }, [links]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    return filterGroupedLinks(groupedLinks, filters);
  }, [groupedLinks, filters]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onResourceAction(pendingDelete, 'delete');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (!pendingBulkDelete || !onBulkDelete) return;
    setIsDeleting(true);
    try {
      await onBulkDelete(pendingBulkDelete.links);
    } finally {
      setIsDeleting(false);
      setPendingBulkDelete(null);
    }
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Boolean(
    filters.title_search ||
    filters.description_search ||
    (filters.link_type && filters.link_type !== 'all') ||
    (filters.share_scope && filters.share_scope !== 'all')
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Mövcud Linklər</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cəmi {links.length} link, {groupedLinks.length} unikal başlıq
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter Panel */}
          <div className="space-y-3 pb-3 border-b">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.link_type || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, link_type: value }))}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Növ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün növlər</SelectItem>
                  <SelectItem value="external">Xarici link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="form">Forma</SelectItem>
                  <SelectItem value="document">Sənəd</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.share_scope || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, share_scope: value }))}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Paylaşım" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sahələr</SelectItem>
                  <SelectItem value="public">Açıq</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="sectoral">Sektoral</SelectItem>
                  <SelectItem value="institutional">İnstitusional</SelectItem>
                  <SelectItem value="specific_users">Xüsusi</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Təmizlə
                </Button>
              )}
            </div>
          </div>

          {/* Grouped Links */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Linklər yüklənir...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Filterə uyğun link tapılmadı.'
                  : 'Hələlik link əlavə olunmayıb.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.title);

                return (
                  <Collapsible
                    key={group.title}
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 text-left hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{group.title}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {group.total_count} link
                                  </Badge>
                                </div>
                                {group.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${getLinkTypeBadgeClass(group.link_type)}`}
                              >
                                {group.link_type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${getShareScopeBadgeClass(group.share_scope)}`}
                              >
                                {group.share_scope}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      {/* Expanded Content */}
                      <CollapsibleContent>
                        <div className="border-t bg-muted/30">
                          {/* Individual Links Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      Məktəb/Qurum
                                    </div>
                                  </th>
                                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">
                                    URL
                                  </th>
                                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">
                                    Tarix
                                  </th>
                                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">
                                    Əməliyyat
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {group.links.slice(0, 10).map((link) => (
                                  <tr key={link.id} className="hover:bg-muted/30">
                                    <td className="py-2 px-3">
                                      <span className="text-sm">
                                        {link.institution?.name || 'Bilinməyən'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      {link.url && (
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          <span className="truncate max-w-[150px]">
                                            {new URL(link.url).hostname}
                                          </span>
                                        </a>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-muted-foreground">
                                      {formatLinkDate(link.created_at || '')}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onResourceAction(link, 'edit');
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingDelete(link);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Show more indicator */}
                          {group.links.length > 10 && (
                            <div className="py-2 px-3 text-center text-xs text-muted-foreground bg-muted/50 border-t">
                              ... və {group.links.length - 10} daha
                            </div>
                          )}

                          {/* Bulk Actions */}
                          {onBulkDelete && group.links.length > 1 && (
                            <div className="flex items-center justify-end gap-2 p-2 border-t bg-muted/50">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingBulkDelete(group);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Hamısını sil ({group.total_count})
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Linki silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.title}" linki silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog
        open={Boolean(pendingBulkDelete)}
        onOpenChange={(open) => !open && !isDeleting && setPendingBulkDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bütün linkləri silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkDelete
                ? `"${pendingBulkDelete.title}" qrupundakı ${pendingBulkDelete.total_count} link silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Silinir...' : `${pendingBulkDelete?.total_count || 0} linki sil`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LinkManagementTable;
