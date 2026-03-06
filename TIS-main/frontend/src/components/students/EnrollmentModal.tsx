import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GraduationCap, Users, UserPlus } from 'lucide-react';
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
  getGradeLevelText
}) => {
  if (!student) return null;

  // Filter classes by selected grade level
  const filteredClasses = classes?.filter(cls => 
    !selectedGradeForEnrollment || 
    selectedGradeForEnrollment === 'all' || 
    cls.grade_level.toString() === selectedGradeForEnrollment
  ) || [];

  // Get available classes (not at full capacity)
  const availableClasses = filteredClasses.filter(cls => 
    cls.current_enrollment < cls.capacity
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Şagirdi sinifə yaz
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{student.first_name} {student.last_name}</p>
                <p className="text-sm text-muted-foreground">
                  {student.student_id && `ID: ${student.student_id}`}
                </p>
                {student.grade_level && (
                  <p className="text-xs text-muted-foreground">
                    Cari səviyyə: {getGradeLevelText(student.grade_level)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Grade Level Filter */}
          <div className="space-y-2">
            <Label htmlFor="grade_filter">Səviyyəyə görə filtrele</Label>
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

          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Mövcud siniflər</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableClasses.length > 0 ? (
                availableClasses.map(cls => {
                  const capacityPercentage = (cls.current_enrollment / cls.capacity) * 100;
                  
                  return (
                    <div 
                      key={cls.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onEnroll(cls.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getGradeLevelText(cls.grade_level)}
                          </p>
                          {cls.class_teacher && (
                            <p className="text-xs text-muted-foreground">
                              Rəhbər: {cls.class_teacher.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3" />
                            <span>{cls.current_enrollment}/{cls.capacity}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {capacityPercentage.toFixed(0)}% dolu
                          </div>
                          {capacityPercentage >= 90 && (
                            <p className="text-xs text-orange-600">Həddə yaxın</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {selectedGradeForEnrollment && selectedGradeForEnrollment !== 'all' 
                      ? `${getGradeLevelText(parseInt(selectedGradeForEnrollment))} üçün mövcud sinif yoxdur`
                      : 'Mövcud sinif yoxdur'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isEnrolling}>
              Ləğv et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};