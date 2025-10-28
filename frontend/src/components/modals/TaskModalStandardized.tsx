import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal, BaseModalProps } from '@/components/common/BaseModal';
import { FormField } from '@/components/forms/FormBuilder';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
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

const targetRoleOptions = [
  { label: 'Super Admin', value: 'superadmin' },
  { label: 'Regional Admin', value: 'regionadmin' },
  { label: 'Regional Operator', value: 'regionoperator' },
  { label: 'Sektor Admin', value: 'sektoradmin' },
  { label: 'Sektor Operator', value: 'sektoroperator' },
  { label: 'Məktəb Admini', value: 'schooladmin' },
  { label: 'Məktəb Müdir Müavini', value: 'deputy' },
  { label: 'Müəllim', value: 'teacher' },
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
    queryFn: () => userService.getUsers({ per_page: 200 }),
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

  const responsibleUserOptions = React.useMemo(() => {
    if (!usersResponse?.data) return [];

    const rawUsers = Array.isArray(usersResponse.data) ? usersResponse.data : [];
    const normalizeRole = (value?: string | null) => (value || '').trim().toLowerCase();
    const allowedRoles = new Set(['regionadmin', 'regionoperator', 'sektoradmin']);

    const filtered = rawUsers.filter((user: any) => {
      const directRole = normalizeRole(typeof user.role === 'string' ? user.role : user.role?.name);
      if (allowedRoles.has(directRole)) {
        return true;
      }

      if (Array.isArray(user.roles)) {
        return user.roles.some((role: any) => allowedRoles.has(normalizeRole(role?.name || role?.slug || role?.role)));
      }

      if (Array.isArray(user.role_names)) {
        return user.role_names.some((role: string) => allowedRoles.has(normalizeRole(role)));
      }

      return false;
    });

    return filtered.map((user: any) => {
      const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'İsimsiz İstifadəçi';

      const primaryRole = (() => {
        if (typeof user.role === 'string') return user.role;
        if (user.role?.name) return user.role.name;
        if (Array.isArray(user.roles) && user.roles.length > 0) {
          return user.roles[0].name || user.roles[0].slug || user.roles[0].role;
        }
        if (Array.isArray(user.role_names) && user.role_names.length > 0) {
          return user.role_names[0];
        }
        return null;
      })();

      return {
        label: `${displayName}${primaryRole ? ` (${primaryRole})` : ''}`,
        value: user.id.toString(),
        meta: {
          email: user.email,
          role: primaryRole,
        },
      };
    });
  }, [usersResponse]);

  React.useEffect(() => {
    if (open) {
      console.log('[TaskModal] Users response', usersResponse);
      console.log('[TaskModal] Məsul şəxs seçimləri yükləndi', responsibleUserOptions);
    }
  }, [open, responsibleUserOptions, usersResponse]);

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

  React.useEffect(() => {
    if (open) {
      logger.debug('[TaskModal] Modal açıldı', {
        isEditMode,
        taskId: task?.id,
      });
    }
  }, [open, isEditMode, task?.id]);

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
    createField('assigned_user_ids', 'Məsul şəxslər', 'multiselect', {
      required: true,
      options: responsibleUserOptions,
      placeholder: usersLoading ? 'İstifadəçilər yüklənir...' : 'Məsul şəxsləri seçin',
      disabled: usersLoading,
      description: 'Region admin, region operator və ya sektor adminlərindən birini və ya bir neçəsini seçə bilərsiniz.',
      className: 'md:col-span-2'
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
      required: true,
      options: availableInstitutions,
      placeholder: institutionsLoading ? 'Yüklənir...' : 'Müəssisə seçin',
      disabled: institutionsLoading,
      validation: commonValidations.required,
      helperText: 'Tapşırığın əsas ünvanlandığı müəssisəni seçin.'
    }),
    createField('target_institutions', 'Əlavə hədəf müəssisələr', 'multiselect', {
      options: availableInstitutions,
      placeholder: institutionsLoading ? 'Yüklənir...' : 'Digər müəssisələri seçin (vacib deyil)',
      disabled: institutionsLoading,
      description: 'Əlavə müəssisələr seçsəniz tapşırıq həmin qurumlara da yönəldiləcək.',
      className: 'md:col-span-2'
    }),
    createField('target_departments', 'Hədəf departamentlər', 'multiselect', {
      options: availableDepartments,
      placeholder: departmentsLoading ? 'Yüklənir...' : 'Departament seçin (isteğe bağlı)',
      disabled: departmentsLoading,
      className: 'md:col-span-2'
    }),
    createField('target_roles', 'Hədəf rollar', 'multiselect', {
      options: targetRoleOptions,
      placeholder: 'Tapşırığın icrasında iştirak edəcək rolları seçin (vacib deyil)',
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
    createField('assignment_notes', 'Tapşırıq üzrə qeyd', 'textarea', {
      placeholder: 'Tapşırığı təhkim olunanlara xüsusi tapşırıq və ya qeydlər əlavə edin...',
      rows: 3,
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
        assigned_to: '',
        requires_approval: false,
        target_departments: [],
        target_institutions: [],
        target_roles: [],
        target_institution_id: '',
        deadline: undefined,
        notes: '',
        assigned_institution_id: undefined,
        assignment_notes: '',
        assigned_user_ids: [],
      };
    }

    const assignedInstitutionString = task.assigned_institution_id != null
      ? String(task.assigned_institution_id)
      : '';
    const primaryTargetInstitution = task.target_institution_id != null
      ? String(task.target_institution_id)
      : assignedInstitutionString;

    return {
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority || 'medium',
      deadline: task.deadline ? task.deadline.split('T')[0] : undefined,
      assigned_to: task.assigned_to != null ? task.assigned_to.toString() : '',
      assigned_institution_id: assignedInstitutionString,
      target_institution_id: primaryTargetInstitution,
      target_institutions: task.target_institutions || [],
      target_departments: task.target_departments || [],
      target_roles: task.target_roles || [],
      target_scope: task.target_scope,
      notes: task.notes || '',
      requires_approval: task.requires_approval || false,
      assignment_notes: task.assignment_notes || '',
      assigned_user_ids: Array.isArray(task.assignments)
        ? task.assignments
            .map((assignment) => assignment.assigned_user_id)
            .filter((value): value is number => typeof value === 'number')
            .map((value) => value.toString())
        : [],
    };
  }, [task]);

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      // Transform data for API
      const assignedToNumeric = parseInt(data.assigned_to, 10);
      const assignedInstitutionNumeric = data.assigned_institution_id
        ? parseInt(data.assigned_institution_id, 10)
        : null;

      const transformedData = {
        ...data,
        assigned_to: Number.isNaN(assignedToNumeric) ? null : assignedToNumeric,
        assigned_institution_id: assignedInstitutionNumeric,
        target_institution_id: assignedInstitutionNumeric,
        target_departments: Array.isArray(data.target_departments) 
          ? data.target_departments.map((id: string) => parseInt(id, 10))
          : [],
        target_institutions: Array.isArray(data.target_institutions)
          ? data.target_institutions.map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id)
          : [],
        target_roles: Array.isArray(data.target_roles) ? data.target_roles : [],
        assigned_user_ids: Array.isArray(data.assigned_user_ids)
          ? data.assigned_user_ids.map((id: string | number) => parseInt(id as string, 10)).filter(id => !Number.isNaN(id))
          : [],
        assignment_notes: data.assignment_notes ?? undefined,
        requires_approval: Boolean(data.requires_approval),
      };

      if (Array.isArray(transformedData.assigned_user_ids) && transformedData.assigned_user_ids.length > 0) {
        transformedData.assigned_to = transformedData.assigned_user_ids[0];
      }

      console.log('[TaskModal] Tapşırıq forması göndərilir', {
        mode: isEditMode ? 'update' : 'create',
        payload: transformedData,
      });

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
