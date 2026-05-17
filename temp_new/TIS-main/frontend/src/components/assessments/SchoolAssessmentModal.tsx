import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { assessmentTypeService, AssessmentStage, AssessmentType } from '@/services/assessmentTypes';
import { schoolAssessmentService, CreateSchoolAssessmentPayload } from '@/services/schoolAssessments';
import { useAuth } from '@/contexts/AuthContext';
import { gradeService } from '@/services/grades';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const defaultForm: CreateSchoolAssessmentPayload = {
  assessment_type_id: 0,
  assessment_stage_id: 0,
  scheduled_date: new Date().toISOString().split('T')[0],
  title: '',
  subjects: [],
  grade_levels: [],
  notes: '',
  total_students: undefined,
  participants_count: undefined,
};

export const SchoolAssessmentModal: React.FC<SchoolAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [form, setForm] = useState<CreateSchoolAssessmentPayload>(defaultForm);
  const [stageOptions, setStageOptions] = useState<AssessmentStage[]>([]);

  const { data: assessmentTypesData, isLoading: typesLoading } = useQuery({
    queryKey: ['assessment-types-dropdown', currentUser?.institution?.id],
    queryFn: () => assessmentTypeService.getAssessmentTypesDropdown(),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  const typeOptions = useMemo(() => {
    const items = Array.isArray(assessmentTypesData)
      ? assessmentTypesData
      : Array.isArray((assessmentTypesData as any)?.data)
        ? (assessmentTypesData as any).data
        : Array.isArray((assessmentTypesData as any)?.data?.data)
          ? (assessmentTypesData as any).data.data
          : [];

    return items
      .filter((item: AssessmentType) => item?.id && item?.name)
      .map((item: AssessmentType) => ({ value: item.id, label: item.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assessmentTypesData]);

useEffect(() => {
  if (form.assessment_type_id) {
    assessmentTypeService.getStages(form.assessment_type_id).then(setStageOptions);
  } else {
    setStageOptions([]);
  }
}, [form.assessment_type_id]);

useEffect(() => {
  if (isOpen && typeOptions.length > 0 && !form.assessment_type_id) {
    setForm(prev => ({ ...prev, assessment_type_id: typeOptions[0].value }));
  }
}, [isOpen, typeOptions, form.assessment_type_id]);

useEffect(() => {
  if (!isOpen) return;

  setForm({
    ...defaultForm,
    institution_id: currentUser?.institution?.id ?? undefined,
  });
}, [isOpen, currentUser]);

  useEffect(() => {
    if (stageOptions.length === 0) {
      setForm(prev => ({ ...prev, assessment_stage_id: 0 }));
      return;
    }

    if (!stageOptions.some(stage => stage.id === form.assessment_stage_id)) {
      setForm(prev => ({ ...prev, assessment_stage_id: stageOptions[0].id }));
    }
  }, [stageOptions, form.assessment_stage_id]);

  const createMutation = useMutation({
    mutationFn: schoolAssessmentService.createAssessment.bind(schoolAssessmentService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-assessments'] });
      onCreated?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error?.message || 'Sessiya yaradılarkən problem yarandı.',
        variant: 'destructive',
      });
    }
  });

  const handleChange = (field: keyof CreateSchoolAssessmentPayload, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field: 'subjects' | 'grade_levels', value: string) => {
    const list = value.split(',').map(item => item.trim()).filter(Boolean);
    setForm(prev => ({ ...prev, [field]: list }));
  };

  const isValid = () => {
    return (
      form.assessment_type_id > 0 &&
      form.assessment_stage_id > 0
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid()) {
      toast({
        title: 'Məlumat çatışmır',
        description: 'Qiymətləndirmə tipi və mərhələ seçilməlidir.',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      ...form,
      institution_id: currentUser?.institution?.id,
      subjects: form.subjects?.filter(Boolean) ?? [],
      grade_levels: form.grade_levels?.filter(Boolean) ?? [],
      total_students: form.total_students ? Number(form.total_students) : undefined,
      participants_count: form.participants_count ? Number(form.participants_count) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni qiymətləndirmə sessiyası</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Qiymətləndirmə tipi *</Label>
              <Select
                value={form.assessment_type_id ? String(form.assessment_type_id) : ''}
                onValueChange={(value) => handleChange('assessment_type_id', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={typesLoading ? 'Yüklənir...' : 'Tip seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.length === 0 && !typesLoading ? (
                    <SelectItem value="__no_types" disabled>
                      Təşkilatınız üçün aktiv qiymətləndirmə tipi yoxdur
                    </SelectItem>
                  ) : (
                    typeOptions.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mərhələ *</Label>
              <Select
                value={form.assessment_stage_id ? String(form.assessment_stage_id) : ''}
                onValueChange={(value) => handleChange('assessment_stage_id', Number(value))}
                disabled={stageOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={stageOptions.length ? 'Mərhələ seçin' : 'Əvvəl tipi seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map(stage => (
                    <SelectItem key={stage.id} value={String(stage.id)}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qiymətləndirmə tarixi</Label>
              <Input
                type="date"
                value={form.scheduled_date ?? ''}
                onChange={(e) => handleChange('scheduled_date', e.target.value)}
              />
            </div>
          </div>

          {/* Hidden fields - kept for future use but not displayed */}
          <input type="hidden" value={form.subjects?.join(', ') ?? ''} />
          <input type="hidden" value={form.grade_levels?.join(', ') ?? ''} />
          <input type="hidden" value={form.total_students ?? ''} />
          <input type="hidden" value={form.participants_count ?? ''} />

          <div className="space-y-2">
            <Label>Qeydlər</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Əlavə təlimat və qeydlər"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Bağla
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !isValid()}>
              {createMutation.isPending ? 'Yaradılır...' : 'Yarat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolAssessmentModal;
