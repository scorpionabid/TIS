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
  Upload, 
  File, 
  X, 
  Loader2,
  FileText,
  Image,
  Archive,
  Video,
  Music,
  AlertCircle,
  Building2,
  Users,
  Search
} from 'lucide-react';
import { documentService, CreateDocumentData } from '@/services/documents';
import { institutionService, Institution } from '@/services/institutions';
import { departmentService, Department } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  is_public: boolean;
  is_downloadable: boolean;
  is_viewable_online: boolean;
  expires_at: string;
  tags: string[];
  accessible_institutions: number[];
  accessible_departments: number[];
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Filter states
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');
  const [selectedInstitutionForDepartments, setSelectedInstitutionForDepartments] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UploadFormData>({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      access_level: 'institution',
      is_public: false,
      is_downloadable: true,
      is_viewable_online: true,
      expires_at: '',
      tags: [],
      accessible_institutions: [],
      accessible_departments: []
    }
  });

  // Fetch institutions and departments
  const { data: institutions, isLoading: institutionsLoading, error: institutionsError } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll()
  });

  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll()
  });

  // Debug logs
  console.log('🏢 Institutions:', { institutions, institutionsLoading, institutionsError });
  console.log('🏬 Departments:', { departments, departmentsLoading, departmentsError });

  // Filtered data
  const filteredInstitutions = useMemo(() => {
    if (!institutions?.data?.data) return [];
    
    let filtered = institutions.data.data;
    
    // Apply search filter
    if (institutionSearch.trim()) {
      const searchTerm = institutionSearch.toLowerCase();
      filtered = filtered.filter(institution => 
        institution.name.toLowerCase().includes(searchTerm) ||
        institution.type.toLowerCase().includes(searchTerm) ||
        (institution.short_name && institution.short_name.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply type filter
    if (institutionTypeFilter !== 'all') {
      filtered = filtered.filter(institution => institution.type === institutionTypeFilter);
    }
    
    return filtered;
  }, [institutions?.data?.data, institutionSearch, institutionTypeFilter]);

  const filteredDepartments = useMemo(() => {
    if (!departments?.data?.data) return [];
    
    let filtered = departments.data.data;
    
    // Apply institution filter first
    if (selectedInstitutionForDepartments) {
      filtered = filtered.filter(department => 
        department.institution_id === selectedInstitutionForDepartments
      );
    }
    
    // Apply search filter
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

  const categories = [
    { value: 'administrative', label: 'İdarəetmə sənədləri' },
    { value: 'financial', label: 'Maliyyə sənədləri' },
    { value: 'educational', label: 'Təhsil materialları' },
    { value: 'hr', label: 'İnsan resursları' },
    { value: 'technical', label: 'Texniki sənədlər' },
    { value: 'legal', label: 'Hüquqi sənədlər' },
    { value: 'reports', label: 'Hesabatlar' },
    { value: 'forms', label: 'Formalar' },
    { value: 'other', label: 'Digər' }
  ];

  const accessLevels = [
    { value: 'institution', label: 'Müəssisə daxilində' },
    { value: 'sectoral', label: 'Sektor daxilində' },
    { value: 'regional', label: 'Region daxilində' },
    { value: 'public', label: 'Hamı görə bilər' }
  ];

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('word')) return <FileText className="h-8 w-8 text-blue-500" />;
    if (type.includes('excel')) return <FileText className="h-8 w-8 text-green-500" />;
    if (type.includes('image')) return <Image className="h-8 w-8 text-purple-500" />;
    if (type.includes('video')) return <Video className="h-8 w-8 text-orange-500" />;
    if (type.includes('audio')) return <Music className="h-8 w-8 text-pink-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-8 w-8 text-gray-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return 'Fayl ölçüsü maksimum 50MB ola bilər';
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Dəstəklənməyən fayl tipi. PDF, Word, Excel, PowerPoint, şəkil və ya arxiv faylları seçin.';
    }

    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Fayl Xətası',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title if not already set
    if (!watch('title')) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setValue('title', nameWithoutExtension);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa fayl seçin',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadData: CreateDocumentData = {
        title: data.title,
        description: data.description || undefined,
        category: data.category || undefined,
        access_level: data.access_level,
        tags: data.tags.length > 0 ? data.tags : undefined,
        is_public: data.is_public,
        is_downloadable: data.is_downloadable,
        is_viewable_online: data.is_viewable_online,
        expires_at: data.expires_at || undefined,
        accessible_institutions: data.accessible_institutions.length > 0 ? data.accessible_institutions : undefined,
        accessible_departments: data.accessible_departments.length > 0 ? data.accessible_departments : undefined,
        file: selectedFile
      };

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const result = await documentService.uploadDocument(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Uğurlu',
        description: 'Sənəd uğurla yükləndi',
      });

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });

      // Reset form and close
      reset();
      setSelectedFile(null);
      setUploadProgress(0);
      onUploadComplete?.();
      onClose();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Yükləmə Xətası',
        description: error.message || 'Sənəd yüklənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Bulk selection functions
  const handleSelectAllInstitutions = () => {
    const allFilteredIds = filteredInstitutions.map(institution => institution.id);
    setValue('accessible_institutions', allFilteredIds);
  };

  const handleDeselectAllInstitutions = () => {
    setValue('accessible_institutions', []);
  };

  const handleSelectAllDepartments = () => {
    const allFilteredIds = filteredDepartments.map(department => department.id);
    setValue('accessible_departments', allFilteredIds);
  };

  const handleDeselectAllDepartments = () => {
    setValue('accessible_departments', []);
  };

  const handleClose = () => {
    if (uploading) {
      if (confirm('Yükləmə davam edir. İptal etmək istədiyinizdən əminsiniz?')) {
        setUploading(false);
        onClose();
      }
    } else {
      reset();
      setSelectedFile(null);
      setUploadProgress(0);
      setInstitutionSearch('');
      setDepartmentSearch('');
      setInstitutionTypeFilter('all');
      setSelectedInstitutionForDepartments(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Sənəd Yüklə</span>
          </DialogTitle>
          <DialogDescription>
            Sistem sənədlərini yükləyin və idarə edin. Maksimum fayl ölçüsü: 50MB
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <Label>Fayl Seçimi *</Label>
            
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Faylı bura atın və ya seçin</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, Word, Excel, PowerPoint, şəkil və ya arxiv faylları dəstəklənir
                  </p>
                </div>
                <label className="inline-block">
                  <Button type="button" variant="outline" className="mt-4" asChild>
                    <span>Fayl Seç</span>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
                    onChange={handleFileInputChange}
                  />
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  {getFileIcon(selectedFile)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </p>
                  </div>
                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Yüklənir...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Sənəd Adı *</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Sənəd adı tələb olunur' })}
                  placeholder="Sənədin adını daxil edin"
                  disabled={uploading}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kateqoriya</Label>
                <Select 
                  value={watch('category')} 
                  onValueChange={(value) => setValue('category', value)}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kateqoriya seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="access_level">Giriş Səviyyəsi</Label>
                <Select 
                  value={watch('access_level')} 
                  onValueChange={(value) => setValue('access_level', value as any)}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Giriş səviyyəsini seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sənədin kimlərin görə biləcəyini müəyyən edir
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıqlama</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Sənəd haqqında ətraflı məlumat..."
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
                <Input
                  id="expires_at"
                  type="date"
                  {...register('expires_at')}
                  disabled={uploading}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_public"
                      checked={watch('is_public')}
                      onCheckedChange={(checked) => setValue('is_public', checked)}
                      disabled={uploading}
                    />
                    <Label htmlFor="is_public" className="text-sm">
                      İctimai Sənəd
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_downloadable"
                      checked={watch('is_downloadable')}
                      onCheckedChange={(checked) => setValue('is_downloadable', checked)}
                      disabled={uploading}
                    />
                    <Label htmlFor="is_downloadable" className="text-sm">
                      Yükləmə icazəsi
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_viewable_online"
                      checked={watch('is_viewable_online')}
                      onCheckedChange={(checked) => setValue('is_viewable_online', checked)}
                      disabled={uploading}
                    />
                    <Label htmlFor="is_viewable_online" className="text-sm">
                      Onlayn baxış icazəsi
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Control Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Giriş İcazələri</h3>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Sənədin hansı müəssisə və departamentlər üçün əlçatan olacağını seçin. Seçim edilməzsə, sənəd yalnız sizin müəssisəniz üçün əlçatan olacaq.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  💡 İpucu: Bu seçimlər "İctimai Sənəd" seçimindən ayrıdır və əlavə giriş nəzarəti təmin edir.
                </p>
              </div>

              {/* Institutions Selection */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>Müəssisələr</span>
                  </div>
                  {watch('accessible_institutions').length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {watch('accessible_institutions').length} seçilmiş
                    </span>
                  )}
                </Label>

                {/* Institution Filters */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                      <Input
                        placeholder="Müəssisə axtarın..."
                        value={institutionSearch}
                        onChange={(e) => setInstitutionSearch(e.target.value)}
                        className="h-8 pl-7"
                        disabled={uploading}
                      />
                    </div>
                    <Select value={institutionTypeFilter} onValueChange={setInstitutionTypeFilter} disabled={uploading}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
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

                  {/* Bulk Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInstitutions}
                      disabled={uploading || filteredInstitutions.length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını seç ({filteredInstitutions.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllInstitutions}
                      disabled={uploading || watch('accessible_institutions').length === 0}
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
                        checked={watch('accessible_institutions').includes(institution.id)}
                        onCheckedChange={(checked) => {
                          const current = watch('accessible_institutions');
                          if (checked) {
                            setValue('accessible_institutions', [...current, institution.id]);
                          } else {
                            setValue('accessible_institutions', current.filter(id => id !== institution.id));
                          }
                        }}
                        disabled={uploading}
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
                  {institutionsError && (
                    <p className="text-sm text-red-500 text-center py-4">
                      Müəssisə məlumatları yüklənərkən xəta baş verdi
                    </p>
                  )}
                  {!institutionsLoading && !institutionsError && filteredInstitutions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {institutionSearch || institutionTypeFilter !== 'all' 
                        ? 'Filter şərtlərinə uyğun müəssisə tapılmadı' 
                        : 'Müəssisə tapılmadı'
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Departments Selection */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Departamentlər</span>
                  </div>
                  {watch('accessible_departments').length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {watch('accessible_departments').length} seçilmiş
                    </span>
                  )}
                </Label>

                {/* Department Filters */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                      <Input
                        placeholder="Departament axtarın..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="h-8 pl-7"
                        disabled={uploading}
                      />
                    </div>
                    <Select 
                      value={selectedInstitutionForDepartments?.toString() || 'all'} 
                      onValueChange={(value) => {
                        setSelectedInstitutionForDepartments(value === 'all' ? null : parseInt(value));
                      }}
                      disabled={uploading}
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

                  {/* Bulk Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllDepartments}
                      disabled={uploading || filteredDepartments.length === 0}
                      className="h-7 text-xs"
                    >
                      Hamısını seç ({filteredDepartments.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllDepartments}
                      disabled={uploading || watch('accessible_departments').length === 0}
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
                        disabled={uploading}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        Filtri sıfırla
                      </Button>
                    )}
                  </div>
                  
                  {/* Filter status */}
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
                        checked={watch('accessible_departments').includes(department.id)}
                        onCheckedChange={(checked) => {
                          const current = watch('accessible_departments');
                          if (checked) {
                            setValue('accessible_departments', [...current, department.id]);
                          } else {
                            setValue('accessible_departments', current.filter(id => id !== department.id));
                          }
                        }}
                        disabled={uploading}
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
                  {departmentsError && (
                    <p className="text-sm text-red-500 text-center py-4">
                      Departament məlumatları yüklənərkən xəta baş verdi
                    </p>
                  )}
                  {!departmentsLoading && !departmentsError && filteredDepartments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {departmentSearch 
                        ? 'Filter şərtlərinə uyğun departament tapılmadı' 
                        : 'Departament tapılmadı'
                      }
                    </p>
                  )}
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
                  Yükləyəcəyiniz sənədlərin konfidensiallığına diqqət edin. Şəxsi məlumatları olan sənədləri ictimai etməyin.
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
            disabled={uploading}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || uploading}
            onClick={handleSubmit(onSubmit)}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yüklənir... {Math.round(uploadProgress)}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Sənədi Yüklə
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};