import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { teacherService } from '@/services/teachers';
import { institutionService } from '@/services/institutions';
import { TeacherWorkplace, WorkplaceFormData, POSITION_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/types/teacher';
import { Loader2, Plus, Building2, Briefcase } from 'lucide-react';

interface WorkplaceManagementModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
  workplace?: TeacherWorkplace | null;
  onSuccess?: () => void;
}

const WORK_DAYS = [
  { value: 'monday', label: 'Bazar ertəsi' },
  { value: 'tuesday', label: 'Çərşənbə axşamı' },
  { value: 'wednesday', label: 'Çərşənbə' },
  { value: 'thursday', label: 'Cümə axşamı' },
  { value: 'friday', label: 'Cümə' },
  { value: 'saturday', label: 'Şənbə' },
  { value: 'sunday', label: 'Bazar' },
];

export function WorkplaceManagementModal({
  open,
  onClose,
  teacherId,
  workplace,
  onSuccess,
}: WorkplaceManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!workplace;

  // Form state
  const [formData, setFormData] = useState<Partial<WorkplaceFormData>>({
    institution_id: workplace?.institution_id || 0,
    workplace_priority: workplace?.workplace_priority || 'secondary',
    position_type: workplace?.position_type || 'muəllim',
    employment_type: workplace?.employment_type || 'part_time',
    weekly_hours: workplace?.weekly_hours || 0,
    work_days: workplace?.work_days || [],
    subjects: workplace?.subjects || [],
    department_id: workplace?.department_id,
    start_date: workplace?.start_date || '',
    end_date: workplace?.end_date || '',
    status: workplace?.status || 'active',
    salary_amount: workplace?.salary_amount,
    salary_currency: workplace?.salary_currency || 'AZN',
    notes: workplace?.notes || '',
  });

  const [selectedWorkDays, setSelectedWorkDays] = useState<string[]>(workplace?.work_days || []);
  const [subjectsText, setSubjectsText] = useState<string>(
    workplace?.subjects?.join(', ') || ''
  );

  // Load institutions
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'all'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    enabled: open,
  });

  const institutions = institutionsResponse?.data?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: WorkplaceFormData) => teacherService.createWorkplace(teacherId, data),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'İş yeri uğurla əlavə edildi',
      });
      queryClient.invalidateQueries({ queryKey: ['teacher', teacherId, 'workplaces'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'İş yeri əlavə edilə bilmədi',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkplaceFormData>) =>
      teacherService.updateWorkplace(workplace!.id, data),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'İş yeri yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['teacher', teacherId, 'workplaces'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'İş yeri yenilənə bilmədi',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.institution_id) {
      toast({
        title: 'Xəta',
        description: 'Müəssisə seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    // Parse subjects from comma-separated text
    const subjects = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const submitData: WorkplaceFormData = {
      institution_id: formData.institution_id!,
      workplace_priority: formData.workplace_priority!,
      position_type: formData.position_type!,
      employment_type: formData.employment_type!,
      weekly_hours: formData.weekly_hours,
      work_days: selectedWorkDays,
      subjects,
      department_id: formData.department_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status!,
      salary_amount: formData.salary_amount,
      salary_currency: formData.salary_currency,
      notes: formData.notes,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Building2 className="h-5 w-5" />
                İş yerini redaktə et
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Yeni iş yeri əlavə et
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'İş yeri məlumatlarını yeniləyin'
              : 'Müəllimin əlavə iş yeri məlumatlarını daxil edin'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Institution */}
          <div>
            <Label htmlFor="institution">Müəssisə *</Label>
            <Select
              value={formData.institution_id?.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, institution_id: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Müəssisə seçin" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((inst: any) => (
                  <SelectItem key={inst.id} value={inst.id.toString()}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Workplace Priority */}
            <div>
              <Label htmlFor="priority">İş yeri prioriteti *</Label>
              <Select
                value={formData.workplace_priority}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, workplace_priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Əsas iş yeri</SelectItem>
                  <SelectItem value="secondary">2-ci iş yeri</SelectItem>
                  <SelectItem value="tertiary">3-cü iş yeri</SelectItem>
                  <SelectItem value="quaternary">4-cü iş yeri</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Position Type */}
            <div>
              <Label htmlFor="position">Vəzifə *</Label>
              <Select
                value={formData.position_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, position_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employment Type */}
            <div>
              <Label htmlFor="employment">İşçi növü *</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, employment_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weekly Hours */}
            <div>
              <Label htmlFor="hours">Həftəlik saat sayı</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="168"
                value={formData.weekly_hours || ''}
                onChange={(e) =>
                  setFormData({ ...formData, weekly_hours: parseFloat(e.target.value) })
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Work Days */}
          <div>
            <Label>İş günləri</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {WORK_DAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={selectedWorkDays.includes(day.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedWorkDays([...selectedWorkDays, day.value]);
                      } else {
                        setSelectedWorkDays(selectedWorkDays.filter((d) => d !== day.value));
                      }
                    }}
                  />
                  <label
                    htmlFor={day.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <Label htmlFor="subjects">Fənlər</Label>
            <Input
              id="subjects"
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              placeholder="Riyaziyyat, Fizika, ... (vergüllə ayırın)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <Label htmlFor="start-date">Başlama tarixi</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="end-date">Bitmə tarixi</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Qeydlər</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Əlavə qeydlər..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Yenilənir...' : 'Əlavə edilir...'}
                </>
              ) : isEditing ? (
                'Yenilə'
              ) : (
                'Əlavə et'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
