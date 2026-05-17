import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Heart, AlertTriangle, FileText, Stethoscope, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface AdditionalInfoStepProps {
  form: UseFormReturn<any>;
}

export const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({ form }) => {
  const { register } = form;

  return (
    <div className="space-y-6">
      {/* Medical Information Card */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3 bg-orange-50/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-orange-600" />
            Tibbi Məlumatlar
          </CardTitle>
          <CardDescription>
            Şagirdin sağlamlığı ilə bağlı mühüm məlumatlar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="medical_conditions" className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Tibbi Vəziyyət / Xroniki Xəstəliklər
            </Label>
            <Textarea
              id="medical_conditions"
              {...register('medical_conditions')}
              placeholder="Məlum tibbi problemlər, xroniki xəstəliklər varsa qeyd edin..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies" className="text-sm font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Allergiyalar
            </Label>
            <Textarea
              id="allergies"
              {...register('allergies')}
              placeholder="Qida, dərman və ya digər allergiyalar varsa qeyd edin..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact" className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Fövqəladə Hal Üçün Əlaqə
            </Label>
            <Input
              id="emergency_contact"
              {...register('emergency_contact')}
              placeholder="Fövqəladə hallarda əlaqə saxlanılacaq şəxsin adı və telefonu"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Əlavə Qeydlər
          </CardTitle>
          <CardDescription>
            Digər mühüm məlumatlar və qeydlər
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Ümumi Qeydlər
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Şagird haqqında digər mühüm məlumatlar, xüsusi qayğılar, maraqlar və s."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enrollment_date" className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Qeydiyyat Tarixi
            </Label>
            <Input
              id="enrollment_date"
              type="date"
              {...register('enrollment_date')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdditionalInfoStep;
