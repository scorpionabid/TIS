import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileUpdateData } from '@/services/profile';

interface EducationTabProps {
  form: UseFormReturn<ProfileUpdateData>;
}

export const EducationTab = ({ form }: EducationTabProps) => {
  const { register, setValue, watch } = form;
  
  return (
    <div className="space-y-6">
      {/* Education Information */}
      <Card>
        <CardHeader>
          <CardTitle>Təhsil Məlumatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="education_level">Təhsil səviyyəsi</Label>
            <Select value={watch('education_level')} onValueChange={(value) => setValue('education_level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Təhsil səviyyəsini seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high_school">Orta məktəb</SelectItem>
                <SelectItem value="associate">Kollec</SelectItem>
                <SelectItem value="bachelor">Bakalavr</SelectItem>
                <SelectItem value="master">Magistr</SelectItem>
                <SelectItem value="phd">Doktorantura</SelectItem>
                <SelectItem value="postdoc">Post-doktorantura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">Universitet/Təhsil müəssisəsi</Label>
              <Input
                id="university"
                {...register('university')}
                placeholder="Məzun olduğunuz təhsil müəssisəsi"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="major">İxtisas</Label>
              <Input
                id="major"
                {...register('major')}
                placeholder="İxtisasınızı daxil edin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduation_year">Məzuniyyət ili</Label>
            <Input
              id="graduation_year"
              type="number"
              {...register('graduation_year')}
              placeholder="2020"
              min="1950"
              max={new Date().getFullYear()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Akademik Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="academic_title">Akademik ad</Label>
              <Select value={watch('academic_title')} onValueChange={(value) => setValue('academic_title', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Akademik ad seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yoxdur</SelectItem>
                  <SelectItem value="assistant">Baş müəllim</SelectItem>
                  <SelectItem value="lecturer">Müəllim metodist</SelectItem>
                  <SelectItem value="senior_lecturer">Aparıcı müəllim</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="associate_professor">Dosent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="research_area">Tədqiqat sahəsi</Label>
              <Input
                id="research_area"
                {...register('research_area')}
                placeholder="Əsas tədqiqat sahəniz"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publications">Nəşrlər sayı</Label>
              <Input
                id="publications"
                type="number"
                {...register('publications')}
                placeholder="0"
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conferences">Konfrans iştirakları</Label>
              <Input
                id="conferences"
                type="number"
                {...register('conferences')}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thesis_topic">Dissertasiya mövzusu</Label>
            <Input
              id="thesis_topic"
              {...register('thesis_topic')}
              placeholder="Dissertasiya mövzunuz (varsa)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Training and Development */}
      <Card>
        <CardHeader>
          <CardTitle>Təlim və İnkişaf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_training">Son təlim tarixi</Label>
              <Input
                id="last_training"
                type="date"
                {...register('last_training')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="training_hours">Təlim saatları (illik)</Label>
              <Input
                id="training_hours"
                type="number"
                {...register('training_hours')}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="development_goals">İnkişaf hədəfləri</Label>
            <Input
              id="development_goals"
              {...register('development_goals')}
              placeholder="Peşəkar inkişaf hədəfləriniz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentoring">Mentorluq fəaliyyəti</Label>
            <Select value={watch('mentoring')} onValueChange={(value) => setValue('mentoring', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Mentorluq statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yoxdur</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="mentee">Mentee</SelectItem>
                <SelectItem value="both">Hər ikisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};