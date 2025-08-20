import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileUpdateData } from '@/services/profile';

interface PersonalInfoTabProps {
  form: UseFormReturn<ProfileUpdateData>;
}

export const PersonalInfoTab = ({ form }: PersonalInfoTabProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Əsas Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Ad *</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'Ad məcburidir' })}
                placeholder="Adınızı daxil edin"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Soyad *</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'Soyad məcburidir' })}
                placeholder="Soyadınızı daxil edin"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'Email məcburidir',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Düzgün email formatı daxil edin'
                  }
                })}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+994 XX XXX XX XX"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Doğum tarixi</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Cins</Label>
              <Select value={watch('gender')} onValueChange={(value) => setValue('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Cinsi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Kişi</SelectItem>
                  <SelectItem value="female">Qadın</SelectItem>
                  <SelectItem value="other">Digər</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="blood_type">Qan qrupu</Label>
              <Select value={watch('blood_type')} onValueChange={(value) => setValue('blood_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Qan qrupunu seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationality">Milliyyət</Label>
              <Input
                id="nationality"
                {...register('nationality')}
                placeholder="Milliyyətinizi daxil edin"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="id_number">Şəxsiyyət vəsiqəsi</Label>
              <Input
                id="id_number"
                {...register('id_number')}
                placeholder="AZE1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Ünvan</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Yaşadığınız ünvanı daxil edin"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Təcili əlaqə</Label>
            <Textarea
              id="emergency_contact"
              {...register('emergency_contact')}
              placeholder="Təcili hallarda əlaqə saxlanılan şəxsin məlumatları"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Haqqında</Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Özünüz haqqında qısa məlumat"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};