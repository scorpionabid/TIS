import React from 'react';
import { Globe, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { BSQAssessmentFormData } from '@/types/forms';
import { AcademicYear } from '@/types';

interface Institution {
  id: number;
  name: string;
  type: string;
}

interface BSQAssessmentFormProps {
  form: {
    register: (name: string) => any;
    handleSubmit: (callback: (data: BSQAssessmentFormData) => void) => any;
    formState: { errors: Record<string, any> };
    setValue: (name: string, value: any) => void;
    watch: (name: string) => any;
  };
  academicYears: AcademicYear[];
  institutions: Institution[];
  defaultInstitution: Institution | null;
  activeAcademicYear: AcademicYear | null;
  creating: boolean;
  loadingAcademicYears: boolean;
  loadingInstitutions: boolean;
  onSubmit: (data: BSQAssessmentFormData) => void;
  onClose: () => void;
  calculatePercentage: (totalScore: number, maxScore: number) => number;
}

export const BSQAssessmentForm: React.FC<BSQAssessmentFormProps> = ({
  form,
  academicYears,
  institutions,
  defaultInstitution,
  activeAcademicYear,
  creating,
  loadingAcademicYears,
  loadingInstitutions,
  onSubmit,
  onClose,
  calculatePercentage
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>Beynəlxalq Standartlar Qiymətləndirməsi (BSQ)</span>
        </CardTitle>
        <CardDescription>
          Beynəlxalq keyfiyyət standartları və akkreditasiya qiymətləndirməsi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bsq_institution_id">Müəssisə *</Label>
              <Select 
                onValueChange={(value) => setValue('institution_id', parseInt(value))}
                disabled={creating || loadingInstitutions}
                defaultValue={String(defaultInstitution?.id || 2)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müəssisə seçin" />
                </SelectTrigger>
                <SelectContent>
                  {institutions?.data?.data?.map((institution: any) => (
                    <SelectItem key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bsq_academic_year_id">Tədris ili *</Label>
              <Select 
                onValueChange={(value) => setValue('academic_year_id', parseInt(value))}
                disabled={creating || loadingAcademicYears}
                defaultValue={String(activeAcademicYear?.id || 2)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tədris ili seçin" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears?.map((year: any) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.name} {year.is_active && '(Cari)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bsq_assessment_date">Qiymətləndirmə Tarixi *</Label>
              <Input
                id="bsq_assessment_date"
                type="date"
                {...register('assessment_date', { required: 'Tarix tələb olunur' })}
                disabled={creating}
              />
              {errors.assessment_date && (
                <p className="text-sm text-destructive">{errors.assessment_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="international_standard">Beynəlxalq Standart *</Label>
              <Input
                id="international_standard"
                {...register('international_standard', { required: 'Beynəlxalq standart tələb olunur' })}
                placeholder="məs: ISO 21001, NEASC, Cambridge Assessment"
                disabled={creating}
              />
              {errors.international_standard && (
                <p className="text-sm text-destructive">{errors.international_standard.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment_body">Qiymətləndirmə Orqanı *</Label>
              <Input
                id="assessment_body"
                {...register('assessment_body', { required: 'Qiymətləndirmə orqanı tələb olunur' })}
                placeholder="məs: Cambridge International, IB Organization"
                disabled={creating}
              />
              {errors.assessment_body && (
                <p className="text-sm text-destructive">{errors.assessment_body.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bsq_total_score">Ümumi Bal *</Label>
              <Input
                id="bsq_total_score"
                type="number"
                min="0"
                step="0.1"
                {...register('total_score', { 
                  required: 'Ümumi bal tələb olunur',
                  min: { value: 0, message: 'Bal mənfi ola bilməz' }
                })}
                disabled={creating}
              />
              {errors.total_score && (
                <p className="text-sm text-destructive">{errors.total_score.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bsq_max_possible_score">Maksimum Bal *</Label>
              <Input
                id="bsq_max_possible_score"
                type="number"
                min="1"
                step="0.1"
                {...register('max_possible_score', { 
                  required: 'Maksimum bal tələb olunur',
                  min: { value: 1, message: 'Maksimum bal ən azı 1 olmalıdır' }
                })}
                disabled={creating}
              />
              {errors.max_possible_score && (
                <p className="text-sm text-destructive">{errors.max_possible_score.message}</p>
              )}
              {watch('total_score') && watch('max_possible_score') && (
                <p className="text-sm text-muted-foreground">
                  Faiz: {calculatePercentage(watch('total_score'), watch('max_possible_score'))}%
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accreditation_status">Akkreditasiya Statusu</Label>
              <Select value={watch('accreditation_status')} onValueChange={(value) => setValue('accreditation_status', value as any)} disabled={creating}>
                <SelectTrigger>
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_accreditation">Tam Akkreditasiya</SelectItem>
                  <SelectItem value="conditional_accreditation">Şərti Akkreditasiya</SelectItem>
                  <SelectItem value="provisional_accreditation">Müvəqqəti Akkreditasiya</SelectItem>
                  <SelectItem value="denied">Rədd edilib</SelectItem>
                  <SelectItem value="not_applicable">Tətbiq olunmur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="international_ranking">Beynəlxalq Reyting</Label>
              <Input
                id="international_ranking"
                type="number"
                min="1"
                {...register('international_ranking')}
                placeholder="məs: 150"
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="national_ranking">Milli Reyting</Label>
              <Input
                id="national_ranking"
                type="number"
                min="1"
                {...register('national_ranking')}
                placeholder="məs: 25"
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regional_ranking">Regional Reyting</Label>
              <Input
                id="regional_ranking"
                type="number"
                min="1"
                {...register('regional_ranking')}
                placeholder="məs: 5"
                disabled={creating}
              />
            </div>
          </div>

          {/* Certification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="certification_level">Sertifikat Səviyyəsi</Label>
              <Input
                id="certification_level"
                {...register('certification_level')}
                placeholder="məs: Gold, Silver, Bronze"
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certification_valid_until">Sertifikat Etibarlılıq Tarixi</Label>
              <Input
                id="certification_valid_until"
                type="date"
                {...register('certification_valid_until')}
                disabled={creating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={creating}
            >
              Ləğv et
            </Button>
            <Button
              type="submit"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yaradılır...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  BSQ Yaradın
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </CardContent>
    </Card>
  );
};