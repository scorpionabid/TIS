import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Calculator, User, Target } from 'lucide-react';
import { Assessment, AssessmentGrade } from '@/services/schoolAdmin';
import { Student } from '@/services/students';
import { cn } from '@/lib/utils';
import type { GradeData } from './hooks/useAssessmentGradebook';

interface GradingInterfaceProps {
  assessment: Assessment;
  students?: Student[];
  grades?: AssessmentGrade[];
  gradeData: Record<number, GradeData>;
  onBack: () => void;
  onSaveGrades: () => void;
  updateGrade: (studentId: number, field: 'points' | 'comments', value: string) => void;
  getGradeColor: (points: number, totalPoints: number) => string;
  getGradeLetter: (points: number, totalPoints: number) => string;
  isSaving: boolean;
}

export const GradingInterface: React.FC<GradingInterfaceProps> = ({
  assessment,
  students,
  grades,
  gradeData,
  onBack,
  onSaveGrades,
  updateGrade,
  getGradeColor,
  getGradeLetter,
  isSaving
}) => {
  const getExistingGrade = (studentId: number) => {
    return grades?.find(g => g.student_id === studentId);
  };

  const getCurrentPoints = (studentId: number) => {
    const current = gradeData[studentId]?.points;
    if (current) return current;
    
    const existing = getExistingGrade(studentId);
    return existing?.points?.toString() || '';
  };

  const getCurrentComments = (studentId: number) => {
    const current = gradeData[studentId]?.comments;
    if (current !== undefined) return current;
    
    const existing = getExistingGrade(studentId);
    return existing?.comments || '';
  };

  const calculateGradeStats = () => {
    if (!students) return { average: 0, graded: 0, total: 0 };
    
    const gradedStudents = students.filter(student => {
      const points = getCurrentPoints(student.id);
      return points && !isNaN(parseFloat(points));
    });

    const total = gradedStudents.reduce((sum, student) => {
      const points = parseFloat(getCurrentPoints(student.id));
      return sum + points;
    }, 0);

    return {
      average: gradedStudents.length > 0 ? total / gradedStudents.length : 0,
      graded: gradedStudents.length,
      total: students.length
    };
  };

  const stats = calculateGradeStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <h2 className="text-xl font-bold">{assessment.title}</h2>
            <p className="text-sm text-muted-foreground">
              {assessment.subject} • {assessment.total_points} bal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onSaveGrades}
            disabled={isSaving || stats.graded === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saxlanılır...' : 'Qiymətləri saxla'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi şagird</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qiymətləndirilib</p>
                <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ortalama</p>
                <p className={cn(
                  "text-2xl font-bold",
                  getGradeColor(stats.average, assessment.total_points)
                )}>
                  {stats.average.toFixed(1)}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanma</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                <div 
                  className="absolute inset-0 rounded-full border-4 border-purple-600 transform -rotate-90"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + (stats.total > 0 ? (stats.graded / stats.total) * 50 : 0)}% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grading Table */}
      <Card>
        <CardHeader>
          <CardTitle>Şagird qiymətləndirmələri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students?.map((student, index) => {
              const currentPoints = getCurrentPoints(student.id);
              const currentComments = getCurrentComments(student.id);
              const points = parseFloat(currentPoints) || 0;
              const hasGrade = currentPoints && !isNaN(points);
              
              return (
                <div 
                  key={student.id} 
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg"
                >
                  {/* Student Info */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.first_name} {student.last_name}</p>
                      {student.student_id && (
                        <p className="text-xs text-muted-foreground">ID: {student.student_id}</p>
                      )}
                    </div>
                  </div>

                  {/* Points Input */}
                  <div className="md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Bal (max: {assessment.total_points})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={assessment.total_points}
                        step="0.1"
                        value={currentPoints}
                        onChange={(e) => updateGrade(student.id, 'points', e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Grade Display */}
                  <div className="md:col-span-2 flex items-center">
                    {hasGrade && (
                      <div className="space-y-1">
                        <div className={cn(
                          "text-sm font-bold",
                          getGradeColor(points, assessment.total_points)
                        )}>
                          {getGradeLetter(points, assessment.total_points)} 
                          <span className="text-xs font-normal ml-1">
                            ({((points / assessment.total_points) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="relative h-1 w-full overflow-hidden rounded-full bg-secondary">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              points >= assessment.total_points * 0.9 ? "bg-green-500" :
                              points >= assessment.total_points * 0.8 ? "bg-blue-500" :
                              points >= assessment.total_points * 0.7 ? "bg-yellow-500" :
                              points >= assessment.total_points * 0.6 ? "bg-orange-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min((points / assessment.total_points) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="md:col-span-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Şərh</label>
                      <Textarea
                        value={currentComments}
                        onChange={(e) => updateGrade(student.id, 'comments', e.target.value)}
                        placeholder="Şagirdin performansı haqqında şərh..."
                        className="h-8 min-h-8 resize-none"
                        rows={1}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-1 flex items-center justify-end">
                    {hasGrade ? (
                      <Badge variant="default" className="text-xs">
                        Qiymətləndirilib
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Gözləyir
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Action */}
          <div className="flex justify-end pt-4 border-t mt-6">
            <Button 
              onClick={onSaveGrades}
              disabled={isSaving || stats.graded === 0}
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saxlanılır...' : `${stats.graded} qiyməti saxla`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};