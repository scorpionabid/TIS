import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  School,
  Building2,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';

interface RegionStats {
  total_sectors: number;
  total_schools: number;
  total_users: number;
  active_surveys: number;
  pending_tasks: number;
  completion_rate: number;
  performance_trend: number;
}

interface RecentActivity {
  id: number;
  type: 'user_created' | 'school_added' | 'survey_completed' | 'task_assigned';
  description: string;
  timestamp: string;
  user_name?: string;
  institution_name?: string;
}

export const RegionAdminDashboard = () => {
  const { currentUser } = useAuth();

  // Fetch regional statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['regionadmin-stats', currentUser?.institution_id],
    queryFn: async () => {
      const response = await apiClient.get<RegionStats>('/regionadmin/dashboard/stats');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['regionadmin-activities', currentUser?.institution_id],
    queryFn: async () => {
      const response = await apiClient.get<RecentActivity[]>('/regionadmin/dashboard/activities');
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'school_added':
        return <School className="h-4 w-4 text-green-500" />;
      case 'survey_completed':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'task_assigned':
        return <ClipboardCheck className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatActivityDescription = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'user_created':
        return `${activity.user_name} istifadəçisi yaradıldı`;
      case 'school_added':
        return `${activity.institution_name} məktəbi əlavə edildi`;
      case 'survey_completed':
        return activity.description;
      case 'task_assigned':
        return activity.description;
      default:
        return activity.description;
    }
  };

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Regional İdarəetmə Dashboard</h1>
        <p className="text-muted-foreground">
          Regional təhsil strukturunun ümumi baxışı və performans göstəriciləri
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Sectors */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi Sektorlar</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.total_sectors || 0}</p>
              </div>
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Schools */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi Məktəblər</p>
                <p className="text-3xl font-bold text-green-600">{stats?.total_schools || 0}</p>
              </div>
              <School className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi İstifadəçilər</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.total_users || 0}</p>
              </div>
              <Users className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Active Surveys */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktiv Sorğular</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.active_surveys || 0}</p>
              </div>
              <FileText className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gözləyən Tapşırıqlar</p>
                <p className="text-3xl font-bold text-red-600">{stats?.pending_tasks || 0}</p>
              </div>
              <Clock className="h-12 w-12 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tamamlanma Nisbəti</p>
                <div className="flex items-center space-x-2">
                  <p className="text-3xl font-bold text-teal-600">
                    {stats?.completion_rate ? `${stats.completion_rate.toFixed(1)}%` : '0%'}
                  </p>
                  {stats?.performance_trend !== undefined && (
                    stats.performance_trend > 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    ) : stats.performance_trend < 0 ? (
                      <TrendingDown className="h-6 w-6 text-red-500" />
                    ) : null
                  )}
                </div>
              </div>
              <BarChart3 className="h-12 w-12 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Son Fəaliyyətlər</span>
            </CardTitle>
            <CardDescription>
              Regional səviyyədə baş verən son dəyişikliklər
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex space-x-3">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {formatActivityDescription(activity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString('az-AZ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Hələ ki fəaliyyət qeydə alınmayıb</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Tez Əməliyyatlar</CardTitle>
            <CardDescription>
              Tez-tez istifadə olunan funksiyalar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Yeni İstifadəçi Yaratmaq
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <School className="h-4 w-4 mr-2" />
              Məktəb Əlavə Etmək
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Tapşırıq Təyin Etmək
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Sorğu Yaratmaq
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Hesabat Əldə Etmək
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};