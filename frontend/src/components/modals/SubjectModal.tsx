import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap, Clock, Tag, AlignLeft, ToggleRight } from 'lucide-react';
import { Subject, CreateSubjectData, UpdateSubjectData } from '@/services/subjects';

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
  onSave: (data: CreateSubjectData | UpdateSubjectData) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Əsas fənlər' },
  { value: 'science', label: 'Elm fənləri' },
  { value: 'humanities', label: 'Humanitar fənlər' },
  { value: 'language', label: 'Dil fənləri' },
  { value: 'arts', label: 'İncəsənət' },
  { value: 'physical', label: 'Fiziki tərbiyə' },
  { value: 'technical', label: 'Texniki fənlər' },
  { value: 'elective', label: 'Seçmə fənlər' },
] as const;

const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

interface FormData {
  name: string;
  code: string;
  description: string;
  category: Subject['category'];
  grade_levels: number[];
  weekly_hours: number;
  is_active: boolean;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  open,
  onClose,
  subject,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    category: 'core',
    grade_levels: ALL_GRADES,
    weekly_hours: 1,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or subject changes
  useEffect(() => {
    if (open) {
      if (subject) {
        setFormData({
          name: subject.name || '',
          code: subject.code || '',
          description: subject.description || '',
          category: subject.category || 'core',
          grade_levels: subject.grade_levels && subject.grade_levels.length > 0
            ? [...subject.grade_levels]
            : ALL_GRADES,
          weekly_hours: subject.weekly_hours || 1,
          is_active: subject.is_active !== undefined ? subject.is_active : true,
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          category: 'core',
          grade_levels: ALL_GRADES,
          weekly_hours: 1,
          is_active: true,
        });
      }
      setErrors({});
    }
  }, [open, subject]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Fənn adı tələb olunur';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Fənn kodu tələb olunur';
    } else if (formData.code.length > 10) {
      newErrors.code = 'Fənn kodu 10 simvoldan çox ola bilməz';
    }

    if (formData.grade_levels.length === 0) {
      newErrors.grade_levels = 'Ən azı bir sinif səviyyəsi seçilməlidir';
    }

    if (!formData.weekly_hours || formData.weekly_hours < 0.5 || formData.weekly_hours > 40) {
      newErrors.weekly_hours = 'Həftəlik saat 0.5-40 arasında olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData: CreateSubjectData | UpdateSubjectData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        grade_levels: formData.grade_levels.sort((a, b) => a - b),
        weekly_hours: formData.weekly_hours,
        metadata: {},
        ...(subject ? { is_active: formData.is_active } : {}),
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving subject:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGradeToggle = (grade: number) => {
    const newLevels = formData.grade_levels.includes(grade)
      ? formData.grade_levels.filter(g => g !== grade)
      : [...formData.grade_levels, grade];
    handleFieldChange('grade_levels', newLevels);
  };

  const handleSelectAllGrades = () => {
    if (formData.grade_levels.length === ALL_GRADES.length) {
      handleFieldChange('grade_levels', []);
    } else {
      handleFieldChange('grade_levels', [...ALL_GRADES]);
    }
  };

  // Grade level groups: Primary (1-4), Middle (5-9), High (10-11)
  const gradeGroups = [
    { label: 'İbtidai (1-4)', grades: [1, 2, 3, 4] },
    { label: 'Orta (5-9)', grades: [5, 6, 7, 8, 9] },
    { label: 'Yuxarı (10-11)', grades: [10, 11] },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {subject ? 'Fənni Redaktə Et' : 'Yeni Fənn Əlavə Et'}
          </DialogTitle>
          <DialogDescription>
            {subject
              ? 'Fənn məlumatlarını yeniləyin.'
              : 'Yeni fənn əlavə etmək üçün məlumatları daxil edin.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Row 1: Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fənn Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="məs. Azərbaycan dili"
                className={errors.name ? 'border-red-500' : ''}
                autoFocus
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Fənn Kodu *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                placeholder="məs. AZD"
                maxLength={10}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code ? (
                <p className="text-sm text-red-600">{errors.code}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Maks. 10 simvol</p>
              )}
            </div>
          </div>

          {/* Row 2: Category + Weekly Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Kateqoriya
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => handleFieldChange('category', val as Subject['category'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kateqoriya seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly_hours" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Həftəlik Saat Sayı
              </Label>
              <Input
                id="weekly_hours"
                type="number"
                min={0.5}
                step={0.5}
                max={40}
                value={formData.weekly_hours}
                onChange={(e) => handleFieldChange('weekly_hours', parseInt(e.target.value) || 1)}
                className={errors.weekly_hours ? 'border-red-500' : ''}
              />
              {errors.weekly_hours && (
                <p className="text-sm text-red-600">{errors.weekly_hours}</p>
              )}
            </div>
          </div>

          {/* Row 3: Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5" />
              Təsvir
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Fənn haqqında qısa məlumat..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Row 4: Grade Levels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Sinif Səviyyələri *
              </Label>
              <div className="flex items-center gap-2">
                {formData.grade_levels.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.grade_levels.length} sinif seçildi
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={handleSelectAllGrades}
                >
                  {formData.grade_levels.length === ALL_GRADES.length ? 'Hamısını sil' : 'Hamısını seç'}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              {gradeGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
                  <div className="flex gap-2 flex-wrap">
                    {group.grades.map((grade) => {
                      const isChecked = formData.grade_levels.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => handleGradeToggle(grade)}
                          className={`
                            w-10 h-10 rounded-lg text-sm font-semibold border-2 transition-all duration-150
                            ${isChecked
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                            }
                          `}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {errors.grade_levels && (
              <p className="text-sm text-red-600">{errors.grade_levels}</p>
            )}
          </div>

          {/* Row 5: is_active toggle (only in edit mode) */}
          {subject && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5 cursor-pointer" htmlFor="is_active">
                  <ToggleRight className="h-3.5 w-3.5" />
                  Fənn Statusu
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_active ? 'Fənn aktiv haldadır' : 'Fənn qeyri-aktiv haldadır'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(val) => handleFieldChange('is_active', val)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saxlanılır...' : subject ? 'Yenilə' : 'Əlavə et'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};