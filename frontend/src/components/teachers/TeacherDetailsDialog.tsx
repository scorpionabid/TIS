import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  BookOpen,
  Star,
  Clock,
  Award,
  Briefcase,
  Building
} from 'lucide-react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface TeacherDetailsDialogProps {
  teacher: SchoolTeacher | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (teacher: SchoolTeacher) => void;
  getDepartmentText: (department?: string) => string;
  getPositionText: (position?: string) => string;
  getPerformanceColor: (rating?: number) => string;
  getWorkloadColor: (hours?: number) => string;
}

export const TeacherDetailsDialog: React.FC<TeacherDetailsDialogProps> = ({
  teacher,
  isOpen,
  onClose,
  onEdit,
  getDepartmentText,
  getPositionText,
  getPerformanceColor,
  getWorkloadColor
}) => {
  if (!teacher) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {teacher.first_name} {teacher.last_name} - Ətraflı məlumat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ad və Soyad</label>
              <p className="text-foreground">{teacher.first_name} {teacher.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vəzifə</label>
              <p className="text-foreground">{getPositionText(teacher.position)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Şöbə</label>
              <p className="text-foreground">{getDepartmentText(teacher.department)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                  {teacher.is_active ? 'Aktiv' : 'Passiv'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-foreground">{teacher.email || 'Təyin edilməyib'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Telefon</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-foreground">{teacher.phone || 'Təyin edilməyib'}</p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Performans reytinqi</label>
              <div className="space-y-2">
                {teacher.performance_rating ? (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-bold">{teacher.performance_rating.toFixed(1)}</span>
                    <Badge variant={getPerformanceColor(teacher.performance_rating)}>
                      {teacher.performance_rating >= 4.5 ? 'Əla' : 
                       teacher.performance_rating >= 3.5 ? 'Yaxşı' : 
                       teacher.performance_rating >= 2.5 ? 'Orta' : 'Zəif'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Qiymətləndirilməyib</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Həftəlik iş saatı</label>
              <div className="space-y-2">
                {teacher.weekly_hours ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-bold">{teacher.weekly_hours} saat</span>
                    <Badge variant={getWorkloadColor(teacher.weekly_hours)}>
                      {teacher.weekly_hours >= 35 ? 'Həddindən artıq' : 
                       teacher.weekly_hours >= 25 ? 'Yüksək' : 
                       teacher.weekly_hours >= 15 ? 'Normal' : 'Az'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Təyin edilməyib</p>
                )}
              </div>
            </div>
          </div>

          {/* Teaching Information */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Dərslər</label>
            <div className="mt-2">
              {teacher.subjects && teacher.subjects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {teacher.subjects.map((subject, index) => (
                    <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                      <div className="font-medium">{subject.name}</div>
                      {subject.hours_per_week && (
                        <div className="text-xs text-muted-foreground">{subject.hours_per_week} saat/həftə</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Təyin edilmiş dərs yoxdur</p>
              )}
            </div>
          </div>

          {/* Classes Information */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Siniflər</label>
            <div className="mt-2">
              {teacher.classes && teacher.classes.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {teacher.classes.map((classInfo, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded">
                      <div className="font-medium">{classInfo.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {classInfo.student_count} şagird
                      </div>
                      {classInfo.is_class_teacher && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Sinif rəhbəri
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Təyin edilmiş sinif yoxdur</p>
              )}
            </div>
          </div>

          {/* Experience & Qualifications */}
          {(teacher.experience_years || teacher.education || teacher.certifications) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teacher.experience_years && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Təcrübə</label>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{teacher.experience_years} il</p>
                  </div>
                </div>
              )}
              
              {teacher.education && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Təhsil</label>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{teacher.education}</p>
                  </div>
                </div>
              )}

              {teacher.certifications && teacher.certifications.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sertifikatlar</label>
                  <div className="space-y-1">
                    {teacher.certifications.map((cert, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employment Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-sm font-medium text-muted-foreground">İşə başlama tarixi</label>
              <p className="text-foreground">
                {teacher.hire_date 
                  ? format(new Date(teacher.hire_date), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Son yeniləmə</label>
              <p className="text-foreground">
                {teacher.updated_at 
                  ? format(new Date(teacher.updated_at), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Bağla
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Siniflər
            </Button>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Dərslər
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Cədvəl
            </Button>
            <Button onClick={() => onEdit(teacher)}>
              <Edit className="h-4 w-4 mr-2" />
              Redaktə et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};