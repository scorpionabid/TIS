import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  CheckSquare,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Bell,
  BookOpen,
  UserCheck,
  GraduationCap,
  FileText,
  Clock,
  BarChart3,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { PriorityAlertBar } from './PriorityAlertBar';
import { TodayPriorityPanel } from './TodayPriorityPanel';
import { QuickResponsePanel } from './QuickResponsePanel';
import { RecentDocumentsWidget } from './RecentDocumentsWidget';
import { NotificationDropdown } from '@/components/layout/components/Header/NotificationDropdown';
import { SurveyAnalyticsDashboard } from '@/components/analytics/SurveyAnalyticsDashboard';
import { SurveyDashboardWidget } from './SurveyDashboardWidget';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const SchoolAdminDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: schoolAdminKeys.dashboardStats(),
    queryFn: () => schoolAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent activities
  const { 
    data: activities, 
    isLoading: activitiesLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.activities(),
    queryFn: () => schoolAdminService.getRecentActivities(8),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch upcoming deadlines
  const { 
    data: deadlines, 
    isLoading: deadlinesLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.deadlines(),
    queryFn: () => schoolAdminService.getUpcomingDeadlines(6),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch notifications
  const { 
    data: notifications, 
    isLoading: notificationsLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.notifications(),
    queryFn: () => schoolAdminService.getNotifications({ per_page: 5 }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Fetch quick actions
  const {
    data: quickActions
  } = useQuery({
    queryKey: ['schoolAdmin', 'quickActions'],
    queryFn: () => schoolAdminService.getQuickActions(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch pending surveys list
  const {
    data: pendingSurveys,
    isLoading: pendingSurveysLoading
  } = useQuery({
    queryKey: schoolAdminKeys.pendingSurveys(),
    queryFn: () => schoolAdminService.getPendingSurveysList(10),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch today priority items
  const {
    data: todayPriority,
    isLoading: todayPriorityLoading
  } = useQuery({
    queryKey: schoolAdminKeys.todayPriority(),
    queryFn: () => schoolAdminService.getTodayPriority(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Fetch recent documents
  const {
    data: recentDocuments,
    isLoading: recentDocumentsLoading
  } = useQuery({
    queryKey: schoolAdminKeys.recentDocuments(),
    queryFn: () => schoolAdminService.getRecentDocumentsList(10),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'survey': return ClipboardList;
      case 'task': return CheckSquare;
      case 'attendance': return UserCheck;
      case 'assessment': return GraduationCap;
      case 'document': return FileText;
      default: return Bell;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
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

  const handlePriorityItemClick = (item: any) => {
    if (item.type === 'survey') {
      navigate(`/survey-response/${item.id}`);
    } else if (item.type === 'task') {
      navigate(`/school/tasks`);
      toast.info(`Tapşırıq: ${item.title}`);
    }
  };

  const handleSurveyRespond = (surveyId: number) => {
    navigate(`/survey-response/${surveyId}`);
  };

  const handleDocumentView = (docId: number) => {
    // Navigate to documents page with selected document
    navigate('/school/documents');
    toast.info(`Sənəd #${docId} seçildi`);
  };

  const handleAlertClick = (type: string) => {
    switch (type) {
      case 'surveys':
        navigate('/surveys');
        break;
      case 'tasks':
        navigate('/school/tasks');
        break;
      case 'approvals':
        navigate('/approvals');
        break;
      default:
        // Scroll to priority panel
        document.querySelector('[data-priority-panel]')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="p-2 sm:p-3 lg:p-4 space-y-4 lg:space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Məktəb İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Məktəb fəaliyyətlərinin mərkəzləşdirilmiş idarəsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown className="mr-2" />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Yenilə
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Tapşırıq
          </Button>
        </div>
      </div>

      {/* Priority Alert Bar */}
      <PriorityAlertBar
        urgentSurveys={todayPriority?.filter(item => item.type === 'survey' && item.hours_remaining <= 6).length || 0}
        urgentTasks={todayPriority?.filter(item => item.type === 'task' && item.hours_remaining <= 6).length || 0}
        pendingApprovals={stats?.pending_approvals || 0}
        todayPriorityItems={stats?.today_priority_items || 0}
        onClick={handleAlertClick}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Gözləyən Sorğular"
          value={stats?.pending_surveys || 0}
          icon={ClipboardList}
          variant={stats && stats.pending_surveys > 0 ? "warning" : "default"}
          onClick={() => navigate('/surveys')}
        />
        <StatsCard
          title="Aktiv Tapşırıqlar"
          value={stats?.active_tasks || 0}
          icon={CheckSquare}
          variant="primary"
          onClick={() => navigate('/school/tasks')}
        />
        <StatsCard
          title="Yeni Fayllar"
          value={stats?.new_documents_count || 0}
          icon={FolderOpen}
          variant={stats && stats.new_documents_count > 0 ? "info" : "default"}
          onClick={() => navigate('/school/documents')}
        />
        <StatsCard
          title="Bugünkü Davamiyyət"
          value={stats?.today_attendance_rate ? `${stats.today_attendance_rate}%` : '0%'}
          icon={UserCheck}
          variant={stats && stats.today_attendance_rate >= 90 ? "success" : "warning"}
          onClick={() => navigate('/school/attendance')}
        />
      </div>

      {/* Action Hub - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-priority-panel>
        {/* Today Priority */}
        <TodayPriorityPanel
          items={todayPriority || []}
          isLoading={todayPriorityLoading}
          onItemClick={handlePriorityItemClick}
        />

        {/* Quick Response */}
        <QuickResponsePanel
          surveys={pendingSurveys || []}
          isLoading={pendingSurveysLoading}
          onRespond={handleSurveyRespond}
        />

        {/* Recent Documents */}
        <RecentDocumentsWidget
          documents={recentDocuments || []}
          isLoading={recentDocumentsLoading}
          onViewDocument={handleDocumentView}
          onViewAll={() => navigate('/school/documents')}
        />
      </div>

      {/* Survey Widget */}
      <div className="mb-6">
        <SurveyDashboardWidget variant="default" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gecikmiş Tapşırıqlar</p>
                  <p className="text-xl font-semibold">{stats?.overdue_tasks || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors" 
          onClick={() => window.location.href = '/school/assessments'}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qiymətləndirmə Hub-ı</p>
                  <p className="text-xl font-semibold">{stats?.pending_assessments || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Gözləyən qiymətləndirmələr</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yaxınlaşan Son Tarixlər</p>
                  <p className="text-xl font-semibold">{stats?.upcoming_deadlines || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Ümumi Baxış</TabsTrigger>
          <TabsTrigger value="tasks">Tapşırıqlar</TabsTrigger>
          <TabsTrigger value="deadlines">Son Tarixlər</TabsTrigger>
          <TabsTrigger value="notifications">Bildirişlər</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Interactive Charts */}
          <SurveyAnalyticsDashboard className="mt-4" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Son Fəaliyyətlər
                    </CardTitle>
                    <CardDescription>
                      Məktəbdə baş verən son fəaliyyətlər
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Hamısını gör
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="w-8 h-8 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-4 bg-muted rounded" />
                          <div className="w-1/2 h-3 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ActivityIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {activity.user_name}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { 
                                addSuffix: true, 
                                locale: az 
                              })}
                            </span>
                          </div>
                        </div>
                        {activity.status && (
                          <Badge variant={getStatusColor(activity.status)} className="text-xs">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Hələ ki fəaliyyət qeydə alınmayıb</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Sürətli Əməliyyatlar
                </CardTitle>
                <CardDescription>
                  Tez-tez istifadə olunan funksiyalar
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {quickActions && quickActions.length > 0 ? (
                  quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        if (action.action_type === 'navigate' && action.action_url) {
                          window.location.href = action.action_url;
                        }
                      }}
                    >
                      <span className="text-lg">{action.icon}</span>
                      <div className="text-center">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  ))
                ) : (
                  <>
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      <div className="text-center">
                        <p className="font-medium text-sm">Sorğu Cavabla</p>
                        <p className="text-xs text-muted-foreground">Gözləyən sorğular</p>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      <div className="text-center">
                        <p className="font-medium text-sm">Davamiyyət Qeyd Et</p>
                        <p className="text-xs text-muted-foreground">Bugünkü davamiyyət</p>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => window.location.href = '/school/assessments'}
                    >
                      <TrendingUp className="h-5 w-5" />
                      <div className="text-center">
                        <p className="font-medium text-sm">Qiymətləndirmə Hub-ı</p>
                        <p className="text-xs text-muted-foreground">KSQ, BSQ və adi qiymətləndirmələr</p>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      <div className="text-center">
                        <p className="font-medium text-sm">Tapşırıq Yarat</p>
                        <p className="text-xs text-muted-foreground">Yeni tapşırıq</p>
                      </div>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktiv Tapşırıqlar</CardTitle>
              <CardDescription>Hazırda işlənilməkdə olan tapşırıqlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tapşırıq komponentləri tezliklə əlavə olunacaq</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yaxınlaşan Son Tarixlər</CardTitle>
              <CardDescription>Diqqət tələb edən müddətlər</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deadlinesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                      <div className="w-8 h-8 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 bg-muted rounded" />
                        <div className="w-1/2 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : deadlines && deadlines.length > 0 ? (
                deadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        deadline.priority === 'high' ? "bg-destructive/10" :
                        deadline.priority === 'medium' ? "bg-warning/10" : "bg-secondary/10"
                      )}>
                        <Clock className={cn(
                          "h-4 w-4",
                          deadline.priority === 'high' ? "text-destructive" :
                          deadline.priority === 'medium' ? "text-warning" : "text-secondary"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(deadline.due_date), 'dd MMM yyyy', { locale: az })}
                          {deadline.days_remaining <= 3 && (
                            <span className="ml-2 text-destructive font-medium">
                              ({deadline.days_remaining} gün qalıb)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(deadline.priority)}>
                        {deadline.priority}
                      </Badge>
                      <Badge variant={getStatusColor(deadline.status)}>
                        {deadline.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Yaxınlaşan son tarix yoxdur</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Son Bildirişlər</CardTitle>
              <CardDescription>Diqqət tələb edən bildirişlər</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Bildiriş komponentləri tezliklə əlavə olunacaq</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};