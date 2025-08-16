import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  UserCheck, 
  Search, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Edit,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
  Filter,
  RefreshCw,
  BookOpen,
  User,
  Save,
  CalendarDays,
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys, AttendanceRecord, BulkAttendanceData, AttendanceStats } from '@/services/schoolAdmin';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceRecorderProps {
  className?: string;
}

export const AttendanceRecorder: React.FC<AttendanceRecorderProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<number, { status: string; notes?: string }>>({});
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'stats'>('daily');
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused' | ''>('');

  // Fetch classes
  const { 
    data: classes 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch students for selected class
  const { 
    data: students,
    isLoading: studentsLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.students(),
    queryFn: () => selectedClassId ? schoolAdminService.getStudentsByClass(selectedClassId) : Promise.resolve([]),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch attendance for selected class and date
  const { 
    data: existingAttendance,
    isLoading: attendanceLoading,
    refetch: refetchAttendance 
  } = useQuery({
    queryKey: schoolAdminKeys.attendance(selectedClassId, selectedDate),
    queryFn: () => selectedClassId ? schoolAdminService.getAttendanceForClass(selectedClassId, selectedDate) : Promise.resolve([]),
    enabled: !!selectedClassId && !!selectedDate,
    refetchOnWindowFocus: false,
  });

  // Fetch attendance statistics
  const { 
    data: attendanceStats,
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['attendance-stats', selectedClassId, selectedDate],
    queryFn: () => selectedClassId ? schoolAdminService.getAttendanceStats(
      selectedClassId, 
      format(startOfWeek(new Date(selectedDate)), 'yyyy-MM-dd'),
      format(endOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
    ) : Promise.resolve(null),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Record attendance mutation
  const recordAttendanceMutation = useMutation({
    mutationFn: (data: BulkAttendanceData) => schoolAdminService.recordBulkAttendance(data),
    onSuccess: () => {
      toast.success('Davamiyyət qeydə alındı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.attendance() });
      refetchAttendance();
    },
    onError: () => {
      toast.error('Davamiyyət qeydə alına bilmədi');
    },
  });

  // Initialize attendance data when existing attendance loads
  useEffect(() => {
    if (existingAttendance && students) {
      const attendanceMap: Record<number, { status: string; notes?: string }> = {};
      
      students.forEach(student => {
        const existing = existingAttendance.find(a => a.student_id === student.id);
        attendanceMap[student.id] = {
          status: existing?.status || 'present',
          notes: existing?.notes || ''
        };
      });
      
      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance, students]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Var';
      case 'absent': return 'Yox';
      case 'late': return 'Gecikmə';
      case 'excused': return 'İzinli';
      default: return 'Təyin edilməyib';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'destructive';
      case 'late': return 'warning';
      case 'excused': return 'primary';
      default: return 'secondary';
    }
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleBulkStatusApply = () => {
    if (!bulkStatus || !students) return;
    
    const updatedData: Record<number, { status: string; notes?: string }> = {};
    students.forEach(student => {
      updatedData[student.id] = {
        status: bulkStatus,
        notes: attendanceData[student.id]?.notes || ''
      };
    });
    
    setAttendanceData(prev => ({ ...prev, ...updatedData }));
    setBulkStatus('');
    toast.success(`Bütün şagirdlər üçün "${getStatusText(bulkStatus)}" statusu tətbiq edildi`);
  };

  const handleSaveAttendance = () => {
    if (!selectedClassId || !students) return;

    const attendanceRecords = students.map(student => ({
      student_id: student.id,
      status: attendanceData[student.id]?.status || 'present',
      notes: attendanceData[student.id]?.notes || undefined
    }));

    const bulkData: BulkAttendanceData = {
      class_id: selectedClassId,
      date: selectedDate,
      attendance_records: attendanceRecords
    };

    recordAttendanceMutation.mutate(bulkData);
  };

  const calculateDailyStats = () => {
    if (!students || !attendanceData) return null;

    const stats = {
      total: students.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    students.forEach(student => {
      const status = attendanceData[student.id]?.status || 'present';
      stats[status as keyof typeof stats]++;
    });

    return {
      ...stats,
      attendance_rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
    };
  };

  const dailyStats = calculateDailyStats();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Davamiyyət Qeydiyyatı</h2>
          <p className="text-muted-foreground">
            Şagirdlərin davamiyyətini qeydə alın və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchAttendance()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenilə
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <Label>Sinif seçin</Label>
              <Select 
                value={selectedClassId?.toString() || ''} 
                onValueChange={(value) => setSelectedClassId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sinif seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {classes?.filter(c => c.is_active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} ({cls.current_enrollment} şagird)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tarix seçin</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant={viewMode === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('daily')}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Günlük
              </Button>
              <Button
                variant={viewMode === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('weekly')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Həftəlik
              </Button>
              <Button
                variant={viewMode === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('stats')}
              >
                <PieChart className="h-4 w-4 mr-2" />
                Statistika
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          <TabsContent value="daily" className="space-y-6">
            {/* Daily Stats */}
            {dailyStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ümumi</p>
                        <p className="text-2xl font-bold">{dailyStats.total}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Var</p>
                        <p className="text-2xl font-bold text-green-600">{dailyStats.present}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Yox</p>
                        <p className="text-2xl font-bold text-red-600">{dailyStats.absent}</p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gecikmə</p>
                        <p className="text-2xl font-bold text-orange-600">{dailyStats.late}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Davamiyyət %</p>
                        <p className="text-2xl font-bold text-blue-600">{dailyStats.attendance_rate}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bulk Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Toplu əməliyyatlar
                </CardTitle>
                <CardDescription>
                  Bütün şagirdlər üçün eyni statusu tətbiq edin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Hamısı var</SelectItem>
                      <SelectItem value="absent">Hamısı yox</SelectItem>
                      <SelectItem value="late">Hamısı gecikmiş</SelectItem>
                      <SelectItem value="excused">Hamısı izinli</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkStatusApply}
                    disabled={!bulkStatus}
                    variant="outline"
                  >
                    Tətbiq et
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attendance List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: az })} - Davamiyyət
                    </CardTitle>
                    <CardDescription>
                      {classes?.find(c => c.id === selectedClassId)?.name} sinifi
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleSaveAttendance}
                    disabled={recordAttendanceMutation.isPending || !students || students.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {recordAttendanceMutation.isPending ? 'Saxlanır...' : 'Saxla'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {studentsLoading || attendanceLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="w-48 h-4 bg-muted rounded" />
                          <div className="w-32 h-3 bg-muted rounded" />
                        </div>
                        <div className="w-24 h-8 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : students && students.length > 0 ? (
                  <div className="space-y-2">
                    {students.map(student => {
                      const status = attendanceData[student.id]?.status || 'present';
                      const notes = attendanceData[student.id]?.notes || '';
                      
                      return (
                        <div 
                          key={student.id} 
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                            status === 'absent' && "bg-red-50 border-red-200",
                            status === 'late' && "bg-orange-50 border-orange-200",
                            status === 'excused' && "bg-blue-50 border-blue-200",
                            status === 'present' && "bg-green-50 border-green-200"
                          )}
                        >
                          {/* Student Info */}
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {student.student_id}
                            </p>
                          </div>

                          {/* Status Selection */}
                          <div className="flex items-center gap-2">
                            {['present', 'absent', 'late', 'excused'].map(statusOption => (
                              <Button
                                key={statusOption}
                                variant={status === statusOption ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleStatusChange(student.id, statusOption)}
                                className={cn(
                                  "flex items-center gap-1",
                                  status === statusOption && statusOption === 'present' && "bg-green-600 hover:bg-green-700",
                                  status === statusOption && statusOption === 'absent' && "bg-red-600 hover:bg-red-700",
                                  status === statusOption && statusOption === 'late' && "bg-orange-600 hover:bg-orange-700",
                                  status === statusOption && statusOption === 'excused' && "bg-blue-600 hover:bg-blue-700"
                                )}
                              >
                                {getStatusIcon(statusOption)}
                                {getStatusText(statusOption)}
                              </Button>
                            ))}
                          </div>

                          {/* Notes */}
                          <div className="w-64">
                            <Input
                              placeholder="Qeyd əlavə edin..."
                              value={notes}
                              onChange={(e) => handleNotesChange(student.id, e.target.value)}
                              className="text-sm"
                            />
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Davamiyyət tarixçəsi
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Hesabat al
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Bu sinifdə şagird yoxdur</h3>
                    <p className="text-muted-foreground">
                      Davamiyyət qeydə almaq üçün əvvəlcə şagirdləri sinifə yazın
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Həftəlik davamiyyət</CardTitle>
                <CardDescription>
                  {format(startOfWeek(new Date(selectedDate)), 'dd MMM', { locale: az })} - {' '}
                  {format(endOfWeek(new Date(selectedDate)), 'dd MMM yyyy', { locale: az })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Həftəlik davamiyyət görünümü tezliklə əlavə olunacaq
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {/* Statistics */}
            {attendanceStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ümumi statistika</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ümumi şagird sayı</span>
                      <span className="font-semibold">{attendanceStats.total_students}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Orta davamiyyət</span>
                      <span className="font-semibold text-green-600">{attendanceStats.attendance_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Var olanlar</span>
                      <span className="font-semibold text-green-600">{attendanceStats.present_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Yox olanlar</span>
                      <span className="font-semibold text-red-600">{attendanceStats.absent_count}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Həftəlik trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendanceStats.weekly_trend && attendanceStats.weekly_trend.length > 0 ? (
                      <div className="space-y-3">
                        {attendanceStats.weekly_trend.map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {format(new Date(day.date), 'dd MMM', { locale: az })}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${day.rate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12">{day.rate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Hələ ki məlumat yoxdur</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedClassId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sinif seçin</h3>
              <p className="text-muted-foreground">
                Davamiyyət qeydə almaq üçün əvvəlcə sinif seçin
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};