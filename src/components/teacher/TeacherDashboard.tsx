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
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { Loader2 } from "lucide-react";

interface TeacherDashboardStats {
  assignedClasses: number;
  totalStudents: number;
  subjectsTeaching: number;
  attendanceRate: number;
  weeklyHours: number;
  pendingGrades: number;
  activeSurveys: number;
  upcomingTasks: number;
  teacherInfo: {
    name: string;
    subject: string;
    school: string;
    experienceYears: number;
    department: string;
  };
  weeklySchedule: Array<{
    day: string;
    classes: Array<{
      time: string;
      subject: string;
      class: string;
      room: string;
    }>;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    time: string;
    status: string;
    class?: string;
  }>;
  classPerformance: Array<{
    class: string;
    subject: string;
    students: number;
    averageGrade: number;
    attendanceRate: number;
  }>;
}

export const TeacherDashboard = () => {
  // Load dashboard data
  const { data: stats, isLoading, error } = useQuery<TeacherDashboardStats>({
    queryKey: ['teacher-dashboard-stats'],
    queryFn: () => dashboardService.getTeacherStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
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

  const studentsPerClass = stats.assignedClasses > 0 
    ? Math.round(stats.totalStudents / stats.assignedClasses) 
    : 0;

  const getCurrentDaySchedule = () => {
    const today = new Date().toLocaleDateString('az-AZ', { weekday: 'long' });
    return stats.weeklySchedule.find(day => day.day === today) || stats.weeklySchedule[0];
  };

  const todaySchedule = getCurrentDaySchedule();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Müəllim Paneli
          </h1>
          <Badge variant="secondary" className="text-sm">
            {stats.teacherInfo.subject} - {stats.teacherInfo.school}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Xoş gəlmisiniz, {stats.teacherInfo.name}! {stats.teacherInfo.experienceYears} il təcrübə
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Təyin edilmiş Siniflər"
          value={stats.assignedClasses.toString()}
          description={`${stats.totalStudents} şagird`}
          icon={BookOpen}
          trend={{ value: studentsPerClass, isPositive: true }}
        />
        <StatsCard
          title="Tədris olunan Fənlər"
          value={stats.subjectsTeaching.toString()}
          description="Aktiv fənlər"
          icon={GraduationCap}
        />
        <StatsCard
          title="Həftəlik Saat"
          value={stats.weeklyHours.toString()}
          description="Dərs saatları"
          icon={Clock}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Davamiyyət"
          value={`${stats.attendanceRate}%`}
          description="Ortalama davamiyyət"
          icon={CheckCircle}
          trend={{ value: stats.attendanceRate > 85 ? 1 : -1, isPositive: stats.attendanceRate > 85 }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gözləyən Qiymətlər</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingGrades}</div>
            <p className="text-xs text-muted-foreground">Qeyd edilməlidir</p>
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
            <CardTitle className="text-sm font-medium">Gələcək Tapşırıqlar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingTasks}</div>
            <p className="text-xs text-muted-foreground">Bu həftə</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orta Sinif Ölçüsü</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsPerClass}</div>
            <p className="text-xs text-muted-foreground">Şagird/sinif</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bugünkü Dərs Cədvəli - {todaySchedule.day}
            </CardTitle>
            <CardDescription>
              Bugün tədris edəcəyiniz dərslər
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaySchedule.classes.length > 0 ? (
                todaySchedule.classes.map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{lesson.subject}</h4>
                        <Badge variant="outline" className="text-xs">
                          {lesson.class}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lesson.time} • {lesson.room}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Dərsə get
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Bugün dərs yoxdur</p>
                </div>
              )}
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
              Sizə aid son dəyişikliklər
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

      {/* Class Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sinif Performansı
            </CardTitle>
            <CardDescription>
              Tədris etdiyiniz siniflərin performans göstəriciləri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.classPerformance.map((classData, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{classData.class} - {classData.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {classData.students} şagird
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Orta qiymət: {classData.averageGrade}</p>
                      <p className="text-xs text-muted-foreground">
                        Davamiyyət: {classData.attendanceRate}%
                      </p>
                    </div>
                  </div>
                  <Progress value={classData.attendanceRate} className="h-2" />
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