import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileService,
  ProfileResponse,
  ProfileFormData,
  UpdateProfileData,
} from '@/services/profile';
import { useToast } from '@/hooks/use-toast';

const toUpdateData = (data: ProfileFormData): UpdateProfileData => ({
  username: data.username || undefined,
  email: data.email || undefined,
  profile: {
    first_name: data.first_name || undefined,
    last_name: data.last_name || undefined,
    patronymic: data.patronymic || undefined,
    birth_date: data.birth_date || undefined,
    gender: (data.gender as 'male' | 'female' | 'other') || undefined,
    contact_phone: data.contact_phone || undefined,
  },
});

const EMPTY_FORM: ProfileFormData = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  patronymic: '',
  birth_date: '',
  gender: '',
  national_id: '',
  contact_phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address_street: '',
  address_city: '',
};

export const useProfileForm = (
  isOpen: boolean,
  initialProfileData?: ProfileResponse | null,
  onSuccess?: () => void,
) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({ defaultValues: EMPTY_FORM });

  // Serverdən cari istifadəçi profilini yüklə
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileService.getProfile(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  // Server data varsa onu, yoxdursa ilkin prop-u istifadə et
  const profile = profileData ?? initialProfileData;

  // Profil yükləndikdə formu doldur
  useEffect(() => {
    const user = profile?.user;
    if (!user) return;

    const p = user.profile;
    form.reset({
      username: user.username ?? '',
      email: user.email ?? '',
      first_name: p?.first_name ?? '',
      last_name: p?.last_name ?? '',
      patronymic: p?.patronymic ?? '',
      birth_date: p?.birth_date ?? '',
      gender: (p?.gender as ProfileFormData['gender']) ?? '',
      national_id: p?.national_id ?? '',
      contact_phone: p?.contact_phone ?? '',
      emergency_contact_name: p?.emergency_contact_name ?? '',
      emergency_contact_phone: p?.emergency_contact_phone ?? '',
      address_street: p?.address?.street ?? '',
      address_city: p?.address?.city ?? '',
    });
  }, [profile, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Uğurlu', description: 'Profil məlumatları yeniləndi' });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Profil yenilənərkən xəta baş verdi';
      toast({ title: 'Xəta', description: msg, variant: 'destructive' });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setAvatar(null);
      setAvatarPreview(null);
      toast({ title: 'Uğurlu', description: 'Profil şəkli yeniləndi' });
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Şəkil yüklənərkən xəta baş verdi', variant: 'destructive' });
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = profileService.validateAvatarFile(file);
    if (!validation.valid) {
      toast({ title: 'Xəta', description: validation.error, variant: 'destructive' });
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

  const handleSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(toUpdateData(data));
      if (avatar) await avatarMutation.mutateAsync(avatar);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    avatar,
    avatarPreview,
    isSubmitting,
    profile,
    profileLoading,
    form,
    handleAvatarChange,
    handleRemoveAvatarPreview,
    handleSubmit,
    updateMutation,
    avatarMutation,
  };
};
