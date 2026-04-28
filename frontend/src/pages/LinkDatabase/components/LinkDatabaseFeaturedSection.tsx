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
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-yellow-500/10 rounded-lg">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </div>
          <h3 className="text-sm font-bold tracking-tight uppercase text-muted-foreground/80">Spotlight Keçidlər</h3>
        </div>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 px-1">
          {links.map((link) => {
            const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
            return (
              <div key={link.id} className="relative group shrink-0 w-[300px]">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <Card className="relative h-full p-5 rounded-2xl border-0 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl transition-all duration-300">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col h-full gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-primary/5 rounded-xl text-primary group-hover:scale-110 transition-transform">
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{link.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {link.description || "Əlavə məlumat daxil edilməyib."}
                      </p>
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <MousePointerClick className="h-3 w-3" />
                        {link.click_count} KLİK
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold border-yellow-500/20 text-yellow-600 bg-yellow-500/5">
                        FEATURED
                      </Badge>
                    </div>
                  </a>
                </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}
