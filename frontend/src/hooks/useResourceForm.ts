import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { institutionService } from "@/services/institutions";
import { resourceService } from "@/services/resources";
import { Resource, CreateResourceData } from "@/types/resources";

// Form validation schemas
const linkSchema = z.object({
  type: z.literal('link'),
  title: z.string().min(1, 'Başlıq tələb olunur'),
  description: z.string().optional(),
  url: z.string().url('Düzgün URL daxil edin'),
  link_type: z.enum(['external', 'video', 'form', 'document'], {
    required_error: 'Link növü seçilməlidir'
  }),
  share_scope: z.enum(['public', 'regional', 'sectoral', 'institutional']).optional(),
  target_institutions: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  target_departments: z.array(z.number()).optional(),
  is_featured: z.boolean().optional(),
  expires_at: z.string().optional(),
});

// Base document schema - shared fields between create and edit
const documentBaseSchema = {
  type: z.literal('document'),
  title: z.string().min(1, 'Başlıq tələb olunur'),
  description: z.string().optional(),
  category: z.enum(['administrative', 'financial', 'educational', 'hr', 'technical', 'other']).optional(),
  target_institutions: z.array(z.number()).optional(),
  target_departments: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  is_downloadable: z.boolean().optional(),
  is_viewable_online: z.boolean().optional(),
  expires_at: z.string().optional(),
};

const documentCreateSchema = z.object({
  ...documentBaseSchema,
  file: z.instanceof(File, { message: 'Fayl seçilməlidir' }),
});

const documentEditSchema = z.object({
  ...documentBaseSchema,
  file: z.instanceof(File).optional(),
});

const getResourceSchema = (mode: 'create' | 'edit') => {
  if (mode === 'edit') {
    return z.union([linkSchema, documentEditSchema]);
  }
  return z.union([linkSchema, documentCreateSchema]);
};
type ResourceFormData = z.infer<ReturnType<typeof getResourceSchema>>;

interface UseResourceFormProps {
  isOpen: boolean;
  activeTab: 'links' | 'documents';
  resource?: Resource | null;
  mode: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
  onClose: () => void;
}

