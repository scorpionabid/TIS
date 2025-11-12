import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  share_scope: z.enum(['public', 'regional', 'sectoral', 'institutional', 'specific_users']).optional(),
  target_institutions: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  target_departments: z.array(z.number()).optional(),
  target_users: z.array(z.number()).optional(),
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
      target_users: [],
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
  }, [mode]);

  // Load institutions for targeting with optimized pagination
  // SchoolAdmin & SektorAdmin see only superior institutions
  // Others see all accessible institutions
  // Reduced per_page from 1000 to 100 for better performance (600+ schools)
  const [shouldLoadInstitutions, setShouldLoadInstitutions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldLoadInstitutions(true);
    }
  }, [isOpen]);

  const { data: institutions } = useQuery({
    queryKey: shouldUseSuperiorInstitutions ? ['superior-institutions'] : ['institutions'],
    queryFn: () => shouldUseSuperiorInstitutions
      ? resourceService.getSuperiorInstitutions()
      : institutionService.getAll({ per_page: 100 }).then(res => res.data),
    enabled: shouldLoadInstitutions,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (institutions rarely change)
  });

  // Available institutions and filtered list
  const availableInstitutions = useMemo(() => {
    return institutions || [];
  }, [institutions]);

  // Update form when active tab changes
  useEffect(() => {
    const newType = activeTab === 'links' ? 'link' : 'document';
    if (newType !== form.getValues('type')) {
      form.setValue('type', newType as any);
    }
  }, [activeTab]);

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
        target_users: resource.target_users || [],
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
  }, [resource, mode, isOpen]);

  // Set default target institutions for schooladmin/sektoradmin when creating new resource
  const hasDefaultedInstitutionsRef = React.useRef(false);

  const maybeDefaultInstitutions = useCallback(() => {
    if (
      hasDefaultedInstitutionsRef.current ||
      !shouldUseSuperiorInstitutions ||
      !availableInstitutions.length
    ) {
      console.log('[useResourceForm] skipping default institutions', {
        hasDefaulted: hasDefaultedInstitutionsRef.current,
        shouldUseSuperiorInstitutions,
        availableCount: availableInstitutions.length,
        timestamp: new Date().toISOString()
      });
      return;
    }
    const superiorIds = availableInstitutions.map((inst: any) => inst.id);
    form.setValue('target_institutions', superiorIds, { shouldDirty: true });
    hasDefaultedInstitutionsRef.current = true;
    console.log('🎯 Default target institutions set lazily:', superiorIds.length);
  }, [shouldUseSuperiorInstitutions, availableInstitutions, form]);

  useEffect(() => {
    console.log('[useResourceForm] isOpen changed', {
      isOpen,
      hasDefaulted: hasDefaultedInstitutionsRef.current,
      currentTargets: form.getValues('target_institutions')?.length || 0,
      timestamp: new Date().toISOString()
    });
    if (isOpen && !hasDefaultedInstitutionsRef.current) {
      console.log('[useResourceForm] attempting to set default institutions');
      maybeDefaultInstitutions();
    }
  }, [isOpen, maybeDefaultInstitutions]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('[useResourceForm] modal closing, resetting form state');
      form.reset();
      setSelectedFile(null);
      hasDefaultedInstitutionsRef.current = false;
    }
  }, [isOpen, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'target_institutions') {
        console.log('[useResourceForm] target_institutions changed', {
          value: value?.target_institutions,
          length: value?.target_institutions?.length || 0,
          timestamp: new Date().toISOString()
        });
      }
    });
    return () => subscription.unsubscribe?.();
  }, [form]);

  const handleSubmit = async (data: ResourceFormData) => {
    try {
      // Auto-select superior institutions if SchoolAdmin/SektorAdmin and none selected
      if (
        shouldUseSuperiorInstitutions &&
        data.share_scope !== 'specific_users' &&
        (!data.target_institutions || data.target_institutions.length === 0) &&
        availableInstitutions.length > 0
      ) {
        const superiorIds = availableInstitutions.map((inst: any) => inst.id);
        data.target_institutions = superiorIds;
        console.log('🎯 Auto-selected superior institutions on submit:', superiorIds);
      }

      if (data.share_scope === 'specific_users') {
        data.target_institutions = [];
        console.log('🚫 Cleared target_institutions because share_scope is specific_users');
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
    maybeDefaultInstitutions,
    selectedFile,
    setSelectedFile,
    availableInstitutions,
    handleSubmit,
  };
}
