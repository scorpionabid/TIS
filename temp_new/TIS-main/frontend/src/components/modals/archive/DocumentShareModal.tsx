import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Share, 
  Users, 
  Link, 
  Calendar,
  Download,
  Eye,
  Copy,
  Check,
  Loader2,
  User,
  Building2,
  Shield
} from 'lucide-react';
import { Document, documentService } from '@/services/documents';
import { useToast } from '@/hooks/use-toast';

interface DocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onShareComplete?: () => void;
}

interface ShareFormData {
  share_type: 'view' | 'edit';
  user_ids: number[];
  role_names: string[];
  institution_ids: number[];
  message: string;
  expires_at: string;
  allow_download: boolean;
  allow_reshare: boolean;
}

interface PublicLinkData {
  expires_at: string;
  allow_download: boolean;
  max_downloads: number;
  password: string;
}

export const DocumentShareModal: React.FC<DocumentShareModalProps> = ({
  isOpen,
  onClose,
  document,
  onShareComplete
}) => {
  const [shareMethod, setShareMethod] = useState<'users' | 'link'>('users');
  const [isSharing, setIsSharing] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm<ShareFormData>({
    defaultValues: {
      share_type: 'view',
      user_ids: [],
      role_names: [],
      institution_ids: [],
      message: '',
      expires_at: '',
      allow_download: true,
      allow_reshare: false
    }
  });

  const { register: registerLink, handleSubmit: handleSubmitLink, formState: { errors: linkErrors } } = useForm<PublicLinkData>({
    defaultValues: {
      expires_at: '',
      allow_download: true,
      max_downloads: 100,
      password: ''
    }
  });

  const shareTypes = [
    { value: 'view', label: 'Görüntüləmə', icon: Eye, description: 'Yalnız oxuma icazəsi' },
    { value: 'edit', label: 'Redaktə', icon: User, description: 'Oxuma və düzəliş icazəsi' }
  ];

  const availableRoles = [
    { value: 'teacher', label: 'Müəllimlər' },
    { value: 'mektebadmin', label: 'Məktəb Administratorları' },
    { value: 'sektoradmin', label: 'Sektor Administratorları' },
    { value: 'regionadmin', label: 'Regional Administratorlar' }
  ];

  const onSubmitUserShare = async (data: ShareFormData) => {
    if (!document) return;

    try {
      setIsSharing(true);

      await documentService.shareDocument(document.id, data);

      toast({
        title: 'Uğurlu',
        description: 'Sənəd uğurla paylaşıldı',
      });

      onShareComplete?.();
      onClose();
      
    } catch (error: any) {
      console.error('Share error:', error);
      toast({
        title: 'Paylaşım Xətası',
        description: error.message || 'Sənəd paylaşıla bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const onSubmitPublicLink = async (data: PublicLinkData) => {
    if (!document) return;

    try {
      setIsSharing(true);

      const response = await documentService.createPublicLink(document.id, data);
      setPublicLink(response.public_url);

      toast({
        title: 'Uğurlu',
        description: 'İctimai link yaradıldı',
      });
      
    } catch (error: any) {
      console.error('Link creation error:', error);
      toast({
        title: 'Link Yaradılması Xətası',
        description: error.message || 'İctimai link yaradıla bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: 'Kopyalandı',
        description: 'Link panoya kopyalandı',
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Link kopyalana bilmədi',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    reset();
    setShareMethod('users');
    setPublicLink(null);
    setLinkCopied(false);
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="h-5 w-5" />
            <span>Sənədi Paylaş</span>
          </DialogTitle>
          <DialogDescription>
            "{document.title}" sənədini istifadəçilər və ya ictimai link ilə paylaşın.
          </DialogDescription>
        </DialogHeader>

        {/* Document Info */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{document.mime_type?.includes('pdf') ? '📄' : 
              document.mime_type?.includes('word') ? '📝' : 
              document.mime_type?.includes('excel') ? '📊' : '📄'}</span>
            <span className="font-medium">{document.title}</span>
          </div>
          {document.description && (
            <p className="text-sm text-muted-foreground">{document.description}</p>
          )}
        </div>

        {/* Share Method Selector */}
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant={shareMethod === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShareMethod('users')}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Spesifik İstifadəçilər</span>
            </Button>
            <Button
              variant={shareMethod === 'link' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShareMethod('link')}
              className="flex items-center space-x-2"
            >
              <Link className="h-4 w-4" />
              <span>İctimai Link</span>
            </Button>
          </div>

          {shareMethod === 'users' ? (
            <form onSubmit={handleSubmit(onSubmitUserShare)} className="space-y-6">
              {/* Share Type */}
              <div className="space-y-3">
                <Label>Paylaşım Tipi</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shareTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        watch('share_type') === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('share_type', type.value as 'view' | 'edit')}
                    >
                      <div className="flex items-center space-x-2">
                        <type.icon className="h-4 w-4" />
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Selection */}
              <div className="space-y-4">
                <Label>Kimlərlə paylaş</Label>
                
                {/* Roles */}
                <div className="space-y-2">
                  <Label className="text-sm">Rəollər</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableRoles.map((role) => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <Controller
                          name="role_names"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value.includes(role.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, role.value]);
                                } else {
                                  field.onChange(field.value.filter(r => r !== role.value));
                                }
                              }}
                            />
                          )}
                        />
                        <Label className="text-sm">{role.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Mesaj (ixtiyari)</Label>
                <Textarea
                  id="message"
                  {...register('message')}
                  placeholder="Paylaşım haqqında qeyd..."
                  rows={3}
                />
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <Label>Əlavə Seçimlər</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Yükləməyə icazə ver</Label>
                      <p className="text-xs text-muted-foreground">İstifadəçilər sənədi yükləyə bilərlər</p>
                    </div>
                    <Controller
                      name="allow_download"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Yenidən paylaşıma icazə ver</Label>
                      <p className="text-xs text-muted-foreground">İstifadəçilər bu sənədi başqaları ilə paylaşa bilərlər</p>
                    </div>
                    <Controller
                      name="allow_reshare"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Son istifadə tarixi</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    {...register('expires_at')}
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!publicLink ? (
                <form onSubmit={handleSubmitLink(onSubmitPublicLink)} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_downloads">Maksimum yükləmə sayı</Label>
                      <Input
                        id="max_downloads"
                        type="number"
                        min="1"
                        max="1000"
                        {...registerLink('max_downloads')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Parol (ixtiyari)</Label>
                      <Input
                        id="password"
                        type="password"
                        {...registerLink('password')}
                        placeholder="Link üçün parol təyin edin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link_expires_at">Son istifadə tarixi</Label>
                      <Input
                        id="link_expires_at"
                        type="datetime-local"
                        {...registerLink('expires_at')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Yükləməyə icazə ver</Label>
                        <p className="text-xs text-muted-foreground">Link vasitəsilə sənədi yükləmək mümkün olacaq</p>
                      </div>
                      <Controller
                        name="allow_download"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-200">
                        İctimai link yaradıldı
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Input
                          value={publicLink}
                          readOnly
                          className="bg-white dark:bg-gray-800"
                        />
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(publicLink)}
                          className="flex items-center space-x-1"
                        >
                          {linkCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>{linkCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                        </Button>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Bu linki istənilən şəxslə paylaşa bilərsiniz. Link vasitəsilə sənədə giriş təmin ediləcək.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSharing}
          >
            Ləğv et
          </Button>
          {shareMethod === 'users' ? (
            <Button
              type="submit"
              disabled={isSharing}
              onClick={handleSubmit(onSubmitUserShare)}
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Paylaşılır...
                </>
              ) : (
                <>
                  <Share className="h-4 w-4 mr-2" />
                  Paylaş
                </>
              )}
            </Button>
          ) : !publicLink ? (
            <Button
              type="submit"
              disabled={isSharing}
              onClick={handleSubmitLink(onSubmitPublicLink)}
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yaradılır...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Link Yarat
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};