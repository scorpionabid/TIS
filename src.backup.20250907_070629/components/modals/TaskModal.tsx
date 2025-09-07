import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Loader2, AlertCircle, CheckCircle, Clock, Users, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Task, CreateTaskData } from '@/services/tasks';
import { userService } from '@/services/users';
import { institutionService } from '@/services/institutions';
import { departmentService } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ApiResponse, PaginatedResponse } from '@/services/api';

interface TaskModalProps {
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
  { label: 'Aşağı', value: 'low', color: 'text-green-600' },
  { label: 'Orta', value: 'medium', color: 'text-yellow-600' },
  { label: 'Yüksək', value: 'high', color: 'text-orange-600' },
  { label: 'Təcili', value: 'urgent', color: 'text-red-600' },
];

const targetScopeOptions = [
  { label: 'Xüsusi Seçim', value: 'specific' },
  { label: 'Regional', value: 'regional' },
  { label: 'Sektor', value: 'sector' },
  { label: 'Müəssisə', value: 'institutional' },
  { label: 'Bütün Sistem', value: 'all' },
];


export function TaskModal({ open, onClose, task, onSave }: TaskModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    target_scope: 'specific',
    assigned_to: 0,
    requires_approval: false,
    target_departments: [],
    target_institutions: [],
    // Add other required fields with default values
    deadline: undefined,
    notes: '',
    assigned_institution_id: undefined,
  });

  const isEditMode = !!task;

  // Load available users for assignment
  const { data: usersResponse } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => userService.getUsers(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Institution type definition
  interface Institution {
    id: number;
    name: string;
    // Add other institution properties as needed
  }

  // Load available institutions
  const { 
    data: institutionsResponse, 
    error: institutionsError,
    isLoading: isLoadingInstitutions 
  } = useQuery({
    queryKey: ['institutions-for-tasks'],
    queryFn: () => institutionService.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Handle institutions loading error
  useEffect(() => {
    if (institutionsError) {
      console.error('Error loading institutions:', institutionsError);
      toast({
        title: "Xəta",
        description: "Müəssisələr yüklənərkən xəta baş verdi",
        variant: "destructive",
      });
    }
  }, [institutionsError]);

  // Department type definition
  interface Department {
    id: number;
    name: string;
    institution?: {
      id: number;
      name: string;
    };
  }

  // Load available departments with error handling
  const { 
    data: departmentsResponse, 
    error: departmentsError,
    isLoading: isLoadingDepartments 
  } = useQuery<PaginatedResponse<Department>>({
    queryKey: ['departments-for-tasks'],
    queryFn: () => departmentService.getAll() as Promise<PaginatedResponse<Department>>,
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  // Handle departments loading error
  useEffect(() => {
    if (departmentsError) {
      console.error('Error loading departments:', departmentsError);
      toast({
        title: "Xəta",
        description: "Departamentlər yüklənərkən xəta baş verdi",
        variant: "destructive",
      });
    }
  }, [departmentsError]);

  const availableUsers = usersResponse?.data || [];
  
  // Safely get institutions with proper type checking
  const availableInstitutions: Institution[] = React.useMemo(() => {
    if (!institutionsResponse) return [];
    
    // Handle different possible response structures
    if (Array.isArray(institutionsResponse)) {
      return institutionsResponse;
    } else if (institutionsResponse?.data) {
      return Array.isArray(institutionsResponse.data) 
        ? institutionsResponse.data 
        : [];
    } else if (institutionsResponse?.institutions) {
      return Array.isArray(institutionsResponse.institutions)
        ? institutionsResponse.institutions
        : [];
    }
    return [];
  }, [institutionsResponse]);
  
  // Safely get departments with proper type checking
  const availableDepartments: Department[] = React.useMemo(() => {
    if (!departmentsResponse) return [];
    
    // Handle paginated response structure
    if ('data' in departmentsResponse && Array.isArray(departmentsResponse.data)) {
      return departmentsResponse.data;
    }
    
    // Handle direct array response
    if (Array.isArray(departmentsResponse)) {
      return departmentsResponse;
    }
    
    // Fallback to empty array if structure is unexpected
    console.warn('Unexpected departments response structure:', departmentsResponse);
    return [];
  }, [departmentsResponse]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        category: task.category,
        priority: task.priority || 'medium', // Fix TypeScript error by providing a default value
        deadline: task.deadline ? task.deadline.split('T')[0] : undefined, // Format for date input
        assigned_to: task.assigned_to,
        assigned_institution_id: task.assigned_institution_id,
        target_institutions: task.target_institutions || [],
        target_departments: task.target_departments || [],
        target_scope: task.target_scope,
        notes: task.notes || '',
        requires_approval: task.requires_approval || false,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        target_scope: 'specific',
        assigned_to: 0,
        requires_approval: false,
        target_departments: [],
        target_institutions: [],
        deadline: undefined,
        notes: '',
        assigned_institution_id: undefined,
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Xəta",
        description: "Tapşırıq başlığı daxil edilməlidir",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Xəta", 
        description: "Tapşırıq təsviri daxil edilməlidir",
        variant: "destructive",
      });
      return;
    }

    if (!formData.priority.trim()) {
      toast({
        title: "Xəta",
        description: "Prioritet seçilməlidir",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assigned_to) {
      toast({
        title: "Xəta",
        description: "Məsul şəxs seçilməlidir",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await onSave(formData);
      toast({
        title: "Uğurlu",
        description: isEditMode 
          ? "Tapşırıq məlumatları yeniləndi" 
          : "Yeni tapşırıq yaradıldı",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTaskData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditMode ? `${task?.title} tapşırığını redaktə et` : 'Yeni tapşırıq yarat'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Title */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Tapşırıq başlığı *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Tapşırıq başlığını daxil edin"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Kateqoriya *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kateqoriya seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet *</Label>
              <Select
                value={formData.priority || ""}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioritet seçin" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Son tarix</Label>
              <div className="relative">
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline || ''}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Məsul şəxs *</Label>
              <Select
                value={formData.assigned_to && formData.assigned_to > 0 ? formData.assigned_to.toString() : ""}
                onValueChange={(value) => handleInputChange('assigned_to', value ? parseInt(value) : 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="İstifadəçi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {`${user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'İsimsiz İstifadəçi'} (${user.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Tapşırıq təsviri *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tapşırığın ətraflı təsvirini daxil edin..."
              rows={4}
              required
            />
          </div>

          {/* Target Scope and Institution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_scope">Hədəf sahəsi *</Label>
              <Select
                value={formData.target_scope}
                onValueChange={(value) => handleInputChange('target_scope', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hədəf sahəsini seçin" />
                </SelectTrigger>
                <SelectContent>
                  {targetScopeOptions.map((scope) => (
                    <SelectItem key={scope.value} value={scope.value}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_institution_id">Hədəf müəssisə</Label>
              <Select
                value={formData.assigned_institution_id?.toString() || ''}
                onValueChange={(value) => handleInputChange('assigned_institution_id', value ? parseInt(value) : undefined)}
                disabled={isLoadingInstitutions}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingInstitutions ? "Yüklənir..." : "Müəssisə seçin (isteğe bağlı)"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingInstitutions ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Yüklənir...
                    </div>
                  ) : availableInstitutions.length > 0 ? (
                    availableInstitutions.map((institution) => (
                      <SelectItem key={institution.id} value={institution.id.toString()}>
                        {institution.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Mövcud müəssisə yoxdur
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Departments Section */}
          <div className="space-y-2">
            <Label htmlFor="target_departments">Hədəf departamentlər</Label>
            <Select
              value={formData.target_departments?.[0]?.toString() || ''}
              onValueChange={(value) => handleInputChange('target_departments', value ? [parseInt(value)] : [])}
              disabled={isLoadingDepartments}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDepartments ? "Yüklənir..." : "Departament seçin (isteğe bağlı)"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDepartments ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Yüklənir...
                  </div>
                ) : availableDepartments.length > 0 ? (
                  availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {`${department.name}${department.institution ? ` (${department.institution.name})` : ''}`}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Mövcud departament yoxdur
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Notes and Approval */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Əlavə qeydlər</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Əlavə qeydlər və ya təlimatlar..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_approval"
                checked={formData.requires_approval}
                onCheckedChange={(checked) => handleInputChange('requires_approval', checked)}
              />
              <Label
                htmlFor="requires_approval"
                className="text-sm font-normal cursor-pointer"
              >
                Bu tapşırıq tamamlandıqdan sonra təsdiq tələb olunur
              </Label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Yenilə' : 'Yarat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}