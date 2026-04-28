import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Link as LinkIcon,
  Upload,
  Edit,
  Trash2,
  Loader2,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import LinkSharingOverviewCard from './LinkSharingOverview';
import { useLinkSharingOverview } from '@/hooks/resources/useLinkSharingOverview';
import type { AssignedResource } from '@/types/resources';

interface PersonalLinksViewProps {
  links: AssignedResource[];
  isLoading: boolean;
  onEdit: (link: AssignedResource) => void;
  onDelete: (link: AssignedResource) => void;
  onBulkUpload: () => void;
  onCreateNew: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const SCOPE_LABELS: Record<string, string> = {
  regional:       'Regional',
  sectoral:       'Sektoral',
  institutional:  'Müəssisə',
  specific_users: 'Şəxsi',
  public:         'Açıq',
};

export function PersonalLinksView({
  links,
  isLoading,
  onEdit,
  onDelete,
  onBulkUpload,
  searchTerm,
  onSearchChange,
}: PersonalLinksViewProps) {
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(links[0]?.id ?? null);

  const selectedLink = useMemo(
    () => links.find(l => l.id === selectedLinkId) ?? links[0] ?? null,
    [links, selectedLinkId]
  );

  const { data: overview, isLoading: isOverviewLoading } = useLinkSharingOverview(
    selectedLink as Parameters<typeof useLinkSharingOverview>[0],
    !!selectedLink,
    true
  );

  const filteredLinks = useMemo(() => {
    if (!searchTerm.trim()) return links;
    const q = searchTerm.toLowerCase();
    return links.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.url?.toLowerCase().includes(q)
    );
  }, [links, searchTerm]);

  useEffect(() => {
    if (selectedLinkId && !filteredLinks.some(l => l.id === selectedLinkId)) {
      setSelectedLinkId(filteredLinks[0]?.id ?? null);
    }
  }, [filteredLinks, selectedLinkId]);

  return (
    <div className="flex gap-0 pt-4 min-h-[560px] h-[calc(100vh-260px)]">

      {/* ─── LEFT: link list ─────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-border/60">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold text-foreground">Toplu Linklər</p>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredLinks.length} link</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={onBulkUpload}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Excel ilə yüklə
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Link axtar..."
              className="pl-8 h-8 text-xs bg-muted/30 border-0 focus-visible:ring-1"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
              <div className="p-3 bg-muted rounded-xl">
                <Upload className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {searchTerm ? 'Nəticə tapılmadı' : 'Hələ link yoxdur'}
                </p>
                {!searchTerm && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-xs gap-1.5"
                    onClick={onBulkUpload}
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    Excel ilə yüklə
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-1">
              {filteredLinks.map((link, idx) => {
                const isActive = selectedLinkId === link.id;
                const scopeLabel = SCOPE_LABELS[link.share_scope ?? ''] ?? '';

                return (
                  <div key={link.id}>
                    <button
                      onClick={() => setSelectedLinkId(link.id)}
                      className={cn(
                        'group w-full text-left px-3 py-2.5 transition-colors',
                        isActive
                          ? 'bg-primary/5 border-l-2 border-primary'
                          : 'border-l-2 border-transparent hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={cn(
                            'mt-0.5 p-1.5 rounded-md shrink-0',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            <LinkIcon className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              'text-xs font-semibold truncate leading-snug',
                              isActive ? 'text-primary' : 'text-foreground'
                            )}>
                              {link.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {link.url}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={cn(
                          'flex items-center gap-0.5 shrink-0 transition-opacity',
                          'opacity-0 group-hover:opacity-100',
                          isActive && 'opacity-100'
                        )}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded"
                            onClick={e => { e.stopPropagation(); onEdit(link); }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={e => { e.stopPropagation(); onDelete(link); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 ml-7">
                        {scopeLabel && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1.5 rounded font-medium"
                          >
                            {scopeLabel}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(link.created_at).toLocaleDateString('az-AZ')}
                        </span>
                      </div>
                    </button>
                    {idx < filteredLinks.length - 1 && (
                      <Separator className="mx-3 w-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ─── RIGHT: sharing overview ─────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedLink ? (
          <ScrollArea className="h-full">
            <div className="p-1">
              <LinkSharingOverviewCard
                selectedLink={selectedLink as Parameters<typeof LinkSharingOverviewCard>[0]['selectedLink']}
                overview={overview}
                isLoading={isOverviewLoading}
                onRetry={() => {}}
                variant="ghost"
                onResourceAction={(resource, action) => {
                  if (action === 'edit') onEdit(resource as AssignedResource);
                  if (action === 'delete') onDelete(resource as AssignedResource);
                }}
              />
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-muted rounded-xl mb-3">
              <LinkIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Link seçin</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[220px]">
              Paylaşım statistikasını görmək üçün sol siyahıdan link seçin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
