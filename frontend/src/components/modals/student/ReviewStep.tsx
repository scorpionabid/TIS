import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  User, Users, Heart, FileText, GraduationCap, Mail, Phone, 
  MapPin, Calendar, Hash, AlertTriangle, Stethoscope, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReviewStepProps {
  form: UseFormReturn<any>;
  grades: any[];
  avatarUrl?: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  form,
  grades,
  avatarUrl,
}) => {
  const { watch } = form;
  const formData = watch();

  const selectedGrade = grades.find((g) => String(g.id) === String(formData.class_id));

  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <Card className="mb-4">
      <CardHeader className="pb-2 bg-gray-50/50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );

  const renderField = (label: string, value: string | number | undefined, fallback = '-') => (
    <div className="flex justify-between items-start py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || fallback}</span>
    </div>
  );

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Kişi';
      case 'female': return 'Qadın';
      case 'other': return 'Digər';
      default: return '-';
    }
  };

  const getRelationLabel = (relation: string) => {
    const relations: Record<string, string> = {
      mother: 'Ana',
      father: 'Ata',
      grandmother: 'Nənə',
      grandfather: 'Baba',
      guardian: 'Qəyyum',
      other: 'Digər',
    };
    return relations[relation] || relation || '-';
  };

  return (
    <div className="space-y-4">
      {/* Header with Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="w-16 h-16 border-2 border-primary/20">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">
            {formData.first_name} {formData.last_name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="w-4 h-4" />
            {formData.student_number}
            {selectedGrade && (
              <>
                <span className="mx-1">•</span>
                <GraduationCap className="w-4 h-4" />
                {selectedGrade.class_level}-{selectedGrade.name}
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {/* Personal Information */}
        {renderSection(
          'Şəxsi Məlumatlar',
          <User className="w-4 h-4 text-primary" />,
          <>
            {renderField('Ad', formData.first_name)}
            {renderField('Soyad', formData.last_name)}
            {renderField('UTİS Kod', formData.student_number)}
            {renderField('Doğum Tarixi', formData.date_of_birth)}
            {renderField('Cins', getGenderLabel(formData.gender))}
            {renderField('Sinif', selectedGrade ? `${selectedGrade.class_level}-${selectedGrade.name}` : undefined)}
          </>
        )}

        {/* Contact Information */}
        {renderSection(
          'Əlaqə Məlumatları',
          <Mail className="w-4 h-4 text-primary" />,
          <>
            {renderField('Email', formData.email)}
            {renderField('Telefon', formData.phone)}
            {renderField('Ünvan', formData.address)}
          </>
        )}

        {/* Guardian Information */}
        {renderSection(
          'Valideyn Məlumatları',
          <Users className="w-4 h-4 text-primary" />,
          <>
            {formData.guardian_name && (
              <>
                <div className="mb-3">
                  <Badge variant="secondary" className="mb-2">Birinci Valideyn</Badge>
                  {renderField('Əlaqə', getRelationLabel(formData.guardian_relation))}
                  {renderField('Ad Soyad', formData.guardian_name)}
                  {renderField('Telefon', formData.guardian_phone)}
                  {renderField('Email', formData.guardian_email)}
                </div>
              </>
            )}
            {formData.guardian2_name && (
              <>
                <div className="border-t pt-3 mt-3">
                  <Badge variant="outline" className="mb-2">İkinci Valideyn</Badge>
                  {renderField('Əlaqə', getRelationLabel(formData.guardian2_relation))}
                  {renderField('Ad Soyad', formData.guardian2_name)}
                  {renderField('Telefon', formData.guardian2_phone)}
                  {renderField('Email', formData.guardian2_email)}
                </div>
              </>
            )}
            {!formData.guardian_name && !formData.guardian2_name && (
              <p className="text-sm text-muted-foreground italic">Valideyn məlumatları daxil edilməyib</p>
            )}
          </>
        )}

        {/* Medical Information */}
        {renderSection(
          'Tibbi Məlumatlar',
          <Stethoscope className="w-4 h-4 text-orange-500" />,
          <>
            {renderField('Tibbi Vəziyyət', formData.medical_conditions, 'Qeyd edilməyib')}
            {renderField('Allergiyalar', formData.allergies, 'Qeyd edilməyib')}
            {renderField('Fövqəladə Əlaqə', formData.emergency_contact, 'Qeyd edilməyib')}
          </>
        )}

        {/* Additional Notes */}
        {renderSection(
          'Əlavə Qeydlər',
          <FileText className="w-4 h-4 text-primary" />,
          <>
            {renderField('Qeydlər', formData.notes, 'Qeyd edilməyib')}
            {renderField('Qeydiyyat Tarixi', formData.enrollment_date)}
          </>
        )}
      </ScrollArea>

      {/* Confirmation Notice */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <p className="text-sm text-green-700">
          Məlumatları yoxladıqdan sonra "Yadda Saxla" düyməsini klikləyin
        </p>
      </div>
    </div>
  );
};

export default ReviewStep;
