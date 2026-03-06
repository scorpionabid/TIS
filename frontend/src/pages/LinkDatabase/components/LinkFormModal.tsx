import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Target,
  Building2,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { linkFormSchema, type LinkFormValues } from '../schemas/linkForm.schema';
import type {
  LinkShare,
  Department,
  SectorOption,
  CreateLinkData,
} from '../types/linkDatabase.types';

interface LinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLinkData) => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
  selectedLink?: LinkShare | null;
  departments: Department[];
  sectors: SectorOption[];
  currentTabLabel: string;
  // Pre-selection context
  isOnSectorsTab: boolean;
  currentDepartmentId: number | null;
  selectedSector: number | null;
}

export function LinkFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  mode,
  selectedLink,
  departments,
  sectors,
  currentTabLabel,
  isOnSectorsTab,
  currentDepartmentId,
  selectedSector,
}: LinkFormModalProps) {
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: getDefaultValues(mode, selectedLink, isOnSectorsTab, currentDepartmentId, selectedSector),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  // Reset form when modal opens/closes or selectedLink changes
  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(mode, selectedLink, isOnSectorsTab, currentDepartmentId, selectedSector));
    }
  }, [isOpen, mode, selectedLink, isOnSectorsTab, currentDepartmentId, selectedSector, reset]);

  // Auto-update target departments when current department changes (in create mode)
  useEffect(() => {
    if (isOpen && mode === 'create' && !selectedLink && !isOnSectorsTab && currentDepartmentId) {
      const currentTargetDepts = form.getValues('target_departments') || [];
      
      // If current department is not already selected, add it
      if (!currentTargetDepts.includes(currentDepartmentId)) {
        // Replace with only current department for better UX
        form.setValue('target_departments', [currentDepartmentId]);
      } else if (currentTargetDepts.length > 1) {
        // If multiple are selected, keep only current department
        form.setValue('target_departments', [currentDepartmentId]);
      }
    }
  }, [currentDepartmentId, isOpen, mode, selectedLink, isOnSectorsTab, form]);

  const watchedUrl = watch('url');
  const isUrlValid = (() => {
    try {
      if (!watchedUrl) return false;
      new URL(watchedUrl);
      return true;
    } catch {
      return false;
    }
  })();

  const onFormSubmit = handleSubmit((data) => {
    onSubmit({
      title: data.title,
      url: data.url,
      description: data.description || '',
      link_type: data.link_type,
      is_featured: data.is_featured,
      expires_at: data.expires_at || undefined,
      target_departments: data.target_departments,
      target_institutions: data.target_institutions,
    });
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Yeni Link Yarat' : 'Linki Redaktə Et'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `${currentTabLabel} üçün yeni link əlavə edin`
              : 'Link məlumatlarını yeniləyin'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Başlıq *</Label>
            <Input
              id="title"
              placeholder="Link başlığı"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                {...register('url')}
                className={isUrlValid ? 'pr-8' : ''}
              />
              {isUrlValid && (
                <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              placeholder="Link haqqında qısa məlumat"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Link Type */}
          <div className="space-y-2">
            <Label>Link Növü</Label>
            <Controller
              control={control}
              name="link_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">Xarici Link</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="document">Sənəd</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Expires At */}
          <div className="space-y-2">
            <Label htmlFor="expires_at">Bitmə tarixi (isteğe bağlı)</Label>
            <Input
              id="expires_at"
              type="date"
              {...register('expires_at')}
            />
          </div>

          {/* Featured */}
          <Controller
            control={control}
            name="is_featured"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_featured"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="is_featured" className="cursor-pointer">
                  Seçilmiş link kimi göstər
                </Label>
              </div>
            )}
          />

          <Separator className="my-4" />

          {/* Target Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Hədəf Seçimi</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Bu linkin hansı departament və sektorlara göstəriləcəyini seçin
            </p>

            {/* Department Selection */}
            {departments.length > 0 && (
              <Controller
                control={control}
                name="target_departments"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Departamentlər
                    </Label>
                    <ScrollArea className="h-[120px] border rounded-md p-3">
                      <div className="space-y-2">
                        {departments.map((dept) => (
                          <div key={dept.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`dept-${dept.id}`}
                              checked={(field.value || []).includes(dept.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, dept.id]
                                    : current.filter((id) => id !== dept.id)
                                );
                              }}
                            />
                            <Label htmlFor={`dept-${dept.id}`} className="cursor-pointer text-sm">
                              {dept.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {(field.value?.length || 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {field.value?.length} departament seçildi
                      </p>
                    )}
                  </div>
                )}
              />
            )}

            {/* Sector Selection */}
            {sectors.length > 0 && (
              <Controller
                control={control}
                name="target_institutions"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Sektorlar
                    </Label>
                    <ScrollArea className="h-[120px] border rounded-md p-3">
                      <div className="space-y-2">
                        {sectors.map((sector) => (
                          <div key={sector.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`sector-${sector.id}`}
                              checked={(field.value || []).includes(sector.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, sector.id]
                                    : current.filter((id) => id !== sector.id)
                                );
                              }}
                            />
                            <Label htmlFor={`sector-${sector.id}`} className="cursor-pointer text-sm">
                              {sector.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {(field.value?.length || 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {field.value?.length} sektor seçildi
                      </p>
                    )}
                  </div>
                )}
              />
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4">
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
              {mode === 'create' ? 'Yarat' : 'Yadda Saxla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultValues(
  mode: 'create' | 'edit',
  selectedLink: LinkShare | null | undefined,
  isOnSectorsTab: boolean,
  currentDepartmentId: number | null,
  selectedSector: number | null
): LinkFormValues {
  if (mode === 'edit' && selectedLink) {
    return {
      title: selectedLink.title,
      url: selectedLink.url,
      description: selectedLink.description || '',
      link_type: selectedLink.link_type,
      is_featured: selectedLink.is_featured,
      expires_at: selectedLink.expires_at || '',
      target_departments: selectedLink.target_departments || [],
      target_institutions: selectedLink.target_institutions || [],
    };
  }

  // Create mode: pre-select current department/sector
  const initialDepartments: number[] = [];
  const initialSectors: number[] = [];

  if (isOnSectorsTab && selectedSector) {
    initialSectors.push(selectedSector);
  } else if (currentDepartmentId && !isNaN(currentDepartmentId)) {
    initialDepartments.push(currentDepartmentId);
  }

  return {
    title: '',
    url: '',
    description: '',
    link_type: 'external',
    is_featured: false,
    expires_at: '',
    target_departments: initialDepartments,
    target_institutions: initialSectors,
  };
}
