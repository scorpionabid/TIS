import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Grade, gradeService, GradeCreateData, GradeUpdateData } from '@/services/grades';
import { teacherService } from '@/services/teachers';
import { logger } from '@/utils/logger';
import {
  Loader2,
  AlertCircle,
  Users,
  MapPin,
  School,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { User } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { formatGradeName, getCapacityRecommendation, getEducationStageColor } from '@/constants/gradeNaming';
import { TagSelector } from './TagSelector';
import { EducationProgramSelector } from './EducationProgramSelector';
import { GenderCountInput } from './GenderCountInput';
import type { EducationProgramType } from '@/types/gradeTag';

const CLASS_NAME_REGEX = /^(?:\s*)(\d{1,2})\s*([A-Za-zƏÖÜÇĞŞIİəöüğçı]+)$/iu;

const parseClassFullName = (value: string) => {
  const clean = value.replace(/[-_]/g, ' ').trim();
  if (!clean) {
    return null;
  }

  const match = clean.match(CLASS_NAME_REGEX);
  if (!match) {
    return null;
  }

  const level = parseInt(match[1], 10);
  if (Number.isNaN(level)) {
    return null;
  }

  const letter = (match[2] || '').toUpperCase();
  return {
    level,
    letter: letter.slice(0, 5),
  };
};

const formatClassFullName = (level?: number, letter?: string) => {
  if (level === undefined || level === null) {
    return letter || '';
  }
  return `${level}${letter ?? ''}`;
};

const TEACHING_SHIFT_OPTIONS = ['1 növbə', '2 növbə', '3 növbə', 'Fərdi'];

interface GradeCreateDialogSimplifiedProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  editingGrade?: Grade | null;
  availableInstitutions: Array<{ id: number; name: string }>;
  availableAcademicYears: Array<{ id: number; name: string; is_active: boolean }>;
}

