import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, School, Users, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { institutionService } from "@/services/institutions";
import { attendanceService } from "@/services/attendance";
import { format } from "date-fns";
import { az } from "date-fns/locale";

interface AttendanceRecord {
  id: number;
  date: string;
  school_name: string;
  class_name: string;
  start_count: number;
  end_count: number;
  attendance_rate: number;
}

interface AttendanceStats {
  total_students: number;
  average_attendance: number;
  trend_direction: 'up' | 'down' | 'stable';
  total_days: number;
}

export default function AttendanceReport() {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Load schools data
  const { data: schoolsResponse } = useQuery({
    queryKey: ['institutions', 'schools'],
    queryFn: () => institutionService.getAll()
  });

  const schools = useMemo(() => {
    if (!schoolsResponse?.success || !schoolsResponse.data) return [];
    const data = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : schoolsResponse.data.data || [];
    return data.filter((institution: any) => 
      ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'].includes(institution.type)
    );
  }, [schoolsResponse]);

  // Load attendance data
  const { data: attendanceResponse, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-records', selectedSchool, selectedClass, startDate, endDate],
    queryFn: () => attendanceService.getAttendanceRecords({
      school_id: selectedSchool !== 'all' ? parseInt(selectedSchool) : undefined,
      class_name: selectedClass !== 'all' ? selectedClass : undefined,
      start_date: startDate,
      end_date: endDate
    })
  });

  // Load attendance stats
  const { data: statsResponse } = useQuery({
    queryKey: ['attendance-stats', selectedSchool, startDate, endDate],
    queryFn: () => attendanceService.getAttendanceStats({
      school_id: selectedSchool !== 'all' ? parseInt(selectedSchool) : undefined,
      start_date: startDate,
      end_date: endDate
    })
  });

  const attendanceData = attendanceResponse?.data || [];
  const attendanceStats = statsResponse?.data || {
    total_students: 0,
    average_attendance: 0,
    trend_direction: 'stable' as const,
    total_days: 0
  };

  // Get filtered data - API already handles filtering
  const filteredData = attendanceData;

  // Get unique classes from filtered data
  const availableClasses = useMemo(() => {
    const classes = [...new Set(attendanceData.map(record => record.class_name))];
    return classes.sort();
  }, [attendanceData]);

  const handleExport = () => {
    const csvData = filteredData.map(record => ({
      'Tarix': format(new Date(record.date), 'dd.MM.yyyy', { locale: az }),
      'Məktəb': record.school?.name || record.school_name,
      'Sinif': record.class_name,
      'Gün əvvəli sayı': record.start_count,
      'Gün sonu sayı': record.end_count,
      'Davamiyyət faizi': `${record.attendance_rate}%`
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `davamiyyət-hesabatı-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davamiyyət Hesabatı</h1>
          <p className="text-muted-foreground">Şagird davamiyyətinin analizi və hesabatı</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Hesabatı Export Et
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Şagird Sayı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.total_students.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orta Davamiyyət</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.average_attendance}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {attendanceStats.trend_direction === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              attendanceStats.trend_direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {attendanceStats.trend_direction === 'up' ? '+2.3%' : '-1.2%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hesabat Günləri</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.total_days}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filterlər</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Məktəb</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Sinif</label>
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
              <label className="text-sm font-medium">Başlanğıc tarixi</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Son tarix</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium invisible">Əməliyyat</label>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedSchool('all');
                  setSelectedClass('all');
                  setStartDate(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                }}
              >
                Filterləri Sıfırla
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
            {filteredData.length} qeyd tapıldı
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarix</TableHead>
                  <TableHead>Məktəb</TableHead>
                  <TableHead>Sinif</TableHead>
                  <TableHead className="text-center">Gün Əvvəli</TableHead>
                  <TableHead className="text-center">Gün Sonu</TableHead>
                  <TableHead className="text-center">Davamiyyət %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Seçilmiş kriteriyalara uyğun məlumat tapılmadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), 'dd.MM.yyyy', { locale: az })}
                      </TableCell>
                      <TableCell className="font-medium">{record.school?.name || record.school_name}</TableCell>
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