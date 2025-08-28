import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal, BaseModalProps } from '@/components/common/BaseModal';
import { FormField, createField, commonValidations } from '@/components/forms/FormBuilder';
import { Task, CreateTaskData } from '@/services/tasks';
import { userService } from '@/services/users';
import { institutionService } from '@/services/institutions';
import { departmentService } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Building, 
  FileText, 
  AlertCircle, 
  Clock, 
  CheckCircle 
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface TaskModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  onSave: (data: CreateTaskData) => Promise<void>;
}

const categoryOptions = [
  { label: 'Hesabat Hazırlanması', value: 'report' },
  { label: 'Təmir və İnfrastruktur', value: 'maintenance' },
  { label: 'Tədbir Təşkili', value: 'event' },
  { label: 'Audit və Nəzarət', value: 'audit' },
  { label: 'Təlimatlar və Metodiki', value: 'instruction' },
  { label: 'Digər', value: 'other' },
];

const priorityOptions = [
  { label: 'Aşağı', value: 'low' },
  { label: 'Orta', value: 'medium' },
  { label: 'Yüksək', value: 'high' },
  { label: 'Təcili', value: 'urgent' },
];

const targetScopeOptions = [
  { label: 'Xüsusi Seçim', value: 'specific' },
  { label: 'Regional', value: 'regional' },
  { label: 'Sektor', value: 'sector' },
  { label: 'Müəssisə', value: 'institutional' },
  { label: 'Bütün Sistem', value: 'all' },
];

