import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, ProfileResponse, UpdateProfileData } from '@/services/profile';
import { subjectService, Subject } from '@/services/subjects';
import { useToast } from '@/hooks/use-toast';

export const useProfileForm = (isOpen: boolean, initialProfileData?: ProfileResponse | null, onSuccess?: () => void) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateProfileData>({
    defaultValues: {
      username: '',
      email: '',
      profile: {
        first_name: '',
        last_name: '',
        patronymic: '',
        birth_date: '',
        gender: undefined,
        contact_phone: '',
        bio: '',
      },
      preferences: {
        theme: 'auto',
        language: 'az',
        notifications: {
          email: true,
          browser: true,
          sound: false,
        },
      },
    }
  });

  // Load profile data from server (always current user — no userId param)
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileService.getProfile(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5, // 5 dəqiqə cache
  });

  // Use server data, fall back to prop data
  const profile = profileData ?? initialProfileData;

  // Load subjects data
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getAll(),
    enabled: isOpen,
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: 'Uğurlu',
        description: 'Profil məlumatları yeniləndi',
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Profil yenilənərkən xəta baş verdi';
      toast({
        title: 'Xəta',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Upload avatar mutation
  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
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
    const user = profile?.user;
    if (user) {
      form.reset({
        username: user.username || '',
        email: user.email || '',
        profile: {
          first_name: user.profile?.first_name || '',
          last_name: user.profile?.last_name || '',
          patronymic: user.profile?.patronymic || '',
          birth_date: user.profile?.birth_date || '',
          gender: user.profile?.gender,
          contact_phone: user.profile?.contact_phone || '',
          bio: '',
        },
        preferences: {
          theme: user.profile?.preferences?.theme || 'auto',
          language: user.profile?.preferences?.language || 'az',
          notifications: {
            email: user.profile?.preferences?.notifications?.email ?? true,
            browser: user.profile?.preferences?.notifications?.browser ?? true,
            sound: user.profile?.preferences?.notifications?.sound ?? false,
          },
        },
      });
    }
  }, [profile, form]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = profileService.validateAvatarFile(file);
    if (!validation.valid) {
      toast({
        title: 'Xəta',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setAvatar(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatarPreview = () => {
    setAvatar(null);
    setAvatarPreview(null);
  };

  // Placeholder array helpers — ProfessionalInfoTab üçün saxlanılır (Phase 2-də refactor ediləcək)
  const addArrayItem = (_field: string, _value: string) => {};
  const removeArrayItem = (_field: string, _index: number) => {};

  const handleSubmit = async (data: UpdateProfileData) => {
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

  return {
    // State
    activeTab,
    setActiveTab,
    avatar,
    avatarPreview,
    isSubmitting,

    // Data
    profile,
    subjects: subjects || [],
    profileLoading,

    // Form
    form,

    // Actions
    handleAvatarChange,
    handleRemoveAvatarPreview,
    handleSubmit,
    addArrayItem,
    removeArrayItem,

    // Mutations
    updateMutation,
    avatarMutation,
  };
};
