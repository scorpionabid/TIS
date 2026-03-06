import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { documentService, CreateDocumentData } from '@/services/documents';
import { institutionService, Institution } from '@/services/institutions';
import { departmentService, Department } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';

interface DocumentUploadForm extends CreateDocumentData {
  files: FileList | null;
}

export const useDocumentUpload = (isOpen: boolean, onUploadComplete?: () => void) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [shareWithAll, setShareWithAll] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DocumentUploadForm>({
    defaultValues: {
      title: '',
      description: '',
      category: 'general',
      access_level: 'department',
      is_public: false,
      expiry_date: undefined,
      tags: [],
      files: null,
    }
  });

  // Load institutions
  const { data: institutionsData, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getInstitutions(),
    enabled: isOpen,
  });

  // Load departments
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
    enabled: isOpen,
  });

  const institutions = institutionsData?.data || [];
  const departments = departmentsData?.data || [];

  // Filter institutions based on search
  const filteredInstitutions = useMemo(() => {
    return institutions.filter((institution: Institution) =>
      institution.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [institutions, searchTerm]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      const formData = new FormData();
      
      // Add document metadata
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && value !== undefined) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Add files
      selectedFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      // Add sharing settings
      if (selectedInstitutions.length > 0) {
        formData.append('institution_ids', JSON.stringify(selectedInstitutions));
      }
      if (selectedDepartments.length > 0) {
        formData.append('department_ids', JSON.stringify(selectedDepartments));
      }

      return documentService.uploadDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Uğurlu',
        description: 'Sənədlər uğurla yükləndi',
      });
      resetForm();
      onUploadComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sənədlər yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const handleFilesSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter(file => {
        // Check file size (max 50MB per file)
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: 'Xəta',
            description: `${file.name} faylı çox böyükdür (maksimum 50MB)`,
            variant: 'destructive',
          });
          return false;
        }
        return true;
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIconType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return 'image';
      case 'zip':
      case 'rar':
      case '7z':
        return 'archive';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'flac':
        return 'audio';
      default:
        return 'file';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleInstitution = (institutionId: number) => {
    setSelectedInstitutions(prev =>
      prev.includes(institutionId)
        ? prev.filter(id => id !== institutionId)
        : [...prev, institutionId]
    );
  };

  const toggleDepartment = (departmentId: number) => {
    setSelectedDepartments(prev =>
      prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSubmit = (data: DocumentUploadForm) => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Xəta',
        description: 'Ən azı bir fayl seçməlisiniz',
        variant: 'destructive',
      });
      return;
    }

    const uploadData: CreateDocumentData = {
      ...data,
      is_public: isPublic,
      institution_ids: selectedInstitutions,
      department_ids: selectedDepartments,
    };

    uploadMutation.mutate(uploadData);
  };

  const resetForm = () => {
    form.reset();
    setSelectedFiles([]);
    setSelectedInstitutions([]);
    setSelectedDepartments([]);
    setShareWithAll(false);
    setIsPublic(false);
    setSearchTerm('');
    setUploadProgress({});
  };

  return {
    // Form
    form,
    
    // State
    selectedFiles,
    uploadProgress,
    searchTerm,
    setSearchTerm,
    selectedInstitutions,
    selectedDepartments,
    shareWithAll,
    setShareWithAll,
    isPublic,
    setIsPublic,
    
    // Data
    institutions,
    departments,
    filteredInstitutions,
    institutionsLoading,
    departmentsLoading,
    
    // Actions
    handleFilesSelect,
    removeFile,
    toggleInstitution,
    toggleDepartment,
    handleSubmit,
    resetForm,
    
    // Utils
    getFileIcon,
    formatFileSize,
    
    // Mutations
    uploadMutation,
  };
};