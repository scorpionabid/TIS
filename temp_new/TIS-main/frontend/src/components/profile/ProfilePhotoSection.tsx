import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';
import { UserProfile } from '@/services/profile';

interface ProfilePhotoSectionProps {
  userProfile?: UserProfile;
  avatarUrl?: string;
  avatarPreview: string | null;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePreview: () => void;
}

export const ProfilePhotoSection = ({
  userProfile,
  avatarUrl,
  avatarPreview,
  onAvatarChange,
  onRemovePreview,
}: ProfilePhotoSectionProps) => {
  const getInitials = (firstName?: string, lastName?: string): string => {
    const parts = [firstName, lastName].filter(Boolean);
    if (parts.length === 0) return 'UN';
    return parts
      .map(p => p!.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displaySrc = avatarPreview || avatarUrl || '';

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={displaySrc} alt={userProfile?.first_name || 'User'} />
              <AvatarFallback className="text-lg">
                {getInitials(userProfile?.first_name, userProfile?.last_name)}
              </AvatarFallback>
            </Avatar>

            {avatarPreview && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={onRemovePreview}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Profil Şəkli</h3>
            <p className="text-sm text-muted-foreground mb-4">
              JPG, PNG və ya GIF format. Maksimum 2MB.
            </p>

            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Camera className="h-4 w-4 mr-2" />
                Şəkil Seç
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={onAvatarChange}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
