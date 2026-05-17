import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Edit,
  Eye,
  MoreHorizontal,
  BookOpen,
  GraduationCap,
  UserPlus,
  UserMinus,
  Copy
} from 'lucide-react';
import { Student } from '@/services/students';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface StudentCardProps {
  student: Student;
  onViewDetails: (student: Student) => void;
  onEdit: (student: Student) => void;
  onEnroll: (student: Student) => void;
  getStatusText: (status?: string) => string;
  getStatusColor: (status?: string) => string;
  getGenderText: (gender?: string) => string;
  getGradeLevelText: (level?: number) => string;
}

export const StudentCard: React.FC<StudentCardProps> = ({ 
  student, 
  onViewDetails,
  onEdit,
  onEnroll,
  getStatusText,
  getStatusColor,
  getGenderText,
  getGradeLevelText
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Student Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {student.first_name} {student.last_name}
                </h3>
                {student.student_id && (
                  <p className="text-sm text-muted-foreground">
                    ID: {student.student_id}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {getGenderText(student.gender)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(student.enrollment_status)}>
                {getStatusText(student.enrollment_status)}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(student)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ətraflı bax
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(student)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Redaktə et
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {student.enrollment_status !== 'active' && (
                    <DropdownMenuItem onClick={() => onEnroll(student)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sinifə yaz
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Qiymətlər
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Calendar className="h-4 w-4 mr-2" />
                    Davamiyyət
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopyala
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Hesabat al
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {student.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{student.email}</span>
              </div>
            )}
            
            {student.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{student.phone}</span>
              </div>
            )}
          </div>

          {/* Academic Information */}
          <div className="space-y-2">
            {student.current_class && (
              <div>
                <div className="text-xs text-muted-foreground">Cari sinif:</div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{student.current_class.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getGradeLevelText(student.current_class.grade_level)}
                  </Badge>
                </div>
              </div>
            )}

            {student.grade_level && !student.current_class && (
              <div>
                <div className="text-xs text-muted-foreground">Səviyyə:</div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{getGradeLevelText(student.grade_level)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Academic Performance */}
          {(student.gpa || student.attendance_rate) && (
            <div className="grid grid-cols-2 gap-3">
              {student.gpa && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Orta bal</div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-green-600">{student.gpa.toFixed(1)}</span>
                    <Badge 
                      variant={student.gpa >= 4.0 ? 'default' : student.gpa >= 3.0 ? 'secondary' : 'destructive'} 
                      className="text-xs"
                    >
                      {student.gpa >= 4.0 ? 'Əla' : student.gpa >= 3.0 ? 'Yaxşı' : 'Zəif'}
                    </Badge>
                  </div>
                </div>
              )}

              {student.attendance_rate && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Davamiyyət</div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-blue-600">{student.attendance_rate}%</span>
                    <Badge 
                      variant={student.attendance_rate >= 90 ? 'default' : student.attendance_rate >= 75 ? 'secondary' : 'destructive'} 
                      className="text-xs"
                    >
                      {student.attendance_rate >= 90 ? 'Yaxşı' : student.attendance_rate >= 75 ? 'Orta' : 'Zəif'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enrollment Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {student.enrollment_date && (
              <div>
                <div className="text-xs text-muted-foreground">Qeydiyyat tarixi</div>
                <p className="text-foreground">
                  {format(new Date(student.enrollment_date), 'dd.MM.yyyy', { locale: az })}
                </p>
              </div>
            )}
            
            {student.date_of_birth && (
              <div>
                <div className="text-xs text-muted-foreground">Doğum tarixi</div>
                <p className="text-foreground">
                  {format(new Date(student.date_of_birth), 'dd.MM.yyyy', { locale: az })}
                </p>
              </div>
            )}
          </div>

          {/* Guardian Information */}
          {(student.guardian_name || student.guardian_phone) && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Valideyn məlumatı:</div>
              <div className="space-y-1 text-sm">
                {student.guardian_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{student.guardian_name}</span>
                  </div>
                )}
                {student.guardian_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{student.guardian_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {student.enrollment_status !== 'active' ? (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEnroll(student)}>
                <UserPlus className="h-3 w-3 mr-1" />
                Sinifə yaz
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" className="flex-1">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Qiymətlər
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  Davamiyyət
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};