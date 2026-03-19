import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import {
  BarChart3,
  RefreshCw,
  Download,
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import {
  preschoolReportService,
  type PreschoolInstitutionSummary,
  type PreschoolReportFilters,
} from '@/services/preschoolReports';
import { sectorsService } from '@/services/sectors';

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<
  PreschoolInstitutionSummary,
  | 'institution_name'
  | 'group_count'
  | 'total_enrolled'
  | 'average_rate'
  | 'completion_rate'
>;

type SortDir = 'asc' | 'desc';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: Date): string => format(d, 'yyyy-MM-dd');

const getRateBadge = (rate: number): React.ReactElement => {
  if (rate >= 90)
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        {rate.toFixed(1)}%
      </Badge>
    );
  if (rate >= 75)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        {rate.toFixed(1)}%
      </Badge>
    );
  return <Badge variant="destructive">{rate.toFixed(1)}%</Badge>;
};

// ─── Component ───────────────────────────────────────────────────────────────

const PreschoolAttendanceReports: React.FC = () => {
  const { currentUser } = useAuth();
  const { hasAnyRole } = useRoleCheck();

  const canExport = hasAnyRole(['superadmin', 'regionadmin']);

  // ── Date state ─────────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState<string>(
    fmt(startOfMonth(new Date()))
  );
  const [endDate, setEndDate] = useState<string>(fmt(new Date()));
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('institution_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Date preset handlers ───────────────────────────────────────────────────
  const handlePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(fmt(now));
      setEndDate(fmt(now));
    }
    if (preset === 'week') {
      setStartDate(fmt(startOfWeek(now, { weekStartsOn: 1 })));
      setEndDate(fmt(now));
    }
    if (preset === 'month') {
      setStartDate(fmt(startOfMonth(now)));
      setEndDate(fmt(now));
    }
  };

  // ── Sectors query (for filter dropdown) ───────────────────────────────────
  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorsService.getSectors(),
    staleTime: 5 * 60 * 1000,
    enabled: hasAnyRole(['superadmin', 'regionadmin', 'regionoperator']),
  });

  const sectors = sectorsData?.data ?? [];

  // ── Report query ───────────────────────────────────────────────────────────
  const filters = useMemo((): PreschoolReportFilters => {
    const base: PreschoolReportFilters = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedSectorId !== 'all') {
      base.sector_id = Number(selectedSectorId);
    }
    return base;
  }, [startDate, endDate, selectedSectorId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['preschool-reports', filters],
    queryFn: () => preschoolReportService.getReport(filters),
    staleTime: 60_000,
  });

  const report = data?.data;
  const totals = report?.totals;

  // ── Export mutation ────────────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: () => preschoolReportService.downloadPhotosZip(filters),
    onSuccess: (blob) => {
      preschoolReportService.triggerZipDownload(
        blob,
        `preschool_photos_${startDate}_${endDate}.zip`
      );
      toast.success('Şəkil arxivi yüklənir...');
    },
    onError: () => toast.error('Export uğursuz oldu'),
  });

  // ── Table sort ─────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  // ── Processed institutions ─────────────────────────────────────────────────
  const institutions: PreschoolInstitutionSummary[] = useMemo(() => {
    let list = [...(report?.institutions ?? [])];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          i.institution_name.toLowerCase().includes(q) ||
          (i.sector_name ?? '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc'
          ? av.localeCompare(bv, 'az')
          : bv.localeCompare(av, 'az');
      }
      const an = av as number;
      const bn = bv as number;
      return sortDir === 'asc' ? an - bn : bn - an;
    });
    return list;
  }, [report?.institutions, searchTerm, sortKey, sortDir]);

  const missingReports = institutions.filter((i) => i.completion_rate === 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Məktəbəqədər Davamiyyət Hesabatı
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.region?.name ??
              currentUser?.institution?.name ??
              ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Foto arxivi
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date presets */}
            <div className="flex gap-1.5">
              {(['today', 'week', 'month'] as const).map((p) => (
                <Button
                  key={p}
                  variant={datePreset === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreset(p)}
                >
                  {p === 'today'
                    ? 'Bu gün'
                    : p === 'week'
                    ? 'Bu həftə'
                    : 'Bu ay'}
                </Button>
              ))}
              <Button
                variant={datePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('custom')}
              >
                Xüsusi
              </Button>
            </div>

            {/* Custom date range */}
            {datePreset === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm border rounded px-2 py-1.5 bg-background"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={fmt(new Date())}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm border rounded px-2 py-1.5 bg-background"
                />
              </>
            )}

            {/* Sector filter */}
            {sectors.length > 0 && (
              <Select
                value={selectedSectorId}
                onValueChange={setSelectedSectorId}
              >
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Sektor seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sektorlar</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              {
                label: 'Müəssisə sayı',
                value: totals.institution_count,
                icon: Building2,
              },
              {
                label: 'Cəmi uşaqlar',
                value: totals.total_enrolled.toLocaleString(),
                icon: Users,
              },
              {
                label: 'Orta iştirak',
                value: `${totals.average_rate.toFixed(1)}%`,
                icon: TrendingUp,
              },
              {
                label: 'Orta tamamlanma',
                value: `${totals.avg_completion.toFixed(1)}%`,
                icon: BarChart3,
              },
            ] as const
          ).map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-semibold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Missing reports warning */}
      {missingReports.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">
              {missingReports.length} müəssisə
            </span>{' '}
            seçilən dövr üçün heç bir hesabat göndərməyib:&nbsp;
            {missingReports
              .slice(0, 5)
              .map((i) => i.institution_name)
              .join(', ')}
            {missingReports.length > 5
              ? ` və daha ${missingReports.length - 5} digər`
              : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Hesabat yüklənərkən xəta baş verdi.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Müəssisələr ({institutions.length})
              </CardTitle>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Axtarış..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort('institution_name')}
                    >
                      Müəssisə{' '}
                      <SortIcon col="institution_name" />
                    </TableHead>
                    <TableHead>Sektor</TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none"
                      onClick={() => toggleSort('group_count')}
                    >
                      Qruplar <SortIcon col="group_count" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none"
                      onClick={() => toggleSort('total_enrolled')}
                    >
                      Uşaqlar <SortIcon col="total_enrolled" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none"
                      onClick={() => toggleSort('average_rate')}
                    >
                      İştirak % <SortIcon col="average_rate" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none"
                      onClick={() => toggleSort('completion_rate')}
                    >
                      Tamamlanma % <SortIcon col="completion_rate" />
                    </TableHead>
                    <TableHead className="text-center">Vəziyyət</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Məlumat tapılmadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    institutions.map((inst) => (
                      <TableRow key={inst.institution_id}>
                        <TableCell className="font-medium">
                          {inst.institution_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inst.sector_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.group_count}
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.total_enrolled.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getRateBadge(inst.average_rate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getRateBadge(inst.completion_rate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.completion_rate === 0 ? (
                            <Badge
                              variant="destructive"
                              className="text-xs"
                            >
                              Hesabat yoxdur
                            </Badge>
                          ) : inst.completion_rate < 50 ? (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              Natamam
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-600"
                            >
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreschoolAttendanceReports;
