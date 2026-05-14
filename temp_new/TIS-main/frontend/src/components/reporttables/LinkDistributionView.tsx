import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Link as LinkIcon } from 'lucide-react';
import { resourceService } from '@/services/resources';
import { useLinkSharingOverview } from '@/hooks/resources/useLinkSharingOverview';
import LinkSharingOverviewCard from '@/components/resources/LinkSharingOverview';
import type { AssignedResource } from '@/types/resources';
import { cn } from '@/lib/utils';

export function LinkDistributionView() {
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: linksResponse, isLoading } = useQuery({
    queryKey: ['personal-links-distribution', { search: search || undefined }],
    queryFn: () =>
      resourceService.getAll({
        type: 'link',
        is_bulk: true,
        group_by_title: true,
        search: search || undefined,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const links: AssignedResource[] = useMemo(() => {
    const all = linksResponse?.data ?? [];
    return all.filter((r) => r.type === 'link') as AssignedResource[];
  }, [linksResponse]);

  const selectedLink = useMemo(
    () => links.find((l) => l.id === selectedLinkId) ?? links[0] ?? null,
    [links, selectedLinkId]
  );

  const { data: overview, isLoading: isOverviewLoading } = useLinkSharingOverview(
    selectedLink as any,
    !!selectedLink,
    true
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Left panel — link list */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Link axtarın..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12 italic">
              Link tapılmadı
            </p>
          ) : (
            <div className="space-y-2 pr-2">
              {links.map((link) => {
                const isSelected = (selectedLink?.id === link.id) ||
                  (!selectedLinkId && links[0]?.id === link.id);
                return (
                  <button
                    key={link.id}
                    onClick={() => setSelectedLinkId(link.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-blue-50/60 border-blue-200 shadow-sm'
                        : 'bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'p-1.5 rounded-lg shrink-0 mt-0.5',
                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      )}>
                        <LinkIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-sm font-semibold truncate',
                          isSelected && 'text-blue-700'
                        )}>
                          {link.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {link.url}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-[10px] h-4 px-1.5 py-0 border-gray-200"
                        >
                          Müəssisə
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right panel — institution distribution */}
      <div className="flex-1 min-w-0 overflow-auto">
        <LinkSharingOverviewCard
          selectedLink={selectedLink as any}
          overview={overview as any}
          isLoading={isOverviewLoading}
          onRetry={() => {}}
          hideUsersTab
        />
      </div>
    </div>
  );
}
