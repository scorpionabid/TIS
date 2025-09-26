import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Link,
  FileText,
  Upload,
  Building2,
  Users,
  Search,
  Info,
  X,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { institutionService } from "@/services/institutions";
import { departmentService } from "@/services/departments";
import { resourceService } from "@/services/resources";
import { CreateResourceData, Resource } from "@/types/resources";

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

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType?: 'link' | 'document';
  resource?: Resource | null;
  mode?: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
}

export function ResourceModal({
  isOpen,
  onClose,
  resourceType = 'link',
  resource = null,
  mode = 'create',
  onResourceSaved,
}: ResourceModalProps) {
  const { toast } = useToast();
  const [currentResourceType, setCurrentResourceType] = useState<'link' | 'document'>(resourceType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [targetInstitutions, setTargetInstitutions] = useState<number[]>([]);

  // Form setup with dynamic schema
  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      type: currentResourceType,
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
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    enabled: isOpen,
  });

  // Filter institutions based on search
  const filteredInstitutions = React.useMemo(() => {
    if (!institutions?.data?.data) return [];
    return institutions.data.data.filter((institution: any) =>
      institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
    );
  }, [institutions, institutionSearch]);

  // Update form when resource type changes
  useEffect(() => {
    if (currentResourceType !== form.getValues('type')) {
      form.reset({
        type: currentResourceType,
        title: form.getValues('title'),
        description: form.getValues('description'),
        target_institutions: targetInstitutions,
        target_roles: form.getValues('target_roles'),
      });
    }
  }, [currentResourceType, form, targetInstitutions]);

  // Populate form when editing
  useEffect(() => {
    if (resource && mode === 'edit' && isOpen) {
      setCurrentResourceType(resource.type);
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
      setTargetInstitutions(resource.target_institutions || []);
    }
  }, [resource, mode, isOpen, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedFile(null);
      setTargetInstitutions([]);
      setInstitutionSearch('');
    }
  }, [isOpen, form]);

  const handleSubmit = async (data: ResourceFormData) => {
    try {
      const resourceData: CreateResourceData = {
        ...data,
        target_institutions: targetInstitutions,
        ...(currentResourceType === 'document' && selectedFile && { file: selectedFile }),
      };

      let savedResource: Resource;

      if (mode === 'create') {
        savedResource = await resourceService.create(resourceData);
        toast({
          title: 'Uğurla yaradıldı',
          description: `${currentResourceType === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yaradıldı`,
        });
      } else if (resource) {
        savedResource = await resourceService.update(resource.id, resource.type, resourceData);
        toast({
          title: 'Uğurla yeniləndi',
          description: `${currentResourceType === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə yeniləndi`,
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
        description: error.message || `${currentResourceType === 'link' ? 'Link' : 'Sənəd'} saxlanılarkən xəta`,
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Set file as form value for validation
      form.setValue('file', file as any);
    }
  };

  const handleInstitutionToggle = (institutionId: number) => {
    const newTargets = targetInstitutions.includes(institutionId)
      ? targetInstitutions.filter(id => id !== institutionId)
      : [...targetInstitutions, institutionId];

    setTargetInstitutions(newTargets);
    form.setValue('target_institutions', newTargets);
  };

  const removeTargetInstitution = (institutionId: number) => {
    const newTargets = targetInstitutions.filter(id => id !== institutionId);
    setTargetInstitutions(newTargets);
    form.setValue('target_institutions', newTargets);
  };

  const getSelectedInstitutions = () => {
    return filteredInstitutions.filter((inst: any) => targetInstitutions.includes(inst.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentResourceType === 'link' ? (
              <Link className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            {mode === 'create' ? 'Yeni Resurs Yaradın' : 'Resurs Redaktə Et'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Resource Type Selection (only for create mode) */}
          {mode === 'create' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Resurs Tipi</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-colors ${
                    currentResourceType === 'link'
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentResourceType('link')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Link className="h-6 w-6" />
                      <div>
                        <div className="font-medium">Link</div>
                        <div className="text-sm text-muted-foreground">Xarici linkləri paylaşın</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    currentResourceType === 'document'
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentResourceType('document')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6" />
                      <div>
                        <div className="font-medium">Sənəd</div>
                        <div className="text-sm text-muted-foreground">Fayl yükləyin</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Əsas Məlumatlar</TabsTrigger>
              <TabsTrigger value="targeting">Müəssisələr</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="title">Başlıq *</Label>
                  <Input
                    {...form.register('title')}
                    placeholder="Resurs başlığını daxil edin"
                    className="mt-1"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    {...form.register('description')}
                    placeholder="Resurs haqqında qısa məlumat"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Link specific fields */}
                {currentResourceType === 'link' && (
                  <>
                    <div>
                      <Label htmlFor="url">Link URL *</Label>
                      <Input
                        {...form.register('url')}
                        type="url"
                        placeholder="https://example.com"
                        className="mt-1"
                      />
                      {form.formState.errors.url && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Link Tipi</Label>
                        <Select
                          value={form.watch('link_type')}
                          onValueChange={(value) => form.setValue('link_type', value as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="external">Xarici Link</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="form">Form</SelectItem>
                            <SelectItem value="document">Sənəd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Paylaşım Əhatəsi</Label>
                        <Select
                          value={form.watch('share_scope')}
                          onValueChange={(value) => form.setValue('share_scope', value as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Hamı</SelectItem>
                            <SelectItem value="regional">Regional</SelectItem>
                            <SelectItem value="sectoral">Sektor</SelectItem>
                            <SelectItem value="institutional">Müəssisə</SelectItem>
                            <SelectItem value="specific_users">Xüsusi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={form.watch('is_featured')}
                        onCheckedChange={(checked) => form.setValue('is_featured', checked as boolean)}
                      />
                      <Label>Xüsusi Link (Featured)</Label>
                    </div>
                  </>
                )}

                {/* Document specific fields */}
                {currentResourceType === 'document' && (
                  <>
                    <div>
                      <Label>Fayl Seçin *</Label>
                      <div className="mt-1">
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                        />
                        {selectedFile && (
                          <div className="mt-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{selectedFile.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFile(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {form.formState.errors.file && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.file.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Kateqoriya</Label>
                        <Select
                          value={form.watch('category')}
                          onValueChange={(value) => form.setValue('category', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Kateqoriya seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrative">İdarəetmə sənədləri</SelectItem>
                            <SelectItem value="financial">Maliyyə sənədləri</SelectItem>
                            <SelectItem value="educational">Təhsil materialları</SelectItem>
                            <SelectItem value="hr">İnsan resursları</SelectItem>
                            <SelectItem value="technical">Texniki sənədlər</SelectItem>
                            <SelectItem value="other">Digər</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Giriş Səviyyəsi</Label>
                        <Select
                          value={form.watch('access_level')}
                          onValueChange={(value) => form.setValue('access_level', value as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Hamı görə bilər</SelectItem>
                            <SelectItem value="regional">Region daxilində</SelectItem>
                            <SelectItem value="sectoral">Sektor daxilində</SelectItem>
                            <SelectItem value="institution">Müəssisə daxilində</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch('is_downloadable')}
                          onCheckedChange={(checked) => form.setValue('is_downloadable', checked as boolean)}
                        />
                        <Label>Yükləmə icazəsi</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch('is_viewable_online')}
                          onCheckedChange={(checked) => form.setValue('is_viewable_online', checked as boolean)}
                        />
                        <Label>Onlayn baxış icazəsi</Label>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
                  <Input
                    {...form.register('expires_at')}
                    type="datetime-local"
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Institution Targeting Tab */}
            <TabsContent value="targeting" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Müəssisələr</h3>
                  <p className="text-sm text-muted-foreground">
                    Bu resursu hansı müəssisələrə göndərmək istəyirsiniz?
                  </p>
                </div>

                {/* Selected Institutions Display */}
                {targetInstitutions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Seçilmiş Müəssisələr:</Label>
                    <div className="flex flex-wrap gap-2">
                      {getSelectedInstitutions().map((institution: any) => (
                        <Badge key={institution.id} variant="secondary" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {institution.name}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeTargetInstitution(institution.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Institution Search and Selection */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Müəssisə axtarın..."
                      value={institutionSearch}
                      onChange={(e) => setInstitutionSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {institutionsLoading ? (
                      <div className="text-sm text-muted-foreground">Yüklənir...</div>
                    ) : filteredInstitutions.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Müəssisə tapılmadı</div>
                    ) : (
                      filteredInstitutions.map((institution: any) => (
                        <div key={institution.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={targetInstitutions.includes(institution.id)}
                            onCheckedChange={() => handleInstitutionToggle(institution.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{institution.name}</div>
                            <div className="text-xs text-muted-foreground">{institution.type}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <strong>Qeyd:</strong> Seçilmiş müəssisələrin müəllim və adminlərinə notification göndəriləcək.
                    {targetInstitutions.length > 0 && (
                      <div className="mt-1">
                        <strong>{targetInstitutions.length}</strong> müəssisə seçilib.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Yüklənir...' : mode === 'create' ? 'Yaradın' : 'Yenilə'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}