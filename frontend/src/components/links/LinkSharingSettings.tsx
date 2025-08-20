import React from 'react';
import { Globe } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SharingOptions } from '@/services/links';

interface LinkSharingSettingsProps {
  form: any;
  creating: boolean;
  sharingOptions?: SharingOptions;
  sharingOptionsLoading: boolean;
}

export const LinkSharingSettings: React.FC<LinkSharingSettingsProps> = ({
  form,
  creating,
  sharingOptions,
  sharingOptionsLoading
}) => {
  const { setValue, watch } = form;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Globe className="h-4 w-4" />
        <h3 className="text-lg font-semibold">Paylaşım Ayarları</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="share_scope">Paylaşım Əhatəsi *</Label>
          <Select 
            value={watch('share_scope')} 
            onValueChange={(value) => setValue('share_scope', value as any)}
            disabled={creating || sharingOptionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Paylaşım əhatəsini seçin" />
            </SelectTrigger>
            <SelectContent>
              {sharingOptions?.available_scopes && Object.entries(sharingOptions.available_scopes).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="requires_login"
              checked={watch('requires_login')}
              onCheckedChange={(checked) => setValue('requires_login', checked)}
              disabled={creating}
            />
            <Label htmlFor="requires_login" className="text-sm">
              Giriş tələb olunur
            </Label>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Aşağıda linkin hansı müəssisə və departamentlərdə görünəcəyini təyin edə bilərsiniz. Bu ayarlar paylaşım əhatəsindən ayrı olaraq tətbiq olunur.
        </p>
      </div>
    </div>
  );
};