export function useResourceForm({
  isOpen,
  activeTab,
  resource,
  mode,
  onResourceSaved,
  onClose,
}: UseResourceFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Determine if user should see superior institutions (for targeting)
  // SchoolAdmin → sector + region, SektorAdmin → region, RegionAdmin → none (top level)
  const shouldUseSuperiorInstitutions = currentUser &&
    ['schooladmin', 'sektoradmin', 'regionadmin', 'regionoperator'].includes(currentUser.role);

  // Form setup with dynamic schema based on active tab and mode
  const form = useForm<ResourceFormData>({
    resolver: zodResolver(getResourceSchema(mode)),
    defaultValues: {
      type: activeTab === 'links' ? 'link' : 'document',
      title: '',
      description: '',
      target_institutions: [],
      target_roles: [],
      target_departments: [],
      // Link defaults
      url: '',
      link_type: 'external',
      share_scope: 'institutional',
      is_featured: false,
      expires_at: '',
      // Document defaults
      category: 'educational',
      is_downloadable: true,
      is_viewable_online: true,
    },
  });

  // Update resolver when mode changes
  useEffect(() => {
    form.resolver = zodResolver(getResourceSchema(mode));
  }, [mode, form]);

  // Load institutions for targeting
  // SchoolAdmin & SektorAdmin see only superior institutions
  // Others see all accessible institutions
  const { data: institutions } = useQuery({
    queryKey: shouldUseSuperiorInstitutions ? ['superior-institutions'] : ['institutions'],
    queryFn: () => shouldUseSuperiorInstitutions
      ? resourceService.getSuperiorInstitutions()
      : institutionService.getAll({ per_page: 1000 }).then(res => res.data),
    enabled: isOpen,
  });

  // Available institutions and filtered list
  const availableInstitutions = useMemo(() => {
    return institutions || [];
  }, [institutions]);

  const filteredInstitutions = useMemo(() => {
    if (!availableInstitutions.length) return [];
    return availableInstitutions.filter((institution: any) =>
      institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
    );
  }, [availableInstitutions, institutionSearch]);

  // Selection handlers
  const selectInstitutionsByLevel = (level: number) => {
    const levelIds = availableInstitutions
      .filter((inst: any) => inst.level === level)
      .map((inst: any) => inst.id);
    form.setValue('target_institutions', levelIds);
  };

  const selectInstitutionsByType = (filterFn: (inst: any) => boolean) => {
    const typeIds = availableInstitutions
      .filter(filterFn)
      .map((inst: any) => inst.id);
    form.setValue('target_institutions', typeIds);
  };

  // Update form when active tab changes
  useEffect(() => {
    const newType = activeTab === 'links' ? 'link' : 'document';
    if (newType !== form.getValues('type')) {
      form.setValue('type', newType as any);
    }
  }, [activeTab, form]);

  // Populate form when editing
  useEffect(() => {
    if (resource && mode === 'edit' && isOpen) {
      form.reset({
        type: resource.type,
        title: resource.title,
        description: resource.description || '',
        target_institutions: resource.target_institutions || [],
        target_roles: resource.target_roles || [],
        target_departments: resource.target_departments || [],
        // Link fields
        ...(resource.type === 'link' && {
          url: resource.url || '',
          link_type: resource.link_type || 'external',
          share_scope: resource.share_scope || 'institutional',
          is_featured: resource.is_featured || false,
          expires_at: resource.expires_at || '',
        }),
        // Document fields
        ...(resource.type === 'document' && {
          category: resource.category || '',
          is_downloadable: resource.is_downloadable ?? true,
          is_viewable_online: resource.is_viewable_online ?? true,
        }),
      });
    }
  }, [resource, mode, isOpen, form]);

  // Set default target institutions for schooladmin/sektoradmin when creating new resource
  useEffect(() => {
    if (isOpen && mode === 'create' && !resource && shouldUseSuperiorInstitutions && availableInstitutions.length > 0) {
      // Default select all superior institutions (region + sector for schooladmin, region for sektoradmin)
      const superiorIds = availableInstitutions.map((inst: any) => inst.id);
      form.setValue('target_institutions', superiorIds);
      console.log('🎯 Default target institutions set:', superiorIds);
    }
  }, [isOpen, mode, resource, shouldUseSuperiorInstitutions, availableInstitutions, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedFile(null);
      setInstitutionSearch('');
    }
  }, [isOpen, form]);

  const handleSubmit = async (data: ResourceFormData) => {
    try {
      // Auto-select superior institutions if SchoolAdmin/SektorAdmin and none selected
      if (shouldUseSuperiorInstitutions &&
          (!data.target_institutions || data.target_institutions.length === 0) &&
          availableInstitutions.length > 0) {
        const superiorIds = availableInstitutions.map((inst: any) => inst.id);
        data.target_institutions = superiorIds;
        console.log('🎯 Auto-selected superior institutions on submit:', superiorIds);
      }

      console.log('🔥 handleSubmit called with data:', data);
      console.log('📁 selectedFile:', selectedFile);
      console.log('📋 activeTab:', activeTab);
      console.log('🔧 mode:', mode);
      console.log('📄 editing resource:', resource);

      // Ensure file is included for document uploads (create mode) or when new file selected (edit mode)
      const resourceData: CreateResourceData = {
        ...data,
        ...(activeTab === 'documents' && (mode === 'create' || selectedFile) ? { file: selectedFile } : {}),
      };

      console.log('🎯 Final resourceData:', {
        ...resourceData,
        file: resourceData.file ? `File(${resourceData.file.name}, ${resourceData.file.size} bytes)` : 'No file'
      });

      let savedResource: Resource;

      if (mode === 'create') {
        savedResource = await resourceService.create(resourceData);
        toast({
          title: 'Uğurla yaradıldı',
          description: `${activeTab === 'links' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yaradıldı`,
        });
      } else if (resource) {
        savedResource = await resourceService.update(resource.id, resource.type, resourceData);
        toast({
          title: 'Uğurla yeniləndi',
          description: `${activeTab === 'links' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yeniləndi`,
        });
      } else {
        throw new Error('Resource not found for editing');
      }

      onResourceSaved?.(savedResource);
      onClose();

    } catch (error: any) {
      console.error('Resource save error:', error);
      toast({
        title: 'Xəta baş verdi',
        description: error.message || `${activeTab === 'links' ? 'Link' : 'Sənəd'} saxlanılarkən xəta`,
        variant: 'destructive',
      });
    }
  };

  return {
    form,
    selectedFile,
    setSelectedFile,
    institutionSearch,
    setInstitutionSearch,
    availableInstitutions,
    filteredInstitutions,
    selectInstitutionsByLevel,
    selectInstitutionsByType,
    handleSubmit,
  };
}