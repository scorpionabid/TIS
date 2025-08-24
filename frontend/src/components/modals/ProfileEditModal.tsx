import React, { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Upload,
  Loader2,
  Camera,
  X
} from 'lucide-react';
import { profileService, ProfileResponse, ProfileUpdateData } from '@/services/profile';
import { useToast } from '@/hooks/use-toast';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileResponse | null;
  onProfileUpdate: (updatedProfile: ProfileResponse) => void;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
  patronymic: string;
  contact_phone: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      patronymic: '',
      contact_phone: '',
      birth_date: '',
      gender: 'other',
      address: {
        street: '',
        city: '',
        postal_code: '',
        country: 'Azerbaijan'
      },
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_email: ''
    }
  });

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen && !profileData) {
      // Load profile data if not provided
      const loadProfile = async () => {
        try {
          setIsLoading(true);
          const profile = await profileService.getProfile();
          onProfileUpdate(profile);
        } catch (error) {
          console.error('Profile loading error:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }
    
    if (profileData?.user?.profile) {
      const profile = profileData.user.profile;
      reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        patronymic: profile.patronymic || '',
        contact_phone: profile.contact_phone || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || 'other',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          postal_code: profile.address?.postal_code || '',
          country: profile.address?.country || 'Azerbaijan'
        },
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_email: profile.emergency_contact_email || ''
      });
      setAvatarPreview(profileData.avatar_url || null);
    }
  }, [isOpen, profileData, reset, onProfileUpdate]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Xəta',
        description: 'Şəkil ölçüsü maksimum 5MB ola bilər',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Xəta',
        description: 'Yalnız şəkil faylları qəbul edilir',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      const response = await profileService.uploadAvatar(file);
      
      toast({
        title: 'Uğurlu',
        description: 'Avatar yeniləndi',
      });
      
      // Refresh profile data
      const updatedProfile = await profileService.getProfile();
      onProfileUpdate(updatedProfile);
      setAvatarPreview(updatedProfile.avatar_url || null);
      
    } catch (error) {
      console.error('Avatar yüklənərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: 'Avatar yüklənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      await profileService.removeAvatar();
      setAvatarPreview(null);
      
      toast({
        title: 'Uğurlu',
        description: 'Avatar silindi',
      });
      
      // Refresh profile data
      const updatedProfile = await profileService.getProfile();
      onProfileUpdate(updatedProfile);
      
    } catch (error) {
      console.error('Avatar silinərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: 'Avatar silinə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      
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
        emergency_contact_email: data.emergency_contact_email
      };

      const updatedProfile = await profileService.updateProfile(updateData);
      
      toast({
        title: 'Uğurlu',
        description: 'Profil məlumatları yeniləndi',
      });
      
      onProfileUpdate(updatedProfile);
      onClose();
      
    } catch (error: any) {
      console.error('Profil yenilənərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: error.message || 'Profil yenilənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !isLoading) {
      if (confirm('Saxlanmamış dəyişikliklər var. Pəncərəni bağlamaq istədiyinizdən əminsiniz?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!profileData) {
    if (!isOpen) return null;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Profil məlumatları yüklənir...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profil Məlumatlarını Redaktə Et</span>
          </DialogTitle>
          <DialogDescription>
            Şəxsi məlumatlarınızı və əlaqə məlumatlarınızı yeniləyin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="Avatar preview" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {profileService.getUserInitials(profileData.user.name)}
                </AvatarFallback>
              </Avatar>
              
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
              
              {avatarPreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              <label htmlFor="avatar-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingAvatar}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    Avatar Yenilə
                  </span>
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </div>
          </div>

          <Separator />

          {/* User Info Display */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">E-poçt:</span>
              <span className="text-sm">{profileData.user.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">İstifadəçi adı:</span>
              <span className="text-sm">{profileData.user.username}</span>
              <Badge variant="secondary" className="text-xs">
                {typeof profileData.user.role === 'object' && profileData.user.role 
                  ? (profileData.user.role.display_name || profileData.user.role.name || 'Təyin edilməyib')
                  : String(profileData.user.role || 'Təyin edilməyib')
                }
              </Badge>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Şəxsi Məlumatlar</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Ad *</Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'Ad daxil etmək mütləqdir' })}
                  placeholder="Adınızı daxil edin"
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Soyad *</Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'Soyad daxil etmək mütləqdir' })}
                  placeholder="Soyadınızı daxil edin"
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patronymic">Ata adı</Label>
                <Input
                  id="patronymic"
                  {...register('patronymic')}
                  placeholder="Ata adınızı daxil edin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Cins</Label>
                <Select 
                  value={watch('gender')} 
                  onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cinsi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Kişi</SelectItem>
                    <SelectItem value="female">Qadın</SelectItem>
                    <SelectItem value="other">Daxil etmək istəmirəm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Doğum tarixi</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefon</Label>
                <Input
                  id="contact_phone"
                  {...register('contact_phone')}
                  placeholder="+994 XX XXX XX XX"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ünvan Məlumatları</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address.street">Küçə ünvanı</Label>
                <Textarea
                  id="address.street"
                  {...register('address.street')}
                  placeholder="Küçə ünvanınızı daxil edin"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address.city">Şəhər</Label>
                <Input
                  id="address.city"
                  {...register('address.city')}
                  placeholder="Şəhər adını daxil edin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address.postal_code">Poçt kodu</Label>
                <Input
                  id="address.postal_code"
                  {...register('address.postal_code')}
                  placeholder="Poçt kodunu daxil edin"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Təcili Əlaqə Məlumatları</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="emergency_contact_name">Təcili əlaqə şəxsi</Label>
                <Input
                  id="emergency_contact_name"
                  {...register('emergency_contact_name')}
                  placeholder="Təcili hallarda əlaqə saxlanılacaq şəxsin adı"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Təcili əlaqə telefonu</Label>
                <Input
                  id="emergency_contact_phone"
                  {...register('emergency_contact_phone')}
                  placeholder="+994 XX XXX XX XX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_email">Təcili əlaqə e-poçtu</Label>
                <Input
                  id="emergency_contact_email"
                  type="email"
                  {...register('emergency_contact_email')}
                  placeholder="emergency@example.com"
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !isDirty}
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saxlanılır...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Dəyişiklikləri Saxla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};