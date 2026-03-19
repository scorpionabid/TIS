import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  UserPlus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock,
  Building2,
  GraduationCap,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextOptimized';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';

interface ActivityItem {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  action_type: 'create' | 'update' | 'delete' | 'view' | 'export' | 'approve';
  entity_type: 'grade' | 'student' | 'teacher' | 'journal' | 'task' | 'survey';
  entity_name: string;
  description: string;
  created_at: string;
  institution_name?: string;
}

interface AdminSummaryStats {
  total_activities: number;
  create_count: number;
  update_count: number;
  delete_count: number;
  active_users: number;
}

export function AdminSummary() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<AdminSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - replace with actual API call when backend is ready
      // const response = await adminService.getRecentActivities();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock activities data
      const mockActivities: ActivityItem[] = [
        {
          id: 1,
          user_id: 101,
          user_name: 'Əliyev Məmməd',
          user_role: 'Məktəb Admin',
          action_type: 'create',
          entity_type: 'student',
          entity_name: 'Həsən Həsənli',
          description: 'Yeni şagird əlavə edildi',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          institution_name: 'Məktəb 1',
        },
        {
          id: 2,
          user_id: 102,
          user_name: 'Quliyeva Sara',
          user_role: 'Müəllim',
          action_type: 'update',
          entity_type: 'journal',
          entity_name: '7-A Riyaziyyat',
          description: 'Jurnal məlumatları yeniləndi',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          institution_name: 'Məktəb 2',
        },
        {
          id: 3,
          user_id: 103,
          user_name: 'Hüseynov Əli',
          user_role: 'Məktəb Admin',
          action_type: 'delete',
          entity_type: 'teacher',
          entity_name: 'Fənn Müəllimi',
          description: 'Müəllim qeydiyyatı silindi',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          institution_name: 'Məktəb 1',
        },
        {
          id: 4,
          user_id: 104,
          user_name: 'Məmmədova Leyla',
          user_role: 'Region Admin',
          action_type: 'approve',
          entity_type: 'task',
          entity_name: 'Qiyabi tapşırıq #1245',
          description: 'Tapşırıq təsdiqləndi',
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          institution_name: 'Sektor 1',
        },
        {
          id: 5,
          user_id: 101,
          user_name: 'Əliyev Məmməd',
          user_role: 'Məktəb Admin',
          action_type: 'export',
          entity_type: 'grade',
          entity_name: '8-B',
          description: 'Sinif jurnalları export edildi',
          created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
          institution_name: 'Məktəb 1',
        },
        {
          id: 6,
          user_id: 105,
          user_name: 'İsmayılov Rəşad',
          user_role: 'Müəllim',
          action_type: 'create',
          entity_type: 'journal',
          entity_name: '9-C Fizika',
          description: 'Yeni jurnal yaradıldı',
          created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
          institution_name: 'Məktəb 3',
        },
      ];
      
      setActivities(mockActivities);
      
      // Calculate stats
      const stats: AdminSummaryStats = {
        total_activities: mockActivities.length,
        create_count: mockActivities.filter(a => a.action_type === 'create').length,
        update_count: mockActivities.filter(a => a.action_type === 'update').length,
        delete_count: mockActivities.filter(a => a.action_type === 'delete').length,
        active_users: new Set(mockActivities.map(a => a.user_id)).size,
      };
      
      setStats(stats);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Fəaliyyətlər yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create': return UserPlus;
      case 'update': return Edit3;
      case 'delete': return Trash2;
      case 'approve': return CheckCircle;
      case 'export': return FileText;
      default: return Activity;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'update': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'delete': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'approve': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'export': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'Yaratma';
      case 'update': return 'Yeniləmə';
      case 'delete': return 'Silinmə';
      case 'approve': return 'Təsdiqləmə';
      case 'export': return 'Export';
      default: return actionType;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'grade': return GraduationCap;
      case 'student': return UserPlus;
      case 'teacher': return Building2;
      case 'journal': return FileText;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activities Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin İcmalı</h1>
          <p className="text-slate-500 mt-1">
            Region səviyyəsində son fəaliyyətlər və statistikalar
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ümumi fəaliyyət</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_activities}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Yeni əlavələr</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.create_count}</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Yeniləmələr</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.update_count}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Aktiv istifadəçilər</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.active_users}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activities */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Son fəaliyyətlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Fəaliyyət qeydi tapılmadı</p>
              </div>
            ) : (
              activities.map((activity) => {
                const ActionIcon = getActionIcon(activity.action_type);
                const EntityIcon = getEntityIcon(activity.entity_type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {/* Action Icon */}
                    <div className={cn('p-2 rounded-lg border', getActionColor(activity.action_type))}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {activity.user_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.user_role}
                        </Badge>
                        <span className="text-slate-500">
                          {getActionLabel(activity.action_type)}
                        </span>
                        <span className="font-medium text-slate-900">
                          {activity.entity_name}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mt-1">
                        {activity.description}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <EntityIcon className="w-3 h-3" />
                          {activity.institution_name}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: az,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
