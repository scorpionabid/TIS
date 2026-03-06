import React from 'react';
import { Grade } from '@/services/grades';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  MapPin,
  GraduationCap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { gradeService } from '@/services/grades';

interface GradeAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  grade: Grade | null;
}

interface GradeAnalytics {
  student_statistics: {
    total_students: number;
    active_students: number;
    inactive_students: number;
    transferred_students: number;
    graduated_students: number;
    suspended_students: number;
  };
  capacity_analysis: {
    current_capacity: number;
    max_capacity: number;
    utilization_rate: number;
    capacity_status: string;
    recommendations: string[];
  };
  performance_metrics: {
    enrollment_trend: Array<{
      month: string;
      enrolled: number;
      withdrawn: number;
    }>;
    retention_rate: number;
    average_class_size_comparison: number;
  };
  resource_allocation: {
    has_room: boolean;
    room_capacity: number | null;
    has_teacher: boolean;
    teacher_workload: number | null;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    action_required: boolean;
  }>;
}

export const GradeAnalyticsModal: React.FC<GradeAnalyticsModalProps> = ({
  open,
  onClose,
  grade
}) => {
  // Fetch analytics data for the grade
  const { data: analyticsResponse, isLoading } = useQuery({
    queryKey: ['grade-analytics', grade?.id],
    queryFn: () => gradeService.getGradeAnalytics(grade?.id || 0),
    enabled: open && !!grade,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const analytics: GradeAnalytics | null = analyticsResponse?.data || null;

  if (!grade) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-500';
      case 'transferred': return 'text-blue-600';
      case 'graduated': return 'text-purple-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCapacityColor = (rate: number) => {
    if (rate >= 95) return 'text-red-600';
    if (rate >= 80) return 'text-orange-500';
    if (rate >= 60) return 'text-green-600';
    return 'text-blue-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {grade.full_name} - Analitika və Hesabatlar
          </DialogTitle>
          <DialogDescription>
            Sinif performansı, tələbə statistikaları və resurs utilizasiyası analizi
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Analitika məlumatları yüklənir...</p>
            </div>
          </div>
        ) : !analytics ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Analitika məlumatları tapılmadı</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ümumi Tələbə</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.student_statistics.total_students}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.student_statistics.active_students} aktiv
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tutum Əmsalı</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", getCapacityColor(analytics.capacity_analysis.utilization_rate))}>
                    {analytics.capacity_analysis.utilization_rate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.capacity_analysis.current_capacity} / {analytics.capacity_analysis.max_capacity}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saxlanma Əmsalı</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.performance_metrics.retention_rate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Son 6 ay ərzində
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resurs Vəziyyəti</CardTitle>
                  <CheckCircle className={cn("h-4 w-4", 
                    analytics.resource_allocation.has_room && analytics.resource_allocation.has_teacher 
                      ? "text-green-500" : "text-orange-500"
                  )} />
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Otaq:</span>
                      <Badge variant={analytics.resource_allocation.has_room ? "default" : "secondary"}>
                        {analytics.resource_allocation.has_room ? "Var" : "Yoxdur"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Müəllim:</span>
                      <Badge variant={analytics.resource_allocation.has_teacher ? "default" : "secondary"}>
                        {analytics.resource_allocation.has_teacher ? "Var" : "Yoxdur"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Tələbə Status Təhlili</CardTitle>
                <CardDescription>
                  Sinifdəki tələbələrin status üzrə bölünməsi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { key: 'active_students', label: 'Aktiv', icon: UserCheck, color: 'green' },
                    { key: 'inactive_students', label: 'Deaktiv', icon: UserX, color: 'gray' },
                    { key: 'transferred_students', label: 'Köçürülmüş', icon: TrendingUp, color: 'blue' },
                    { key: 'graduated_students', label: 'Məzun', icon: GraduationCap, color: 'purple' },
                    { key: 'suspended_students', label: 'Müvəqqəti', icon: AlertTriangle, color: 'orange' },
                  ].map(({ key, label, icon: Icon, color }) => {
                    const count = analytics.student_statistics[key as keyof typeof analytics.student_statistics] as number;
                    const percentage = analytics.student_statistics.total_students > 0 
                      ? Math.round((count / analytics.student_statistics.total_students) * 100)
                      : 0;

                    return (
                      <div key={key} className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Icon className={cn("h-6 w-6", getStatusColor(key.replace('_students', '')))} />
                        </div>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                        <div className="text-xs text-muted-foreground">({percentage}%)</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Capacity Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Tutum Təhlili</CardTitle>
                <CardDescription>
                  Sinif tutumu və utilizasiya səviyyəsi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Cari Utilizasiya</span>
                      <span className={cn("text-sm font-bold", getCapacityColor(analytics.capacity_analysis.utilization_rate))}>
                        {analytics.capacity_analysis.utilization_rate}%
                      </span>
                    </div>
                    <Progress 
                      value={analytics.capacity_analysis.utilization_rate} 
                      className="w-full h-2"
                    />
                  </div>
                  
                  {analytics.capacity_analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tövsiyələr:</h4>
                      <ul className="space-y-1">
                        {analytics.capacity_analysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {analytics.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Xəbərdarlıqlar və Bildirişlər</CardTitle>
                  <CardDescription>
                    Diqqət tələb edən məsələlər
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.alerts.map((alert, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="text-sm">{alert.message}</p>
                          {alert.action_required && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tədbirək tələb olunur
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrollment Trend - Placeholder for now */}
            {analytics.performance_metrics.enrollment_trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Qeydiyyat Trendi</CardTitle>
                  <CardDescription>
                    Son aylar üzrə tələbə qeydiyyat dəyişiklikləri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>Qrafik komponent hazırlanır...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
          <Button onClick={() => {/* TODO: Export analytics */}}>
            Hesabatı İxrac Et
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};