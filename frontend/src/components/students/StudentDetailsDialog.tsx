import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Hash,
  Calendar,
  Phone,
  MapPin,
  Edit,
  BookOpen,
  UserPlus,
  GraduationCap,
  CalendarDays,
  X,
} from 'lucide-react';
import { Student } from '@/services/students';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface StudentDetailsDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  getStatusText: (status?: string) => string;
  getStatusColor: (status?: string) => string;
  getGenderText: (gender?: string) => string;
  getGradeLevelText: (level?: number) => string;
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || 'Məlumat yoxdur'}</p>
    </div>
  </div>
);

export const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  getStatusText,
  getStatusColor,
  getGenderText,
}) => {
  if (!student) return null;

  const fullName =
    [student.first_name, student.last_name].filter(Boolean).join(' ') || 'İsimsiz Şagird';

  const className = student.grade?.name
    ? `${student.grade.class_level}-${student.grade.name}`
    : student.current_class?.name
    ? `${student.current_class.grade_level ?? ''}-${student.current_class.name}`.replace(/^-/, '')
    : student.class_name || null;

  const formattedBirthDate = student.date_of_birth
    ? (() => {
        try {
          return format(new Date(student.date_of_birth), 'dd MMMM yyyy', { locale: az });
        } catch {
          return String(student.date_of_birth);
        }
      })()
    : null;

  const formattedEnrollDate = student.enrollment_date
    ? (() => {
        try {
          return format(new Date(student.enrollment_date), 'dd MMMM yyyy', { locale: az });
        } catch {
          return String(student.enrollment_date);
        }
      })()
    : null;

  const genderMap: Record<string, string> = { male: 'Kişi', female: 'Qadın', other: 'Digər' };
  const genderText = student.gender ? (genderMap[student.gender] ?? getGenderText(student.gender)) : null;

  const status = student.enrollment_status || student.status;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center ring-2 ring-blue-50 shrink-0">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">{fullName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.student_number && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    UTİS: {student.student_number}
                  </span>
                )}
                {status && (
                  <Badge variant={getStatusColor(status) as any} className="text-xs">
                    {getStatusText(status)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {fullName} haqqında ətraflı məlumat
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <User className="h-3.5 w-3.5" />
                Şəxsi Məlumatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
                <div className="sm:pr-4">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Ad" value={student.first_name} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Soyad" value={student.last_name} />
                  <InfoRow icon={<Hash className="h-4 w-4" />} label="UTİS Kod" value={student.student_number || student.student_id} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Əlaqə nömrəsi" value={student.phone} />
                </div>
                <div className="sm:pl-4">
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Doğum Tarixi" value={formattedBirthDate} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Cins" value={genderText} />
                  <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Qeydiyyat Tarixi" value={formattedEnrollDate} />
                  <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Sinif" value={className} />
                </div>
              </div>
              <div className="border-t border-border/50 mt-1">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Ünvan" value={student.address} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Bağla
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-1" />
              Qiymətlər
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              Davamiyyət
            </Button>
            <Button size="sm" onClick={() => onEdit(student)}>
              <Edit className="h-4 w-4 mr-1" />
              Redaktə et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
