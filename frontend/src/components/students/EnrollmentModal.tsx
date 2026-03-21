import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, UserPlus, Hash, X } from 'lucide-react';
import { Student } from '@/services/students';
import { Grade } from '@/services/grades';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes?: Grade[];
  selectedGradeForEnrollment: string;
  setSelectedGradeForEnrollment: (grade: string) => void;
  onEnroll: (classId: number) => void;
  isEnrolling: boolean;
  getGradeLevelText: (level?: number) => string;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  selectedGradeForEnrollment,
  setSelectedGradeForEnrollment,
  onEnroll,
  isEnrolling,
  getGradeLevelText,
}) => {
  if (!student) return null;

  const fullName = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'İsimsiz Şagird';

  const currentClass = student.grade?.name
    ? `${student.grade.class_level}-${student.grade.name}`
    : student.current_class?.name || null;

  const filteredClasses = (classes ?? []).filter(
    (cls) =>
      !selectedGradeForEnrollment ||
      selectedGradeForEnrollment === 'all' ||
      cls.class_level?.toString() === selectedGradeForEnrollment,
  );

  const sortedClasses = [...filteredClasses].sort((a, b) => {
    const order: Record<string, number> = { available: 0, near_capacity: 1, full: 2, over_capacity: 3, no_room: 4 };
    return (order[a.capacity_status] ?? 5) - (order[b.capacity_status] ?? 5);
  });

  const getCapacityBadge = (percentage: number) => {
    if (percentage >= 100) return { label: 'Dolu', className: 'bg-red-100 text-red-700 border-red-200' };
    if (percentage >= 90) return { label: 'Həddə yaxın', className: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { label: 'Boş var', className: 'bg-green-100 text-green-700 border-green-200' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center ring-2 ring-green-50 shrink-0">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">{fullName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.student_number && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    UTİS: {student.student_number}
                  </span>
                )}
                {currentClass && (
                  <Badge variant="outline" className="text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {currentClass}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {fullName} şagirdini sinifə yaz
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[55vh] space-y-4">
          {/* Grade Level Filter */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <GraduationCap className="h-4 w-4" />
                Sinif seçimi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Səviyyəyə görə filtrele</Label>
                <Select
                  value={selectedGradeForEnrollment}
                  onValueChange={setSelectedGradeForEnrollment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Səviyyə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün səviyyələr</SelectItem>
                    <SelectItem value="0">Anasinifi</SelectItem>
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {`${i + 1}. sinif`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class List */}
              <div className="space-y-1.5">
                <Label className="text-sm">Mövcud siniflər</Label>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {sortedClasses.length > 0 ? (
                    sortedClasses.map((cls) => {
                      const count = cls.student_count ?? 0;
                      const capacity = cls.room?.capacity ?? 30;
                      const percentage = Math.round((count / capacity) * 100);
                      const badge = getCapacityBadge(percentage);

                      return (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => !isEnrolling && onEnroll(cls.id)}
                        >
                          <div>
                            <p className="font-semibold text-primary">
                              {cls.class_level}-{cls.name}
                            </p>
                            {cls.homeroom_teacher && (
                              <p className="text-xs text-muted-foreground">
                                Rəhbər: {cls.homeroom_teacher.full_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-right shrink-0">
                            <div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                                <Users className="h-3 w-3" />
                                <span>{count}/{capacity}</span>
                              </div>
                              <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${percentage >= 100 ? 'bg-red-500' : percentage >= 90 ? 'bg-orange-400' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {selectedGradeForEnrollment && selectedGradeForEnrollment !== 'all'
                          ? `${getGradeLevelText(parseInt(selectedGradeForEnrollment))} üçün mövcud sinif yoxdur`
                          : 'Mövcud sinif yoxdur'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Button variant="outline" onClick={onClose} disabled={isEnrolling}>
            <X className="h-4 w-4 mr-1" />
            Ləğv et
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