export const GradeCreateDialogSimplified: React.FC<GradeCreateDialogSimplifiedProps> = ({
  open,
  onClose,
  currentUser,
  editingGrade,
  availableInstitutions,
  availableAcademicYears,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = React.useState<GradeCreateData>({
    name: '',
    class_level: 1,
    academic_year_id: 0,
    institution_id: 0,
    specialty: '',
    student_count: 0,
    male_student_count: 0,
    female_student_count: 0,
    education_program: 'umumi',
    class_full_name: '',
    class_type: '',
    class_profile: '',
    teaching_shift: '',
    tag_ids: [],
  });

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // Check if user is school admin
  const isSchoolAdmin = currentUser?.role === USER_ROLES.SCHOOLADMIN;
  const userInstitution = currentUser?.institution;

  // Initialize form data
  React.useEffect(() => {
    if (editingGrade && open) {
      setFormData({
        name: editingGrade.name,
        class_level: editingGrade.class_level,
        academic_year_id: editingGrade.academic_year_id,
        institution_id: editingGrade.institution_id,
        specialty: editingGrade.specialty || '',
        student_count: editingGrade.student_count,
        male_student_count: (editingGrade as any).male_student_count || 0,
        female_student_count: (editingGrade as any).female_student_count || 0,
        education_program: (editingGrade as any).education_program || 'umumi',
        class_full_name: formatClassFullName(editingGrade.class_level, editingGrade.name),
        class_type: (editingGrade as any).class_type || '',
        class_profile: (editingGrade as any).class_profile || '',
        teaching_shift: (editingGrade as any).teaching_shift || '',
        tag_ids: (editingGrade as any).tags?.map((t: any) => t.id) || [],
      });
    } else if (open && !editingGrade) {
      const activeYear = availableAcademicYears.find(year => year.is_active);
      const defaultInstitutionId = isSchoolAdmin && userInstitution?.id
        ? userInstitution.id
        : availableInstitutions[0]?.id || 0;

      setFormData({
        name: '',
        class_level: 1,
        academic_year_id: activeYear?.id || 0,
        institution_id: defaultInstitutionId,
        specialty: '',
        student_count: 0,
        male_student_count: 0,
        female_student_count: 0,
        education_program: 'umumi',
        class_full_name: '',
        class_type: '',
        class_profile: '',
        teaching_shift: '',
        tag_ids: [],
      });
    }
    setValidationErrors({});
  }, [editingGrade, open, availableAcademicYears, availableInstitutions, isSchoolAdmin, userInstitution]);

  // Fetch naming options from backend
  const { data: namingOptions, isLoading: loadingNamingOptions } = useQuery({
    queryKey: ['grade-naming-options', formData.institution_id, formData.class_level, formData.academic_year_id],
    queryFn: () =>
      gradeService.getNamingOptions(
        formData.institution_id,
        formData.academic_year_id,
        formData.class_level
      ),
    enabled: open && !!formData.institution_id && !!formData.academic_year_id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Fetch available teachers for homeroom teacher selection
  const { data: availableTeachers } = useQuery({
    queryKey: ['teachers', formData.institution_id],
    queryFn: async () => {
      const response = await teacherService.getTeachers({
        institution_id: formData.institution_id,
        is_active: true,
        per_page: 100
      });
      return response.data || [];
    },
    enabled: open && !!formData.institution_id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: GradeCreateData) => gradeService.createGrade(data),
    onSuccess: () => {
      logger.info('Grade created successfully');
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif uğurla yaradıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.refetchQueries({ queryKey: ['grades'] });
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to create grade', error);
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sinif yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: GradeUpdateData }) =>
      gradeService.updateGrade(data.id, data.updates),
    onSuccess: () => {
      logger.info('Grade updated successfully');
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif məlumatları uğurla yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.refetchQueries({ queryKey: ['grades'] });
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to update grade', error);
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sinif yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errors: Record<string, string> = {};
    if (!formData.class_full_name?.trim()) {
      errors.class_full_name = 'Sinif adı mütləqdir';
    } else if (!parseClassFullName(formData.class_full_name)) {
      errors.class_full_name = 'Sinif adı 5A və ya 10B formatında olmalıdır';
    }
    if (!formData.academic_year_id) errors.academic_year_id = 'Akademik il mütləqdir';
    if (!formData.institution_id) errors.institution_id = 'Məktəb mütləqdir';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    if (editingGrade) {
      const updateData: GradeUpdateData = {
        name: formData.name,
        class_full_name: formData.class_full_name,
        class_level: formData.class_level,
        specialty: formData.specialty,
        student_count: formData.student_count,
        male_student_count: formData.male_student_count,
        female_student_count: formData.female_student_count,
        education_program: formData.education_program,
        class_type: formData.class_type,
        class_profile: formData.class_profile,
        teaching_shift: formData.teaching_shift,
        tag_ids: formData.tag_ids,
      };
      updateMutation.mutate({ id: editingGrade.id, updates: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClassFullNameChange = (value: string) => {
    handleFieldChange('class_full_name', value);

    if (!value.trim()) {
      setValidationErrors(prev => ({ ...prev, class_full_name: 'Sinif adı mütləqdir' }));
      return;
    }

    const parsed = parseClassFullName(value);
    if (!parsed) {
      setValidationErrors(prev => ({ ...prev, class_full_name: 'Format 5A, 7B və ya 0A olmalıdır' }));
      return;
    }

    handleFieldChange('class_level', parsed.level);
    handleFieldChange('name', parsed.letter);
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.class_full_name;
      delete next.class_level;
      delete next.name;
      return next;
    });
  };

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Get preview
  const previewName = formData.class_level && formData.name
    ? formatGradeName(formData.class_level, formData.name, formData.specialty)
    : '';

  // Get capacity recommendation
  const capacityRec = formData.class_level
    ? getCapacityRecommendation(formData.class_level)
    : null;

  // Check if specialty should be shown
  const shouldShowSpecialty = formData.class_level >= 10 && formData.class_level <= 12;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <School className="h-5 w-5 text-blue-600" />
            {editingGrade ? 'Sinif Məlumatlarını Redaktə Et' : 'Yeni Sinif Yarat'}
          </DialogTitle>
          <DialogDescription>
            {editingGrade
              ? 'Mövcud sinifin məlumatlarını yeniləyin.'
              : 'Standartlaşdırılmış sinif adlandırma sistemi ilə yeni sinif yaradın.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Əsas Məlumat</TabsTrigger>
              <TabsTrigger value="optional">Əlavə Məlumat (könüllü)</TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC INFO (REQUIRED) */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Combined class name input */}
              <div className="space-y-2">
                <Label htmlFor="class_full_name">
                  Sinif adı <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="class_full_name"
                  value={formData.class_full_name || ''}
                  onChange={(event) => handleClassFullNameChange(event.target.value)}
                  placeholder="Məs: 5A, 7B, 10C"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Sinif səviyyəsi və hərfini birlikdə daxil edin. Sistem səviyyə və hərfi avtomatik ayıracaq.
                </p>
                {validationErrors.class_full_name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.class_full_name}
                  </p>
                )}
              </div>

              {/* Academic Year - AUTO-SELECTED */}
              <div className="space-y-2">
                <Label>Akademik İl</Label>
                <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                  <span>
                    {availableAcademicYears.find(y => y.id === formData.academic_year_id)?.name || '2024-2025'}
                  </span>
                  <Badge variant="outline">Aktiv</Badge>
                </div>
              </div>

              {/* Live Preview */}
              {previewName && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <div className="font-medium text-blue-900">
                      Sinif adı: <strong className="text-lg">{previewName}</strong>
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      <Badge className={getEducationStageColor(formData.class_level)} variant="secondary">
                        {formData.class_level === 0 && 'Məktəbəqədər hazırlıq'}
                        {formData.class_level >= 1 && formData.class_level <= 4 && 'İbtidai təhsil'}
                        {formData.class_level >= 5 && formData.class_level <= 9 && 'Ümumi orta təhsil'}
                        {formData.class_level >= 10 && formData.class_level <= 12 && 'Tam orta təhsil'}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* TAB 2: OPTIONAL INFO */}
            <TabsContent value="optional" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class_type">Sinfin tipi</Label>
                  <Input
                    id="class_type"
                    value={formData.class_type || ''}
                    onChange={(event) => handleFieldChange('class_type', event.target.value)}
                    placeholder="Məs: Orta məktəb sinfi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class_profile">Profil</Label>
                  <Input
                    id="class_profile"
                    value={formData.class_profile || ''}
                    onChange={(event) => handleFieldChange('class_profile', event.target.value)}
                    placeholder="Məs: Rəqəmsal bacarıqlar"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teaching_shift">Növbə</Label>
                <Select
                  value={formData.teaching_shift || 'none'}
                  onValueChange={(value) =>
                    handleFieldChange('teaching_shift', value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Növbəni seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilməyib</SelectItem>
                    {TEACHING_SHIFT_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Education Program */}
              <EducationProgramSelector
                value={(formData.education_program as EducationProgramType) || 'umumi'}
                onChange={(value) => handleFieldChange('education_program', value)}
                disabled={isLoading}
                error={validationErrors.education_program}
              />

              {/* Student Count with Gender Split - OPTIONAL */}
              <GenderCountInput
                maleCount={formData.male_student_count || 0}
                femaleCount={formData.female_student_count || 0}
                onMaleChange={(count) => handleFieldChange('male_student_count', count)}
                onFemaleChange={(count) => handleFieldChange('female_student_count', count)}
                onTotalChange={(total) => handleFieldChange('student_count', total)}
                disabled={isLoading}
                errors={{
                  male: validationErrors.male_student_count,
                  female: validationErrors.female_student_count,
                  total: validationErrors.student_count,
                }}
              />

              {/* Specialty - OPTIONAL (shown for grades 10-12) */}
              {shouldShowSpecialty && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">
                    İxtisas/İstiqamət (könüllü)
                  </Label>
                  <Select
                    value={formData.specialty || 'none'}
                    onValueChange={(value) => handleFieldChange('specialty', value === 'none' ? '' : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="İxtisas seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {namingOptions?.data?.specialties?.map((specialty: any) => (
                        <SelectItem key={specialty.value || 'none'} value={specialty.value || 'none'}>
                          {specialty.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    10-12 siniflər üçün ixtisas təyin edilə bilər
                  </p>
                </div>
              )}

              {/* Homeroom Teacher - OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="homeroom_teacher_id">
                  Sinif Rəhbəri (könüllü)
                </Label>
                <Select
                  value={formData.homeroom_teacher_id?.toString() || 'none'}
                  onValueChange={(value) => handleFieldChange('homeroom_teacher_id', value === 'none' ? undefined : parseInt(value))}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Müəllim seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sinif rəhbəri təyin edilməyib</SelectItem>
                    {availableTeachers?.map((teacher: any) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.full_name || `${teacher.first_name} ${teacher.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Mövcud müəllimlərdən sinif rəhbəri təyin edə bilərsiniz
                </p>
              </div>

              {/* Description - OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Qeyd (könüllü)
                </Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Sinif haqqında əlavə məlumat..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGrade ? 'Yenilə' : 'Yarat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
