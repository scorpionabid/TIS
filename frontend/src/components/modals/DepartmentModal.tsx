import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Department, CreateDepartmentData, DepartmentType } from '@/services/departments';
import { departmentService } from '@/services/departments';
import { institutionService } from '@/services/institutions';
import { useQuery } from '@tanstack/react-query';

interface DepartmentModalProps {
  open: boolean;
  onClose: () => void;
  department?: Department | null;
  onSave: (data: CreateDepartmentData) => Promise<void>;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  open,
  onClose,
  department,
  onSave,
}) => {
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: '',
    short_name: '',
    department_type: '',
    institution_id: 0,
    parent_department_id: undefined,
    description: '',
    capacity: undefined,
    budget_allocation: undefined,
    functional_scope: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load institutions
  const { data: institutionsResponse, isLoading: institutionsLoading, error: institutionsError } = useQuery({
    queryKey: ['institutions-for-departments'],
    queryFn: () => institutionService.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open, // Only load when modal is open
  });

  // Load department types for selected institution
  const { data: typesResponse } = useQuery({
    queryKey: ['department-types', formData.institution_id],
    queryFn: () => {
      if (formData.institution_id > 0) {
        return departmentService.getTypesForInstitution(formData.institution_id);
      }
      // Fallback to all types if no institution selected
      return departmentService.getTypes();
    },
    staleTime: 1000 * 60 * 10,
    enabled: open, // Only load when modal is open
  });

  // Load parent departments when institution is selected
  const { data: parentDepartmentsResponse } = useQuery({
    queryKey: ['parent-departments', formData.institution_id],
    queryFn: () => departmentService.getByInstitution(formData.institution_id, { parent_id: null }),
    enabled: open && formData.institution_id > 0,
  });

  const institutions = useMemo(
    () => institutionsResponse?.data || institutionsResponse?.institutions || [],
    [institutionsResponse]
  );
  const departmentTypes = useMemo(
    () => typesResponse?.data || [],
    [typesResponse]
  );
  const parentDepartments = useMemo(
    () => parentDepartmentsResponse?.data || [],
    [parentDepartmentsResponse]
  );
  
  // Minimal debug logging (can be removed in production)
  React.useEffect(() => {
    if (open && institutions.length > 0) {
      console.log('🏢 Loaded institutions:', institutions.length, institutions.map(i => i.name));
    }
  }, [open, institutions]);

  React.useEffect(() => {
    if (typesResponse) {
      console.log('📝 Department types response:', typesResponse);
      console.log('📝 Types data:', typesResponse?.data);
      console.log('📝 Is array?', Array.isArray(typesResponse?.data));
      console.log('📝 Institution ID:', formData.institution_id);
      console.log('📝 Final departmentTypes:', departmentTypes);
    }
  }, [typesResponse, formData.institution_id, departmentTypes]);

  useEffect(() => {
    if (open && department) {
      // Edit mode - populate with existing data
      setFormData({
        name: department.name,
        short_name: department.short_name || '',
        department_type: department.department_type,
        institution_id: department.institution_id,
        parent_department_id: department.parent_department_id,
        description: department.description || '',
        capacity: department.capacity,
        budget_allocation: department.budget_allocation,
        functional_scope: department.functional_scope || '',
        is_active: department.is_active,
      });
    } else if (open && !department) {
      // Create mode - reset to defaults
      setFormData({
        name: '',
        short_name: '',
        department_type: '',
        institution_id: 0,
        parent_department_id: undefined,
        description: '',
        capacity: undefined,
        budget_allocation: undefined,
        functional_scope: '',
        is_active: true,
      });
    }
    
    setErrors({});
  }, [department, open]);

  const handleInputChange = (field: keyof CreateDepartmentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear parent department and department type when institution changes
    if (field === 'institution_id') {
      setFormData(prev => ({ ...prev, parent_department_id: undefined, department_type: '' }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ad sahəsi tələb olunur';
    }

    if (!formData.department_type) {
      newErrors.department_type = 'Departament növü seçilməlidir';
    }

    if (!formData.institution_id || formData.institution_id <= 0) {
      newErrors.institution_id = 'Müəssisə seçilməlidir';
    }

    if (formData.capacity && formData.capacity < 0) {
      newErrors.capacity = 'Tutum müsbət rəqəm olmalıdır';
    }

    if (formData.budget_allocation && formData.budget_allocation < 0) {
      newErrors.budget_allocation = 'Büdcə müsbət rəqəm olmalıdır';
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
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Department save failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {department ? 'Departamenti redaktə et' : 'Yeni departament əlavə et'}
          </DialogTitle>
          <DialogDescription>
            Departament məlumatlarını daxil edin. Bütün məlumatlar institutsiya ilə əlaqələndirilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Ad *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Departamentin adı"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="short_name">Qısa Ad</Label>
              <Input
                id="short_name"
                value={formData.short_name}
                onChange={(e) => handleInputChange('short_name', e.target.value)}
                placeholder="Qısa ad və ya abbreviasiya"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="institution_id">Müəssisə *</Label>
            <Select 
              value={formData.institution_id.toString()} 
              onValueChange={(value) => handleInputChange('institution_id', parseInt(value))}
            >
              <SelectTrigger className={errors.institution_id ? 'border-destructive' : ''}>
                <SelectValue placeholder="Müəssisəni seçin" />
              </SelectTrigger>
              <SelectContent>
                {institutionsLoading ? (
                  <SelectItem value="loading" disabled>
                    Müəssisələr yüklənir...
                  </SelectItem>
                ) : institutions.length > 0 ? (
                  institutions.map((institution) => {
                    const displayText = `${institution.name} (${institution.type})`;
                    return (
                      <SelectItem key={institution.id} value={institution.id.toString()}>
                        {displayText}
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-institutions" disabled>
                    {institutionsError ? 'Müəssisələr yüklənə bilmədi' : 'Müəssisə tapılmadı'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.institution_id && (
              <p className="text-sm text-destructive mt-1">{errors.institution_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department_type">Departament Növü *</Label>
              <Select 
                value={formData.department_type} 
                onValueChange={(value) => handleInputChange('department_type', value)}
              >
                <SelectTrigger className={errors.department_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Növü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(departmentTypes) ? departmentTypes.map((type) => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label}
                    </SelectItem>
                  )) : (
                    <SelectItem value="loading" disabled>
                      Departament növləri yüklənir...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.department_type && (
                <p className="text-sm text-destructive mt-1">{errors.department_type}</p>
              )}
            </div>

            <div>
              <Label htmlFor="parent_department_id">Ana Departament</Label>
              <Select 
                value={formData.parent_department_id?.toString() || ''} 
                onValueChange={(value) => {
                  if (value && !isNaN(parseInt(value))) {
                    handleInputChange('parent_department_id', parseInt(value));
                  } else {
                    handleInputChange('parent_department_id', undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ana departament seçin (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Ana departament yoxdur</SelectItem>
                  {parentDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name} ({dept.department_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Açıqlama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Departamentin funksiyası və məsuliyyətləri"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Tutum</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity || ''}
                onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="İşçi sayı limiti"
                className={errors.capacity ? 'border-destructive' : ''}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive mt-1">{errors.capacity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="budget_allocation">Büdcə (₼)</Label>
              <Input
                id="budget_allocation"
                type="number"
                step="0.01"
                value={formData.budget_allocation || ''}
                onChange={(e) => handleInputChange('budget_allocation', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Büdcə ayrılması"
                className={errors.budget_allocation ? 'border-destructive' : ''}
              />
              {errors.budget_allocation && (
                <p className="text-sm text-destructive mt-1">{errors.budget_allocation}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="functional_scope">Funksional Sahə</Label>
            <Textarea
              id="functional_scope"
              value={formData.functional_scope}
              onChange={(e) => handleInputChange('functional_scope', e.target.value)}
              placeholder="Departamentin fəaliyyət sahəsi"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', !!checked)}
            />
            <Label htmlFor="is_active">Aktiv</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saxlanır...' : (department ? 'Yenilə' : 'Əlavə et')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
