import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
}: LinkDatabaseCardItemProps) {
  const { toast } = useToast();
  const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
  const statusConfig = STATUS_CONFIG[link.status] || STATUS_CONFIG.active;

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(link.url).then(() => {
      toast({ title: 'Kopyalandı', description: 'URL buferə kopyalandı' });
    });
  }, [link.url, toast]);

  return (
    <Card
      className={`p-4 space-y-3 hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-primary/50 bg-muted/30' : ''
      }`}
    >
      {/* Top row: checkbox, type badge, featured star */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(link.id)}
            aria-label={`${link.title} seç`}
          />
          <Badge variant="outline" className="gap-1 text-xs">
            <TypeIcon className="h-3 w-3" />
            {LINK_TYPE_LABELS[link.link_type]}
          </Badge>
        </div>
        {link.is_featured && (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        )}
      </div>

      {/* Title + description */}
      <div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
        >
          {link.title}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        {link.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {link.description}
          </p>
        )}
      </div>

      {/* Status + clicks */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
          {statusConfig.label}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MousePointerClick className="h-3 w-3" />
          {link.click_count}
        </div>
      </div>

      {/* Footer: author, date, actions */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            {link.sharedBy
              ? `${link.sharedBy.first_name} ${link.sharedBy.last_name}`
              : '—'}
          </div>
          <div>{formatDate(link.created_at)}</div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={copyUrl}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>URL kopyala</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {(onEdit || onDelete || onRestore) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {link.status === 'disabled' && onRestore && (
                  <DropdownMenuItem
                    onClick={() => onRestore(link)}
                    className="text-green-600"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Bərpa et
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(link)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Redaktə et
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(link)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </Card>
  );
}
