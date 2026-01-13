/**
 * ExcelCreateRow Component
 *
 * Inline task creation form matching Excel table columns
 */

import { useState, useCallback } from 'react';
import { Save, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTaskMutations } from '@/hooks/tasks/useTaskMutations';
import { CreateTaskData } from '@/services/tasks';
import {
  categoryOptions,
  priorityOptions,
  sourceOptions,
  sourceLabels,
} from '@/components/tasks/config/taskFormFields';
import { cn } from '@/lib/utils';

interface ExcelCreateRowProps {
  availableUsers: Array<{ id: number; name: string; email?: string }>;
  availableDepartments: Array<{ id: number; name: string }>;
  onTaskCreated: () => Promise<void>;
  originScope: 'region' | 'sector' | null;
  showCreateButton: boolean;
}

interface FormState {
  title: string;
  description: string;
  source: string;
  department_id: number | null;
  priority: string;
  assigned_user_ids: number[];
  deadline: string;
  deadline_time: string;
}

const initialFormState: FormState = {
  title: '',
  description: '',
  source: 'other',
  department_id: null,
  priority: 'medium',
  assigned_user_ids: [],
  deadline: '',
  deadline_time: '',
};

export function ExcelCreateRow({
  availableUsers,
  availableDepartments,
  onTaskCreated,
  originScope,
  showCreateButton,
}: ExcelCreateRowProps) {
  const { toast } = useToast();
  const { createTask } = useTaskMutations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İcazə yoxlaması
  if (!showCreateButton) {
    return null;
  }

  const handleFieldChange = useCallback((field: keyof FormState, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setFormData(initialFormState);
    setIsExpanded(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Xəta',
        description: 'Tapşırıq adı mütləqdir',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Xəta',
        description: 'Təsvir mütləqdir',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTaskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        source: formData.source as CreateTaskData['source'],
        priority: formData.priority as CreateTaskData['priority'],
        deadline: formData.deadline || undefined,
        deadline_time: formData.deadline_time || undefined,
        assigned_user_ids: formData.assigned_user_ids.length > 0 ? formData.assigned_user_ids : undefined,
        target_departments: formData.department_id ? [formData.department_id] : undefined,
        origin_scope: originScope || undefined,
        target_scope: originScope === 'region' ? 'regional' : 'sector',
        category: 'other', // Default category
      };

      await createTask.mutateAsync(payload);

      toast({
        title: 'Uğurla yaradıldı',
        description: 'Yeni tapşırıq əlavə edildi',
      });

      // Reset form və collapse
      handleReset();

      // Cədvəli yenilə
      await onTaskCreated();
    } catch (error) {
      console.error('[ExcelCreateRow] Yaratma xətası', error);
      toast({
        title: 'Xəta baş verdi',
        description: error instanceof Error ? error.message : 'Tapşırıq yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createTask, toast, onTaskCreated, handleReset, originScope]);

  return (
    <>
      {/* Collapsed State - Düymə */}
      {!isExpanded && (
        <tr className="border-t-2 border-primary/20 bg-muted/20 hover:bg-muted/40 transition-colors">
          <td colSpan={100} className="px-4 py-3">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start text-muted-foreground hover:text-primary',
                'transition-colors group'
              )}
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Yeni tapşırıq yarat</span>
                <span className="text-xs text-muted-foreground/60">
                  (sətirdə birbaşa əlavə et)
                </span>
              </div>
            </Button>
          </td>
        </tr>
      )}

      {/* Expanded State - Inline Form */}
      {isExpanded && (
        <tr className="border-t-2 border-primary/30 bg-blue-50/50 dark:bg-blue-950/20">
          {/* 1. № (boş, Plus icon) */}
          <td className="px-2 py-3 text-center text-muted-foreground w-[60px]">
            <Plus className="h-4 w-4 mx-auto" />
          </td>

          {/* 2. Tapşırıq Adı */}
          <td className="px-2 py-3 w-[250px]">
            <Input
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Tapşırıq adı *"
              className="h-9 text-sm"
              autoFocus
              disabled={isSubmitting}
            />
          </td>

          {/* 3. Daxil olduğu yer (Source) */}
          <td className="px-2 py-3 w-[140px]">
            <Select
              value={formData.source}
              onValueChange={(value) => handleFieldChange('source', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* 4. Departament */}
          <td className="px-2 py-3 w-[160px]">
            <Select
              value={formData.department_id?.toString() || 'none'}
              onValueChange={(value) =>
                handleFieldChange('department_id', value === 'none' ? null : Number(value))
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Departament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Heç biri</SelectItem>
                {availableDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* 5. Prioritet */}
          <td className="px-2 py-3 w-[120px]">
            <Select
              value={formData.priority}
              onValueChange={(value) => handleFieldChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* 6. Status (Yeni tapşırıq üçün həmişə "Gözləyir") */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm w-[130px]">
            Gözləyir
          </td>

          {/* 7. Məsul Şəxs */}
          <td className="px-2 py-3 w-[200px]">
            <Select
              value={formData.assigned_user_ids[0]?.toString() || 'none'}
              onValueChange={(value) =>
                handleFieldChange('assigned_user_ids', value === 'none' ? [] : [Number(value)])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Məsul seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Heç biri</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* 8. Təsvir */}
          <td className="px-2 py-3 w-[300px]">
            <Textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Təsvir *"
              className="min-h-[80px] text-sm resize-none"
              disabled={isSubmitting}
            />
          </td>

          {/* 9. Başlama Tarixi (Backend set edir, boş göstər) */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm w-[140px]">
            —
          </td>

          {/* 10. Son Tarix */}
          <td className="px-2 py-3 w-[140px]">
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleFieldChange('deadline', e.target.value)}
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
          </td>

          {/* 11. Son Saat */}
          <td className="px-2 py-3 w-[110px]">
            <Input
              type="time"
              value={formData.deadline_time}
              onChange={(e) => handleFieldChange('deadline_time', e.target.value)}
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
          </td>

          {/* 12. İrəliləyiş (Yeni tapşırıqda 0%) */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm w-[140px]">
            0%
          </td>

          {/* 13. Əməliyyatlar (Saxla və Ləğv et) */}
          <td className="px-2 py-3 w-[100px]">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1 h-8 px-2"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={isSubmitting}
                className="gap-1 h-8 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
