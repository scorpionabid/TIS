import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X } from 'lucide-react';

interface ProfilePhotoSectionProps {
  profile: any;
  avatarPreview: string | null;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePreview: () => void;
}

export const ProfilePhotoSection = ({
  profile,
  avatarPreview,
  onAvatarChange,
  onRemovePreview
}: ProfilePhotoSectionProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={avatarPreview || profile?.avatar || ''} 
                alt={profile?.first_name || 'User'} 
              />
              <AvatarFallback className="text-lg">
                {profile?.first_name ? getInitials(`${profile.first_name} ${profile.last_name || ''}`) : 'UN'}
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
              JPG, PNG və ya GIF format. Maksimum 5MB.
            </p>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Camera className="h-4 w-4 mr-2" />
                  Şəkil Seç
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="hidden"
                  />
                </label>
              </Button>
              
              <Button type="button" variant="ghost" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Yüklə
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};