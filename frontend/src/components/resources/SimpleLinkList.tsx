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
import { Loader2, Link as LinkIcon, Search, RotateCcw, Trash2 } from 'lucide-react';
import type { Resource } from '@/types/resources';

export type LinkAction = 'edit' | 'delete' | 'restore' | 'forceDelete';
export type StatusTab = 'active' | 'disabled' | 'all';

interface SimpleLinkListProps {
  links: Resource[];
  selectedLink: Resource | null;
  onSelect: (link: Resource) => void;
  isLoading: boolean;
  statusTab?: StatusTab;
  onAction?: (link: Resource, action: LinkAction) => void;
}

export const SimpleLinkList: React.FC<SimpleLinkListProps> = ({
  links,
  selectedLink,
  onSelect,
  isLoading,
  statusTab = 'active',
  onAction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<Resource | null>(null);

  const handleForceDelete = (link: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    setLinkToDelete(link);
    setDeleteDialogOpen(true);
  };

  const confirmForceDelete = () => {
    if (linkToDelete && onAction) {
      onAction(linkToDelete, 'forceDelete');
    }
    setDeleteDialogOpen(false);
    setLinkToDelete(null);
  };

  const handleRestore = (link: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction(link, 'restore');
    }
  };

  const filteredLinks = useMemo(() => {
    if (!searchTerm.trim()) return links;
    const term = searchTerm.toLowerCase();
    return links.filter(
      (link) =>
        link.title?.toLowerCase().includes(term) ||
        link.description?.toLowerCase().includes(term) ||
        link.url?.toLowerCase().includes(term)
    );
  }, [links, searchTerm]);

  const isSelected = (link: Resource): boolean => {
    return selectedLink?.id === link.id;
  };

  const shareScopeLabels: Record<string, string> = {
    public: 'Açıq',
    regional: 'Regional',
    sectoral: 'Sektor',
    institutional: 'Müəssisə',
    specific_users: 'Xüsusi',
  };

  return (
    <>
    <Card className="border border-border/60 bg-white shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Linklər</CardTitle>
          <Badge variant="secondary">{filteredLinks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Link axtar..."
            className="pl-9 h-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Linklər yüklənir...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {searchTerm ? 'Axtarışa uyğun link tapılmadı.' : 'Heç bir link tapılmadı.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredLinks.map((link) => {
              const active = isSelected(link);
              return (
                <div
                  key={link.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(link)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(link);
                    }
                  }}
                  className={`w-full rounded-lg border p-2.5 sm:p-3 text-left transition cursor-pointer ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{link.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {link.share_scope && (
                        <Badge variant="outline" className="text-xs">
                          {shareScopeLabels[link.share_scope] || link.share_scope}
                        </Badge>
                      )}
                      {active && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                          Seçilmiş
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {link.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {link.description}
                    </p>
                  )}

                  {/* URL */}
                  {link.url && (
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">
                      {link.url}
                    </p>
                  )}

                  {/* Action Buttons for Disabled Links */}
                  {statusTab === 'disabled' && onAction && (
                    <div className="mt-3 pt-2 border-t flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={(e) => handleRestore(link, e)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Bərpa et
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleForceDelete(link, e)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Sil
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Hard Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Linki birdəfəlik silmək istəyirsiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{linkToDelete?.title}</strong> linki sistemdən tamamilə silinəcək.
            Bu əməliyyat geri qaytarıla bilməz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ləğv et</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmForceDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Birdəfəlik sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default SimpleLinkList;
