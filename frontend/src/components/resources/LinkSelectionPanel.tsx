import React, { useMemo, useState } from 'react';
import { Search, Loader2, Link2, TrendingUp, AlertCircle, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GroupedLink } from '@/utils/linkGrouping';

interface LinkSelectionPanelProps {
  groupedLinks: GroupedLink[];
  selectedTitle: string | null;
  onSelectTitle: (title: string | null) => void;
  onCreateLink: () => void;
  onEditGroup?: (group: GroupedLink) => void;
  onDeleteGroup?: (group: GroupedLink) => Promise<void> | void;
  isLoading?: boolean;
  totalLinks: number;
  totalClicks: number;
  allowGroupActions?: boolean;
}

const testPatterns = ['test', 'jjjj', 'knsd', 'demo'];
const duplicatePatterns = ['facebook', 'face', 'fcaebook'];

export function LinkSelectionPanel({
  groupedLinks,
  selectedTitle,
  onSelectTitle,
  onCreateLink,
  onEditGroup,
  onDeleteGroup,
  isLoading = false,
  totalLinks,
  totalClicks,
  allowGroupActions = false,
}: LinkSelectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupedLinks;
    }
    const query = searchTerm.toLowerCase();
    return groupedLinks.filter((group) => group.title.toLowerCase().includes(query));
  }, [groupedLinks, searchTerm]);

  const totalGroupCount = groupedLinks.length;

  const handleDeleteGroup = async (event: React.MouseEvent, group: GroupedLink) => {
    event.stopPropagation();
    if (!onDeleteGroup) return;
    setPendingDeleteTitle(group.title);
    try {
      await onDeleteGroup(group);
    } finally {
      setPendingDeleteTitle(null);
    }
  };

  const getBadgeVariantClasses = (group: GroupedLink) => {
    if (group.total_count > 100) {
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const isTestTitle = (title: string) => testPatterns.some((pattern) => title.toLowerCase().includes(pattern));
  const isDuplicateTitle = (title: string) => duplicatePatterns.some((pattern) => title.toLowerCase() === pattern);

  return (
    <Card className="border border-border/60 bg-white shadow-sm">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Link seçimi
            <Badge variant="outline" className="text-xs">
              {totalGroupCount} başlıq
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Cəmi: </span>
              <span className="font-semibold">{totalLinks}</span>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Kliklənmə: </span>
              <span className="font-semibold">{totalClicks}</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Başlıq axtar..."
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {searchTerm ? 'Nəticə tapılmadı' : 'Link mövcud deyil'}
          </div>
        ) : (
          // HORIZONTAL GRID LAYOUT - All titles visible at once (no scroll)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredGroups.map((group) => {
                const isActive = selectedTitle === group.title;
                const totalGroupClicks = group.total_clicks;
                return (
                  <button
                    key={group.title}
                    type="button"
                    onClick={() => onSelectTitle(isActive ? null : group.title)}
                    className={cn(
                      'w-full rounded-lg border bg-white p-3 text-left transition-all hover:border-primary/60 hover:shadow-sm',
                      isActive && 'border-primary bg-primary/5 shadow-sm'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn('font-medium truncate', isActive && 'text-primary')}>{group.title}</h4>
                          <Badge variant="outline" className={cn('text-[11px]', getBadgeVariantClasses(group))}>
                            {group.total_count} link
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {group.link_type}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {totalGroupClicks} klik
                          </span>
                        </div>
                        {(isTestTitle(group.title) || isDuplicateTitle(group.title)) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {isTestTitle(group.title) && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Test
                              </Badge>
                            )}
                            {isDuplicateTitle(group.title) && (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                                Dublikat
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {allowGroupActions && isActive && (
                      <div className="mt-3 border-t pt-3 flex flex-col gap-2 sm:flex-row">
                        {onEditGroup && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditGroup(group);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Redaktə et
                          </Button>
                        )}
                        {onDeleteGroup && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={(event) => handleDeleteGroup(event, group)}
                            disabled={pendingDeleteTitle === group.title}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {pendingDeleteTitle === group.title ? 'Silinir...' : 'Sil'}
                          </Button>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
        )}

        {/* Create New Link Button */}
        {!isLoading && (
          <div className="mt-4 pt-4 border-t">
            <Button type="button" className="w-full" onClick={onCreateLink}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Yeni link yarat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
