import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { ProfileUpdateData } from '@/services/profile';
import { useState } from 'react';

interface ProfessionalInfoTabProps {
  form: UseFormReturn<ProfileUpdateData>;
  subjects: any[];
  addArrayItem: (field: keyof ProfileUpdateData, value: string) => void;
  removeArrayItem: (field: keyof ProfileUpdateData, index: number) => void;
}

export const ProfessionalInfoTab = ({ 
  form, 
  subjects, 
  addArrayItem, 
  removeArrayItem 
}: ProfessionalInfoTabProps) => {
  const { register, setValue, watch } = form;
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newCertificate, setNewCertificate] = useState('');
  
  const skills = watch('skills') || [];
  const languages = watch('languages') || [];
  const certificates = watch('certificates') || [];
  const subjectSpecializations = watch('subject_specializations') || [];

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      addArrayItem('skills', newSkill);
      setNewSkill('');
    }
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      addArrayItem('languages', newLanguage);
      setNewLanguage('');
    }
  };

  const handleAddCertificate = () => {
    if (newCertificate.trim()) {
      addArrayItem('certificates', newCertificate);
      setNewCertificate('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Work Information */}
      <Card>
        <CardHeader>
          <CardTitle>İş Məlumatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Vəzifə</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="Vəzifənizi daxil edin"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Şöbə</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="Şöbəni daxil edin"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">İşə qəbul tarixi</Label>
              <Input
                id="hire_date"
                type="date"
                {...register('hire_date')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="experience_years">İş təcrübəsi (il)</Label>
              <Input
                id="experience_years"
                type="number"
                {...register('experience_years')}
                placeholder="0"
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="salary">Maaş</Label>
              <Input
                id="salary"
                type="number"
                {...register('salary')}
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Specializations */}
      <Card>
        <CardHeader>
          <CardTitle>Fənn İxtisasları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>İxtisas fənləri</Label>
            <Select 
              onValueChange={(value) => {
                if (!subjectSpecializations.includes(value)) {
                  addArrayItem('subject_specializations', value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fənn seçin" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {subjectSpecializations.map((subject: string, index: number) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {subject}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeArrayItem('subject_specializations', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Bacarıqlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Yeni bacarıq əlavə edin"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            />
            <Button type="button" onClick={handleAddSkill} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {skills.map((skill: string, index: number) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeArrayItem('skills', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Xarici Dillər</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Dil əlavə edin"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
            />
            <Button type="button" onClick={handleAddLanguage} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {languages.map((language: string, index: number) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {language}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeArrayItem('languages', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <CardTitle>Sertifikatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCertificate}
              onChange={(e) => setNewCertificate(e.target.value)}
              placeholder="Sertifikat əlavə edin"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCertificate())}
            />
            <Button type="button" onClick={handleAddCertificate} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {certificates.map((certificate: string, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{certificate}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeArrayItem('certificates', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};