import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar,
  Clock,
  Users,
  BookOpen,
  MapPin,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  School,
  UserCheck,
  BarChart3,
  FileText,
  CalendarDays
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { ScheduleGrid } from '@/components/schedules/ScheduleGrid';
import { ScheduleBuilder } from '@/components/schedules/ScheduleBuilder';
import { ConflictDetector } from '@/components/schedules/ConflictDetector';
import { RoomBooking } from '@/components/schedules/RoomBooking';
import { ScheduleTemplate } from '@/components/schedules/ScheduleTemplate';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const MuavinDashboard: React.FC<{ className?: string }> = ({ className }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | undefined>();

  // Fetch dashboard stats for Müavin role
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: [...schoolAdminKeys.dashboardStats(), 'muavin'],
    queryFn: () => schoolAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch schedule-related activities
  const { 
    data: scheduleActivities, 
    isLoading: activitiesLoading 
  } = useQuery({
    queryKey: [...schoolAdminKeys.activities(), 'schedule'],
    queryFn: () => schoolAdminService.getRecentActivities(6),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch classes data
  const { 
    data: classes, 
    isLoading: classesLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses({ per_page: 20 }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch teachers data
  const { 
    data: teachers, 
    isLoading: teachersLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.teachers(),
    queryFn: () => schoolAdminService.getTeachers({ per_page: 20 }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate stats for Müavin dashboard - MOVED BEFORE EARLY RETURN
  const totalClasses = classes?.length || 0;
  const activeTeachers = teachers?.filter(t => t.is_active)?.length || 0;
  
  // Schedule management calculations - MOVED BEFORE EARLY RETURN
  const scheduleConflicts = useMemo(() => {
    // Basic conflict detection - can be enhanced with actual schedule data
    return 0; // No conflicts detected in current implementation
  }, []);
  
  const weeklyWorkload = useMemo(() => {
    // Calculate total weekly workload from teachers and classes
    const baseWorkload = Math.min(totalClasses * 5, 100); // 5 hours per class, max 100%
    return Math.round(baseWorkload);
  }, [totalClasses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
      ]);
      toast.success('Məlumatlar yeniləndi');
    } catch (error) {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    } finally {
      setRefreshing(false);
    }
  };

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Dashboard yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dərs İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Dərs cədvəli, sinif bölgüsü və akademik proseslərin idarəetməsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Yenilə
          </Button>
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Şablonlar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle>Cədvəl Şablonları</DialogTitle>
              </DialogHeader>
              <ScheduleTemplate onTemplateSelect={() => setShowTemplateDialog(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={showScheduleBuilder} onOpenChange={setShowScheduleBuilder}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Cədvəl
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle>Yeni Dərs Cədvəli</DialogTitle>
              </DialogHeader>
              <ScheduleBuilder onSave={() => setShowScheduleBuilder(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ümumi Siniflər"
          value={totalClasses}
          icon={School}
          variant="primary"
        />
        <StatsCard
          title="Aktiv Müəllimlər"
          value={activeTeachers}
          icon={Users}
          variant="success"
        />
        <StatsCard
          title="Cədvəl Konfliktləri"
          value={scheduleConflicts}
          icon={AlertTriangle}
          variant={scheduleConflicts > 0 ? "destructive" : "success"}
        />
        <StatsCard
          title="Həftəlik Yük"
          value={`${weeklyWorkload}%`}
          icon={BarChart3}
          variant={weeklyWorkload > 90 ? "warning" : "default"}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bu Həftə Dərslər</p>
                  <p className="text-xl font-semibold">142</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Boş Saatlar</p>
                  <p className="text-xl font-semibold">8</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <MapPin className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Otaq Rezervasiyaları</p>
                  <p className="text-xl font-semibold">95%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Cədvəl İdarəetməsi</TabsTrigger>
          <TabsTrigger value="classes">Sinif Bölgüsü</TabsTrigger>
          <TabsTrigger value="teachers">Müəllim Təyinatları</TabsTrigger>
          <TabsTrigger value="reports">Hesabatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Schedule Grid */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Aktiv Dərs Cədvəli
                    </CardTitle>
                    <CardDescription>
                      Hazırkı akademik dövrün dərs cədvəli
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Şablonlar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowScheduleBuilder(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Cədvəl
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScheduleGrid 
                  viewMode="week" 
                  showConflicts={true}
                  onSlotClick={(slot) => {
                    console.log('Selected slot:', slot);
                  }}
                />
              </CardContent>
            </Card>

            {/* Conflict Detection */}
            <ConflictDetector 
              scheduleId={selectedScheduleId}
              autoDetect={true}
              onConflictResolve={(conflictId) => {
                console.log('Resolved conflict:', conflictId);
              }}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Sürətli Əməliyyatlar
                </CardTitle>
                <CardDescription>
                  Dərs cədvəli idarəetməsi üçün tez-tez istifadə olunan funksiyalar
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Yeni Cədvəl</p>
                    <p className="text-xs text-muted-foreground">Həftəlik cədvəl yarat</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Users className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Müəllim Təyin Et</p>
                    <p className="text-xs text-muted-foreground">Dərs təyinatları</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Otaq İdarəetməsi</p>
                    <p className="text-xs text-muted-foreground">Otaq rezervasiyaları</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Konflikt Yoxla</p>
                    <p className="text-xs text-muted-foreground">Cədvəl konfliktləri</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sinif Bölgüsü və İdarəetməsi</CardTitle>
              <CardDescription>Məktəbdəki bütün siniflərin idarəetməsi</CardDescription>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Siniflər yüklənir...</p>
                </div>
              ) : classes && classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.slice(0, 9).map((schoolClass) => (
                    <Card key={schoolClass.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{schoolClass.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {schoolClass.grade_level}-ci sinif
                            </p>
                          </div>
                          <Badge variant={schoolClass.is_active ? "default" : "secondary"}>
                            {schoolClass.is_active ? 'Aktiv' : 'Deaktiv'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{schoolClass.current_enrollment}/{schoolClass.capacity} şagird</span>
                          </div>
                          {schoolClass.room_number && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>Otaq {schoolClass.room_number}</span>
                            </div>
                          )}
                          {schoolClass.class_teacher && (
                            <div className="flex items-center gap-2 text-sm">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span>{schoolClass.class_teacher.name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Dolğunluq</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((schoolClass.current_enrollment / schoolClass.capacity) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(schoolClass.current_enrollment / schoolClass.capacity) * 100} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="ghost" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-1" />
                            Bax
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1">
                            <Edit className="h-4 w-4 mr-1" />
                            Düzəliş
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Hələ ki sinif məlumatı yoxdur</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Sinfi Yarat
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Müəllim Təyinatları</CardTitle>
              <CardDescription>Müəllimlər və onların fənn təyinatları</CardDescription>
            </CardHeader>
            <CardContent>
              {teachersLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Müəllimlər yüklənir...</p>
                </div>
              ) : teachers && teachers.length > 0 ? (
                <div className="space-y-4">
                  {teachers.slice(0, 8).map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{teacher.first_name} {teacher.last_name}</p>
                          <p className="text-sm text-muted-foreground">{teacher.department} - {teacher.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{teacher.workload_hours || 18} saat/həftə</p>
                          <div className="flex gap-1 mt-1">
                            {teacher.subjects?.slice(0, 3).map((subject, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant={teacher.is_active ? "default" : "secondary"}>
                          {teacher.is_active ? 'Aktiv' : 'Deaktiv'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Hələ ki müəllim məlumatı yoxdur</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Akademik Hesabatlar</CardTitle>
              <CardDescription>Dərs cədvəli və akademik performans hesabatları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Cədvəl Hesabatı</p>
                    <p className="text-sm text-muted-foreground">Həftəlik dərs bölgüsü</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <BarChart3 className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Yük Analizi</p>
                    <p className="text-sm text-muted-foreground">Müəllim iş yükü</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Otaq Utilizasiyası</p>
                    <p className="text-sm text-muted-foreground">Otaq istifadə statistikası</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <CalendarDays className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">İllik Proqram</p>
                    <p className="text-sm text-muted-foreground">Akademik il planlaması</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};