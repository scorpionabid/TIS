import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';
import { AcademicYear, academicYearService } from '@/services/academicYears';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AcademicYearModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  editingYear?: AcademicYear | null;
}

interface FormData {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string;
}

export const AcademicYearModal: React.FC<AcademicYearModalProps> = ({
  open,
  onClose,
  currentUser,
  editingYear,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false,
    notes: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data when editing
  useEffect(() => {
    if (editingYear && open) {
      setFormData({
        name: editingYear.name,
        start_date: editingYear.start_date.split('T')[0], // Extract date part only
        end_date: editingYear.end_date.split('T')[0], // Extract date part only
        is_active: editingYear.is_active,
        notes: (editingYear.metadata as any)?.notes || '',
      });
    } else if (open && !editingYear) {
      // Reset form for new academic year
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      setFormData({
        name: `${currentYear}-${nextYear} Təhsil İli`,
        start_date: `${currentYear}-09-01`,
        end_date: `${nextYear}-06-30`,
        is_active: false,
        notes: '',
      });
    }
    setValidationErrors({});
  }, [editingYear, open]);

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: FormData) => academicYearService.create({
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      is_active: data.is_active,
      metadata: { notes: data.notes }
    }),
    onSuccess: () => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Təhsil ili uğurla yaradıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years-management'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.status === 422) {
        setValidationErrors(error.response.data.errors || {});
      }
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Təhsil ili yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!editingYear) throw new Error('No academic year to update');
      return academicYearService.update(editingYear.id, {
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        metadata: { notes: data.notes }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Təhsil ili məlumatları uğurla yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years-management'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.status === 422) {
        setValidationErrors(error.response.data.errors || {});
      }
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Təhsil ili yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic client-side validation
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Təhsil ili adı mütləqdir';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Başlama tarixi mütləqdir';
    }
    
    if (!formData.end_date) {
      errors.end_date = 'Bitmə tarixi mütləqdir';
    }
    
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      errors.end_date = 'Bitmə tarixi başlama tarixindən sonra olmalıdır';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    if (editingYear) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {editingYear ? 'Təhsil İlini Redaktə Et' : 'Yeni Təhsil İli Yarat'}
          </DialogTitle>
          <DialogDescription>
            {editingYear 
              ? 'Mövcud təhsil ilinin məlumatlarını dəyişdirin və yeniləyin.'
              : 'Yeni təhsil ili yaradın və sistem təqvimini yeniləyin.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Academic Year Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Təhsil İli Adı <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="məs: 2024-2025 Təhsil İli"
              disabled={isLoading}
              className={validationErrors.name ? 'border-red-500' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Başlama Tarixi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                disabled={isLoading}
                className={validationErrors.start_date ? 'border-red-500' : ''}
              />
              {validationErrors.start_date && (
                <p className="text-sm text-red-600">{validationErrors.start_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">
                Bitmə Tarixi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                disabled={isLoading}
                className={validationErrors.end_date ? 'border-red-500' : ''}
              />
              {validationErrors.end_date && (
                <p className="text-sm text-red-600">{validationErrors.end_date}</p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleFieldChange('is_active', !!checked)}
                disabled={isLoading}
              />
              <Label htmlFor="is_active" className="font-medium">
                Bu təhsil ilini aktiv et
              </Label>
            </div>
            {formData.is_active && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Bu təhsil ili aktiv edildikdə, digər bütün təhsil illəri avtomatik olaraq qeyri-aktiv olacaq.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Qeydlər</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Təhsil ili haqqında əlavə məlumat və qeydlər..."
              rows={3}
              disabled={isLoading}
            />
          </div>

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
              {editingYear ? 'Yenilə' : 'Yarat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};