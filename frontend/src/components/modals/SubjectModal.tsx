import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen } from 'lucide-react';
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
        });
      } else {
        setFormData({
          name: '',
          code: '',
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
        // Default values for other fields
        description: null,
        grade_levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        weekly_hours: 1,
        category: 'core' as const,
        metadata: {},
        ...(subject ? { is_active: subject.is_active } : {}),
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {subject ? 'Fənni Redaktə Et' : 'Yeni Fənn Əlavə Et'}
          </DialogTitle>
          <DialogDescription>
            {subject
              ? 'Fənn adı və kodunu dəyişdirin.'
              : 'Yeni fənn əlavə etmək üçün ad və kod daxil edin.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fənn Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
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
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="məs. AZD"
                maxLength={10}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maksimum 10 simvol. Avtomatik olaraq böyük hərflərə çevriləcək.
              </p>
            </div>

            {/* Future fields - commented out for easy reactivation */}
            {/*
            <div className="space-y-2">
              <Label htmlFor="description">Təsvir</Label>
              <Textarea id="description" placeholder="Fənn haqqında..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kateqoriya</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Əsas fənlər</SelectItem>
                  <SelectItem value="science">Elm fənləri</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sinif Səviyyələri</Label>
              <div className="grid grid-cols-6 gap-2">
                {[1,2,3,4,5,6,7,8,9,10,11].map(grade => (
                  <Checkbox key={grade} label={`${grade}`} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly_hours">Həftəlik Saat Sayı</Label>
              <Input id="weekly_hours" type="number" min="1" max="10" />
            </div>
            */}
          </div>

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