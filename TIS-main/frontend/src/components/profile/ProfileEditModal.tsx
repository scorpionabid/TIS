import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useProfileForm } from '@/hooks/profile/useProfileForm';
import { ProfilePhotoSection } from './ProfilePhotoSection';
import { PersonalInfoTab } from './PersonalInfoTab';
import { ProfileResponse } from '@/services/profile';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData?: ProfileResponse | null;
  onProfileUpdate?: (updatedProfile: ProfileResponse) => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate,
}: ProfileEditModalProps) {
  const handleSuccess = () => {
    onClose();
    onProfileUpdate?.(profileData!);
  };

  const {
    avatarPreview,
    isSubmitting,
    profile,
    profileLoading,
    form,
    handleAvatarChange,
    handleRemoveAvatarPreview,
    handleSubmit,
  } = useProfileForm(isOpen, profileData, handleSuccess);

  const onSubmit = form.handleSubmit(handleSubmit);

  if (profileLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[640px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Profil yüklənir...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil Məlumatlarını Redaktə Et</DialogTitle>
          <DialogDescription>
            Şəxsi və əlaqə məlumatlarınızı yeniləyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <ProfilePhotoSection
            userProfile={profile?.user?.profile}
            avatarUrl={profile?.avatar_url}
            avatarPreview={avatarPreview}
            onAvatarChange={handleAvatarChange}
            onRemovePreview={handleRemoveAvatarPreview}
          />

          <PersonalInfoTab form={form} />

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Yadda saxlanır...
                </>
              ) : (
                'Yadda saxla'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
