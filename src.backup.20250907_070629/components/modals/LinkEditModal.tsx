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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit3, 
  X, 
  Loader2,
  ExternalLink,
  Video,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import { linkService, LinkShare, CreateLinkData } from '@/services/links';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LinkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: number;
  onLinkUpdated?: () => void;
}

interface EditLinkFormData {
  title: string;
  description: string;
  url: string;
  link_type: 'external' | 'video' | 'form' | 'document';
  expires_at: string;
  max_clicks: string;
  access_start_time: string;
  access_end_time: string;
  access_days_of_week: number[];
  is_featured: boolean;
  status: 'active' | 'expired' | 'disabled';
}

export const LinkEditModal: React.FC<LinkEditModalProps> = ({
  isOpen,
  onClose,
  linkId,
  onLinkUpdated
}) => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch link details
  const { data: link, isLoading, error } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => linkService.getById(linkId),
    enabled: isOpen && linkId > 0
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditLinkFormData>({
    defaultValues: {
      title: '',
      description: '',
      url: '',
      link_type: 'external',
      expires_at: '',
      max_clicks: '',
      access_start_time: '',
      access_end_time: '',
      access_days_of_week: [],
      is_featured: false,
      status: 'active'
    }
  });

  // Populate form when link data is loaded
  useEffect(() => {
    if (link) {
      setValue('title', link.title);
      setValue('description', link.description || '');
      setValue('url', link.url);
      setValue('link_type', link.link_type);
      setValue('expires_at', link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : '');
      setValue('max_clicks', link.max_clicks ? link.max_clicks.toString() : '');
      setValue('access_start_time', link.access_start_time || '');
      setValue('access_end_time', link.access_end_time || '');
      setValue('access_days_of_week', link.access_days_of_week || []);
      setValue('is_featured', link.is_featured);
      setValue('status', link.status);
    }
  }, [link, setValue]);

  const linkTypes = [
    { value: 'external', label: 'Xarici Link', icon: ExternalLink },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'form', label: 'Form', icon: FileText },
    { value: 'document', label: 'Sənəd', icon: FileText }
  ];

  const statusOptions = [
    { value: 'active', label: 'Aktiv', color: 'text-green-600' },
    { value: 'disabled', label: 'Deaktiv', color: 'text-gray-600' },
    { value: 'expired', label: 'Müddəti keçmiş', color: 'text-red-600' }
  ];

  const daysOfWeek = [
    { value: 1, label: 'B.e' },  // Monday
    { value: 2, label: 'Ç.a' },  // Tuesday  
    { value: 3, label: 'Ç' },    // Wednesday
    { value: 4, label: 'C.a' },  // Thursday
    { value: 5, label: 'C' },    // Friday
    { value: 6, label: 'Ş' },    // Saturday
    { value: 0, label: 'B' }     // Sunday
  ];

  const validateURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: EditLinkFormData) => {
    if (!validateURL(data.url)) {
      toast({
        title: 'URL Xətası',
        description: 'Keçərli URL daxil edin (http:// və ya https:// ilə başlayan)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);

      const updateData: Partial<CreateLinkData> = {
        title: data.title,
        description: data.description || undefined,
        url: data.url,
        link_type: data.link_type,
        expires_at: data.expires_at || undefined,
        max_clicks: data.max_clicks ? parseInt(data.max_clicks) : undefined,
        access_start_time: data.access_start_time || undefined,
        access_end_time: data.access_end_time || undefined,
        access_days_of_week: data.access_days_of_week.length > 0 ? data.access_days_of_week : undefined,
        is_featured: data.is_featured
      };

      // Add status to updateData
      (updateData as any).status = data.status;

      const result = await linkService.update(linkId, updateData);

      toast({
        title: 'Uğurlu',
        description: 'Link uğurla yeniləndi',
      });

      // Refresh links list
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link', linkId] });
      queryClient.invalidateQueries({ queryKey: ['popular-links'] });
      queryClient.invalidateQueries({ queryKey: ['featured-links'] });

      onLinkUpdated?.();
      onClose();

    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Yeniləmə Xətası',
        description: error.message || 'Link yenilənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (updating) {
      if (confirm('Link yenilənir. İptal etmək istədiyinizdən əminsiniz?')) {
        setUpdating(false);
        onClose();
      }
    } else {
      reset();
      onClose();
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !link) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Link məlumatları yüklənə bilmədi</p>
            <p className="text-muted-foreground mt-2">Yenidən cəhd edin və ya administrators ilə əlaqə saxlayın</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit3 className="h-5 w-5" />
            <span>Link Redaktə Et</span>
          </DialogTitle>
          <DialogDescription>
            Link məlumatlarını və ayarlarını yeniləyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Link Başlığı *</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Link başlığı tələb olunur' })}
                  placeholder="Link başlığını daxil edin"
                  disabled={updating}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_type">Link Tipi</Label>
                <Select 
                  value={watch('link_type')} 
                  onValueChange={(value) => setValue('link_type', value as any)}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {linkTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                {...register('url', { 
                  required: 'URL tələb olunur',
                  validate: (value) => validateURL(value) || 'Keçərli URL daxil edin'
                })}
                placeholder="https://example.com"
                disabled={updating}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıqlama</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Link haqqında qısa açıqlama..."
                rows={3}
                disabled={updating}
              />
            </div>
          </div>

          {/* Status and Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Link Ayarları</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={watch('status')} 
                  onValueChange={(value) => setValue('status', value as any)}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <span className={status.color}>{status.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  {...register('expires_at')}
                  disabled={updating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_clicks">Maksimum Klik Sayı</Label>
                <Input
                  id="max_clicks"
                  type="number"
                  {...register('max_clicks')}
                  placeholder="Məhdudiyyət yox"
                  min="1"
                  disabled={updating}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={watch('is_featured')}
                  onCheckedChange={(checked) => setValue('is_featured', checked)}
                  disabled={updating}
                />
                <Label htmlFor="is_featured" className="text-sm">
                  Xüsusi Link (Ön səhifədə göstər)
                </Label>
              </div>
            </div>

            {/* Time Restrictions */}
            <div className="space-y-3">
              <Label>Vaxt Məhdudiyyətləri</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="access_start_time">Başlama Saatı</Label>
                  <Input
                    id="access_start_time"
                    type="time"
                    {...register('access_start_time')}
                    disabled={updating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access_end_time">Bitirmə Saatı</Label>
                  <Input
                    id="access_end_time"
                    type="time"
                    {...register('access_end_time')}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Giriş Günləri</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={watch('access_days_of_week').includes(day.value)}
                        onCheckedChange={(checked) => {
                          const current = watch('access_days_of_week');
                          if (checked) {
                            setValue('access_days_of_week', [...current, day.value]);
                          } else {
                            setValue('access_days_of_week', current.filter(d => d !== day.value));
                          }
                        }}
                        disabled={updating}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Current Stats */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium mb-2">Cari Statistikalar</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Klik Sayı</div>
                <div className="font-medium">{link.click_count}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">{statusOptions.find(s => s.value === link.status)?.label}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Yaradılma</div>
                <div className="font-medium">{new Date(link.created_at!).toLocaleDateString('az-AZ')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Paylaşan</div>
                <div className="font-medium">{link.sharedBy?.first_name} {link.sharedBy?.last_name}</div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Diqqət
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Link URL-ni dəyişdirmək mövcud statistikaları təsirlə bilər. Giriş icazələri dəyişdirilmir.
                </p>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={updating}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={updating}
            onClick={handleSubmit(onSubmit)}
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yenilənir...
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Yenilə
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};