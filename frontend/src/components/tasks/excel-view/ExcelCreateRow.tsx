/**
 * ExcelCreateRow Component
 *
 * Inline task creation form matching Excel table columns
 */

import { useState, useCallback } from 'react';
import { Save, X, Plus, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  availableUsers: Array<{ id: number; name: string; email?: string; role?: string; role_display?: string }>;
  onTaskCreated: () => Promise<void>;
  originScope: 'region' | 'sector' | null;
  showCreateButton: boolean;
}

interface FormState {
  title: string;
  source: string;
  priority: string;
  assigned_user_ids: number[];
  deadline: string;
  deadline_time: string;
}

const initialFormState: FormState = {
  title: '',
  source: 'other',
  priority: 'medium',
  assigned_user_ids: [],
  deadline: '',
  deadline_time: '',
};

export function ExcelCreateRow({
  availableUsers,
  onTaskCreated,
  originScope,
  showCreateButton,
}: ExcelCreateRowProps) {
  const { toast } = useToast();
  const { createTask } = useTaskMutations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Double submit protection
    if (isSubmitting) {
      return;
    }

    // Validation - only title is required now
    if (!formData.title.trim()) {
      toast({
        title: 'Xəta',
        description: 'Tapşırıq adı mütləqdir',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTaskData = {
        title: formData.title.trim(),
        description: '', // description removed from UI
        source: formData.source as CreateTaskData['source'],
        priority: formData.priority as CreateTaskData['priority'],
        deadline: formData.deadline || undefined,
        deadline_time: formData.deadline_time || undefined,
        assigned_user_ids: formData.assigned_user_ids.length > 0 ? formData.assigned_user_ids : undefined,
        origin_scope: originScope || undefined,
        target_scope: originScope === 'region' ? 'regional' : 'sector',
        category: 'other',
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
      
      // Handle duplicate assignment errors specifically
      const errorMessage = error instanceof Error ? error.message : 'Tapşırıq yaradılarkən xəta baş verdi';
      
      if (errorMessage.includes('Duplicate assignment detected') || 
          errorMessage.includes('artıq bu tapşırıq üçün təyin edilib')) {
        toast({
          title: 'Təkrar təyinat',
          description: 'Bu istifadəçi artıq bu tapşırıq üçün təyin edilib. Zəhmət olmasa başqa istifadəçi seçin.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Xəta baş verdi',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createTask, toast, onTaskCreated, handleReset, originScope, isSubmitting]);

  // İcazə yoxlaması
  if (!showCreateButton) {
    return null;
  }

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
          {/* Empty checkbox cell for alignment */}
          <td className="px-2 py-3 w-[50px]"></td>
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
                <SelectValue placeholder="Mənbə seç" />
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

          {/* 4. Prioritet */}
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

          {/* 5. Status (Yeni tapşırıq üçün həmişə "Gözləyir") */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm w-[130px]">
            Gözləyir
          </td>

          {/* 6. Məsul Şəxs (Axtarışlı Multi-select) */}
          <td className="px-2 py-3 w-[200px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full justify-between h-9 text-xs font-normal",
                    formData.assigned_user_ids.length === 0 && "text-muted-foreground"
                  )}
                >
                  <div className="flex gap-1 overflow-hidden truncate">
                    {formData.assigned_user_ids.length > 0 ? (
                      formData.assigned_user_ids.map((id) => {
                        const user = availableUsers.find((u) => u.id === id);
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="h-5 px-1 text-[10px] font-normal shrink-0"
                          >
                            {user?.name.split(' ')[0]}
                          </Badge>
                        );
                      })
                    ) : (
                      "Məsul şəxs seç..."
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="İstifadəçi axtar..." className="h-8 text-xs" />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>Nəticə tapılmadı.</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map((user) => {
                        const isSelected = formData.assigned_user_ids.includes(user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              const newSelection = isSelected
                                ? formData.assigned_user_ids.filter((id) => id !== user.id)
                                : [...formData.assigned_user_ids, user.id];
                              handleFieldChange('assigned_user_ids', newSelection);
                            }}
                            className="text-xs"
                          >
                            <div className={cn(
                              "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary",
                              isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{user.name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </td>


          {/* deadline_progress sütunu: tarix + saat inputları birlikdə */}
          <td className="px-2 py-3 w-[150px]">
            <div className="flex flex-col gap-1">
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleFieldChange('deadline', e.target.value)}
                className="h-8 text-xs"
                disabled={isSubmitting}
                placeholder="Son tarix"
              />
              <Input
                type="time"
                value={formData.deadline_time}
                onChange={(e) => handleFieldChange('deadline_time', e.target.value)}
                className="h-8 text-xs"
                disabled={isSubmitting}
              />
            </div>
          </td>

          {/* İrəliləyiş (Yeni tapşırıqda 0%) */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm w-[140px]">
            0%
          </td>

          {/* 12. Əməliyyatlar (Saxla və Ləğv et) */}
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
