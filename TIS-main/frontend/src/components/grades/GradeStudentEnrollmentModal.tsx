import React, { useState, useMemo } from 'react';
import { Grade } from '@/services/grades';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Users, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/students';
import { gradeService } from '@/services/grades';
import { toast } from 'sonner';

interface Student {
  id: number;
  full_name: string;
  username: string;
  email?: string;
  institution_id: number;
  is_active: boolean;
}

interface GradeStudentEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  grade: Grade | null;
  onSuccess?: () => void;
}

export const GradeStudentEnrollmentModal: React.FC<GradeStudentEnrollmentModalProps> = ({
  open,
  onClose,
  grade,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available students (not enrolled in this grade)
  const { data: studentsResponse, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'available-for-enrollment', grade?.id],
    queryFn: () => studentService.getAvailableForEnrollment(grade?.id || 0),
    enabled: open && !!grade,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const rawAvailableStudents = studentsResponse?.data?.data;
  const availableStudents = useMemo<Student[]>(() => {
    if (Array.isArray(rawAvailableStudents)) {
      return rawAvailableStudents;
    }
    return [];
  }, [rawAvailableStudents]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return availableStudents;
    
    const searchLower = searchTerm.toLowerCase();
    return availableStudents.filter((student: Student) => 
      student.full_name.toLowerCase().includes(searchLower) ||
      student.username.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  }, [availableStudents, searchTerm]);

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s: Student) => s.id));
    }
  };

  const handleSubmit = async () => {
    if (!grade || selectedStudents.length === 0) return;

    setIsSubmitting(true);
    try {
      if (selectedStudents.length === 1) {
        // Single student enrollment
        await gradeService.enrollStudent(grade.id, {
          student_id: selectedStudents[0],
          enrollment_date: enrollmentDate,
          enrollment_notes: notes
        });
        
        toast.success('Tələbə uğurla sinifə əlavə edildi');
      } else {
        // Multiple students enrollment
        await gradeService.enrollMultipleStudents(grade.id, {
          student_ids: selectedStudents,
          enrollment_date: enrollmentDate,
          enrollment_notes: notes
        });
        
        toast.success(`${selectedStudents.length} tələbə uğurla sinifə əlavə edildi`);
      }

      // Reset form
      setSelectedStudents([]);
      setSearchTerm('');
      setNotes('');
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Student enrollment error:', error);
      toast.error(error.response?.data?.message || 'Tələbə əlavə edilərkən xəta baş verdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedStudents([]);
      setSearchTerm('');
      setNotes('');
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  if (!grade) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {grade.full_name} sinifinə tələbə əlavə et
          </DialogTitle>
          <DialogDescription>
            Mövcud tələbələrdən seçərək sinifə əlavə edin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tələbə adı, istifadəçi adı və ya email ilə axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected count and select all */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Hamısını seç ({filteredStudents.length} tələbə)
                </span>
              </div>
              
              {selectedStudents.length > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {selectedStudents.length} seçildi
                </Badge>
              )}
            </div>
          </div>

          {/* Students list */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {studentsLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Tələbələr yüklənir...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm ? 'Axtarış nəticəsi tapılmadı' : 'Mövcud tələbə yoxdur'}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredStudents.map((student: Student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedStudents.includes(student.id) && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{student.username}
                        {student.email && ` • ${student.email}`}
                      </p>
                    </div>

                    {selectedStudents.includes(student.id) && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrollment details */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enrollmentDate">Qeydiyyat Tarixi</Label>
                <Input
                  id="enrollmentDate"
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Qeydlər (İstəyə görə)</Label>
              <Textarea
                id="notes"
                placeholder="Qeydiyyat ilə bağlı əlavə qeydlər..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Ləğv et
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedStudents.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Əlavə edilir...' : `${selectedStudents.length} Tələbə Əlavə Et`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
