import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  FileText, 
  Bell, 
  TrendingUp,
  Activity,
  UserCheck,
  School,
  Target,
  Clock,
  Award,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { Loader2 } from "lucide-react";

interface SchoolDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeSubjects: number;
  schoolUsers: number;
  activeSurveys: number;
  pendingTasks: number;
  attendanceRate: number;
  schoolInfo: {
    name: string;
    type: string;
    sector: string;
    establishedYear: string;
    address: string;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    time: string;
    status: string;
    class?: string;
  }>;
  classroomStats: Array<{
    id: number;
    grade: number;
    section: string;
    students: number;
    teacher: string;
  }>;
  teachersBySubject: Array<{
    subject: string;
    teachers: number;
    classes: number;
  }>;
}

export const SchoolAdminDashboard = () => {
  // Load dashboard data
  const { data: stats, isLoading, error } = useQuery<SchoolDashboardStats>({
    queryKey: ['school-dashboard-stats'],
    queryFn: () => dashboardService.getSchoolAdminStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Məktəb məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Xəta baş verdi</CardTitle>
            <CardDescription>
              Dashboard məlumatları yüklənə bilmədi. Səhifəni yeniləyin və ya daha sonra cəhd edin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const averageStudentsPerClass = stats.totalClasses > 0 
    ? Math.round(stats.totalStudents / stats.totalClasses) 
    : 0;

  const teacherStudentRatio = stats.totalTeachers > 0 
    ? Math.round(stats.totalStudents / stats.totalTeachers) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Məktəb İdarəetmə Paneli
          </h1>
          <Badge variant="secondary" className="text-sm">
            {stats.schoolInfo.type} - {stats.schoolInfo.name}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {stats.schoolInfo.sector} sektorunda yerləşən məktəbinizin idarə edilməsi
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ümumi Şagirdlər"
          value={stats.totalStudents.toString()}
          description={`${stats.totalClasses} sinifdə`}
          icon={GraduationCap}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Müəllimlər"
          value={stats.totalTeachers.toString()}
          description="Aktiv müəllimlər"
          icon={UserCheck}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Siniflər"
          value={stats.totalClasses.toString()}
          description={`Orta ${averageStudentsPerClass} şagird`}
          icon={BookOpen}
        />
        <StatsCard
          title="Davamiyyət"
          value={`${stats.attendanceRate}%`}
          description="Ümumi davamiyyət dərəcəsi"
          icon={CheckCircle}
          trend={{ value: stats.attendanceRate > 90 ? 1 : -1, isPositive: stats.attendanceRate > 90 }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Fənlər</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeSubjects}</div>
            <p className="text-xs text-muted-foreground">Tədris edilir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müəllim/Şagird</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1:{teacherStudentRatio}</div>
            <p className="text-xs text-muted-foreground">Nisbəti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Sorğular</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeSurveys}</div>
            <p className="text-xs text-muted-foreground">Cavab gözləyir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gözləyən Tapşırıqlar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Tamamlanmalıdır</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Classes Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Sinif Statistikaları
            </CardTitle>
            <CardDescription>
              Məktəbinizdəki siniflərin əsas məlumatları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.classroomStats.map((classroom) => (
                <div key={classroom.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{classroom.grade}-{classroom.section} sinfi</h4>
                      <Badge variant="outline" className="text-xs">
                        {classroom.students} şagird
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{classroom.teacher}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {classroom.students}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <Button variant="outline" className="w-full">
                  Bütün siniflər
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Son Fəaliyyətlər
            </CardTitle>
            <CardDescription>
              Məktəb daxilindəki son dəyişikliklər
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'completed' ? 'bg-green-500' :
                      activity.status === 'in_progress' ? 'bg-blue-500' :
                      activity.status === 'pending' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    {activity.class && (
                      <p className="text-xs text-blue-600 mt-1">{activity.class}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teachers by Subject */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Fənlər üzrə Müəllimlər
            </CardTitle>
            <CardDescription>
              Hər fənn üzrə müəllim sayı və sinif sayı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.teachersBySubject.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{subject.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.classes} sinif tədris edilir
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {subject.teachers} müəllim
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Tez Əməliyyatlar
            </CardTitle>
            <CardDescription>
              Tez-tez istifadə edilən əməliyyatlar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Yeni Şagird Qeydiyyatı
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dərs Cədvəli Planla
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Davamiyyət Qeydiyyatı
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Aylıq Hesabat Yarat
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Users className="h-4 w-4" />
                Müəllim İdarəetməsi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* School Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Məktəb Haqqında
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Məktəb Adı</p>
              <p className="font-medium">{stats.schoolInfo.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Növü</p>
              <p className="font-medium">{stats.schoolInfo.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sektor</p>
              <p className="font-medium">{stats.schoolInfo.sector}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Təsis ili</p>
              <p className="font-medium">{stats.schoolInfo.establishedYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};