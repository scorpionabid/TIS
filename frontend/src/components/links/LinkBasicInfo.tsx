import React from 'react';
import { ExternalLink, Video, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LinkBasicInfoProps {
  form: any;
  creating: boolean;
}

export const LinkBasicInfo: React.FC<LinkBasicInfoProps> = ({
  form,
  creating
}) => {
  const { register, setValue, watch, formState: { errors } } = form;

  const linkTypes = [
    { value: 'external', label: 'Xarici Link', icon: ExternalLink },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'form', label: 'Form', icon: FileText },
    { value: 'document', label: 'Sənəd', icon: FileText }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Link Başlığı *</Label>
          <Input
            id="title"
            {...register('title', { required: 'Link başlığı tələb olunur' })}
            placeholder="Link başlığını daxil edin"
            disabled={creating}
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
            disabled={creating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Link tipini seçin" />
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
            validate: (value) => {
              try {
                new URL(value);
                return true;
              } catch {
                return 'Keçərli URL daxil edin';
              }
            }
          })}
          placeholder="https://example.com"
          disabled={creating}
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
          disabled={creating}
        />
      </div>
    </div>
  );
};