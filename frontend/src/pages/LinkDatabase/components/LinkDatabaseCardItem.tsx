import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Star,
  MousePointerClick,
  RotateCcw,
  BarChart3,
  Building2,
  MapPin,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LinkShare } from '../types/linkDatabase.types';
import {
  LINK_TYPE_ICONS,
  LINK_TYPE_LABELS,
  STATUS_CONFIG,
} from '../constants/linkDatabase.constants';

interface LinkDatabaseCardItemProps {
  link: LinkShare;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
  onRestore?: (link: LinkShare) => void;
  onTrack?: (link: LinkShare) => void;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return '—';
  }
}

export function LinkDatabaseCardItem({
  link,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
  onTrack,
}: LinkDatabaseCardItemProps) {
  const { toast } = useToast();
  const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
  const statusConfig = STATUS_CONFIG[link.status] || STATUS_CONFIG.active;

  const copyUrl = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(link.url).then(() => {
      toast({ title: 'Kopyalandı', description: 'URL kopyalandı' });
    });
  }, [link.url, toast]);

  return (
    <div className="relative group max-w-2xl mx-auto w-full">
      {/* Selection Checkbox (Floating) */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(link.id)}
          className="h-5 w-5 border-2"
        />
      </div>

      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-zinc-900",
        isSelected && "ring-2 ring-primary bg-primary/5",
        link.status === 'disabled' && "opacity-60"
      )}>
        {/* Progress bar style decoration for featured links */}
        {link.is_featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-gradient-x" />
        )}

        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Icon Circle */}
            <div className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6",
              link.is_featured ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950/30" : "bg-primary/10 text-primary dark:bg-primary/20"
            )}>
              <TypeIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {link.is_featured && (
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                )}
                <h3 className="font-bold text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                  {link.title}
                </h3>
              </div>
              
              {link.description ? (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {link.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic mb-2">Təsvir əlavə edilməyib</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider py-0 px-2 border-0 bg-muted/50", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  {link.click_count} klik
                </div>
                {link.target_roles && link.target_roles.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium border-l pl-3">
                    <Users className="w-3.5 h-3.5" />
                    {link.target_roles.length} rol
                  </div>
                )}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button 
                asChild
                variant="default"
                className="rounded-xl h-10 px-4 sm:h-12 sm:px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95"
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  Aç <ExternalLink className="w-4 h-4" />
                </a>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl hover:bg-muted">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-2xl">
                  <DropdownMenuItem onClick={copyUrl} className="rounded-lg py-2">
                    <Copy className="mr-3 h-4 w-4" /> URL kopyala
                  </DropdownMenuItem>
                  {onTrack && (
                    <DropdownMenuItem onClick={() => onTrack(link)} className="rounded-lg py-2">
                      <BarChart3 className="mr-3 h-4 w-4" /> Analitika
                    </DropdownMenuItem>
                  )}
                  <Separator className="my-1" />
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(link)} className="rounded-lg py-2">
                      <Edit className="mr-3 h-4 w-4 text-blue-500" /> Redaktə et
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(link)} 
                      className="rounded-lg py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                      <Trash2 className="mr-3 h-4 w-4" /> Sil
                    </DropdownMenuItem>
                  )}
                  {link.status === 'disabled' && onRestore && (
                    <DropdownMenuItem onClick={() => onRestore(link)} className="rounded-lg py-2 text-green-600">
                      <RotateCcw className="mr-3 h-4 w-4" /> Bərpa et
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Hover info overlay (mobile-friendly) */}
        <div className="bg-muted/50 px-4 py-2 border-t flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          <span>Yaradıldı: {formatDate(link.created_at)}</span>
          {link.sharedBy && (
            <span className="truncate max-w-[150px]">Müəllif: {link.sharedBy.first_name} {link.sharedBy.last_name}</span>
          )}
        </div>
      </Card>
    </div>
  );
}
