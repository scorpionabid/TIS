import { useCallback } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TablePagination } from '@/components/common/TablePagination';
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
}

function SortIcon({ field, currentSort, direction }: { field: SortField; currentSort: SortField; direction: SortDirection }) {
  if (field !== currentSort) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  return direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
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

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll(allIds)}
                  aria-label="Hamısını seç"
                />
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                  onClick={() => onSort('title')}
                >
                  Başlıq
                  <SortIcon field="title" currentSort={sortBy} direction={sortDirection} />
                </button>
              </TableHead>
              <TableHead>Növ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Yaradıcı</TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                  onClick={() => onSort('created_at')}
                >
                  Tarix
                  <SortIcon field="created_at" currentSort={sortBy} direction={sortDirection} />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  className="flex items-center font-medium hover:text-foreground transition-colors mx-auto"
                  onClick={() => onSort('click_count')}
                >
                  Kliklər
                  <SortIcon field="click_count" currentSort={sortBy} direction={sortDirection} />
                </button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyatlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => {
              const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
              const statusConfig = STATUS_CONFIG[link.status] || STATUS_CONFIG.active;

              return (
                <TableRow
                  key={link.id}
                  className={selectedIds.has(link.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(link.id)}
                      onCheckedChange={() => onToggleSelect(link.id)}
                      aria-label={`${link.title} seç`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        {link.is_featured && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {link.title}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                      {link.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {link.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 whitespace-nowrap">
                      <TypeIcon className="h-3 w-3" />
                      {LINK_TYPE_LABELS[link.link_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusConfig.className} whitespace-nowrap`}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm whitespace-nowrap">
                      {link.sharedBy
                        ? `${link.sharedBy.first_name} ${link.sharedBy.last_name}`
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm whitespace-nowrap">
                            {formatDate(link.created_at)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {link.expires_at
                            ? `Bitmə tarixi: ${formatDate(link.expires_at)}`
                            : 'Müddətsiz'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{link.click_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyUrl(link.url)}
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginationMeta.total > 0 && (
        <TablePagination
          currentPage={paginationMeta.currentPage}
          totalPages={paginationMeta.lastPage}
          total={paginationMeta.total}
          perPage={paginationMeta.perPage}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
