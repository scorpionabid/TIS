import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { workloadService } from '@/services/workload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Clock, 
  Users, 
  BookOpen, 
  TrendingUp,
  TrendingDown,
  Activity,
  Target
} from 'lucide-react';

interface TeacherDetailedStatsProps {
  teacherId: number;
}

export const TeacherDetailedStats: React.FC<TeacherDetailedStatsProps> = ({ teacherId }) => {
  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['teacher-workload', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: !!teacherId,
  });

  const isLoading = workloadLoading;

  const workload = workloadData?.data;
  const loads = workload?.loads || [];

  // Calculate comprehensive stats
  const totalHours = workload?.total_hours || 0;
  const maxHours = workload?.max_hours || 24;
  const utilizationPercentage = maxHours > 0 ? Math.round((totalHours / maxHours) * 100) : 0;

  const uniqueClasses = new Set(loads.map((l: any) => l.class_id)).size;
  const uniqueSubjects = new Set(loads.map((l: any) => l.subject_name)).size;
  const totalAssignments = loads.length;

  // Average hours per assignment
  const avgHoursPerAssignment = totalAssignments > 0 ? (totalHours / totalAssignments).toFixed(1) : '0';

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40 col-span-3" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Workload Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Dərs Yükü
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{totalHours}</span>
            <span className="text-sm text-muted-foreground">/ {maxHours} saat</span>
          </div>
          <Progress value={utilizationPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Utilization</span>
            <Badge variant={utilizationPercentage > 90 ? 'destructive' : 'secondary'}>
              {utilizationPercentage}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Distribution */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-500" />
            Paylanma
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Siniflər:</span>
            <span className="font-semibold">{uniqueClasses}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Fənnlər:</span>
            <span className="font-semibold">{uniqueSubjects}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Təyinatlar:</span>
            <span className="font-semibold">{totalAssignments}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Orta saat:</span>
            <span className="font-semibold">{avgHoursPerAssignment}s</span>
          </div>
        </CardContent>
      </Card>

      {/* Performance Indicators moved to top row */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Göstəricilər
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-2">
            {utilizationPercentage >= 80 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm">Optimal yüklənmə</span>
              </>
            ) : utilizationPercentage >= 50 ? (
              <>
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Orta səviyyə</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm">Yüngül yüklənmə</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {utilizationPercentage >= 80 
              ? '✅ Müəllim optimal şəkildə yüklənib'
              : utilizationPercentage >= 50
              ? '⚠️ Daha çox təyinat mümkündür'
              : '🔴 Əlavə dərs yükü təyin edilməlidir'}
          </div>
        </CardContent>
      </Card>

      {/* Subject Breakdown */}
      <Card className="col-span-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Fənn Üzrə Dağılım
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {uniqueSubjects === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ fənn təyin edilməyib</p>
          ) : (
            <div className="space-y-4 text-sm mt-3">
              {Array.from(new Set(loads.map((l: any) => l.subject_name))).map((subject: string) => {
                const subjectLoads = loads.filter((l: any) => l.subject_name === subject);
                const subjectHours = subjectLoads.reduce((sum: number, l: any) => sum + l.weekly_hours, 0);
                const percentage = totalHours > 0 ? Math.round((subjectHours / totalHours) * 100) : 0;
                
                return (
                  <div key={subject} className="flex items-center gap-4">
                    <span className="w-40 font-medium truncate shrink-0">{subject}</span>
                    <div className="flex-1">
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-muted-foreground w-16 text-right shrink-0">
                      {subjectHours}s ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Distribution */}
      <Card className="col-span-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sinif Üzrə Paylanma
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {uniqueClasses === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ sinif təyin edilməyib</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {Array.from(new Set(loads.map((l: any) => l.class_id))).map((classId: number) => {
                const classLoads = loads.filter((l: any) => l.class_id === classId);
                const className = classLoads[0]?.class_name || 'Sinif';
                const classHours = classLoads.reduce((sum: number, l: any) => sum + l.weekly_hours, 0);
                const subjects = new Set(classLoads.map((l: any) => l.subject_name)).size;
                
                return (
                  <div key={classId} className="p-3 border rounded-lg bg-slate-50">
                    <div className="font-semibold text-sm">{className}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {classHours} saat · {subjects} fənn
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
