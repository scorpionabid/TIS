import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, CalendarDays, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchoolClass } from '@/services/schoolAdmin';

interface ClassDetailsDialogProps {
  schoolClass: SchoolClass | null;
  isOpen: boolean;
  onClose: () => void;
  getGradeLevelText: (level: number) => string;
}

export const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  schoolClass,
  isOpen,
  onClose,
  getGradeLevelText
}) => {
  if (!schoolClass) return null;

  const capacityPercentage = (schoolClass.current_enrollment / schoolClass.capacity) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {schoolClass.name} - Ətraflı məlumat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Sinif adı</label>
              <p className="text-foreground">{schoolClass.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Səviyyə</label>
              <p className="text-foreground">{getGradeLevelText(schoolClass.grade_level)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Akademik il</label>
              <p className="text-foreground">{schoolClass.academic_year}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={schoolClass.is_active ? 'default' : 'secondary'}>
                  {schoolClass.is_active ? 'Aktiv' : 'Passiv'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Capacity & Teacher */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Şagird sayı</label>
              <div className="space-y-2">
                <p className="text-foreground">
                  {schoolClass.current_enrollment} / {schoolClass.capacity}
                </p>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      capacityPercentage >= 95 && "bg-red-500",
                      capacityPercentage >= 80 && capacityPercentage < 95 && "bg-orange-500",
                      capacityPercentage < 80 && "bg-green-500"
                    )}
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Tutum: {capacityPercentage.toFixed(1)}%
                  {capacityPercentage >= 95 && (
                    <span className="text-red-600 ml-2">• Hədd aşılıb</span>
                  )}
                  {capacityPercentage >= 80 && capacityPercentage < 95 && (
                    <span className="text-orange-600 ml-2">• Həddə yaxın</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Otaq nömrəsi</label>
              <p className="text-foreground">{schoolClass.room_number || 'Təyin edilməyib'}</p>
            </div>
          </div>

          {/* Class Teacher Information */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Sinif rəhbəri</label>
            <div className="mt-1">
              {schoolClass.class_teacher ? (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{schoolClass.class_teacher.name}</p>
                    <p className="text-sm text-muted-foreground">Sinif rəhbəri</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-300">Təyin edilməyib</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Sinif rəhbəri təyin edilməlidir</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Information */}
          {schoolClass.schedule && schoolClass.schedule.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Dərs cədvəli</label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {schoolClass.schedule.map((schedule, index) => (
                  <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                    <div className="font-medium">{schedule.subject_name}</div>
                    {schedule.teacher_name && (
                      <div className="text-xs text-muted-foreground">{schedule.teacher_name}</div>
                    )}
                    {schedule.time && (
                      <div className="text-xs text-muted-foreground">{schedule.time}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Yaradılma tarixi</label>
              <p className="text-foreground">
                {schoolClass.created_at 
                  ? new Date(schoolClass.created_at).toLocaleDateString('az-AZ')
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Son yeniləmə</label>
              <p className="text-foreground">
                {schoolClass.updated_at 
                  ? new Date(schoolClass.updated_at).toLocaleDateString('az-AZ')
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
          </div>

          {/* Performance Metrics (if available) */}
          {schoolClass.performance_metrics && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Performans göstəriciləri</label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {schoolClass.performance_metrics.attendance_rate || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Davamiyyət</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {schoolClass.performance_metrics.average_grade || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Orta qiymət</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-purple-600">
                    {schoolClass.performance_metrics.homework_completion || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Ev tapşırıqları</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-orange-600">
                    {schoolClass.performance_metrics.behavior_score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Davranış</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Bağla
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Şagirdlər
            </Button>
            <Button variant="outline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Cədvəl
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Redaktə et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};