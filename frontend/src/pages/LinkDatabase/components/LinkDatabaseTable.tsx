import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PER_PAGE_OPTIONS } from '../constants/linkDatabase.constants';
import { useToast } from '@/hooks/use-toast';
import type { LinkShare, SortField, SortDirection } from '../types/linkDatabase.types';
import {
  LINK_TYPE_ICONS,
  LINK_TYPE_LABELS,
  STATUS_CONFIG,
} from '../constants/linkDatabase.constants';

interface LinkDatabaseTableProps {
  links: LinkShare[];
  selectedIds: Set<number>;
  sortBy: SortField;
  sortDirection: SortDirection;
  paginationMeta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  onSort: (field: SortField) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
  onRestore?: (link: LinkShare) => void;
  onTrack?: (link: LinkShare) => void;
}

function SortIcon({ field, currentSort, direction }: { field: SortField; currentSort: SortField; direction: SortDirection }) {
  if (field !== currentSort) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  return direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
}

export function LinkDatabaseTable({
  links,
  selectedIds,
  sortBy,
  sortDirection,
  paginationMeta,
  onSort,
  onToggleSelect,
  onSelectAll,
  onPageChange,
  onPerPageChange,
  onEdit,
  onDelete,
  onRestore,
  onTrack,
}: LinkDatabaseTableProps) {
  const { toast } = useToast();
  const allIds = links.map((l) => l.id);
  const allSelected = links.length > 0 && selectedIds.size === links.length;

  const copyUrl = useCallback(
    (url: string) => {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Kopyalandı', description: 'URL buferə kopyalandı' });
      });
    },
    [toast]
  );

  const { currentPage, lastPage, perPage: activePer, total } = paginationMeta;
  const from = total === 0 ? 0 : (currentPage - 1) * activePer + 1;
  const to = Math.min(currentPage * activePer, total);

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 bg-white">
        <Table>
          <TableHeader className="bg-gray-50/80 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] px-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll(allIds)}
                  aria-label="Hamısını seç"
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500">
                <button
                  className="flex items-center hover:text-primary transition-colors group"
                  onClick={() => onSort('title')}
                >
                  Başlıq
                  <SortIcon field="title" currentSort={sortBy} direction={sortDirection} />
                </button>
              </TableHead>
              <TableHead className="py-3 font-bold text-[11px] uppercase tracking-wider text-gray-500 w-[140px]">Növ</TableHead>
              <TableHead className="py-3 font-bold text-[11px] uppercase tracking-wider text-gray-500 w-[140px]">Status</TableHead>
              <TableHead className="py-3 text-right px-6 font-bold text-[11px] uppercase tracking-wider text-gray-500 w-[120px]">Əməliyyatlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => {
              const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
              const statusConfig = STATUS_CONFIG[link.status] || STATUS_CONFIG.active;
              const isSelected = selectedIds.has(link.id);

              return (
                <TableRow
                  key={link.id}
                  className={cn(
                    "group transition-all duration-300 border-b border-border/40",
                    isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                  )}
                >
                  <TableCell className="px-4 py-2.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(link.id)}
                      aria-label={`${link.title} seç`}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex flex-col min-w-[220px]">
                      <div className="flex items-center gap-2">
                        {link.is_featured && (
                          <div className="bg-yellow-100 dark:bg-yellow-950/30 p-1 rounded-md">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                          </div>
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          {link.title}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                      {link.description && (
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-medium opacity-70">
                          {link.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 bg-muted/50 border-0 font-bold text-[10px]">
                      <TypeIcon className="h-3.5 w-3.5 text-primary" />
                      {LINK_TYPE_LABELS[link.link_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("whitespace-nowrap rounded-lg px-3 py-1 font-bold text-[10px] shadow-sm", statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 hover:text-primary transition-all border-0"
                              onClick={() => copyUrl(link.url)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="font-bold">Kopyala</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {(onEdit || onDelete || onRestore || onTrack) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted/60 transition-all border-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-2xl border-border/50 p-1.5 min-w-[160px]">
                            {onTrack && (
                              <DropdownMenuItem
                                onClick={() => onTrack(link)}
                                className="rounded-lg py-2 font-bold text-xs"
                              >
                                <BarChart3 className="mr-2 h-3.5 w-3.5 text-primary" />
                                İcmal
                              </DropdownMenuItem>
                            )}
                            
                            {onEdit && (
                              <DropdownMenuItem 
                                onClick={() => onEdit(link)}
                                className="rounded-lg py-2 font-bold text-xs"
                              >
                                <Edit className="mr-2 h-3.5 w-3.5 text-primary" />
                                Redaktə
                              </DropdownMenuItem>
                            )}

                            {link.status === 'disabled' && onRestore && (
                              <DropdownMenuItem
                                onClick={() => onRestore(link)}
                                className="rounded-lg py-2 font-bold text-xs text-green-600 focus:text-green-600 focus:bg-green-50"
                              >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                Bərpa
                              </DropdownMenuItem>
                            )}

                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(link)}
                                className="rounded-lg py-2 font-bold text-xs text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Sil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span>
            {total > 0 ? `${from}–${to} / ${total} nəticə` : '0 nəticə'}
          </span>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Sətir:</span>
            <Select
              value={activePer.toString()}
              onValueChange={(v) => onPerPageChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs border-gray-200 rounded-lg bg-white shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PER_PAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt.toString()} className="text-xs rounded-lg">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
            let page: number;
            if (lastPage <= 7) {
              page = i + 1;
            } else if (currentPage <= 4) {
              page = i + 1;
            } else if (currentPage >= lastPage - 3) {
              page = lastPage - 6 + i;
            } else {
              page = currentPage - 3 + i;
            }
            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 rounded-lg text-xs font-bold',
                  page === currentPage && 'shadow-sm'
                )}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= lastPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
