import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { institutionService } from "@/services/institutions";
import { resourceService } from "@/services/resources";
import { Resource, CreateResourceData } from "@/types/resources";

// Form validation schemas
const linkSchema = z.object({
  type: z.literal('link'),
  title: z.string().min(1, 'Başlıq tələb olunur'),
  description: z.string().optional(),
  url: z.string().url('Düzgün URL daxil edin'),
  link_type: z.enum(['external', 'video', 'form', 'document']).optional(),
  share_scope: z.enum(['public', 'regional', 'sectoral', 'institutional', 'specific_users']).optional(),
  is_featured: z.boolean().optional(),
  target_institutions: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  expires_at: z.string().optional(),
});

const documentSchema = z.object({
  type: z.literal('document'),
  title: z.string().min(1, 'Başlıq tələb olunur'),
  description: z.string().optional(),
  file: z.instanceof(File, { message: 'Fayl seçilməlidir' }),
  category: z.string().optional(),
  access_level: z.enum(['public', 'regional', 'sectoral', 'institution']).optional(),
  target_institutions: z.array(z.number()).optional(),
  target_roles: z.array(z.string()).optional(),
  is_downloadable: z.boolean().optional(),
  is_viewable_online: z.boolean().optional(),
  expires_at: z.string().optional(),
});

const resourceSchema = z.union([linkSchema, documentSchema]);
type ResourceFormData = z.infer<typeof resourceSchema>;

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Form setup with dynamic schema based on active tab
  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      type: activeTab === 'links' ? 'link' : 'document',
      title: '',
      description: '',
      target_institutions: [],
      target_roles: [],
      // Link defaults
      url: '',
      link_type: 'external',
      share_scope: 'institutional',
      is_featured: false,
      // Document defaults
      access_level: 'institution',
      is_downloadable: true,
      is_viewable_online: true,
    },
  });

  // Load institutions for targeting
  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll({ per_page: 200 }),
    enabled: isOpen,
  });

  // Available institutions and filtered list
  const availableInstitutions = useMemo(() => {
    return institutions?.data || [];
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
        // Link fields
        ...(resource.type === 'link' && {
          url: resource.url || '',
          link_type: resource.link_type || 'external',
          share_scope: resource.share_scope || 'institutional',
          is_featured: resource.is_featured || false,
        }),
        // Document fields
        ...(resource.type === 'document' && {
          access_level: resource.access_level || 'institution',
          category: resource.category || '',
          is_downloadable: resource.is_downloadable ?? true,
          is_viewable_online: resource.is_viewable_online ?? true,
        }),
        expires_at: resource.expires_at || '',
      });
    }
  }, [resource, mode, isOpen, form]);

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
      const resourceData: CreateResourceData = {
        ...data,
        ...(activeTab === 'documents' && selectedFile && { file: selectedFile }),
      };

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