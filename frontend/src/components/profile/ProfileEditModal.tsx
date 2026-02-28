import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useProfileForm } from '@/hooks/profile/useProfileForm';
import { ProfilePhotoSection } from './ProfilePhotoSection';
import { PersonalInfoTab } from './PersonalInfoTab';
import { ProfessionalInfoTab } from './ProfessionalInfoTab';
import { EducationTab } from './EducationTab';
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
    // State
    activeTab,
    setActiveTab,
    avatarPreview,
    isSubmitting,

    // Data
    profile,
    subjects,
    profileLoading,

    // Form
    form,

    // Actions
    handleAvatarChange,
    handleRemoveAvatarPreview,
    handleSubmit,
    addArrayItem,
    removeArrayItem,
  } = useProfileForm(isOpen, profileData, handleSuccess);

  const onSubmit = form.handleSubmit(handleSubmit);

  if (profileLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil Məlumatlarını Redaktə Et</DialogTitle>
          <DialogDescription>
            Şəxsi və peşəkar məlumatlarınızı yeniləyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Profile Photo Section */}
          <ProfilePhotoSection
            userProfile={profile?.user?.profile}
            avatarUrl={profile?.avatar_url}
            avatarPreview={avatarPreview}
            onAvatarChange={handleAvatarChange}
            onRemovePreview={handleRemoveAvatarPreview}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Şəxsi Məlumatlar</TabsTrigger>
              <TabsTrigger value="professional">Peşəkar Məlumatlar</TabsTrigger>
              <TabsTrigger value="education">Təhsil</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <PersonalInfoTab form={form} />
            </TabsContent>

            <TabsContent value="professional" className="mt-6">
              <ProfessionalInfoTab
                form={form}
                subjects={subjects}
                addArrayItem={addArrayItem}
                removeArrayItem={removeArrayItem}
              />
            </TabsContent>

            <TabsContent value="education" className="mt-6">
              <EducationTab form={form} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-8">
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