import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { User, Hash, Calendar, Mail, Phone, MapPin, GraduationCap, ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PersonalInfoStepProps {
  form: UseFormReturn<any>;
  grades: any[];
  avatarUrl?: string;
  onAvatarChange?: (url: string) => void;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  form,
  grades,
  avatarUrl,
  onAvatarChange,
}) => {
  const { register, formState: { errors }, setValue, watch } = form;

  const handleAvatarUpload = () => {
    // Simulated avatar upload - in real app, this would open a file picker
    const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    onAvatarChange?.(mockUrl);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="w-24 h-24 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              <User className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
            onClick={handleAvatarUpload}
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
        </div>
        <div>
          <h4 className="font-semibold text-lg">Şagird Şəkli</h4>
          <p className="text-sm text-muted-foreground">Şəkil əlavə etmək üçün düyməyə klikləyin</p>
        </div>
      </div>

      {/* Personal Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Şəxsi Məlumatlar
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-sm font-medium">
              Ad <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Adı daxil edin"
                className={cn('pl-10', errors.first_name && 'border-red-500')}
              />
            </div>
            {errors.first_name && (
              <p className="text-xs text-red-500">{errors.first_name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-sm font-medium">
              Soyad <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Soyadı daxil edin"
                className={cn('pl-10', errors.last_name && 'border-red-500')}
              />
            </div>
            {errors.last_name && (
              <p className="text-xs text-red-500">{errors.last_name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_number" className="text-sm font-medium">
              UTİS Kod <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="student_number"
                {...register('student_number')}
                placeholder="Məs: ST2024001"
                className={cn('pl-10', errors.student_number && 'border-red-500')}
              />
            </div>
            {errors.student_number && (
              <p className="text-xs text-red-500">{errors.student_number.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth" className="text-sm font-medium">
              Doğum Tarixi
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth')}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium">
              Cins
            </Label>
            <Select
              value={watch('gender')}
              onValueChange={(value) => setValue('gender', value)}
            >
              <SelectTrigger className="w-full">
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
            <Label htmlFor="class_id" className="text-sm font-medium">
              Sinif
            </Label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Select
                value={watch('class_id')?.toString()}
                onValueChange={(value) => setValue('class_id', value)}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Sinifi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade: any) => (
                    <SelectItem key={grade.id} value={String(grade.id)}>
                      {grade.class_level != null
                        ? `${grade.class_level}-${grade.name}`
                        : grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Əlaqə Məlumatları
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
                className={cn('pl-10', errors.email && 'border-red-500')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Telefon
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+994501234567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Ünvan
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea
                id="address"
                {...register('address')}
                placeholder="Yaşayış ünvanı"
                rows={2}
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalInfoStep;
