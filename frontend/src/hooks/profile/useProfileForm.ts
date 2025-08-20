import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, ProfileResponse, ProfileUpdateData } from '@/services/profile';
import { subjectService, subjectKeys } from '@/services/subjects';
import { useToast } from '@/hooks/use-toast';

export const useProfileForm = (isOpen: boolean, userId?: number, onSuccess?: () => void) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileUpdateData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      bio: '',
      emergency_contact: '',
      blood_type: '',
      nationality: '',
      id_number: '',
      position: '',
      department: '',
      hire_date: '',
      salary: '',
      experience_years: '',
      education_level: '',
      university: '',
      graduation_year: '',
      major: '',
      certificates: [],
      skills: [],
      languages: [],
      subject_specializations: [],
    }
  });

  // Load profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: isOpen && !!userId,
  });

  // Load subjects data
  const { data: subjects } = useQuery({
    queryKey: subjectKeys.all,
    queryFn: subjectService.getSubjects,
    enabled: isOpen,
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => profileService.updateProfile(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: 'Uğurlu',
        description: 'Profil məlumatları yeniləndi',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Profil yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Upload avatar mutation
  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(userId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setAvatar(null);
      setAvatarPreview(null);
      toast({
        title: 'Uğurlu',
        description: 'Profil şəkli yeniləndi',
      });
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'Şəkil yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Initialize form when profile data loads
  useEffect(() => {
    if (profile?.data) {
      const profileData = profile.data;
      form.reset({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        gender: profileData.gender || '',
        address: profileData.address || '',
        bio: profileData.bio || '',
        emergency_contact: profileData.emergency_contact || '',
        blood_type: profileData.blood_type || '',
        nationality: profileData.nationality || '',
        id_number: profileData.id_number || '',
        position: profileData.position || '',
        department: profileData.department || '',
        hire_date: profileData.hire_date || '',
        salary: profileData.salary || '',
        experience_years: profileData.experience_years || '',
        education_level: profileData.education_level || '',
        university: profileData.university || '',
        graduation_year: profileData.graduation_year || '',
        major: profileData.major || '',
        certificates: profileData.certificates || [],
        skills: profileData.skills || [],
        languages: profileData.languages || [],
        subject_specializations: profileData.subject_specializations || [],
      });
    }
  }, [profile, form]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Xəta',
          description: 'Şəkil ölçüsü 5MB-dan çox ola bilməz',
          variant: 'destructive',
        });
        return;
      }

      setAvatar(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (data: ProfileUpdateData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
      
      if (avatar) {
        await avatarMutation.mutateAsync(avatar);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArrayItem = (field: keyof ProfileUpdateData, value: string) => {
    const currentValues = form.getValues(field) as string[];
    if (value.trim() && !currentValues.includes(value.trim())) {
      form.setValue(field, [...currentValues, value.trim()]);
    }
  };

  const removeArrayItem = (field: keyof ProfileUpdateData, index: number) => {
    const currentValues = form.getValues(field) as string[];
    form.setValue(field, currentValues.filter((_, i) => i !== index));
  };

  return {
    // State
    activeTab,
    setActiveTab,
    avatar,
    avatarPreview,
    isSubmitting,
    
    // Data
    profile: profile?.data,
    subjects: subjects?.data || [],
    profileLoading,
    
    // Form
    form,
    
    // Actions
    handleAvatarChange,
    handleSubmit,
    addArrayItem,
    removeArrayItem,
    
    // Mutations
    updateMutation,
    avatarMutation,
  };
};