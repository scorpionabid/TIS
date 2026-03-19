import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { workloadService } from '@/services/workload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, BookOpen, Users, TrendingUp } from 'lucide-react';

interface TeacherWorkloadStatsProps {
  teacherId: number;
}

export const TeacherWorkloadStats: React.FC<TeacherWorkloadStatsProps> = ({ teacherId }) => {
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ['teacher-workload', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: !!teacherId,
  });

  const workload = workloadData?.data;

  // Calculate stats
  const loads = (workload?.loads || []).filter((l: any) => l.weekly_hours > 0);
  const totalHours = workload?.total_hours || 0;
  const maxHours = workload?.max_hours || 24;
  const remainingHours = workload?.remaining_hours || 0;
  const utilizationPercentage = maxHours > 0 ? Math.round((totalHours / maxHours) * 100) : 0;
  
  // Hours by type
  const teachingHours = loads.filter((l: any) => l.is_teaching_activity).reduce((sum: number, l: any) => sum + l.weekly_hours, 0);
  const extracurricularHours = loads.filter((l: any) => l.is_extracurricular).reduce((sum: number, l: any) => sum + l.weekly_hours, 0);
  const clubHours = loads.filter((l: any) => l.is_club).reduce((sum: number, l: any) => sum + l.weekly_hours, 0);

  // Group by education program
  const programLoads = loads.reduce((acc: any, load: any) => {
    const prog = load.education_program || 'Təyin edilməyib';
    if (!acc[prog]) acc[prog] = 0;
    acc[prog] += load.weekly_hours;
    return acc;
  }, {} as Record<string, number>);
  
  // Unique counts
  const uniqueClasses = new Set(loads.map((l: any) => l.class_id)).size;
  const uniqueSubjects = new Set(loads.map((l: any) => l.subject_name)).size;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Saat Statistikası
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalHours}</span>
              <span className="text-xs text-muted-foreground">/ {maxHours} saat</span>
            </div>
            <Progress value={utilizationPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Doluluk: {utilizationPercentage}%</span>
              <Badge variant={remainingHours > 0 ? 'secondary' : 'destructive'} className="text-xs">
                {remainingHours} saat qalıq
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Stats */}
      {(teachingHours > 0 || extracurricularHours > 0 || clubHours > 0) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Dərs növləri
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {teachingHours > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-muted-foreground">Dərs</span>
                </div>
                <span className="font-medium">{teachingHours} saat</span>
              </div>
            )}
            {extracurricularHours > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-muted-foreground">Məşğələ</span>
                </div>
                <span className="font-medium">{extracurricularHours} saat</span>
              </div>
            )}
            {clubHours > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-muted-foreground">DƏRNƏK</span>
                </div>
                <span className="font-medium">{clubHours} saat</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Program Stats */}
      {Object.keys(programLoads).length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Təhsil proqramı üzrə
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {Object.entries(programLoads).map(([prog, hours]) => (
              <div key={prog} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate" title={
                  prog === 'umumi' ? 'Ümumi təhsil' : 
                  prog === 'xususi' ? 'Xüsusi təhsil' : 
                  prog === 'mektebde_ferdi' ? 'Məktəbdə fərdi' : 
                  prog === 'evde_ferdi' ? 'Evdə fərdi' : prog
                }>
                  {prog === 'umumi' ? 'Ümumi təhsil' : 
                   prog === 'xususi' ? 'Xüsusi təhsil' : 
                   prog === 'mektebde_ferdi' ? 'Məktəbdə fərdi' : 
                   prog === 'evde_ferdi' ? 'Evdə fərdi' : prog}
                </span>
                <span className="font-medium whitespace-nowrap">{hours as number} saat</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Siniflər</span>
            </div>
            <p className="text-xl font-bold mt-1">{uniqueClasses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Fənnlər</span>
            </div>
            <p className="text-xl font-bold mt-1">{uniqueSubjects}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Card */}
      <Card className={utilizationPercentage >= 90 ? 'border-amber-300' : ''}>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {utilizationPercentage === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ dərs yükü təyin edilməyib</p>
          ) : utilizationPercentage < 50 ? (
            <p className="text-sm text-amber-600">⚠️ Yüngül yük ({utilizationPercentage}%)</p>
          ) : utilizationPercentage < 90 ? (
            <p className="text-sm text-green-600">✅ Normal yük ({utilizationPercentage}%)</p>
          ) : (
            <p className="text-sm text-red-600">🔴 Yüksək yük ({utilizationPercentage}%)</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      {loads.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold">Son Təyinatlar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {loads.slice(0, 5).map((load: any) => (
                <div key={load.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <span className="font-medium truncate">{load.class_name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {load.weekly_hours}s
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
