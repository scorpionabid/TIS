import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Users, UserCircle, Phone, Mail, Heart, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GuardianStepProps {
  form: UseFormReturn<any>;
}

const relationOptions = [
  { value: 'mother', label: 'Ana' },
  { value: 'father', label: 'Ata' },
  { value: 'grandmother', label: 'Nənə' },
  { value: 'grandfather', label: 'Baba' },
  { value: 'guardian', label: 'Qəyyum' },
  { value: 'other', label: 'Digər' },
];

export const GuardianStep: React.FC<GuardianStepProps> = ({ form }) => {
  const { register, setValue, watch } = form;

  return (
    <div className="space-y-6">
      {/* Primary Guardian Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3 bg-primary/5">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-primary" />
            Birinci Valideyn / Qəyyum
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guardian_relation" className="text-sm font-medium">
              Qohumluq Əlaqəsi
            </Label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Select
                value={watch('guardian_relation')}
                onValueChange={(value) => setValue('guardian_relation', value)}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Əlaqəni seçin" />
                </SelectTrigger>
                <SelectContent>
                  {relationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_name" className="text-sm font-medium">
              Ad və Soyad
            </Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian_name"
                {...register('guardian_name')}
                placeholder="Tam adı daxil edin"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_phone" className="text-sm font-medium">
              Telefon
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian_phone"
                {...register('guardian_phone')}
                placeholder="+994501234567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian_email"
                type="email"
                {...register('guardian_email')}
                placeholder="email@example.com"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Guardian Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            İkinci Valideyn / Qəyyum (İxtiyari)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guardian2_relation" className="text-sm font-medium">
              Qohumluq Əlaqəsi
            </Label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Select
                value={watch('guardian2_relation') || ''}
                onValueChange={(value) => setValue('guardian2_relation', value)}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Əlaqəni seçin" />
                </SelectTrigger>
                <SelectContent>
                  {relationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian2_name" className="text-sm font-medium">
              Ad və Soyad
            </Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian2_name"
                {...register('guardian2_name')}
                placeholder="Tam adı daxil edin"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian2_phone" className="text-sm font-medium">
              Telefon
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian2_phone"
                {...register('guardian2_phone')}
                placeholder="+994501234567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian2_email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guardian2_email"
                type="email"
                {...register('guardian2_email')}
                placeholder="email@example.com"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuardianStep;
