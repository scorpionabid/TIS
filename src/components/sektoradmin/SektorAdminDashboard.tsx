import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  School, 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileText, 
  Bell, 
  TrendingUp,
  Calendar,
  Activity,
  UserCheck,
  BookOpen,
  Target,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { Loader2 } from "lucide-react";

interface SektorDashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  sektorUsers: number;
  activeSurveys: number;
  pendingReports: number;
  sektorInfo: {
    name: string;
    region: string;
    establishedYear: string;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    time: string;
    status: string;
    school?: string;
  }>;
  schoolsList: Array<{
    id: number;
    name: string;
    type: string;
    students: number;
    teachers: number;
    status: string;
  }>;
}

export const SektorAdminDashboard = () => {
  // Load dashboard data
  const { data: stats, isLoading, error, refetch, isFetching } = useQuery<SektorDashboardStats>({
    queryKey: ['sektor-dashboard-stats'],
    queryFn: () => dashboardService.getSektorAdminStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const handleManualRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Sektor məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Sektor İdarəetmə Paneli
          </h1>
          <p className="text-muted-foreground">
            Sektorunuzdakı bütün məktəblərin və fəaliyyətlərin idarə edilməsi
          </p>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Xəta baş verdi
            </CardTitle>
            <CardDescription>
              Dashboard məlumatları yüklənə bilmədi. İnternet bağlantınızı yoxlayın və səhifəni yeniləyin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Yenidən yüklə
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schoolsActiveRate = stats.totalSchools > 0 
    ? Math.round((stats.activeSchools / stats.totalSchools) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Sektor İdarəetmə Paneli
          </h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={isFetching}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Yenilə
            </Button>
            <Badge variant="secondary" className="text-sm">
              {stats.sektorInfo.region} - {stats.sektorInfo.name}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground">
          Sektorunuzdakı bütün məktəblərin və fəaliyyətlərin idarə edilməsi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ümumi Məktəblər"
          value={stats.totalSchools.toString()}
          description={`${stats.activeSchools} aktiv məktəb`}
          icon={School}
          trend={{ value: schoolsActiveRate, isPositive: true }}
        />
        <StatsCard
          title="Ümumi Şagirdlər"
          value={stats.totalStudents.toLocaleString()}
          description="Bütün məktəblərdə"
          icon={GraduationCap}
        />
        <StatsCard
          title="Ümumi Müəllimlər"
          value={stats.totalTeachers.toString()}
          description="Aktiv müəllimlər"
          icon={UserCheck}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Sektor İstifadəçiləri"
          value={stats.sektorUsers.toString()}
          description="Sistem istifadəçiləri"
          icon={Users}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Gözləyən Hesabatlar</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Təqdim edilməlidir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Məktəb Aktivlik Dərəcəsi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{schoolsActiveRate}%</div>
            <Progress value={schoolsActiveRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Schools Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Məktəblər Ümumi Görünüş
            </CardTitle>
            <CardDescription>
              Sektorunuzdakı məktəblərin əsas statistikaları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.schoolsList.map((school) => (
                <div key={school.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{school.name}</h4>
                      <Badge 
                        variant={school.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {school.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{school.type}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {school.students}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {school.teachers}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <Button variant="outline" className="w-full">
                  Bütün məktəblər
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
              Sektor daxilindəki son dəyişikliklər
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
                    {activity.school && (
                      <p className="text-xs text-blue-600 mt-1">{activity.school}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Yeni Sorğu Yarat
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hesabat İxrac Et
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Məktəb Əlavə Et
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              İstifadəçi Qeydiyyatı
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Təqvim Planlaması
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};