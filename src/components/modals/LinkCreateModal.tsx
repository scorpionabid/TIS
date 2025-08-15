import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  X, 
  Loader2,
  ExternalLink,
  Video,
  FileText,
  Link as LinkIcon,
  Clock,
  Calendar,
  Users,
  Building2,
  Search,
  Globe,
  AlertCircle
} from 'lucide-react';
import { linkService, CreateLinkData, SharingOptions } from '@/services/links';
import { institutionService, Institution } from '@/services/institutions';
import { departmentService, Department } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface LinkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

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

export const LinkCreateModal: React.FC<LinkCreateModalProps> = ({
  isOpen,
  onClose,
  onLinkCreated
}) => {
  const [creating, setCreating] = useState(false);
  
  // Filter states
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');
  const [selectedInstitutionForDepartments, setSelectedInstitutionForDepartments] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateLinkFormData>({
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

  const linkTypes = [
    { value: 'external', label: 'Xarici Link', icon: ExternalLink },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'form', label: 'Form', icon: FileText },
    { value: 'document', label: 'Sənəd', icon: FileText }
  ];

  const daysOfWeek = [
    { value: 1, label: 'B.e' },
    { value: 2, label: 'Ç.a' },
    { value: 3, label: 'Ç' },
    { value: 4, label: 'C.a' },
    { value: 5, label: 'C' },
    { value: 6, label: 'Ş' },
    { value: 0, label: 'B' }
  ];

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

      const result = await linkService.create(createData);

      toast({
        title: 'Uğurlu',
        description: 'Link uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['links'] });

      reset();
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

  const handleSelectAllInstitutions = () => {
    const allFilteredIds = filteredInstitutions.map(institution => institution.id);
    setValue('target_institutions', allFilteredIds);
  };

  const handleDeselectAllInstitutions = () => {
    setValue('target_institutions', []);
  };

  const handleSelectAllDepartments = () => {
    const allFilteredIds = filteredDepartments.map(department => department.id);
    setValue('target_departments', allFilteredIds);
  };

  const handleDeselectAllDepartments = () => {
    setValue('target_departments', []);
  };

  const handleSelectAllRoles = () => {
    const allRoles = sharingOptions?.available_roles || [];
    setValue('target_roles', allRoles);
  };

  const handleDeselectAllRoles = () => {
    setValue('target_roles', []);
  };

  const handleClose = () => {
    if (creating) {
      if (confirm('Link yaradılır. İptal etmək istədiyinizdən əminsiniz?')) {
        setCreating(false);
        onClose();
      }
    } else {
      reset();
      setInstitutionSearch('');
      setDepartmentSearch('');
      setInstitutionTypeFilter('all');
      setSelectedInstitutionForDepartments(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5" />
            <span>Yeni Link Əlavə Et</span>
          </DialogTitle>
          <DialogDescription>
            Faydalı linklər yaradın və istifadəçilər ilə paylaşın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Link Başlığı *</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Link başlığı tələb olunur' })}
                  placeholder="Link başlığını daxil edin"
                  disabled={creating}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_type">Link Tipi</Label>
                <Select 
                  value={watch('link_type')} 
                  onValueChange={(value) => setValue('link_type', value as any)}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link tipini seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                {...register('url', { 
                  required: 'URL tələb olunur',
                  validate: (value) => validateURL(value) || 'Keçərli URL daxil edin'
                })}
                placeholder="https://example.com"
                disabled={creating}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıqlama</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Link haqqında qısa açıqlama..."
                rows={3}
                disabled={creating}
              />
            </div>
          </div>

          {/* Sharing Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Paylaşım Ayarları</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="share_scope">Paylaşım Əhatəsi *</Label>
                <Select 
                  value={watch('share_scope')} 
                  onValueChange={(value) => setValue('share_scope', value as any)}
                  disabled={creating || sharingOptionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Paylaşım əhatəsini seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sharingOptions?.available_scopes && Object.entries(sharingOptions.available_scopes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_login"
                    checked={watch('requires_login')}
                    onCheckedChange={(checked) => setValue('requires_login', checked)}
                    disabled={creating}
                  />
                  <Label htmlFor="requires_login" className="text-sm">
                    Giriş tələb olunur
                  </Label>
                </div>
              </div>
            </div>

            {/* Target Selection */}
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Aşağıda linkin hansı müəssisə və departamentlərdə görünəcəyini təyin edə bilərsiniz. Bu ayarlar paylaşım əhatəsindən ayrı olaraq tətbiq olunur.
                </p>
              </div>

              {/* Institution Selection */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>Hədəf Müəssisələr</span>
                  </div>
                  {watch('target_institutions').length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {watch('target_institutions').length} seçilmiş
                    </span>
                  )}
                </Label>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                      <Input
                        placeholder="Müəssisə axtarın..."
                        value={institutionSearch}
                        onChange={(e) => setInstitutionSearch(e.target.value)}
                        className="h-8 pl-7"
                        disabled={creating}
                      />
                    </div>
                    <Select value={institutionTypeFilter} onValueChange={setInstitutionTypeFilter} disabled={creating}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Hamısı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hamısı</SelectItem>
                        {availableInstitutionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInstitutions}
                      disabled={creating || filteredInstitutions.length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını seç ({filteredInstitutions.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllInstitutions}
                      disabled={creating || watch('target_institutions').length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını ləğv et
                    </Button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredInstitutions.map((institution: Institution) => (
                    <div key={institution.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`institution-${institution.id}`}
                        checked={watch('target_institutions').includes(institution.id)}
                        onCheckedChange={(checked) => {
                          const current = watch('target_institutions');
                          if (checked) {
                            setValue('target_institutions', [...current, institution.id]);
                          } else {
                            setValue('target_institutions', current.filter(id => id !== institution.id));
                          }
                        }}
                        disabled={creating}
                      />
                      <Label htmlFor={`institution-${institution.id}`} className="text-sm cursor-pointer">
                        {institution.name}
                        <span className="text-xs text-muted-foreground ml-2">({institution.type})</span>
                      </Label>
                    </div>
                  ))}
                  {institutionsLoading && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Müəssisə məlumatları yüklənir...
                    </p>
                  )}
                  {!institutionsLoading && filteredInstitutions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {institutionSearch || institutionTypeFilter !== 'all' 
                        ? 'Filter şərtlərinə uyğun müəssisə tapılmadı' 
                        : 'Müəssisə tapılmadı'
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Department Selection */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Hədəf Departamentlər</span>
                  </div>
                  {watch('target_departments').length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {watch('target_departments').length} seçilmiş
                    </span>
                  )}
                </Label>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                      <Input
                        placeholder="Departament axtarın..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="h-8 pl-7"
                        disabled={creating}
                      />
                    </div>
                    <Select 
                      value={selectedInstitutionForDepartments?.toString() || 'all'} 
                      onValueChange={(value) => {
                        setSelectedInstitutionForDepartments(value === 'all' ? null : parseInt(value));
                      }}
                      disabled={creating}
                    >
                      <SelectTrigger className="w-48 h-8">
                        <SelectValue placeholder="Müəssisə seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Bütün müəssisələr</SelectItem>
                        {filteredInstitutions.map((institution) => (
                          <SelectItem key={institution.id} value={institution.id.toString()}>
                            {institution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllDepartments}
                      disabled={creating || filteredDepartments.length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını seç ({filteredDepartments.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllDepartments}
                      disabled={creating || watch('target_departments').length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını ləğv et
                    </Button>
                    {selectedInstitutionForDepartments && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInstitutionForDepartments(null)}
                        disabled={creating}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        Filtri sıfırla
                      </Button>
                    )}
                  </div>

                  {selectedInstitutionForDepartments && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
                      🏢 Yalnız "{filteredInstitutions.find(i => i.id === selectedInstitutionForDepartments)?.name}" müəssisəsinin departamentləri göstərilir
                    </div>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredDepartments.map((department: Department) => (
                    <div key={department.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`department-${department.id}`}
                        checked={watch('target_departments').includes(department.id)}
                        onCheckedChange={(checked) => {
                          const current = watch('target_departments');
                          if (checked) {
                            setValue('target_departments', [...current, department.id]);
                          } else {
                            setValue('target_departments', current.filter(id => id !== department.id));
                          }
                        }}
                        disabled={creating}
                      />
                      <Label htmlFor={`department-${department.id}`} className="text-sm cursor-pointer">
                        {department.name}
                        <span className="text-xs text-muted-foreground ml-2">({department.department_type})</span>
                        {department.institution && (
                          <span className="text-xs text-muted-foreground ml-1">- {department.institution.name}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                  {departmentsLoading && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Departament məlumatları yüklənir...
                    </p>
                  )}
                  {!departmentsLoading && filteredDepartments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {departmentSearch || selectedInstitutionForDepartments
                        ? 'Filter şərtlərinə uyğun departament tapılmadı' 
                        : 'Departament tapılmadı'
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Role Selection */}
              {sharingOptions?.available_roles && sharingOptions.available_roles.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Hədəf Rollar</span>
                    </div>
                    {watch('target_roles').length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {watch('target_roles').length} seçilmiş
                      </span>
                    )}
                  </Label>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllRoles}
                        disabled={creating}
                        className="h-7 text-xs"
                      >
                        Hamısını seç ({sharingOptions.available_roles.length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllRoles}
                        disabled={creating || watch('target_roles').length === 0}
                        className="h-7 text-xs"
                      >
                        Hamısını ləğv et
                      </Button>
                    </div>

                    <div className="max-h-24 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {sharingOptions.available_roles.map((role) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={watch('target_roles').includes(role)}
                            onCheckedChange={(checked) => {
                              const current = watch('target_roles');
                              if (checked) {
                                setValue('target_roles', [...current, role]);
                              } else {
                                setValue('target_roles', current.filter(r => r !== role));
                              }
                            }}
                            disabled={creating}
                          />
                          <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer capitalize">
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Giriş Nəzarəti</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  {...register('expires_at')}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_clicks">Maksimum Klik Sayı</Label>
                <Input
                  id="max_clicks"
                  type="number"
                  {...register('max_clicks')}
                  placeholder="Məhdudiyyət yox"
                  min="1"
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={watch('is_featured')}
                    onCheckedChange={(checked) => setValue('is_featured', checked)}
                    disabled={creating}
                  />
                  <Label htmlFor="is_featured" className="text-sm">
                    Xüsusi Link
                  </Label>
                </div>
              </div>
            </div>

            {/* Time Restrictions */}
            <div className="space-y-3">
              <Label>Vaxt Məhdudiyyətləri</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="access_start_time">Başlama Saatı</Label>
                  <Input
                    id="access_start_time"
                    type="time"
                    {...register('access_start_time')}
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access_end_time">Bitirmə Saatı</Label>
                  <Input
                    id="access_end_time"
                    type="time"
                    {...register('access_end_time')}
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Giriş Günləri</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={watch('access_days_of_week').includes(day.value)}
                        onCheckedChange={(checked) => {
                          const current = watch('access_days_of_week');
                          if (checked) {
                            setValue('access_days_of_week', [...current, day.value]);
                          } else {
                            setValue('access_days_of_week', current.filter(d => d !== day.value));
                          }
                        }}
                        disabled={creating}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Diqqət
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Paylaşacağınız linklərin güvənliyinə diqqət edin. Zərərli və ya uyğunsuz məzmun olan linklər paylaşmayın.
                </p>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={creating}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={creating}
            onClick={handleSubmit(onSubmit)}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yaradılır...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Link Yarat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};