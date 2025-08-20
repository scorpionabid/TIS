import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Users, 
  Target,
  Calculator,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

interface ClassStats {
  average: number;
  highest: number;
  lowest: number;
  gradeDistribution: GradeDistribution;
  totalStudents?: number;
  gradedStudents?: number;
}

interface GradebookStatsProps {
  stats: ClassStats | null;
  totalPoints?: number;
  className?: string;
}

export const GradebookStats: React.FC<GradebookStatsProps> = ({ 
  stats, 
  totalPoints = 100,
  className 
}) => {
  if (!stats) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Yüklənir...</p>
                  <div className="w-16 h-6 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-8 h-8 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSuccessRate = () => {
    const totalGraded = Object.values(stats.gradeDistribution).reduce((sum, count) => sum + count, 0);
    if (totalGraded === 0) return 0;
    
    const passedStudents = stats.gradeDistribution.A + stats.gradeDistribution.B + stats.gradeDistribution.C;
    return Math.round((passedStudents / totalGraded) * 100);
  };

  const getCompletionRate = () => {
    if (!stats.totalStudents || stats.totalStudents === 0) return 0;
    const graded = stats.gradedStudents || Object.values(stats.gradeDistribution).reduce((sum, count) => sum + count, 0);
    return Math.round((graded / stats.totalStudents) * 100);
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
      {/* Average Grade */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sinif ortalaması</p>
              <p className={cn("text-2xl font-bold", getGradeColor(stats.average))}>
                {stats.average.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {((stats.average / 100) * totalPoints).toFixed(1)}/{totalPoints} bal
              </p>
            </div>
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Highest Grade */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ən yüksək qiymət</p>
              <p className="text-2xl font-bold text-green-600">{stats.highest}%</p>
              <p className="text-xs text-muted-foreground">
                {((stats.highest / 100) * totalPoints).toFixed(1)}/{totalPoints} bal
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Lowest Grade */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ən aşağı qiymət</p>
              <p className="text-2xl font-bold text-red-600">{stats.lowest}%</p>
              <p className="text-xs text-muted-foreground">
                {((stats.lowest / 100) * totalPoints).toFixed(1)}/{totalPoints} bal
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Uğur nisbəti</p>
              <p className="text-2xl font-bold text-blue-600">{getSuccessRate()}%</p>
              <p className="text-xs text-muted-foreground">
                C və yuxarı qiymətlər
              </p>
            </div>
            <Award className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Qiymət bölgüsü</h3>
            </div>
            
            <div className="space-y-2">
              {[
                { grade: 'A', count: stats.gradeDistribution.A, color: 'bg-green-500', textColor: 'text-green-700', label: '90-100%' },
                { grade: 'B', count: stats.gradeDistribution.B, color: 'bg-blue-500', textColor: 'text-blue-700', label: '80-89%' },
                { grade: 'C', count: stats.gradeDistribution.C, color: 'bg-yellow-500', textColor: 'text-yellow-700', label: '70-79%' },
                { grade: 'D', count: stats.gradeDistribution.D, color: 'bg-orange-500', textColor: 'text-orange-700', label: '60-69%' },
                { grade: 'E', count: stats.gradeDistribution.E, color: 'bg-red-400', textColor: 'text-red-600', label: '50-59%' },
                { grade: 'F', count: stats.gradeDistribution.F, color: 'bg-red-600', textColor: 'text-red-700', label: '<50%' },
              ].map(({ grade, count, color, textColor, label }) => {
                const total = Object.values(stats.gradeDistribution).reduce((sum, c) => sum + c, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <div className="w-8 text-center font-medium text-sm">{grade}</div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", color)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
                        <span className={cn("font-medium", textColor)}>{count} şagird</span>
                        <span className="text-muted-foreground">{label}</span>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-medium">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Stats */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Tamamlanma məlumatları</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ümumi şagird sayı</span>
                  <span className="font-medium">{stats.totalStudents || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Qiymətləndirilib</span>
                  <span className="font-medium text-green-600">
                    {stats.gradedStudents || Object.values(stats.gradeDistribution).reduce((sum, count) => sum + count, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tamamlanma faizi</span>
                  <span className="font-medium text-blue-600">{getCompletionRate()}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uğurlu şagirdlər</span>
                  <span className="font-medium text-green-600">
                    {stats.gradeDistribution.A + stats.gradeDistribution.B + stats.gradeDistribution.C}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Əlavə dəstək lazım</span>
                  <span className="font-medium text-orange-600">
                    {stats.gradeDistribution.D + stats.gradeDistribution.E + stats.gradeDistribution.F}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uğur nisbəti</span>
                  <span className="font-medium text-blue-600">{getSuccessRate()}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};