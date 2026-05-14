import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateAssessmentTypeData } from '@/services/assessmentTypes';

interface AssessmentBasicFormProps {
  formData: CreateAssessmentTypeData;
  onInputChange: (field: keyof CreateAssessmentTypeData, value: any) => void;
  onArrayFieldToggle: (field: 'grade_levels' | 'subjects', value: string) => void;
  categories: Array<{ value: string; label: string }>;
  scoringMethods: Array<{ value: string; label: string }>;
  gradeLevels: Array<{ value: string; label: string }>;
  subjects: Array<{ value: string; label: string }>;
}

export function AssessmentBasicForm({
  formData,
  onInputChange,
  onArrayFieldToggle,
  categories,
  scoringMethods,
  gradeLevels,
  subjects,
}: AssessmentBasicFormProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Əsas Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Qiymətləndirmə Adı *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onInputChange('name', e.target.value)}
                placeholder="Məsələn: İllik Performans Qiymətləndirməsi"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Kateqoriya *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => onInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kateqoriya seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Təsvir
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              placeholder="Qiymətləndirmənin məqsədi və məzmunu..."
              rows={3}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_score" className="text-sm font-medium">
                Maksimum Bal *
              </Label>
              <Input
                id="max_score"
                type="number"
                value={formData.max_score}
                onChange={(e) => onInputChange('max_score', parseInt(e.target.value) || 100)}
                placeholder="100"
                min="1"
                max="1000"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scoring_method" className="text-sm font-medium">
                Qiymətləndirmə Metodu *
              </Label>
              <Select
                value={formData.scoring_method}
                onValueChange={(value) => onInputChange('scoring_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Metod seçin" />
                </SelectTrigger>
                <SelectContent>
                  {scoringMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => onInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active" className="text-sm font-medium">
              Aktiv
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Grade Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sinif Səviyyələri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {gradeLevels.map((level) => (
              <div key={level.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`grade-${level.value}`}
                  checked={formData.grade_levels?.includes(level.value) || false}
                  onCheckedChange={() => onArrayFieldToggle('grade_levels', level.value)}
                />
                <Label htmlFor={`grade-${level.value}`} className="text-sm">
                  {level.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fənlər</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {subjects.map((subject) => (
              <div key={subject.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`subject-${subject.value}`}
                  checked={formData.subjects?.includes(subject.value) || false}
                  onCheckedChange={() => onArrayFieldToggle('subjects', subject.value)}
                />
                <Label htmlFor={`subject-${subject.value}`} className="text-sm">
                  {subject.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}