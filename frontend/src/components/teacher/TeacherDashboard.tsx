import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock,
  FileText, 
  Bell, 
  Activity,
  School,
  Target,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Award,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService, TeacherDashboardStats } from "@/services/dashboard";
import { Loader2 } from "lucide-react";

export const TeacherDashboard = ({ className }: { className?: string } = {}) => {
  // Load dashboard data
  const { data: stats, isLoading, error } = useQuery<TeacherDashboardStats>({
    queryKey: ['teacher-dashboard-stats'],
    queryFn: () => dashboardService.getTeacherStats(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchIntervalInBackground: false, // Don't refresh in background
    staleTime: 3 * 60 * 1000, // 3 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Müəllim məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Xəta baş verdi</h3>
        <p className="text-muted-foreground mb-4">
          Dashboard məlumatları yüklənərkən xəta baş verdi.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Yenidən Cəhd Et
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Müəllim Paneli
            </h1>
            <p className="text-muted-foreground">
              Xoş gəlmisiniz, {stats.teacherInfo?.name || 'Müəllim'}!
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {stats.teacherInfo?.subject || 'Müəllim'} - {stats.teacherInfo?.school || 'Məktəb'}
          </Badge>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Təyin edilmiş Siniflər"
          value={stats.assignedClasses.toString()}
          icon={BookOpen}
        />
        <StatsCard
          title="Ümumi Şagirdlər"
          value={stats.totalStudents.toString()}
          icon={Users}
        />
        <StatsCard
          title="Həftəlik Saat"
          value={stats.weeklyHours.toString()}
          icon={Clock}
        />
        <StatsCard
          title="Davamiyyət"
          value={`${stats.attendanceRate}%`}
          icon={CheckCircle}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Sürətli Əməliyyatlar
            </CardTitle>
            <CardDescription>
              Tez-tez istifadə etdiyiniz funksiyalar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/teacher/classes">
                <School className="h-4 w-4 mr-2" />
                Siniflərim
                <ArrowRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/teacher/schedule">
                <Calendar className="h-4 w-4 mr-2" />
                Dərs Cədvəli
                <ArrowRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/assessments/entry">
                <FileText className="h-4 w-4 mr-2" />
                Qiymət Daxil Et
                <ArrowRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/teacher/resources">
                <BookOpen className="h-4 w-4 mr-2" />
                Resurslarım
                <ArrowRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Cari Fəaliyyətlər
            </CardTitle>
            <CardDescription>
              Gözləyən tapşırıqlar və bildirişlər
              Tez-tez istifadə edilən əməliyyatlar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Qiymət Qeydiyyatı
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Davamiyyət Yoxla
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dərs Planlaması
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Sinif Hesabatı
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Dərs Materialları
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Award className="h-4 w-4" />
                Şagird Qiymətləndirməsi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Müəllim Məlumatları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ad Soyad</p>
              <p className="font-medium">{stats.teacherInfo.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">İxtisas Fəni</p>
              <p className="font-medium">{stats.teacherInfo.subject}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Məktəb</p>
              <p className="font-medium">{stats.teacherInfo.school}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departament</p>
              <p className="font-medium">{stats.teacherInfo.department}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Təcrübə</p>
              <p className="font-medium">{stats.teacherInfo.experienceYears} il</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;