import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { linkService, CreateLinkData, SharingOptions } from '@/services/links';
import { institutionService, Institution } from '@/services/institutions';
import { departmentService, Department } from '@/services/departments';

interface CreateLinkFormData {
  title: string;
  description: string;
  url: string;
  link_type: 'external' | 'video' | 'form' | 'document';
  share_scope: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  target_institutions: number[];
  target_roles: string[];
  target_departments: number[];
  requires_login: boolean;
  expires_at: string;
  max_clicks: string;
  access_start_time: string;
  access_end_time: string;
  access_days_of_week: number[];
  is_featured: boolean;
}

interface UseLinkCreateProps {
  onLinkCreated?: () => void;
  onClose: () => void;
}

export const useLinkCreate = ({ onLinkCreated, onClose }: UseLinkCreateProps) => {
  const [creating, setCreating] = useState(false);
  
  // Filter states
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');
  const [selectedInstitutionForDepartments, setSelectedInstitutionForDepartments] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateLinkFormData>({
    defaultValues: {
      title: '',
      description: '',
      url: '',
      link_type: 'external',
      share_scope: 'public',
      target_institutions: [],
      target_roles: [],
      target_departments: [],
      requires_login: true,
      expires_at: '',
      max_clicks: '',
      access_start_time: '',
      access_end_time: '',
      access_days_of_week: [],
      is_featured: false
    }
  });

  // Fetch sharing options
  const { data: sharingOptions, isLoading: sharingOptionsLoading } = useQuery({
    queryKey: ['sharing-options'],
    queryFn: () => linkService.getSharingOptions(),
    staleTime: 5 * 60 * 1000
  });

  // Fetch institutions
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll()
  });

  // Fetch departments
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll()
  });

  // Filtered data
  const filteredInstitutions = useMemo(() => {
    if (!institutions?.data?.data) return [];
    
    let filtered = institutions.data.data;
    
    if (institutionSearch.trim()) {
      const searchTerm = institutionSearch.toLowerCase();
      filtered = filtered.filter(institution => 
        institution.name.toLowerCase().includes(searchTerm) ||
        institution.type.toLowerCase().includes(searchTerm) ||
        (institution.short_name && institution.short_name.toLowerCase().includes(searchTerm))
      );
    }
    
    if (institutionTypeFilter !== 'all') {
      filtered = filtered.filter(institution => institution.type === institutionTypeFilter);
    }
    
    return filtered;
  }, [institutions?.data?.data, institutionSearch, institutionTypeFilter]);

  const filteredDepartments = useMemo(() => {
    if (!departments?.data?.data) return [];
    
    let filtered = departments.data.data;
    
    if (selectedInstitutionForDepartments) {
      filtered = filtered.filter(department => 
        department.institution_id === selectedInstitutionForDepartments
      );
    }
    
    if (departmentSearch.trim()) {
      const searchTerm = departmentSearch.toLowerCase();
      filtered = filtered.filter(department => 
        department.name.toLowerCase().includes(searchTerm) ||
        department.department_type.toLowerCase().includes(searchTerm) ||
        (department.short_name && department.short_name.toLowerCase().includes(searchTerm))
      );
    }
    
    return filtered;
  }, [departments?.data?.data, departmentSearch, selectedInstitutionForDepartments]);

  // Available institution types for filter
  const availableInstitutionTypes = useMemo(() => {
    if (!institutions?.data?.data) return [];
    const types = [...new Set(institutions.data.data.map(institution => institution.type))];
    return types.map(type => ({ value: type, label: type }));
  }, [institutions?.data?.data]);

  const validateURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: CreateLinkFormData) => {
    if (!validateURL(data.url)) {
      toast({
        title: 'URL Xətası',
        description: 'Keçərli URL daxil edin (http:// və ya https:// ilə başlayan)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);

      const createData: CreateLinkData = {
        title: data.title,
        description: data.description || undefined,
        url: data.url,
        link_type: data.link_type,
        share_scope: data.share_scope,
        target_institutions: data.target_institutions.length > 0 ? data.target_institutions : undefined,
        target_roles: data.target_roles.length > 0 ? data.target_roles : undefined,
        target_departments: data.target_departments.length > 0 ? data.target_departments : undefined,
        requires_login: data.requires_login,
        expires_at: data.expires_at || undefined,
        max_clicks: data.max_clicks ? parseInt(data.max_clicks) : undefined,
        access_start_time: data.access_start_time || undefined,
        access_end_time: data.access_end_time || undefined,
        access_days_of_week: data.access_days_of_week.length > 0 ? data.access_days_of_week : undefined,
        is_featured: data.is_featured
      };

      await linkService.create(createData);

      toast({
        title: 'Uğurlu',
        description: 'Link uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['links'] });

      resetForm();
      onLinkCreated?.();
      onClose();

    } catch (error: any) {
      console.error('Create error:', error);
      toast({
        title: 'Yaratma Xətası',
        description: error.message || 'Link yaradıla bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Selection handlers
  const handleSelectAllInstitutions = () => {
    const allFilteredIds = filteredInstitutions.map(institution => institution.id);
    form.setValue('target_institutions', allFilteredIds);
  };

  const handleDeselectAllInstitutions = () => {
    form.setValue('target_institutions', []);
  };

  const handleSelectAllDepartments = () => {
    const allFilteredIds = filteredDepartments.map(department => department.id);
    form.setValue('target_departments', allFilteredIds);
  };

  const handleDeselectAllDepartments = () => {
    form.setValue('target_departments', []);
  };

  const handleSelectAllRoles = () => {
    const allRoles = sharingOptions?.available_roles || [];
    form.setValue('target_roles', allRoles);
  };

  const handleDeselectAllRoles = () => {
    form.setValue('target_roles', []);
  };

  const resetForm = () => {
    form.reset();
    setInstitutionSearch('');
    setDepartmentSearch('');
    setInstitutionTypeFilter('all');
    setSelectedInstitutionForDepartments(null);
  };

  const handleClose = () => {
    if (creating) {
      if (confirm('Link yaradılır. İptal etmək istədiyinizdən əminsiniz?')) {
        setCreating(false);
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  return {
    // State
    creating,
    institutionSearch,
    departmentSearch,
    institutionTypeFilter,
    selectedInstitutionForDepartments,
    
    // Data
    sharingOptions,
    institutions,
    departments,
    filteredInstitutions,
    filteredDepartments,
    availableInstitutionTypes,
    sharingOptionsLoading,
    institutionsLoading,
    departmentsLoading,
    
    // Form
    form,
    
    // Actions
    setInstitutionSearch,
    setDepartmentSearch,
    setInstitutionTypeFilter,
    setSelectedInstitutionForDepartments,
    handleSelectAllInstitutions,
    handleDeselectAllInstitutions,
    handleSelectAllDepartments,
    handleDeselectAllDepartments,
    handleSelectAllRoles,
    handleDeselectAllRoles,
    onSubmit,
    handleClose,
    validateURL
  };
};