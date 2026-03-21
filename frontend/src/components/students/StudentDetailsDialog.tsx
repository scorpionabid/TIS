import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  BookOpen,
  UserPlus,
  GraduationCap,
  Star,
  Clock,
  Award
} from 'lucide-react';
import { Student } from '@/services/students';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface StudentDetailsDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onEnroll: (student: Student) => void;
  getStatusText: (status?: string) => string;
  getStatusColor: (status?: string) => string;
  getGenderText: (gender?: string) => string;
  getGradeLevelText: (level?: number) => string;
}

export const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  onEnroll,
  getStatusText,
  getStatusColor,
  getGenderText,
  getGradeLevelText
}) => {
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {student.first_name} {student.last_name} - Ətraflı məlumat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ad və Soyad</label>
              <p className="text-foreground">{student.first_name} {student.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Şagird ID</label>
              <p className="text-foreground">{student.student_id || 'Təyin edilməyib'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cins</label>
              <p className="text-foreground">{getGenderText(student.gender)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={getStatusColor(student.enrollment_status)}>
                  {getStatusText(student.enrollment_status)}
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
                <p className="text-foreground">{student.email || 'Təyin edilməyib'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Telefon</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-foreground">{student.phone || 'Təyin edilməyib'}</p>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cari sinif</label>
              <div className="space-y-2">
                {student.current_class ? (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-bold">{student.current_class.name}</span>
                    <Badge variant="outline">
                      {getGradeLevelText(student.current_class.grade_level)}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sinifə təyin edilməyib</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Səviyyə</label>
              <div className="space-y-2">
                {student.grade_level ? (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-500" />
                    <span className="text-lg font-bold">{getGradeLevelText(student.grade_level)}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Təyin edilməyib</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Orta bal (GPA)</label>
              <div className="space-y-2">
                {student.gpa ? (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-bold">{student.gpa.toFixed(2)}</span>
                    <Badge 
                      variant={student.gpa >= 4.0 ? 'default' : student.gpa >= 3.0 ? 'secondary' : 'destructive'}
                    >
                      {student.gpa >= 4.0 ? 'Əla' : student.gpa >= 3.0 ? 'Yaxşı' : 'Zəif'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Qiymətləndirilməyib</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Davamiyyət nisbəti</label>
              <div className="space-y-2">
                {student.attendance_rate ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-bold">{student.attendance_rate}%</span>
                    <Badge 
                      variant={student.attendance_rate >= 90 ? 'default' : student.attendance_rate >= 75 ? 'secondary' : 'destructive'}
                    >
                      {student.attendance_rate >= 90 ? 'Yaxşı' : student.attendance_rate >= 75 ? 'Orta' : 'Zəif'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Məlumat yoxdur</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Doğum tarixi</label>
              <p className="text-foreground">
                {student.date_of_birth 
                  ? format(new Date(student.date_of_birth), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ünvan</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-foreground">{student.address || 'Təyin edilməyib'}</p>
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Valideyn məlumatları</label>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Ad</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{student.guardian_name || 'Təyin edilməyib'}</p>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Telefon</div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{student.guardian_phone || 'Təyin edilməyib'}</p>
                </div>
              </div>
              {student.guardian_email && (
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{student.guardian_email}</p>
                  </div>
                </div>
              )}
              {student.guardian_relation && (
                <div>
                  <div className="text-xs text-muted-foreground">Qohumluq</div>
                  <p className="text-foreground">{student.guardian_relation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Qeydiyyat tarixi</label>
              <p className="text-foreground">
                {student.enrollment_date 
                  ? format(new Date(student.enrollment_date), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Son yeniləmə</label>
              <p className="text-foreground">
                {student.updated_at 
                  ? format(new Date(student.updated_at), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
          </div>

          {/* Medical Information */}
          {(student.medical_conditions || student.allergies || student.emergency_contact) && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tibbi məlumatlar</label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                {student.medical_conditions && (
                  <div>
                    <div className="text-xs text-muted-foreground">Tibbi vəziyyət</div>
                    <p className="text-foreground">{student.medical_conditions}</p>
                  </div>
                )}
                {student.allergies && (
                  <div>
                    <div className="text-xs text-muted-foreground">Allergiyalar</div>
                    <p className="text-foreground">{student.allergies}</p>
                  </div>
                )}
                {student.emergency_contact && (
                  <div>
                    <div className="text-xs text-muted-foreground">Təcili əlaqə</div>
                    <p className="text-foreground">{student.emergency_contact}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Notes */}
          {student.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Qeydlər</label>
              <div className="mt-1 p-3 bg-muted/30 rounded-lg">
                <p className="text-foreground">{student.notes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Bağla
            </Button>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Qiymətlər
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Davamiyyət
            </Button>
            {student.enrollment_status !== 'active' && (
              <Button variant="outline" onClick={() => onEnroll(student)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Sinifə yaz
              </Button>
            )}
            <Button onClick={() => onEdit(student)}>
              <Edit className="h-4 w-4 mr-2" />
              Redaktə et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};