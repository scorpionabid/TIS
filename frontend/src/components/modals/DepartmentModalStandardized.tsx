import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal, BaseModalProps } from '@/components/common/BaseModal';
import { FormField } from '@/components/forms/FormBuilder';
import { Department, CreateDepartmentData, departmentService } from '@/services/departments';
import { institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { departmentFields } from '@/components/modals/configurations/modalFieldConfig';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
import { Building, Users, MapPin } from 'lucide-react';

interface DepartmentModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  department?: Department | null;
  onSave: (data: CreateDepartmentData) => Promise<void>;
}

export const DepartmentModalStandardized: React.FC<DepartmentModalStandardizedProps> = ({
  open,
  onClose,
  department,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Load institutions for department type dropdown
  const { data: institutionsResponse, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions-for-departments'],
    queryFn: () => institutionService.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Load department types for selected institution
  const { data: typesResponse } = useQuery({
    queryKey: ['department-types'],
    queryFn: () => departmentService.getTypes(),
    staleTime: 1000 * 60 * 10,
    enabled: open,
  });

  // Load parent departments
  const { data: parentDepartmentsResponse } = useQuery({
    queryKey: ['parent-departments'],
    queryFn: () => departmentService.getAll(),
    enabled: open,
  });

  const institutions = institutionsResponse?.data || institutionsResponse?.institutions || [];
  const departmentTypes = typesResponse?.data || [];
  const parentDepartments = parentDepartmentsResponse?.departments || [];

  // Dynamic fields with loaded data
  const dynamicFields = useMemo(() => [
    departmentFields.name,
    departmentFields.shortName,
    
    // Institution selection field
    createField('institution_id', 'Müəssisə', 'select', {
      required: true,
      placeholder: 'Müəssisəni seçin',
      validation: commonValidations.required,
      options: institutionsLoading ? [] : institutions.map((inst: any) => ({
        label: `${inst.name} (${inst.type})`,
        value: inst.id.toString()
      })),
    }),
    
    // Department type selection
    createField('department_type', 'Departament növü', 'select', {
      required: true,
      placeholder: 'Departament növünü seçin',
      validation: commonValidations.required,
      options: departmentTypes.map((type: any) => ({
        label: type.display_name || type.name,
        value: type.name
      })),
    }),
    
    // Parent department selection (optional)
    createField('parent_department_id', 'Ana departament', 'select', {
      placeholder: 'Ana departamenti seçin (ixtiyari)',
      options: parentDepartments.map((parent: any) => ({
        label: `${parent.name} (${parent.institution?.name || 'Unknown'})`,
        value: parent.id.toString()
      })),
    }),
    
    departmentFields.description,
    departmentFields.capacity,
    departmentFields.budgetAllocation,
    departmentFields.functionalScope,
    departmentFields.isActive,
  ], [institutions, institutionsLoading, departmentTypes, parentDepartments]);

  // Default values for form
  const defaultValues = useMemo(() => {
    if (!department) {
      return {
        name: '',
        short_name: '',
        department_type: '',
        institution_id: '',
        parent_department_id: '',
        description: '',
        capacity: undefined,
        budget_allocation: undefined,
        functional_scope: '',
        is_active: true,
      };
    }

    return {
      name: department.name || '',
      short_name: department.short_name || '',
      department_type: department.department_type || '',
      institution_id: department.institution_id?.toString() || '',
      parent_department_id: department.parent_department_id?.toString() || '',
      description: department.description || '',
      capacity: department.capacity || undefined,
      budget_allocation: department.budget_allocation || undefined,
      functional_scope: department.functional_scope || '',
      is_active: department.is_active !== false,
    };
  }, [department]);

  // Form submission handler
  const handleSubmit = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const submitData: CreateDepartmentData = {
        name: data.name,
        short_name: data.short_name || '',
        department_type: data.department_type,
        institution_id: parseInt(data.institution_id),
        parent_department_id: data.parent_department_id ? parseInt(data.parent_department_id) : undefined,
        description: data.description || '',
        capacity: data.capacity ? parseInt(data.capacity) : undefined,
        budget_allocation: data.budget_allocation ? parseFloat(data.budget_allocation) : undefined,
        functional_scope: data.functional_scope || '',
        is_active: data.is_active !== false,
      };

      await onSave(submitData);
      
      toast({
        title: 'Uğur!',
        description: department ? 'Departament uğurla yeniləndi' : 'Departament uğurla əlavə edildi',
      });
    } catch (error) {
      console.error('Department save failed:', error);
      toast({
        title: 'Xəta',
        description: 'Departament yadda saxlanıla bilmədi',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onSave, department, toast]);

  // Modal tabs configuration
  const tabs = [
    {
      id: 'basic',
      label: 'Əsas məlumatlar',
      icon: <Building className="h-4 w-4" />,
      fields: dynamicFields.slice(0, 5), // name, shortName, institution, type, parent
      description: 'Departamentin əsas təşkilati məlumatları',
      color: 'blue' as const,
    },
    {
      id: 'details',
      label: 'Təfərrüatlar',
      icon: <Users className="h-4 w-4" />,
      fields: dynamicFields.slice(5), // description, capacity, budget, scope, active
      description: 'Departamentin ətraflı məlumatları və tənzimləmələri',
      color: 'green' as const,
    },
  ];

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={department ? 'Departamenti redaktə et' : 'Yeni departament əlavə et'}
      description="Departament məlumatlarını daxil edin. Bütün məlumatlar institutsiya ilə əlaqələndirilir."
      loading={loading || institutionsLoading}
      loadingText={institutionsLoading ? 'Müəssisələr yüklənir...' : undefined}
      entityBadge={department ? 'Redaktə' : 'Yeni'}
      entity={department}
      tabs={tabs}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitLabel={department ? 'Yenilə' : 'Əlavə et'}
      maxWidth="4xl"
      columns={2}
    />
  );
};
