import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  School, 
  CalendarIcon,
  BarChart3,
  PieChart,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { attendanceService } from '@/services/attendance';
import { institutionService } from '@/services/institutions';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: number;
  date: string;
  school_name: string;
  class_name: string;
  start_count: number;
  end_count: number;
  attendance_rate: number;
  notes?: string;
  school?: {
    id: number;
    name: string;
    type: string;
  };
}

interface AttendanceStats {
  total_students: number;
  average_attendance: number;
  trend_direction: 'up' | 'down' | 'stable';
  total_days: number;
  total_records: number;
}

export default function AttendanceReports() {
  const { currentUser } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Get current user's institution for filtering
  const userInstitutionId = currentUser?.institution?.id;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isRegionAdmin = currentUser?.role === 'regionadmin';
  const isSektorAdmin = currentUser?.role === 'sektoradmin';
  const isSchoolAdmin = currentUser?.role === 'məktəbadmin';

  // Load schools data (only for higher admins)
  const { data: schoolsResponse } = useQuery({
    queryKey: ['institutions', 'schools'],
    queryFn: () => institutionService.getAll(),
    enabled: isSuperAdmin || isRegionAdmin || isSektorAdmin
  });

  const schools = useMemo(() => {
    if (!schoolsResponse?.success || !schoolsResponse.data) return [];
    const data = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : schoolsResponse.data.data || [];
    return data.filter((institution: any) => 
      ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'].includes(institution.type)
    );
  }, [schoolsResponse]);

  // Load attendance data
  const { data: attendanceResponse, isLoading: attendanceLoading, refetch } = useQuery({
    queryKey: ['attendance-reports', selectedSchool, selectedClass, startDate, endDate, reportType],
    queryFn: () => {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      // For school admin, only show their school's data
      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      if (selectedClass !== 'all') {
        filters.class_name = selectedClass;
      }

      return attendanceService.getAttendanceRecords(filters);
    }
  });

  // Load attendance stats
  const { data: statsResponse } = useQuery({
    queryKey: ['attendance-stats-reports', selectedSchool, startDate, endDate],
    queryFn: () => {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      return attendanceService.getAttendanceStats(filters);
    }
  });

  const attendanceData = attendanceResponse?.data || [];
  const attendanceStats = statsResponse?.data || {
    total_students: 0,
    average_attendance: 0,
    trend_direction: 'stable' as const,
    total_days: 0,
    total_records: 0
  };

  // Get unique classes from filtered data
  const availableClasses = useMemo(() => {
    const classes = [...new Set(attendanceData.map((record: AttendanceRecord) => record.class_name))];
    return classes.sort();
  }, [attendanceData]);

  const handleExportReport = async () => {
    try {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      if (selectedClass !== 'all') {
        filters.class_name = selectedClass;
      }

      const blob = await attendanceService.exportAttendance(filters);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davamiyyət-hesabatı-${format(new Date(), 'dd-MM-yyyy')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Hesabat uğurla export edildi');
    } catch (error) {
      toast.error('Export zamanı xəta baş verdi');
    }
  };

  const handleResetFilters = () => {
    setSelectedSchool('all');
    setSelectedClass('all');
    setStartDate(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setReportType('daily');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davamiyyət Hesabatları</h1>
          <p className="text-muted-foreground">
            Detallı davamiyyət analizi və statistika 
            {isSchoolAdmin && currentUser?.institution && (
              <span className="text-blue-600 font-medium"> - {currentUser.institution.name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Yenilə
          </Button>
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Qeyd</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.total_records}</div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats.total_days} gün
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orta Davamiyyət</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.average_attendance}%</div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats.total_students} şagird
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {attendanceStats.trend_direction === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : attendanceStats.trend_direction === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <BarChart3 className="h-4 w-4 text-blue-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              attendanceStats.trend_direction === 'up' ? 'text-green-600' : 
              attendanceStats.trend_direction === 'down' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {attendanceStats.trend_direction === 'up' ? '+2.3%' : 
               attendanceStats.trend_direction === 'down' ? '-1.2%' : 'Sabit'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dövr</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(startDate), 'dd.MM', { locale: az })} - {format(new Date(endDate), 'dd.MM', { locale: az })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* School filter - only for non-school admins */}
            {!isSchoolAdmin && (
              <div className="space-y-2">
                <Label>Məktəb</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Məktəb seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün məktəblər</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sinif</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün siniflər</SelectItem>
                  {availableClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hesabat növü</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Həftəlik</SelectItem>
                  <SelectItem value="monthly">Aylıq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlanğıc tarixi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Son tarix</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleResetFilters} className="w-full">
                Sıfırla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Davamiyyət Qeydləri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {attendanceData.length} qeyd tapıldı
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarix</TableHead>
                  {!isSchoolAdmin && <TableHead>Məktəb</TableHead>}
                  <TableHead>Sinif</TableHead>
                  <TableHead className="text-center">Başlanğıc</TableHead>
                  <TableHead className="text-center">Son</TableHead>
                  <TableHead className="text-center">Davamiyyət %</TableHead>
                  <TableHead>Qeydlər</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      {!isSchoolAdmin && <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>}
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : attendanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSchoolAdmin ? 6 : 7} className="text-center py-8 text-muted-foreground">
                      Seçilmiş kriteriyalara uyğun məlumat tapılmadı
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData.map((record: AttendanceRecord) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), 'dd.MM.yyyy', { locale: az })}
                      </TableCell>
                      {!isSchoolAdmin && (
                        <TableCell className="font-medium">
                          {record.school?.name || record.school_name}
                        </TableCell>
                      )}
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell className="text-center">{record.start_count}</TableCell>
                      <TableCell className="text-center">{record.end_count}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${
                          record.attendance_rate >= 95 
                            ? 'text-green-600' 
                            : record.attendance_rate >= 85 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          {record.attendance_rate}%
                        </span>
                      </TableCell>
                      <TableCell>{record.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}