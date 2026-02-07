import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Star, ExternalLink, MousePointerClick } from 'lucide-react';
import type { LinkShare } from '../types/linkDatabase.types';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from '../constants/linkDatabase.constants';

interface LinkDatabaseFeaturedSectionProps {
  links: LinkShare[];
}

export function LinkDatabaseFeaturedSection({ links }: LinkDatabaseFeaturedSectionProps) {
  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <h3 className="text-sm font-medium">Seçilmiş Linklər</h3>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {links.map((link) => {
            const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
            return (
              <Card
                key={link.id}
                className="shrink-0 w-[280px] p-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <TypeIcon className="h-3 w-3" />
                      {LINK_TYPE_LABELS[link.link_type]}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm line-clamp-1">{link.title}</p>
                  {link.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {link.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {link.click_count} klik
                  </div>
                </a>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