export const TaskModalStandardized: React.FC<TaskModalStandardizedProps> = ({
  open,
  onClose,
  task,
  onSave,
}) => {
  const { toast } = useToast();
  const isEditMode = !!task;

  // Load available users for assignment
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => userService.getUsers(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Load available institutions
  const { data: institutionsResponse, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions-for-tasks'],
    queryFn: () => institutionService.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Load available departments
  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments-for-tasks'],
    queryFn: () => departmentService.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const availableUsers = React.useMemo(() => {
    if (!usersResponse?.data) return [];
    return usersResponse.data.map((user: any) => ({
      label: `${user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'İsimsiz İstifadəçi'} (${user.email})`,
      value: user.id.toString()
    }));
  }, [usersResponse]);

  const availableInstitutions = React.useMemo(() => {
    let institutions = [];
    if (Array.isArray(institutionsResponse)) {
      institutions = institutionsResponse;
    } else if (institutionsResponse?.data) {
      institutions = Array.isArray(institutionsResponse.data) 
        ? institutionsResponse.data 
        : [];
    }
    
    return institutions.map((institution: any) => ({
      label: institution.name,
      value: institution.id.toString()
    }));
  }, [institutionsResponse]);

  const availableDepartments = React.useMemo(() => {
    let departments = [];
    if (departmentsResponse?.data && Array.isArray(departmentsResponse.data)) {
      departments = departmentsResponse.data;
    } else if (Array.isArray(departmentsResponse)) {
      departments = departmentsResponse;
    }
    
    return departments.map((department: any) => ({
      label: `${department.name}${department.institution ? ` (${department.institution.name})` : ''}`,
      value: department.id.toString()
    }));
  }, [departmentsResponse]);

  const isLoading = usersLoading || institutionsLoading || departmentsLoading;

  // Basic task information fields
  const basicFields: FormField[] = [
    createField('title', 'Tapşırıq başlığı', 'text', {
      required: true,
      placeholder: 'Tapşırıq başlığını daxil edin',
      validation: commonValidations.required,
      className: 'md:col-span-2'
    }),
    createField('category', 'Kateqoriya', 'select', {
      required: true,
      options: categoryOptions,
      placeholder: 'Kateqoriya seçin',
      validation: commonValidations.required,
    }),
    createField('priority', 'Prioritet', 'select', {
      required: true,
      options: priorityOptions,
      placeholder: 'Prioritet seçin',
      validation: commonValidations.required,
    }),
    createField('deadline', 'Son tarix', 'date', {
      placeholder: 'Tarix seçin',
    }),
    createField('assigned_to', 'Məsul şəxs', 'select', {
      required: true,
      options: availableUsers,
      placeholder: usersLoading ? 'İstifadəçilər yüklənir...' : 'İstifadəçi seçin',
      disabled: usersLoading,
      validation: commonValidations.required,
    }),
    createField('description', 'Tapşırıq təsviri', 'textarea', {
      required: true,
      placeholder: 'Tapşırığın ətraflı təsvirini daxil edin...',
      rows: 4,
      validation: commonValidations.required,
      className: 'md:col-span-2'
    }),
  ];

  // Target and assignment fields
  const targetFields: FormField[] = [
    createField('target_scope', 'Hədəf sahəsi', 'select', {
      required: true,
      options: targetScopeOptions,
      placeholder: 'Hədəf sahəsini seçin',
      validation: commonValidations.required,
    }),
    createField('assigned_institution_id', 'Hədəf müəssisə', 'select', {
      options: availableInstitutions,
      placeholder: institutionsLoading ? 'Yüklənir...' : 'Müəssisə seçin (isteğe bağlı)',
      disabled: institutionsLoading,
    }),
    createField('target_departments', 'Hədəf departamentlər', 'multiselect', {
      options: availableDepartments,
      placeholder: departmentsLoading ? 'Yüklənir...' : 'Departament seçin (isteğe bağlı)',
      disabled: departmentsLoading,
      className: 'md:col-span-2'
    }),
  ];

  // Additional information fields
  const additionalFields: FormField[] = [
    createField('notes', 'Əlavə qeydlər', 'textarea', {
      placeholder: 'Əlavə qeydlər və ya təlimatlar...',
      rows: 3,
      className: 'md:col-span-2'
    }),
    createField('requires_approval', 'Təsdiq tələb olunur', 'checkbox', {
      placeholder: 'Bu tapşırıq tamamlandıqdan sonra təsdiq tələb olunur',
      defaultValue: false,
      className: 'md:col-span-2'
    }),
  ];

  const modalTabs = [
    {
      id: 'basic',
      label: 'Əsas məlumatlar',
      icon: <Users className="h-4 w-4" />,
      fields: basicFields,
      description: 'Tapşırığın əsas məlumatlarını və məsul şəxsi təyin edin',
      color: 'blue' as const,
    },
    {
      id: 'target',
      label: 'Hədəf və Təyinat',
      icon: <Building className="h-4 w-4" />,
      fields: targetFields,
      description: 'Tapşırığın hədəf sahəsini və müəssisələrini müəyyən edin',
      color: 'green' as const,
    },
    {
      id: 'additional',
      label: 'Əlavə məlumatlar',
      icon: <FileText className="h-4 w-4" />,
      fields: additionalFields,
      description: 'Əlavə qeydlər və tapşırıq parametrləri',
      color: 'purple' as const,
    },
  ];

  const prepareDefaultValues = React.useCallback(() => {
    if (!task) {
      return {
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        target_scope: 'specific',
        assigned_to: '0',
        requires_approval: false,
        target_departments: [],
        target_institutions: [],
        deadline: undefined,
        notes: '',
        assigned_institution_id: undefined,
      };
    }

    return {
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority || 'medium',
      deadline: task.deadline ? task.deadline.split('T')[0] : undefined,
      assigned_to: task.assigned_to?.toString() || '0',
      assigned_institution_id: task.assigned_institution_id?.toString() || '',
      target_institutions: task.target_institutions || [],
      target_departments: task.target_departments || [],
      target_scope: task.target_scope,
      notes: task.notes || '',
      requires_approval: task.requires_approval || false,
    };
  }, [task]);

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      // Transform data for API
      const transformedData = {
        ...data,
        assigned_to: parseInt(data.assigned_to) || 0,
        assigned_institution_id: data.assigned_institution_id 
          ? parseInt(data.assigned_institution_id) 
          : undefined,
        target_departments: Array.isArray(data.target_departments) 
          ? data.target_departments.map((id: string) => parseInt(id))
          : [],
      };

      logger.info('TaskModal submitting data', {
        component: 'TaskModalStandardized',
        action: 'submit',
        data: { isEditMode, taskId: task?.id }
      });

      await onSave(transformedData);
      
      toast({
        title: "Uğurlu",
        description: isEditMode 
          ? "Tapşırıq məlumatları yeniləndi" 
          : "Yeni tapşırıq yaradıldı",
      });
    } catch (error) {
      logger.error('TaskModal submit failed', error, {
        component: 'TaskModalStandardized',
        action: 'submit'
      });
      
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent modal from closing
    }
  }, [onSave, isEditMode, task?.id, toast]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? `${task?.title} tapşırığını redaktə et` : 'Yeni tapşırıq yarat'}
      description="Tapşırıq məlumatlarını daxil edin və həyata keçirmək üçün məsul şəxs təyin edin"
      loading={isLoading}
      loadingText="Seçimlər yüklənir..."
      entityBadge={task?.category ? categoryOptions.find(c => c.value === task.category)?.label : undefined}
      entity={task}
      tabs={modalTabs}
      defaultValues={prepareDefaultValues()}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Yenilə' : 'Yarat'}
      maxWidth="4xl"
      columns={2}
    />
  );
};