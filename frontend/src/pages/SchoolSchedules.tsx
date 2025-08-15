import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Clock, Edit, Eye, Download, Loader2, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { scheduleService, Schedule, ScheduleFilters } from "@/services/schedule";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { az } from "date-fns/locale";

export default function SchoolSchedules() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const { toast } = useToast();

  // Build filters
  const filters: ScheduleFilters = useMemo(() => {
    const f: ScheduleFilters = {};
    if (selectedType !== 'all') f.type = selectedType;
    if (selectedStatus !== 'all') f.status = selectedStatus;
    return f;
  }, [selectedType, selectedStatus]);

  // Load schedules
  const { data: schedulesResponse, isLoading: schedulesLoading, error } = useQuery({
    queryKey: ['schedules', filters],
    queryFn: () => scheduleService.getSchedules(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load schedule statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['schedule-statistics'],
    queryFn: () => scheduleService.getScheduleStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Load weekly schedule
  const { data: weeklyResponse, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weekly-schedule', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: () => scheduleService.getWeeklySchedule({
      week_start: format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }),
    staleTime: 1000 * 60 * 5,
  });

  const schedules = schedulesResponse?.data || [];
  const stats = statsResponse?.data || {
    total_schedules: 0,
    active_schedules: 0,
    pending_approval: 0,
    total_slots: 0,
    teachers_with_schedules: 0,
    classes_with_schedules: 0
  };

  const weeklyData = weeklyResponse?.data;

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'secondary';
      case 'draft': return 'outline';
      case 'inactive': return 'destructive';
      default: return 'outline';
    }
  };

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_approval': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'draft': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  // Days of week for schedule display
  const daysOfWeek = [
    { day: 1, name: 'Bazar ertəsi', short: 'B.e' },
    { day: 2, name: 'Çərşənbə axşamı', short: 'Ç.a' },
    { day: 3, name: 'Çərşənbə', short: 'Ç' },
    { day: 4, name: 'Cümə axşamı', short: 'C.a' },
    { day: 5, name: 'Cümə', short: 'C' },
    { day: 6, name: 'Şənbə', short: 'Ş' },
    { day: 0, name: 'Bazar', short: 'B' }
  ];

  const handleExport = async () => {
    try {
      const response = await scheduleService.exportSchedule({
        format: 'pdf',
        filters
      });
      if (response.success) {
        window.open(response.data.download_url, '_blank');
        toast({
          title: "Export uğurlu",
          description: "Dərs cədvəli PDF formatında yükləndi.",
        });
      }
    } catch (error) {
      toast({
        title: "Export xətası",
        description: "Dərs cədvəli export edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Dərs cədvəli məlumatları yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dərs Cədvəli</h1>
          <p className="text-muted-foreground">Sinif və müəllim dərs cədvəlləri</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Cədvəl
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv cədvəllər</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.active_schedules
                  )}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi slotlar</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_slots
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Təsdiq gözləyənlər</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.pending_approval
                  )}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Müəllimlər</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.teachers_with_schedules
                  )}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrləmə</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Cədvəl növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                <SelectItem value="weekly">Həftəlik</SelectItem>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="custom">Xüsusi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="pending_approval">Təsdiq gözləyir</SelectItem>
                <SelectItem value="draft">Layihə</SelectItem>
                <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              >
                ← Əvvəlki həftə
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Bu həftə
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                Növbəti həftə →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Həftəlik Dərs Cədvəli
          </CardTitle>
          <CardDescription>
            {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd MMM', { locale: az })} - {' '}
            {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: az })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Həftəlik cədvəl yüklənir...</span>
            </div>
          ) : weeklyData?.slots?.length ? (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 gap-2 min-w-full">
                {/* Header row */}
                <div className="font-medium text-center py-2">Saat</div>
                {daysOfWeek.map((day) => (
                  <div key={day.day} className="font-medium text-center py-2">
                    <div>{day.short}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), day.day === 0 ? 6 : day.day - 1), 'dd')}
                    </div>
                  </div>
                ))}
                
                {/* Time slots */}
                {Array.from({ length: 8 }, (_, hour) => {
                  const timeSlot = `${(hour + 8).toString().padStart(2, '0')}:00`;
                  return (
                    <div key={hour} className="contents">
                      <div className="text-sm text-center py-3 border-t">
                        {timeSlot}
                      </div>
                      {daysOfWeek.map((day) => {
                        const daySlots = weeklyData.slots.filter(slot => 
                          slot.day_of_week === day.day && 
                          slot.start_time.startsWith((hour + 8).toString().padStart(2, '0'))
                        );
                        
                        return (
                          <div key={`${day.day}-${hour}`} className="border-t p-1 min-h-[60px]">
                            {daySlots.map((slot, index) => (
                              <div 
                                key={slot.id}
                                className="bg-primary/10 rounded p-1 mb-1 text-xs"
                              >
                                <div className="font-medium truncate">
                                  {slot.subject?.name}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {slot.class?.name}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {slot.teacher?.first_name} {slot.teacher?.last_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Bu həftə üçün dərs cədvəli tapılmadı</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>Cədvəl Siyahısı</CardTitle>
          <CardDescription>
            {schedules.length} cədvəl tapıldı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cədvəllər yüklənir...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Seçilmiş kriteriiyalara uyğun cədvəl tapılmadı
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cədvəl Adı</TableHead>
                    <TableHead>Növ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarix Aralığı</TableHead>
                    <TableHead>Yaradıcı</TableHead>
                    <TableHead className="text-center">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: Schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schedule.type === 'weekly' ? 'Həftəlik' : 
                           schedule.type === 'daily' ? 'Günlük' : 'Xüsusi'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(schedule.status)}
                          <Badge variant={getStatusVariant(schedule.status)}>
                            {schedule.status === 'active' ? 'Aktiv' :
                             schedule.status === 'pending_approval' ? 'Təsdiq gözləyir' :
                             schedule.status === 'draft' ? 'Layihə' : 'Qeyri-aktiv'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(schedule.start_date), 'dd.MM.yyyy')}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(schedule.end_date), 'dd.MM.yyyy')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.creator?.first_name} {schedule.creator?.last_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" title="Ətraflı bax">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Redaktə et">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}