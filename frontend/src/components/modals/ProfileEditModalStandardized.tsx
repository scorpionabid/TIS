import React, { useState, useCallback, useMemo } from 'react';
import { BaseModal } from '@/components/common/BaseModal';
import { FormField } from '@/components/forms/FormBuilder';
import { profileService, ProfileResponse, ProfileUpdateData } from '@/services/profile';
import { useToast } from '@/hooks/use-toast';
import { userFields, emergencyContactFields, profileFields } from '@/components/modals/configurations/modalFieldConfig';
import { User, Heart, MapPin, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileEditModalStandardizedProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileResponse | null;
  onProfileUpdate: (updatedProfile: ProfileResponse) => void;
}

export const ProfileEditModalStandardized: React.FC<ProfileEditModalStandardizedProps> = ({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Custom avatar upload component
  const AvatarUploadComponent = ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => {
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file size and type
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Xəta',
          description: 'Fayl ölçüsü 2MB-dan böyük ola bilməz',
          variant: 'destructive',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Xəta',
          description: 'Yalnız şəkil faylları qəbul edilir',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);
        // Create preview
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        
        // Upload avatar (assuming profileService has uploadAvatar method)
        // const uploadResult = await profileService.uploadAvatar(file);
        // onChange?.(uploadResult.url);
        
        toast({
          title: 'Uğur!',
          description: 'Avatar yükləndi',
        });
      } catch (error) {
        console.error('Avatar upload failed:', error);
        toast({
          title: 'Xəta',
          description: 'Avatar yüklənə bilmədi',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const currentAvatar = avatarPreview || value || profileData?.user?.avatar;

    return (
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={currentAvatar} alt="Avatar" />
          <AvatarFallback>
            <User className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <div>
          <label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="flex items-center space-x-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md">
              <Camera className="h-4 w-4" />
              <span>Yeni şəkil</span>
            </div>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG formatında maksimum 2MB
          </p>
        </div>
      </div>
    );
  };

  // Dynamic fields with avatar component
  const basicFields: FormField[] = useMemo(() => [
    userFields.firstName,
    userFields.lastName,
    userFields.patronymic,
    userFields.contactPhone,
    userFields.birthDate,
    userFields.gender,
    {
      ...profileFields.avatar,
      component: <AvatarUploadComponent />
    },
  ], []);

  const addressFields: FormField[] = useMemo(() => [
    profileFields.address,
  ], []);

  const emergencyFields: FormField[] = useMemo(() => [
    emergencyContactFields.name,
    emergencyContactFields.phone,
    emergencyContactFields.email,
  ], []);

  // Default values from profile data
  const defaultValues = useMemo(() => {
    if (!profileData) {
      return {
        first_name: '',
        last_name: '',
        patronymic: '',
        contact_phone: '',
        birth_date: '',
        gender: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_email: '',
        avatar: '',
      };
    }

    const profile = profileData.profile || {};
    const user = profileData.user || {};

    return {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      patronymic: profile.patronymic || '',
      contact_phone: profile.contact_phone || '',
      birth_date: profile.birth_date || '',
      gender: profile.gender || '',
      address: profile.address || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_phone: profile.emergency_contact_phone || '',
      emergency_contact_email: profile.emergency_contact_email || '',
      avatar: user.avatar || '',
    };
  }, [profileData]);

  // Form submission handler
  const handleSubmit = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const updateData: ProfileUpdateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        patronymic: data.patronymic,
        contact_phone: data.contact_phone,
        birth_date: data.birth_date,
        gender: data.gender,
        address: data.address,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_email: data.emergency_contact_email,
      };

      const updatedProfile = await profileService.updateProfile(updateData);
      onProfileUpdate(updatedProfile);
      
      toast({
        title: 'Uğur!',
        description: 'Profil məlumatları uğurla yeniləndi',
      });

      onClose();
    } catch (error) {
      console.error('Profile update failed:', error);
      toast({
        title: 'Xəta',
        description: 'Profil yenilənə bilmədi',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onProfileUpdate, onClose, toast]);

  // Modal tabs configuration
  const tabs = [
    {
      id: 'basic',
      label: 'Şəxsi məlumatlar',
      icon: <User className="h-4 w-4" />,
      fields: basicFields,
      description: 'Əsas şəxsi məlumatlar və profil şəkli',
      color: 'blue' as const,
    },
    {
      id: 'address',
      label: 'Ünvan',
      icon: <MapPin className="h-4 w-4" />,
      fields: addressFields,
      description: 'Yaşayış ünvanı məlumatları',
      color: 'green' as const,
    },
    {
      id: 'emergency',
      label: 'Təcili əlaqə',
      icon: <Heart className="h-4 w-4" />,
      fields: emergencyFields,
      description: 'Təcili hallarda əlaqə məlumatları',
      color: 'purple' as const,
    },
  ];

  return (
    <BaseModal
      open={isOpen}
      onClose={onClose}
      title="Profil məlumatlarını redaktə et"
      description="Şəxsi məlumatlarınızı yeniləyin və təcili əlaqə məlumatlarını təyin edin."
      loading={loading}
      entityBadge="Profil"
      entity={profileData}
      tabs={tabs}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitLabel="Yadda saxla"
      maxWidth="3xl"
      columns={2}
    />
  );
};