import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, Building2, Users, Target, School as SchoolIcon } from 'lucide-react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { USER_ROLES } from '@/constants/roles';
import { useQuery } from '@tanstack/react-query';
import { regionalAttendanceService } from '@/services/regionalAttendance';
import { format, subDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

const getDefaultDates = () => {
  const now = new Date();
  return {
    start: format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd'),
  };
};

type DatePreset = 'thisMonth' | 'last30' | 'custom';

export default function RegionAttendanceReports() {
  const { canAccess } = useRoleCheck();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess =
    attendanceAccess.canView &&
    canAccess([
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.REGIONOPERATOR,
    ]);

  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'classes'>('overview');

  const overviewFilters = useMemo(() => {
    const filters: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedSectorId !== 'all') {
      filters.sector_id = Number(selectedSectorId);
    }
    return filters;
  }, [startDate, endDate, selectedSectorId]);

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['regional-attendance', 'overview', overviewFilters],
    queryFn: () => regionalAttendanceService.getOverview(overviewFilters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  const schools = overview?.schools ?? [];
  const sectors = overview?.sectors ?? [];

  useEffect(() => {
    if (!schools.length) {
      setSelectedSchoolId('');
      return;
    }

    if (selectedSchoolId) {
      const exists = schools.some((school) => school.school_id === Number(selectedSchoolId));
      if (!exists) {
        setSelectedSchoolId(String(schools[0].school_id));
      }
    } else {
      setSelectedSchoolId(String(schools[0].school_id));
    }
  }, [schools, selectedSchoolId]);

  const {
    data: classBreakdown,
    isLoading: classLoading,
    isFetching: classFetching,
    error: classError,
  } = useQuery({
    queryKey: ['regional-attendance', 'school-classes', selectedSchoolId, startDate, endDate],
    queryFn: () =>
      selectedSchoolId
        ? regionalAttendanceService.getSchoolClasses(Number(selectedSchoolId), {
            start_date: startDate,
            end_date: endDate,
          })
        : Promise.resolve(null),
    enabled: hasAccess && Boolean(selectedSchoolId),
    staleTime: 60 * 1000,
  });

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'thisMonth') {
      const defaults = getDefaultDates();
      setStartDate(defaults.start);
      setEndDate(defaults.end);
    } else if (preset === 'last30') {
      const end = new Date();
      const start = subDays(end, 29);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Gözlənilməz xəta baş verdi.';
  };

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>İcazə yoxdur</AlertTitle>
          <AlertDescription>
            Bu bölmə üçün Davamiyyət icazəsi (`attendance.read`) tələb olunur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderSummaryCards = () => {
    const summary = overview?.summary;
    if (!summary) return null;

    const cards = [
      {
        label: 'Məktəblər',
        value: summary.total_schools,
        icon: Building2,
        description: `${summary.total_sectors} sektor`,
      },
      {
        label: 'Şagird sayı',
        value: summary.total_students,
        icon: Users,
        description: `${summary.reported_days} hesabat günü`,
      },
      {
        label: 'Orta davamiyyət',
        value: `${summary.average_attendance_rate.toFixed(1)}%`,
        icon: Target,
        description: 'Hesabat dövrü üzrə',
      },
      {
        label: 'Məlumat çatışmazlığı',
        value: summary.schools_missing_reports,
        icon: AlertTriangle,
        description: 'Gözlənilən hesabat daxil olmayan məktəblər',
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof card.value === 'number' ? numberFormatter.format(card.value) : card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const filteredSchoolOptions = useMemo(() => {
    if (selectedSectorId === 'all') {
      return schools;
    }
    return schools.filter((school) => school.sector_id === Number(selectedSectorId));
  }, [schools, selectedSectorId]);

  return (
    <div className="px-2 py-4 sm:px-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regional Davamiyyət Hesabatları</h1>
          <p className="text-muted-foreground">
            Sektorlar və məktəblər üzrə real-vaxt iştirak analitikası
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetchOverview()}
            disabled={overviewLoading || overviewFetching}
          >
            {overviewFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Yenilə
          </Button>
        </div>
      </div>

      {(overviewError || classError) && (
        <Alert variant="destructive">
          <AlertTitle>Hesabat yüklənmədi</AlertTitle>
          <AlertDescription>
            {getErrorMessage(overviewError || classError)}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filterlər</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Başlanğıc tarixi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setDatePreset('custom');
                  setStartDate(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Son tarix</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => {
                  setDatePreset('custom');
                  setEndDate(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Sektor</Label>
              <Select value={selectedSectorId} onValueChange={(value) => setSelectedSectorId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sektor seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sektorlar</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.sector_id} value={sector.sector_id.toString()}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hazır intervallar</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={datePreset === 'thisMonth' ? 'default' : 'outline'}
                  onClick={() => handlePresetChange('thisMonth')}
                >
                  Bu ay
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === 'last30' ? 'default' : 'outline'}
                  onClick={() => handlePresetChange('last30')}
                >
                  Son 30 gün
                </Button>
                <Button size="sm" variant={datePreset === 'custom' ? 'default' : 'outline'} disabled>
                  Fərdi
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'classes')}>
        <TabsList className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <TabsTrigger value="overview">Ümumi Panorama</TabsTrigger>
          <TabsTrigger value="classes">Məktəb &amp; Sinif nəzarəti</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : (
            renderSummaryCards()
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sektor icmalı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {overviewFetching && !overview ? (
                  <Skeleton className="h-40 w-full" />
                ) : sectors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Seçilmiş filterlər üçün sektor tapılmadı.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sektor</TableHead>
                        <TableHead className="text-center">Məktəb</TableHead>
                        <TableHead className="text-center">Şagird</TableHead>
                        <TableHead className="text-center">Orta davamiyyət</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map((sector) => (
                        <TableRow key={sector.sector_id}>
                          <TableCell>
                            <div className="font-medium">{sector.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {sector.reported_days} hesabat günü
                            </p>
                          </TableCell>
                          <TableCell className="text-center">{sector.school_count}</TableCell>
                          <TableCell className="text-center">
                            {numberFormatter.format(sector.total_students)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatPercent(sector.average_attendance_rate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bildirişlər</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">Məlumat göndərməyən məktəblər</h4>
                  <div className="mt-2 space-y-1">
                    {(overview?.alerts.missing_reports ?? []).slice(0, 5).map((alert) => (
                      <div key={alert.school_id} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        {alert.name}
                      </div>
                    ))}
                    {!overview?.alerts.missing_reports?.length && (
                      <p className="text-xs text-muted-foreground">Bütün məktəblər hesabat göndərib.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Aşağı davamiyyət</h4>
                  <div className="mt-2 space-y-1">
                    {(overview?.alerts.low_attendance ?? []).slice(0, 5).map((alert) => (
                      <div key={alert.school_id} className="flex items-center justify-between text-sm">
                        <span>{alert.name}</span>
                        <span className="font-semibold text-red-600">{formatPercent(alert.rate)}</span>
                      </div>
                    ))}
                    {!overview?.alerts.low_attendance?.length && (
                      <p className="text-xs text-muted-foreground">Aşağı davamiyyət müşahidə edilmir.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Məktəblər</CardTitle>
              <p className="text-sm text-muted-foreground">
                {schools.length} məktəb tapıldı
              </p>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Məktəb</TableHead>
                      <TableHead className="text-center">Şagird</TableHead>
                      <TableHead className="text-center">Hesabat günləri</TableHead>
                      <TableHead className="text-center">Orta davamiyyət</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => {
                      const warnings = school.warnings || [];
                      return (
                        <TableRow key={school.school_id}>
                          <TableCell>
                            <div className="font-medium">{school.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {school.reported_classes} sinif
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {numberFormatter.format(school.total_students)}
                          </TableCell>
                          <TableCell className="text-center">
                            {school.reported_days}/{school.expected_school_days}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatPercent(school.average_attendance_rate)}
                          </TableCell>
                          <TableCell className="text-center">
                            {warnings.length === 0 ? (
                              <Badge variant="secondary" className="bg-green-50 text-green-700">
                                Normal
                              </Badge>
                            ) : (
                              <div className="flex flex-wrap justify-center gap-1">
                                {warnings.map((warning) => (
                                  <Badge key={warning} variant="destructive">
                                    {warning === 'reports_missing' ? 'Hesabat yoxdur' : 'Aşağı davamiyyət'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Məktəb seçin</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Məktəb</Label>
                <Select value={selectedSchoolId} onValueChange={(value) => setSelectedSchoolId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Məktəb seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSchoolOptions.map((school) => (
                      <SelectItem key={school.school_id} value={school.school_id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tarix aralığı</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setDatePreset('custom');
                    }}
                  />
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setDatePreset('custom');
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {(!selectedSchoolId || !filteredSchoolOptions.length) && (
            <Alert>
              <AlertTitle>Məktəb seçilməyib</AlertTitle>
              <AlertDescription>
                Göstərmək istədiyiniz məktəbi seçimdən əlavə edin.
              </AlertDescription>
            </Alert>
          )}

          {selectedSchoolId && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {classLoading || classFetching ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
                ) : classBreakdown ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Sinif sayı</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{classBreakdown.summary.total_classes}</div>
                        <p className="text-xs text-muted-foreground">
                          {classBreakdown.summary.reported_classes} sinif hesabat göndərib
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Orta davamiyyət</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatPercent(classBreakdown.summary.average_attendance_rate)}
                        </div>
                        <p className="text-xs text-muted-foreground">Seçilmiş dövr üzrə</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Hesabat dövrü</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-semibold">
                          {format(new Date(startDate), 'dd MMM', { locale: az })} —{' '}
                          {format(new Date(endDate), 'dd MMM', { locale: az })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {classBreakdown.summary.period.school_days} tədris günü
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sinif detalları</CardTitle>
                </CardHeader>
                <CardContent>
                  {classLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : classBreakdown ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sinif</TableHead>
                          <TableHead className="text-center">Şagird</TableHead>
                          <TableHead className="text-center">Hesabat günləri</TableHead>
                          <TableHead className="text-center">Orta davamiyyət</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classBreakdown.classes.map((classStat) => (
                          <TableRow key={classStat.grade_id ?? classStat.name}>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                                {classStat.class_level}-{classStat.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {numberFormatter.format(classStat.student_count)}
                            </TableCell>
                            <TableCell className="text-center">
                              {classStat.reported_days}/{classStat.expected_school_days}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatPercent(classStat.average_attendance_rate)}
                            </TableCell>
                            <TableCell className="text-center">
                              {classStat.warnings?.length ? (
                                <Badge variant="destructive">
                                  {classStat.warnings.includes('reports_missing')
                                    ? 'Hesabat yoxdur'
                                    : 'Aşağı davamiyyət'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sinif məlumatı tapılmadı.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
