import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import type { Resource } from '@/types/resources';

interface LinkSelectionCardProps {
  links: Resource[];
  selectedLink: Resource | null;
  onSelect: (link: Resource) => void;
  isLoading: boolean;
}

const LinkSelectionCard: React.FC<LinkSelectionCardProps> = ({
  links,
  selectedLink,
  onSelect,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filteredLinks = useMemo(() => {
    if (!search.trim()) {
      return links;
    }
    const query = search.toLowerCase();
    return links.filter((link) =>
      (link.title || '').toLowerCase().includes(query)
    );
  }, [links, search]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Link seçimi</CardTitle>
          <Badge variant="secondary">{links.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Linki seçin və paylaşdığı müəssisələrin siyahısına baxın.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Link başlığı üzrə axtar..."
          className="h-9"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Linklər yüklənir...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Heç bir link tapılmadı.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLinks.map((link) => {
              const isActive = selectedLink?.id === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onSelect(link)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">{link.title}</p>
                    </div>
                    {isActive && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Aktiv
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {link.link_type && (
                      <span className="uppercase tracking-wide text-[11px]">
                        {link.link_type}
                      </span>
                    )}
                    {link.share_scope && (
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {link.share_scope}
                      </span>
                    )}
                    {link.created_at && (
                      <span>
                        {new Date(link.created_at).toLocaleDateString('az-AZ')}
                      </span>
                    )}
                  </div>
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
      </CardContent>
    </Card>
  );
};

export default LinkSelectionCard;
