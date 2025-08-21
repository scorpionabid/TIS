import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, BookOpen } from 'lucide-react';
import { Subject, CreateSubjectData, UpdateSubjectData } from '@/services/subjects';

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
  onSave: (data: CreateSubjectData | UpdateSubjectData) => Promise<void>;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  grade_levels: number[];
  weekly_hours: number;
  category: 'core' | 'science' | 'humanities' | 'language' | 'arts' | 'physical' | 'technical' | 'elective';
  is_active: boolean;
  metadata: Record<string, any>;
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
];

const GRADE_LEVELS = Array.from({ length: 11 }, (_, i) => i + 1);

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
    grade_levels: [],
    weekly_hours: 1,
    category: 'core',
    is_active: true,
    metadata: {},
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or subject changes
  useEffect(() => {
    if (open) {
      if (subject) {
        setFormData({
          name: subject.name,
          code: subject.code,
          description: subject.description || '',
          grade_levels: subject.grade_levels || [],
          weekly_hours: subject.weekly_hours,
          category: subject.category,
          is_active: subject.is_active,
          metadata: subject.metadata || {},
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          grade_levels: [],
          weekly_hours: 1,
          category: 'core',
          is_active: true,
          metadata: {},
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

    if (formData.weekly_hours < 1 || formData.weekly_hours > 10) {
      newErrors.weekly_hours = 'Həftəlik saat sayı 1-10 arası olmalıdır';
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
      const submitData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        grade_levels: formData.grade_levels,
        weekly_hours: formData.weekly_hours,
        category: formData.category,
        metadata: formData.metadata,
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

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGradeLevelToggle = (grade: number) => {
    const newGradeLevels = formData.grade_levels.includes(grade)
      ? formData.grade_levels.filter(g => g !== grade)
      : [...formData.grade_levels, grade].sort((a, b) => a - b);
    
    handleInputChange('grade_levels', newGradeLevels);
  };

  const selectAllGrades = () => {
    handleInputChange('grade_levels', [...GRADE_LEVELS]);
  };

  const clearAllGrades = () => {
    handleInputChange('grade_levels', []);
  };

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
              ? 'Mövcud fənnin məlumatlarını dəyişdirin.' 
              : 'Yeni fənn əlavə etmək üçün məlumatları daxil edin.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Əsas Məlumatlar</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Fənn Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="məs. Riyaziyyat"
                  className={errors.name ? 'border-red-500' : ''}
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
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="məs. MAT"
                  maxLength={10}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-red-600">{errors.code}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Təsvir</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Fənn haqqında qısa məlumat..."
                rows={3}
              />
            </div>
          </div>

          {/* Category and Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Kateqoriya və Saat</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kateqoriya *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kateqoriya seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_hours">Həftəlik Saat Sayı *</Label>
                <Input
                  id="weekly_hours"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.weekly_hours}
                  onChange={(e) => handleInputChange('weekly_hours', parseInt(e.target.value) || 1)}
                  className={errors.weekly_hours ? 'border-red-500' : ''}
                />
                {errors.weekly_hours && (
                  <p className="text-sm text-red-600">{errors.weekly_hours}</p>
                )}
              </div>
            </div>
          </div>

          {/* Grade Levels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Sinif Səviyyələri *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllGrades}
                >
                  Hamısını Seç
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllGrades}
                >
                  Hamısını Sil
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {GRADE_LEVELS.map(grade => (
                <div key={grade} className="flex items-center space-x-2">
                  <Checkbox
                    id={`grade-${grade}`}
                    checked={formData.grade_levels.includes(grade)}
                    onCheckedChange={() => handleGradeLevelToggle(grade)}
                  />
                  <Label 
                    htmlFor={`grade-${grade}`} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {grade}. sinif
                  </Label>
                </div>
              ))}
            </div>

            {formData.grade_levels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.grade_levels.map(grade => (
                  <Badge key={grade} variant="secondary">
                    {grade}. sinif
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => handleGradeLevelToggle(grade)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {errors.grade_levels && (
              <p className="text-sm text-red-600">{errors.grade_levels}</p>
            )}
          </div>

          {/* Status (only for editing) */}
          {subject && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Fənn aktiv statusdadır</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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