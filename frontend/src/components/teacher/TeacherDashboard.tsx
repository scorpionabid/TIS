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
import { motion, Variants } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from "recharts";
import { format } from "date-fns";
import { az } from "date-fns/locale";

// Mock data
const scheduleData = [
  { id: 1, time: "08:30", subject: "Riyaziyyat", class: "9A", room: "301" },
  { id: 2, time: "09:30", subject: "Riyaziyyat", class: "10B", room: "302" },
  { id: 3, time: "10:45", subject: "Həndəsə", class: "11A", room: "301" },
  { id: 4, time: "11:45", subject: "Riyaziyyat", class: "8C", room: "303" },
];

const classPerformanceData = [
  { class: "9A", average: 82 },
  { class: "10B", average: 75 },
  { class: "11A", average: 88 },
  { class: "8C", average: 79 },
  { class: "9B", average: 85 },
];

export const TeacherDashboard = ({ className }: { className?: string } = {}) => {
  // Load dashboard data
  const { data: stats, isLoading, error } = useQuery<TeacherDashboardStats>({
    queryKey: ['teacher-dashboard-stats'],
    queryFn: () => dashboardService.getTeacherStats(),
    refetchInterval: 5 * 60 * 1000, 
    refetchIntervalInBackground: false, 
    staleTime: 3 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

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
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Müəllim Paneli
            </h1>
            <p className="text-muted-foreground">
              Xoş gəlmisiniz, {stats.teacherInfo?.name || 'Müəllim'}!
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {stats.teacherInfo?.subject || 'Müəllim'} • {stats.teacherInfo?.school || 'Məktəb'}
          </Badge>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Təyin edilmiş Siniflər"
            value={stats.assignedClasses.toString()}
            icon={BookOpen}
            variant="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Ümumi Şagirdlər"
            value={stats.totalStudents.toString()}
            icon={Users}
            variant="info"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Həftəlik Saat"
            value={stats.weeklyHours.toString()}
            icon={Clock}
            variant="warning"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
           <StatsCard
            title="Davamiyyət"
            value={`${stats.attendanceRate}%`}
            icon={CheckCircle}
            variant="success"
          />
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Daily Schedule */}
        <motion.div variants={itemVariants} className="md:col-span-8 lg:col-span-8">
           <Card className="h-full shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Bugünkü Dərs Cədvəli
                </CardTitle>
                <CardDescription>
                  {format(new Date(), "d MMMM yyyy, EEEE", { locale: az })}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {scheduleData.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card/50 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col items-center justify-center min-w-[3rem] p-2 bg-primary/10 rounded-md text-primary font-bold">
                       {item.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.subject}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                         <Users className="h-3 w-3" /> Sinif: {item.class}
                         <span className="text-border">|</span>
                         <School className="h-3 w-3" /> Otaq: {item.room}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">Bax</Button>
                  </div>
                 ))}
                 {scheduleData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu gün üçün dərs yoxdur.
                    </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-4">
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Sürətli Əməliyyatlar
              </CardTitle>
              <CardDescription>
                Ən çox istifadə olunanlar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/teacher/classes">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded mr-3 text-blue-600">
                    <School className="h-4 w-4" />
                  </div>
                  Siniflərim
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/teacher/schedule">
                   <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded mr-3 text-purple-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Dərs Cədvəli
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/assessments/entry">
                   <div className="p-1 bg-amber-100 dark:bg-amber-900/20 rounded mr-3 text-amber-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  Qiymət Daxil Et
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/teacher/resources">
                   <div className="p-1 bg-emerald-100 dark:bg-emerald-900/20 rounded mr-3 text-emerald-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  Resurslarım
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Class Performance Chart */}
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" />
                 Sinif Performansı
              </CardTitle>
              <CardDescription>Siniflər üzrə orta qiymət göstəriciləri</CardDescription>
            </CardHeader>
             <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="class" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }}
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                       {classPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.average >= 80 ? '#10b981' : entry.average >= 60 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Teacher Info / Other */}
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Award className="h-5 w-5 text-primary" />
                Müəllim Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">Ad Soyad</span>
                    <span className="font-medium">{stats.teacherInfo.name}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">İxtisas Fəni</span>
                    <span className="font-medium">{stats.teacherInfo.subject}</span>
                 </div>
                  <div className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">Məktəb</span>
                    <span className="font-medium">{stats.teacherInfo.school}</span>
                 </div>
                  <div className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">Departament</span>
                    <span className="font-medium">{stats.teacherInfo.department}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">Təcrübə</span>
                    <span className="font-medium">{stats.teacherInfo.experienceYears} il</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
export default TeacherDashboard;