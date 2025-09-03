import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Grade, gradeService, GradeCreateData, GradeUpdateData } from '@/services/grades';
import { gradeCustomLogic } from './configurations/gradeConfig';
import { logger } from '@/utils/logger';
import { Loader2, AlertCircle, Users, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeCreateDialogProps {
  open: boolean;
  onClose: () => void;
  editingGrade?: Grade | null;
  availableInstitutions: Array<{ id: number; name: string }>;
  availableAcademicYears: Array<{ id: number; name: string; is_active: boolean }>;
}

export const GradeCreateDialog: React.FC<GradeCreateDialogProps> = ({
  open,
  onClose,
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
    description: '',
    student_count: 0,
  });

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // Initialize form data when editing
  React.useEffect(() => {
    if (editingGrade && open) {
      setFormData({
        name: editingGrade.name,
        class_level: editingGrade.class_level,
        academic_year_id: editingGrade.academic_year_id,
        institution_id: editingGrade.institution_id,
        specialty: editingGrade.specialty || '',
        description: editingGrade.description || '',
        student_count: editingGrade.student_count,
      });
    } else if (open && !editingGrade) {
      // Reset form for new grade
      const activeYear = availableAcademicYears.find(year => year.is_active);
      const firstInstitution = availableInstitutions[0];
      
      setFormData({
        name: '',
        class_level: 1,
        academic_year_id: activeYear?.id || 0,
        institution_id: firstInstitution?.id || 0,
        specialty: '',
        description: '',
        student_count: 0,
      });
    }
    setValidationErrors({});
  }, [editingGrade, open, availableAcademicYears, availableInstitutions]);

  // Fetch available rooms and teachers when institution is selected
  const { data: availableRooms } = useQuery({
    queryKey: ['rooms', 'available', formData.institution_id, formData.academic_year_id],
    queryFn: () => gradeService.getAvailableRooms(
      formData.institution_id, 
      formData.academic_year_id, 
      editingGrade?.id
    ),
    enabled: !!formData.institution_id && !!formData.academic_year_id,
  });

  const { data: availableTeachers } = useQuery({
    queryKey: ['teachers', 'available', formData.institution_id],
    queryFn: () => gradeService.getAvailableTeachers(formData.institution_id, editingGrade?.id),
    enabled: !!formData.institution_id,
  });

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: GradeCreateData) => gradeService.createGrade(data),
    onSuccess: (response) => {
      logger.info('Grade created successfully', {
        component: 'GradeCreateDialog',
        action: 'createGrade',
        data: { gradeId: response.data?.id, gradeName: formData.name }
      });

      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['grades'] });
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to create grade', {
        component: 'GradeCreateDialog',
        action: 'createGrade',
        error: error.message,
        data: { formData }
      });

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
    onSuccess: (response) => {
      logger.info('Grade updated successfully', {
        component: 'GradeCreateDialog',
        action: 'updateGrade',
        data: { gradeId: editingGrade?.id, gradeName: formData.name }
      });

      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif məlumatları uğurla yeniləndi',
      });

      queryClient.invalidateQueries({ queryKey: ['grades'] });
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to update grade', {
        component: 'GradeCreateDialog',
        action: 'updateGrade',
        error: error.message,
        data: { gradeId: editingGrade?.id, formData }
      });

      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sinif yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = gradeCustomLogic.validateCreateData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    // Transform data
    const transformedData = gradeCustomLogic.transformCreateData(formData);

    if (editingGrade) {
      // Update existing grade
      const updateData: GradeUpdateData = {
        name: transformedData.name,
        specialty: transformedData.specialty,
        description: transformedData.description,
        student_count: transformedData.student_count,
      };

      updateMutation.mutate({ id: editingGrade.id, updates: updateData });
    } else {
      // Create new grade
      createMutation.mutate(transformedData);
    }
  }, [formData, editingGrade, createMutation, updateMutation]);

  // Handle form field changes
  const handleFieldChange = React.useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingGrade ? 'Sinif Məlumatlarını Redaktə Et' : 'Yeni Sinif Yarat'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grade Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Sinif Adı <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="məs: A, B, C"
                disabled={isLoading}
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            {/* Class Level */}
            <div className="space-y-2">
              <Label htmlFor="class_level">
                Sinif Səviyyəsi <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.class_level.toString()}
                onValueChange={(value) => handleFieldChange('class_level', parseInt(value))}
                disabled={isLoading || !!editingGrade} // Cannot change level when editing
              >
                <SelectTrigger className={validationErrors.class_level ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}. sinif
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.class_level && (
                <p className="text-sm text-red-600">{validationErrors.class_level}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Institution */}
            <div className="space-y-2">
              <Label htmlFor="institution_id">
                Məktəb <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.institution_id.toString()}
                onValueChange={(value) => handleFieldChange('institution_id', parseInt(value))}
                disabled={isLoading || !!editingGrade} // Cannot change institution when editing
              >
                <SelectTrigger className={validationErrors.institution_id ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableInstitutions.map(institution => (
                    <SelectItem key={institution.id} value={institution.id.toString()}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.institution_id && (
                <p className="text-sm text-red-600">{validationErrors.institution_id}</p>
              )}
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <Label htmlFor="academic_year_id">
                Təhsil İli <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.academic_year_id.toString()}
                onValueChange={(value) => handleFieldChange('academic_year_id', parseInt(value))}
                disabled={isLoading || !!editingGrade} // Cannot change year when editing
              >
                <SelectTrigger className={validationErrors.academic_year_id ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableAcademicYears.map(year => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      <div className="flex items-center gap-2">
                        {year.name}
                        {year.is_active && <Badge variant="default" className="text-xs">Aktiv</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.academic_year_id && (
                <p className="text-sm text-red-600">{validationErrors.academic_year_id}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Specialty */}
            <div className="space-y-2">
              <Label htmlFor="specialty">İxtisas</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => handleFieldChange('specialty', e.target.value)}
                placeholder="məs: Riyaziyyat, Humanitar"
                disabled={isLoading}
              />
            </div>

            {/* Student Count */}
            <div className="space-y-2">
              <Label htmlFor="student_count">Tələbə Sayı</Label>
              <Input
                id="student_count"
                type="number"
                min="0"
                max="50"
                value={formData.student_count}
                onChange={(e) => handleFieldChange('student_count', parseInt(e.target.value) || 0)}
                disabled={isLoading}
                className={validationErrors.student_count ? 'border-red-500' : ''}
              />
              {validationErrors.student_count && (
                <p className="text-sm text-red-600">{validationErrors.student_count}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Sinif haqqında əlavə məlumat..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Available Resources Info */}
          {availableRooms?.data && availableTeachers?.data && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{availableRooms.data.length} otaq müsaitdir</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{availableTeachers.data.length} müəllim müsaitdir</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
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