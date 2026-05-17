import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileFormData } from '@/services/profile';

interface PersonalInfoTabProps {
  form: UseFormReturn<ProfileFormData>;
}

export const PersonalInfoTab = ({ form }: PersonalInfoTabProps) => {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <div className="space-y-4">
      {/* Əsas məlumatlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Əsas Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Ad *</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'Ad məcburidir' })}
                placeholder="Adınız"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patronymic">Ata adı</Label>
              <Input
                id="patronymic"
                {...register('patronymic')}
                placeholder="Ata adınız"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Soyad *</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'Soyad məcburidir' })}
                placeholder="Soyadınız"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Doğum tarixi</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Cins</Label>
              <Select
                value={watch('gender')}
                onValueChange={(v) => setValue('gender', v as ProfileFormData['gender'])}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Cinsi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Kişi</SelectItem>
                  <SelectItem value="female">Qadın</SelectItem>
                  <SelectItem value="other">Digər</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="national_id">FİN kodu</Label>
            <Input
              id="national_id"
              {...register('national_id')}
              placeholder="Şəxsiyyət vəsiqəsinin FİN kodu"
              maxLength={7}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hesab məlumatları */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hesab Məlumatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-poçt *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'E-poçt məcburidir',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Düzgün e-poçt daxil edin' },
                })}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">İstifadəçi adı</Label>
              <Input
                id="username"
                {...register('username')}
                placeholder="İstifadəçi adınız"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Əlaqə məlumatları */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Əlaqə Məlumatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Telefon nömrəsi</Label>
            <Input
              id="contact_phone"
              {...register('contact_phone')}
              placeholder="+994 XX XXX XX XX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">Şəhər</Label>
              <Input
                id="address_city"
                {...register('address_city')}
                placeholder="Bakı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_street">Ünvan</Label>
              <Input
                id="address_street"
                {...register('address_street')}
                placeholder="Küçə, bina, mənzil"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Təcili əlaqə (ad)</Label>
              <Input
                id="emergency_contact_name"
                {...register('emergency_contact_name')}
                placeholder="Əlaqə şəxsinin adı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Təcili əlaqə (telefon)</Label>
              <Input
                id="emergency_contact_phone"
                {...register('emergency_contact_phone')}
                placeholder="+994 XX XXX XX XX"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
