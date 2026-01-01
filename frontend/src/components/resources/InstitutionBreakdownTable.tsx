import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  Copy,
  MoreVertical,
  Download,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
  RefreshCcw,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { resourceService } from '@/services/resources';
import type { Resource } from '@/types/resources';
import type { LinkSharingOverviewResponse } from '@/services/links';
import { cn } from '@/lib/utils';

interface InstitutionBreakdownTableProps {
  selectedTitle: string;
  links: Resource[];
  isLoadingLinks: boolean;
  onEditLink: (link: Resource) => void;
  onDeleteLink: (link: Resource) => void;
  canManageLinks: boolean;
}

interface FlattenedInstitutionRow {
  id: number | null;
  name: string;
  sectorName?: string | null;
  regionName?: string | null;
  has_accessed?: boolean;
  access_count?: number;
  last_accessed_at?: string | null;
  link_url?: string | null;
  utis_code?: string | null;
  institution_code?: string | null;
}

interface TableRowData extends FlattenedInstitutionRow {
  rowIndex: number;
  link?: Resource | null;
  click_count: number;
  url?: string | null;
}

export function InstitutionBreakdownTable({
  selectedTitle,
  links,
  isLoadingLinks,
  onEditLink,
  onDeleteLink,
  canManageLinks,
}: InstitutionBreakdownTableProps) {
  const { toast } = useToast();
  const [sortColumn, setSortColumn] = useState<'institution' | 'clicks'>('clicks');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery<LinkSharingOverviewResponse | null>({
    queryKey: ['links-grouped-overview', selectedTitle],
    queryFn: async () => {
      if (!selectedTitle) return null;
      return await resourceService.getGroupedLinkSharingOverview(selectedTitle);
    },
    enabled: Boolean(selectedTitle),
    staleTime: 2 * 60 * 1000,
  });

  const flattenedSchools: FlattenedInstitutionRow[] = useMemo(() => {
    if (!overview?.sectors?.length) {
      return [];
    }
    return overview.sectors.flatMap((sector) =>
      sector.schools.map((school) => ({
        id: school.id ?? null,
        name: school.name,
        sectorName: sector.name,
        regionName: sector.region_name,
        has_accessed: school.has_accessed,
        access_count: school.access_count,
        last_accessed_at: school.last_accessed_at,
        link_url: school.link_url,
        utis_code: school.utis_code,
        institution_code: school.institution_code,
      }))
    );
  }, [overview]);

  const linkByInstitution = useMemo(() => {
    const map = new Map<number, Resource>();
    links.forEach((link) => {
      (link.target_institutions || []).forEach((institutionId) => {
        if (!map.has(institutionId)) {
          map.set(institutionId, link);
        }
      });
    });
    return map;
  }, [links]);

  const tableRows: TableRowData[] = useMemo(() => {
    if (flattenedSchools.length > 0) {
      return flattenedSchools.map((school, index) => {
        const matchingLink =
          (school.id ? linkByInstitution.get(school.id) : undefined) ||
          links.find((link) => link.url && school.link_url && link.url === school.link_url) ||
          null;
        const clickCount = school.access_count ?? matchingLink?.click_count ?? 0;
        return {
          ...school,
          rowIndex: index,
          link: matchingLink,
          click_count: clickCount,
          url: school.link_url || matchingLink?.url || null,
        };
      });
    }

    // Fallback: use link list when overview is empty
    return links.map((link, index) => ({
      id: link.target_institutions?.[0] ?? link.institution?.id ?? null,
      name: link.institution?.name || `Link #${link.id}`,
      sectorName: null,
      regionName: null,
      has_accessed: (link.click_count || 0) > 0,
      access_count: link.click_count,
      last_accessed_at: link.updated_at,
      link_url: link.url,
      utis_code: link.institution?.utis_code ?? null,
      institution_code: link.institution?.type ?? null,
      rowIndex: index,
      link,
      click_count: link.click_count || 0,
      url: link.url,
    }));
  }, [flattenedSchools, linkByInstitution, links]);

  const sortedRows = useMemo(() => {
    const rows = [...tableRows];
    rows.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'institution') {
        comparison = (a.name || '').localeCompare(b.name || '', 'az');
      } else {
        comparison = a.click_count - b.click_count;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return rows;
  }, [tableRows, sortColumn, sortDirection]);

  const stats = useMemo(() => {
    const total = sortedRows.length;
    const clicked = sortedRows.filter((row) => row.has_accessed || row.click_count > 0).length;
    const totalClicks = sortedRows.reduce((sum, row) => sum + (row.click_count || 0), 0);
    const average = total > 0 ? (totalClicks / total).toFixed(1) : '0';
    return {
      total,
      clicked,
      notClicked: total - clicked,
      totalClicks,
      average,
    };
  }, [sortedRows]);

  const handleToggleSort = (column: 'institution' | 'clicks') => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleCopyUrl = async (url?: string | null) => {
    if (!url) {
      toast({
        title: 'URL tapılmadı',
        description: 'Bu sıraya aid URL mövcud deyil',
        variant: 'destructive',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Kopyalandı',
        description: 'Link ünvanı buferə əlavə olundu',
      });
    } catch {
      toast({
        title: 'Kopyalama mümkün olmadı',
        description: url,
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    if (!sortedRows.length) return;
    const header = ['№', 'Məktəb', 'Status', 'Kliklənmə', 'URL', 'Region', 'Sektor'];
    const records = sortedRows.map((row, index) => [
      index + 1,
      row.name,
      row.has_accessed || row.click_count > 0 ? 'Açılıb' : 'Açılmayıb',
      row.click_count,
      row.url || '',
      row.regionName || '',
      row.sectorName || '',
    ]);
    const csv = [header, ...records]
      .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTitle.replace(/\s+/g, '_')}_institutions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'İxrac hazırdır',
      description: `${records.length} sətir CSV faylına əlavə olundu`,
    });
  };

  return (
    <Card className="h-full flex flex-col border border-border/60 bg-white shadow-sm">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">{selectedTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {stats.total} məktəb · {stats.totalClicks} kliklənmə
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!sortedRows.length}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetchOverview()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Yenilə
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-muted-foreground">Cəmi</div>
            <div className="text-lg font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 px-3 py-2">
            <div className="text-emerald-700">Açılıb</div>
            <div className="text-lg font-semibold text-emerald-900">{stats.clicked}</div>
          </div>
          <div className="rounded-lg border bg-red-50 px-3 py-2">
            <div className="text-red-700">Açılmayıb</div>
            <div className="text-lg font-semibold text-red-900">{stats.notClicked}</div>
          </div>
          <div className="rounded-lg border bg-blue-50 px-3 py-2">
            <div className="text-blue-700">Orta</div>
            <div className="text-lg font-semibold text-blue-900">{stats.average}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {overviewError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Məktəb siyahısı yüklənə bilmədi.</p>
            <Button variant="outline" size="sm" onClick={() => refetchOverview()}>
              Yenidən cəhd et
            </Button>
          </div>
        ) : overviewLoading || isLoadingLinks ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Bu başlıq üçün məktəb tapılmadı.
          </div>
        ) : (
          <div className="flex-1">
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">№</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleToggleSort('institution')}
                    >
                      Məktəb
                      {sortColumn === 'institution' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="w-[140px]">URL</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer"
                      onClick={() => handleToggleSort('clicks')}
                    >
                      Kliklənmə
                      {sortColumn === 'clicks' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="w-[80px] text-right">Əməl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row, index) => {
                    const isClicked = row.has_accessed || row.click_count > 0;
                    return (
                      <TableRow
                        key={`${row.id ?? 'unknown'}-${index}`}
                        className={cn(
                          'transition-colors',
                          !isClicked && 'bg-red-50/40 hover:bg-red-50/60'
                        )}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{row.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.sectorName ? `${row.sectorName}` : 'Sektor yoxdur'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button asChild variant="outline" size="sm" disabled={!row.url}>
                              <a
                                href={row.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Aç
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyUrl(row.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isClicked ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Açılıb
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Açılmayıb
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-semibold">
                            {row.click_count}
                            {row.click_count > 50 && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageLinks && row.link ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => row.url && window.open(row.url, '_blank')}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Linki aç
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyUrl(row.url)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  URL kopyala
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEditLink(row.link!)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Redaktə et
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => onDeleteLink(row.link!)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground">İcazə yoxdur</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
