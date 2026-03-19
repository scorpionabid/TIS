import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { gradeService } from '@/services/grades';
import { subjectService } from '@/services/subjects';
import { curriculumService } from '@/services/curriculumService';
import { academicYearService } from '@/services/academicYears';
import { useAuth } from '@/contexts/AuthContextOptimized';

export default function GradeBookCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Auto-detect institution for school admins
  const userInstitutionId = currentUser?.institution_id || currentUser?.institution?.id;
  const isSchoolUser = !!userInstitutionId;
  
  const [formData, setFormData] = useState({
    institution_id: undefined as string | undefined,
    grade_id: undefined as string | undefined,
    subject_id: undefined as string | undefined,
    academic_year_id: undefined as string | undefined,
    title: '',
  });

  // Set institution_id when currentUser loads - with detailed logging
  useEffect(() => {
    console.log('=== SET INSTITUTION EFFECT ===');
    console.log('userInstitutionId:', userInstitutionId);
    console.log('formData.institution_id:', formData.institution_id);
    if (userInstitutionId && !formData.institution_id) {
      console.log('✓ Setting institution_id:', userInstitutionId);
      setFormData(prev => ({ ...prev, institution_id: String(userInstitutionId) }));
    }
  }, [userInstitutionId]);

  // Fetch institutions only for non-school users (admins who need to select)
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll(),
    enabled: !isSchoolUser,
  });
  const institutions = institutionsResponse?.data || [];

  // Fetch grades when institution is selected (including pre-selected)
  const { data: gradesResponse, isLoading: gradesLoading, error: gradesError, isError: gradesIsError } = useQuery({
    queryKey: ['grades', formData.institution_id],
    queryFn: async () => {
      console.log('=== FETCHING GRADES ===');
      console.log('institution_id:', formData.institution_id);
      const result = await gradeService.get({ 
        institution_id: Number(formData.institution_id),
        per_page: 100 // Backend limit is 100
      });
      console.log('gradeService.get result:', result);
      return result;
    },
    enabled: !!formData.institution_id && formData.institution_id !== '',
  });
  const grades = gradesResponse?.items || [];

  // Debug logging with useEffect to track changes
  useEffect(() => {
    console.log('=== DEBUG STATE CHANGE ===');
    console.log('currentUser:', currentUser);
    console.log('userInstitutionId:', userInstitutionId);
    console.log('isSchoolUser:', isSchoolUser);
    console.log('formData.institution_id:', formData.institution_id);
    console.log('gradesLoading:', gradesLoading);
    console.log('gradesIsError:', gradesIsError);
    console.log('gradesError:', gradesError);
    console.log('gradesResponse:', gradesResponse);
    console.log('grades count:', grades.length);
  }, [currentUser, userInstitutionId, formData.institution_id, gradesLoading, gradesIsError, gradesError, gradesResponse, grades.length, isSchoolUser]);

  // Fetch curriculum subjects when grade is selected
  const { data: curriculumResponse, isLoading: subjectsLoading } = useQuery({
    queryKey: ['curriculum', formData.grade_id],
    queryFn: () => curriculumService.getCurriculumSubjects(Number(formData.grade_id)),
    enabled: !!formData.grade_id,
  });
  const subjects = curriculumResponse?.subjects || [];

  const { data: academicYearsResponse } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.getAll(),
  });
  const academicYears = academicYearsResponse?.data || [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing grade books to filter out already created combinations
  const { data: existingGradeBooks } = useQuery({
    queryKey: ['grade-books', formData.institution_id, formData.academic_year_id],
    queryFn: async () => {
      if (!formData.institution_id) return [];
      const result = await gradeBookService.getGradeBooks({
        institution_id: Number(formData.institution_id),
        academic_year_id: formData.academic_year_id ? Number(formData.academic_year_id) : undefined,
        per_page: 100,
      });
      return result.data;
    },
    enabled: !!formData.institution_id,
  });

  // Helper to check if a grade-subject combination already exists
  const isGradeSubjectTaken = (gradeId: number, subjectId: number) => {
    if (!existingGradeBooks) return false;
    return existingGradeBooks.some(
      (gb) => gb.grade_id === gradeId && gb.subject_id === subjectId &&
              (!formData.academic_year_id || gb.academic_year_id === Number(formData.academic_year_id))
    );
  };

  // Filter grades - only show grades that have at least one subject without a gradebook
  const availableGrades = grades.filter((grade: any) => {
    if (!existingGradeBooks || existingGradeBooks.length === 0) return true;
    // Get subjects for this grade from curriculum
    const gradeSubjects = subjects.filter((s: any) => s.grade_id === grade.id);
    if (gradeSubjects.length === 0) return true; // No curriculum, still show
    // Check if at least one subject doesn't have a gradebook
    return gradeSubjects.some((subject: any) => !isGradeSubjectTaken(grade.id, subject.subject_id));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;

    if (!formData.institution_id || !formData.grade_id || !formData.subject_id || !formData.academic_year_id) {
      toast({
        title: 'Xəta',
        description: 'Bütün sahələri doldurun',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await gradeBookService.createGradeBook({
        institution_id: Number(formData.institution_id),
        grade_id: Number(formData.grade_id),
        subject_id: Number(formData.subject_id),
        academic_year_id: Number(formData.academic_year_id),
        title: formData.title || undefined,
      });

      toast({
        title: 'Uğurlu',
        description: 'Jurnal yaradıldı',
      });

      // Navigate to the new grade book
      navigate(`/grade-books/${response.data.id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Jurnal yaradılarkən xəta baş verdi';
      
      // Better error message for duplicate grade book
      let displayMessage = errorMessage;
      if (errorMessage.includes('already exists') || errorMessage.includes('Grade book already exists')) {
        displayMessage = 'Bu sinif, fənn və tədris ili üçün jurnal artıq mövcuddur. Zəhmət olmasa, fərqli sinif və ya fənn seçin.';
      }
      
      toast({
        title: 'Xəta',
        description: displayMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      institution_id: undefined,
      grade_id: undefined,
      subject_id: undefined,
      academic_year_id: undefined,
      title: '',
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Yeni Sinif Jurnalı</h1>

      <Card>
        <CardHeader>
          <CardTitle>Jurnal Məlumatları</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Sinif</Label>
              <Select
                value={formData.grade_id}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  grade_id: value,
                  subject_id: undefined // Reset subject when grade changes
                }))}
                disabled={!formData.institution_id || gradesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={gradesLoading ? "Siniflər yüklənir..." : "Sinif seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {grades?.map((grade: any) => {
                    const isTaken = subjects.length > 0 && subjects.every(
                      (subject: any) => isGradeSubjectTaken(grade.id, subject.subject_id)
                    );
                    return (
                      <SelectItem 
                        key={grade.id} 
                        value={String(grade.id)}
                        disabled={isTaken}
                      >
                        {grade.class_level}{grade.name} {isTaken ? '(bütün fənlər üçün jurnal var)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Fənn</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}
                disabled={!formData.grade_id || subjectsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.grade_id ? (subjectsLoading ? "Fənlər yüklənir..." : "Fənn seçin") : "Əvvəlcə sinif seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject: any) => {
                    const isTaken = isGradeSubjectTaken(Number(formData.grade_id), subject.subject_id);
                    return (
                      <SelectItem 
                        key={subject.subject_id} 
                        value={String(subject.subject_id)}
                        disabled={isTaken}
                      >
                        {subject.subject_name} {subject.teacher_name ? `(${subject.teacher_name})` : ''} 
                        {isTaken ? ' - Jurnal mövcuddur' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year">Tədris İli</Label>
              <Select
                value={formData.academic_year_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, academic_year_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tədris ili seçin" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears?.map((year: any) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Başlıq (opsional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Məsələn: 5-A Riyaziyyat"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Təmizlə
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Yaradılır...' : 'Yarat'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
