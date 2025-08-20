import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Download, 
  Users, 
  BookOpen, 
  GraduationCap,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { SchoolClass } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';

interface ClassSelectorProps {
  classes?: SchoolClass[];
  selectedClassId: number | null;
  onClassChange: (classId: number | null) => void;
  onRefresh: () => void;
  className?: string;
  showActions?: boolean;
  showClassInfo?: boolean;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
  classes = [],
  selectedClassId,
  onClassChange,
  onRefresh,
  className,
  showActions = true,
  showClassInfo = true
}) => {
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const activeClasses = classes.filter(c => c.is_active);

  const getClassStats = (cls: SchoolClass) => {
    return {
      studentCount: cls.student_count || 0,
      teacherCount: cls.teacher_count || 0,
      subjectCount: cls.subject_count || 0
    };
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Class Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Class Selector */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="class-select" className="text-sm font-medium">
                Sinif seçin
              </Label>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedClassId?.toString() || ''} 
                  onValueChange={(value) => {
                    onClassChange(value ? parseInt(value) : null);
                  }}
                >
                  <SelectTrigger id="class-select" className="w-full lg:w-64">
                    <SelectValue placeholder="Sinif seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClasses.length > 0 ? (
                      activeClasses.map(cls => {
                        const stats = getClassStats(cls);
                        return (
                          <SelectItem 
                            key={cls.id} 
                            value={cls.id.toString()}
                            className="flex flex-col items-start py-3"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{cls.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {stats.studentCount} şagird
                              </Badge>
                            </div>
                            {cls.description && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {cls.description}
                              </span>
                            )}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="" disabled>
                        Aktiv sinif yoxdur
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {/* Quick Stats */}
                {selectedClass && (
                  <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{getClassStats(selectedClass).studentCount} şagird</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>{getClassStats(selectedClass).teacherCount} müəllim</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Yenilə
                </Button>
                <Button variant="outline" size="sm" disabled={!selectedClassId}>
                  <Download className="h-4 w-4 mr-2" />
                  İxrac et
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Class Information */}
      {showClassInfo && selectedClass && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Class Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    {selectedClass.name}
                  </h3>
                  {selectedClass.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedClass.description}
                    </p>
                  )}
                </div>
                <Badge variant={selectedClass.is_active ? 'default' : 'secondary'}>
                  {selectedClass.is_active ? 'Aktiv' : 'Deaktiv'}
                </Badge>
              </div>

              {/* Class Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Şagirdlər</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {getClassStats(selectedClass).studentCount}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-xs">Müəllimlər</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {getClassStats(selectedClass).teacherCount}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs">Fənlər</span>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {getClassStats(selectedClass).subjectCount}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Performans</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {selectedClass.average_grade ? selectedClass.average_grade.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedClass.created_at || selectedClass.academic_year) && (
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectedClass.academic_year && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Akademik il:</span>
                        <span className="font-medium">{selectedClass.academic_year}</span>
                      </div>
                    )}
                    {selectedClass.created_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Yaradılıb:</span>
                        <span className="font-medium">
                          {new Date(selectedClass.created_at).toLocaleDateString('az-AZ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Class Selected State */}
      {!selectedClassId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sinif seçin</h3>
              <p className="text-muted-foreground mb-4">
                Qiymətləndirmə yaratmaq və idarə etmək üçün əvvəlcə sinif seçin
              </p>
              {activeClasses.length === 0 && (
                <p className="text-sm text-orange-600">
                  Hal-hazırda aktiv sinif yoxdur. Sinif yaratmaq üçün müəllim və ya admin ilə əlaqə saxlayın.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};