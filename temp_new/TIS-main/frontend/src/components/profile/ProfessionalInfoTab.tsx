import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileFormData } from '@/services/profile';

interface ProfessionalInfoTabProps {
  form: UseFormReturn<ProfileFormData>;
}

export const ProfessionalInfoTab = ({ form }: ProfessionalInfoTabProps) => {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <div className="space-y-4">
      {/* Bioqrafiya */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bioqrafiya</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bio">Haqqınızda</Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Özünüz, təcrübəniz və maraqlarınız haqqında qısa məlumat yazın..."
              className="resize-none"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Peşəkar Məlumatlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peşəkar Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">İxtisas</Label>
              <Input
                id="specialty"
                {...register('specialty')}
                placeholder="məs. Riyaziyyat müəllimi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_years">Təcrübə (il)</Label>
              <Input
                id="experience_years"
                type="number"
                min={0}
                max={60}
                {...register('experience_years')}
                placeholder="məs. 5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Təhsil Məlumatları */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ali Təhsil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="degree_level">Elmi dərəcə</Label>
            <Select
              value={watch('degree_level')}
              onValueChange={(v) => setValue('degree_level', v)}
            >
              <SelectTrigger id="degree_level">
                <SelectValue placeholder="Dərəcə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bachelor">Bakalavr</SelectItem>
                <SelectItem value="master">Magistr</SelectItem>
                <SelectItem value="phd">Doktorantura (PhD)</SelectItem>
                <SelectItem value="associate">Subbakalavr</SelectItem>
                <SelectItem value="other">Digər</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="graduation_university">Universitet / Müəssisə</Label>
              <Input
                id="graduation_university"
                {...register('graduation_university')}
                placeholder="Məzun olduğunuz universitet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduation_year">Məzuniyyət ili</Label>
              <Input
                id="graduation_year"
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                {...register('graduation_year')}
                placeholder="məs. 2018"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
