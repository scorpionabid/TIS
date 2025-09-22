import React from 'react';
import { Calendar, Clock, Shield, BarChart3 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LinkSharingSettingsProps {
  form: any;
  creating: boolean;
}

export const LinkSharingSettings: React.FC<LinkSharingSettingsProps> = ({
  form,
  creating
}) => {
  return (
    <div className="space-y-6">
      {/* Access Control */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Giriş Nəzarəti</h3>
        </div>

        <FormField
          control={form.control}
          name="requires_login"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Giriş Tələb Et</FormLabel>
                <DialogDescription>
                  Bu linkə daxil olmaq üçün sistemi giriş tələb et.
                </DialogDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={creating}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Expiration Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Vaxt Tənzimləmələri</h3>
        </div>

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Son İstifadə Tarixi</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  disabled={creating}
                />
              </FormControl>
              <DialogDescription>
                Bu tarixdən sonra link işləməyəcək. Boş buraxılsa, daimi olacaq.
              </DialogDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="access_start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlama Saatı</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    disabled={creating}
                  />
                </FormControl>
                <DialogDescription className="text-xs">
                  Günlük giriş başlama saatı
                </DialogDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="access_end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bitmə Saatı</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    disabled={creating}
                  />
                </FormControl>
                <DialogDescription className="text-xs">
                  Günlük giriş bitmə saatı
                </DialogDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="access_days_of_week"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İcazə Verilən Günlər</FormLabel>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {[
                  { value: 1, label: 'B.e' },
                  { value: 2, label: 'Ç.a' },
                  { value: 3, label: 'Ç' },
                  { value: 4, label: 'C.a' },
                  { value: 5, label: 'C' },
                  { value: 6, label: 'Ş' },
                  { value: 0, label: 'B' }
                ].map((day) => (
                  <div key={day.value} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      id={`day-${day.value}`}
                      checked={field.value?.includes(day.value) || false}
                      onChange={(e) => {
                        const current = field.value || [];
                        if (e.target.checked) {
                          field.onChange([...current, day.value]);
                        } else {
                          field.onChange(current.filter((d: number) => d !== day.value));
                        }
                      }}
                      disabled={creating}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-xs">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              <DialogDescription>
                Yalnız seçilmiş günlərdə linkə giriş olacaq. Heç biri seçilməzsə, bütün günlər icazəlidir.
              </DialogDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Usage Limits */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">İstifadə Məhdudiyyətləri</h3>
        </div>

        <FormField
          control={form.control}
          name="max_clicks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maksimum Klik Sayı</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Məhdudiyyət olmayacaq"
                  min="1"
                  {...field}
                  disabled={creating}
                />
              </FormControl>
              <DialogDescription>
                Bu sayda kliklə çatdıqda link deaktiv olacaq. Boş buraxılsa, məhdudiyyət olmayacaq.
              </DialogDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Əlavə Tənzimləmələr</h3>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>Qeyd:</strong> Bu tənzimləmələr istəyə bağlıdır. Əksər hallarda default qiymətlər kifayətdir.
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Giriş nəzarəti:</strong> Yalnız sistemə daxil olan istifadəçilər
            </div>
            <div>
              <strong>Vaxt məhdudiyyəti:</strong> Müəyyən saatlarda və günlərdə giriş
            </div>
            <div>
              <strong>Klik məhdudiyyəti:</strong> Müəyyən sayda klikdən sonra deaktiv
            </div>
            <div>
              <strong>Son istifadə tarixi:</strong> Müəyyən tarixdən sonra əlçatmaz
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};