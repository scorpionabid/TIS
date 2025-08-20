import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface LinkAccessControlProps {
  form: any;
  creating: boolean;
}

export const LinkAccessControl: React.FC<LinkAccessControlProps> = ({
  form,
  creating
}) => {
  const { register, setValue, watch } = form;

  const daysOfWeek = [
    { value: 1, label: 'B.e' },
    { value: 2, label: 'Ç.a' },
    { value: 3, label: 'Ç' },
    { value: 4, label: 'C.a' },
    { value: 5, label: 'C' },
    { value: 6, label: 'Ş' },
    { value: 0, label: 'B' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4" />
        <h3 className="text-lg font-semibold">Giriş Nəzarəti</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
          <Input
            id="expires_at"
            type="datetime-local"
            {...register('expires_at')}
            disabled={creating}
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
            disabled={creating}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={watch('is_featured')}
              onCheckedChange={(checked) => setValue('is_featured', checked)}
              disabled={creating}
            />
            <Label htmlFor="is_featured" className="text-sm">
              Xüsusi Link
            </Label>
          </div>
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
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_end_time">Bitirmə Saatı</Label>
            <Input
              id="access_end_time"
              type="time"
              {...register('access_end_time')}
              disabled={creating}
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
                  disabled={creating}
                />
                <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                  {day.label}
                </Label>
              </div>
            ))}
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
              Paylaşacağınız linklərin güvənliyinə diqqət edin. Zərərli və ya uyğunsuz məzmun olan linklər paylaşmayın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};