import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  PlusCircle, 
  Save,
  Loader2,
  Users,
  School,
  Target,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter
} from "lucide-react";
import { assessmentTypeService, AssessmentType } from '@/services/assessmentTypes';
import { institutionService } from '@/services/institutions';
import { studentService, Student } from '@/services/students';
import { assessmentEntryService, AssessmentEntryForm } from '@/services/assessmentEntries';
import { useToast } from '@/hooks/use-toast';
import { QuickAuth } from '@/components/auth/QuickAuth';


interface AssessmentEntry {
  student_id: number;
  score: number;
  notes?: string;
}

interface AssessmentEntryForm {
  assessment_type_id: number;
  institution_id: number;
  assessment_date: string;
  grade_level?: string;
  subject?: string;
  entries: AssessmentEntry[];
}

export default function AssessmentEntry() {
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | null>(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assessmentEntries, setAssessmentEntries] = useState<Map<number, AssessmentEntry>>(new Map());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to safely validate SelectItem values
  const getSafeSelectValue = (value: any): string => {
    if (!value) return '';
    const stringValue = String(value).trim();
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null' ? '' : stringValue;
  };

  // Helper function to validate items for SelectItem
  const isValidSelectItem = (item: any): boolean => {
    return item && item.id && item.name && getSafeSelectValue(item.id) !== '';
  };

  // Fetch institutions
  const { data: institutionsResponse, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions-dropdown'],
    queryFn: () => institutionService.getInstitutions({ per_page: 100 }),
    staleTime: 1000 * 60 * 10,
  });

  // Extract institutions array from response
  const institutions = institutionsResponse?.data || [];

  // Fetch assessment types
  const { data: assessmentTypes, isLoading: assessmentTypesLoading } = useQuery({
    queryKey: ['assessment-types-dropdown'],
    queryFn: () => assessmentTypeService.getAssessmentTypesDropdown(),
    staleTime: 1000 * 60 * 10,
  });

  // Fetch students for selected institution
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['students', selectedInstitution, selectedGradeLevel, searchTerm],
    queryFn: async () => {
      if (!selectedInstitution) return null;
      
      const filters = {
        grade_level: (selectedGradeLevel && selectedGradeLevel !== 'all') ? selectedGradeLevel : undefined,
        search: searchTerm || undefined,
        per_page: 100
      };
      
      return studentService.getStudentsByInstitution(selectedInstitution, filters);
    },
    enabled: !!selectedInstitution,
    staleTime: 1000 * 60 * 5,
  });

  const students = studentsData?.students || [];

  // Submit assessment entries mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentEntryForm) => {
      return assessmentEntryService.submitAssessmentEntries(data);
    },
    onSuccess: (response) => {
      const { data, warnings } = response;
      
      toast({
        title: 'Uğurlu əməliyyat',
        description: `${data.created_count} qiymətləndirmə uğurla saxlanıldı.`,
      });
      
      // Show warnings if any
      if (warnings && warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: 'Xəbərdarlıq',
            description: `${data.error_count} xəta baş verdi. Xəbərdarlıqları yoxlayın.`,
            variant: 'destructive',
          });
        }, 1000);
      }
      
      // Reset form
      setAssessmentEntries(new Map());
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Qiymətləndirmələr saxlanılarkən xəta baş verdi.',
        variant: 'destructive',
      });
    }
  });

  // Handle assessment type selection
  const handleAssessmentTypeChange = (assessmentTypeId: string) => {
    const assessmentType = assessmentTypes?.find(t => t.id.toString() === assessmentTypeId);
    setSelectedAssessmentType(assessmentType || null);
    setAssessmentEntries(new Map()); // Clear existing entries
  };

  // Handle institution selection
  const handleInstitutionChange = (institutionId: string) => {
    setSelectedInstitution(parseInt(institutionId));
    setAssessmentEntries(new Map()); // Clear existing entries
  };

  // Handle score entry
  const handleScoreChange = (studentId: number, score: string) => {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) {
      // Remove entry if score is invalid
      const newEntries = new Map(assessmentEntries);
      newEntries.delete(studentId);
      setAssessmentEntries(newEntries);
      return;
    }

    const maxScore = selectedAssessmentType?.max_score || 100;
    if (numScore < 0 || numScore > maxScore) {
      toast({
        title: 'Yanlış bal',
        description: `Bal 0 ilə ${maxScore} arasında olmalıdır.`,
        variant: 'destructive',
      });
      return;
    }

    const newEntries = new Map(assessmentEntries);
    const existingEntry = newEntries.get(studentId) || { student_id: studentId, score: 0 };
    newEntries.set(studentId, { ...existingEntry, score: numScore });
    setAssessmentEntries(newEntries);
  };

  // Handle notes change
  const handleNotesChange = (studentId: number, notes: string) => {
    const newEntries = new Map(assessmentEntries);
    const existingEntry = newEntries.get(studentId) || { student_id: studentId, score: 0 };
    newEntries.set(studentId, { ...existingEntry, notes });
    setAssessmentEntries(newEntries);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedInstitution || !selectedAssessmentType) {
      toast({
        title: 'Məlumat eksikliği',
        description: 'Təşkilat və qiymətləndirmə növü seçilməlidir.',
        variant: 'destructive',
      });
      return;
    }

    if (assessmentEntries.size === 0) {
      toast({
        title: 'Məlumat eksikliği',
        description: 'Ən azı bir şagird üçün qiymət daxil edilməlidir.',
        variant: 'destructive',
      });
      return;
    }

    const formData: AssessmentEntryForm = {
      assessment_type_id: selectedAssessmentType.id,
      institution_id: selectedInstitution,
      assessment_date: assessmentDate,
      grade_level: (selectedGradeLevel && selectedGradeLevel !== 'all') ? selectedGradeLevel : undefined,
      subject: (selectedSubject && selectedSubject !== 'all') ? selectedSubject : undefined,
      entries: Array.from(assessmentEntries.values())
    };

    submitAssessmentMutation.mutate(formData);
  };

  // Students are already filtered by the API
  const filteredStudents = students;

  const gradeLevels = assessmentTypeService.getGradeLevels();
  const subjects = assessmentTypeService.getSubjects();

  return (
    <div className="p-6 space-y-6">
      <QuickAuth />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmə Daxil Etmə</h1>
          <p className="text-muted-foreground">Şagirdlər üçün qiymətləndirmə nəticələrini daxil edin</p>
        </div>
      </div>

      {/* Selection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Qiymətləndirmə Parametrləri</span>
          </CardTitle>
          <CardDescription>
            Əvvəlcə təşkilat və qiymətləndirmə növünü seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="institution">Təşkilat *</Label>
              <Select 
                value={selectedInstitution?.toString() || ''} 
                onValueChange={handleInstitutionChange}
                disabled={institutionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Təşkilat seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(institutions) && institutions
                    .filter(isValidSelectItem)
                    .map((institution) => {
                      const safeValue = getSafeSelectValue(institution.id);
                      return safeValue ? (
                        <SelectItem key={institution.id} value={safeValue}>
                          {institution.name}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assessment_type">Qiymətləndirmə Növü *</Label>
              <Select 
                value={selectedAssessmentType?.id.toString() || ''} 
                onValueChange={handleAssessmentTypeChange}
                disabled={assessmentTypesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Növ seçin" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes?.filter(isValidSelectItem).map((type) => {
                    const safeValue = getSafeSelectValue(type.id);
                    return safeValue ? (
                      <SelectItem key={type.id} value={safeValue}>
                        {type.name}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assessment_date">Tarix *</Label>
              <Input
                id="assessment_date"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="grade_level">Sinif Səviyyəsi</Label>
              <Select 
                value={selectedGradeLevel} 
                onValueChange={setSelectedGradeLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  {gradeLevels.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Fənn</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fənn seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Şagird Axtarışı</Label>
              <div className="flex space-x-2">
                <Input
                  id="search"
                  placeholder="Ad və ya nömrə..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button size="icon" variant="outline" onClick={() => refetchStudents()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Type Info */}
      {selectedAssessmentType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Seçilmiş Qiymətləndirmə Növü</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Ad</Label>
                <p className="font-medium">{selectedAssessmentType.name}</p>
              </div>
              <div>
                <Label>Kateqoriya</Label>
                <Badge>{selectedAssessmentType.category_label}</Badge>
              </div>
              <div>
                <Label>Maksimum Bal</Label>
                <p className="font-medium">{selectedAssessmentType.max_score}</p>
              </div>
              <div>
                <Label>Qiymətləndirmə Metodu</Label>
                <p className="font-medium">{selectedAssessmentType.scoring_method_label}</p>
              </div>
            </div>
            {selectedAssessmentType.description && (
              <div className="mt-4">
                <Label>Təsvir</Label>
                <p className="text-sm text-muted-foreground">{selectedAssessmentType.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      {selectedInstitution && selectedAssessmentType && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Şagird Qiymətləndirmələri</span>
                </CardTitle>
                <CardDescription>
                  {studentsData?.pagination?.total || filteredStudents.length} şagird • {assessmentEntries.size} qiymət daxil edilib
                </CardDescription>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={submitAssessmentMutation.isPending || assessmentEntries.size === 0}
              >
                {submitAssessmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Saxla
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Şagirdlər yüklənir...</span>
              </div>
            ) : filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Şagird</TableHead>
                    <TableHead>Nömrə</TableHead>
                    <TableHead>Sinif</TableHead>
                    <TableHead>Bal (0-{selectedAssessmentType.max_score})</TableHead>
                    <TableHead>Qeydlər</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const entry = assessmentEntries.get(student.id);
                    const hasScore = entry && entry.score > 0;
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Sinif səviyyəsi: {student.grade_level}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{student.student_number}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={selectedAssessmentType.max_score}
                            step="0.1"
                            placeholder="Bal"
                            value={entry?.score || ''}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Qeydlər..."
                            value={entry?.notes || ''}
                            onChange={(e) => handleNotesChange(student.id, e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          {hasScore ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Daxil edilib
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Gözləyir
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Axtarış nəticəsində şagird tapılmadı' : 'Bu təşkilatda şagird tapılmadı'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedInstitution || !selectedAssessmentType ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Qiymətləndirmə daxil etməyə başlayın</h3>
              <p className="text-muted-foreground">
                Əvvəlcə təşkilat və qiymətləndirmə növünü seçin, sonra şagirdlər üçün qiymətlər daxil edin.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}