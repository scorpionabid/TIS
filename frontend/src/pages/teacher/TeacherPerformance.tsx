import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Activity,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface PerformanceData {
  monthlyStats: Array<{
    month: string;
    attendance: number;
    averageGrade: number;
    completedTasks: number;
    studentSatisfaction: number;
  }>;
  subjectPerformance: Array<{
    subject: string;
    averageGrade: number;
    attendance: number;
    totalStudents: number;
    improvement: number;
  }>;
  achievements: Array<{
    title: string;
    description: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  goals: Array<{
    title: string;
    target: number;
    current: number;
    deadline: string;
    category: string;
  }>;
  comparisons: {
    schoolAverage: number;
    departmentAverage: number;
    personalBest: number;
  };
}

export default function TeacherPerformance() {
  const { currentUser } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Mock data - real API-dən gələcək
  const { data: performanceData, isLoading } = useQuery<PerformanceData>({
    queryKey: ['teacher-performance', currentUser?.id, selectedPeriod],
    queryFn: async () => {
      // Temporary mock data
      return {
        monthlyStats: [
          { month: 'Yanvar', attendance: 92, averageGrade: 85, completedTasks: 12, studentSatisfaction: 88 },
          { month: 'Fevral', attendance: 89, averageGrade: 87, completedTasks: 15, studentSatisfaction: 91 },
          { month: 'Mart', attendance: 94, averageGrade: 89, completedTasks: 18, studentSatisfaction: 93 },
          { month: 'Aprel', attendance: 91, averageGrade: 86, completedTasks: 14, studentSatisfaction: 90 },
          { month: 'May', attendance: 93, averageGrade: 90, completedTasks: 20, studentSatisfaction: 94 },
          { month: 'İyun', attendance: 95, averageGrade: 92, completedTasks: 16, studentSatisfaction: 95 }
        ],
        subjectPerformance: [
          { subject: 'Riyaziyyat', averageGrade: 88, attendance: 92, totalStudents: 45, improvement: 5.2 },
          { subject: 'Fizika', averageGrade: 85, attendance: 89, totalStudents: 30, improvement: 3.1 },
          { subject: 'Cəbr', averageGrade: 90, attendance: 94, totalStudents: 35, improvement: 7.8 }
        ],
        achievements: [
          {
            title: 'İlin Müəllimi',
            description: '2023-cü ildə ilin müəllimi seçildi',
            date: '2023-06-15',
            impact: 'high'
          },
          {
            title: 'Ən Yaxşı Dərs Metodikası',
            description: 'İnteraktiv dərs metodları üçün mükafat',
            date: '2023-03-20',
            impact: 'medium'
          },
          {
            title: '100% Davamiyyət',
            description: 'Aprel ayında 100% davamiyyət nailiyyəti',
            date: '2023-04-30',
            impact: 'low'
          }
        ],
        goals: [
          { title: 'Davamiyyəti artırmaq', target: 95, current: 93, deadline: '2023-12-31', category: 'attendance' },
          { title: 'Orta qiyməti yüksəltmək', target: 90, current: 88, deadline: '2023-12-31', category: 'grades' },
          { title: 'Yeni metodlar tətbiq etmək', target: 5, current: 3, deadline: '2023-09-30', category: 'methods' }
        ],
        comparisons: {
          schoolAverage: 85,
          departmentAverage: 87,
          personalBest: 92
        }
      };
    },
    enabled: !!currentUser?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Yüklənir...</span>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Performans məlumatları tapılmadı</h3>
          <p className="text-muted-foreground">
            Performans məlumatları mövcud deyil.
          </p>
        </div>
      </div>
    );
  }

  const { monthlyStats, subjectPerformance, achievements, goals, comparisons } = performanceData;

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Performans</h1>
          <div className="flex space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Son 3 ay</SelectItem>
                <SelectItem value="6months">Son 6 ay</SelectItem>
                <SelectItem value="1year">Son 1 il</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Hesabat
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Müəllim fəaliyyətinin analizi və statistikası
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orta Davamiyyət</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats[monthlyStats.length - 1]?.attendance}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getTrendIcon(monthlyStats[monthlyStats.length - 1]?.attendance, monthlyStats[monthlyStats.length - 2]?.attendance)}
              Öncəki aydan
            </p>
            <Progress value={monthlyStats[monthlyStats.length - 1]?.attendance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orta Qiymət</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats[monthlyStats.length - 1]?.averageGrade}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getTrendIcon(monthlyStats[monthlyStats.length - 1]?.averageGrade, monthlyStats[monthlyStats.length - 2]?.averageGrade)}
              Öncəki aydan
            </p>
            <Progress value={monthlyStats[monthlyStats.length - 1]?.averageGrade} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan Tapşırıqlar</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats[monthlyStats.length - 1]?.completedTasks}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getTrendIcon(monthlyStats[monthlyStats.length - 1]?.completedTasks, monthlyStats[monthlyStats.length - 2]?.completedTasks)}
              Öncəki aydan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Şagird Məmnuniyyəti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats[monthlyStats.length - 1]?.studentSatisfaction}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getTrendIcon(monthlyStats[monthlyStats.length - 1]?.studentSatisfaction, monthlyStats[monthlyStats.length - 2]?.studentSatisfaction)}
              Öncəki aydan
            </p>
            <Progress value={monthlyStats[monthlyStats.length - 1]?.studentSatisfaction} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Aylıq Trend</CardTitle>
          <CardDescription>Seçilmiş dövr ərzində performans dinamikası</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyStats.map((stat, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center">
                <div className="font-medium">{stat.month}</div>
                <div className="flex items-center space-x-2">
                  <Progress value={stat.attendance} className="flex-1" />
                  <span className="text-sm w-12 text-right">{stat.attendance}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={stat.averageGrade} className="flex-1" />
                  <span className="text-sm w-12 text-right">{stat.averageGrade}%</span>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{stat.completedTasks}</div>
                  <div className="text-xs text-muted-foreground">tapşırıq</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={stat.studentSatisfaction} className="flex-1" />
                  <span className="text-sm w-12 text-right">{stat.studentSatisfaction}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Fənn Performansı</CardTitle>
            <CardDescription>Fənnlər üzrə statistikalar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectPerformance.map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{subject.subject}</h4>
                    <div className="flex items-center space-x-2">
                      {subject.improvement > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{Math.abs(subject.improvement)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <Award className="h-3 w-3 text-muted-foreground" />
                      <span>{subject.averageGrade}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 text-muted-foreground" />
                      <span>{subject.attendance}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{subject.totalStudents} şagird</span>
                    </div>
                  </div>
                  <Progress value={subject.averageGrade} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Hədəflər</CardTitle>
            <CardDescription>Cari hədəflər və irəliləyiş</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{goal.title}</h4>
                    <Badge variant="outline">{goal.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{goal.current} / {goal.target}</span>
                    <span>{goal.deadline}</span>
                  </div>
                  <Progress value={(goal.current / goal.target) * 100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Nailiyyətlər</CardTitle>
          <CardDescription>Əldə edilən mükafatlar və uğurlar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getImpactColor(achievement.impact)}`} />
                <div className="flex-1">
                  <h4 className="font-medium">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle>Müqayisəli Analiz</CardTitle>
          <CardDescription>Məktəb və şöbə ortalamaları ilə müqayisə</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Məktəb Ortalaması</h4>
              <div className="text-2xl font-bold">{comparisons.schoolAverage}%</div>
              <p className="text-sm text-muted-foreground">Bütün müəllimlər</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Şöbə Ortalaması</h4>
              <div className="text-2xl font-bold">{comparisons.departmentAverage}%</div>
              <p className="text-sm text-muted-foreground">Riyaziyyat müəllimləri</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-primary/10">
              <h4 className="font-medium mb-2">Şəxsi Rekord</h4>
              <div className="text-2xl font-bold">{comparisons.personalBest}%</div>
              <p className="text-sm text-muted-foreground">Ən yüksək nəticə</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
