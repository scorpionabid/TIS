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
  description: z.string().nullable().optional(),
  category: z.enum(['administrative', 'financial', 'educational', 'hr', 'technical', 'other', '']).nullable().optional(),
  target_institutions: z.array(z.number()).optional(),
  target_departments: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  target_users: z.array(z.number()).optional(),
  is_featured: z.boolean().optional(),
  is_downloadable: z.boolean().optional(),
  is_viewable_online: z.boolean().optional(),
  expires_at: z.string().nullable().optional(),
};

const documentCreateSchema = z.object({
  ...documentBaseSchema,
  file: z.instanceof(File, { message: 'Fayl seçilməlidir' }),
});

const documentEditSchema = z.object({
  ...documentBaseSchema,
  file: z.instanceof(File).nullable().optional(),
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
  resourceType: 'link' | 'document';
  resource?: Resource | null;
  mode: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
  onClose: () => void;
}

export function useResourceForm({
  isOpen,
  resourceType,
  resource,
  mode,
  onResourceSaved,
  onClose,
}: UseResourceFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form setup with dynamic schema based on mode
  const resolver = useMemo(() => zodResolver(getResourceSchema(mode)), [mode]);

  const form = useForm<ResourceFormData>({
    resolver,
    defaultValues: {
      type: resourceType === 'link' ? 'link' : 'document',
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

  // Determine if user should see superior institutions (for targeting)
  const shouldUseSuperiorInstitutions = currentUser &&
    ['schooladmin', 'sektoradmin', 'regionadmin', 'regionoperator'].includes(currentUser.role);

  // Load institutions for targeting with optimized pagination
  const [shouldLoadInstitutions, setShouldLoadInstitutions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldLoadInstitutions(true);
    }
  }, [isOpen]);

  const { data: institutions } = useQuery({
    queryKey: ['target-institutions', currentUser?.role, currentUser?.institution_id],
    queryFn: async () => {
      if (currentUser?.role === 'regionadmin' || currentUser?.role === 'sektoradmin') {
        const response = await institutionService.getAll({ per_page: 500 });
        return response.data;
      }
      
      if (shouldUseSuperiorInstitutions) {
        try {
          return await resourceService.getSuperiorInstitutions();
        } catch (e) {
          console.warn('Failed to load superior institutions, falling back to all', e);
        }
      }
      
      const response = await institutionService.getAll({ per_page: 100 });
      return response.data;
    },
    enabled: shouldLoadInstitutions,
    staleTime: 5 * 60 * 1000,
  });

  // Available institutions and filtered list
  const availableInstitutions = useMemo(() => {
    return institutions || [];
  }, [institutions]);

  // Update form when resource type changes
  useEffect(() => {
    const newType = resourceType;
    if (newType !== form.getValues('type')) {
      form.setValue('type', newType as any);
    }
  }, [resourceType, form]);

  // Populate form when editing, reset when closing — single effect to avoid race conditions
  const lastResourceId = React.useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedFile(null);
      lastResourceId.current = null;
      return;
    }

    if (resource && mode === 'edit') {
      if (lastResourceId.current === resource.id) return;
      lastResourceId.current = resource.id;

      form.reset({
        type: resource.type,
        title: resource.title,
        description: resource.description || '',
        target_institutions: (resource.target_institutions || resource.accessible_institutions || []).map(Number).filter(n => !isNaN(n)),
        target_roles: resource.target_roles || resource.allowed_roles || [],
        target_departments: (resource.target_departments || resource.accessible_departments || []).map(Number).filter(n => !isNaN(n)),
        target_users: (resource.target_users || resource.allowed_users || []).map(Number).filter(n => !isNaN(n)),
        is_featured: resource.is_featured || false,
        expires_at: resource.expires_at || '',
        ...(resource.type === 'link' && {
          url: resource.url || '',
          link_type: resource.link_type || 'external',
          share_scope: resource.share_scope || 'institutional',
        }),
        ...(resource.type === 'document' && {
          category: resource.category || '',
          is_downloadable: resource.is_downloadable ?? true,
          is_viewable_online: resource.is_viewable_online ?? true,
        }),
      });
    }
  }, [isOpen, resource?.id, mode, form]);


  const handleSubmit = async (data: ResourceFormData) => {
    try {
      const hasUsers = (data.target_users && data.target_users.length > 0);
      const hasInstitutions = (data.target_institutions && data.target_institutions.length > 0);

      if (hasUsers && !hasInstitutions) {
        data.share_scope = 'specific_users';
      } else if (hasInstitutions && data.share_scope === 'specific_users') {
        data.share_scope = 'institutional';
      }

      if (data.share_scope === 'specific_users') {
        data.target_institutions = [];
      }

      const resourceData: CreateResourceData = {
        ...data,
        ...(resourceType === 'document' && (mode === 'create' || selectedFile) ? { file: selectedFile } : {}),
      };

      let savedResource: Resource;

      if (mode === 'create') {
        savedResource = await resourceService.create(resourceData);
        toast({
          title: 'Uğurla yaradıldı',
          description: `${resourceType === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yaradıldı`,
        });
      } else if (resource) {
        savedResource = await resourceService.update(resource.id, resource.type, resourceData);
        toast({
          title: 'Uğurla yeniləndi',
          description: `${resourceType === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yeniləndi`,
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
        description: error.message || `${resourceType === 'link' ? 'Link' : 'Sənəd'} saxlanılarkən xəta`,
        variant: 'destructive',
      });
    }
  };

  return {
    form,
    selectedFile,
    setSelectedFile,
    availableInstitutions,
    handleSubmit,
  };
}
