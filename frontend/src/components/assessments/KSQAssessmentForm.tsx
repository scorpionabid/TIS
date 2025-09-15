import React from 'react';
import { Plus, X, School, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { KSQAssessmentFormData, AssessmentCriteria } from '@/types/forms';
import { AcademicYear } from '@/types';

interface Institution {
  id: number;
  name: string;
  type: string;
}

interface KSQAssessmentFormProps {
  form: {
    register: (name: string) => any;
    handleSubmit: (callback: (data: KSQAssessmentFormData) => void) => any;
    formState: { errors: Record<string, any> };
    setValue: (name: string, value: any) => void;
    watch: (name: string) => any;
  };
  criteriaList: AssessmentCriteria[];
  strengthsList: string[];
  improvementsList: string[];
  recommendationsList: string[];
  academicYears: AcademicYear[];
  institutions: Institution[];
  defaultInstitution: Institution | null;
  activeAcademicYear: AcademicYear | null;
  creating: boolean;
  loadingAcademicYears: boolean;
  loadingInstitutions: boolean;
  onSubmit: (data: KSQAssessmentFormData) => void;
  onClose: () => void;
  addCriteria: () => void;
  removeCriteria: (index: number) => void;
  updateCriteria: (index: number, field: 'name' | 'score', value: string | number) => void;
  addListItem: (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => void;
  removeListItem: (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => void;
  updateListItem: (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => void;
  setStrengthsList: React.Dispatch<React.SetStateAction<string[]>>;
  setImprovementsList: React.Dispatch<React.SetStateAction<string[]>>;
  setRecommendationsList: React.Dispatch<React.SetStateAction<string[]>>;
  calculatePercentage: (totalScore: number, maxScore: number) => number;
}

export const KSQAssessmentForm: React.FC<KSQAssessmentFormProps> = ({
  form,
  criteriaList,
  strengthsList,
  improvementsList,
  recommendationsList,
  academicYears,
  institutions,
  defaultInstitution,
  activeAcademicYear,
  creating,
  loadingAcademicYears,
  loadingInstitutions,
  onSubmit,
  onClose,
  addCriteria,
  removeCriteria,
  updateCriteria,
  addListItem,
  removeListItem,
  updateListItem,
  setStrengthsList,
  setImprovementsList,
  setRecommendationsList,
  calculatePercentage
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <School className="h-5 w-5" />
          <span>Keyfiyyət Standartları Qiymətləndirməsi (KSQ)</span>
        </CardTitle>
        <CardDescription>
          Daxili keyfiyyət standartları üzrə müəssisəni qiymətləndirin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institution_id">Müəssisə *</Label>
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
              <Label htmlFor="academic_year_id">Tədris ili *</Label>
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
              <Label htmlFor="assessment_date">Qiymətləndirmə Tarixi *</Label>
              <Input
                id="assessment_date"
                type="date"
                {...register('assessment_date', { required: 'Tarix tələb olunur' })}
                disabled={creating}
              />
              {errors.assessment_date && (
                <p className="text-sm text-destructive">{errors.assessment_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment_type">Qiymətləndirmə Növü *</Label>
              <Input
                id="assessment_type"
                {...register('assessment_type', { required: 'Qiymətləndirmə növü tələb olunur' })}
                placeholder="məs: İllik keyfiyyət qiymətləndirməsi"
                disabled={creating}
              />
              {errors.assessment_type && (
                <p className="text-sm text-destructive">{errors.assessment_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_score">Ümumi Bal *</Label>
              <Input
                id="total_score"
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
              <Label htmlFor="max_possible_score">Maksimum Bal *</Label>
              <Input
                id="max_possible_score"
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
              <Label htmlFor="grade_level">Sinif/Səviyyə</Label>
              <Input
                id="grade_level"
                {...register('grade_level')}
                placeholder="məs: 1-11 siniflər"
                disabled={creating}
              />
            </div>
          </div>

          {/* Criteria Scores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Meyar Balları</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCriteria} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Meyar Əlavə Et
              </Button>
            </div>
            <div className="space-y-3">
              {criteriaList.map((criteria, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      placeholder="Meyar adı"
                      value={criteria.name}
                      onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                      disabled={creating}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Bal"
                      value={criteria.score}
                      onChange={(e) => updateCriteria(index, 'score', parseFloat(e.target.value) || 0)}
                      disabled={creating}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCriteria(index)}
                    disabled={creating || criteriaList.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Güclü Tərəflər</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem(strengthsList, setStrengthsList)} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Əlavə Et
              </Button>
            </div>
            <div className="space-y-2">
              {strengthsList.map((strength, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Güclü tərəf"
                    value={strength}
                    onChange={(e) => updateListItem(strengthsList, setStrengthsList, index, e.target.value)}
                    disabled={creating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeListItem(strengthsList, setStrengthsList, index)}
                    disabled={creating || strengthsList.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Improvement Areas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Təkmilləşdirmə Sahələri</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem(improvementsList, setImprovementsList)} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Əlavə Et
              </Button>
            </div>
            <div className="space-y-2">
              {improvementsList.map((improvement, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Təkmilləşdirmə sahəsi"
                    value={improvement}
                    onChange={(e) => updateListItem(improvementsList, setImprovementsList, index, e.target.value)}
                    disabled={creating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeListItem(improvementsList, setImprovementsList, index)}
                    disabled={creating || improvementsList.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Tövsiyələr</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem(recommendationsList, setRecommendationsList)} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Əlavə Et
              </Button>
            </div>
            <div className="space-y-2">
              {recommendationsList.map((recommendation, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Tövsiyə"
                    value={recommendation}
                    onChange={(e) => updateListItem(recommendationsList, setRecommendationsList, index, e.target.value)}
                    disabled={creating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeListItem(recommendationsList, setRecommendationsList, index)}
                    disabled={creating || recommendationsList.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes and Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Qeydlər</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Əlavə qeydlər və müşahidələr..."
                rows={3}
                disabled={creating}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="follow_up_required"
                  checked={watch('follow_up_required')}
                  onCheckedChange={(checked) => setValue('follow_up_required', checked)}
                  disabled={creating}
                />
                <Label htmlFor="follow_up_required" className="text-sm">
                  İzləmə tələb olunur
                </Label>
              </div>

              {watch('follow_up_required') && (
                <div className="space-y-2">
                  <Label htmlFor="follow_up_date">İzləmə Tarixi</Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    {...register('follow_up_date')}
                    disabled={creating}
                  />
                </div>
              )}
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
                  KSQ Yaradın
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </CardContent>
    </Card>
  );
};